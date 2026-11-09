const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const promptService = require('../services/prompt.service');

const SAMPLE_VARS = {
  company_name: 'Mi Empresa',
  now: 'lunes, 9 de noviembre de 2026, 10:30 a.m.',
  is_off_hours: false,
  vendors: 'Luis Martínez, Ana Ruiz',
  cart_json: JSON.stringify([{ clave: 'SKU-001', descripcion: 'Producto de ejemplo', cantidad: 2, precio: 580 }]),
  custom_rules: '- "PTB": perfil de sello de vástago',
  knowledge_context: 'Envíos a todo México en 24-72 horas hábiles. Facturamos con CSF vigente.',
  has_knowledge_context: true,
  has_catalog: true,
  catalog_description: '- Búsqueda por texto (buscar).\n- Familia (familia) — OBLIGATORIO. Valores válidos: ORINGS, SELLOS DE PISTON',
  catalog_rules: '1. EXISTENCIAS: suma el total y no menciones sucursales.',
  tax_rate_pct: 16,
  has_fiscal_tools: true,
  can_lookup_customer: true,
  can_extract_csf: true,
};

async function getRow(tenantId) {
  return prisma.aiPromptConfig.findUnique({ where: { tenantId } });
}

/** Tokens are not re-validated against the DB; only reference users that exist. */
async function actorId(id) {
  if (!id) return null;
  const u = await prisma.user.findUnique({ where: { id }, select: { id: true } }).catch(() => null);
  return u ? u.id : null;
}

/**
 * @swagger
 * /tenant/ai-prompts:
 *   get:
 *     summary: Configuración de prompts del agente (plantilla base, personalizaciones y resultado efectivo)
 *     tags: [AI]
 */
router.get('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const row = await getRow(req.user.tenantId);
    const effective = await promptService.getPromptConfig(req.user.tenantId, { force: true });
    res.json({
      data: {
        defaults: promptService.DEFAULTS,
        overrides: row?.overrides || {},
        effective,
        version: row?.version || 0,
        updatedAt: row?.updatedAt || null,
        variables: promptService.VARIABLES,
        escalateToken: promptService.ESCALATE_TOKEN,
      },
    });
  } catch (error) {
    next(error);
  }
});

/** Persists overrides as a new version. Shared by PUT and restore. */
async function saveOverrides(tenantId, userId, overrides, note) {
  const problems = promptService.validateOverrides(overrides || {});
  if (problems.length) {
    const err = new Error('Personalización inválida');
    err.status = 400;
    err.details = problems;
    throw err;
  }
  const actor = await actorId(userId);
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.aiPromptConfig.findUnique({ where: { tenantId } });
    const version = (current?.version || 0) + 1;
    const row = await tx.aiPromptConfig.upsert({
      where: { tenantId },
      create: { tenantId, overrides, version, updatedById: actor },
      update: { overrides, version, updatedById: actor },
    });
    await tx.aiPromptVersion.create({ data: { tenantId, version, overrides, createdById: actor, note: note || null } });
    return row;
  });
  promptService.invalidate(tenantId);
  const effective = await promptService.getPromptConfig(tenantId, { force: true });
  return { overrides: result.overrides, version: result.version, updatedAt: result.updatedAt, effective };
}

/**
 * @swagger
 * /tenant/ai-prompts:
 *   put:
 *     summary: Guarda personalizaciones (solo las claves que difieren de la plantilla base) y crea una versión
 *     tags: [AI]
 */
router.put('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const data = await saveOverrides(req.user.tenantId, req.user.id, req.body?.overrides, req.body?.note);
    res.json({ data });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message, details: error.details });
    next(error);
  }
});

/**
 * @swagger
 * /tenant/ai-prompts/preview:
 *   post:
 *     summary: Compone la instrucción del agente con datos de ejemplo (sin guardar)
 *     tags: [AI]
 */
router.post('/preview', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { overrides = {}, scenario = {} } = req.body || {};
    const problems = promptService.validateOverrides(overrides);
    if (problems.length) return res.status(400).json({ error: 'Personalización inválida', details: problems });

    const config = promptService.deepMerge(promptService.DEFAULTS, overrides);
    const vars = { ...SAMPLE_VARS, ...scenario };
    if (scenario.knowledge_context === false || scenario.has_knowledge_context === false) {
      vars.knowledge_context = '';
      vars.has_knowledge_context = false;
    }
    const instruction = promptService.composeAgentInstruction(config, vars);
    res.json({
      data: {
        instruction,
        approxTokens: Math.ceil(instruction.length / 4),
        inlineAssist: promptService.renderPath(config, 'inlineAssist', vars),
        summary: promptService.renderPath(config, 'summary', { ...vars, max_chars: 320, client_name: 'Cliente ejemplo', cart_summary: '2 × Producto de ejemplo · total $1160.00', fiscal_summary: 'RFC pendiente', reason: 'vista previa' }),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tenant/ai-prompts/history:
 *   get:
 *     summary: Versiones anteriores de la personalización
 *     tags: [AI]
 */
router.get('/history', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const versions = await prisma.aiPromptVersion.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { version: 'desc' },
      take: 30,
      include: { createdBy: { select: { id: true, name: true } } },
    });
    res.json({ data: versions });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tenant/ai-prompts/restore/{version}:
 *   post:
 *     summary: Restaura una versión anterior (crea una versión nueva con ese contenido)
 *     tags: [AI]
 */
router.post('/restore/:version', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const target = await prisma.aiPromptVersion.findFirst({
      where: { tenantId: req.user.tenantId, version: parseInt(req.params.version, 10) },
    });
    if (!target) return res.status(404).json({ error: 'Versión no encontrada' });
    const data = await saveOverrides(req.user.tenantId, req.user.id, target.overrides, `Restaurada desde v${target.version}`);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tenant/ai-prompts:
 *   delete:
 *     summary: Elimina todas las personalizaciones y vuelve a la plantilla base
 *     tags: [AI]
 */
router.delete('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const current = await getRow(req.user.tenantId);
    if (current) {
      const actor = await actorId(req.user.id);
      const version = current.version + 1;
      await prisma.$transaction([
        prisma.aiPromptConfig.update({ where: { tenantId: req.user.tenantId }, data: { overrides: {}, version, updatedById: actor } }),
        prisma.aiPromptVersion.create({ data: { tenantId: req.user.tenantId, version, overrides: {}, createdById: actor, note: 'Restablecido a plantilla base' } }),
      ]);
    }
    promptService.invalidate(req.user.tenantId);
    res.json({ data: { overrides: {}, effective: promptService.DEFAULTS } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

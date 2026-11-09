const prisma = require('../config/database');
const logger = require('../utils/logger');
const { render, referencedVariables } = require('../prompts/engine');
const DEFAULTS = require('../prompts/default.es.json');

const ESCALATE_TOKEN = '[[ESCALATE]]';
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map(); // tenantId -> { expiresAt, config }

/**
 * Variables the templates may reference. Exposed to the admin UI so editors
 * know what the system injects; everything else is wording the tenant owns.
 */
const VARIABLES = [
  { name: 'company_name', description: 'Nombre del negocio (tenant)' },
  { name: 'escalate_token', description: 'Etiqueta que transfiere el chat a un humano. Protocolo del sistema.' },
  { name: 'now', description: 'Fecha y hora actual en la zona horaria del negocio' },
  { name: 'is_off_hours', description: 'Verdadero fuera del horario de atención (sección)' },
  { name: 'vendors', description: 'Nombres de los vendedores activos' },
  { name: 'cart_json', description: 'Carrito actual del cliente en JSON' },
  { name: 'custom_rules', description: 'Diccionario y reglas personalizadas (Configuración → Asistente IA)' },
  { name: 'knowledge_context', description: 'Fragmentos relevantes de la base de conocimiento' },
  { name: 'has_knowledge_context', description: 'Verdadero si hubo fragmentos relevantes (sección)' },
  { name: 'catalog_description', description: 'Criterios de búsqueda del catálogo (generado del esquema)' },
  { name: 'catalog_rules', description: 'Reglas del catálogo (Configuración → Catálogo)' },
  { name: 'has_catalog', description: 'Verdadero si hay catálogo conectado (sección)' },
  { name: 'tax_rate_pct', description: 'Tasa de impuesto del catálogo en porcentaje' },
  { name: 'has_fiscal_tools', description: 'Verdadero si hay consulta por RFC o lectura de CSF (sección)' },
  { name: 'can_lookup_customer', description: 'Verdadero si el catálogo permite consultar clientes por RFC (sección)' },
  { name: 'can_extract_csf', description: 'Verdadero si está habilitada la lectura de CSF (sección)' },
  { name: 'client_name', description: 'Nombre o teléfono del cliente' },
  { name: 'cart_summary', description: 'Resumen textual del carrito (solo resumen)' },
  { name: 'fiscal_summary', description: 'Resumen de datos fiscales y envío (solo resumen)' },
  { name: 'reason', description: 'Motivo por el que se genera el resumen (solo resumen)' },
  { name: 'max_chars', description: 'Longitud máxima del resumen (solo resumen)' },
];

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(base, override) {
  if (!isPlainObject(override)) return override === undefined ? base : override;
  const out = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v === undefined || v === null) continue;
    out[k] = isPlainObject(base?.[k]) && isPlainObject(v) ? deepMerge(base[k], v) : v;
  }
  return out;
}

/**
 * Validates tenant overrides against the default shape: only known keys,
 * strings where the default is a string, arrays where it is an array.
 * Returns a list of problems (empty when valid).
 */
function validateOverrides(overrides, base = DEFAULTS, path = '') {
  const problems = [];
  if (!isPlainObject(overrides)) return [`${path || 'root'}: debe ser un objeto`];
  for (const [k, v] of Object.entries(overrides)) {
    const p = path ? `${path}.${k}` : k;
    if (k === 'version' || k === 'locale') continue;
    if (!(k in base)) {
      problems.push(`${p}: clave desconocida`);
      continue;
    }
    const b = base[k];
    if (v === null || v === undefined) continue;
    if (isPlainObject(b)) {
      problems.push(...validateOverrides(v, b, p));
    } else if (Array.isArray(b)) {
      if (!Array.isArray(v)) problems.push(`${p}: debe ser una lista`);
    } else if (typeof v !== 'string') {
      problems.push(`${p}: debe ser texto`);
    }
  }
  return problems;
}

async function loadOverrides(tenantId) {
  if (!tenantId || !prisma.aiPromptConfig) return null;
  try {
    const row = await prisma.aiPromptConfig.findUnique({ where: { tenantId } });
    return row && isPlainObject(row.overrides) ? row.overrides : null;
  } catch (e) {
    logger.warn(`[PROMPT] No se pudieron leer overrides de ${tenantId}: ${e.message}`);
    return null;
  }
}

/** Effective prompt configuration for a tenant (defaults + overrides), cached. */
async function getPromptConfig(tenantId, { force = false } = {}) {
  const hit = cache.get(tenantId);
  if (!force && hit && hit.expiresAt > Date.now()) return hit.config;
  const overrides = await loadOverrides(tenantId);
  const config = overrides ? deepMerge(DEFAULTS, overrides) : DEFAULTS;
  cache.set(tenantId, { expiresAt: Date.now() + CACHE_TTL_MS, config });
  return config;
}

function invalidate(tenantId) {
  if (tenantId) cache.delete(tenantId);
  else cache.clear();
}

function get(config, path) {
  return String(path).split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), config);
}

/** Renders one template of the config by dotted path. */
function renderPath(config, path, vars = {}) {
  return render(get(config, path), { escalate_token: ESCALATE_TOKEN, ...vars });
}

/**
 * Builds the agent system instruction. Mode selection (context / catalog
 * only / nothing) is system logic; every sentence comes from the config.
 */
function composeAgentInstruction(config, vars) {
  const v = { escalate_token: ESCALATE_TOKEN, ...vars };
  const hasContext = !!(v.knowledge_context && String(v.knowledge_context).trim());
  const hasCatalog = !!v.has_catalog;
  const parts = [renderPath(config, 'agent.identity', v)];

  if (!hasContext && !hasCatalog) {
    parts.push(renderPath(config, 'agent.modeNothing', v));
  } else {
    parts.push(renderPath(config, hasContext ? 'agent.modeWithContext' : 'agent.modeCatalogOnly', v));
    parts.push(renderPath(config, 'agent.rules', v));
    parts.push(renderPath(config, hasCatalog ? 'agent.catalogConfigured' : 'agent.catalogMissing', v));
    if (hasContext) parts.push(renderPath(config, 'agent.context', v));
  }
  parts.push(renderPath(config, 'agent.dynamicContext', v));
  if (v.is_off_hours) parts.push(renderPath(config, 'agent.offHours', v));

  let instruction = parts.filter(Boolean).join('\n\n');

  // Protocol guard: the escalation token is a contract with the code
  // (whatsapp.service detects it). If an edited prompt dropped it entirely,
  // append the minimum instruction so hand-off keeps working.
  if (!instruction.includes(ESCALATE_TOKEN)) {
    instruction += `\n\n[PROTOCOLO DEL SISTEMA] Para transferir la conversación a un asesor humano incluye la cadena exacta ${ESCALATE_TOKEN} en tu respuesta.`;
  }
  return instruction;
}

module.exports = {
  ESCALATE_TOKEN,
  DEFAULTS,
  VARIABLES,
  getPromptConfig,
  invalidate,
  renderPath,
  composeAgentInstruction,
  validateOverrides,
  deepMerge,
  referencedVariables,
};

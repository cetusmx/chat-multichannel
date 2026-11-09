jest.mock('../../src/config/database', () => ({
  aiPromptConfig: { findUnique: jest.fn() },
}));

const { render, referencedVariables } = require('../../src/prompts/engine');
const DEFAULTS = require('../../src/prompts/default.es.json');

describe('prompts/engine', () => {
  it('replaces variables and drops unknown ones', () => {
    expect(render('Hola {{name}}, {{missing}}!', { name: 'Ana' })).toBe('Hola Ana, !');
    expect(render('{{ a.b }}', { a: { b: 'x' } })).toBe('x');
    expect(render('{{obj}}', { obj: { k: 1 } })).toBe('{"k":1}');
  });

  it('renders positive and negative sections', () => {
    const t = '{{#on}}ON{{/on}}{{^on}}OFF{{/on}}';
    expect(render(t, { on: true })).toBe('ON');
    expect(render(t, { on: false })).toBe('OFF');
    expect(render(t, { on: [] })).toBe('OFF');
    expect(render(t, { on: 'false' })).toBe('OFF');
  });

  it('supports nested sections and collapses blank lines', () => {
    const t = 'A\n\n\n\n{{#x}}B{{#y}}C{{/y}}{{/x}}';
    expect(render(t, { x: true, y: true })).toBe('A\n\nBC');
    expect(render(t, { x: true, y: false })).toBe('A\n\nB');
  });

  it('lists referenced variables', () => {
    expect(referencedVariables('{{a}} {{#b}}{{c}}{{/b}}').sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('prompt.service', () => {
  let prisma;
  let service;

  beforeEach(() => {
    jest.resetModules();
    prisma = require('../../src/config/database');
    prisma.aiPromptConfig.findUnique.mockReset();
    service = require('../../src/services/prompt.service');
  });

  const baseVars = {
    company_name: 'Sellos del Norte',
    now: 'lunes 9 de noviembre, 10:00 a.m.',
    is_off_hours: false,
    vendors: 'Luis, Ana',
    cart_json: '[]',
    custom_rules: '',
    knowledge_context: 'Envíos en 24-72 h.',
    has_catalog: true,
    catalog_description: '- Familia (familia) — OBLIGATORIO',
    catalog_rules: '1. EXISTENCIAS: suma el total.',
    tax_rate_pct: 16,
    has_fiscal_tools: true,
    can_lookup_customer: true,
    can_extract_csf: true,
  };

  it('composes the full agent instruction with context and catalog', async () => {
    prisma.aiPromptConfig.findUnique.mockResolvedValue(null);
    const cfg = await service.getPromptConfig('t1');
    const text = service.composeAgentInstruction(cfg, baseVars);
    expect(text).toMatch(/^Eres un asistente de ventas de Sellos del Norte\./);
    expect(text).toMatch(/Usa ÚNICAMENTE el siguiente contexto/);
    expect(text).toMatch(/\[REGLAS ESTRICTAS DE COMPORTAMIENTO\]/);
    expect(text).toMatch(/3\. COTIZACIONES Y RFC/);
    expect(text).toMatch(/extraer_constancia_fiscal/);
    expect(text).toMatch(/\[CATÁLOGO DE PRODUCTOS\][\s\S]*Familia \(familia\)[\s\S]*tasa 16%[\s\S]*Reglas específicas del negocio:\n1\. EXISTENCIAS/);
    expect(text).toMatch(/Contexto:\nEnvíos en 24-72 h\./);
    expect(text).toMatch(/Equipo de vendedores: Luis, Ana/);
    expect(text).toMatch(/NO \(Estamos abiertos\)/);
    expect(text).not.toMatch(/Al estar fuera de horario/);
    expect(text).not.toMatch(/\{\{/);
    expect((text.match(/\[\[ESCALATE\]\]/g) || []).length).toBeGreaterThan(2);
  });

  it('switches modes: catalog only, nothing, off hours, no fiscal tools', async () => {
    prisma.aiPromptConfig.findUnique.mockResolvedValue(null);
    const cfg = await service.getPromptConfig('t1');

    const catalogOnly = service.composeAgentInstruction(cfg, { ...baseVars, knowledge_context: '' });
    expect(catalogOnly).toMatch(/no hay fragmentos relevantes/);
    expect(catalogOnly).not.toMatch(/Contexto:/);

    const nothing = service.composeAgentInstruction(cfg, { ...baseVars, knowledge_context: '', has_catalog: false });
    expect(nothing).toMatch(/No tienes información de la base de conocimientos ni catálogo/);
    expect(nothing).not.toMatch(/REGLAS ESTRICTAS/);

    const noCatalog = service.composeAgentInstruction(cfg, { ...baseVars, has_catalog: false });
    expect(noCatalog).toMatch(/Este negocio no tiene catálogo conectado/);

    const offHours = service.composeAgentInstruction(cfg, { ...baseVars, is_off_hours: true });
    expect(offHours).toMatch(/SÍ \(Estamos cerrados\)/);
    expect(offHours).toMatch(/Al estar fuera de horario laboral/);

    const basic = service.composeAgentInstruction(cfg, { ...baseVars, has_fiscal_tools: false, can_lookup_customer: false, can_extract_csf: false });
    expect(basic).toMatch(/3\. COTIZACIONES: Si el cliente solicita una cotización formal, pídele su RFC o nombre/);
    expect(basic).not.toMatch(/consultar_cliente_rfc/);
  });

  it('includes custom dictionary rules only when present', async () => {
    prisma.aiPromptConfig.findUnique.mockResolvedValue(null);
    const cfg = await service.getPromptConfig('t1');
    expect(service.composeAgentInstruction(cfg, baseVars)).not.toMatch(/DICCIONARIO PERSONALIZADO/);
    expect(service.composeAgentInstruction(cfg, { ...baseVars, custom_rules: '- "PTB": perfil' })).toMatch(/\[REGLAS Y DICCIONARIO PERSONALIZADO\]\n- "PTB": perfil/);
  });

  it('applies tenant overrides and guards the escalation protocol', async () => {
    prisma.aiPromptConfig.findUnique.mockResolvedValue({
      tenantId: 't2',
      overrides: {
        agent: {
          identity: 'Eres Paco, el asesor de {{company_name}}.',
          modeWithContext: 'Responde solo con el contexto.',
          rules: 'Sé breve.',
          catalogConfigured: 'Catálogo disponible.',
          dynamicContext: 'Hoy: {{now}}',
          offHours: '',
        },
      },
    });
    const cfg = await service.getPromptConfig('t2');
    const text = service.composeAgentInstruction(cfg, baseVars);
    expect(text).toMatch(/^Eres Paco, el asesor de Sellos del Norte\./);
    expect(text).toMatch(/Sé breve\./);
    expect(text).not.toMatch(/REGLAS ESTRICTAS/);
    // The edited prompt dropped the token everywhere -> protocol block appended.
    expect(text).toMatch(/\[PROTOCOLO DEL SISTEMA\][^\n]*\[\[ESCALATE\]\]/);
    // Untouched keys keep defaults.
    expect(service.renderPath(cfg, 'tools.actualizar_carrito')).toMatch(/carrito de compras/);
    expect(prisma.aiPromptConfig.findUnique).toHaveBeenCalledTimes(1);
    await service.getPromptConfig('t2');
    expect(prisma.aiPromptConfig.findUnique).toHaveBeenCalledTimes(1); // cached
  });

  it('validates override shapes', () => {
    expect(service.validateOverrides({ agent: { identity: 'x' } })).toEqual([]);
    expect(service.validateOverrides({ agent: { nope: 'x' } })).toEqual(['agent.nope: clave desconocida']);
    expect(service.validateOverrides({ agent: { identity: 5 } })).toEqual(['agent.identity: debe ser texto']);
    expect(service.validateOverrides({ quickPrompts: 'x' })).toEqual(['quickPrompts: debe ser una lista']);
    expect(service.validateOverrides('x')).toEqual(['root: debe ser un objeto']);
  });

  it('exposes defaults, variables and tool texts', async () => {
    prisma.aiPromptConfig.findUnique.mockResolvedValue(null);
    const cfg = await service.getPromptConfig('t3');
    expect(service.DEFAULTS).toEqual(DEFAULTS);
    expect(service.VARIABLES.map((v) => v.name)).toContain('escalate_token');
    expect(service.renderPath(cfg, 'customerMessages.aiUnavailable')).toMatch(/asistente virtual/);
    expect(service.renderPath(cfg, 'summary', { company_name: 'ACME', max_chars: 320, client_name: 'Oscar', cart_summary: 'vacío', fiscal_summary: '—', reason: 'manual' })).toMatch(/equipo de ventas de ACME[\s\S]*320 caracteres[\s\S]*Cliente: Oscar/);
  });
});

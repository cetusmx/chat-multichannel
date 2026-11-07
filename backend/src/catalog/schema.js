/**
 * Declarative catalog search schema.
 *
 * A tenant describes how its products are searched; the same schema drives
 * the web/mobile form, the AI tool parameters and the agent instructions.
 *
 * {
 *   textSearch: { enabled: true, param: 'q', label: 'Buscar', placeholder: '...' },
 *   attributes: [
 *     { key: 'rin', label: 'Rin', type: 'number', unit: 'in', param: 'rim',
 *       required: true, aiHint: 'diámetro del rin en pulgadas' },
 *     { key: 'familia', label: 'Familia', type: 'select', optionsSource: 'remote:families', required: true },
 *     { key: 'temporada', label: 'Temporada', type: 'select', options: ['Verano', 'Invierno'] },
 *     { key: 'radial', label: 'Radial', type: 'boolean' },
 *   ],
 *   display: { title: '{{name}}', subtitle: '{{sku}}', badges: ['temporada'] },
 * }
 */

const ATTRIBUTE_TYPES = new Set(['text', 'number', 'select', 'boolean', 'range']);

class SchemaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SchemaError';
    this.status = 400;
  }
}

function normalizeSchema(raw) {
  const schema = raw && typeof raw === 'object' ? raw : {};
  const textSearch = {
    enabled: schema.textSearch?.enabled !== false,
    param: schema.textSearch?.param || 'q',
    label: schema.textSearch?.label || 'Buscar',
    placeholder: schema.textSearch?.placeholder || 'Clave o descripción',
    minLength: Number(schema.textSearch?.minLength) || 2,
  };

  const attributes = Array.isArray(schema.attributes) ? schema.attributes : [];
  const seen = new Set();
  const normalized = attributes.map((a, i) => {
    if (!a || typeof a !== 'object') throw new SchemaError(`attributes[${i}] inválido`);
    if (!a.key || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(a.key)) throw new SchemaError(`attributes[${i}].key inválido: "${a.key}"`);
    if (seen.has(a.key)) throw new SchemaError(`attributes[${i}].key duplicado: "${a.key}"`);
    seen.add(a.key);
    const type = a.type || 'text';
    if (!ATTRIBUTE_TYPES.has(type)) throw new SchemaError(`attributes[${i}].type no soportado: "${type}"`);
    if (type === 'select' && !Array.isArray(a.options) && !a.optionsSource) {
      throw new SchemaError(`attributes[${i}] (select) requiere options u optionsSource`);
    }
    return {
      key: a.key,
      label: a.label || a.key,
      type,
      param: a.param || a.key,
      required: !!a.required,
      unit: a.unit || null,
      options: Array.isArray(a.options) ? a.options.map(normalizeOption) : null,
      optionsSource: a.optionsSource || null,
      defaultValue: a.defaultValue ?? null,
      aiHint: a.aiHint || null,
      placeholder: a.placeholder || null,
    };
  });

  const display = {
    title: schema.display?.title || '{{name}}',
    subtitle: schema.display?.subtitle || '{{sku}}',
    badges: Array.isArray(schema.display?.badges) ? schema.display.badges : [],
  };

  return { textSearch, attributes: normalized, display };
}

function normalizeOption(o) {
  if (o && typeof o === 'object') return { value: String(o.value), label: o.label != null ? String(o.label) : String(o.value) };
  return { value: String(o), label: String(o) };
}

/** Attributes the agent must obtain from the customer before searching. */
function requiredAttributes(schema) {
  return schema.attributes.filter((a) => a.required);
}

/**
 * Builds the Gemini-style tool parameter declaration for `buscar_catalogo`.
 * Every attribute becomes a STRING parameter (the provider parses types) so
 * the model never has to guess JSON typing.
 */
function toToolParameters(schema) {
  const properties = {};
  if (schema.textSearch.enabled) {
    properties.texto = {
      type: 'STRING',
      description: `Búsqueda libre por nombre, clave o descripción. ${schema.textSearch.placeholder}.`,
    };
  }
  for (const a of schema.attributes) {
    const parts = [a.label];
    if (a.unit) parts.push(`en ${a.unit}`);
    if (a.type === 'select' && a.options) parts.push(`Valores permitidos: ${a.options.map((o) => o.value).join(', ')}`);
    if (a.type === 'select' && a.optionsSource) parts.push('Usa exactamente uno de los valores listados en el contexto del catálogo');
    if (a.type === 'boolean') parts.push('true o false');
    if (a.type === 'range') parts.push('Rango "min-max" o un solo valor');
    if (a.required) parts.push('OBLIGATORIO: si no lo tienes, pregúntaselo al cliente antes de buscar');
    if (a.aiHint) parts.push(a.aiHint);
    properties[a.key] = { type: 'STRING', description: parts.join('. ') };
  }
  return {
    type: 'OBJECT',
    properties,
    required: requiredAttributes(schema).map((a) => a.key),
  };
}

/** Human-readable summary of the schema, injected into the agent prompt. */
function toPromptDescription(schema, optionsByKey = {}) {
  const lines = [];
  if (schema.textSearch.enabled) lines.push(`- Búsqueda por texto (${schema.textSearch.label.toLowerCase()}).`);
  for (const a of schema.attributes) {
    let line = `- ${a.label} (${a.key})`;
    if (a.unit) line += ` en ${a.unit}`;
    if (a.required) line += ' — OBLIGATORIO';
    const opts = a.options || optionsByKey[a.key];
    if (Array.isArray(opts) && opts.length) {
      const values = opts.slice(0, 60).map((o) => (typeof o === 'object' ? o.value : o));
      line += `. Valores válidos: ${values.join(', ')}${opts.length > 60 ? ', …' : ''}`;
    }
    if (a.aiHint) line += `. ${a.aiHint}`;
    lines.push(line);
  }
  return lines.join('\n');
}

/** Coerces raw string params (from the AI or the UI) into typed values per schema. */
function coerceParams(schema, params = {}) {
  const out = {};
  const text = params.texto ?? params.q ?? params[schema.textSearch.param];
  if (schema.textSearch.enabled && text != null && String(text).trim() !== '') out.text = String(text).trim();

  for (const a of schema.attributes) {
    const v = params[a.key] ?? params[a.param];
    if (v == null || v === '') continue;
    switch (a.type) {
      case 'number': {
        const n = parseFraction(v);
        if (n != null) out[a.key] = n;
        break;
      }
      case 'boolean':
        out[a.key] = ['true', '1', 'si', 'sí', 'yes'].includes(String(v).toLowerCase());
        break;
      case 'range': {
        const [min, max] = String(v).split(/\s*[-–]\s*/);
        out[a.key] = { min: parseFraction(min), max: max != null ? parseFraction(max) : parseFraction(min) };
        break;
      }
      default:
        out[a.key] = String(v).trim();
    }
  }
  return out;
}

/** "1 5/16" -> 1.3125, "3/4" -> 0.75, "50" -> 50. Returns null when unparsable. */
function parseFraction(value) {
  if (typeof value === 'number') return isFinite(value) ? value : null;
  const s = String(value).trim().replace(',', '.');
  const m = s.match(/^(\d+)?\s*(?:(\d+)\/(\d+))?$/);
  if (m && (m[1] || m[2])) {
    const whole = m[1] ? Number(m[1]) : 0;
    const frac = m[2] && m[3] && Number(m[3]) !== 0 ? Number(m[2]) / Number(m[3]) : 0;
    return whole + frac;
  }
  const n = Number(s);
  return isFinite(n) ? n : null;
}

module.exports = { normalizeSchema, requiredAttributes, toToolParameters, toPromptDescription, coerceParams, parseFraction, SchemaError };

/**
 * Minimal, logic-less template engine for agent prompts.
 *
 *   {{name}}                 variable (missing -> '')
 *   {{#flag}} ... {{/flag}}  section rendered when vars.flag is truthy
 *   {{^flag}} ... {{/flag}}  section rendered when vars.flag is falsy
 *
 * No loops, no helpers, no HTML escaping: prompts are plain text written by
 * tenant admins, so the surface area is kept deliberately small.
 */
const SECTION_RE = /\{\{([#^])\s*([\w.]+)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/g;
const VAR_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

function lookup(vars, path) {
  return String(path).split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), vars);
}

function truthy(v) {
  if (Array.isArray(v)) return v.length > 0;
  return !!v && v !== 'false' && v !== '0';
}

function render(template, vars = {}, depth = 0) {
  if (template == null) return '';
  let out = String(template);
  if (depth > 10) return out;

  out = out.replace(SECTION_RE, (_, kind, key, body) => {
    const show = kind === '#' ? truthy(lookup(vars, key)) : !truthy(lookup(vars, key));
    return show ? render(body, vars, depth + 1) : '';
  });

  out = out.replace(VAR_RE, (_, key) => {
    const v = lookup(vars, key);
    if (v == null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });

  return out.replace(/\n{3,}/g, '\n\n').trim();
}

/** Lists the variable and section names a template references. */
function referencedVariables(template) {
  const names = new Set();
  let m;
  const re = /\{\{[#^/]?\s*([\w.]+)\s*\}\}/g;
  while ((m = re.exec(String(template || ''))) !== null) names.add(m[1]);
  return [...names];
}

module.exports = { render, referencedVariables };

const { normalizeSchema, coerceParams, toToolParameters, toPromptDescription, parseFraction, SchemaError } = require('../../src/catalog/schema');
const { applyPricing, normalizePricing, makeProduct, renderTemplate, toCartItem } = require('../../src/catalog/product');

describe('catalog/schema', () => {
  const tires = {
    textSearch: { enabled: true, label: 'Buscar por medida' },
    attributes: [
      { key: 'ancho', label: 'Ancho', type: 'number', unit: 'mm', param: 'width' },
      { key: 'rin', label: 'Rin', type: 'number', unit: 'in', required: true, aiHint: 'diámetro del rin' },
      { key: 'temporada', label: 'Temporada', type: 'select', options: ['Verano', { value: 'W', label: 'Invierno' }] },
      { key: 'radial', label: 'Radial', type: 'boolean' },
      { key: 'carga', label: 'Índice de carga', type: 'range' },
      { key: 'marca', label: 'Marca', type: 'select', optionsSource: 'remote:brands' },
    ],
  };

  it('normalizes attributes with defaults', () => {
    const s = normalizeSchema(tires);
    expect(s.textSearch.param).toBe('q');
    expect(s.attributes).toHaveLength(6);
    expect(s.attributes[0].param).toBe('width');
    expect(s.attributes[1].param).toBe('rin');
    expect(s.attributes[2].options).toEqual([{ value: 'Verano', label: 'Verano' }, { value: 'W', label: 'Invierno' }]);
    expect(s.display.title).toBe('{{name}}');
  });

  it('rejects invalid schemas', () => {
    expect(() => normalizeSchema({ attributes: [{ key: 'bad key' }] })).toThrow(SchemaError);
    expect(() => normalizeSchema({ attributes: [{ key: 'a' }, { key: 'a' }] })).toThrow(/duplicado/);
    expect(() => normalizeSchema({ attributes: [{ key: 'x', type: 'select' }] })).toThrow(/options/);
    expect(() => normalizeSchema({ attributes: [{ key: 'x', type: 'color' }] })).toThrow(/no soportado/);
  });

  it('handles an empty schema (text search only)', () => {
    const s = normalizeSchema(null);
    expect(s.textSearch.enabled).toBe(true);
    expect(s.attributes).toEqual([]);
  });

  it('coerces raw string params into typed values', () => {
    const s = normalizeSchema(tires);
    const out = coerceParams(s, { texto: ' michelin ', ancho: '205', rin: '1 5/16', temporada: 'Verano', radial: 'sí', carga: '91-94', marca: '' });
    expect(out).toEqual({ text: 'michelin', ancho: 205, rin: 1.3125, temporada: 'Verano', radial: true, carga: { min: 91, max: 94 } });
  });

  it('accepts the provider param name as an alias when coercing', () => {
    const s = normalizeSchema(tires);
    expect(coerceParams(s, { width: '195' })).toEqual({ ancho: 195 });
  });

  it('parses fractions and decimals', () => {
    expect(parseFraction('3/4')).toBe(0.75);
    expect(parseFraction('1 5/16')).toBe(1.3125);
    expect(parseFraction('50,5')).toBe(50.5);
    expect(parseFraction(16)).toBe(16);
    expect(parseFraction('abc')).toBeNull();
  });

  it('generates tool parameters with required keys and hints', () => {
    const p = toToolParameters(normalizeSchema(tires));
    expect(p.type).toBe('OBJECT');
    expect(p.required).toEqual(['rin']);
    expect(p.properties.texto).toBeDefined();
    expect(p.properties.rin.description).toMatch(/OBLIGATORIO/);
    expect(p.properties.rin.description).toMatch(/diámetro del rin/);
    expect(p.properties.temporada.description).toMatch(/Verano, W/);
    expect(Object.keys(p.properties)).toHaveLength(7);
  });

  it('describes the schema for the prompt, merging remote options', () => {
    const text = toPromptDescription(normalizeSchema(tires), { marca: [{ value: 'Michelin' }, { value: 'Pirelli' }] });
    expect(text).toMatch(/Rin \(rin\) en in — OBLIGATORIO/);
    expect(text).toMatch(/Marca \(marca\). Valores válidos: Michelin, Pirelli/);
  });
});

describe('catalog/product', () => {
  it('applies tax both ways', () => {
    const pre = normalizePricing({ taxRate: 0.16, pricesIncludeTax: false });
    expect(applyPricing(100, pre)).toEqual({ pricePreTax: 100, priceNet: 116 });
    const inc = normalizePricing({ taxRate: 0.16, pricesIncludeTax: true });
    expect(applyPricing(116, inc)).toEqual({ pricePreTax: 100, priceNet: 116 });
    expect(applyPricing('x', pre)).toEqual({ pricePreTax: null, priceNet: null });
  });

  it('falls back to default pricing', () => {
    expect(normalizePricing(undefined)).toEqual({ taxRate: 0.16, pricesIncludeTax: false, currency: 'MXN' });
    expect(normalizePricing({ taxRate: 'nope', currency: 'USD' }).taxRate).toBe(0.16);
  });

  it('builds a product and sums stock by location', () => {
    const p = makeProduct({ sku: 'A1', name: 'Llanta', price: 1000, stock: { byLocation: { Norte: 2, Sur: '3' } }, attributes: { rin: 16 } }, normalizePricing(null));
    expect(p.priceNet).toBe(1160);
    expect(p.stock).toEqual({ total: 5, byLocation: { Norte: 2, Sur: '3' } });
    expect(renderTemplate('{{name}} · R{{attributes.rin}} · {{missing}}', p)).toBe('Llanta · R16');
    expect(toCartItem(p, 2)).toEqual({ clave: 'A1', descripcion: 'Llanta', precio: 1160, cantidad: 2, attributes: { rin: 16 } });
  });
});

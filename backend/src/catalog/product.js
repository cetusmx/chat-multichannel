/**
 * Stable product DTO shared by every catalog provider.
 *
 * {
 *   sku: 'PK-0500', name: 'Kit empaques pistón 50', description: '…',
 *   pricePreTax: 527.59, priceNet: 612.00, taxRate: 0.16, currency: 'MXN',
 *   unit: 'pza', packSize: 1,
 *   stock: { total: 12, byLocation: { Saltillo: 10, Monterrey: 2 } } | null,
 *   imageUrl: 'https://…' | null,
 *   attributes: { familia: 'ORINGS', rin: 16, … },
 *   raw: { …provider record… }
 * }
 */

const DEFAULT_PRICING = { taxRate: 0.16, pricesIncludeTax: false, currency: 'MXN' };

function normalizePricing(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const taxRate = Number(p.taxRate);
  return {
    taxRate: isFinite(taxRate) && taxRate >= 0 ? taxRate : DEFAULT_PRICING.taxRate,
    pricesIncludeTax: !!p.pricesIncludeTax,
    currency: p.currency || DEFAULT_PRICING.currency,
  };
}

/** Derives pre-tax and net prices from whatever the provider returned. */
function applyPricing(price, pricing) {
  const n = Number(price);
  if (!isFinite(n)) return { pricePreTax: null, priceNet: null };
  const factor = 1 + pricing.taxRate;
  if (pricing.pricesIncludeTax) return { pricePreTax: round2(n / factor), priceNet: round2(n) };
  return { pricePreTax: round2(n), priceNet: round2(n * factor) };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function stockTotal(stock) {
  if (!stock) return null;
  if (typeof stock.total === 'number') return stock.total;
  if (stock.byLocation) return Object.values(stock.byLocation).reduce((a, b) => a + (Number(b) || 0), 0);
  return null;
}

/** Builds a Product from already-mapped fields; providers call this last. */
function makeProduct(fields, pricing) {
  const { pricePreTax, priceNet } = applyPricing(fields.price, pricing);
  const stock = fields.stock ? { total: stockTotal(fields.stock), byLocation: fields.stock.byLocation || null } : null;
  return {
    sku: String(fields.sku ?? ''),
    name: fields.name || fields.description || String(fields.sku ?? ''),
    description: fields.description || '',
    pricePreTax,
    priceNet,
    taxRate: pricing.taxRate,
    currency: pricing.currency,
    unit: fields.unit || null,
    packSize: fields.packSize || null,
    stock,
    imageUrl: fields.imageUrl || null,
    attributes: fields.attributes || {},
    raw: fields.raw ?? null,
  };
}

/** Cart line item shape used by Client.cartData and the quote PDF. */
function toCartItem(product, cantidad = 1) {
  return {
    clave: product.sku,
    descripcion: product.name,
    precio: product.priceNet,
    cantidad,
    attributes: Object.keys(product.attributes || {}).length ? product.attributes : undefined,
  };
}

/** Renders "{{name}} · {{attributes.rin}}" style templates against a product. */
function renderTemplate(template, product) {
  if (!template) return '';
  return String(template).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const direct = product[path];
    if (direct != null && typeof direct !== 'object') return String(direct);
    const attr = product.attributes?.[path.replace(/^attributes\./, '')];
    return attr != null ? String(attr) : '';
  }).replace(/\s*·\s*(·\s*)+/g, ' · ').replace(/^\s*·\s*|\s*·\s*$/g, '').trim();
}

module.exports = { normalizePricing, applyPricing, makeProduct, toCartItem, renderTemplate, stockTotal, round2 };

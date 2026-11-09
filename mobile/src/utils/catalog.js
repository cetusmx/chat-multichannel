/**
 * Helpers for the provider-agnostic Product DTO returned by /api/catalog.
 * Mirrors backend/src/catalog/product.js (same file as frontend/src/utils/catalog.js).
 */

export function renderProductTemplate(template, product) {
  if (!template || !product) return '';
  return String(template)
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
      const direct = product[path];
      if (direct != null && typeof direct !== 'object') return String(direct);
      const attr = product.attributes?.[path.replace(/^attributes\./, '')];
      return attr != null ? String(attr) : '';
    })
    .replace(/\s*·\s*(·\s*)+/g, ' · ')
    .replace(/^\s*·\s*|\s*·\s*$/g, '')
    .trim();
}

export function productTitle(product, display) {
  return renderProductTemplate(display?.title || '{{name}}', product) || product.name || product.sku;
}

export function productSubtitle(product, display) {
  return renderProductTemplate(display?.subtitle || '{{sku}}', product);
}

/** Badge texts for a product according to display.badges (attribute keys). */
export function productBadges(product, display, schema) {
  const keys = display?.badges || [];
  return keys
    .map((key) => {
      const value = product.attributes?.[key];
      if (value == null || value === '') return null;
      const attr = schema?.attributes?.find((a) => a.key === key);
      const label = attr?.options?.find((o) => String(o.value) === String(value))?.label ?? String(value);
      return attr?.unit ? `${label} ${attr.unit}` : label;
    })
    .filter(Boolean);
}

export function stockLabel(product) {
  const total = product.stock?.total;
  if (total == null) return null;
  return total > 0 ? `${total} en existencia` : 'Sin existencia';
}

/** Product DTO -> cart line item (the shape stored in Client.cartData). */
export function productToCartItem(product, cantidad = 1) {
  const item = {
    clave: product.sku,
    descripcion: product.name,
    precio: Number(product.priceNet ?? 0),
    cantidad,
  };
  if (product.attributes && Object.keys(product.attributes).length) item.attributes = product.attributes;
  return item;
}

/** Product DTO -> PRODUCT_CARD message metadata. */
export function productToCardMetadata(product) {
  return {
    clave: product.sku,
    description: product.name,
    priceNet: product.priceNet != null ? Number(product.priceNet).toFixed(2) : null,
    imageUrl: product.imageUrl || null,
    attributes: product.attributes || {},
    rawProduct: product.raw ?? null,
  };
}

/** Initial values for a search form derived from the schema defaults. */
export function initialSearchValues(schema) {
  const values = { q: '' };
  for (const a of schema?.attributes || []) values[a.key] = a.defaultValue ?? '';
  return values;
}

/** True when every required attribute has a value. */
export function hasRequiredValues(schema, values) {
  return (schema?.attributes || []).filter((a) => a.required).every((a) => values[a.key] !== '' && values[a.key] != null);
}

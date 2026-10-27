/**
 * Cart helpers. `client.cartData` can be a JSON string, an array of items or
 * an object { items, shippingAddress, billing... }. These helpers normalize it.
 */
export function parseCart(raw) {
  if (!raw) return { items: [], meta: {} };
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw || '[]');
    } catch {
      return { items: [], meta: {} };
    }
  }
  if (Array.isArray(data)) return { items: data, meta: {} };
  const { items = [], ...meta } = data || {};
  return { items: Array.isArray(items) ? items : [], meta };
}

export function getCartItems(client) {
  return parseCart(client?.cartData ?? client?.cart).items;
}

export const IVA_RATE = 0.16;

/** Sum of line totals. Prices are stored net (IVA included). */
export function cartTotal(items) {
  return items.reduce((acc, it) => acc + (Number(it.precio) || 0) * (Number(it.cantidad) || 0), 0);
}

/** Mirrors CartViewer: total is IVA-inclusive, subtotal is derived from it. */
export function cartTotals(items) {
  const total = cartTotal(items);
  const subtotal = total / (1 + IVA_RATE);
  return { subtotal, iva: total - subtotal, total, count: items.length };
}

/**
 * Returns a new cartData payload with `item` appended (or merged by clave).
 * Preserves the original shape (array vs object with meta).
 */
export function withAddedItem(raw, item) {
  const { items, meta } = parseCart(raw);
  const idx = items.findIndex((i) => i.clave === item.clave);
  let next;
  if (idx >= 0) {
    next = items.map((i, n) => (n === idx ? { ...i, cantidad: (Number(i.cantidad) || 0) + (Number(item.cantidad) || 1) } : i));
  } else {
    next = [...items, item];
  }
  const hasMeta = Object.keys(meta).length > 0;
  return hasMeta ? { ...meta, items: next } : next;
}

/**
 * Maps a SealMarket catalog record onto a cart line item.
 * Catalog PRECIO is pre-tax; the cart stores net prices (IVA included),
 * mirroring CartViewer.handleInjectProduct.
 */
export function catalogProductToItem(product, cantidad = 1) {
  return {
    clave: product.CVE_ART || product.clave,
    descripcion: product.DESC_ECOMM || product.DESCR || product.NOMBRE || product.descripcion || '',
    precio: Number(((Number(product.PRECIO) || 0) * (1 + IVA_RATE)).toFixed(2)),
    cantidad,
  };
}

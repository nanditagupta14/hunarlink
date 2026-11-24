/* ==========================================================================
   Utilities
   --------------------------------------------------------------------------
   Pure helpers. The originals lived in the legacy controller and reached into
   a global AppState; these take what they need as arguments instead, so React
   state is the only source of truth.

   The behaviour (currency formatting, product lookup, cart arithmetic,
   coupon rules) is carried over unchanged — these rules were verified in the
   static build and there is no reason to re-derive them.
   ========================================================================== */

import { SEED_PRODUCTS } from '../data/products.js';

/* ---------------------------------------------------------------- storage */

export function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or blocked storage — non-fatal */
  }
}

/* ---------------------------------------------------------------- currency */

export function formatINR(num) {
  const n = Math.round(Number(num) || 0);
  return '\u20b9' + n.toLocaleString('en-IN');
}

/* ---------------------------------------------------------------- products */

export function buildCatalogue(customProducts = []) {
  const overrides = loadStorage('hunarlink_product_overrides', {});
  const merged = [...customProducts, ...SEED_PRODUCTS].map((p) => {
    const ov = overrides && overrides[p.id];
    return ov ? { ...p, ...ov } : p;
  });
  return merged.filter((p) => p.status !== 'paused');
}

export function findProduct(catalogue, id) {
  return catalogue.find((p) => p.id === id) || catalogue[0];
}

/* -------------------------------------------------------------------- cart */

export const COUPONS = {
  VALLEY10: { type: 'percent', value: 10 },
  FIRSTCRAFT: { type: 'flat', value: 2500 }
};

export function cartTotals(cart, catalogue, couponCode) {
  let totalMrp = 0;
  let sellingSubtotal = 0;
  let itemCount = 0;

  cart.forEach((entry) => {
    const p = findProduct(catalogue, entry.productId);
    if (!p) return;
    totalMrp += p.mrp * entry.qty;
    sellingSubtotal += p.price * entry.qty;
    itemCount += entry.qty;
  });

  const artisanDiscount = totalMrp - sellingSubtotal;

  let couponDiscount = 0;
  const coupon = couponCode ? COUPONS[couponCode] : null;
  if (coupon) {
    couponDiscount =
      coupon.type === 'percent'
        ? Math.round((sellingSubtotal * coupon.value) / 100)
        : Math.min(coupon.value, sellingSubtotal);
  }

  const netPayable = Math.max(0, sellingSubtotal - couponDiscount);

  return { totalMrp, sellingSubtotal, itemCount, artisanDiscount, couponDiscount, netPayable };
}

/* -------------------------------------------------------- recently viewed */

export function readRecentlyViewed() {
  return loadStorage('hunarlink_recently_viewed', []);
}

export function pushRecentlyViewed(id) {
  let list = readRecentlyViewed().filter((x) => x !== id);
  list.unshift(id);
  if (list.length > 12) list = list.slice(0, 12);
  saveStorage('hunarlink_recently_viewed', list);
  return list;
}

/* Asset paths. Vite's BASE_URL carries the deployment prefix (/hunarlink/ or
   /hunarlink/react/), so files in public/ must be referenced through it rather
   than from the server root — otherwise every image 404s under the subpath. */
export function asset(path) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${base}/${String(path).replace(/^\//, '')}`;
}

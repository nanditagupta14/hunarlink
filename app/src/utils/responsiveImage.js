/* ==========================================================================
   responsiveImage
   --------------------------------------------------------------------------
   Turns a products.js path like "assets/products/kani_01.jpg" into a <picture>
   source set, without the caller having to know anything about image sizes.

   Why this exists
   ---------------
   Every catalogue image was shipped exactly as photographed: 106 JPEGs, most
   1400 px tall, rendered into a card about 360 px wide. The browser had no
   smaller version to ask for and no way to know which one it needed, so a
   phone downloaded ~200 KB to paint a 360 px thumbnail. Lighthouse measured
   ~1.9 MB of avoidable image weight on a single home-page visit.

   What it does
   ------------
   A 2x image needs twice the CSS pixels, so a 520 px variant covers every
   screen up to a 260 px-wide render box, and 1040 px covers up to 520 px.
   `sizes` tells the browser how wide the box will actually be; the browser
   then picks the smallest candidate that is still sharp on the user's screen.
   Both are declared, and the browser keeps them for later: resize the window
   and it re-picks without a reload.

   The `<img>` fallback is the original JPEG, so nothing breaks in a browser
   with no WebP support — it simply gets the heavier file it used to get.
   ========================================================================== */

/* Which source directory each variant set was generated for, and the widths
   available in it. Kept in sync by tools/make_variants.py. */
const VARIANT_WIDTHS = {
  'assets/products/': [520, 1040],
  'img/artisans/': [420, 840],
  'assets/': [400, 800]
};

/* How wide the img will render, per directory. These mirror the CSS: product
   cards are a 4:3 box in a ~300-360 px grid column, artisan portraits are
   ~420 px, and hero/bento art spans half the hero. A wrong value here does not
   break anything — it only makes the browser pick a bigger or smaller file
   than ideal. */
const DEFAULT_SIZES = {
  'assets/products/': '(max-width: 620px) 92vw, (max-width: 1024px) 46vw, 30vw',
  'img/artisans/': '(max-width: 760px) 88vw, 40vw',
  'assets/': '(max-width: 760px) 92vw, 46vw'
};

function dirOf(path) {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i + 1);
}

/* "assets/products/kani_01.jpg" -> "assets/products/kani_01" */
function stemOf(path) {
  return path.replace(/\.(jpe?g|png)$/i, '');
}

export function webpSources(path) {
  if (!path) return null;
  const dir = dirOf(path);
  const widths = VARIANT_WIDTHS[dir];
  if (!widths) return null;
  const stem = stemOf(path);
  return widths.map((w) => ({
    width: w,
    src: `${stem}-${w}.webp`,
    srcSet: `${stem}-${w}.webp ${w}w`
  }));
}

export function sizesFor(path) {
  if (!path) return undefined;
  return DEFAULT_SIZES[dirOf(path)];
}

/* Convenience: everything a <picture> source needs in one call. Returns null
   when no WebP variants exist for that path, in which case the caller should
   render a plain <img> exactly as before. */
export default function responsiveImage(path) {
  const variants = webpSources(path);
  if (!variants) return null;
  return {
    srcSet: variants.map((v) => v.srcSet).join(', '),
    sizes: sizesFor(path)
  };
}

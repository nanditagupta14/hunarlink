import React, { useEffect, useRef, useState } from 'react';
import { useStore, PRICE_BOUNDS } from '../../state/StoreContext.jsx';
import { formatINR } from '../../utils/legacy.js';
import ProductCard from '../ProductCard.jsx';
import { CRAFT_FILTERS, TECHNIQUES, guildById, techniqueById } from '../../data/guilds.js';

/* ==========================================================================
   MarketplaceSection — Featured Heirloom Treasures
   --------------------------------------------------------------------------
   The part of the site that was most broken in the first attempt: the chip
   clicks timed out because the chip elements never existed in the React tree.
   Here every control is a real input wired to the store, and the grid is a
   plain `.map` over derived state.

   The filter veil is scoped to the products stage, never the page — and it is
   held for a minimum time so the change is actually perceptible rather than a
   flicker. Feedback matters more than the milliseconds saved.
   ========================================================================== */

const LOADER_MIN_MS = 700;

/* Pills come from the guild taxonomy rather than a local copy, so the toolbar,
   the footer links and the product breadcrumbs can never disagree about what
   the guilds are. See data/guilds.js for why Kani and Sozni are no longer
   their own entries here. */
const CAT_PILLS = CRAFT_FILTERS;

export default function MarketplaceSection() {
  const {
    ui,
    veil,
    raiseVeil,
    lowerVeil,
    setFilters,
    resetFilters,
    catalogue,
    filteredProducts,
    recentlyViewedItems,
    clearRecentlyViewed
  } = useStore();
  const f = ui.filters;

  /* ---------------------------------------------------------- filter veil */
  const stageRef = useRef(null);
  const [veilBox, setVeilBox] = useState(null);
  const timers = useRef({});

  /* The veil only ever covers the visible slice of the products stage. With 96
     cards the stage is thousands of pixels tall; covering it literally would
     park the spinner far below the fold. */
  const measure = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    const vh = window.innerHeight;
    const MIN_VEIL = 220;
    let top = Math.max(r.top, 0);
    let bottom = Math.min(r.bottom, vh);
    if (bottom - top < MIN_VEIL) {
      top = Math.min(top, Math.max(vh - MIN_VEIL - 40, 0));
      bottom = Math.min(vh, top + Math.max(MIN_VEIL, vh - top));
    }
    setVeilBox({
      top: Math.round(top),
      left: Math.round(Math.max(r.left, 0)),
      width: Math.round(Math.min(r.width, window.innerWidth)),
      height: Math.round(Math.max(bottom - top, MIN_VEIL))
    });
  };

  useEffect(() => {
    if (!veil.open) return;
    measure();
    const onScroll = () => measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [veil.open]);

  useEffect(
    () => () => {
      clearTimeout(timers.current.paint);
      clearTimeout(timers.current.hide);
    },
    []
  );

  /* Any filter change paints the veil, commits the change, then lifts it after
     a guaranteed minimum. The reason string names the control that was used —
     deriving it from overall state made every later message misleading. */
  /* Every filter control goes through here, the price slider included. The
     slider used to bypass the veil so it could react on every pixel of
     travel; that made it the one control with no loading state, which is what
     was reported. The 140ms commit below is short enough that dragging still
     feels live, and the veil is held for a guaranteed minimum so the change is
     perceptible rather than a flicker. */
  const runFilter = (patch, reason) => {
    const now = Date.now();
    const sincePaint = now - (timers.current.lastPaint || 0);
    timers.current.lastPaint = now;

    clearTimeout(timers.current.paint);
    clearTimeout(timers.current.hide);
    raiseVeil(reason);
    measure();

    /* consecutive slider events keep the veil up instead of restarting it */
    timers.current.paint = setTimeout(() => {
      setFilters(patch);
      timers.current.hide = setTimeout(() => lowerVeil(), LOADER_MIN_MS);
    }, sincePaint < 250 ? 40 : 140);
  };

  const toggleCat = (id) => {
    const next = f.guild === id ? 'all' : id;
    runFilter(
      { guild: next, artisan: '' },
      next === 'all'
        ? 'Showing every craft guild\u2026'
        : `Filtering by ${labelFor(next)}\u2026`
    );
  };

  const cheap = catalogue.filter((p) => p.price <= f.maxPrice).length;
  const total = catalogue.length;
  const shown = filteredProducts.length;

  const chips = [];
  if (f.guild !== 'all') chips.push(`Guild: ${guildById(f.guild)?.label || f.guild}`);
  if (f.technique && f.technique !== 'all')
    chips.push(`Technique: ${techniqueById(f.technique)?.label || f.technique}`);
  if (f.artisan) chips.push(`Artisan: ${f.artisan}`);
  if (f.query) chips.push(`Search: "${f.query}"`);
  if (f.maxPrice < PRICE_BOUNDS.max) chips.push(`Max: ${formatINR(f.maxPrice)}`);
  if (f.district !== 'all') chips.push(`Cluster: ${f.district}`);

  return (
    <section className="marketplace-section" id="marketplace-section">
      <div className="container">
        <div className="section-header-split">
          <div>
            <div className="section-kicker">
              DIRECT FROM ARTISAN LOOMS &bull; ZERO MIDDLEMAN CUT
            </div>
            <h2 className="section-title">Featured Heirloom Treasures</h2>
          </div>

          <div className="category-pills-row">
            {CAT_PILLS.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`cat-pill-btn${f.guild === c.id ? ' active' : ''}`}
                data-cat={c.id}
                aria-pressed={f.guild === c.id}
                onClick={() => toggleCat(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Technique sub-filter. Only pashmina has techniques — Kani is a
            weave and Sozni is embroidery, both applied to a pashmina base — so
            this row appears only when that guild is active. Showing it against
            Walnut would offer a "Kani walnut box", which does not exist. */}
        {f.guild === 'pashmina' && (
          <div className="technique-row" role="group" aria-label="Pashmina technique">
            <span className="technique-row-label">Technique</span>
            <button
              type="button"
              className={`technique-pill${f.technique === 'all' ? ' active' : ''}`}
              aria-pressed={f.technique === 'all'}
              onClick={() => runFilter({ technique: 'all' }, 'Showing all pashmina techniques\u2026')}
            >
              All
            </button>
            {TECHNIQUES.map((t) => (
              <button
                type="button"
                key={t.id}
                className={`technique-pill${f.technique === t.id ? ' active' : ''}`}
                data-technique={t.id}
                aria-pressed={f.technique === t.id}
                title={t.blurb}
                onClick={() =>
                  runFilter(
                    { technique: t.id },
                    `Filtering by ${t.label}\u2026`
                  )
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flipkart-filter-bar">
          <div className="filter-group filter-group-price">
            <label className="filter-label" htmlFor="price-range-slider">
              <span>Max Price</span>
              <span id="price-slider-val">
                {f.maxPrice >= PRICE_BOUNDS.max
                  ? 'Any price'
                  : formatINR(f.maxPrice)}
              </span>
            </label>
            <input
              type="range"
              id="price-range-slider"
              className="filter-range"
              min={PRICE_BOUNDS.min}
              max={PRICE_BOUNDS.max}
              /* The step has to divide (max - min) exactly or the browser
                 snaps both ends inward: with step=500 and a 450-210000 range
                 the dearest piece (exactly 210000) was unreachable, so the
                 grid showed 95 of 96 at full extension. Both bounds are
                 multiples of 50, so 50 is always exact. */
              step="50"
              value={f.maxPrice}
              aria-describedby="price-match-count"
              onChange={(e) => {
                const v = Number(e.target.value);
                runFilter(
                  { maxPrice: v },
                  v >= PRICE_BOUNDS.max
                    ? 'Lifting the budget cap\u2026'
                    : `Showing crafts under ${formatINR(v)}\u2026`
                );
              }}
            />
            <div
              className={`price-match-count${cheap === 0 ? ' is-empty' : ''}`}
              id="price-match-count"
              aria-live="polite"
            >
              {cheap} {cheap === 1 ? 'craft' : 'crafts'} within budget
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="rating-filter">
              Customer Rating
            </label>
            <select
              id="rating-filter"
              className="filter-select"
              value={String(f.minRating)}
              onChange={(e) =>
                runFilter(
                  { minRating: Number(e.target.value) },
                  Number(e.target.value) > 0
                    ? `Filtering ${e.target.value}\u2605 and above\u2026`
                    : 'Showing all verified ratings\u2026'
                )
              }
            >
              <option value="0">All Verified Ratings</option>
              <option value="4.8">4.8 &amp; Above</option>
              <option value="4.9">4.9 &amp; Above</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="gi-tier-filter">
              Verification Tier
            </label>
            <select
              id="gi-tier-filter"
              className="filter-select"
              value={String(f.giTier)}
              onChange={(e) => runFilter({ giTier: Number(e.target.value) }, 'Filtering by GI seal tier\u2026')}
            >
              <option value="0">All 3-Tier GI Seals</option>
              <option value="3">Level 3: Ustad Laser Seal</option>
              <option value="2">Level 2+: Lab Purity Audited</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="district-filter">
              Valley Cluster
            </label>
            <select
              id="district-filter"
              className="filter-select"
              value={f.district}
              onChange={(e) =>
                runFilter(
                  { district: e.target.value },
                  e.target.value === 'all'
                    ? 'Showing all J&K clusters\u2026'
                    : `Filtering ${e.target.value} workshops\u2026`
                )
              }
            >
              <option value="all">All J&amp;K Clusters</option>
              <option value="Srinagar">Srinagar Cluster</option>
              <option value="Budgam">Budgam Cluster</option>
              <option value="Anantnag">Anantnag Cluster</option>
              <option value="Baramulla">Baramulla Cluster</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="sort-select">
              Sort Catalog By
            </label>
            <select
              id="sort-select"
              className="filter-select"
              value={f.sort}
              onChange={(e) => runFilter({ sort: e.target.value }, 'Sorting GI-certified treasures\u2026')}
            >
              <option value="featured">Featured Heirloom Curations</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating-desc">User Rating: High to Low</option>
              <option value="hours-desc">Loom Hours: Most Intricate</option>
            </select>
          </div>
        </div>

        <div className="active-filters-strip">
          <div className="results-summary-text" id="results-summary">
            {shown === total
              ? `Showing all ${total} GI-Certified Valley Treasures`
              : `Showing ${shown} of ${total} GI-Certified Valley Treasures`}
          </div>
          <div className="active-chips-wrap">
            <div id="active-filter-chips" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {chips.map((c) => (
                <span className="filter-chip-tag" key={c}>
                  {c}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="btn-reset-filters"
              id="clear-filters-btn"
              onClick={() => {
                /* Reset used to call the store directly, so clearing six
                   filters at once produced no loading state at all. */
                raiseVeil('Returning to the full collection\u2026');
                measure();
                clearTimeout(timers.current.hide);
                resetFilters();
                timers.current.hide = setTimeout(() => lowerVeil(), LOADER_MIN_MS);
              }}
            >
              Reset All Filters
            </button>
          </div>
        </div>

        <div className="products-stage" id="products-stage" ref={stageRef} aria-busy={veil.open}>
          <div className="product-grid" id="product-grid">
            {shown === 0 ? (
              <div
                style={{
                  gridColumn: '1 / -1',
                  background: '#FFF',
                  padding: 42,
                  textAlign: 'center',
                  borderRadius: 12,
                  border: '1px solid var(--border-light)'
                }}
              >
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.5rem',
                    marginBottom: 8
                  }}
                >
                  No Matching Heirloom Crafts Found
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-500)', marginBottom: 16 }}>
                  Try broadening your price slider or resetting active guild filters.
                </p>
                <button
                  type="button"
                  className="btn-primary-forest"
                  onClick={() => {
                    raiseVeil('Returning to the full collection\u2026');
                    measure();
                    clearTimeout(timers.current.hide);
                    resetFilters();
                    timers.current.hide = setTimeout(() => lowerVeil(), LOADER_MIN_MS);
                  }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              filteredProducts.map((p) => <ProductCard key={p.id} product={p} />)
            )}
          </div>

          <div
            className={`products-loader${veil.open ? ' is-visible' : ''}`}
            id="products-loader"
            role="status"
            aria-live="polite"
            hidden={!veil.open}
            style={
              veilBox
                ? {
                    top: veilBox.top,
                    left: veilBox.left,
                    width: veilBox.width,
                    height: veilBox.height
                  }
                : undefined
            }
          >
            <div className="pl-inner">
              <div className="pl-loom" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="pl-title">Curating your selection</div>
              <div className="pl-sub" id="products-loader-sub">
                {veil.text || `Filtering ${total} GI-certified treasures\u2026`}
              </div>
              <div className="pl-bar" aria-hidden="true">
                <i />
              </div>
            </div>
          </div>
        </div>

        {recentlyViewedItems.length > 0 && (
          <div
            id="home-recent-wrapper"
            style={{
              marginTop: 48,
              borderTop: '1px solid var(--border-light)',
              paddingTop: 36
            }}
          >
            <div className="section-header-split">
              <div>
                <div className="section-kicker">YOUR DISCOVERY TRAIL</div>
                <h2 className="section-title">Recently Viewed Heirlooms</h2>
              </div>
              <button type="button" className="btn-reset-filters" onClick={clearRecentlyViewed}>
                Clear History
              </button>
            </div>
            <div className="product-grid" id="home-recent-grid">
              {recentlyViewedItems.map((p) => (
                <ProductCard key={`recent-${p.id}`} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function labelFor(id) {
  const found = CAT_PILLS.find((c) => c.id === id);
  if (found) return found.label;
  return id.charAt(0).toUpperCase() + id.slice(1).replace('-', ' ');
}

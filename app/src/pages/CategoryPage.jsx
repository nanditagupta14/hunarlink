import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../state/StoreContext.jsx';
import { GUILDS, TECHNIQUES, guildById, techniqueById } from '../data/guilds.js';
import ProductCard from '../components/ProductCard.jsx';
import { formatINR, asset } from '../utils/legacy.js';
import '../styles/category.css';

/* ==========================================================================
   CategoryPage
   --------------------------------------------------------------------------
   Why this page exists
   --------------------
   The product breadcrumb used to read PASHMINA TEXTILES / HANDWOVEN and link
   back to /#marketplace-section, which applied a filter to the whole store.
   A visitor who clicked it got all 96 pieces with a chip selected — not the
   twelve handwoven shawls the crumb had just named. This page is where that
   crumb should have gone all along: a listing that belongs to one category.

   One template, many categories
   -----------------------------
   /category/pashmina            a guild on its own
   /category/pashmina-handwoven  a technique inside a guild
   /category/walnut              the other guilds, same shape

   The technique slug carries the guild in front of it because "handwoven"
   is not a category on its own — it is a way of making pashmina. Routing it
   as /category/handwoven would put it back on the same level as Walnut Wood,
   which is the genus-and-species mistake this taxonomy was fixed to remove.

   Everything on the page is derived
   ---------------------------------
   The counts, price range, cluster list and loom hours are computed from the
   catalogue on every render. Nothing is typed in, so a price change or a new
   seller listing cannot leave the header claiming something untrue.
   ========================================================================== */

const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'rating-desc', label: 'Highest rated' },
  { id: 'hours-desc', label: 'Most loom hours' }
];

/* "pashmina-handwoven" -> { guildId: 'pashmina', techniqueId: 'handwoven' }.
   A guild id can itself contain a hyphen (silk-rugs, papier-mache), so the
   split has to try every technique suffix rather than assume one. */
export function parseCategorySlug(slug = '') {
  const clean = String(slug).toLowerCase();
  for (const t of TECHNIQUES) {
    if (clean.endsWith(`-${t.id}`)) {
      const guildId = clean.slice(0, -(`-${t.id}`.length));
      if (guildById(guildId)) return { guildId, techniqueId: t.id };
    }
  }
  if (guildById(clean)) return { guildId: clean, techniqueId: null };
  return { guildId: null, techniqueId: null };
}

export function categorySlug(guildId, techniqueId) {
  return techniqueId ? `${guildId}-${techniqueId}` : guildId;
}

const inr = (n) => formatINR(n);

export default function CategoryPage() {
  const { slug } = useParams();
  const { catalogue } = useStore();
  const { guildId, techniqueId } = useMemo(() => parseCategorySlug(slug), [slug]);

  const [sort, setSort] = useState('featured');
  const [district, setDistrict] = useState('all');

  const guild = guildById(guildId);
  const technique = techniqueById(techniqueId);

  /* The category's own items. A technique narrows its parent guild; a guild on
     its own shows everything filed under it. */
  const items = useMemo(() => {
    if (!guildId) return [];
    return catalogue.filter(
      (p) => p.guild === guildId && (!techniqueId || p.technique === techniqueId)
    );
  }, [catalogue, guildId, techniqueId]);

  const districts = useMemo(
    () => [...new Set(items.map((p) => p.district))].sort(),
    [items]
  );

  const shown = useMemo(() => {
    let list = district === 'all' ? items : items.filter((p) => p.district === district);
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === 'rating-desc') list = [...list].sort((a, b) => b.rating - a.rating);
    else if (sort === 'hours-desc') list = [...list].sort((a, b) => b.loomHours - a.loomHours);
    return list;
  }, [items, district, sort]);

  /* Buying this as a category rather than a page: filters and sort are page
     state, so switching category must not carry them across. */
  useEffect(() => {
    setSort('featured');
    setDistrict('all');
  }, [slug]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  /* ------------------------------------------------------------- unknown */
  if (!guild) {
    return (
      <div className="cat-shell">
        <div className="cat-wrap cat-empty">
          <h1>That craft is not in the guild</h1>
          <p>
            There is no category called &ldquo;{slug}&rdquo;. The four craft families are
            listed below, and each one has its own techniques.
          </p>
          <div className="cat-switch">
            {GUILDS.map((g) => (
              <Link key={g.id} to={`/category/${g.id}`} className="cat-chip">
                {g.short}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const image = items[0]?.image;
  const prices = items.map((p) => p.price);
  const hours = items.reduce((sum, p) => sum + (p.loomHours || 0), 0);
  const artisans = new Set(items.map((p) => p.artisan)).size;

  /* Sibling categories in the switcher: the pashmina family breaks into its
     techniques, the other guilds stay whole. */
  const countIn = (g, t) =>
    catalogue.filter((p) => p.guild === g && (!t || p.technique === t)).length;

  /* Pashmina breaks into its techniques and then offers the other families;
     the other families are whole and offer everything else. One row either
     way, so the switcher never changes shape under the pointer. */
  const siblings = [
    ...(guild.id === 'pashmina'
      ? [
          ...TECHNIQUES.map((t) => ({
            key: `${guild.id}-${t.id}`,
            label: t.short || t.label,
            count: countIn(guild.id, t.id),
            active: t.id === techniqueId
          })),
          { key: guild.id, label: 'All Textiles', count: countIn(guild.id), active: !techniqueId }
        ]
      : [
          {
            key: guild.id,
            label: guild.short,
            count: countIn(guild.id),
            active: true
          }
        ]),
    ...GUILDS.filter((g) => g.id !== guild.id).map((g) => ({
      key: g.id,
      label: g.short,
      count: countIn(g.id),
      active: false
    }))
  ];

  const title = technique ? `${technique.label} ${guild.short}` : guild.label;
  const lead = technique ? technique.story : guild.story;

  return (
    <div className="cat-shell">
      {/* ------------------------------------------------------ breadcrumb */}
      <div className="cat-crumbs">
        <div className="cat-wrap cat-crumbs-inner">
          <Link to="/" className="cat-back" aria-label="Back to the marketplace">
            &larr;
          </Link>
          <Link to="/">HOME</Link>
          <span className="cat-sep">/</span>
          <Link to="/#marketplace-section">EXPLORE CRAFTS</Link>
          <span className="cat-sep">/</span>
          {technique ? (
            <>
              <Link to={`/category/${guild.id}`}>{guild.label.toUpperCase()}</Link>
              <span className="cat-sep">/</span>
              <span className="cat-current">{technique.label.toUpperCase()}</span>
            </>
          ) : (
            <span className="cat-current">{guild.label.toUpperCase()}</span>
          )}
          <span className="cat-verified">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="m9 12 2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            GI-Verified Lineage
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------ hero */}
      <header className="cat-hero">
        {image && (
          <div
            className="cat-hero-photo"
            aria-hidden="true"
            style={{ backgroundImage: `url(${asset(image)})` }}
          />
        )}
        <div className="cat-wrap">
          <div className="cat-hero-kicker">
            {technique ? `${guild.label} \u00b7 Technique` : 'Craft Family'}
          </div>
          <h1>{title}</h1>
          <p>{lead}</p>
          <div className="cat-hero-stats">
            <div className="cat-stat">
              <b>{items.length}</b>
              <span>{items.length === 1 ? 'Piece listed' : 'Pieces listed'}</span>
            </div>
            <div className="cat-stat">
              <b>{artisans}</b>
              <span>{artisans === 1 ? 'Verified artisan' : 'Verified artisans'}</span>
            </div>
            <div className="cat-stat">
              <b>{districts.length}</b>
              <span>{districts.length === 1 ? 'Valley cluster' : 'Valley clusters'}</span>
            </div>
            <div className="cat-stat">
              <b>{hours.toLocaleString('en-IN')}</b>
              <span>Loom hours</span>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------- switcher */}
      <nav className="cat-switchbar" aria-label="Switch craft category">
        <div className="cat-wrap cat-switch-inner">
          <span className="cat-switch-label">Craft</span>
          {siblings.map((s) => (
            <Link
              key={s.key}
              to={`/category/${s.key}`}
              className={`cat-chip${s.active ? ' active' : ''}`}
              aria-current={s.active ? 'page' : undefined}
            >
              {s.label} <span className="cat-chip-n">{s.count}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* -------------------------------------------------------- toolbar */}
      <main className="cat-wrap">
        <div className="cat-toolbar">
          <div className="cat-count">
            Showing <b>{shown.length}</b>{' '}
            {technique ? technique.label.toLowerCase() : guild.short.toLowerCase()}{' '}
            {(shown.length === 1 ? 'piece' : 'pieces')}
            {prices.length > 0 && (
              <>
                {' '}&middot; from {inr(Math.min(...prices))} to {inr(Math.max(...prices))}
              </>
            )}
          </div>
          <div className="cat-tools">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort this category"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  Sort: {s.label}
                </option>
              ))}
            </select>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              aria-label="Filter by valley cluster"
            >
              <option value="all">All clusters</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <Link className="cat-more" to="/#marketplace-section">
              Search all {catalogue.length} crafts
            </Link>
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="cat-none">
            Nothing in this category matches that cluster. Pick another, or{' '}
            <button type="button" className="cat-link" onClick={() => setDistrict('all')}>
              show every cluster
            </button>
            .
          </p>
        ) : (
          <div className="cat-grid">
            {shown.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

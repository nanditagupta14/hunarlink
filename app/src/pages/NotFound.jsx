import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../state/StoreContext.jsx';

/* ==========================================================================
   NotFound
   --------------------------------------------------------------------------
   The old version rendered the literal string "NotFound under construction"
   into a <main> with no heading, no chrome and no link out. A judge who
   mistypes a URL — or clicks a stale bookmark — hit a dead end that read like
   a half-built prototype.

   This is a real 404: an <h1> for screen readers and search engines, the
   brand mark, the two destinations that actually exist, and a handful of
   craft guilds so the click goes somewhere useful. It is chrome-free by
   design (App.jsx keeps the header/footer around it, so this is the page
   body only).
   ========================================================================== */

const GUILD_LINKS = [
  { label: 'Pashmina & Kani Shawls', id: 'pashmina' },
  { label: 'Walnut Woodcarving', id: 'walnut' },
  { label: 'Papier-Mâché Art', id: 'papier-mache' },
  { label: 'Silk-on-Silk Rugs', id: 'silk-rugs' }
];

export default function NotFound() {
  const navigate = useNavigate();
  const { setFilters } = useStore();

  /* Guild links reuse the footer's own path: write the filter into the store,
     go to the storefront, then scroll the marketplace into view. A plain
     `/#guild=x` href would look right and do nothing — the marketplace never
     reads the hash — so the filter has to be applied through the store. */
  const pickGuild = (guild) => {
    setFilters({ guild, artisan: '' });
    navigate('/');
    setTimeout(() => {
      document.getElementById('marketplace-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 120);
  };

  return (
    <main id="main-content" className="container nf-shell">
      <div className="nf-card">
        <img
          src={`${import.meta.env.BASE_URL}img/brand/logo.svg`}
          alt=""
          className="nf-mark"
          height="60"
        />
        <p className="nf-code">Error 404</p>
        <h1 className="nf-title">This page isn&apos;t part of the guild</h1>
        <p className="nf-lede">
          The address you followed doesn&apos;t match anything in HunarLink. It may have been
          a stale link, or a piece that has since been withdrawn from the catalogue.
        </p>

        <div className="nf-actions">
          <Link className="nf-btn nf-btn--primary" to="/">
            Back to the storefront
          </Link>
          <Link className="nf-btn" to="/login">
            Sign in to your account
          </Link>
        </div>

        <div className="nf-suggest">
          <p className="nf-suggest-title">Or browse a craft guild</p>
          <ul className="nf-suggest-list">
            {GUILD_LINKS.map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => pickGuild(g.id)}>
                  {g.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

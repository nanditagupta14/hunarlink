import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/StoreContext.jsx';

/* ==========================================================================
   Footer
   --------------------------------------------------------------------------
   Four columns, guild links that drive the same marketplace filter the store
   uses, a newsletter form, and the policy bar. Links that used to point at
   `.html` files now go through the router.
   ========================================================================== */

const GUILD_LINKS = [
  /* One entry per guild in the taxonomy. Kani and Sozni used to have their own
     entry here; they are techniques inside the pashmina guild, so listing them
     as siblings sent visitors to an empty filter. */
  { guild: 'pashmina', label: 'Pashmina, Kani & Sozni Textiles' },
  { guild: 'walnut', label: 'Walnut Wood Carving' },
  { guild: 'papier-mache', label: 'Papier-M\u00e2ch\u00e9 & Naqash' },
  { guild: 'silk-rugs', label: 'Silk-on-Silk Carpets' }
];

export default function Footer() {
  const navigate = useNavigate();
  const { openModal, toast } = useStore();
  const [email, setEmail] = useState('');

  /* These links name a craft family, so they open that family's own page
     rather than filtering the whole marketplace and scrolling to it. */
  const pickGuild = (guild) => {
    navigate(`/category/${guild}`);
  };

  return (
    <footer className="site-footer" id="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="brand-logo">
              <img
                src={`${import.meta.env.BASE_URL}img/brand/logo.svg`}
                alt="HunarLink"
                className="brand-mark brand-mark--footer"
                height="46"
                loading="lazy"
              />
              <span className="brand-text-wrap">
                <span className="brand-title">HunarLink</span>
                <span className="brand-subtitle">Valley Craft Guild</span>
              </span>
            </div>
            <p className="footer-brand-desc">
              Empowering Jammu &amp; Kashmir&apos;s master artisans by connecting geo-verified looms
              and carving guilds directly with discerning collectors and hospitality partners
              worldwide&mdash;with zero middleman cut.
            </p>
            <div className="footer-badges-row">
              <span className="footer-mini-badge">GI Certified Partner</span>
              <span className="footer-mini-badge"> J&amp;K Craft Board Aligned</span>
            </div>
          </div>

          <div>
            <div className="footer-col-title">Craft Guilds</div>
            <ul className="footer-links-list">
              {GUILD_LINKS.map((g) => (
                <li key={g.guild}>
                  <button type="button" className="footer-link-btn" onClick={() => pickGuild(g.guild)}>
                    {g.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="footer-col-title">Artisan Lineage</div>
            <ul className="footer-links-list">
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => {
                    navigate('/');
                    setTimeout(
                      () =>
                        document
                          .getElementById('verification-section')
                          ?.scrollIntoView({ behavior: 'smooth' }),
                      120
                    );
                  }}
                >
                  Valley Verification Flow
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => openModal('giVerify', { giId: 'GI-JK-PASH-8821' })}
                >
                  GI Registry Lookup
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => openModal('artisanStudio')}
                >
                  Artisan Studio Onboarding
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => navigate('/login')}>
                  Artisan &amp; Seller Workspace
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => navigate('/auth?mode=register&role=artisan')}
                >
                  Register as an Artisan
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => navigate('/wholesale')}>
                  B2B Hospitality Trade Desk
                </button>
              </li>
            </ul>
          </div>

          <div>
            <div className="footer-col-title">The Valley Chronicle</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-500)' }}>
              Receive seasonal dispatches on newly completed Kani loom pieces, GI lab monographs,
              and master artisan stories.
            </p>
            <form
              className="newsletter-form"
              id="newsletter-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!email.trim()) return;
                toast('Subscribed to The Valley Chronicle', 'success');
                setEmail('');
              }}
            >
              <input
                type="email"
                id="newsletter-email" aria-label="Your email address for the newsletter"
                className="newsletter-input"
                required
                placeholder="Enter collector email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className="btn-subscribe">
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div>&copy; 2026 HunarLink Valley Craft Guild (Team 16). All Rights Reserved.</div>
          <div className="footer-policy-links">
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => openModal('giVerify', { giId: 'GI-JK-PASH-8821' })}
            >
              GI Authenticity Charter
            </button>
            <button type="button" className="footer-link-btn" onClick={() => navigate('/orders')}>
              Insured Transit &amp; Escrow Policy
            </button>
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => openModal('artisanStudio')}
            >
              Zero-Cut Artisan Pledge
            </button>
            <button type="button" className="footer-link-btn" onClick={() => navigate('/admin')}>
              Admin Console
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

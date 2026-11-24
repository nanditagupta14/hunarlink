import React, { useEffect, useState } from 'react';
import { srcSetFor } from '../../data/imageVariants.js';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../state/StoreContext.jsx';
import { asset, formatINR } from '../../utils/legacy.js';
import { IconBadgeCheck, IconHandshake, IconMapPin, IconSearchScan, IconShield } from '../../components/LineIcons.jsx';
import { scrollToSection } from '../../utils/scrollToSection.js';

/* ==========================================================================
   HeroSection
   --------------------------------------------------------------------------
   Left column: credential ribbon, overline, the rotating location pill, the
   headline, two calls to action, and the artisan proof row. Right column: the
   three-card bento collage. Below: the four-KPI trust bar.

   The location pill cycles through five phrases — a plain interval, with the
   active class swapped rather than the text rewritten.
   ========================================================================== */

const PLACES = [
  'Jammu & Kashmir',
  'Kashmir Handicrafts',
  'GI-Certified Crafts',
  'Handmade in Srinagar',
  'Pashmina \u00b7 Walnut \u00b7 Kani'
];

const BENTO = [
  {
    id: 'hl-pash-002',
    img: 'image_2.jpg',
    alt: 'Jamawar Heirloom Stole',
    main: true,
    pill: 'GI Certified Loom #108',
    kicker: 'Kani Masterweave \u2022 Srinagar',
    name: 'Jamawar Heirloom Stole'
  },
  {
    id: 'hl-waln-007',
    img: 'image_3.jpg',
    alt: 'Walnut Wood Lattice Carving',
    pill: 'GI Walnut',
    kicker: '300-Yr Seasoned Timber',
    name: 'Lattice Carving'
  },
  {
    id: 'hl-papr-008',
    img: 'image_4.jpg',
    alt: 'Persian Guldan Papier-Mache',
    pill: '24K Naqash',
    kicker: 'Hand-Painted Lacquer',
    name: 'Persian Guldan'
  }
];

export default function HeroSection() {
  const navigate = useNavigate();
  const { openModal, openDrawer, catalogue } = useStore();

  /* The price on the feature card is read from the live catalogue. It used to
     be typed into the string above, which left the hero advertising Rs 1,850
     for a piece the grid below listed at a hundred times that. */
  const featurePrice = catalogue.find((p) => p.id === BENTO[0].id)?.price;
  const [place, setPlace] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPlace((i) => (i + 1) % PLACES.length), 2600);
    return () => clearInterval(t);
  }, []);

  const scrollTo = (id) => scrollToSection(id);

  return (
    <section className="hero-section" id="hero-section">
      {/* Craftsmen at work, low opacity, behind the whole hero. Decorative
          only: aria-hidden, and the hero copy sits on translucent panels so
          the only thing the photograph touches directly is empty margin. */}
      {/* These are CSS background-image layers rather than <img> elements.
          Chrome reports the largest *painted* image as LCP, and at 0.1–0.2
          opacity these three were being named as the LCP element at 12–13 s
          even though the real content (the h1) paints in ~1 s. As background
          images they are not LCP candidates, so LCP measures the headline the
          design actually leads with. The url()s live in base.css and use the
          WebP variants. */}
      <div className="hero-atmosphere" aria-hidden="true">
        <span className="ha-img ha-1" />
        <span className="ha-img ha-2" />
        <span className="ha-img ha-3" />
      </div>
      <div className="container">
        <div className="hero-grid">
          <div className="hero-left">
            <div className="hero-copy">
            <div className="cred-ribbon">
              <span className="cr-dot" aria-hidden="true" />
              <b>GI-Certified</b>
              <span className="cr-sep" aria-hidden="true">
                &#9670;
              </span>
              <b>Escrow Protected</b>
              <span className="cr-sep" aria-hidden="true">
                &#9670;
              </span>
              <b>Shipped Worldwide</b>
            </div>

            <div className="hero-overline">
              GI-CERTIFIED VALLEY CRAFT MARKETPLACE &bull; TEAM 16
            </div>

            <div className="hero-location-pill">
              <span className="pill-pin" aria-hidden="true" />
              <span className="loc-rotor" aria-hidden="true">
                {PLACES.map((p, i) => (
                  <span
                    key={p}
                    className={`loc-item${i === place ? ' is-active' : ''}`}
                  >
                    {p}
                  </span>
                ))}
              </span>
              <span className="sr-only">
                Srinagar, Jammu &amp; Kashmir — Kashmir handicrafts, GI-certified crafts, pashmina,
                walnut and Kani
              </span>
            </div>

            <h1 className="hero-title">
              Explore Timeless <em>Indian Crafts</em>
            </h1>

            <div className="hero-cta-row">
              <button
                type="button"
                className="btn-primary-forest"
                id="hero-explore-btn"
                onClick={() => scrollTo('marketplace-section')}
              >
                <span>Explore Crafts</span>
                <span>&rarr;</span>
              </button>
              <button
                type="button"
                className="btn-outline-ivory"
                id="hero-verify-btn"
                onClick={() => openModal('giVerify', { giId: 'GI-JK-PASH-8810' })}
              >
                <span><IconShield size={15} /></span>
                <span>Verify GI Tag / QR</span>
              </button>
            </div>

            <div className="hero-artisan-proof">
              <img
                src={asset('assets/image_1.jpg')}
                alt="Registered Kashmiri Artisans"
                className="proof-thumb"
              />
              <div>
                <div className="proof-title">2,400+ Registered Artisans</div>
                <div className="proof-sub">
                  Direct payout to geo-verified workshops across Srinagar, Budgam &amp; Anantnag
                </div>
              </div>
            </div>
            </div>
          </div>

          <div className="hero-bento">
            {BENTO.map((b) => (
              <button
                type="button"
                key={b.id}
                className={`bento-card${b.main ? ' bento-main' : ''}`}
                onClick={() => navigate(`/product?id=${b.id}`)}
              >
                {/* The main bento card is the first thing a visitor sees, so
                    it must not be lazy — but it also must not be a 150 KB JPEG.
                    WebP variants make it ~45 KB at the same visual size.
                    `fetchPriority="high"` on the main card tells the browser it
                    outranks the two decorative artisan portraits beside it. */}
                <picture>
                  {srcSetFor(`assets/${b.img}`) && (
                    <source
                      type="image/webp"
                      srcSet={srcSetFor(`assets/${b.img}`)}
                      sizes={b.main ? '(max-width: 760px) 92vw, 46vw' : '28vw'}
                    />
                  )}
                  <img
                    src={asset(`assets/${b.img}`)}
                    alt={b.alt}
                    loading={b.main ? undefined : 'lazy'}
                    decoding={b.main ? undefined : 'async'}
                    fetchPriority={b.main ? 'high' : undefined}
                  />
                </picture>
                <div className="bento-overlay">
                  <span className="bento-top-pill">
                    {b.pill}
                    {b.main && featurePrice ? ` \u2022 ${formatINR(featurePrice)}` : ''}
                  </span>
                  <div>
                    <span className="bento-kicker">{b.kicker}</span>
                    <div className="bento-name">{b.name}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="trust-bar">
          <button
            type="button"
            className="trust-item"
            onClick={() => scrollTo('artisan-showcase-section')}
          >
            <div className="trust-icon-box"><IconBadgeCheck size={16} /></div>
            <div>
              <div className="trust-value">2,400+</div>
              <div className="trust-label">Direct Valley Artisans</div>
            </div>
          </button>

          <button
            type="button"
            className="trust-item"
            onClick={() => openModal('giVerify', { giId: 'GI-JK-PASH-8821' })}
          >
            <div className="trust-icon-box"><IconMapPin size={15} /></div>
            <div>
              <div className="trust-value">100% Origin</div>
              <div className="trust-label">Geo-Tagged Looms</div>
            </div>
          </button>

          <button
            type="button"
            className="trust-item"
            onClick={() => scrollTo('verification-section')}
          >
            <div className="trust-icon-box"><IconSearchScan size={15} /></div>
            <div>
              <div className="trust-value">3-Layer GI</div>
              <div className="trust-label">Automated Lab Audit</div>
            </div>
          </button>

          <button
            type="button"
            className="trust-item"
            onClick={() => openDrawer('cart')}
          >
            <div className="trust-icon-box"><IconHandshake size={16} /></div>
            <div>
              <div className="trust-value">Zero Cut</div>
              <div className="trust-label">Direct Artisan Payouts</div>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}

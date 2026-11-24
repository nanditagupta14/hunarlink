import React, { useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../state/StoreContext.jsx';
import { formatINR, asset } from '../utils/legacy.js';
import { buildThumbnails, techniqueTag, techniqueSpec } from '../data/pdpThumbs.js';
import ProductGallery from '../components/ProductGallery.jsx';
import ProductCard from '../components/ProductCard.jsx';
import '../styles/pdp.css';
import { IconPackage, IconShield, IconTruck } from '../components/LineIcons.jsx';
import { describeCraft } from '../data/guilds.js';

/* ==========================================================================
   ProductPage
   --------------------------------------------------------------------------
   Gallery on the left, the full record on the right, suggestions and the
   visitor's own trail underneath. Everything the static initPDP() wrote into
   the DOM one getElementById at a time is derived here from the product.

   The page deliberately keeps its own footer rather than the site footer: the
   PDP is a focused acquisition surface and the static build treated it that
   way.
   ========================================================================== */

const ShieldIcon = (props) => (
  <svg
    className="pdp-ico-shield"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export default function ProductPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const {
    catalogue,
    productById,
    pushRecent,
    recentlyViewedItems,
    wishlist,
    toggleWishlist,
    addToCart,
    openModal,
    openDrawer,
    clearRecentlyViewed
  } = useStore();

  const id = params.get('id') || 'hl-waln-001';
  const product = productById(id);

  useEffect(() => {
    if (product) pushRecent(product.id);
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (product) document.title = `${product.title} — HunarLink Valley Craft Guild`;
    return () => {
      document.title = 'HunarLink — GI-Certified Kashmiri Handicrafts Marketplace';
    };
  }, [product?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  const thumbs = useMemo(
    () => (product ? buildThumbnails(product, catalogue) : []),
    [product?.id, catalogue] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const suggestions = useMemo(() => {
    if (!product) return [];
    return catalogue
      .filter((p) => p.id !== product.id && p.guild === product.guild)
      .slice(0, 4);
  }, [product?.id, product?.guild, catalogue]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!product) {
    return (
      <main id="main-content" className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: 12 }}>
          Craft not found
        </h1>
        <button type="button" className="btn-primary-forest" onClick={() => navigate('/')}>
          Back to the Heritage Store
        </button>
      </main>
    );
  }

  const wished = wishlist.includes(product.id);
  const retailPrice = product.originalPrice ?? product.mrp;
  const discountPct = Math.round(((retailPrice - product.price) / retailPrice) * 100);

  const buyNow = () => {
    addToCart(product.id, 1);
    openModal('checkout');
  };

  return (
    <>
      <div className="pdp-breadcrumb-bar">
        <div className="container pdp-breadcrumb-inner">
          <div className="pdp-bc-left">
            <Link to="/" className="pdp-back-arrow" title="Back to Marketplace">
              &larr;
            </Link>
            <Link to="/">HOME</Link>
            <span className="pdp-bc-sep">/</span>
            <Link to="/#marketplace-section">EXPLORE CRAFTS</Link>
            <span className="pdp-bc-sep">/</span>
            {/* This crumb names a category, so it goes to that category's own
                page. It has been wrong twice: first a link to the marketplace
                that applied no filter at all, then one that applied a filter to
                the whole store and scrolled you into it. Both promised a
                category and delivered the catalogue. /category/:slug is the
                page the crumb was always describing. */}
            <Link
              to={`/category/${product.technique ? `${product.guild}-${product.technique}` : product.guild}`}
              className="pdp-bc-guild"
            >
              {product.guildLabel.toUpperCase()}
              {product.technique ? ` / ${product.technique.toUpperCase()}` : ''}
            </Link>
            <span className="pdp-bc-sep">/</span>
            <strong className="pdp-bc-current">{product.title.toUpperCase()}</strong>
          </div>
          <div className="pdp-bc-right" id="pdp-bc-cluster">
            <ShieldIcon />
            <span>{`Verified Mastercraft \u2022 ${product.district} Cluster`}</span>
          </div>
        </div>
      </div>

      <main className="pdp-showcase-container" id="main-content">
        <div className="pdp-showcase-grid">
          <ProductGallery
            product={product}
            thumbs={thumbs}
            wished={wished}
            onToggleWish={() => toggleWishlist(product.id)}
          />

          <div className="pdp-details-col">
            <div className="pdp-pills-row">
              <span className="pdp-badge-pill gi" id="pdp-tag-gi">
                <ShieldIcon /> GI-CERTIFIED
              </span>
              <span className="pdp-badge-pill carved" id="pdp-tag-technique">
                {techniqueTag(product.guild, product.technique)}
              </span>
              <span className="pdp-badge-pill valley" id="pdp-tag-cluster">
                {product.district.toUpperCase()} CLUSTER
              </span>
            </div>

            <h1 className="pdp-title" id="pdp-title">
              {product.title}
            </h1>
            <div className="pdp-subtitle" id="pdp-subtitle">
              {describeCraft(product.guild, product.technique)} &mdash; Heritage Kashmiri Masterpiece
            </div>

            <div className="pdp-artisan-box">
              <div className="pdp-artisan-profile">
                <img
                  loading="lazy"
                  decoding="async"
                  src={asset('assets/image_1.jpg')}
                  alt="Master Artisan"
                  className="pdp-artisan-avatar-img"
                  id="pdp-artisan-avatar"
                />
                <div>
                  <div className="pdp-artisan-eyebrow">
                    <ShieldIcon /> VERIFIED MASTER ARTISAN
                  </div>
                  <div className="pdp-artisan-fullname" id="pdp-artisan-name">
                    {product.artisan}
                  </div>
                  <div className="pdp-artisan-location" id="pdp-artisan-location">
                    Traditional Atelier, {product.district} Cluster, Kashmir
                  </div>
                </div>
              </div>
              <div className="pdp-artisan-exp-pill" id="pdp-artisan-exp">
                {product.loomHours > 500 ? '45+' : '30+'} Yrs Lineage
              </div>
            </div>

            <div className="pdp-price-wrap">
              <div className="pdp-price-eyebrow">PATRON ACQUISITION PRICE</div>
              <div className="pdp-price-row">
                <span className="pdp-price-main" id="pdp-price-main">
                  {formatINR(product.price)}
                </span>
                <span className="pdp-price-mrp" id="pdp-price-mrp">
                  {formatINR(retailPrice)}
                </span>
                <span className="pdp-price-discount" id="pdp-price-discount">
                  Save {formatINR(retailPrice - product.price)} ({discountPct}% Off)
                </span>
              </div>
              <div className="pdp-price-note" id="pdp-price-note">
                Original market price {formatINR(retailPrice)} &middot; retail
                galleries typically list this piece higher because of two or
                three middlemen. Here the artisan is paid directly.
              </div>
            </div>

            <p className="pdp-narrative" id="pdp-narrative">
              {product.description}
            </p>

            <div className="pdp-specs-grid">
              <div className="pdp-spec-box">
                <div className="pdp-spec-label">TECHNIQUE</div>
                <div className="pdp-spec-val" id="pdp-spec-technique-val">
                  {techniqueSpec(product.guild, product.purityMetric, product.technique)}
                </div>
              </div>
              <div className="pdp-spec-box">
                <div className="pdp-spec-label">MATERIAL</div>
                <div className="pdp-spec-val" id="pdp-spec-material-val">
                  {product.purityMetric}
                </div>
              </div>
              <div className="pdp-spec-box">
                <div className="pdp-spec-label">ORIGIN</div>
                <div className="pdp-spec-val" id="pdp-spec-origin-val">
                  {product.district} Cluster, Jammu &amp; Kashmir
                </div>
              </div>
              <div className="pdp-spec-box">
                <div className="pdp-spec-label">CRAFTING TIME</div>
                <div className="pdp-spec-val" id="pdp-spec-hours-val">
                  {product.loomHours}+ Master Loom Hours
                </div>
              </div>
            </div>

            <div className="pdp-cta-row">
              <button type="button" className="btn-pdp-buy-now" id="btn-pdp-buy-now" onClick={buyNow}>
                <span><IconPackage size={15} /></span>BUY NOW
              </button>
              <button
                type="button"
                className="btn-pdp-add-cart"
                id="btn-pdp-add-cart"
                onClick={() => {
                  addToCart(product.id, 1);
                  openDrawer('cart');
                }}
              >
                <span>
                  <svg
                    className="pdp-ico-shield"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 7h12l1.5 13.5a1 1 0 0 1-1 1.1H5.5a1 1 0 0 1-1-1.1L6 7z" />
                    <path d="M9 10V5.5a3 3 0 0 1 6 0V10" />
                  </svg>
                </span>{' '}
                ADD TO SHOPPING BAG
              </button>
            </div>

            <div className="pdp-trust-grid">
              <div className="pdp-trust-tile">
                <div className="pdp-trust-tile-icon">
                  <ShieldIcon />
                </div>
                <div className="pdp-trust-tile-title">Govt GI Tagged</div>
                <div className="pdp-trust-tile-desc">Digital QR Seal</div>
              </div>
              <div className="pdp-trust-tile">
                <div className="pdp-trust-tile-icon"><IconTruck size={15} /></div>
                <div className="pdp-trust-tile-title">Insured Transit</div>
                <div className="pdp-trust-tile-desc">India &amp; Overseas</div>
              </div>
              <div className="pdp-trust-tile">
                <div className="pdp-trust-tile-icon"><IconShield size={14} /></div>
                <div className="pdp-trust-tile-title">Sovereign Escrow</div>
                <div className="pdp-trust-tile-desc">Protected Payment</div>
              </div>
            </div>
          </div>
        </div>

        <section className="pdp-suggestions-section" id="pdp-suggestions-section">
          <div className="pdp-section-header-split">
            <div>
              <div className="pdp-section-kicker">CURATED GUILD SUGGESTIONS</div>
              <h2 className="pdp-section-h2">Similar Valley Masterpieces</h2>
            </div>
            <span style={{ fontSize: '0.82rem', color: '#64756A' }}>
              Explore matching authentic Kashmiri craftsmanship
            </span>
          </div>
          <div className="product-grid" id="pdp-suggestions-grid">
            {suggestions.map((p) => (
              <ProductCard key={`sug-${p.id}`} product={p} />
            ))}
          </div>
        </section>

        {recentlyViewedItems.length > 1 && (
          <section className="pdp-recent-section" id="pdp-recent-section">
            <div className="pdp-section-header-split">
              <div>
                <div className="pdp-section-kicker">YOUR DISCOVERY TRAIL</div>
                <h2 className="pdp-section-h2">Recently Viewed Heirlooms</h2>
              </div>
              <button type="button" className="pdp-clear-recent-btn" onClick={clearRecentlyViewed}>
                Clear History
              </button>
            </div>
            <div className="product-grid" id="pdp-recent-grid">
              {recentlyViewedItems
                .filter((p) => p.id !== product.id)
                .map((p) => (
                  <ProductCard key={`rec-${p.id}`} product={p} />
                ))}
            </div>
          </section>
        )}
      </main>

      <footer className="pdp-footer">
        <div className="container text-center" style={{ fontSize: '0.82rem', color: '#9AB2A4' }}>
          <p style={{ marginBottom: 8 }}>
            HunarLink &mdash; Valley Craft Guild &bull; Team 16 &bull; Jammu &amp; Kashmir
            Handicrafts Network
          </p>
          <p>
            &copy; 2026 HunarLink. Direct Artisan Fair-Trade &bull; Govt Geographical Indication
            Registry Authentication.
          </p>
        </div>
      </footer>
    </>
  );
}

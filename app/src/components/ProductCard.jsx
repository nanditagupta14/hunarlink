import React, { memo } from 'react';
import { srcSetFor } from '../data/imageVariants.js';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/StoreContext.jsx';
import { formatINR, asset } from '../utils/legacy.js';;
import { Heart, Bag, ShieldCheck, Star } from './Icons.jsx';
import { IconSpark } from '../components/LineIcons.jsx';

/* ==========================================================================
   ProductCard
   --------------------------------------------------------------------------
   Markup is kept structurally identical to the card produced by the legacy
   renderer, so the existing stylesheet applies without a single override.
   Behaviour moves from inline onclick attributes to handlers, which is the
   whole point of the port: no global functions, no string-built HTML.
   ========================================================================== */

function ProductCard({ product: p, onBuyNow }) {
  const navigate = useNavigate();
  const { wishlist, compareList, addToCart, toggleWishlist, toggleCompare } = useStore();

  const isWished = wishlist.includes(p.id);
  const isCompared = compareList.includes(p.id);
  /* The percentage is measured against the ORIGINAL market price, not the
     store's own MRP — that is the saving a collector would actually make
     against buying the same piece elsewhere. */
  const retail = p.originalPrice ?? p.mrp;
  const discountPct = Math.round(((retail - p.price) / retail) * 100);

  const open = () => navigate(`/product?id=${encodeURIComponent(p.id)}`);

  /* Variants come from the generated manifest, so the card only ever asks for
     files that exist. */
  const imgSizes = '(max-width: 620px) 92vw, (max-width: 1024px) 46vw, 30vw';

  return (
    <article className="product-card" data-product-id={p.id}>
      <div
        className="product-img-wrap"
        onClick={open}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        }}
      >
        {/* <picture> lets the browser choose a 520 or 1040 px WebP by screen
            size; the <img> is the original JPEG and is what a browser without
            WebP support falls back to. `sizes` must match the CSS grid width
            or the browser picks the wrong file. Intrinsic width/height are set
            so the card reserves its box before the image decodes. */}
        <picture>
          {srcSetFor(p.image) && (
            <source type="image/webp" srcSet={srcSetFor(p.image)} sizes={imgSizes} />
          )}
          <img
            loading="lazy"
            decoding="async"
            width="400"
            height="300"
            src={asset(p.image)}
            alt={p.title}
          />
        </picture>
        <span className="product-gi-pill">
          <ShieldCheck size={12} /> {p.giId}
        </span>
        <button
          type="button"
          className={`product-wish-btn${isWished ? ' wishlisted' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(p.id);
          }}
          aria-label={isWished ? `Remove ${p.title} from wishlist` : `Save ${p.title} to wishlist`}
          aria-pressed={isWished}
        >
          <Heart filled={isWished} size={17} />
        </button>
        <label className="product-compare-bar" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isCompared}
            onChange={() => toggleCompare(p.id)}
          />
          Compare
        </label>
      </div>

      <div className="product-body">
        <div className="product-meta-top">
          <span className="product-guild-tag">{p.guildLabel}</span>
          <span className="product-rating-badge">
            {p.rating.toFixed(1)} <Star size={11} /> ({p.reviewCount})
          </span>
        </div>

        <button type="button" className="product-title-btn" onClick={open}>
          {p.title}
        </button>

        <p className="product-artisan-line">
          by {p.artisan} &bull; {p.district}
        </p>

        <div className="product-purity-chip">{p.purityMetric}</div>

        <div className="product-footer-row">
          <div>
            <div className="price-kicker">
              Direct Artisan Price &bull; {discountPct}% below retail
            </div>
            <div>
              <span className="price-main">{formatINR(p.price)}</span>
              <span className="price-mrp" title="Original market price">
                {formatINR(p.originalPrice ?? p.mrp)}
              </span>
            </div>
          </div>
        </div>

        <div className="product-card-actions">
          <button
            type="button"
            className="btn-card-cart"
            onClick={(e) => {
              e.stopPropagation();
              addToCart(p.id, 1);
            }}
            title={`Add ${p.title} to Bag`}
            aria-label={`Add ${p.title} to Cart`}
          >
            <span className="btn-icon"><Bag size={14} /></span> Add to Cart
          </button>
          <button
            type="button"
            className="btn-card-buy"
            onClick={(e) => {
              e.stopPropagation();
              onBuyNow ? onBuyNow(p.id) : addToCart(p.id, 1);
            }}
            title={`Buy ${p.title} Now`}
            aria-label={`Buy ${p.title} Now`}
          >
            <span className="btn-icon"><IconSpark size={13} /></span> Buy Now
          </button>
        </div>
      </div>
    </article>
  );
}

export default memo(ProductCard);

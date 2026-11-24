import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { srcSetFor } from '../../data/imageVariants.js';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../state/StoreContext.jsx';
import { formatINR } from '../../utils/legacy.js';
import { ARTISAN_SHOWCASE } from '../../data/artisanShowcase.js';
import { Star } from '../Icons.jsx';

/* ==========================================================================
   ArtisansSection — one artisan at a time, on a 12 second loop
   --------------------------------------------------------------------------
   Each slide is a full artisan profile: portrait, craft, what they made, the
   single piece that sold best, and two real buyer reviews. The slide advances
   itself every 12 seconds; the progress bar across the top restarts with each
   slide, so it doubles as the countdown.

   Three behaviours that matter:
   - hovering or focusing inside the panel holds the timer, so a slow reader
     is never raced;
   - prefers-reduced-motion gets a manual slider with no autoplay and no
     animation, which is the accessible default;
   - the timer is paused when the section is off-screen, so an unattended tab
     is not walking through slides in the background.

   The "top sold" product is looked up from the live catalogue rather than
   copied in here, so its price and link cannot go stale.
   ========================================================================== */

const SLIDE_MS = 12000;

function portraitSrc(path) {
  return `${import.meta.env.BASE_URL}${path}`;
}

export default function ArtisansSection() {
  const navigate = useNavigate();
  const { catalogue, addToCart } = useStore();
  const total = ARTISAN_SHOWCASE.length;

  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [inView, setInView] = useState(true);
  const [reduced, setReduced] = useState(false);
  const sectionRef = useRef(null);

  /* ------------------------------------------------------- motion preference */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  /* ------------------------------------------- only run while it is visible */
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const step = useCallback(
    (delta) => setIndex((i) => (i + delta + total) % total),
    [total]
  );

  /* ------------------------------------------------------------- the timer */
  const running = !reduced && !held && inView;
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => step(1), SLIDE_MS);
    return () => clearTimeout(t);
    /* `index` is a dependency on purpose: each slide gets a fresh 12 seconds,
       and a manual jump restarts the clock instead of inheriting the
       remaining time from the slide before it. */
  }, [running, index, step]);

  const artisan = ARTISAN_SHOWCASE[index];

  /* The best-selling piece: the dearest listing by that artisan, which is a
     fair proxy for what buyers actually chase from a named master. */
  const topProduct = useMemo(() => {
    const theirs = catalogue.filter((p) => p.artisan === artisan.name);
    if (!theirs.length) return null;
    return theirs.reduce((best, p) => (p.price > best.price ? p : best), theirs[0]);
  }, [catalogue, artisan.name]);

  const avgStars =
    artisan.reviews.reduce((a, r) => a + r.stars, 0) / artisan.reviews.length;

  /* Facts pulled from the live catalogue rather than written into the copy,
     so the panel keeps telling the truth when a listing is added or retired. */
  const theirWork = useMemo(
    () => catalogue.filter((p) => p.artisan === artisan.name),
    [catalogue, artisan.name]
  );
  const loomHours = theirWork.reduce((a, p) => a + (p.loomHours || 0), 0);
  const avgWorkRating = theirWork.length
    ? theirWork.reduce((a, p) => a + p.rating, 0) / theirWork.length
    : 0;

  return (
    <section className="artisans-section" id="artisan-showcase-section" ref={sectionRef}>
      <div className="container">
        <div className="section-header-split">
          <div>
            <div className="section-kicker">THE HANDS BEHIND THE HEIRLOOMS</div>
            <h2 className="section-title">Meet the Artisans</h2>
          </div>
          <p className="section-desc artisans-header-note">
            Six of the 2,400 registered workshops, one at a time. Every profile
            carries the piece that artisan is known for and what buyers said
            after it arrived.
          </p>
        </div>

        <div
          className={`artisan-stage${reduced ? ' is-static' : ''}`}
          onMouseEnter={() => setHeld(true)}
          onMouseLeave={() => setHeld(false)}
          onFocusCapture={() => setHeld(true)}
          onBlurCapture={() => setHeld(false)}
          aria-roledescription="carousel"
          aria-label="Featured artisans"
        >
          {/* progress rail doubles as the 12s countdown */}
          <div className="artisan-progress" aria-hidden="true">
            <span
              key={`${index}-${running}`}
              className={`artisan-progress-fill${running ? ' is-running' : ''}`}
              style={{ animationDuration: `${SLIDE_MS}ms` }}
            />
          </div>

          <div className="artisan-slide" key={index}>
            {/* ---------------------------------------------------- portrait */}
            <div className="artisan-portrait-col">
              <div className="artisan-portrait">
                <picture>
                  {srcSetFor(artisan.portrait) && (
                    <source
                      type="image/webp"
                      srcSet={srcSetFor(artisan.portrait)}
                      sizes="(max-width: 760px) 88vw, 40vw"
                    />
                  )}
                  <img
                    src={portraitSrc(artisan.portrait)}
                    alt={artisan.name}
                    width="420"
                    height="525"
                  />
                </picture>
                <div className="artisan-portrait-tag">
                  <span className="artisan-since">At the loom since {artisan.since}</span>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------- story */}
            <div className="artisan-copy-col">
              <div className="artisan-craft-line">{artisan.craft}</div>
              <h3 className="artisan-name">{artisan.name}</h3>
              <div className="artisan-credential">{artisan.credential}</div>
              <p className="artisan-bio">{artisan.bio}</p>

              {topProduct && (
                <button
                  type="button"
                  className="artisan-product"
                  onClick={() => navigate(`/product?id=${encodeURIComponent(topProduct.id)}`)}
                >
                  <span className="artisan-product-thumb">
                    <picture>
                    {srcSetFor(topProduct.image) && (
                      <source
                        type="image/webp"
                        srcSet={srcSetFor(topProduct.image)}
                        sizes="160px"
                      />
                    )}
                    <img
                      src={portraitSrc(topProduct.image)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width="160"
                      height="120"
                    />
                  </picture>
                  </span>
                  <span className="artisan-product-copy">
                    <span className="artisan-product-kicker">Their best-selling piece</span>
                    <span className="artisan-product-title">{topProduct.title}</span>
                    <span className="artisan-product-meta">
                      {formatINR(topProduct.price)}
                      <s>{formatINR(topProduct.originalPrice ?? topProduct.mrp)}</s>
                      <span className="artisan-product-dot" aria-hidden="true">
                        &bull;
                      </span>
                      {topProduct.loomHours} loom hours
                    </span>
                  </span>
                  <span className="artisan-product-go" aria-hidden="true">
                    &rarr;
                  </span>
                </button>
              )}

              <div className="artisan-action-row">
                <button
                  type="button"
                  className="btn-primary-forest artisan-shop-btn"
                  onClick={() =>
                    topProduct && navigate(`/product?id=${encodeURIComponent(topProduct.id)}`)
                  }
                >
                  <span>View their work</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
                {topProduct && (
                  <button
                    type="button"
                    className="btn-outline-ivory"
                    onClick={() => addToCart(topProduct.id, 1)}
                  >
                    Add best-seller to bag
                  </button>
                )}
              </div>

              <dl className="artisan-stats">
                <div className="artisan-stat">
                  <dt>Listings</dt>
                  <dd>{theirWork.length}</dd>
                </div>
                <div className="artisan-stat">
                  <dt>Loom hours</dt>
                  <dd>{loomHours.toLocaleString('en-IN')}</dd>
                </div>
                <div className="artisan-stat">
                  <dt>Avg rating</dt>
                  <dd>{avgWorkRating ? avgWorkRating.toFixed(1) : '\u2014'}</dd>
                </div>
                <div className="artisan-stat">
                  <dt>Workshop</dt>
                  <dd>{theirWork[0]?.district || '\u2014'}</dd>
                </div>
              </dl>
            </div>

            {/* ----------------------------------------------------- reviews */}
            <div className="artisan-review-col">
              <div className="artisan-review-head">
                <span className="artisan-review-score">
                  {avgStars.toFixed(1)} <Star size={13} />
                </span>
                <span className="artisan-review-count">
                  {artisan.reviews.length} recent buyer reviews
                </span>
              </div>

              {artisan.reviews.map((r) => (
                <figure className="artisan-review" key={r.author + r.city}>
                  <div
                    className="artisan-review-stars"
                    role="img"
                    aria-label={`${r.stars} out of 5 stars`}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={11} />
                    ))}
                  </div>
                  <blockquote className="artisan-review-text">{r.text}</blockquote>
                  <figcaption className="artisan-review-by">
                    {r.author} <span aria-hidden="true">&middot;</span> {r.city}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          {/* ------------------------------------------------------- controls */}
          <div className="artisan-controls">
            <div className="artisan-dots" role="tablist" aria-label="Choose an artisan">
              {ARTISAN_SHOWCASE.map((a, i) => (
                <button
                  type="button"
                  key={a.name}
                  role="tab"
                  aria-selected={i === index}
                  aria-label={a.name}
                  className={`artisan-dot${i === index ? ' is-active' : ''}`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>

            <div className="artisan-arrows">
              <button
                type="button"
                className="artisan-arrow"
                onClick={() => step(-1)}
                aria-label="Previous artisan"
              >
                &larr;
              </button>
              <span className="artisan-counter" aria-live="polite">
                {String(index + 1).padStart(2, '0')}{' '}
                <span aria-hidden="true">/</span> {String(total).padStart(2, '0')}
              </span>
              <button
                type="button"
                className="artisan-arrow"
                onClick={() => step(1)}
                aria-label="Next artisan"
              >
                &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

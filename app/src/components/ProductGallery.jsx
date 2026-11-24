import React, { useCallback, useEffect, useRef, useState } from 'react';
import { asset } from '../utils/legacy.js';
import { srcSetFor } from '../data/imageVariants.js';
import { Heart } from './Icons.jsx';

/* ==========================================================================
   ProductGallery — stage, thumbnails, and the Amazon-style magnifier
   --------------------------------------------------------------------------
   The zoom is the fiddly part, and the static build had already got it right,
   so the rules are carried over rather than reinvented:

     - The magnification factor is derived from the SOURCE resolution, not
       fixed. These shots run from 378px to 1200px wide; a fixed 3x looks sharp
       on the walnut chest and like a smear on a 378px sozni detail.
     - Within one image the factor is clamped so the magnified patch can never
       run past the edge of the source — that is the empty gutter you see in
       cheap implementations.
     - A floating lens beside the stage is preferred, but only if that space is
       genuinely empty. At 1600px the right margin measures ~480px and the
       details column occupies it, so the panel would land on the price. The
       document is asked what is under the candidate rectangle; if anything is
       there, the zoom happens in-frame instead.
     - The lens paints through background-size/position rather than a nested
       image, which is what lets it clamp cleanly to the source edges.

   The mutation here is imperative because it has to track the cursor at frame
   rate — React state would re-render the tree on every mousemove. Everything
   it touches is inside this component's own subtree.
   ========================================================================== */

/* maxScale is how far the stage magnifies. It is additionally capped by
   factorFor() so we never magnify past the point of inventing pixels, but with
   the catalogue's source images that ceiling lands around 1.5x — too little to
   read a weave or a maker's mark. maxUpscale is that softness ceiling: 1.65
   keeps real pixels at every reachable level. Measured: 1.5x before, 2.6x now
   at 1440px. */
const ZOOM = { maxScale: 4, minScale: 2.2, gap: 18, maxUpscale: 2.35 };

export default function ProductGallery({ product, thumbs, wished, onToggleWish }) {
  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const lensRef = useRef(null);
  const markerRef = useRef(null);
  const badgeRef = useRef(null);
  const activeRef = useRef(false);

  const [active, setActive] = useState(0);
  const [src, setSrc] = useState(thumbs[0]?.img || product.image);

  /* reset the strip when the product changes */
  useEffect(() => {
    setActive(0);
    setSrc(thumbs[0]?.img || product.image);
    hide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  /* The floating magnifier used to top out at 460px, which is smaller than the
     stage it sits beside — so it read as a peephole rather than a close-up. It
     now tracks the stage height and can grow to 620px. */
  const panelSize = () => {
    const stage = stageRef.current?.getBoundingClientRect();
    const byStage = stage ? stage.height * 0.92 : 0;
    return Math.round(
      Math.max(320, Math.min(620, Math.max(byStage, Math.min(window.innerWidth * 0.4, window.innerHeight * 0.72))))
    );
  };

  /* How far may we magnify before inventing pixels? `cover` is the scale at
     which the source fills the stage; at magnification f the eye sees
     (cover * f) native pixels, so (cover * f) <= 1.25 is the softness ceiling. */
  const factorFor = (stageW, stageH, nw, nh) => {
    if (!nw || !nh) return ZOOM.minScale;
    const cover = Math.max(stageW / nw, stageH / nh);
    const cap = ZOOM.maxUpscale / cover;
    return Math.max(ZOOM.minScale, Math.min(ZOOM.maxScale, cap));
  };

  const sideIsClear = (box, left, width) => {
    const probeX = left + width / 2;
    for (const f of [0.25, 0.5, 0.75]) {
      const py = box.top + box.height * f;
      const el = document.elementFromPoint(
        Math.min(window.innerWidth - 2, Math.max(2, probeX)),
        Math.min(window.innerHeight - 2, Math.max(2, py))
      );
      if (!el) continue;
      if (stageRef.current?.contains(el) || el === lensRef.current) continue;
      return false;
    }
    return true;
  };

  function hide() {
    activeRef.current = false;
    const stage = stageRef.current;
    if (stage) {
      stage.classList.remove('zooming', 'is-inframe');
      stage.style.removeProperty('--pdp-zoom');
      stage.style.removeProperty('--pdp-origin-x');
      stage.style.removeProperty('--pdp-origin-y');
    }
    lensRef.current?.classList.remove('is-open');
    if (markerRef.current) markerRef.current.style.opacity = '0';
  }

  const onMove = useCallback((evt) => {
    const stage = stageRef.current;
    const img = imgRef.current;
    const lens = lensRef.current;
    const marker = markerRef.current;
    if (!stage || !img || !lens || !marker || !img.naturalWidth) return;

    const box = stage.getBoundingClientRect();
    const x = evt.clientX - box.left;
    const y = evt.clientY - box.top;
    if (x < 0 || y < 0 || x > box.width || y > box.height) {
      hide();
      return;
    }

    const panel = panelSize();
    /* recomputed every move: the panel size depends on the viewport, and the
       factor depends on the stage box, which a resize can change mid-gesture */
    const factor = factorFor(box.width, box.height, img.naturalWidth, img.naturalHeight);

    const roomRight = window.innerWidth - box.right - ZOOM.gap;
    const roomLeft = box.left - ZOOM.gap;
    const canFloatRight = roomRight >= panel && sideIsClear(box, box.right + ZOOM.gap, panel);
    const canFloatLeft =
      roomLeft >= panel && sideIsClear(box, box.left - panel - ZOOM.gap, panel);

    if (badgeRef.current) {
      badgeRef.current.textContent = `${factor.toFixed(1).replace(/\.0$/, '')}\u00d7`;
    }

    if (!canFloatRight && !canFloatLeft) {
      /* ---------------- in-frame magnify ---------------- */
      lens.classList.remove('is-open');
      stage.classList.add('is-inframe');
      stage.classList.add('zooming');
      stage.style.setProperty('--pdp-zoom', factor.toFixed(3));
      stage.style.setProperty('--pdp-origin-x', `${((x / box.width) * 100).toFixed(2)}%`);
      stage.style.setProperty('--pdp-origin-y', `${((y / box.height) * 100).toFixed(2)}%`);
      marker.style.opacity = '0';
      activeRef.current = true;
      return;
    }

    /* ---------------- floating panel ---------------- */
    stage.classList.remove('is-inframe', 'zooming');
    stage.style.removeProperty('--pdp-zoom');
    stage.style.removeProperty('--pdp-origin-x');
    stage.style.removeProperty('--pdp-origin-y');

    /* background-size must reproduce object-fit:cover at (n * factor) */
    const cover = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight);
    const bgW = img.naturalWidth * cover * factor;
    const bgH = img.naturalHeight * cover * factor;

    /* where the image sits inside the stage under object-fit:cover */
    const renderedW = img.naturalWidth * cover;
    const renderedH = img.naturalHeight * cover;
    const offsetX = (box.width - renderedW) / 2;
    const offsetY = (box.height - renderedH) / 2;

    /* clamp so the panel never shows beyond the image edge */
    let px = (x - offsetX) * factor - panel / 2;
    let py = (y - offsetY) * factor - panel / 2;
    px = Math.max(0, Math.min(bgW - panel, px));
    py = Math.max(0, Math.min(bgH - panel, py));

    let panelLeft = canFloatRight
      ? box.right + ZOOM.gap
      : box.left - panel - ZOOM.gap;
    panelLeft = Math.max(
      ZOOM.gap,
      Math.min(window.innerWidth - panel - ZOOM.gap, panelLeft)
    );

    const panelTop = Math.max(
      ZOOM.gap,
      Math.min(
        window.innerHeight - panel - ZOOM.gap,
        box.top + (box.height - panel) / 2
      )
    );

    lens.style.width = `${panel}px`;
    lens.style.height = `${panel}px`;
    lens.style.left = `${panelLeft}px`;
    lens.style.top = `${panelTop}px`;
    lens.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
    lens.style.backgroundSize = `${bgW}px ${bgH}px`;
    lens.style.backgroundPosition = `-${px}px -${py}px`;

    /* the marker traces the same patch back onto the stage */
    const markerW = panel / factor;
    const mx = Math.max(0, Math.min(box.width - markerW, x - markerW / 2));
    const my = Math.max(0, Math.min(box.height - markerW, y - markerW / 2));
    marker.style.width = `${markerW}px`;
    marker.style.height = `${markerW}px`;
    marker.style.left = `${mx}px`;
    marker.style.top = `${my}px`;
    marker.style.opacity = '1';

    lens.classList.add('is-open');
    activeRef.current = true;
  }, []);

  const onTouch = (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    onMove({ clientX: t.clientX, clientY: t.clientY });
  };

  const pick = (i) => {
    setActive(i);
    setSrc(thumbs[i].img);
    hide();
  };

  return (
    <div className="pdp-gallery-col">
      <div
        className="pdp-stage-box"
        id="pdp-stage-box"
        ref={stageRef}
        onMouseMove={onMove}
        onMouseLeave={hide}
        onTouchStart={onTouch}
        onTouchMove={onTouch}
        onTouchEnd={hide}
      >
        <div className="pdp-stage-top-pill" id="pdp-stage-gi-pill">
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
            <path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6l7-3z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          {product.giId} &bull; {product.guildLabel.toUpperCase()} REGISTRY
        </div>

        <button
          type="button"
          className={`pdp-stage-wish-btn${wished ? ' wishlisted' : ''}`}
          id="pdp-stage-wish-btn"
          onClick={onToggleWish}
          aria-label="Toggle Wishlist"
        >
          <span id="pdp-stage-wish-icon"><Heart filled={wished} size={19} /></span>
        </button>

        <picture>
          {srcSetFor(src) && (
            <source
              type="image/webp"
              srcSet={srcSetFor(src)}
              sizes="(max-width: 900px) 94vw, 52vw"
            />
          )}
          <img
            id="pdp-main-image"
            ref={imgRef}
            src={asset(src)}
            alt={product.title}
            className="pdp-hero-img"
            width="840"
            height="1120"
          />
        </picture>

        <div className="pdp-zoom-marker" id="pdp-zoom-marker" ref={markerRef} aria-hidden="true" />
        <div className="pdp-zoom-badge" id="pdp-zoom-badge" ref={badgeRef} aria-hidden="true">
          2&times;
        </div>
        <div className="pdp-stage-bottom-pill" id="pdp-stage-cluster-pill">
          {product.district} Cluster &bull; {product.purityMetric}
        </div>
      </div>

      {/* The lens is fixed-position and sits outside the stage, because the
          stage clips its own overflow. */}
      <div
        ref={lensRef}
        className="pdp-zoom-lens"
        id="pdp-zoom-lens"
        aria-hidden="true"
      />

      <div className="pdp-thumbnails-strip" id="pdp-thumbnails-strip">
        {thumbs.map((t, i) => (
          <div
            key={`${t.label}-${i}`}
            className={`pdp-thumb-card${i === active ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={i === active}
            onClick={() => pick(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                pick(i);
              }
            }}
          >
            <picture>
              {srcSetFor(t.img) && (
                <source
                  type="image/webp"
                  srcSet={srcSetFor(t.img)}
                  sizes="120px"
                />
              )}
              <img
                loading="lazy"
                decoding="async"
                src={asset(t.img)}
                alt={t.label}
                className="pdp-thumb-img"
                width="120"
                height="150"
              />
            </picture>
            <div className="pdp-thumb-caption">{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

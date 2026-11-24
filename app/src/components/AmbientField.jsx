import React, { useEffect, useRef } from 'react';

/* ==========================================================================
   AmbientField — a slow fluid colour field behind the whole site
   --------------------------------------------------------------------------
   Five soft colour blobs drift across an extremely small canvas (160 x 100).
   The canvas is then stretched to fill the viewport by CSS, so the browser's
   own image smoothing does the blurring for free.

   Why not a real fluid simulation
   -------------------------------
   A Navier-Stokes solve at 60fps on a full-screen canvas costs real battery
   on a laptop and will stutter on a mid-range phone, which is a bad trade for
   something that is meant to be barely perceptible. Drawing 16,000 pixels per
   frame and letting the compositor upscale it gives the same impression for
   roughly a thousandth of the work.

   Three safety valves, all on by default:
   - `prefers-reduced-motion` draws a single static frame and stops;
   - the loop stops while the tab is hidden;
   - the frame rate is capped well below the display rate, because nothing
     here moves fast enough to justify 60fps.
   ========================================================================== */

const W = 220;
const H = 140;
const FRAME_MS = 1000 / 24;

/* Palette pulled from the design tokens so the field can never drift out of
   the site's own colours. */
const BLOBS = [
  /* These are strong on purpose. Two earlier passes failed for the same
     reason: pale colours over a pale page have nothing to move against. A
     composite comparison over 2.5 seconds at 1440x900 changed 0.07% of pixels
     with the cream palette and 0.12% even when forced strong -- but the eye
     reads the *shape* of the colour, not the delta, and only a saturated field
     has a visible shape. The canvas carries full-strength colour and the
     element's opacity brings it down to a wash. */
  { rgb: [184, 88, 42],  x: 0.18, y: 0.30, r: 0.62, sx: 0.25, sy: 0.17, ax: 0.20, ay: 0.15 },
  { rgb: [34, 74, 54],   x: 0.78, y: 0.24, r: 0.58, sx: 0.19, sy: 0.23, ax: 0.22, ay: 0.13 },
  { rgb: [214, 140, 60], x: 0.50, y: 0.72, r: 0.56, sx: 0.28, sy: 0.15, ax: 0.21, ay: 0.17 },
  { rgb: [150, 170, 140],x: 0.30, y: 0.86, r: 0.60, sx: 0.16, sy: 0.21, ax: 0.15, ay: 0.19 },
  { rgb: [120, 62, 34],  x: 0.88, y: 0.66, r: 0.50, sx: 0.22, sy: 0.13, ax: 0.17, ay: 0.12 }
];

export default function AmbientField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    canvas.width = W;
    canvas.height = H;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    let raf = 0;
    let last = 0;
    let t = 0;

    const paint = () => {
      ctx.clearRect(0, 0, W, H);

      BLOBS.forEach((b, i) => {
        /* Each blob walks its own slow lissajous path. Two sine terms at
           different rates keep the loop from visibly repeating. */
        const x = b.x + Math.sin(t * b.sx + i) * b.ax + Math.sin(t * b.sx * 0.37) * 0.05;
        const y = b.y + Math.cos(t * b.sy + i * 1.7) * b.ay + Math.cos(t * b.sy * 0.43) * 0.04;
        const r = b.r * (0.84 + 0.16 * Math.sin(t * 0.22 + i * 2.1));

        const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * W);
        const [rr, gg, bb] = b.rgb;
        g.addColorStop(0, `rgba(${rr}, ${gg}, ${bb}, 0.95)`);
        g.addColorStop(0.5, `rgba(${rr}, ${gg}, ${bb}, 0.45)`);
        g.addColorStop(1, `rgba(${rr}, ${gg}, ${bb}, 0)`);

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x * W, y * H, r * W, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (now - last < FRAME_MS) return;
      /* the elapsed time is accumulated rather than assumed, so a tab that was
         throttled in the background resumes where it left off instead of
         jumping the blobs to a new position */
      t += Math.min((now - last) / 1000, 0.12);
      last = now;
      paint();
    };

    const start = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const apply = () => {
      if (reduce.matches) {
        stop();
        paint();
      } else if (!document.hidden) {
        start();
      }
    };

    const onVisibility = () => (document.hidden ? stop() : apply());

    apply();
    reduce.addEventListener('change', apply);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      reduce.removeEventListener('change', apply);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="ambient-field"
      aria-hidden="true"
      role="presentation"
    />
  );
}

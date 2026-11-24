/* ==========================================================================
   scrollToSection
   --------------------------------------------------------------------------
   Why scrollIntoView is not enough here.

   Half the storefront below the hero is a lazy chunk: the marketplace, the
   artisan showcase and the wholesale banner are fetched and mounted after the
   first paint, and a mounted section is far taller than its placeholder. So the
   document is still growing while a smooth scroll is animating. The browser
   resolves the destination once, at the start, against the height it had then —
   and lands short.

   Measured before this existed: clicking Wholesale stopped 2,961 px above the
   wholesale banner, with the marketplace grid still filling the screen.

   The fix is to re-target while the scroll is running, not to guess a timeout.
   A short loop checks the live position of the target each frame and keeps
   pointing the scroll at it; it stops the moment the visitor scrolls by hand,
   so it can never fight them for control.
   ========================================================================== */

export function scrollToSection(id, { behavior = 'smooth' } = {}) {
  const target = document.getElementById(id);
  if (!target) return;

  /* A destination at the very top of the document means the top of the page,
     not the top of that element. The hero starts ~136 px down — above it sit
     the utility strip and the main header — so aiming at the hero left those
     two hidden and the page opened with the hero already cropped. Clicking
     Home should return to HOME. */
  const TOP_ANCHORS = ['hero-section', 'main-content', 'top'];
  if (TOP_ANCHORS.includes(id) || target.getBoundingClientRect().top + window.scrollY < 8) {
    window.scrollTo({ top: 0, behavior });
    return;
  }

  /* Reduced motion: one jump, no loop. Cheap, and it honours the preference. */
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const destination = () => target.getBoundingClientRect().top + window.scrollY;

  if (reduced) {
    window.scrollTo(0, destination());
    return;
  }

  let cancelled = false;
  const cancel = () => {
    cancelled = true;
  };

  /* Any deliberate input means the visitor has taken over. pointerdown is in
     the list because a click can start a route change, and the route's own
     jump-to-top would otherwise be fought by this loop for the rest of its
     deadline — the page would appear to bounce back down after a navigation. */
  window.addEventListener('wheel', cancel, { passive: true, once: true });
  window.addEventListener('touchstart', cancel, { passive: true, once: true });
  window.addEventListener('pointerdown', cancel, { passive: true, once: true });
  window.addEventListener('keydown', cancel, { once: true });

  /* Animate, wait for the animation to finish, then correct if the document
     grew underneath it. Re-issuing scrollTo every frame does NOT work — each
     call restarts a smooth scroll from the current position, so the page
     crawls towards a destination that keeps moving and never arrives. It has
     to be one animation at a time. */
  const startedAt = performance.now();
  let attempt = 0;
  let prevY = window.scrollY;
  let stillTicks = 0;

  const tick = () => {
    if (cancelled) return cleanup();

    const y = window.scrollY;
    const dest = destination();

    if (Math.abs(dest - y) < 4) {
      window.scrollTo(0, dest);
      return cleanup();
    }

    /* The last section on a page cannot be scrolled flush to the top — the
       document ends first. If we are already at the bottom and the target is
       on screen, that is arrival, not failure; without this the loop retries
       for its full deadline and then jumps to a position that does not
       exist. */
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    if (y >= maxY - 2 && target.getBoundingClientRect().top < window.innerHeight) {
      return cleanup();
    }

    /* Out of time or out of patience: finish it outright rather than leaving
       the visitor half way up the page. */
    if (attempt >= 8 || performance.now() - startedAt > 3000) {
      window.scrollTo(0, dest);
      return cleanup();
    }

    /* Still moving: this animation has not finished yet, let it run. */
    if (Math.abs(y - prevY) >= 1) {
      prevY = y;
      stillTicks = 0;
      return setTimeout(tick, 100);
    }

    stillTicks += 1;
    prevY = y;

    /* Two still ticks means the animation has stopped somewhere that is not
       the destination — the page grew while it was running. Aim again from
       where we actually are. */
    if (stillTicks >= 2) {
      stillTicks = 0;
      attempt += 1;
      window.scrollTo({ top: destination(), behavior: 'smooth' });
    }
    return setTimeout(tick, 100);
  };

  /* First animation from here. */
  attempt += 1;
  window.scrollTo({ top: destination(), behavior: 'smooth' });
  setTimeout(tick, 120);

  function cleanup() {
    window.removeEventListener('wheel', cancel);
    window.removeEventListener('touchstart', cancel);
    window.removeEventListener('pointerdown', cancel);
    window.removeEventListener('keydown', cancel);
  }
}

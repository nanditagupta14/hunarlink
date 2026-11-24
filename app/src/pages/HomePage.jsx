import React, { Suspense, lazy, useEffect, useState } from 'react';
import HeroSection from '../components/sections/HeroSection.jsx';

/* The hero is the only section in the first screen, and it is the only one
   imported eagerly. The four below it — verification, artisans, the 96-card
   marketplace grid, wholesale — were all in the entry chunk, which is why the
   entry was 270 KB and why first paint waited on JavaScript for markup the
   user had not scrolled to yet.

   Each becomes its own chunk. The browser downloads them as soon as the hero
   has mounted, so scrolling down is seamless; what changes is that the first
   frame no longer waits for 96 product cards to be parsed.

   The Suspense fallback is height-reserving rather than a spinner: these
   sections are tall, and an empty box that later grows would move the scroll
   position under the user. */
const VerificationSection = lazy(() => import('../components/sections/VerificationSection.jsx'));
const ArtisansSection = lazy(() => import('../components/sections/ArtisansSection.jsx'));
const MarketplaceSection = lazy(() => import('../components/sections/MarketplaceSection.jsx'));
const WholesaleBanner = lazy(() => import('../components/sections/WholesaleBanner.jsx'));

/* Reserves vertical space so the lazy chunks cannot cause a layout shift. */
function SectionPlaceholder({ height }) {
  return <div style={{ minHeight: height }} aria-hidden="true" />;
}

/* ==========================================================================
   HomePage
   --------------------------------------------------------------------------
   Four sections in the order the nav promises: hero, verification flow,
   the artisan showcase, store, wholesale. The old "Master Craft" guild grid
   was removed on request -- the artisan showcase now carries the
   "Our Artisans" nav item on its own. Scroll-spy used to be a hand-rolled
   intersection walker; it is now a single IntersectionObserver driving one
   piece of state, and only the section actually in view is highlighted.
   ========================================================================== */

const SECTIONS = [
  { id: 'hero-section', nav: 'home' },
  { id: 'verification-section', nav: 'verify' },
  { id: 'artisan-showcase-section', nav: 'artisans' },
  { id: 'marketplace-section', nav: 'store' },
  { id: 'b2b-wholesale-section', nav: 'wholesale' }
];

export default function HomePage({ onSectionChange }) {
  const [active, setActive] = useState('home');

  /* Which section owns the viewport, expressed as a question that does not
     care when the section mounted.

     This replaced an IntersectionObserver for two reasons, both measured:

     1. The store, artisans and wholesale sections are lazy chunks. They did not
        exist yet when this effect first ran, so the observer never watched the
        marketplace at all. Scrolling into the grid left "Home" highlighted,
        which is the complaint this fixes.

     2. Even when watched, the store section is ~11,000 px tall. Inside a
        -45%/45% band its intersection ratio is 0.008, which rounds to nothing
        and loses to whichever short section fired last — the highlight stuck
        on Home while the visitor stood in the middle of the grid.

     Walking the sections on scroll answers the actual question instead: the
     active section is the last one whose top has passed the middle of the
     screen. That is true for a 500 px hero and an 11,000 px grid alike, and it
     keeps working when a chunk mounts late. */
  useEffect(() => {
    let raf = null;

    const compute = () => {
      raf = null;
      const mid = window.innerHeight / 2;
      let best = SECTIONS[0].nav;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= mid) best = s.nav;
      }
      setActive(best);
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    /* The lazy sections arrive after this effect runs, so re-measure when the
       page body gains children rather than assuming the first pass saw
       everything. */
    const body = document.getElementById('main-content') || document.body;
    const mo = new MutationObserver(schedule);
    mo.observe(body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      mo.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    onSectionChange?.(active);
  }, [active, onSectionChange]);

  return (
    <main id="main-content">
      <HeroSection />
      <Suspense fallback={<SectionPlaceholder height={720} />}>
        <VerificationSection />
        <ArtisansSection />
        <MarketplaceSection />
        <WholesaleBanner />
      </Suspense>
    </main>
  );
}

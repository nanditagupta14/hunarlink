import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/* ==========================================================================
   ScrollToTop
   --------------------------------------------------------------------------
   What was wrong
   --------------
   React Router does not touch the scroll position when the route changes. That
   is correct for a plain document, but this storefront is a single page that
   decides its own height, so the browser kept the old offset and then clamped
   it to the new page's maximum. Concretely: clicking a product from 2,587 px
   down the marketplace grid landed on the product page at scrollTop 1,502 —
   the very bottom, which is exactly what a user reported seeing.

   The fix is not "scroll to top on every click". Three cases have to be told
   apart, and getting them wrong trades one annoyance for another:

   1. A new page (push)                  reset to the top.
   2. Back / forward (pop)               leave it alone — the browser restores
                                         the position the user left, and
                                         overriding that breaks the back button.
   3. Switching product on the same page  reset, because the content above the
                                         fold is completely different even
                                         though the pathname is identical.

   What deliberately does NOT reset
   --------------------------------
   Changing a filter, sort, tab or the ?mode=/?role= query on /login or
   /wholesale. Those are in-page edits, not navigations: resetting would yank
   the viewport out from under someone half way down a form. That is why this
   compares the product id rather than any change to the query string.

   Reload must not restore the old offset
   --------------------------------------
   The browser's own scroll restoration ran a race with the reset above and won
   it on a reload: the reset fired, then Chrome restored the pre-reload offset,
   and the visitor landed eyes-deep in the marketplace grid with the hero above
   the fold — Home still highlighted, which reads as "the homepage now starts
   here". So this component takes ownership of restoration instead of competing
   with it: the browser is put in 'manual' mode and back/forward is honoured
   from a per-entry position map, which is what the browser was doing for us.

   The scroll is instant, not smooth
   ---------------------------------
   base.css sets `scroll-behavior: smooth` on <html>, which would animate this
   and make every navigation look like it jumped. The behaviour is overridden
   for exactly the duration of the scroll call and restored immediately, so
   smooth scrolling everywhere else is unaffected.
   ========================================================================== */

/* Scroll without animation, whatever the stylesheet asks for. */
function jumpTo(top, left = 0) {
  const html = document.documentElement;
  const previous = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  window.scrollTo(left, top);
  /* Read the value before restoring so the browser commits the instant
     position rather than the animation it was asked for a moment earlier. */
  void html.offsetHeight;
  html.style.scrollBehavior = previous;
}

/* Was this document arrived at by pressing reload?
   The Performance API records how the current document was obtained, so a
   refresh can be told apart from a first open — and that difference matters
   here. A REFRESH must go to the top of the page, because the fragment left in
   the address bar is just where the visitor happened to be. A FIRST OPEN of a
   shared link such as /#marketplace-section is a genuine request for that
   section and should still honour it. */
/* The fragment the document was actually loaded with, captured once at module
   evaluation. A later hash change — clicking a section nav — does not update
   this, which is the whole point: it separates "this URL arrived with a hash"
   from "a hash was added while browsing". */
const HASH_AT_LOAD = typeof window !== 'undefined' ? window.location.hash : '';

function wasReloaded() {
  try {
    const entries = performance.getEntriesByType('navigation');
    return Boolean(entries && entries[0] && entries[0].type === 'reload');
  } catch {
    return false;
  }
}

/* Move focus to a hash target without letting the browser scroll again (which
   would fight the position jumpTo() just set). */
function focusTarget(el) {
  if (!el || typeof el.focus !== 'function') return;
  const hadTabIndex = el.hasAttribute('tabindex');
  if (!hadTabIndex) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
  /* Leave the DOM as we found it — an injected tabindex is a real change to
     the document and would otherwise show up in later snapshots. */
  if (!hadTabIndex) {
    el.addEventListener(
      'blur',
      () => {
        el.removeAttribute('tabindex');
      },
      { once: true }
    );
  }
}

export default function ScrollToTop() {
  const { pathname, search, hash, key } = useLocation();
  const navigationType = useNavigationType();

  /* Where each history entry has been left. React Router's location.key is
     stable for the life of an entry, so this is a faithful stand-in for what
     the browser would remember on its own. */
  const positions = useRef(new Map());
  const currentKey = useRef(null);

  /* While a back/forward restore is in flight the viewport is passing through
     intermediate offsets. Recording those would overwrite the entry we are
     navigating TO with a position it never had — forward then landed at 1535
     instead of the top. Saves are suspended for the duration. */
  const lockSaves = useRef(false);

  /* Take restoration off the browser's hands once, before the first navigation
     is handled. Anything later than this is too late — the restore already
     happened by the time an effect runs. */
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  /* Record the offset continuously so a back/forward has something to restore
     to. Throttled to one write per frame; a scroll listener that assigns on
     every event is the classic jank source. */
  useEffect(() => {
    let raf = null;
    const save = () => {
      if (lockSaves.current) return;
      if (currentKey.current) positions.current.set(currentKey.current, window.scrollY);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        save();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      save();
    };
  }, []);

  /* React Router reports the very first render as POP, because the initial
     history entry is a pop in the History API's terms. Treating that as
     "back/forward" made this component skip its work on page load, which
     silently broke deep links to a section (?/#marketplace-section) while
     in-app navigation worked — a maddening half-bug. Only a POP *after* the
     first run is a real back/forward. */
  const isFirstRun = useRef(true);

  /* The product page is the one screen whose identity lives in the query
     string rather than the path. Pulled out so product A -> product B resets
     while a filter or tab change does not. */
  const productId = new URLSearchParams(search).get('id');

  useLayoutEffect(() => {
    const firstRun = isFirstRun.current;
    isFirstRun.current = false;

    /* Back and forward: put the visitor back where they left that entry. The
       browser used to do this for us, but restoration is in 'manual' mode now
       — see the note at the top of the file — so this IS the browser's job,
       performed here. A short retry covers the case where the restored page has
       not grown back to its full height yet and the offset would otherwise be
       clamped to a shorter document. */
    if (!firstRun && navigationType === 'POP') {
      currentKey.current = key;
      const target = positions.current.get(key) ?? 0;

      /* No remembered position for this entry means it is new to us — a forward
         into a page we have not stood on before. The browser then keeps the old
         offset and clamps it to the new page's height, so forwarding from deep
         in the marketplace lands at the BOTTOM of a short product page. Send
         those to the top, and re-assert it once the layout has settled. */
      if (target <= 0) {
        lockSaves.current = true;
        jumpTo(0);
        const raf = requestAnimationFrame(() => jumpTo(0));
        const settle = setTimeout(() => jumpTo(0), 120);
        const unlock = setTimeout(() => {
          lockSaves.current = false;
        }, 500);
        return () => {
          cancelAnimationFrame(raf);
          clearTimeout(settle);
          clearTimeout(unlock);
          lockSaves.current = false;
        };
      }

      lockSaves.current = true;
      let tries = 0;
      let timer = null;
      const restore = () => {
        jumpTo(target);
        /* If the document is not tall enough yet, the jump was clamped and the
           visitor ends up somewhere arbitrary. Try again until it fits. */
        const maxY = document.documentElement.scrollHeight - window.innerHeight;
        if (Math.abs(window.scrollY - target) < 2 || maxY >= target || tries >= 10) return;
        tries += 1;
        timer = setTimeout(restore, 100);
      };
      const raf = requestAnimationFrame(restore);
      /* Release the lock once the restore has had time to settle, whether it
         succeeded or ran out of retries. */
      const unlock = setTimeout(() => {
        lockSaves.current = false;
      }, 900);
      return () => {
        cancelAnimationFrame(raf);
        if (timer) clearTimeout(timer);
        clearTimeout(unlock);
        lockSaves.current = false;
      };
    }

    /* A hash that was already in the address bar when the page loaded is not
       a request to scroll — it is the leftover of a previous visit. Refresh on
       such a URL and the browser re-honours the fragment, so the page reopens
       at the marketplace grid instead of the top. On a load or a refresh, the
       top of the page wins and the fragment is dropped from the URL.

       An in-app click that sets a hash (EXPLORE CRAFTS, a section nav) is a
       real request and still scrolls, because by then the first run is over. */
    if (hash && firstRun && HASH_AT_LOAD === hash && wasReloaded()) {
      try {
        history.replaceState(history.state, '', window.location.pathname + window.location.search);
      } catch {
        /* replaceState can throw in sandboxed frames; the reset below still
           puts the visitor at the top, which is the part that matters. */
      }
      jumpTo(0);
      currentKey.current = key;
      return;
    }

    /* A hash means the destination is a section on this page, so honour it.
       If the target has not rendered yet (lazy sections mount shortly after
       navigation) fall back to the top rather than scrolling nowhere. */
    if (hash) {
      const id = hash.replace(/^#/, '');
      /* #hero-section, #main-content and #top all mean "the top of this page".
         The hero element begins ~136 px down, below the utility strip and the
         header, so aiming at the element hides both and opens the home page
         cropped. */
      if (['hero-section', 'main-content', 'top'].includes(id)) {
        jumpTo(0);
        focusTarget(document.getElementById(id));
        return;
      }
      const scrollToHash = () => {
        const target = document.getElementById(id);
        if (!target) return false;
        jumpTo(target.getBoundingClientRect().top + window.scrollY);
        /* A hash change alone does not move keyboard focus in every browser,
           so a skip link would scroll without actually skipping anything for a
           screen-reader user. Focusing the target completes the jump. */
        focusTarget(target);
        return true;
      };

      if (scrollToHash()) return;

      /* The section may not have mounted yet: most of the storefront below the
         hero is a lazy chunk, and a chunk has to be fetched before it renders.
         Poll for up to two seconds rather than assuming one retry is enough —
         a single 400 ms retry was measured failing on a cold load, which
         silently turned a deep link into a scroll to the top. */
      let attempts = 0;
      let timer = null;
      let cancelled = false;

      /* Stop chasing the target the moment the user takes over. Without this a
         late chunk could yank the viewport away from someone who started
         reading further up the page. */
      const onUserScroll = () => {
        cancelled = true;
      };
      window.addEventListener('wheel', onUserScroll, { passive: true, once: true });
      window.addEventListener('touchstart', onUserScroll, { passive: true, once: true });

      const poll = () => {
        if (cancelled) return;
        if (scrollToHash()) return;
        attempts += 1;
        /* Up to ~4 s: on a cold load the storefront's below-the-fold chunks
           have to be fetched before the section exists, and a 2 s window was
           measured losing that race. */
        if (attempts >= 20) {
          jumpTo(0);
          return;
        }
        timer = setTimeout(poll, 200);
      };
      const raf = requestAnimationFrame(poll);
      return () => {
        cancelAnimationFrame(raf);
        if (timer) clearTimeout(timer);
        window.removeEventListener('wheel', onUserScroll);
        window.removeEventListener('touchstart', onUserScroll);
      };
    }

    jumpTo(0);
    currentKey.current = key;
    /* `key` changes on every navigation, so this covers pathname changes and
       product-id changes in one dependency. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pathname, productId, hash, navigationType]);

  return null;
}

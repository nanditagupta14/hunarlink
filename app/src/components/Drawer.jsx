import React, { useEffect, useRef } from 'react';
import { Close } from './Icons.jsx';

/* ==========================================================================
   Drawer — the shell behind Wishlist and Bag
   --------------------------------------------------------------------------
   Behaviour carried over from the static build, including the details that
   were tuned there:

     - a scrim that dims the page and closes on click
     - Escape closes, and focus returns to whatever opened it
     - body scroll is locked while open
     - the chat launcher sits behind the panel, so a tap that lands on it
       still closes the drawer rather than opening the bot
     - on phones the sheet is inset slightly, so there is always an outside
       strip to tap

   Focus is trapped inside the panel while open: tabbing must not walk into
   the page behind a modal surface.
   ========================================================================== */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Drawer({ open, onClose, labelledBy, children, footer }) {
  const panelRef = useRef(null);
  const restoreTo = useRef(null);

  /* Escape + scroll lock + focus restore */
  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement;
    document.body.classList.add('drawer-open');

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter(
        (n) => n.offsetParent !== null
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    // move focus into the panel once it has slid in
    const t = setTimeout(() => {
      const target = panelRef.current?.querySelector(FOCUSABLE);
      if (target) target.focus();
    }, 60);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      clearTimeout(t);
      document.body.classList.remove('drawer-open');
      if (restoreTo.current && restoreTo.current.focus) {
        restoreTo.current.focus();
      }
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={`drawer-scrim${open ? ' visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* `aria-hidden` alone removes the panel from the accessibility tree but
          leaves its buttons in the tab order, so a keyboard user could tab into
          an invisible cart. `inert` does both jobs. aria-hidden is kept for
          browsers that predate inert support. It must be a real boolean:
          React 19 treats `inert` as a boolean attribute, so passing "" is
          falsy and React silently omits the attribute entirely. */}
      <aside
        ref={panelRef}
        className={`slide-drawer${open ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-hidden={!open}
        inert={!open}
      >
        {children}
        {footer ? <div className="drawer-footer">{footer}</div> : null}
        <button
          type="button"
          className="drawer-close-btn drawer-close-floating"
          aria-label="Close"
          onClick={onClose}
        >
          <Close />
        </button>
      </aside>
    </>
  );
}

/* Shared ledger header used by both drawers. */
export function DrawerHeader({ kicker, title, meta, id }) {
  return (
    <div className="drawer-header">
      <div className="drawer-ledger">
        <span className="drawer-ledger-kicker">{kicker}</span>
        <h2 className="drawer-ledger-title" id={id}>
          {title}
        </h2>
        <p className="drawer-ledger-meta">{meta}</p>
      </div>
    </div>
  );
}

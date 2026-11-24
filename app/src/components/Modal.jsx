import React, { useEffect, useRef } from 'react';
import { useStore } from '../state/StoreContext.jsx';

/* ==========================================================================
   Modal — the one shell every dialog in the app uses
   --------------------------------------------------------------------------
   The static build had eight separate backdrop divs, each toggling its own
   `.open` class, and close handlers that looked the div up by id. Here one
   shell is driven by `ui.modal`. The markup and class names are unchanged
   (`.backdrop-overlay` > `.modal-card` > `.modal-header` / `.modal-body`), so
   the existing CSS applies as-is.

   Contract, same as before:
     - backdrop click dismisses, Escape dismisses
     - focus moves in, is trapped, returns to the trigger on close
     - page scroll locks while open
   ========================================================================== */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ id, width, title, children, onClose, variant }) {
  const panelRef = useRef(null);
  const restoreTo = useRef(null);

  useEffect(() => {
    restoreTo.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter(
        (n) => n.offsetParent !== null
      );
      if (!nodes.length) return;
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

    document.addEventListener('keydown', onKey, true);
    const t = setTimeout(() => panelRef.current?.querySelector(FOCUSABLE)?.focus(), 60);

    return () => {
      document.removeEventListener('keydown', onKey, true);
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      restoreTo.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="backdrop-overlay open"
      id={id}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        /* `variant` is additive: the base shell is unchanged, so the modals
           that already exist render exactly as they did. 'split' opts into the
           light header treatment used by the login picker. */
        className={`modal-card${variant ? ` modal-card--${variant}` : ''}`}
        style={width ? { maxWidth: width } : undefined}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="drawer-title">{title}</div>
          <button type="button" className="drawer-close-btn" aria-label="Close" onClick={onClose}>
            &#10005;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

import React from 'react';
import { useStore } from '../state/StoreContext.jsx';

/* ==========================================================================
   CompareBar — floating strip, shown once anything is marked for comparison
   --------------------------------------------------------------------------
   Markup and class names are the static build's own (`.compare-floating-bar`
   gains `.visible`, which is what the CSS keys off), so it sits at z-index 180
   and disappears behind `body.drawer-open` exactly as before.
   ========================================================================== */

export default function CompareBar() {
  const { compareList, compareItems, toggleCompare, openModal, clearCompare, toast } = useStore();

  if (compareList.length === 0) return null;

  const count = compareList.length;

  return (
    <div className="compare-floating-bar visible" id="compare-floating-bar">
      <span id="compare-bar-text" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
        {count} Craft{count === 1 ? '' : 's'} Selected for Side-by-Side Comparison
      </span>
      <button
        type="button"
        className="btn-gold"
        style={{ padding: '7px 14px', fontSize: '0.74rem' }}
        onClick={() => {
          if (compareItems.length === 0) {
            toast('Select at least 1 craft using the Compare checkbox on product cards');
            return;
          }
          openModal('compare');
        }}
      >
        Compare Side-by-Side
      </button>
      <button
        type="button"
        style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.74rem' }}
        onClick={() => {
          clearCompare();
          toast('Comparison list cleared');
        }}
      >
        Clear
      </button>
    </div>
  );
}

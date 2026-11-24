import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/StoreContext.jsx';
import { IconLogin, IconPackage, IconShield } from '../components/LineIcons.jsx';

/* ==========================================================================
   UtilityBar — the thin strip above the header
   --------------------------------------------------------------------------
   Five shortcuts, all of which existed in the static build: artisan login, GI
   verification, order tracking, the comparison list, and a demo reset that
   wipes every HunarLink key so the site can be shown from a clean slate.
   ========================================================================== */

export default function UtilityBar() {
  const navigate = useNavigate();
  const { openModal, toast } = useStore();

  const resetDemo = () => {
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith('hunarlink_') || k.startsWith('hunarsathi_'))
        .forEach((k) => window.localStorage.removeItem(k));
    } catch (err) {
      /* private mode — nothing to clear */
    }
    toast('Demo data reset. Reloading\u2026');
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div className="utility-bar">
      <div className="container utility-inner">
        <div className="utility-left">
          <span>
            <span className="utility-dot" /> GI-Certified Jammu &amp; Kashmir Handicrafts &bull; Direct
            Artisan Loom Marketplace
          </span>
        </div>
        <div className="utility-actions">
          <button type="button" className="utility-link-btn" onClick={() => navigate('/login')}>
            <IconLogin size={15} /> Artisan Login
          </button>
          <button
            type="button"
            className="utility-link-btn"
            onClick={() => openModal('giVerify', { giId: 'GI-JK-PASH-8821' })}
          >
            <IconShield size={15} />&#65039; Verify GI Tag
          </button>
          <button type="button" className="utility-link-btn" onClick={() => openModal('orders')}>
            <IconPackage size={15} /> Track Orders
          </button>
          <button type="button" className="utility-link-btn" onClick={() => openModal('compare')}>
            Compare Crafts
          </button>
          <button type="button" className="utility-link-btn" onClick={resetDemo}>
            &#8634; Reset Demo
          </button>
        </div>
      </div>
    </div>
  );
}

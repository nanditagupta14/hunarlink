import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/StoreContext.jsx';
import { formatINR, asset } from '../utils/legacy.js';;
import Drawer, { DrawerHeader } from './Drawer.jsx';

/* ==========================================================================
   WishlistDrawer
   --------------------------------------------------------------------------
   Same catalogue-sheet design as the static build: ledger header stating the
   running value, each piece as one tappable unit, controls in a right rail.
   ========================================================================== */

export default function WishlistDrawer() {
  const navigate = useNavigate();
  const { ui, closeDrawer, wishlistItems, addToCart, toggleWishlist } = useStore();
  const open = ui.drawer === 'wishlist';
  const count = wishlistItems.length;
  const total = wishlistItems.reduce((sum, p) => sum + p.price, 0);

  const meta = count
    ? `${count} ${count === 1 ? 'piece' : 'pieces'} under consideration \u00b7 ${formatINR(total)} at listed price`
    : 'Your saved pieces will be kept here';

  return (
    <Drawer
      open={open}
      onClose={closeDrawer}
      labelledBy="wishlist-title"
      footer={null}
    >
      <DrawerHeader
        id="wishlist-title"
        kicker="Your Private Collection"
        title={count ? 'Saved Heirlooms' : 'Nothing Saved Yet'}
        meta={meta}
      />

      <div className="drawer-body">
        {count === 0 ? (
          <div className="wl-empty">
            <div className="wl-empty-rule" />
            <p className="wl-empty-title">Your collection is empty</p>
            <p className="wl-empty-note">
              Tap the heart on any piece in the J&amp;K Heritage Store to keep it here for later.
            </p>
          </div>
        ) : (
          <>
            {wishlistItems.map((p) => {
              const metaBits = [p.district, p.loomHours ? `${p.loomHours} loom hours` : '']
                .filter(Boolean)
                .join(' \u00b7 ');
              return (
                <article className="wl-item" key={p.id}>
                  <button
                    type="button"
                    className="wl-main"
                    onClick={() => {
                      closeDrawer();
                      navigate(`/product?id=${encodeURIComponent(p.id)}`);
                    }}
                    aria-label={`Open ${p.title}`}
                  >
                    <img loading="lazy" decoding="async" className="wl-thumb" src={asset(p.image)} alt="" />
                    <span className="wl-copy">
                      <span className="wl-guild">{p.guildLabel}</span>
                      <span className="wl-title">{p.title}</span>
                      <span className="wl-meta">{p.artisan}</span>
                      <span className="wl-meta">{metaBits}</span>
                      <span className="wl-price">
                        {formatINR(p.price)}
                        <s>{formatINR(p.mrp)}</s>
                      </span>
                    </span>
                  </button>
                  <div className="wl-actions">
                    <button
                      type="button"
                      className="wl-move"
                      onClick={() => {
                        addToCart(p.id, 1);
                        toggleWishlist(p.id);
                      }}
                    >
                      Move to Bag
                    </button>
                    <button
                      type="button"
                      className="wl-remove"
                      onClick={() => toggleWishlist(p.id)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
            <p className="wl-foot">
              Prices are the artisan&rsquo;s listed price. Every piece is GI-verified and shipped
              direct from the workshop.
            </p>
          </>
        )}
      </div>
    </Drawer>
  );
}

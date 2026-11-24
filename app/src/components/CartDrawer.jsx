import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/StoreContext.jsx';
import { formatINR, asset } from '../utils/legacy.js';;
import Drawer, { DrawerHeader } from './Drawer.jsx';
import { ShieldCheck, ArrowRight } from './Icons.jsx';

/* ==========================================================================
   CartDrawer — the Acquisition Bag
   --------------------------------------------------------------------------
   Same sheet as the wishlist, same logic as the static build: quantity
   stepping, save-for-later, coupon codes, and a summary ledger with tabular
   figures. Checkout hands off to the wizard.
   ========================================================================== */

export default function CartDrawer() {
  const navigate = useNavigate();
  const {
    ui,
    closeDrawer,
    openModal,
    cartItems,
    savedItems,
    totals,
    coupon,
    setQty,
    removeFromCart,
    saveForLater,
    moveToCart,
    applyCoupon,
    removeCoupon
  } = useStore();

  const [codeInput, setCodeInput] = useState('');
  const open = ui.drawer === 'cart';
  const count = cartItems.reduce((n, e) => n + e.qty, 0);

  const meta = count
    ? `${count} ${count === 1 ? 'piece' : 'pieces'} reserved \u00b7 ${formatINR(totals.netPayable)} net payable`
    : 'Nothing reserved yet';

  const goTo = (id) => {
    closeDrawer();
    navigate(`/product?id=${encodeURIComponent(id)}`);
  };

  const goCheckout = () => {
    closeDrawer();
    openModal('checkout');
  };

  return (
    <Drawer
      open={open}
      onClose={closeDrawer}
      labelledBy="cart-title"
      footer={
        <div className="bag-summary-wrap">
          <div className="bag-summary">
            <div className="bag-sum-line">
              <span>
                Total MRP <em>({totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'})</em>
              </span>
              <span>{formatINR(totals.totalMrp)}</span>
            </div>
            <div className="bag-sum-line bag-sum-credit">
              <span>Direct Artisan Loom Savings</span>
              <span>&minus; {formatINR(totals.artisanDiscount)}</span>
            </div>
            {totals.couponDiscount > 0 && (
              <div className="bag-sum-line bag-sum-credit bag-sum-strong">
                <span>
                  Coupon <em>{coupon}</em>
                </span>
                <span>&minus; {formatINR(totals.couponDiscount)}</span>
              </div>
            )}
            <div className="bag-sum-line">
              <span>Insured GI-Sealed Transit</span>
              <span className="bag-sum-free">Free</span>
            </div>
            <div className="bag-sum-total">
              <span>Net Payable</span>
              <span>{formatINR(totals.netPayable)}</span>
            </div>
          </div>
          <button
            type="button"
            className="wl-checkout"
            disabled={count === 0}
            onClick={goCheckout}
          >
            Proceed to Insured Checkout <ArrowRight />
          </button>
        </div>
      }
    >
      <DrawerHeader
        id="cart-title"
        kicker="Reserved Pieces"
        title="Valley Acquisition Bag"
        meta={meta}
      />

      <div className="drawer-body">
        {count === 0 ? (
          <div className="wl-empty">
            <div className="wl-empty-rule" />
            <p className="wl-empty-title">Your bag is empty</p>
            <p className="wl-empty-note">
              Explore GI-certified Kashmiri shawls, rugs, walnut wood and papier-m&acirc;ch&eacute;
              treasures.
            </p>
          </div>
        ) : (
          <>
            {cartItems.map(({ product: p, qty }) => (
              <article className="wl-item" key={p.id}>
                <button
                  type="button"
                  className="wl-main"
                  onClick={() => goTo(p.id)}
                  aria-label={`Open ${p.title}`}
                >
                  <img loading="lazy" decoding="async" className="wl-thumb" src={asset(p.image)} alt="" />
                  <span className="wl-copy">
                    <span className="wl-guild">{p.guildLabel}</span>
                    <span className="wl-title">{p.title}</span>
                    <span className="wl-meta">{p.artisan}</span>
                    <span className="wl-meta">{p.giId}</span>
                    <span className="wl-price">
                      {formatINR(p.price * qty)}
                      <s>{formatINR((p.originalPrice ?? p.mrp) * qty)}</s>
                    </span>
                  </span>
                </button>
                <div className="wl-actions">
                  <div className="bag-qty" role="group" aria-label={`Quantity for ${p.title}`}>
                    <button
                      type="button"
                      className="bag-qty-btn"
                      aria-label="Decrease quantity"
                      onClick={() => setQty(p.id, qty - 1)}
                    >
                      &minus;
                    </button>
                    <span className="bag-qty-val">{qty}</span>
                    <button
                      type="button"
                      className="bag-qty-btn"
                      aria-label="Increase quantity"
                      onClick={() => setQty(p.id, qty + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button type="button" className="wl-remove bag-save" onClick={() => saveForLater(p.id)}>
                    Save for Later
                  </button>
                  <button type="button" className="wl-remove" onClick={() => removeFromCart(p.id)}>
                    Remove
                  </button>
                </div>
              </article>
            ))}

            <div className="bag-coupon">
              <label className="bag-coupon-label" htmlFor="coupon-code-input">
                Valley Privilege
              </label>
              <div className="bag-coupon-row">
                <input
                  id="coupon-code-input"
                  type="text"
                  placeholder="Enter a privilege code"
                  value={codeInput || coupon || ''}
                  autoComplete="off"
                  onChange={(e) => setCodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyCoupon(codeInput);
                  }}
                />
                <button type="button" className="wl-move" onClick={() => applyCoupon(codeInput)}>
                  Apply
                </button>
              </div>
              <div className="bag-coupon-chips">
                <button type="button" className="bag-chip" onClick={() => applyCoupon('VALLEY10')}>
                  VALLEY10 <span>10% off</span>
                </button>
                <button type="button" className="bag-chip" onClick={() => applyCoupon('FIRSTCRAFT')}>
                  FIRSTCRAFT <span>&#8377;2,500 off</span>
                </button>
                {coupon && (
                  <button type="button" className="bag-chip bag-chip-remove" onClick={removeCoupon}>
                    Remove coupon
                  </button>
                )}
              </div>
            </div>

            <div className="bag-reassure">
              <ShieldCheck size={14} />
              <span>
                <strong>Zero Commission.</strong> 100% of net craft value goes directly to the
                registered Kashmiri artisan loom.
              </span>
            </div>

            {savedItems.length > 0 && (
              <div className="bag-saved">
                <div className="bag-saved-head">
                  Saved for Later <span>{savedItems.length}</span>
                </div>
                {savedItems.map((p) => (
                  <article className="wl-item bag-saved-item" key={p.id}>
                    <button
                      type="button"
                      className="wl-main"
                      onClick={() => goTo(p.id)}
                      aria-label={`Open ${p.title}`}
                    >
                      <img
                        loading="lazy"
                        decoding="async"
                        className="wl-thumb bag-thumb-sm"
                        src={asset(p.image)}
                        alt=""
                      />
                      <span className="wl-copy">
                        <span className="wl-guild">{p.guildLabel}</span>
                        <span className="wl-title bag-title-sm">{p.title}</span>
                        <span className="wl-price bag-price-sm">{formatINR(p.price)}</span>
                      </span>
                    </button>
                    <div className="wl-actions">
                      <button type="button" className="wl-move" onClick={() => moveToCart(p.id)}>
                        Move to Bag
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}

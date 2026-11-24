import React, { useState } from 'react';
import { useStore } from '../../state/StoreContext.jsx';
import { formatINR } from '../../utils/legacy.js';
import Modal from '../Modal.jsx';
import { IconShield } from '../../components/LineIcons.jsx';

/* ==========================================================================
   CheckoutModal — four-step acquisition wizard
   --------------------------------------------------------------------------
   1. User identity
   2. Delivery address (saved, or add a new one)
   3. Order summary with the GI certificate preview
   4. Simulated escrow payment

   Placing an order writes through the store, clears the bag and the coupon,
   and hands off to the orders modal — the same sequence as the static build.
   ========================================================================== */

const STEPS = [
  '1. User ID',
  '2. Delivery Address',
  '3. GI Certificate & Summary',
  '4. Escrow Payment'
];

export default function CheckoutModal() {
  const {
    ui,
    closeModal,
    openModal,
    cartItems,
    totals,
    coupon,
    addresses,
    addAddress,
    user,
    placeOrder,
    clearCart,
    removeCoupon,
    toast
  } = useStore();

  const [step, setStep] = useState(1);
  const [buyer, setBuyer] = useState({
    name: user?.name || 'Demo User',
    phone: user?.phone || '+91 0000000000'
  });
  const [addressId, setAddressId] = useState(addresses[0]?.id);
  const [draft, setDraft] = useState({
    name: '',
    phone: '',
    pin: '',
    city: '',
    loc: ''
  });
  const [method, setMethod] = useState(null);

  if (!ui.modal || ui.modal.type !== 'checkout') return null;

  const selected = addresses.find((a) => a.id === addressId) || addresses[0];

  const saveAddress = (e) => {
    e.preventDefault();
    const clean = Object.fromEntries(
      Object.entries(draft).map(([k, v]) => [k, String(v).trim()])
    );
    if (!clean.name || !clean.phone || !clean.pin || !clean.loc || !clean.city) {
      toast('\u26a0\ufe0f Please fill every delivery field (name, mobile, pincode, locality & city)');
      return;
    }
    const next = {
      id: `addr-${Date.now()}`,
      name: clean.name,
      phone: clean.phone,
      pincode: clean.pin,
      locality: clean.loc,
      city: clean.city,
      type: 'Delivery'
    };
    addAddress(next);
    setAddressId(next.id);
    setStep(3);
    toast('Delivery address saved and selected', 'success');
  };

  const pay = (paymentMethod) => {
    setMethod(paymentMethod);
    const now = new Date();
    const orderId = `HL-ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const order = {
      id: orderId,
      date: now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      createdAt: now.toISOString(),
      buyer: {
        name: buyer.name || selected?.name || 'Priya Sharma',
        phone: buyer.phone || selected?.phone || '+91 98110 44210',
        email: user?.email || 'collector@hunarlink.in',
        addressType: selected?.type || 'Home',
        locality: selected?.locality || '',
        city: selected?.city || '',
        pincode: selected?.pincode || '',
        fullAddress: selected
          ? `${selected.name}, ${selected.locality}, ${selected.city} - ${selected.pincode}`
          : ''
      },
      items: cartItems.map(({ product: p, qty }) => ({
        productId: p.id,
        title: p.title,
        qty,
        price: p.price,
        lineTotal: p.price * qty,
        giId: p.giId,
        artisan: p.artisan,
        guild: p.guildLabel || p.guild,
        image: p.image
      })),
      subtotal: totals.sellingSubtotal,
      discount: totals.couponDiscount || 0,
      couponCode: coupon || null,
      shippingFee: totals.shippingFee || 0,
      total: totals.netPayable,
      artisanPayout: totals.netPayable,
      paymentMethod,
      paymentStatus: /cod|delivery/i.test(paymentMethod)
        ? 'Verify-on-Delivery Escrow'
        : 'Paid (Escrow Protected)',
      address: selected
        ? `${selected.name}, ${selected.locality}, ${selected.city} - ${selected.pincode}`
        : '',
      stage: 1,
      sellerNote: '',
      isNewForSeller: true
    };

    placeOrder(order);
    clearCart();
    removeCoupon();
    closeModal();
    openModal('orders');
    toast(`Order ${orderId} confirmed! Seller notified with complete order details.`, 'success');
  };

  return (
    <Modal
      id="checkout-modal"
      width="900px"
      title="<IconShield size={14} /> Insured Acquisition Checkout"
      onClose={closeModal}
    >
      <div className="modal-body" id="checkout-modal-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
          {STEPS.map((label, idx) => {
            const n = idx + 1;
            const active = n === step;
            const done = n < step;
            return (
              <button
                type="button"
                key={label}
                onClick={() => setStep(n)}
                style={{
                  padding: 8,
                  borderRadius: 6,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  background: active ? 'var(--forest-900)' : done ? 'var(--forest-100)' : 'var(--bg-ivory)',
                  color: active ? '#FFF' : 'var(--forest-900)'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {step === 1 && (
          <div style={{ background: 'var(--bg-ivory)', padding: 18, borderRadius: 10 }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', marginBottom: 10 }}>
              Step 1: User Identity &amp; GI Ownership Registration
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-500)', marginBottom: 14 }}>
              Your name is cryptographically bound to the Digital GI Ownership Passport upon
              dispatch.
            </p>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="chk-buyer-name">Full Name</label>
                <input
                  type="text"
                  id="chk-buyer-name"
                  value={buyer.name}
                  onChange={(e) => setBuyer((b) => ({ ...b, name: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label htmlFor="chk-buyer-phone">Phone (SMS/WhatsApp Loom Telemetry)</label>
                <input
                  type="text"
                  id="chk-buyer-phone"
                  value={buyer.phone}
                  onChange={(e) => setBuyer((b) => ({ ...b, phone: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button type="button" className="btn-primary-forest" onClick={() => setStep(2)}>
                Continue to Delivery Address &rarr;
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', marginBottom: 10 }}>
                Select Saved Address
              </h4>
              {addresses.map((a) => (
                <label
                  key={a.id}
                  style={{
                    display: 'block',
                    padding: 12,
                    border: `2px solid ${
                      addressId === a.id ? 'var(--forest-900)' : 'var(--border-light)'
                    }`,
                    borderRadius: 8,
                    marginBottom: 10,
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="selectedAddr"
                    checked={addressId === a.id}
                    onChange={() => setAddressId(a.id)}
                  />
                  <strong style={{ fontSize: '0.84rem', marginLeft: 6 }}>
                    {a.name} ({a.type || 'Home'})
                  </strong>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-500)', marginTop: 4 }}>
                    {a.locality}, {a.city} - {a.pincode} &bull; Ph: {a.phone}
                  </div>
                </label>
              ))}
              <button
                type="button"
                className="btn-primary-forest"
                style={{ marginTop: 8 }}
                onClick={() => setStep(3)}
              >
                Deliver to Selected Address &rarr;
              </button>
            </div>

            <form onSubmit={saveAddress} style={{ background: 'var(--bg-ivory)', padding: 14, borderRadius: 8 }}>
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', marginBottom: 8 }}>
                Or Add New Address
              </h4>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="addr-name">Full Name</label>
                  <input
                    type="text"
                    id="addr-name"
                    required
                    placeholder="Receiver Name"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="addr-phone">Mobile</label>
                  <input
                    type="text"
                    id="addr-phone"
                    required
                    placeholder="10-digit Mobile"
                    value={draft.phone}
                    onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="addr-pin">6-Digit Pincode</label>
                  <input
                    type="text"
                    id="addr-pin"
                    required
                    placeholder="e.g. 180001"
                    value={draft.pin}
                    onChange={(e) => setDraft((d) => ({ ...d, pin: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="addr-city">City &amp; State</label>
                  <input
                    type="text"
                    id="addr-city"
                    required
                    placeholder="Srinagar, J&K"
                    value={draft.city}
                    onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                  />
                </div>
                <div className="form-field full">
                  <label htmlFor="addr-loc">Street / Locality</label>
                  <input
                    type="text"
                    id="addr-loc"
                    required
                    placeholder="House No, Street, Landmark"
                    value={draft.loc}
                    onChange={(e) => setDraft((d) => ({ ...d, loc: e.target.value }))}
                  />
                </div>
              </div>
              <button type="submit" className="btn-acquire" style={{ marginTop: 10 }}>
                Save &amp; Use This Address
              </button>
            </form>
          </div>
        )}

        {step === 3 && (
          <div style={{ background: 'var(--bg-ivory)', padding: 18, borderRadius: 10 }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', marginBottom: 10 }}>
              Step 3: Order Summary &amp; GI Ownership Certificate Preview
            </h3>
            {cartItems.map(({ product: p, qty }) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border-light)',
                  fontSize: '0.84rem'
                }}
              >
                <span>
                  <strong>{p.title}</strong> &times; {qty}{' '}
                  <code style={{ color: 'var(--forest-700)' }}>[{p.giId}]</code>
                </span>
                <strong>{formatINR(p.price * qty)}</strong>
              </div>
            ))}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.05rem',
                fontWeight: 700,
                paddingTop: 10,
                color: 'var(--forest-950)'
              }}
            >
              <span>Total Escrow Payable (Zero Platform Cut)</span>
              <span>{formatINR(totals.netPayable)}</span>
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="btn-outline-ivory" onClick={() => setStep(2)}>
                &larr; Back
              </button>
              <button type="button" className="btn-primary-forest" onClick={() => setStep(4)}>
                Proceed to Escrow Payment &rarr;
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ background: 'var(--bg-ivory)', padding: 18, borderRadius: 10 }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', marginBottom: 12 }}>
              Step 4: Select Simulated Artisan Escrow Payment ({formatINR(totals.netPayable)})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                {
                  id: 'UPI Direct Artisan Escrow',
                  title: '\u{1F4F1} Instant UPI Escrow',
                  note: 'Direct UPI transfer held in GI-verified artisan escrow until delivery.',
                  cta: 'Pay via UPI'
                },
                {
                  id: 'Card Escrow Payment',
                  title: '\u{1F4B3} Credit / Debit Card',
                  note: 'Visa, Mastercard, RuPay & Zero-Cost Heritage EMI options.',
                  cta: 'Pay via Card'
                },
                {
                  id: 'Cash on Delivery Escrow',
                  title: '\u{1F4E6} Pay on Delivery',
                  note: 'Inspect the GI seal with the courier, then pay into escrow.',
                  cta: 'Confirm COD'
                }
              ].map((opt) => (
                <div
                  key={opt.id}
                  style={{
                    background: '#FFF',
                    padding: 14,
                    borderRadius: 8,
                    border: '1px solid var(--border-mid)'
                  }}
                >
                  <strong style={{ fontSize: '0.86rem' }}>{opt.title}</strong>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-500)', margin: '6px 0 12px' }}>
                    {opt.note}
                  </p>
                  <button
                    type="button"
                    className="btn-primary-forest"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={!!method}
                    onClick={() => pay(opt.id)}
                  >
                    {method === opt.id ? 'Processing\u2026' : opt.cta}
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <button type="button" className="btn-outline-ivory" onClick={() => setStep(3)}>
                &larr; Back to Summary
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

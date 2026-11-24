import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../state/StoreContext.jsx';
import { formatINR, asset } from '../../utils/legacy.js';
import Modal from '../Modal.jsx';
import { IconPackage } from '../../components/LineIcons.jsx';

/* ==========================================================================
   OrdersModal — receipt ledger for placed orders
   --------------------------------------------------------------------------
   Four tracking stages, same labels the seller portal advances: sealed at the
   loom, in transit, delivered, GI passport issued. Empty state offers a route
   back to the store rather than a dead end.
   ========================================================================== */

const STAGES = ['Loom Sealed', 'In Transit', 'Delivered', 'GI Passport Issued'];

export default function OrdersModal() {
  const { ui, closeModal, orders, openDrawer } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(() => orders[0]?.id || null);

  if (!ui.modal || ui.modal.type !== 'orders') return null;

  return (
    <Modal
      id="orders-modal"
      width="860px"
      title="<IconPackage size={15} /> Your Insured Order Ledger"
      onClose={closeModal}
    >
      <div className="modal-body" id="orders-modal-body">
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: 8 }}>
              No orders yet
            </h3>
            <p style={{ color: 'var(--text-500)', fontSize: '0.86rem', marginBottom: 16 }}>
              Every acquisition is escrow-protected, insured in transit, and arrives with a GI
              passport.
            </p>
            <button
              type="button"
              className="btn-primary-forest"
              onClick={() => {
                closeModal();
                navigate('/');
                setTimeout(
                  () =>
                    document.getElementById('marketplace-section')?.scrollIntoView({ behavior: 'smooth' }),
                  150
                );
              }}
            >
              Browse the Heritage Store
            </button>
          </div>
        ) : (
          orders.map((o) => {
            const isOpen = open === o.id;
            return (
              <article key={o.id} className="order-row" style={{ borderBottom: '1px solid var(--border-light)' }}>
                <button
                  type="button"
                  className="order-row-head"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : o.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '14px 0',
                    textAlign: 'left',
                    flexWrap: 'wrap'
                  }}
                >
                  <span>
                    <strong style={{ fontSize: '0.9rem' }}>{o.id}</strong>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-500)' }}>
                      {o.date} &bull; {o.time} &bull; {o.paymentMethod}
                    </div>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{formatINR(o.total)}</strong>
                    <div style={{ fontSize: '0.74rem', color: 'var(--forest-700)' }}>
                      {o.paymentStatus}
                    </div>
                  </span>
                </button>

                {isOpen && (
                  <div style={{ paddingBottom: 16 }}>
                    {(o.items || []).map((it) => (
                      <div
                        key={it.productId}
                        style={{
                          display: 'flex',
                          gap: 10,
                          alignItems: 'center',
                          padding: '8px 0',
                          fontSize: '0.82rem'
                        }}
                      >
                        {it.image && (
                          <img
                            src={asset(it.image)}
                            alt=""
                            style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 6 }}
                          />
                        )}
                        <span style={{ flex: 1 }}>
                          <strong>{it.title}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-500)' }}>
                            {it.artisan} &bull; {it.giId}
                          </div>
                        </span>
                        <span>
                          &times; {it.qty} &mdash; {formatINR(it.lineTotal)}
                        </span>
                      </div>
                    ))}

                    <div className="order-track" style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                      {STAGES.map((s, i) => {
                        const done = i < (o.stage || 1);
                        return (
                          <div
                            key={s}
                            style={{
                              flex: 1,
                              textAlign: 'center',
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              padding: '8px 4px',
                              borderRadius: 6,
                              background: done ? 'var(--forest-100)' : 'var(--bg-ivory)',
                              color: done ? 'var(--forest-900)' : 'var(--text-500)'
                            }}
                          >
                            {done ? '' : ''}
                            {s}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ fontSize: '0.76rem', color: 'var(--text-500)', marginTop: 10 }}>
                      Shipping to: {o.address}
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-outline-ivory"
                        onClick={() => {
                          closeModal();
                          navigate('/orders');
                        }}
                      >
                        Full Tracking Page &rarr;
                      </button>
                      <button
                        type="button"
                        className="btn-outline-ivory"
                        onClick={() => {
                          closeModal();
                          openDrawer('cart');
                        }}
                      >
                        Back to Bag
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </Modal>
  );
}

import React from 'react';
import { useStore } from '../../state/StoreContext.jsx';
import { formatINR } from '../../utils/legacy.js';
import Modal from '../Modal.jsx';
import { asset } from '../../utils/legacy.js';

/* ==========================================================================
   CompareModal — side-by-side craft comparison
   --------------------------------------------------------------------------
   The floating bar collects up to four pieces; this table lines their
   attributes up in rows so differences read at a glance.
   ========================================================================== */

const ROWS = [
  ['Direct Artisan Price', (p) => formatINR(p.price)],
  ['Original Market Price', (p) => formatINR(p.originalPrice ?? p.mrp)],
  ['Store MRP', (p) => formatINR(p.mrp)],
  ['Guild', (p) => p.guildLabel],
  ['Master Artisan', (p) => p.artisan],
  ['Valley Cluster', (p) => p.district],
  ['Loom Hours', (p) => `${p.loomHours} hrs`],
  ['Lab Purity', (p) => p.purityMetric],
  ['GI Level', (p) => `Level ${p.giLevel}`],
  ['GI ID', (p) => p.giId],
  ['User Rating', (p) => `${p.rating.toFixed(1)} \u2605 (${p.reviewCount})`]
];

export default function CompareModal() {
  const { closeModal, compareItems, compareList, toggleCompare, addToCart } = useStore();

  return (
    <Modal
      id="compare-modal"
      width="980px"
      title="&#8646; Side-by-Side Craft Comparison"
      onClose={closeModal}
    >
      <div className="modal-body">
        <div style={{ overflowX: 'auto' }}>
          <table className="compare-table">
            <thead>
              <tr>
                <th style={{ minWidth: 140 }}>Attribute</th>
                {compareItems.map((p) => (
                  <th key={p.id} style={{ minWidth: 180 }}>
                    <img
                      src={asset(p.image)}
                      alt=""
                      style={{
                        width: '100%',
                        height: 110,
                        objectFit: 'cover',
                        borderRadius: 8,
                        marginBottom: 8
                      }}
                    />
                    <div style={{ fontSize: '0.86rem', fontWeight: 700 }}>{p.title}</div>
                    <button
                      type="button"
                      className="wl-remove"
                      style={{ marginTop: 6 }}
                      onClick={() => toggleCompare(p.id)}
                    >
                      Remove
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, fn]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {compareItems.map((p) => (
                    <td key={p.id}>{fn(p)}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row">Action</th>
                {compareItems.map((p) => (
                  <td key={p.id}>
                    <button
                      type="button"
                      className="btn-card-cart"
                      onClick={() => {
                        addToCart(p.id, 1);
                        closeModal();
                      }}
                    >
                      Add to Bag
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        {compareList.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-500)', padding: 30 }}>
            Nothing selected to compare yet.
          </p>
        )}
      </div>
    </Modal>
  );
}

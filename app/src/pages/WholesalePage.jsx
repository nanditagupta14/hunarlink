import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PortalScope from '../components/PortalScope.jsx';
import { useStore } from '../state/StoreContext';
import { formatINR, loadStorage, saveStorage } from '../utils/legacy';
import { appHref } from '../utils/href.js';
import { asset } from '../utils/legacy.js';

/* ==========================================================================
   WholesalePage
   --------------------------------------------------------------------------
   Generated from wholesale.html by tools/html2page.py, then finished by hand.
   Every one of the 14 handlers the static controller wired with onclick is now
   React state: the three-tab switcher, category pills, product search and
   selection, the live lot calculator, the buyer form, the local-seller form
   and the routing desk's admin status buttons.

   Storage contract, identical to wholesale.js:
     hunarlink_wholesale_seller_requests — buyer lots routed to an artisan
     hunarlink_wholesale_admin_requests  — local sellers routed to admin
     hunarlink_seller_inquiries          — mirrored so the artisan sees it too
   ========================================================================== */

const WS_KEYS = {
  SELLER_REQUESTS: 'hunarlink_wholesale_seller_requests',
  ADMIN_REQUESTS: 'hunarlink_wholesale_admin_requests',
  SELLER_INQUIRIES: 'hunarlink_seller_inquiries',
  BUYER_PROFILE: 'hunarlink_buyer_profile',
  ADDRESSES: 'hunarlink_addresses'
};

/* Same tier ladder as getTierDiscount() in wholesale.js. */
function tierDiscount(qty) {
  const q = Math.max(10, Number(qty) || 10);
  if (q >= 50) return 25;
  if (q >= 25) return 18;
  return 12;
}

const BLANK_BUYER = {
  name: '',
  company: '',
  phone: '',
  email: '',
  city: '',
  pincode: '',
  gstin: '',
  buyerType: 'Retail Boutique / Store',
  targetDate: '',
  notes: ''
};

const BLANK_SELLER = {
  sellerName: '',
  workshopName: '',
  sellerCategory: 'Local Independent Artisan',
  district: 'Srinagar',
  phone: '',
  email: '',
  address: '',
  guild: 'Pashmina & Kani Shawls',
  productOffered: '',
  supplyCapacity: '50',
  wholesaleRate: '',
  giStatus: 'Not Yet GI Certified — Request HunarLink Admin Assistance',
  notes: ''
};

export default function WholesalePage() {
  const [params] = useSearchParams();
  const { catalogue, toast } = useStore();

  const [tab, setTab] = useState(() => {
    const role = params.get('role') || params.get('mode');
    if (role === 'local-seller' || role === 'seller') return 'local-seller';
    if (role === 'tracker' || role === 'admin') return 'tracker';
    return 'buyer';
  });

  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(() => params.get('product') || '');
  const [buyer, setBuyer] = useState(BLANK_BUYER);
  const [qty, setQty] = useState('20');
  const [seller, setSeller] = useState(BLANK_SELLER);
  const [buyerReceipt, setBuyerReceipt] = useState(null);
  const [adminReceipt, setAdminReceipt] = useState(null);
  const [sellerRequests, setSellerRequests] = useState(() =>
    loadStorage(WS_KEYS.SELLER_REQUESTS, [])
  );
  const [adminRequests, setAdminRequests] = useState(() =>
    loadStorage(WS_KEYS.ADMIN_REQUESTS, [])
  );

  const setBuyerField = (key) => (value) => setBuyer((b) => ({ ...b, [key]: value }));
  const setSellerField = (key) => (value) => setSeller((s) => ({ ...s, [key]: value }));

  /* The static page prefilled the buyer form from the collector profile and
     the default delivery address; same rule here (skip the placeholder city
     and pincode the seed address carried). */
  useEffect(() => {
    const profile = loadStorage(WS_KEYS.BUYER_PROFILE, null);
    const addresses = loadStorage(WS_KEYS.ADDRESSES, []);
    setBuyer((b) => {
      const next = { ...b };
      if (profile && profile.isLoggedIn !== false) {
        if (!next.name && profile.fullName) next.name = profile.fullName;
        if (!next.email && profile.email) next.email = profile.email;
        if (!next.phone && profile.phone) next.phone = profile.phone;
      }
      if (Array.isArray(addresses) && addresses.length) {
        const addr = addresses[0];
        if (!next.city && addr.city && addr.city !== 'Sample City') next.city = addr.city;
        if (!next.pincode && addr.pincode && addr.pincode !== '000000') next.pincode = addr.pincode;
      }
      return next;
    });
  }, []);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalogue.filter((p) => {
      /* Kani and Sozni are techniques of the pashmina guild, so they are
         matched against p.technique while the four guilds match p.guild. */
      const TECHNIQUES = ['kani', 'sozni', 'handwoven'];
      if (TECHNIQUES.includes(category)) {
        if (p.guild !== 'pashmina' || p.technique !== category) return false;
      } else if (category !== 'all' && p.guild !== category) return false;
      if (!q) return true;
      const hay = `${p.title} ${p.artisan} ${p.district} ${p.giId} ${p.guildLabel || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [catalogue, category, query]);

  /* Selecting a product is the only thing that drives the artisan box, the
     calculator and the submit label — default to the first match. */
  const selected = useMemo(() => {
    const hit = filteredProducts.find((p) => p.id === selectedId);
    return hit || filteredProducts[0] || catalogue[0];
  }, [filteredProducts, selectedId, catalogue]);

  const unitRetail = Number(selected?.price) || 1000;
  const quantity = Math.max(10, parseInt(qty, 10) || 10);
  const discountPct = tierDiscount(quantity);
  const unitWholesale = Math.round(unitRetail * (1 - discountPct / 100));
  const totalLotValue = unitWholesale * quantity;
  const totalSavings = (unitRetail - unitWholesale) * quantity;
  const totalRequests = sellerRequests.length + adminRequests.length;

  useEffect(() => {
    saveStorage(WS_KEYS.SELLER_REQUESTS, sellerRequests);
  }, [sellerRequests]);

  useEffect(() => {
    saveStorage(WS_KEYS.ADMIN_REQUESTS, adminRequests);
  }, [adminRequests]);

  function submitBuyer(e) {
    e.preventDefault();
    if (!selected) return;

    const now = new Date();
    const reqId = 'HL-WHL-2026-' + Math.floor(1000 + Math.random() * 9000);

    const record = {
      id: reqId,
      routedTo: 'seller',
      createdAt: now.toISOString(),
      date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      status: 'Transferred to HunarLink Artisan',
      sellerReply: '',
      productId: selected.id,
      productTitle: selected.title,
      productImage: selected.image,
      guildLabel: selected.guildLabel || selected.guild,
      giId: selected.giId,
      sellerName: selected.artisan,
      sellerDistrict: selected.district,
      buyer: {
        name: buyer.name.trim(),
        company: buyer.company.trim() || 'Individual Bulk Buyer',
        phone: buyer.phone.trim(),
        email: buyer.email.trim(),
        city: buyer.city.trim(),
        pincode: buyer.pincode.trim(),
        gstin: buyer.gstin.trim() || 'N/A',
        buyerType: buyer.buyerType
      },
      qty: quantity,
      discountPct,
      unitRetail,
      unitWholesale,
      totalLotValue,
      targetDate: buyer.targetDate || 'Flexible',
      notes: buyer.notes.trim() || 'Standard GI-certified bulk lot packaging.'
    };

    setSellerRequests((list) => [record, ...list]);

    /* Mirror into the artisan's product responses, exactly as the static build
       did, so a bulk lot also surfaces inside the seller portal. */
    const inquiries = loadStorage(WS_KEYS.SELLER_INQUIRIES, []);
    saveStorage(WS_KEYS.SELLER_INQUIRIES, [
      {
        id: 'inq-whl-' + Date.now(),
        type: `Wholesale Bulk Request (${quantity} Units → ${selected.artisan})`,
        author: `${record.buyer.name} (${record.buyer.company}, ${record.buyer.city})`,
        productTitle: selected.title,
        date: `${record.date}, ${record.time}`,
        rating: 5,
        comment: `Bulk Order Ref ${reqId}: ${quantity} units @ ${formatINR(unitWholesale)}/unit (Total ${formatINR(totalLotValue)}). Contact: ${record.buyer.phone} | ${record.buyer.email}. Notes: ${record.notes}`,
        reply: ''
      },
      ...inquiries
    ]);

    setBuyerReceipt({
      id: reqId,
      artisan: selected.artisan,
      district: selected.district,
      productTitle: selected.title,
      giId: selected.giId,
      name: record.buyer.name,
      company: record.buyer.company,
      phone: record.buyer.phone,
      email: record.buyer.email,
      qty: quantity,
      discountPct,
      totalLotValue
    });
    toast(`Bulk request ${reqId} transferred to ${selected.artisan}!`, 'success');
  }

  function submitLocalSeller(e) {
    e.preventDefault();
    const now = new Date();
    const refId = 'HL-ADM-WHL-2026-' + Math.floor(1000 + Math.random() * 9000);

    const record = {
      id: refId,
      routedTo: 'admin',
      recipient: 'HunarLink Admin Trade Desk',
      createdAt: now.toISOString(),
      date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      status: 'Transferred to HunarLink Admin',
      adminNote: '',
      sellerName: seller.sellerName.trim(),
      workshopName: seller.workshopName.trim(),
      sellerCategory: seller.sellerCategory,
      district: seller.district,
      phone: seller.phone.trim(),
      email: seller.email.trim(),
      address: seller.address.trim(),
      guild: seller.guild,
      productOffered: seller.productOffered.trim(),
      supplyCapacity: parseInt(seller.supplyCapacity, 10) || 10,
      wholesaleRate: parseInt(seller.wholesaleRate, 10) || 500,
      giStatus: seller.giStatus,
      notes: seller.notes.trim() || 'Samples available on Admin request.'
    };

    setAdminRequests((list) => [record, ...list]);
    setAdminReceipt(record);
    setSeller(BLANK_SELLER);
    toast(`Local seller submission ${refId} transferred to HunarLink Admin!`, 'success');
  }

  function updateAdminStatus(reqId, newStatus) {
    setAdminRequests((list) => {
      const next = list.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r));
      saveStorage(WS_KEYS.ADMIN_REQUESTS, next);
      return next;
    });
    toast(`HunarLink Admin updated ${reqId} → ${newStatus}`, 'success');
  }

  return (
    <>
      <PortalScope family="wholesale" />
{/* Header */}
  <header className="wp-header">
    <div className="wp-header-inner">
      <a href={appHref('/')} className="wp-brand">
        <span className="wp-emblem">H</span>
        <div>
          <div className="wp-brand-name">HunarLink Wholesale</div>
          <div className="wp-brand-sub">Direct Artisan Bulk Desk &amp; Local Seller Trade Hub</div>
        </div>
      </a>

      <nav className="wp-nav-links" aria-label="Wholesale Portal Navigation">
        <a href={appHref('/')} className="wp-nav-btn">
          ← Storefront
        </a>
        <a href={appHref('/seller')} className="wp-nav-btn">Seller Portal
        </a>
        <a href={appHref('/profile')} className="wp-nav-btn">My Profile
        </a>
        <button type="button" className="wp-nav-btn primary">Live Routing Desk (<span id="nav-total-requests">{totalRequests}</span>)
        </button>
      </nav>
    </div>
  </header>

  {/* Hero Banner */}
  <section className="wp-hero">
    <div className="wp-hero-inner">
      <div>
        <span className="wp-pill">Wholesale Trade Portal • Buyers &amp; Sellers</span>
        <h1>Bulk Sourcing &amp; Wholesale Supply Across Jammu &amp; Kashmir</h1>
        <p className="wp-hero-desc">
          Whether you are a <strong>Bulk Buyer</strong> ordering GI-certified Kashmiri crafts directly from a specific
          HunarLink artisan, or a <strong>Local Seller</strong> looking to supply crafts in wholesale volume through
          HunarLink Admin — every request is smartly routed with full contact &amp; lot details.
        </p>
      </div>

      <div className="wp-routing-diagram">
        <div className="wp-route-step">
          <span className="wp-route-icon">️</span>
          <div>
            <div className="wp-route-title">Bulk Buyer → Specified HunarLink Seller (Artisan)</div>
            <div className="wp-route-sub">Choose any particular product &amp; bulk quantity (MOQ 10+). Your full buyer
              details are transferred directly to that product's verified HunarLink artisan in the Seller Portal.</div>
          </div>
        </div>
        <div className="wp-route-step admin">
          <span className="wp-route-icon">️</span>
          <div>
            <div className="wp-route-title">Local Seller → HunarLink Admin Trade Desk</div>
            <div className="wp-route-sub">Local artisans, workshops &amp; regional sellers submitting wholesale supply lots
              have their complete details transferred directly to HunarLink Admin for verification &amp; buyer matching.
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  {/* Main Workspace */}
  <main className="wp-main">
    {/* 3-Mode Tab Bar */}
    <div className="wp-tabs-bar" role="tablist">
      <button type="button" className={`wp-tab-btn${tab === 'buyer' ? ' active' : ''}`} id="tab-btn-buyer"
        onClick={() => setTab('buyer')}>
        <div>
          <span className="wp-tab-title">Bulk Buyer — Request Wholesale</span>
          <span className="wp-tab-sub">Transfers buyer info directly to the specified HunarLink Artisan</span>
        </div>
        <span className="wp-tab-badge">MOQ 10+</span>
      </button>

      <button type="button" className={`wp-tab-btn${tab === 'local-seller' ? ' active' : ''}`} id="tab-btn-local-seller"
        onClick={() => setTab('local-seller')}>
        <div>
          <span className="wp-tab-title">Local Seller — Wholesale Supply</span>
          <span className="wp-tab-sub">Transfers local seller info directly to HunarLink Admin</span>
        </div>
        <span className="wp-tab-badge">Admin</span>
      </button>

      <button type="button" className={`wp-tab-btn${tab === 'tracker' ? ' active' : ''}`} id="tab-btn-tracker"
        onClick={() => setTab('tracker')}>
        <div>
          <span className="wp-tab-title">Live Transfer &amp; Routing Desk</span>
          <span className="wp-tab-sub">View Seller-routed buyer lots &amp; Admin-routed local sellers</span>
        </div>
        <span className="wp-tab-badge" id="tab-tracker-count">{totalRequests}</span>
      </button>
    </div>

    {/* ====================================================================
         TAB 1: BULK BUYER -> SPECIFIED HUNARLINK SELLER (ARTISAN)
         ==================================================================== */}
    <section className={`wp-panel${tab === 'buyer' ? ' active' : ''}`} id="panel-buyer">
      <div className="wp-grid-2">
        {/* Left Column: Select Particular Product + Auto-Routed Specified Artisan */}
        <div className="wp-card">
          <div className="wp-card-head">
            <div>
              <h2>1. Select Particular Product for Bulk Order</h2>
              <p className="wp-card-sub">Your buyer details will automatically route to the specified HunarLink artisan who
                crafts this product.</p>
            </div>
          </div>

          <div className="wp-filter-pills" id="wp-cat-pills">
            <button type="button"
              className={`wp-cat-pill${category === 'all' ? ' active' : ''}`}
              data-cat="all" onClick={() => setCategory('all')}>All
              Crafts</button>
            <button type="button"
              className={`wp-cat-pill${category === 'pashmina' ? ' active' : ''}`}
              data-cat="pashmina" onClick={() => setCategory('pashmina')}>Pashmina</button>
            <button type="button"
              className={`wp-cat-pill${category === 'walnut' ? ' active' : ''}`}
              data-cat="walnut" onClick={() => setCategory('walnut')}>Walnut Wood</button>
            <button type="button"
              className={`wp-cat-pill${category === 'papier-mache' ? ' active' : ''}`}
              data-cat="papier-mache" onClick={() => setCategory('papier-mache')}>Papier-Mâché</button>
            <button type="button"
              className={`wp-cat-pill${category === 'silk-rugs' ? ' active' : ''}`}
              data-cat="silk-rugs" onClick={() => setCategory('silk-rugs')}>Silk Rugs</button>
            {/* Kani and Sozni are techniques inside the pashmina guild, not
                product categories of their own. This pill used to filter on a
                guild id that no longer exists and returned an empty list. */}
            <button type="button"
              className={`wp-cat-pill${category === 'kani' ? ' active' : ''}`}
              data-cat="kani" onClick={() => setCategory('kani')}>Kani Weave</button>
            <button type="button"
              className={`wp-cat-pill${category === 'sozni' ? ' active' : ''}`}
              data-cat="sozni" onClick={() => setCategory('sozni')}>Sozni Embroidery</button>
          </div>

          <div className="wp-search-row">
            <input type="search" id="wp-product-search" aria-label="Search wholesale products" className="wp-input"
              placeholder="Search by product name, artisan, district, or GI Tag..."
              value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          <div className="wp-product-list" id="wp-product-list">
            {filteredProducts.length === 0 ? (
              <div className="wp-empty">No crafts matched &quot;{query}&quot;. Try another keyword or category.</div>
            ) : (
              filteredProducts.slice(0, 40).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className={`wp-prod-option${p.id === selected.id ? ' selected' : ''}`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <img src={asset(p.image)} alt={p.title} className="wp-prod-thumb" />
                  <div className="wp-prod-meta">
                    <div className="wp-prod-title">{p.title}</div>
                    <div className="wp-prod-artisan">Artisan: {p.artisan} ({p.district})</div>
                    <div className="wp-prod-sub">
                      {p.guildLabel || p.guild} • {p.giId} • Retail {formatINR(p.price)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Selected Product & Specified HunarLink Artisan Box */}
          <div className="wp-seller-target-box" id="wp-seller-target-box">
            {selected && (
              <>
                <div className="wp-target-badge">Direct Routing → Specified HunarLink Seller (Artisan)</div>
                <div className="wp-target-header">
                  <img src={asset(selected.image)} alt={selected.title} className="wp-target-img" />
                  <div>
                    <div className="wp-target-name">{selected.title}</div>
                    <div className="wp-target-artisan-row">
                      Specified Seller: <strong>{selected.artisan}</strong> • {selected.district}, J&amp;K
                    </div>
                    <div className="wp-target-artisan-row">
                      GI Tag: <code>{selected.giId}</code> • Guild: {selected.guildLabel || selected.guild}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Live Bulk Pricing Calculator */}
          <div className="wp-calc-box" id="wp-calc-box">
            <div className="wp-calc-title">Live Wholesale Lot Estimate ({qty} Units • {discountPct}% Guild Tier Discount)
            </div>
            <div className="wp-calc-grid">
              <div className="wp-calc-cell">
                <div className="wp-calc-label">Wholesale Rate / Unit</div>
                <div className="wp-calc-val accent">
                  {formatINR(unitWholesale)}{' '}
                  <span style={{fontSize: '0.72rem', textDecoration: 'line-through', opacity: 0.7}}>
                    {formatINR(unitRetail)}
                  </span>
                </div>
              </div>
              <div className="wp-calc-cell">
                <div className="wp-calc-label">Total Estimated Lot Value</div>
                <div className="wp-calc-val">{formatINR(totalLotValue)}</div>
              </div>
              <div className="wp-calc-cell">
                <div className="wp-calc-label">Total Bulk Savings</div>
                <div className="wp-calc-val" style={{color: '#86EFAC'}}>
                  −{formatINR(totalSavings)} ({discountPct}% Off)
                </div>
              </div>
              <div className="wp-calc-cell">
                <div className="wp-calc-label">Direct Artisan Payout</div>
                <div className="wp-calc-val">100% Zero-Cut</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Bulk Buyer Information Form */}
        <div className="wp-card">
          <div className="wp-card-head">
            <div>
              <h2>2. Buyer Details (Transferred to Specified Artisan)</h2>
              <p className="wp-card-sub" id="buyer-routing-subtitle">
                {selected ? (
                  <>
                    Your complete buyer information will be transferred directly to{' '}
                    <strong>{selected.artisan}</strong> ({selected.district}) regarding{' '}
                    <strong>{selected.title}</strong>.
                  </>
                ) : (
                  'Complete your details below to transfer your wholesale lot inquiry directly to the selected HunarLink seller.'
                )}
              </p>
            </div>
          </div>

          <form id="buyer-wholesale-form" onSubmit={submitBuyer}>
            <div className="wp-form-grid">
              <div className="wp-field">
                <label className="wp-label" htmlFor="bw-name">Buyer Full Name *</label>
                <input type="text" id="bw-name" className="wp-input" value={buyer.name}
                onChange={(e) => setBuyerField('name')(e.target.value)} required placeholder="e.g. Priya Sharma" />
              </div>

              <div className="wp-field">
                <label className="wp-label" htmlFor="bw-company">Company / Boutique / Hotel Name</label>
                <input type="text" id="bw-company" className="wp-input" value={buyer.company}
                onChange={(e) => setBuyerField('company')(e.target.value)} placeholder="e.g. Heritage Living Studio / Individual" />
              </div>

              <div className="wp-field">
                <label className="wp-label" htmlFor="bw-phone">Phone / WhatsApp Number *</label>
                <input type="tel" id="bw-phone" className="wp-input" value={buyer.phone}
                onChange={(e) => setBuyerField('phone')(e.target.value)} required placeholder="+91 98XXXXXXXX" />
              </div>

              <div className="wp-field">
                <label className="wp-label" htmlFor="bw-email">Email Address *</label>
                <input type="email" id="bw-email" className="wp-input" value={buyer.email}
                onChange={(e) => setBuyerField('email')(e.target.value)} required placeholder="buyer@company.com" />
              </div>

              <div className="wp-field">
                <label className="wp-label" htmlFor="bw-city">Delivery City &amp; State *</label>
                <input type="text" id="bw-city" className="wp-input" value={buyer.city}
                onChange={(e) => setBuyerField('city')(e.target.value)} required placeholder="e.g. New Delhi, Delhi" />
              </div>

              <div className="wp-field">
                <label className="wp-label" htmlFor="bw-pincode">Delivery Pincode *</label>
                <input type="text" id="bw-pincode" className="wp-input" value={buyer.pincode}
                onChange={(e) => setBuyerField('pincode')(e.target.value)} required placeholder="e.g. 110024" maxLength="10" />
              </div>

              <div className="wp-field">
                <label className="wp-label" htmlFor="bw-qty">Bulk Quantity (MOQ: 10+ Units) *</label>
                <input type="number" id="bw-qty" className="wp-input" min="10" max="500" required
                value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>

              <div className="wp-field">
                <label className="wp-label" htmlFor="bw-target-date">Target Delivery Date</label>
                <input type="date" id="bw-target-date" className="wp-input" value={buyer.targetDate}
                onChange={(e) => setBuyerField('targetDate')(e.target.value)} />
              </div>

              <div className="wp-field">
                <label className="wp-label" htmlFor="bw-gstin">GSTIN / Trade License (Optional)</label>
                <input type="text" id="bw-gstin" className="wp-input" value={buyer.gstin}
                onChange={(e) => setBuyerField('gstin')(e.target.value)} placeholder="e.g. 07AABCU9603R1ZM" />
              </div>

              <div className="wp-field">
                <label className="wp-label" htmlFor="bw-buyer-type">Buyer Type *</label>
                <select id="bw-buyer-type" className="wp-select" required
                  value={buyer.buyerType} onChange={(e) => setBuyerField('buyerType')(e.target.value)}>
                  <option value="Retail Boutique / Store">Retail Boutique / Store</option>
                  <option value="Luxury Hospitality / Hotel">Luxury Hospitality / Hotel</option>
                  <option value="Interior Architect / Designer">Interior Architect / Designer</option>
                  <option value="Corporate / Wedding Bulk Gifting">Corporate / Wedding Bulk Gifting</option>
                  <option value="Export / International Distributor">Export / International Distributor</option>
                </select>
              </div>

              <div className="wp-field full">
                <label className="wp-label" htmlFor="bw-notes">Custom Dimensions, Colors, Packaging or GI Export Notes</label>
                <textarea id="bw-notes" className="wp-textarea" value={buyer.notes}
                  onChange={(e) => setBuyerField('notes')(e.target.value)}
                  placeholder="Specify preferred motifs, gift-box branding, export GI certificates, or custom measurements for the artisan..."></textarea>
              </div>
            </div>

            <button type="submit" className="wp-submit-btn" id="bw-submit-btn">
              {selected
                ? `Transfer Bulk Request to ${selected.artisan} →`
                : 'Transfer Bulk Request to Specified HunarLink Seller →'}
            </button>
          </form>

          {/* Instant Transfer Receipt */}
          <div className={`wp-receipt${buyerReceipt ? ' show' : ''}`} id="buyer-receipt">
            {buyerReceipt && (
              <>
                <div className="wp-receipt-title">Buyer Details Transferred to Specified HunarLink Seller!</div>
                <p style={{fontSize: '0.82rem', color: '#14532D'}}>
                  Reference <strong>{buyerReceipt.id}</strong> has been routed directly to{' '}
                  <strong>{buyerReceipt.artisan}</strong> ({buyerReceipt.district}) for{' '}
                  <strong>{buyerReceipt.productTitle}</strong>.
                </p>
                <div className="wp-receipt-grid">
                  <div><strong>Target Artisan:</strong> {buyerReceipt.artisan}</div>
                  <div><strong>Product &amp; GI:</strong> {buyerReceipt.productTitle} ({buyerReceipt.giId})</div>
                  <div><strong>Buyer:</strong> {buyerReceipt.name} ({buyerReceipt.company})</div>
                  <div><strong>Buyer Contact:</strong> {buyerReceipt.phone} • {buyerReceipt.email}</div>
                  <div><strong>Bulk Quantity:</strong> {buyerReceipt.qty} Units ({buyerReceipt.discountPct}% Off)</div>
                  <div><strong>Est. Lot Value:</strong> {formatINR(buyerReceipt.totalLotValue)}</div>
                </div>
                <div className="wp-receipt-actions">
                  <a href={appHref('/seller?tab=wholesale')} className="wp-btn-sm">View in Seller Portal →</a>
                  <button type="button" className="wp-btn-sm outline" onClick={() => setTab('tracker')}>Open Live Routing Desk
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>

    {/* ====================================================================
         TAB 2: LOCAL SELLER -> TRANSFERRED TO HUNARLINK ADMIN
         ==================================================================== */}
    <section className={`wp-panel${tab === 'local-seller' ? ' active' : ''}`} id="panel-local-seller">
      <div className="wp-card" style={{maxWidth: '920px', margin: '0 auto'}}>
        <div className="wp-admin-notice">
          <span className="wp-admin-notice-icon">️</span>
          <div>
            <h3>Local Seller Wholesale Submission → Transferred Directly to HunarLink Admin</h3>
            <p>
              Are you a <strong>local Kashmiri artisan, regional workshop, village cooperative, or local handicraft
                seller</strong> wanting to sell your products in wholesale bulk on HunarLink? Submit your complete
              details below — your information will be transferred directly to the <strong>HunarLink Admin Trade
                Desk</strong> for workshop verification, GI tagging support, and bulk buyer allocation.
            </p>
          </div>
        </div>

        <form id="local-seller-form" onSubmit={submitLocalSeller}>
          <div className="wp-form-grid">
            <div className="wp-field">
              <label className="wp-label" htmlFor="ls-name">Local Seller / Owner Full Name *</label>
              <input type="text" id="ls-name" className="wp-input" value={seller.sellerName}
                onChange={(e) => setSellerField('sellerName')(e.target.value)} required placeholder="e.g. Bashir Ahmad Dar" />
            </div>

            <div className="wp-field">
              <label className="wp-label" htmlFor="ls-workshop">Workshop / Shop / Cooperative Name *</label>
              <input type="text" id="ls-workshop" className="wp-input" value={seller.workshopName}
                onChange={(e) => setSellerField('workshopName')(e.target.value)} required
                placeholder="e.g. Dar Heritage Looms &amp; Crafts" />
            </div>

            <div className="wp-field">
              <label className="wp-label" htmlFor="ls-type">Local Seller Category *</label>
              <select id="ls-type" className="wp-select" value={seller.sellerCategory}
                onChange={(e) => setSellerField('sellerCategory')(e.target.value)} required>
                <option value="Local Independent Artisan">Local Independent Artisan</option>
                <option value="Local Handicraft Shop / Trader">Local Handicraft Shop / Trader</option>
                <option value="Village Weaving / Carving Cooperative">Village Weaving / Carving Cooperative</option>
                <option value="Non-GI Local Workshop (Need Onboarding)">Non-GI Local Workshop (Need Onboarding)</option>
              </select>
            </div>

            <div className="wp-field">
              <label className="wp-label" htmlFor="ls-district">J&amp;K District / Craft Cluster *</label>
              <select id="ls-district" className="wp-select" value={seller.district}
                onChange={(e) => setSellerField('district')(e.target.value)} required>
                <option value="Srinagar">Srinagar (Downtown / Zadibal / Kanihama)</option>
                <option value="Budgam">Budgam</option>
                <option value="Anantnag">Anantnag</option>
                <option value="Baramulla">Baramulla</option>
                <option value="Pulwama">Pulwama</option>
                <option value="Shopian">Shopian</option>
                <option value="Ganderbal">Ganderbal</option>
                <option value="Bandipora">Bandipora</option>
                <option value="Kupwara">Kupwara</option>
                <option value="Leh-Ladakh">Leh-Ladakh</option>
                <option value="Jammu Region">Jammu Region</option>
              </select>
            </div>

            <div className="wp-field">
              <label className="wp-label" htmlFor="ls-phone">Phone / WhatsApp Number *</label>
              <input type="tel" id="ls-phone" className="wp-input" value={seller.phone}
                onChange={(e) => setSellerField('phone')(e.target.value)} required placeholder="+91 97XXXXXXXX" />
            </div>

            <div className="wp-field">
              <label className="wp-label" htmlFor="ls-email">Email Address *</label>
              <input type="email" id="ls-email" className="wp-input" value={seller.email}
                onChange={(e) => setSellerField('email')(e.target.value)} required placeholder="workshop@domain.in" />
            </div>

            <div className="wp-field full">
              <label className="wp-label" htmlFor="ls-address">Full Local Workshop / Shop Address *</label>
              <input type="text" id="ls-address" className="wp-input" value={seller.address}
                onChange={(e) => setSellerField('address')(e.target.value)} required
                placeholder="Street / Mohalla, Landmark, Tehsil, District &amp; Pincode" />
            </div>

            <div className="wp-field">
              <label className="wp-label" htmlFor="ls-guild">Craft Category *</label>
              <select id="ls-guild" className="wp-select" value={seller.guild}
                onChange={(e) => setSellerField('guild')(e.target.value)} required>
                <option value="Pashmina & Kani Shawls">Pashmina &amp; Kani Shawls</option>
                <option value="Walnut Woodcarving">Walnut Woodcarving</option>
                <option value="Papier-Mâché Art">Papier-Mâché Art</option>
                <option value="Silk-on-Silk Rugs">Silk-on-Silk Rugs</option>
                <option value="Kani Jamawar & Sozni">Kani Jamawar &amp; Sozni</option>
                <option value="Copperware / Namda / Crewel / Other">Copperware / Namda / Crewel / Other</option>
              </select>
            </div>

            <div className="wp-field">
              <label className="wp-label" htmlFor="ls-product">Particular Product / Lot Offered *</label>
              <input type="text" id="ls-product" className="wp-input" value={seller.productOffered}
                onChange={(e) => setSellerField('productOffered')(e.target.value)} required
                placeholder="e.g. Hand-Painted Sakhta Papier-Mâché Urns" />
            </div>

            <div className="wp-field">
              <label className="wp-label" htmlFor="ls-capacity">Available Bulk Supply Quantity (Units) *</label>
              <input type="number" id="ls-capacity" className="wp-input" value={seller.supplyCapacity}
                onChange={(e) => setSellerField('supplyCapacity')(e.target.value)} min="10" max="5000" value="50" required />
            </div>

            <div className="wp-field">
              <label className="wp-label" htmlFor="ls-rate">Expected Wholesale Rate per Unit (₹) *</label>
              <input type="number" id="ls-rate" className="wp-input" value={seller.wholesaleRate}
                onChange={(e) => setSellerField('wholesaleRate')(e.target.value)} min="100" required placeholder="e.g. 650" />
            </div>

            <div className="wp-field full">
              <label className="wp-label" htmlFor="ls-gi-status">GI Certification / Craft Registration Status *</label>
              <select id="ls-gi-status" className="wp-select" value={seller.giStatus}
                onChange={(e) => setSellerField('giStatus')(e.target.value)} required>
                <option value="Not Yet GI Certified — Request HunarLink Admin Assistance">Not Yet GI Certified — Request
                  HunarLink Admin Assistance</option>
                <option value="J&K Handicrafts Artisan Card Holder (GI Pending)">J&amp;K Handicrafts Artisan Card Holder
                  (GI Pending)</option>
                <option value="Already GI Certified (Ready for Verification)">Already GI Certified (Ready for
                  Verification)</option>
              </select>
            </div>

            <div className="wp-field full">
              <label className="wp-label" htmlFor="ls-notes">Workshop Details, Artisan Count &amp; Sample Availability</label>
              <textarea id="ls-notes" className="wp-textarea" value={seller.notes}
                onChange={(e) => setSellerField('notes')(e.target.value)}
                placeholder="Share number of artisans in your workshop, lead time for bulk production, and whether physical samples are ready for HunarLink Admin inspection..."></textarea>
            </div>
          </div>

          <button type="submit" className="wp-submit-btn">Transfer Local Seller Details to HunarLink Admin →
          </button>
        </form>

        {/* Instant Admin Transfer Receipt */}
        <div className={`wp-receipt${adminReceipt ? ' show' : ''}`} id="admin-receipt">
            {adminReceipt && (
              <>
                <div className="wp-receipt-title">Local Seller Information Transferred to HunarLink Admin!</div>
                <p style={{fontSize: '0.82rem', color: '#14532D'}}>
                  Admin Reference <strong>{adminReceipt.id}</strong> has been delivered to the{' '}
                  <strong>HunarLink Admin Trade Desk</strong> for verification &amp; wholesale buyer matching.
                </p>
                <div className="wp-receipt-grid">
                  <div><strong>Recipient:</strong> HunarLink Admin Trade Desk</div>
                  <div><strong>Local Seller:</strong> {adminReceipt.sellerName} ({adminReceipt.workshopName})</div>
                  <div><strong>Category &amp; District:</strong> {adminReceipt.sellerCategory} • {adminReceipt.district}</div>
                  <div><strong>Contact:</strong> {adminReceipt.phone} • {adminReceipt.email}</div>
                  <div><strong>Craft Offered:</strong> {adminReceipt.productOffered} ({adminReceipt.supplyCapacity} units)</div>
                  <div><strong>Wholesale Rate:</strong> {formatINR(adminReceipt.wholesaleRate)} / unit</div>
                </div>
                <div className="wp-receipt-actions">
                  <button type="button" className="wp-btn-sm" onClick={() => setTab('tracker')}>View in HunarLink Admin Desk →
                  </button>
                </div>
              </>
            )}
          </div>
      </div>
    </section>

    {/* ====================================================================
         TAB 3: LIVE ROUTING & TRANSFER DESK (SELLER QUEUE + ADMIN INBOX)
         ==================================================================== */}
    <section className={`wp-panel${tab === 'tracker' ? ' active' : ''}`} id="panel-tracker">
      <div className="wp-tracker-grid">
        {/* Specified HunarLink Seller (Artisan) Transfers */}
        <div className="wp-card">
          <div className="wp-card-head">
            <div>
              <h3>Transferred to Specified HunarLink Sellers (Artisans)</h3>
              <p className="wp-card-sub">Bulk buyer requests automatically routed to each product's specific artisan (also
                synced live inside Seller Portal).</p>
            </div>
            <span className="wp-tab-badge" id="seller-queue-count">{sellerRequests.length}</span>
          </div>
          <div className="wp-queue-list" id="seller-queue-list">
            {sellerRequests.length === 0 ? (
              <div className="wp-empty">
                No bulk buyer requests yet. Submit one in the &quot;Bulk Buyer&quot; tab to transfer buyer info
                directly to a specified HunarLink artisan.
              </div>
            ) : (
              sellerRequests.map((r) => (
                <div className="wp-req-item seller-item" key={r.id}>
                  <div className="wp-req-top">
                    <div>
                      <div className="wp-req-id">{r.id} • {r.date} {r.time || ''}</div>
                      <div className="wp-req-title">{r.productTitle} ({r.qty} Units)</div>
                    </div>
                    <span className={`wp-status-pill${/accept|quoted|ready/i.test(r.status) ? ' approved' : ''}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="wp-req-details">
                    <div><strong>Buyer:</strong> {r.buyer?.name}</div>
                    <div><strong>Company:</strong> {r.buyer?.company}</div>
                    <div><strong>Phone:</strong> {r.buyer?.phone}</div>
                    <div><strong>Email:</strong> {r.buyer?.email}</div>
                    <div><strong>Location:</strong> {r.buyer?.city} - {r.buyer?.pincode}</div>
                    <div><strong>Lot Total:</strong> {formatINR(r.totalLotValue)} ({r.discountPct}% Off)</div>
                  </div>
                  <div className="wp-req-target-strip">Transferred to Specified HunarLink Seller: {r.sellerName} ({r.sellerDistrict}) • GI: {r.giId}
                  </div>
                  {r.sellerReply && (
                    <div style={{marginTop: '8px', fontSize: '0.78rem', color: '#166534', background: '#ECFDF5', padding: '7px 10px', borderRadius: '6px'}}>
                      <strong>Artisan Response:</strong> {r.sellerReply}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* HunarLink Admin Inbox (Local Sellers) */}
        <div className="wp-card">
          <div className="wp-card-head">
            <div>
              <h3>HunarLink Admin Trade Desk (Local Sellers)</h3>
              <p className="wp-card-sub">Wholesale supply submissions from local sellers routed directly to HunarLink Admin
                for verification &amp; onboarding.</p>
            </div>
            <span className="wp-tab-badge" id="admin-queue-count">{adminRequests.length}</span>
          </div>
          <div className="wp-queue-list" id="admin-queue-list">
            {adminRequests.length === 0 ? (
              <div className="wp-empty">
                No local seller wholesale submissions yet. Submit one in the &quot;Local Seller&quot; tab to transfer
                info directly to HunarLink Admin.
              </div>
            ) : (
              adminRequests.map((a) => (
                <div className="wp-req-item admin-item" key={a.id}>
                  <div className="wp-req-top">
                    <div>
                      <div className="wp-req-id">{a.id} • {a.date} {a.time || ''}</div>
                      <div className="wp-req-title">{a.productOffered} ({a.supplyCapacity} Units)</div>
                    </div>
                    <span className={`wp-status-pill${/approved/i.test(a.status) ? ' approved' : ' admin'}`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="wp-req-details">
                    <div><strong>Local Seller:</strong> {a.sellerName}</div>
                    <div><strong>Workshop:</strong> {a.workshopName}</div>
                    <div><strong>Phone:</strong> {a.phone}</div>
                    <div><strong>Email:</strong> {a.email}</div>
                    <div><strong>District:</strong> {a.district} ({a.sellerCategory})</div>
                    <div><strong>Wholesale Rate:</strong> {formatINR(a.wholesaleRate)} / unit</div>
                  </div>
                  <div style={{fontSize: '0.76rem', color: 'var(--text-500)', marginBottom: '6px'}}>
                    <strong>GI Status:</strong> {a.giStatus} • <strong>Address:</strong> {a.address}
                  </div>
                  <div className="wp-req-target-strip admin">Routed to: HunarLink Admin Trade Desk</div>
                  <div className="wp-admin-actions">
                    <button type="button" className="wp-btn-sm"
                      onClick={() => updateAdminStatus(a.id, 'Approved by Admin — Onboarding')}>Approve &amp; Onboard
                    </button>
                    <button type="button" className="wp-btn-sm outline"
                      onClick={() => updateAdminStatus(a.id, 'Cluster Inspection Scheduled')}>Schedule Visit
                    </button>
                    <button type="button" className="wp-btn-sm outline"
                      onClick={() => updateAdminStatus(a.id, 'Sample Requested by Admin')}>Request Sample
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  </main>

  <div className="wp-toast" id="wp-toast" role="status" aria-live="polite"></div>
    </>
  );
}

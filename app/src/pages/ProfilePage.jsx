import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/portal.css';
import { useStore } from '../state/StoreContext';
import PortalScope from '../components/PortalScope.jsx';
import { appHref } from '../utils/href.js';
import { IconHome, IconUser, IconPackage, IconLogout, IconLogin } from '../components/LineIcons.jsx';

/* Same palette the static profile page offered in its swatch row. */
const AVATAR_SWATCHES = ['#E05A17', '#9A3412', '#0D2B1D', '#B88528', '#6B2D5C', '#1E4E79'];

/* Shape the collector profile lives in on disk — mirrors
   DEFAULT_USER_PROFILE in user-portal.js, including isLoggedIn, so the
   storefront header and this page agree about who is signed in. */
const DEFAULT_PROFILE = {
  firstName: 'Priya',
  lastName: 'Sharma',
  fullName: 'Priya Sharma',
  email: 'priya.sharma@valleycollector.in',
  phone: '+91 98112 77420',
  gender: 'Female',
  dob: '1996-05-14',
  bio: 'Buyer of GI-certified Kashmiri Pashmina, Kani shawls, and hand-carved walnut woodcraft.',
  preferredUpi: 'priya.sharma@okaxis',
  preferredPayment: 'UPI Verified Escrow',
  avatarColor: '#E05A17',
  avatarPhoto: '',
  badge: 'PS',
  role: 'buyer',
  isLoggedIn: false,
  memberSince: 'Nov 2026'
};

const FALLBACK_ADDRESS = {
  id: 'addr-1',
  name: 'Priya Sharma',
  phone: '+91 98112 77420',
  pincode: '110024',
  locality: 'B-42 Defence Colony, Ring Road',
  city: 'New Delhi',
  type: 'Home'
};

/* Both readers take their value from the store, which already loaded these
   keys at boot. Nothing here touches localStorage. */
function readProfile(buyerProfile) {
  return buyerProfile ? { ...DEFAULT_PROFILE, ...buyerProfile } : { ...DEFAULT_PROFILE };
}

function readAddresses(addresses) {
  return Array.isArray(addresses) && addresses.length ? addresses : [FALLBACK_ADDRESS];
}


/* ==========================================================================
   ProfilePage
   --------------------------------------------------------------------------
   Generated from profile.html by tools/html2page.py, then
   finished by hand.

   The markup is the original, so the design is exact. All 18 handlers the
   static page wired with addEventListener/onclick are now React state: the
   four-tab switcher, the three inline edit/save blocks, the avatar colour
   swatches + photo upload, the address manager and the wishlist.
   ========================================================================== */

export default function ProfilePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    wishlist,
    wishlistItems,
    removeFromWishlist,
    setUser,
    user,
    buyerProfile,
    addresses: storeAddresses,
    setBuyerProfile,
    setAddresses: saveAddresses,
    toast
  } = useStore();

  const [profile, setProfile] = useState(() => readProfile(buyerProfile));
  const [addresses, setAddresses] = useState(() => readAddresses(storeAddresses));
  const [tab, setTab] = useState(() => {
    const requested = params.get('tab');
    return ['personal', 'addresses', 'payments', 'wishlist'].includes(requested)
      ? requested
      : 'personal';
  });

  /* One edit flag per inline block, exactly like the static editState. */
  const [editing, setEditing] = useState({ personal: false, email: false, phone: false });
  const [addrOpen, setAddrOpen] = useState(false);
  const [addrDraft, setAddrDraft] = useState({
    name: '',
    phone: '',
    pincode: '',
    city: '',
    locality: '',
    type: 'Home'
  });
  const [payDraft, setPayDraft] = useState({
    preferredUpi: profile.preferredUpi || '',
    preferredPayment: profile.preferredPayment || 'UPI Verified Escrow'
  });

  const photoInput = useRef(null);
  const avatarInput = useRef(null);

  /* Persist on every change and keep the storefront header in step. The
     static page wrote hunarlink_buyer_profile and mirrored the person onto
     hunarlink_auth_user so the nav greeting follows. */
  useEffect(() => {
    /* One write path: the store owns hunarlink_buyer_profile and mirrors the
       person onto hunarlink_auth_user so the header greeting follows. */
    setBuyerProfile(profile);
    if (!user || user.role !== 'artisan') {
      setUser({
        name: profile.firstName,
        fullName: profile.fullName,
        email: profile.email,
        role: 'buyer',
        title: 'Verified Valley Buyer \u2022 J&K',
        badge: profile.badge,
        isLoggedIn: profile.isLoggedIn
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    saveAddresses(addresses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  /* upSaveProfile recomputes the greeting name and the two-letter badge from
     the name fields, so edits to the name show up in the sidebar at once. */
  function saveProfile(patch) {
    setProfile((p) => {
      const first = String(patch.firstName ?? p.firstName ?? 'Priya').trim();
      const last = String(patch.lastName ?? p.lastName ?? '').trim();
      return {
        ...p,
        ...patch,
        firstName: first,
        lastName: last,
        fullName: (first + (last ? ' ' + last : '')).trim(),
        badge: ((first[0] || 'P') + (last[0] || first[1] || 'S')).toUpperCase()
      };
    });
  }

  function toggleSectionEdit(section) {
    const next = !editing[section];
    setEditing((e) => ({ ...e, [section]: next }));
    if (!next) setProfile((p) => ({ ...p })); /* cancel re-renders saved values */
  }

  function submitPersonal(e) {
    e.preventDefault();
    setEditing((ed) => ({ ...ed, personal: false }));
    toast('Personal information updated & synced across HunarLink!', 'success');
  }

  function submitEmail(e) {
    e.preventDefault();
    setEditing((ed) => ({ ...ed, email: false }));
    toast('Email address saved!', 'success');
  }

  function submitPhone(e) {
    e.preventDefault();
    setEditing((ed) => ({ ...ed, phone: false }));
    toast('Mobile number saved!', 'success');
  }

  function selectAvatarColor(hex) {
    saveProfile({ avatarColor: hex, avatarPhoto: '' });
    toast('Avatar color updated!', 'success');
  }

  /* Read the photo, then centre-crop it to a 180 px square so storage stays
     small — same treatment the static canvas code applied. */
  function uploadAvatar(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 180;
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        canvas.getContext('2d').drawImage(img, sx, sy, minDim, minDim, 0, 0, 180, 180);
        saveProfile({ avatarPhoto: canvas.toDataURL('image/jpeg', 0.85) });
        toast('\ud83d\udcf7 Profile photo updated!', 'success');
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    ev.target.value = '';
  }

  function removeAvatar() {
    saveProfile({ avatarPhoto: '' });
    toast('Profile photo removed.');
  }

  function submitPayments(e) {
    e.preventDefault();
    saveProfile({
      preferredUpi: payDraft.preferredUpi.trim(),
      preferredPayment: payDraft.preferredPayment
    });
    toast('Payment & UPI preferences saved!', 'success');
  }

  function submitAddress(e) {
    e.preventDefault();
    const entry = {
      id: 'addr-' + Date.now(),
      name: addrDraft.name.trim(),
      phone: addrDraft.phone.trim(),
      pincode: addrDraft.pincode.trim(),
      city: addrDraft.city.trim(),
      locality: addrDraft.locality.trim(),
      type: addrDraft.type || 'Home'
    };
    setAddresses((list) => [entry, ...list]);
    setAddrDraft({ name: '', phone: '', pincode: '', city: '', locality: '', type: 'Home' });
    setAddrOpen(false);
    toast('New delivery address saved & synced with HunarLink Checkout!', 'success');
  }

  function setDefaultAddress(id) {
    setAddresses((list) => {
      const idx = list.findIndex((a) => a.id === id);
      if (idx <= 0) return list;
      const copy = [...list];
      const [item] = copy.splice(idx, 1);
      return [item, ...copy];
    });
    toast('Default delivery address updated!', 'success');
  }

  function deleteAddress(id) {
    setAddresses((list) => list.filter((a) => a.id !== id));
    toast('Address removed.');
  }

  /* Signing out closes the collector session but keeps the saved details, then
     hands over to the buyer login page — the static behaviour. */
  function signOut() {
    setProfile((p) => ({ ...p, isLoggedIn: false }));
    toast('Signed out of your collector account.');
    navigate('/login');
  }

  const personalLocked = !editing.personal;
  const firstInitial = (profile.firstName || 'P')[0];
  const lastInitial = (profile.lastName || 'S')[0];

  return (
    <>
      <PortalScope family="user" />
{/* Shared Top Header */}
  <header className="up-header">
    <div className="up-header-inner">
      <a href={appHref('/')} className="up-brand">
        <span className="up-emblem">H</span>
        <div>
          <div className="up-brand-title">HunarLink</div>
          <div className="up-brand-sub">User Account &amp; Profile</div>
        </div>
      </a>
      <nav className="up-nav-links">
        <a href={appHref('/')}
          className="up-nav-pill"><IconHome size={15} /> Storefront</a>
        <a href={appHref('/profile')} className="up-nav-pill active"><IconUser size={15} /> My Profile</a>
        <a href={appHref('/orders')} className="up-nav-pill"><IconPackage size={15} /> My Orders</a>
        {profile.isLoggedIn ? (
          <a href={appHref('#')} className="up-nav-pill up-nav-signout" id="nav-auth-pill"
            onClick={(e) => { e.preventDefault(); signOut(); }}><IconLogout size={15} /> Sign Out</a>
        ) : (
          <a href={appHref('/login')} className="up-nav-pill" id="nav-auth-pill"><IconLogin size={15} /> Switch / Login</a>
        )}
      </nav>
    </div>
  </header>

  {/* Flipkart-Style Two-Column Account Layout */}
  <main className="up-container">
    {/* the page had no h1 at all — every section started at h2, so assistive
        tech had no page name to announce */}
    <h1 className="up-page-h1">User Account &amp; Profile</h1>
    <div className="fk-account-grid">

      {/* LEFT SIDEBAR */}
      <aside className="fk-sidebar">
        {/* Hello Greeting Card with Customizable Avatar */}
        <div className="fk-hello-card">
          <div className="fk-avatar-wrap">
            <div
              className="fk-avatar"
              id="sidebar-avatar"
              style={
                profile.avatarPhoto
                  ? undefined
                  : { backgroundColor: profile.avatarColor || '#E05A17' }
              }
            >
              {profile.avatarPhoto ? (
                <img src={profile.avatarPhoto} alt={profile.fullName} />
              ) : (
                profile.badge || `${firstInitial}${lastInitial}`.toUpperCase()
              )}
            </div>
            <label className="fk-avatar-cam" title="Upload Profile Photo"> <input type="file" accept="image/*" style={{display: 'none'}}
                ref={photoInput} onChange={uploadAvatar} />
            </label>
          </div>
          <div style={{minWidth: '0'}}>
            <div className="fk-hello-sub">Hello,</div>
            <div className="fk-hello-name" id="sidebar-fullname">{profile.fullName}</div>
          </div>
        </div>

        {/* Navigation Menu (Exact Flipkart Structure) */}
        <div className="fk-nav-card">
          <div className="fk-nav-section" style={{padding: '4px 0'}}>
            <a href={appHref('/orders')} className="fk-nav-group-link">
              <span>MY ORDERS</span>
              <span>→</span>
            </a>
          </div>

          <div className="fk-nav-section">
            <div className="fk-nav-group-title"><span>ACCOUNT SETTINGS</span></div>
            <button type="button"
              className={`fk-nav-item${tab === 'personal' ? ' active' : ''}`}
              data-view="personal" onClick={() => setTab('personal')}>
              <span>Profile Information</span>
            </button>
            <button type="button"
              className={`fk-nav-item${tab === 'addresses' ? ' active' : ''}`}
              data-view="addresses" onClick={() => setTab('addresses')}>
              <span>Manage Addresses</span>
              <span id="nav-addr-count" style={{fontSize: '0.72rem'}}>{addresses.length}</span>
            </button>
            <button type="button"
              className={`fk-nav-item${tab === 'payments' ? ' active' : ''}`}
              data-view="payments" onClick={() => setTab('payments')}>
              <span>Saved UPI &amp; Payments</span>
            </button>
          </div>

          <div className="fk-nav-section">
            <div className="fk-nav-group-title"><span>MY STUFF</span></div>
            <button type="button"
              className={`fk-nav-item${tab === 'wishlist' ? ' active' : ''}`}
              data-view="wishlist" onClick={() => setTab('wishlist')}>
              <span>My Wishlist</span>
              <span id="nav-wish-count" style={{fontSize: '0.72rem'}}>{wishlist.length}</span>
            </button>
            <a href={appHref('/orders')} className="fk-nav-item" style={{textDecoration: 'none'}}>
              <span>My Reviews &amp; Ratings</span>
              <span>→</span>
            </a>
          </div>

          <div className="fk-nav-section" style={{padding: '6px 0'}}>
            <button type="button" className="fk-nav-item"
              style={{paddingLeft: '18px', color: 'var(--danger-600)'}}
              onClick={signOut}>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN WORKSPACE */}
      <section className="fk-panel-card">

        {/* VIEW 1: PERSONAL INFORMATION (FLIPKART EDIT/SAVE TOGGLES) */}
        <div className={`fk-tab-view${tab === 'personal' ? ' active' : ''}`} id="view-personal">

          {/* Block A: Personal Information */}
          <div className="fk-section-block">
            <div className="fk-block-head">
              <h2 className="fk-block-title">Personal Information</h2>
              <button type="button" className="btn-link-edit" id="btn-edit-personal"
                onClick={() => toggleSectionEdit('personal')}>
                {editing.personal ? 'Cancel' : 'Edit'}
              </button>
            </div>

            <form id="form-personal" onSubmit={submitPersonal}>
              <div className="form-row-2" style={{marginBottom: '14px'}}>
                <div>
                  <label className="up-label" htmlFor="prof-first">First Name</label>
                  <input type="text" id="prof-first" className="up-input" required
                    disabled={personalLocked} value={profile.firstName || ''}
                    onChange={(e) => saveProfile({ firstName: e.target.value })} />
                </div>
                <div>
                  <label className="up-label" htmlFor="prof-last">Last Name</label>
                  <input type="text" id="prof-last" className="up-input"
                    disabled={personalLocked} value={profile.lastName || ''}
                    onChange={(e) => saveProfile({ lastName: e.target.value })} />
                </div>
              </div>

              <div className="form-row-2" style={{marginBottom: '14px'}}>
                <div>
                  <label className="up-label">Your Gender</label>
                  <div className="gender-radio-row">
                    {['Female', 'Male', 'Prefer not to say'].map((g) => (
                      <label className="gender-radio-label" key={g}>
                        <input type="radio" name="prof-gender" value={g}
                          disabled={personalLocked}
                          checked={profile.gender === g}
                          onChange={() => saveProfile({ gender: g })} /> {g}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="up-label" htmlFor="prof-dob">Date of Birth</label>
                  <input type="date" id="prof-dob" className="up-input"
                    disabled={personalLocked} value={profile.dob || ''}
                    onChange={(e) => saveProfile({ dob: e.target.value })} />
                </div>
              </div>

              <div style={{marginBottom: '14px'}}>
                <label className="up-label" htmlFor="prof-bio">User Bio &amp; Craft Preferences</label>
                <textarea id="prof-bio" className="up-textarea" rows="2"
                  placeholder="Tell artisans about your favorite Kashmiri crafts..."
                  disabled={personalLocked} value={profile.bio || ''}
                  onChange={(e) => saveProfile({ bio: e.target.value })}></textarea>
              </div>

              {/* Profile Avatar Customization */}
              <div style={{marginBottom: '14px'}}>
                <label className="up-label">Customize Avatar Theme / Photo</label>
                <div style={{display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap'}}>
                  <div className="avatar-color-swatches" id="avatar-swatches">
                    {AVATAR_SWATCHES.map((hex) => (
                      <button
                        type="button"
                        key={hex}
                        className={`swatch-btn${
                          (profile.avatarColor || '#E05A17') === hex ? ' selected' : ''
                        }`}
                        style={{background: hex}}
                        title="Choose avatar color"
                        onClick={() => selectAvatarColor(hex)}
                      />
                    ))}
                  </div>
                  <label className="btn-orange-outline" style={{padding: '6px 12px', fontSize: '0.76rem', cursor: 'pointer'}}>Upload Photo
                    <input type="file" accept="image/*" style={{display: 'none'}}
                      ref={avatarInput} onChange={uploadAvatar} />
                  </label>
                  <button type="button" className="btn-link-edit" onClick={removeAvatar}>Remove Photo</button>
                </div>
              </div>

              <div id="save-personal-row"
                style={{display: editing.personal ? 'block' : 'none', marginTop: '12px'}}>
                <button type="submit" className="btn-orange">SAVE CHANGES</button>
              </div>
            </form>
          </div>

          {/* Block B: Email Address */}
          <div className="fk-section-block">
            <div className="fk-block-head">
              <h2 className="fk-block-title">Email Address</h2>
              <button type="button" className="btn-link-edit" id="btn-edit-email"
                onClick={() => toggleSectionEdit('email')}>
                {editing.email ? 'Cancel' : 'Edit'}
              </button>
            </div>
            <form id="form-email" onSubmit={submitEmail}
              style={{display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap'}}>
              <input type="email" id="prof-email" aria-label="Email address" className="up-input" style={{maxWidth: '360px'}}
                required disabled={!editing.email} value={profile.email || ''}
                onChange={(e) => saveProfile({ email: e.target.value })} />
              <button type="submit" className="btn-orange" id="save-email-btn"
                style={{display: editing.email ? 'inline-flex' : 'none'}}>SAVE</button>
            </form>
          </div>

          {/* Block C: Mobile Number */}
          <div className="fk-section-block">
            <div className="fk-block-head">
              <h2 className="fk-block-title">Mobile Number</h2>
              <button type="button" className="btn-link-edit" id="btn-edit-phone"
                onClick={() => toggleSectionEdit('phone')}>
                {editing.phone ? 'Cancel' : 'Edit'}
              </button>
            </div>
            <form id="form-phone" onSubmit={submitPhone}
              style={{display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap'}}>
              <input type="tel" id="prof-phone" aria-label="Mobile number" className="up-input" style={{maxWidth: '360px'}}
                required disabled={!editing.phone} value={profile.phone || ''}
                onChange={(e) => saveProfile({ phone: e.target.value })} />
              <button type="submit" className="btn-orange" id="save-phone-btn"
                style={{display: editing.phone ? 'inline-flex' : 'none'}}>SAVE</button>
            </form>
          </div>

          {/* Block D: Flipkart-Style FAQs */}
          <div className="fk-section-block">
            <h3 style={{fontSize: '1.25rem', marginBottom: '12px'}}>FAQs</h3>
            <div className="faq-item">
              <div className="faq-q">What happens when I update my name, email address, or mobile number?</div>
              <div className="faq-a">Your updated profile immediately syncs across the HunarLink storefront header, future GI Ownership Certificates, and live order tracking notifications.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q">Are my saved delivery addresses available during checkout?</div>
              <div className="faq-a">Yes! Every address you add or set as default under Manage Addresses appears automatically inside HunarLink Checkout.</div>
            </div>
          </div>
        </div>

        {/* VIEW 2: MANAGE ADDRESSES (SYNCED WITH CHECKOUT) */}
        <div className={`fk-tab-view${tab === 'addresses' ? ' active' : ''}`} id="view-addresses">
          <div className="fk-block-head" style={{justifyContent: 'space-between'}}>
            <h2 className="fk-block-title">Manage Delivery Addresses</h2>
            <button type="button" className="btn-orange"
              onClick={() => setAddrOpen((v) => !v)}>＋ Add New Address</button>
          </div>

          <form id="new-address-form" onSubmit={submitAddress}
            style={{display: addrOpen ? 'block' : 'none', background: 'var(--bg-ivory)', border: '1px solid var(--border-mid)', borderRadius: '12px', padding: '18px', marginBottom: '18px'}}>
            <h3 style={{fontSize: '1.15rem', marginBottom: '12px'}}>Add a New Delivery Address</h3>
            <div className="form-row-2" style={{marginBottom: '12px'}}>
              <div>
                <label className="up-label" htmlFor="addr-name">Receiver Full Name *</label>
                <input type="text" id="addr-name" className="up-input" required
                  placeholder="e.g. Priya Sharma" value={addrDraft.name}
                  onChange={(e) => setAddrDraft({ ...addrDraft, name: e.target.value })} />
              </div>
              <div>
                <label className="up-label" htmlFor="addr-phone">10-Digit Mobile Number *</label>
                <input type="tel" id="addr-phone" className="up-input" required
                  placeholder="e.g. +91 98112 77420" value={addrDraft.phone}
                  onChange={(e) => setAddrDraft({ ...addrDraft, phone: e.target.value })} />
              </div>
            </div>
            <div className="form-row-2" style={{marginBottom: '12px'}}>
              <div>
                <label className="up-label" htmlFor="addr-pin">Pincode *</label>
                <input type="text" id="addr-pin" className="up-input" required
                  placeholder="e.g. 110024" value={addrDraft.pincode}
                  onChange={(e) => setAddrDraft({ ...addrDraft, pincode: e.target.value })} />
              </div>
              <div>
                <label className="up-label" htmlFor="addr-city">City &amp; State *</label>
                <input type="text" id="addr-city" className="up-input" required
                  placeholder="e.g. New Delhi" value={addrDraft.city}
                  onChange={(e) => setAddrDraft({ ...addrDraft, city: e.target.value })} />
              </div>
            </div>
            <div style={{marginBottom: '12px'}}>
              <label className="up-label" htmlFor="addr-loc">House No., Street, Locality &amp; Landmark *</label>
              <input type="text" id="addr-loc" className="up-input" required
                placeholder="e.g. B-42 Defence Colony, Ring Road" value={addrDraft.locality}
                onChange={(e) => setAddrDraft({ ...addrDraft, locality: e.target.value })} />
            </div>
            <div style={{marginBottom: '14px'}}>
              <label className="up-label">Address Type</label>
              <div className="gender-radio-row">
                {[['Home', 'Home'], ['Work', 'Work / Office']].map(([value, label]) => (
                  <label className="gender-radio-label" key={value}>
                    <input type="radio" name="addr-type" value={value}
                      checked={addrDraft.type === value}
                      onChange={() => setAddrDraft({ ...addrDraft, type: value })} /> {label}
                  </label>
                ))}
              </div>
            </div>
            <div style={{display: 'flex', gap: '10px'}}>
              <button type="submit" className="btn-orange">Save Address</button>
              <button type="button" className="btn-orange-outline"
                onClick={() => setAddrOpen(false)}>Cancel</button>
            </div>
          </form>

          <div id="addresses-list">
            {addresses.length === 0 ? (
              <p style={{color: 'var(--text-500)', fontSize: '0.85rem'}}>
                No saved delivery addresses yet. Add one above!
              </p>
            ) : (
              addresses.map((a, idx) => (
                <div className={`address-card${idx === 0 ? ' default-addr' : ''}`} key={a.id}>
                  <div>
                    <div style={{marginBottom: '5px'}}>
                      <span className="addr-type-chip">{a.type || 'Home'}</span>
                      {idx === 0 && (
                        <span className="addr-type-chip" style={{background: 'var(--btn-orange)', color: '#FFF'}}>DEFAULT</span>
                      )}
                    </div>
                    <div style={{fontWeight: '700', color: 'var(--text-900)', fontSize: '0.9rem'}}>
                      {a.name} &nbsp;•&nbsp; {a.phone}
                    </div>
                    <div style={{fontSize: '0.82rem', color: 'var(--text-700)', marginTop: '3px'}}>
                      {a.locality}, {a.city} — <strong>{a.pincode}</strong>
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                    {idx !== 0 && (
                      <button type="button" className="btn-orange-outline"
                        style={{padding: '6px 11px', fontSize: '0.74rem'}}
                        onClick={() => setDefaultAddress(a.id)}>Set Default</button>
                    )}
                    <button type="button" className="btn-link-edit"
                      style={{color: 'var(--danger-600)'}}
                      onClick={() => deleteAddress(a.id)}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* VIEW 3: SAVED UPI & PAYMENT PREFERENCES */}
        <div className={`fk-tab-view${tab === 'payments' ? ' active' : ''}`} id="view-payments">
          <div className="fk-block-head">
            <h2 className="fk-block-title">Saved UPI &amp; Escrow Payment Preferences</h2>
          </div>
          <form style={{maxWidth: '480px'}} onSubmit={submitPayments}>
            <div className="form-field">
              <label className="up-label" htmlFor="prof-upi">Preferred UPI ID (Instant Escrow)</label>
              <input type="text" id="prof-upi" className="up-input" placeholder="e.g. priya.sharma@okaxis"
                value={payDraft.preferredUpi}
                onChange={(e) => setPayDraft({ ...payDraft, preferredUpi: e.target.value })} />
            </div>
            <div className="form-field">
              <label className="up-label" htmlFor="prof-pay-mode">Default Checkout Method</label>
              <select id="prof-pay-mode" className="up-select" value={payDraft.preferredPayment}
                onChange={(e) => setPayDraft({ ...payDraft, preferredPayment: e.target.value })}>
                <option value="UPI Verified Escrow">UPI Verified Escrow (Zero Fee)</option>
                <option value="Verify-on-Delivery Escrow">Insured COD / Verify-on-Delivery Escrow</option>
                <option value="Card Escrow Protection">Credit / Debit Card Escrow</option>
              </select>
            </div>
            <button type="submit" className="btn-orange">Save Payment Preference</button>
          </form>
        </div>

        {/* VIEW 4: MY WISHLIST */}
        <div className={`fk-tab-view${tab === 'wishlist' ? ' active' : ''}`} id="view-wishlist">
          <div className="fk-block-head" style={{justifyContent: 'space-between'}}>
            <h2 className="fk-block-title">My Saved Heirloom Wishlist</h2>
            <a href={appHref('/#marketplace-section')}
              className="btn-orange-outline">Explore More Crafts →</a>
          </div>
          <div id="wishlist-container">
            {wishlist.length === 0 ? (
              <p style={{color: 'var(--text-500)', fontSize: '0.86rem'}}>
                Your wishlist is currently empty.
              </p>
            ) : (
              wishlistItems.map((p) => (
                <div className="address-card" style={{alignItems: 'center'}} key={p.id}>
                  <div>
                    <div style={{fontWeight: '700', color: 'var(--heading-color)', fontSize: '0.92rem'}}>
                      {p.title}
                    </div>
                    <div style={{fontSize: '0.78rem', color: 'var(--text-500)'}}>
                      GI-Certified Kashmiri Heritage Craft
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: '8px'}}>
                    <a href={appHref(`/product?id=${encodeURIComponent(p.id)}`)} className="btn-orange"
                      style={{padding: '7px 14px', fontSize: '0.76rem'}}>View Craft →</a>
                    <button type="button" className="btn-link-edit"
                      style={{color: 'var(--danger-600)'}}
                      onClick={() => removeFromWishlist(p.id)}>Remove</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </section>
    </div>
  </main>

  <div className="up-toast" id="up-toast"></div>
    </>
  );
}
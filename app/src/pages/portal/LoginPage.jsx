import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import '../../styles/portal.css';
import PortalScope from '../../components/PortalScope.jsx';
import {
  IconUser,
  IconSpark,
  IconLogin,
  IconUserPlus,
  IconHandshake,
  IconBadgeCheck,
  IconSeedling,
  IconTruck,
  IconShield,
  IconBookmark,
  IconArrowRight,
  IconCheck,
  IconX
} from '../../components/LineIcons.jsx';
import { useStore } from '../../state/StoreContext.jsx';
import { CLERK_ENABLED, useClerkAuth, toSessionUser } from '../../data/clerkConfig.js';
import { appHref } from '../../utils/href.js';

/* ==========================================================================
   LoginPage — collector (buyer) sign in / sign up
   --------------------------------------------------------------------------
   Behaviour ported from user-portal/login.html. All 7 handlers the static page
   wired are React state now:
     switchLoginMode      — the Login / Create Account tabs
     toggleOtpLoginMode   — the "login with OTP" checkbox
     generateDemoOtp      — the Send 6-Digit OTP button
     handleUserSignIn     — the sign-in form (password or OTP branch)
     handleUserSignUp     — the create-account form
     quickDemoUserLogin   — the 1-tap Priya demo
     (DOMContentLoaded)   — ?mode=signup opens the signup tab

   The session lives where it always did: hunarlink_buyer_profile with
   isLoggedIn, mirrored onto hunarlink_auth_user so the storefront header can
   read it. An artisan session is never overwritten from this page.
   ========================================================================== */

const PROFILE_KEY = 'hunarlink_buyer_profile';
const AUTH_KEY = 'hunarlink_auth_user';

/* ==========================================================================
   Artisan registries — how we tell a shop from a buyer WITHOUT a GSTIN
   --------------------------------------------------------------------------
   A GSTIN proves a business, not a craft, and it is the wrong door for a
   weaver in Charar-i-Sharief selling to a diaspora buyer on Instagram.
   Amazon can demand one because it wants a taxable turnover; a craft
   marketplace wants *provenance*. So the trust signal here is a Guild
   Reference Code: an existing guild member or HunarLink artisan vouches for
   the applicant, and they both get a short numeric code to read out.

   Format: HL-<GUILD PREFIX>-<4 DIGITS>  e.g. HL-PASH-8821
   The prefix ties the code to the guild that owns it, so a code from one
   guild cannot vouch for someone claiming another.

   DEMO REGISTRY — a real build verifies against the guild database. These
   codes are seeded here so the flow can be walked end to end.
   ========================================================================== */

const GUILD_CODES = {
  PASH: { guild: 'Pashmina & Kani Weavers Guild', district: 'Srinagar' },
  WALN: { guild: 'Walnut Wood Carving Cooperative', district: 'Baramulla' },
  PAPR: { guild: 'Papier-Mach\u00e9 Artisans Trust', district: 'Srinagar' },
  SOZN: { guild: 'Sozni Embroidery Cluster', district: 'Budgam' },
  KANI: { guild: 'Kani Shawl Weavers Society', district: 'Anantnag' },
  CARP: { guild: 'Carpet Weavers Federation', district: 'Pulwama' }
};

const REFERENCE_REGISTRY = {
  'HL-PASH-8821': { artisan: 'Ghulam Mir', guild: 'PASH', uses: 0, maxUses: 3 },
  'HL-WALN-4471': { artisan: 'Fayaz Wani', guild: 'WALN', uses: 0, maxUses: 3 },
  'HL-SOZN-2093': { artisan: 'Zahoor Bhat', guild: 'SOZN', uses: 0, maxUses: 2 },
  'HL-KANI-6612': { artisan: 'Nusrat Jan', guild: 'KANI', uses: 0, maxUses: 2 },
  'HL-CARP-3345': { artisan: 'Mohammad Dar', guild: 'CARP', uses: 0, maxUses: 3 },
  'HL-PAPR-7708': { artisan: 'Bashir Ahmad', guild: 'PAPR', uses: 0, maxUses: 2 }
};

/* Three routes into a verified shop, weakest effort first. */
const PATHS = {
  reference: {
    key: 'reference',
    title: 'Guild reference code',
    blurb: 'An artisan or guild office vouches for you. Fastest route.'
  },
  craftmark: {
    key: 'craftmark',
    title: 'Craftmark or CDI number',
    blurb: 'You are already on the Craft Development Institute register.'
  },
  new: {
    key: 'new',
    title: 'Not registered yet',
    blurb: 'Begin today and verify by video once you are taking orders.'
  }
};

/* Seed accounts, so an artisan can sign in with a card number on a fresh
   browser. In a real deployment these come from the guild register. */
const SEED_ARTISANS = [
  {
    email: 'ghulam.mir@zadibalpashmina.com',
    phone: '+91 94190 88210',
    password: 'SozniLoom100%',
    role: 'artisan',
    name: 'Master Ghulam Qadir Mir',
    business: 'Mir Heritage Loom Guild',
    craft: 'Pashmina',
    district: 'Srinagar',
    cardNo: 'HL-ART-88210',
    caseId: 'GI-JK-PASH-8821',
    trust: 'Guild-Verified \u2022 Pashmina & Kani Weavers Guild',
    badge: 'GM'
  },
  {
    email: 'fayaz.wani@anantnagcrafts.org',
    phone: '+91 94190 55218',
    password: 'WalnutArtisan#1',
    role: 'artisan',
    name: 'Fayaz Ahmad Wani',
    business: 'Wani Woodcraft Atelier',
    craft: 'Walnut wood',
    district: 'Anantnag',
    cardNo: 'HL-ART-11800',
    caseId: 'GI-JK-WNT-1180',
    trust: 'Guild-Verified \u2022 Walnut Wood Carving Cooperative',
    badge: 'FA'
  }
];

const DISTRICTS = [
  'Srinagar', 'Baramulla', 'Budgam', 'Anantnag', 'Pulwama', 'Kupwara',
  'Ganderbal', 'Shopian', 'Kulgam', 'Bandipora', 'Doda', 'Kishtwar',
  'Ramban', 'Reasi', 'Udhampur', 'Kathua', 'Jammu', 'Rajouri', 'Poonch', 'Samba'
];

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

function readProfile(savedProfile) {
  return savedProfile ? { ...DEFAULT_PROFILE, ...savedProfile } : { ...DEFAULT_PROFILE };
}

/* upSaveProfile(): derive fullName + badge from the name, force role buyer,
   and mirror the display identity onto the storefront session key. */
function buildProfile(savedProfile, patch) {
  const merged = { ...readProfile(savedProfile), ...patch };
  const first = String(merged.firstName || 'Priya').trim();
  const last = String(merged.lastName || '').trim();
  const updated = {
    ...merged,
    firstName: first,
    lastName: last,
    fullName: (first + (last ? ' ' + last : '')).trim(),
    badge: ((first[0] || 'P') + (last[0] || first[1] || 'S')).toUpperCase(),
    role: 'buyer'
  };
  return updated;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const {
    setUser,
    user: storeUser,
    buyerProfile,
    setBuyerProfile,
    toast,
    platformUsers,
    setPlatformUsers
  } = useStore();

  /* When Clerk is configured this carries the real authenticated identity and
     writeProfile() is fed from it instead of from the demo form. With no key
     it reports isSignedIn: false and every demo path below runs untouched. */
  const clerk = useClerkAuth();

  /* Persist a buyer profile through the store — one write path that also
     mirrors the identity onto the storefront session key. */
  const writeProfile = (patch) => {
    const updated = buildProfile(buyerProfile, patch);
    setBuyerProfile(updated);
    if (!storeUser || storeUser.role !== 'artisan') {
      setUser({
        name: updated.firstName,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        role: 'buyer',
        title: 'Verified Valley Buyer \u2022 J&K',
        badge: updated.badge,
        isLoggedIn: updated.isLoggedIn
      }, { silent: true });
    }
    return updated;
  };

  const [mode, setMode] = useState(() => (params.get('mode') === 'signup' ? 'signup' : 'signin'));
  const [useOtp, setUseOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [signin, setSignin] = useState({ identifier: '', password: '', otp: '' });
  const [signup, setSignup] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'Female',
    password: ''
  });

  /* ---- who is signing in, and (for artisans) how we verify the shop ---- */
  const role = params.get('role') === 'artisan' ? 'artisan' : 'user';
  const [path, setPath] = useState('reference');          // how they prove they are a maker
  const [refCode, setRefCode] = useState('');
  const [refCheck, setRefCheck] = useState(null);         // null | 'ok' | 'bad'
  const [refMatch, setRefMatch] = useState(null);
  const [craftId, setCraftId] = useState('');
  const [shop, setShop] = useState({
    shopName: '',
    craft: '',
    district: 'Srinagar',
    cardNo: ''
  });

  /* Keep the storefront header pill in step with whatever session is on disk.
     An artisan session is never overwritten from this page: doing so silently
     signed a maker out of their own workspace just by opening /login. */
  useEffect(() => {
    const live = (() => {
      try {
        return JSON.parse(window.localStorage.getItem(AUTH_KEY) || 'null');
      } catch {
        return null;
      }
    })();
    if (live && live.role === 'artisan' && live.isLoggedIn) return;

    const p = readProfile(buyerProfile);
    setUser({
      name: p.firstName,
      fullName: p.fullName,
      email: p.email,
      role: 'buyer',
      title: 'Verified Valley Buyer \u2022 J&K',
      badge: p.badge,
      isLoggedIn: p.isLoggedIn
    }, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const target = params.get('redirect') || '/profile';

  function land(message, profile) {
    toast(message, 'success');
    setUser({
      name: profile.firstName,
      fullName: profile.fullName,
      email: profile.email,
      role: 'buyer',
      title: 'Verified Valley Buyer \u2022 J&K',
      badge: profile.badge,
      isLoggedIn: true
    }, { silent: true });
    window.setTimeout(() => navigate(target), 750);
  }

  function sendOtp() {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setOtpCode(code);
    setSignin((s) => ({ ...s, otp: code }));
    toast(`\u2709\ufe0f 6-digit OTP (${code}) generated & ready!`, 'success');
  }

  function submitSignin(e) {
    e.preventDefault();
    const identifier = signin.identifier.trim();

    if (!identifier) {
      toast('\u26a0\ufe0f Please enter your email address or mobile number.');
      return;
    }

    if (useOtp) {
      if (!otpCode || signin.otp.trim() !== otpCode) {
        toast("\u26a0\ufe0f Please click 'Send 6-Digit OTP' and enter the matching 6-digit code.");
        return;
      }
    } else if (!signin.password) {
      toast('\u26a0\ufe0f Please enter your password.');
      return;
    }

    const existing = readProfile(buyerProfile);
    const isEmail = identifier.includes('@');
    const nameFromEmail = isEmail
      ? identifier
          .split('@')[0]
          .replace(/[._-]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : existing.fullName;
    const parts = nameFromEmail.split(' ');

    /* The static build only adopted the typed name when the identifier
       differed, so re-signing in as the saved collector keeps their details. */
    const samePerson = String(existing.email || '').toLowerCase() === identifier.toLowerCase();

    const profile = writeProfile({
      firstName: samePerson ? existing.firstName : parts[0] || existing.firstName,
      lastName: samePerson ? existing.lastName : parts.slice(1).join(' ') || existing.lastName,
      email: isEmail ? identifier : existing.email,
      phone: !isEmail ? identifier : existing.phone,
      isLoggedIn: true
    });

    land(`Welcome back, ${profile.fullName}! Opening your account...`, profile);
  }

  function submitSignup(e) {
    e.preventDefault();
    const first = signup.firstName.trim();
    const last = signup.lastName.trim();
    if (!first || !last || !signup.email.trim() || !signup.phone.trim()) {
      toast('\u26a0\ufe0f Please complete every required field.');
      return;
    }
    const profile = writeProfile({
      firstName: first,
      lastName: last,
      email: signup.email.trim(),
      phone: signup.phone.trim(),
      gender: signup.gender,
      isLoggedIn: true
    });
    land(`\u2726 Account created for ${profile.fullName}! Redirecting to Profile...`, profile);
  }

  /* ---------------------------------------------------------------------
     Artisan verification. Deliberately a separate function from submitSignup
     because an artisan account is a shop, not a buyer profile: it lands in
     platformUsers with role 'artisan' so /auth and /seller can read it.
     --------------------------------------------------------------------- */

  /* One identifier field, three ways to match. Digits-only comparison so
     "+91 94190 88210" finds a record stored as "919419088210". */
  const digits = (v) => String(v || '').replace(/\D/g, '');

  function artisanAccounts() {
    const stored = platformUsers || [];
    const seen = new Set(stored.map((a) => String(a.email || '').toLowerCase()));
    return [...stored, ...SEED_ARTISANS.filter((a) => !seen.has(a.email.toLowerCase()))];
  }

  function findArtisan(identifier) {
    const raw = String(identifier || '').trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();
    const asDigits = digits(raw);

    return (
      artisanAccounts().find((a) => {
        if (a.role && a.role !== 'artisan') return false;
        const email = String(a.email || '').toLowerCase();
        const card = String(a.cardNo || '').toLowerCase();
        if (email && email === lower) return true;
        if (card && card === lower) return true;
        /* a card typed without its dashes still resolves */
        if (card && digits(card) && digits(card) === asDigits) return true;
        /* phone: compare on the last 10 digits so +91 is optional */
        const phone = digits(a.phone);
        if (phone && asDigits.length >= 10 && phone.slice(-10) === asDigits.slice(-10)) return true;
        return false;
      }) || null
    );
  }

  function verifyReference(raw) {
    const code = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!code) {
      setRefCheck('bad');
      setRefMatch({ reason: 'Enter the code your guild member shared with you.' });
      return false;
    }
    const found = REFERENCE_REGISTRY[code];
    if (!found) {
      setRefCheck('bad');
      setRefMatch({
        reason: 'That code is not in the guild registry. Ask your guild member to re-issue it.'
      });
      return false;
    }
    if (found.uses >= found.maxUses) {
      setRefCheck('bad');
      setRefMatch({ reason: 'This code has already been used the maximum number of times.' });
      return false;
    }
    const g = GUILD_CODES[found.guild];
    setRefCheck('ok');
    setRefMatch({
      artisan: found.artisan,
      guild: g.guild,
      district: g.district,
      remaining: found.maxUses - found.uses
    });
    /* the guild owns the district, so prefill it rather than let it drift */
    setShop((v) => ({ ...v, district: g.district }));
    return true;
  }

  function submitArtisanSignup(e) {
    e.preventDefault();
    const first = signup.firstName.trim();
    const last = signup.lastName.trim();
    const email = signup.email.trim();

    if (!first || !email || !signup.phone.trim()) {
      toast('\u26a0\ufe0f Please give your name, mobile number and email.');
      return;
    }
    if (!signup.password || signup.password.length < 8) {
      toast('\u26a0\ufe0f Choose a password of at least 8 characters.');
      return;
    }
    if (!shop.shopName.trim()) {
      toast('\u26a0\ufe0f Please name your shop \u2014 buyers see this, not your legal name.');
      return;
    }

    /* The Artisan Card Number is the government craft identity and the handle
       used to sign in, so it is required and must be unique. */
    const cardNo = shop.cardNo.trim().toUpperCase();
    if (!cardNo) {
      toast('\u26a0\ufe0f Enter your Artisan Card Number.');
      return;
    }
    if (!/^[A-Z0-9-]{6,}$/.test(cardNo)) {
      toast('\u26a0\ufe0f That Artisan Card Number does not look right \u2014 at least 6 letters, digits or dashes.');
      return;
    }
    const cardTaken = artisanAccounts().some(
      (a) => String(a.cardNo || '').toUpperCase() === cardNo
    );
    if (cardTaken) {
      toast('\u26a0\ufe0f That Artisan Card Number is already registered. Sign in instead.');
      return;
    }

    /* each verification path produces a different trust label */
    let trust = 'New Artisan \u2022 Probation';
    let giId = null;
    let reference = null;

    if (path === 'reference') {
      if (refCheck !== 'ok' && !verifyReference(refCode)) return;
      reference = refCode.trim().toUpperCase().replace(/\s+/g, '');
      const g = GUILD_CODES[REFERENCE_REGISTRY[reference].guild];
      trust = `Guild-Verified \u2022 ${g.guild}`;
    } else if (path === 'craftmark') {
      const id = craftId.trim();
      if (id.length < 6) {
        toast('\u26a0\ufe0f Enter your full Craftmark / CDI identity number.');
        return;
      }
      giId = id;
      trust = 'Craftmark Verified \u2022 CDI';
    }

    const users = platformUsers || [];
    if (users.some((a) => String(a.email).toLowerCase() === email.toLowerCase())) {
      toast('\u26a0\ufe0f An account with that email already exists. Try signing in.');
      return;
    }

    const name = `${first} ${last}`.trim();
    const badge = (first[0] || '') + (last[0] || '') || 'AR';
    const locality = shop.district ? ` \u2022 ${shop.district}` : '';

    setPlatformUsers([
      ...users,
      {
        email,
        phone: signup.phone.trim(),
        password: signup.password,
        role: 'artisan',
        name,
        business: shop.shopName.trim(),
        craft: shop.craft || '',
        district: shop.district,
        giCertified: path !== 'new',
        giId,
        reference,
        trust,
        cardNo,
        badge: badge.toUpperCase()
      }
    ]);

    setUser({
      name: first,
      fullName: name,
      email,
      phone: signup.phone.trim(),
      role: 'artisan',
      title: `${trust}${locality}`,
      badge: badge.toUpperCase(),
      isLoggedIn: true
    }, { silent: true });

    toast(`\u2726 Shop created for ${name}! Opening your workspace...`, 'success');
    window.setTimeout(() => navigate('/seller'), 800);
  }

  function submitArtisanSignin(e) {
    e.preventDefault();
    const identifier = signin.identifier.trim();

    /* Password is mandatory for artisans on every identifier — there is no
       OTP branch here, unlike the collector form. */
    if (!identifier) {
      toast('\u26a0\ufe0f Enter your email, mobile number or Artisan Card Number.');
      return;
    }
    if (!signin.password) {
      toast('\u26a0\ufe0f A password is required to sign in as an artisan.');
      return;
    }

    const match = findArtisan(identifier);
    if (!match) {
      toast('\u26a0\ufe0f No artisan account matches that email, number or card. Register below.');
      return;
    }
    if (match.password && match.password !== signin.password) {
      toast('\u26a0\ufe0f That password does not match this account.');
      return;
    }
    setUser({
      name: (match.name || '').split(' ')[0] || 'Artisan',
      fullName: match.name,
      email: match.email,
      phone: match.phone,
      role: 'artisan',
      title: match.trust || 'Verified Artisan \u2022 J&K',
      badge: match.badge || 'AR',
      isLoggedIn: true
    }, { silent: true });
    toast(`Welcome back, ${match.name}! Opening your workspace...`, 'success');
    window.setTimeout(() => navigate('/seller'), 800);
  }

  /* Switching role keeps the flow honest: the buyer form and the artisan form
     write to different stores, so we reset the OTP branch on the way across. */
  /* The tab is React state; only the role is mirrored into the URL. So this
     must NOT re-derive the mode from ?mode= — after clicking "Create account"
     the URL still said nothing, and re-deriving it dropped the user back onto
     sign in every time they switched role. The mode is left untouched. */
  function switchRole(next) {
    setUseOtp(false);
    setSignin({ identifier: '', password: '', otp: '' });
    const nextParams = new URLSearchParams(params);
    if (next === 'artisan') nextParams.set('role', 'artisan');
    else nextParams.delete('role');
    setParams(nextParams, { replace: true });
  }

  /* Switching tabs keeps the URL honest as well, so a refresh or a shared link
     lands on the tab the sender was looking at. */
  function switchMode(next) {
    setMode(next);
    const nextParams = new URLSearchParams(params);
    if (next === 'signup') nextParams.set('mode', 'signup');
    else nextParams.delete('mode');
    setParams(nextParams, { replace: true });
  }

  function demoLogin() {
    const profile = writeProfile({ ...DEFAULT_PROFILE, isLoggedIn: true });
    land(`\u26a1 Signed in as ${profile.fullName}!`, profile);
  }

  const isSignin = mode === 'signin';

  /* The header must not offer account links before there is a session.
     storeUser is mirrored from the buyer profile, so an artisan session is
     read straight off disk as well. */
  const signedIn = Boolean(
    (storeUser && storeUser.isLoggedIn) || (buyerProfile && buyerProfile.isLoggedIn)
  );

  /* Which workspace the header should point at: the live session's role wins. */
  const liveRole = (() => {
    try {
      const raw = JSON.parse(window.localStorage.getItem(AUTH_KEY) || 'null');
      if (raw && raw.role) return raw.role;
    } catch {
      /* fall through to the store copy */
    }
    return storeUser?.role || (role === 'artisan' ? 'artisan' : 'buyer');
  })();
  const isArtisanSession = liveRole === 'artisan';

  function signOutHere() {
    try {
      window.localStorage.removeItem(AUTH_KEY);
    } catch {
      /* storage may be unavailable in private mode; the store is the source */
    }
    setUser(null);
    setBuyerProfile(buildProfile(buyerProfile, { isLoggedIn: false }));
    toast('Signed out.');
  }

  return (
    <>
      <PortalScope family="user" />
      {/* Header. Deliberately a *signed-out* header: offering My Profile or
          Track Orders to someone with no session sends them to an empty page
          and reads as confusing. ProfilePage already switches on isLoggedIn;
          this brings the sign-in screen into line. */}
      <header className="up-header login-header">
        <div className="up-header-inner">
          <a href={appHref('/')} className="up-brand">
            <img
              src={`${import.meta.env.BASE_URL}img/brand/logo.svg`}
              alt=""
              className="up-emblem-mark"
              height="38"
            />
            <div>
              <div className="up-brand-title">HunarLink</div>
              <div className="up-brand-sub">
                {signedIn
                  ? isArtisanSession ? 'Artisan Workspace' : 'User Account'
                  : 'My Account'}
              </div>
            </div>
          </a>
          <nav className="up-nav-links">
            <a href={appHref('/')} className="up-nav-pill">
              <IconArrowRight size={13} className="login-back-arrow" /> Storefront
            </a>
            {signedIn && (
              <a href={appHref(isArtisanSession ? '/seller' : '/profile')} className="up-nav-pill">
                {isArtisanSession ? 'Workspace' : 'My Profile'}
              </a>
            )}
            {signedIn ? (
              <button type="button" className="up-nav-pill" onClick={signOutHere}>
                Sign out
              </button>
            ) : (
              <span className="login-header-hint">New to HunarLink? Pick an account above.</span>
            )}
          </nav>
        </div>
      </header>

      {/* Dedicated User Login / Sign Up Split Card */}
      <main className="login-shell">
        {/* Ambient craft photograph. Decorative only, so it is hidden from
            assistive tech and never carries meaning the page relies on. */}
        <div className="login-ambient" aria-hidden="true">
          <img
            className="login-ambient-img"
            src={`${import.meta.env.BASE_URL}img/artisan-loom-light.jpg`}
            alt=""
            loading="eager"
            decoding="async"
          />
        </div>
        <section className="login-card">
          <div className="login-left">
            <div
              className="login-rail-photo"
              aria-hidden="true"
              style={{ backgroundImage: `url(${import.meta.env.BASE_URL}img/artisan-loom-dark.jpg)` }}
            />
            <div>
              <div className="login-pill" id="left-pill">
                <IconSpark size={11} />
                {role === 'artisan' ? 'Artisan account' : 'User account'}
              </div>
              <h1 id="left-heading">
                {role === 'artisan'
                  ? (isSignin ? 'Your craft, your storefront.' : 'Open your storefront.')
                  : (isSignin ? 'Welcome to HunarLink' : 'Create Your HunarLink Account')}
              </h1>
              <p id="left-desc">
                {role === 'artisan'
                  ? (isSignin
                      ? 'Sign in to manage your listings, answer buyer questions and publish new work straight to the storefront.'
                      : 'List your crafts, get verified against the Valley Verification Flow, and reach connoisseurs without middlemen.')
                  : (isSignin
                      ? 'Track every order from the loom, keep your addresses on file, and buy under HunarLink Escrow.'
                      : 'Follow each piece from the maker\u2019s hands to your door, with its provenance on record.')}
              </p>
            </div>

            <ul className="login-perks">
              {role === 'artisan' ? (
                <>
                  <li><IconTruck size={14} /> Publish listings and track every order in one workspace</li>
                  <li><IconBadgeCheck size={14} /> Guild and GI credentials carried on your storefront</li>
                  <li><IconShield size={14} /> Buyer payments held in escrow until you ship</li>
                </>
              ) : (
                <>
                  <li><IconTruck size={14} /> Five-stage order tracking with GI invoices</li>
                  <li><IconBookmark size={14} /> Saved addresses and a collector wishlist</li>
                  <li><IconShield size={14} /> GI-verified crafts, checked at your door</li>
                </>
              )}
            </ul>
          </div>

          <div className="login-right">
            {/* ---- who is signing in. A segmented control, not two cards:
                    the choice is binary and permanent, so it reads as a setting
                    rather than a step that needs decorating. ---- */}
            <div className="login-head">
              <h2 className="login-title" id="login-title">
                {isSignin
                  ? 'Sign in to your account'
                  : role === 'artisan'
                    ? 'Register your workshop'
                    : 'Create your account'}
              </h2>
              <p className="login-sub" id="login-sub">
                {isSignin
                  ? role === 'artisan'
                    ? 'Manage your listings, buyer questions and payouts.'
                    : 'Track orders, save favourites and follow the makers you collect.'
                  : role === 'artisan'
                    ? 'Tell us about your craft. Verification never asks for a GSTIN.'
                    : 'It takes a minute, and your addresses carry over to checkout.'}
              </p>
            </div>

            <div className="seg" role="group" aria-labelledby="role-label">
              <span className="seg-label" id="role-label">Account</span>
              <div className="seg-track">
                <button
                  type="button"
                  className={`seg-btn${role === 'user' ? ' is-on' : ''}`}
                  id="role-user"
                  aria-pressed={role === 'user'}
                  onClick={() => switchRole('user')}
                >
                  <IconUser size={14} />
                  User
                </button>
                <button
                  type="button"
                  className={`seg-btn${role === 'artisan' ? ' is-on' : ''}`}
                  id="role-artisan"
                  aria-pressed={role === 'artisan'}
                  onClick={() => switchRole('artisan')}
                >
                  <IconSpark size={14} />
                  Artisan
                </button>
              </div>
            </div>

            {/* ---- sign in vs register: quiet tabs, underlined, not filled ---- */}
            <div className="login-tabs" role="tablist">
              <button
                type="button"
                className={`login-tab-btn${isSignin ? ' active' : ''}`}
                id="tab-signin"
                role="tab"
                aria-selected={isSignin}
                onClick={() => switchMode('signin')}
              >
                Sign in
              </button>
              <button
                type="button"
                className={`login-tab-btn${isSignin ? '' : ' active'}`}
                id="tab-signup"
                role="tab"
                aria-selected={!isSignin}
                onClick={() => switchMode('signup')}
              >
                Create account
              </button>
            </div>

            {/* FORM 1: USER SIGN IN (PASSWORD OR 6-DIGIT OTP) */}
            <form
              id={role === 'artisan' ? 'artisan-signin-form' : 'user-signin-form'}
              onSubmit={role === 'artisan' ? submitArtisanSignin : submitSignin}
              style={{display: isSignin ? 'block' : 'none'}}
            >
              <div className="form-field">
                <label className="up-label" htmlFor="signin-identifier">
                  {role === 'artisan'
                    ? 'Email, Mobile Number or Artisan Card Number *'
                    : 'Email Address or Mobile Number *'}
                </label>
                <input
                  type="text"
                  id="signin-identifier"
                  className="up-input"
                  placeholder={role === 'artisan'
                    ? 'e.g. HL-ART-88210, or your email, or +91 94190 88210'
                    : 'e.g. priya.sharma@valleycollector.in or +91 98112 77420'}
                  required
                  value={signin.identifier}
                  onChange={(e) => setSignin({ ...signin, identifier: e.target.value })}
                />
                {role === 'artisan' && (
                  <p className="field-hint">
                    Your Artisan Card Number is the code on your craft identity card.
                  </p>
                )}
              </div>

              <div
                className="form-field"
                id="password-field-wrap"
                style={{display: useOtp ? 'none' : 'block'}}
              >
                <label className="up-label" htmlFor="signin-password">Password *</label>
                <input
                  type="password"
                  id="signin-password"
                  className="up-input"
                  placeholder="Enter your password"
                  required={!useOtp}
                  value={signin.password}
                  onChange={(e) => setSignin({ ...signin, password: e.target.value })}
                />
              </div>

              {/* Optional 6-Digit OTP Mode */}
              <div id="otp-field-wrap" style={{display: useOtp ? 'block' : 'none'}}>
                <div className="otp-helper-box">
                  <span id="otp-status-text">
                    {otpCode ? (
                      <>Your 6-digit HunarLink OTP is <strong style={{letterSpacing: '0.12em'}}>{otpCode}</strong> (valid 10 min)</>
                    ) : (
                      'Generate a 6-digit one-time login code for instant verification.'
                    )}
                  </span>
                  <button
                    type="button"
                    className="btn-orange-outline"
                    style={{padding: '5px 11px', fontSize: '0.74rem'}}
                    onClick={sendOtp}
                  >
                    Send 6-Digit OTP
                  </button>
                </div>
                <div className="form-field">
                  <label className="up-label" htmlFor="signin-otp">Enter 6-Digit OTP *</label>
                  <input
                    type="text"
                    id="signin-otp"
                    className="up-input"
                    maxLength="6"
                    placeholder="e.g. 482910"
                    required={useOtp}
                    value={signin.otp}
                    onChange={(e) => setSignin({ ...signin, otp: e.target.value })}
                  />
                </div>
              </div>

              <div className="login-row-help">
                {/* OTP is a collector convenience. Artisan sign-in always uses a
                    password, whichever of the three identifiers is typed. */}
                {role === 'artisan' ? (
                  <span className="login-row-note">Password required for artisan accounts</span>
                ) : (
                  <label className="login-check">
                    <input
                      type="checkbox"
                      id="toggle-otp-mode"
                      checked={useOtp}
                      onChange={(e) => setUseOtp(e.target.checked)}
                    />
                    <span>Login with 6-Digit OTP instead</span>
                  </label>
                )}
                <button type="button" className="btn-link-edit" onClick={demoLogin}>
                  Use demo account
                </button>
              </div>

              <button type="submit" className="btn-orange" style={{width: '100%', height: '46px'}}>
                <span>Sign in</span>
                <IconArrowRight size={15} />
              </button>
            </form>

            {/* FORM 2: CREATE NEW USER ACCOUNT */}
            <form
              id={role === 'artisan' ? 'artisan-signup-form' : 'user-signup-form'}
              onSubmit={role === 'artisan' ? submitArtisanSignup : submitSignup}
              style={{display: isSignin ? 'none' : 'block'}}
            >
              <div className="form-row-2">
                <div className="form-field">
                  <label className="up-label" htmlFor="su-first">First Name *</label>
                  <input
                    type="text" id="su-first" className="up-input" placeholder="e.g. Priya" required
                    value={signup.firstName}
                    onChange={(e) => setSignup({ ...signup, firstName: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label className="up-label" htmlFor="su-last">Last Name *</label>
                  <input
                    type="text" id="su-last" className="up-input" placeholder="e.g. Sharma" required
                    value={signup.lastName}
                    onChange={(e) => setSignup({ ...signup, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label className="up-label" htmlFor="su-email">Email Address *</label>
                  <input
                    type="email" id="su-email" className="up-input" placeholder="you@example.com" required
                    value={signup.email}
                    onChange={(e) => setSignup({ ...signup, email: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label className="up-label" htmlFor="su-phone">Mobile Number *</label>
                  <input
                    type="tel" id="su-phone" className="up-input" placeholder="+91 98112 77420" required
                    value={signup.phone}
                    onChange={(e) => setSignup({ ...signup, phone: e.target.value })}
                  />
                </div>
              </div>

              {role === 'user' && (
                <>
                  <div className="form-row-2">
                    <div className="form-field">
                      <label className="up-label" htmlFor="su-gender">Gender</label>
                      <select
                        id="su-gender" className="up-select"
                        value={signup.gender}
                        onChange={(e) => setSignup({ ...signup, gender: e.target.value })}
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label className="up-label" htmlFor="su-password">Create Password *</label>
                      <input
                        type="password" id="su-password" className="up-input"
                        placeholder="Min. 6 characters" minLength="6" required
                        value={signup.password}
                        onChange={(e) => setSignup({ ...signup, password: e.target.value })}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-orange" style={{width: '100%', height: '46px', marginTop: '4px'}}>
                    <span>Create account</span>
                    <IconArrowRight size={15} />
                  </button>
                </>
              )}

              {/* ================= ARTISAN ONLY ================= */}
              {role === 'artisan' && (
                <>
                  <div className="form-field">
                    <label className="up-label" htmlFor="shop-name">Shop / Studio Name *</label>
                    <input
                      type="text" id="shop-name" className="up-input"
                      placeholder="e.g. Mir Pashmina Karkhana"
                      value={shop.shopName}
                      onChange={(e) => setShop({ ...shop, shopName: e.target.value })}
                    />
                    <p className="field-hint">Buyers see this name, not your legal name.</p>
                  </div>

                  <div className="form-field">
                    <label className="up-label" htmlFor="shop-card">Artisan Card Number *</label>
                    <input
                      type="text" id="shop-card" className="up-input card-input"
                      placeholder="e.g. HL-ART-88210"
                      required
                      value={shop.cardNo}
                      onChange={(e) => setShop({ ...shop, cardNo: e.target.value.toUpperCase() })}
                    />
                    <p className="field-hint">
                      The number printed on your craft identity card. You will sign in
                      with this, and buyers see it on your storefront beside your trust badge.
                    </p>
                  </div>

                  <div className="form-row-2">
                    <div className="form-field">
                      <label className="up-label" htmlFor="shop-craft">Craft</label>
                      <select
                        id="shop-craft" className="up-select"
                        value={shop.craft}
                        onChange={(e) => setShop({ ...shop, craft: e.target.value })}
                      >
                        <option value="">Select your craft</option>
                        <option value="Pashmina">Pashmina</option>
                        <option value="Kani">Kani shawl</option>
                        <option value="Sozni">Sozni embroidery</option>
                        <option value="Walnut wood">Walnut wood carving</option>
                        <option value="Papier-m&acirc;ch&eacute;">Papier-m&acirc;ch&eacute;</option>
                        <option value="Carpet">Hand-knotted carpet</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label className="up-label" htmlFor="shop-district">District</label>
                      <select
                        id="shop-district" className="up-select"
                        value={shop.district}
                        onChange={(e) => setShop({ ...shop, district: e.target.value })}
                      >
                        {DISTRICTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* ---- how we verify a maker without a GSTIN ---- */}
                  <div className="verify-head">
                    <span className="verify-head-title">Craft verification</span>
                    <span className="verify-head-sub">
                      We check provenance, not turnover &mdash; no GSTIN required.
                    </span>
                  </div>

                  <div className="path-list" role="radiogroup" aria-label="Craft verification method">
                    {Object.values(PATHS).map((p) => (
                      <button
                        type="button"
                        key={p.key}
                        role="radio"
                        aria-checked={path === p.key}
                        className={`path-opt${path === p.key ? ' is-on' : ''}`}
                        id={`path-${p.key}`}
                        onClick={() => { setPath(p.key); setRefCheck(null); setRefMatch(null); }}
                      >
                        <span className="path-dot" aria-hidden="true">
                          {path === p.key && <IconCheck size={9} />}
                        </span>
                        <span className="path-body">
                          <span className="path-title">{p.title}</span>
                          <span className="path-blurb">{p.blurb}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  {path === 'reference' && (
                    <div className="ref-block">
                      <label className="up-label" htmlFor="ref-code">Guild Reference Code *</label>
                      <div className="ref-row">
                        <input
                          type="text" id="ref-code" className="up-input ref-input"
                          placeholder="HL-PASH-8821"
                          value={refCode}
                          onChange={(e) => { setRefCode(e.target.value.toUpperCase()); setRefCheck(null); }}
                        />
                        <button
                          type="button" className="ref-btn"
                          onClick={() => verifyReference(refCode)}
                        >
                          Check
                        </button>
                      </div>

                      {refCheck === 'ok' && refMatch && (
                        <div className="ref-result ok" id="ref-result" role="status">
                          <strong><IconBadgeCheck size={13} /> Vouched for by {refMatch.artisan}</strong>
                          <span>{refMatch.guild} &middot; {refMatch.district}</span>
                          <span className="ref-note">
                            The guild office will ring you to confirm before your shop goes live.
                          </span>
                        </div>
                      )}
                      {refCheck === 'bad' && (
                        <div className="ref-result bad" id="ref-result" role="alert">
                          <strong><IconX size={12} /> We could not verify that code</strong>
                          <span>{refMatch?.reason}</span>
                        </div>
                      )}

                      <p className="field-hint">
                        Ask any HunarLink artisan or your guild office for a code.
                        Try <strong>HL-PASH-8821</strong> to see how it works.
                      </p>
                    </div>
                  )}

                  {path === 'craftmark' && (
                    <div className="form-field">
                      <label className="up-label" htmlFor="craft-id">Craftmark / CDI Identity Number *</label>
                      <input
                        type="text" id="craft-id" className="up-input"
                        placeholder="e.g. CDI-2019-44821"
                        value={craftId}
                        onChange={(e) => setCraftId(e.target.value.toUpperCase())}
                      />
                      <p className="field-hint">
                        Issued by the Craft Development Institute, Srinagar. We check it against their register.
                      </p>
                    </div>
                  )}

                  {path === 'new' && (
                    <div className="probation-note" id="probation-note">
                      <strong><IconSeedling size={13} /> You can start today.</strong>
                      <span>
                        Register now and list your work straight away. A verifier books a short
                        video call to watch you at the loom, and your shop shows a
                        <em> Verified Artisan </em> badge once that clears. Until then buyers see
                        &ldquo;New Artisan&rdquo;.
                      </span>
                    </div>
                  )}

                  <div className="form-field" style={{marginTop: '14px'}}>
                    <label className="up-label" htmlFor="su-password">Create Password *</label>
                    <input
                      type="password" id="su-password" className="up-input"
                      placeholder="At least 8 characters" minLength="8" required
                      value={signup.password}
                      onChange={(e) => setSignup({ ...signup, password: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="btn-orange" style={{width: '100%', height: '46px', marginTop: '4px'}}>
                    <span>Create my shop</span>
                    <IconArrowRight size={15} />
                  </button>
                </>
              )}
            </form>

            <div className="login-swap">
              <span>
                {isSignin ? 'Don\u2019t have an account?' : 'Already have an account?'}
              </span>
              <button
                type="button"
                className="login-swap-link"
                onClick={() => switchMode(isSignin ? 'signup' : 'signin')}
              >
                {isSignin ? 'Create account' : 'Sign in'}
                <IconArrowRight size={13} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <div className="up-toast" id="up-toast"></div>
    </>
  );
}

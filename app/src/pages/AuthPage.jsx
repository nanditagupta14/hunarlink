import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useStore } from '../state/StoreContext.jsx';
import { AUTH_CONFIG, DEMO_ARTISANS } from '../data/authConfig.js';
import AuthMarkup from './auth/AuthMarkup.jsx';
import '../styles/auth.css';
import { IconFile, IconHammer, IconShield } from '../components/LineIcons.jsx';

/* ==========================================================================
   AuthPage — Artisan login, registration and password reset
   --------------------------------------------------------------------------
   Three states in one surface: login, register (with GI certification or as a
   standard seller), and forgot-password. The state lives in the URL as well as
   in React, so a shared link opens the same pane.

   The live-camera verification suite is ported with the same rules the static
   build enforced — a GI-registered artisan must capture a certificate photo, a
   workshop video and a passport photo before the account is created, and a
   gallery upload is only the fallback when no camera exists. Nothing is faked:
   if getUserMedia is unavailable or denied, the file input is what you get.

   Signed-in artisans land on the seller workspace. Buyers are handled on
   /login, which shares the same profile key.
   ========================================================================== */

const AUTOFILL_CREDS = {
  artisan_mir: ['ghulam.mir@zadibalpashmina.com', 'SozniLoom100%'],
  artisan_wani: ['fayaz.wani@anantnagcrafts.org', 'WalnutArtisan#1']
};

export default function AuthPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { setUser, toast, catalogue, platformUsers, setPlatformUsers } = useStore();

  const mode = ['login', 'register', 'forgot'].includes(params.get('mode'))
    ? params.get('mode')
    : 'login';
  const [giMode, setGiMode] = useState('with_gi');
  const [pwShown, setPwShown] = useState({});
  const [busy, setBusy] = useState(false);
  const [skillCount, setSkillCount] = useState(0);
  /* Register fields are controlled here rather than read back off the DOM.
     Reading by id worked in the static build because the DOM was the state; in
     React it silently produced empty values whenever the node had been
     re-rendered. */
  const [reg, setReg] = useState({
    name: '', phone: '', email: '', password: '', cpassword: '',
    craft: 'pashmina', business: '', district: 'Srinagar',
    giId: '', skill: '', terms: false
  });
  const [login, setLogin] = useState({ email: '', password: '' });
  const setLoginField = (key) => (e) =>
    setLogin((l) => ({ ...l, [key]: e.target.value }));
  const setRegField = (key) => (e) =>
    setReg((r) => ({ ...r, [key]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const [flashMsg, setFlashMsg] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');

  /* ======================================================== capture suite
     The static build drove all of this through getElementById: it set
     video.srcObject, flipped .is-done on status pills, wrote timer text and
     toggled button display by id. Every one of those nodes is React-owned now,
     so the same job is done with refs (the parts that are imperative by nature
     — MediaStream, MediaRecorder, <video> elements) and state (the parts that
     are rendered: stage visibility, preview, pill text, button row).

     Refs hold only what React must not re-render on: the live stream, the
     recorder, the chunk buffer and the elapsed-seconds counter.
     ========================================================== */
  const media = useRef({
    stream: null,
    recorder: null,
    chunks: [],
    seconds: 0,
    timer: null,
    activeType: null
  });

  /* one <video> per capture card, so the stream can be attached directly */
  const videoEls = useRef({ cert: null, video: null, passport: null });
  const fileEls = useRef({ cert: null, video: null, passport: null });

  /* rendered state: 'idle' -> stage hidden, 'live' -> camera stage visible */
  const [captureUI, setCaptureUI] = useState({
    cert: { phase: 'idle', error: '', label: '', capturedAt: '' },
    video: { phase: 'idle', error: '', label: '', capturedAt: '', recording: false },
    passport: { phase: 'idle', error: '', label: '', capturedAt: '' }
  });
  /* the captured media itself, as a data URL (images) or object URL (video) */
  const [shots, setShots] = useState({ cert: null, video: null, passport: null });
  const [recSeconds, setRecSeconds] = useState(0);

  const patchUI = (type, patch) =>
    setCaptureUI((ui) => ({ ...ui, [type]: { ...ui[type], ...patch } }));

  const conf =
    mode === 'forgot' ? AUTH_CONFIG.forgot : AUTH_CONFIG[`${mode}_artisan`];

  const setMode = useCallback(
    (next) => {
      if (next !== 'register') stopAllCameras();
      setParams({ mode: next, role: 'artisan' }, { replace: true });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams]
  );

  /* The page was authored against its own root scale; claim it while mounted
     and hand it back on the way out. */
  useEffect(() => {
    document.documentElement.classList.add('auth-route');
    return () => document.documentElement.classList.remove('auth-route');
  }, []);

  /* ------------------------------------------------------------- messaging */
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef(null);

  const flash = (msg) => {
    setFlashMsg(msg);
    toast(msg, msg.startsWith('\u26a0') ? 'error' : 'default');
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 3200);
  };

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  /* ------------------------------------------------------------- passwords
     Controlled: the input's type is derived from state instead of being
     rewritten on the node after render. */
  const togglePw = (id) => setPwShown((p) => ({ ...p, [id]: !p[id] }));
  const pwType = (id) => (pwShown[id] ? 'text' : 'password');

  /* --------------------------------------------------------- camera suite */
  function stopAllCameras() {
    const m = media.current;
    if (m.timer) clearInterval(m.timer);
    if (m.recorder && m.recorder.state !== 'inactive') {
      try {
        m.recorder.stop();
      } catch (e) {
        /* already stopped */
      }
    }
    if (m.stream) m.stream.getTracks().forEach((t) => t.stop());
    m.stream = null;
    m.recorder = null;
    m.chunks = [];
    m.activeType = null;
    m.timer = null;
    m.seconds = 0;
    setRecSeconds(0);
    /* put every card back to idle, keeping anything already captured */
    setCaptureUI((ui) => ({
      cert: { ...ui.cert, phase: ui.cert.phase === 'captured' ? 'captured' : 'idle' },
      video: {
        ...ui.video,
        phase: ui.video.phase === 'captured' ? 'captured' : 'idle',
        recording: false
      },
      passport: { ...ui.passport, phase: ui.passport.phase === 'captured' ? 'captured' : 'idle' }
    }));
  }

  useEffect(() => stopAllCameras, []);

  async function openCamera(type) {
    stopAllCameras();
    media.current.activeType = type;
    patchUI(type, { phase: 'live', error: '' });

    /* the stage has to be mounted before the stream can be attached to it */
    await new Promise((r) => requestAnimationFrame(r));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'passport' ? { facingMode: 'user' } : { facingMode: 'environment' },
        audio: type === 'video'
      });
      media.current.stream = stream;
      const el = videoEls.current[type];
      if (el) {
        el.srcObject = stream;
        await el.play().catch(() => {});
      }
    } catch (e) {
      /* no camera, or the visitor declined — the upload path stays available */
      patchUI(type, {
        phase: 'live',
        error:
          '\u26a0\ufe0f Camera unavailable or permission denied. Use the upload button instead.'
      });
    }
  }

  function capturePhoto(type) {
    const el = videoEls.current[type];
    if (!el || !el.videoWidth) {
      flash('\u26a0\ufe0f Start the camera first, then capture.');
      return;
    }
    const canvas = document.createElement('canvas');
    if (type === 'passport') {
      /* 35 x 45 mm at 300dpi, centre-cropped — the passport size the copy
         promises */
      canvas.width = 413;
      canvas.height = 531;
    } else {
      canvas.width = el.videoWidth;
      canvas.height = el.videoHeight;
    }
    const ctx = canvas.getContext('2d');
    if (type === 'passport') {
      const min = Math.min(el.videoWidth, el.videoHeight * (413 / 531));
      const sx = (el.videoWidth - min) / 2;
      const sy = (el.videoHeight - min * (531 / 413)) / 2;
      ctx.drawImage(el, sx, sy, min, min * (531 / 413), 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
    }
    const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    setShots((s) => ({ ...s, [type]: dataUrl }));
    stopAllCameras();
    patchUI(type, {
      phase: 'captured',
      error: '',
      label: 'Live capture',
      capturedAt: new Date().toLocaleString('en-IN')
    });
  }

  function handleCaptureFile(type, ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;

    if (type === 'video') {
      const url = URL.createObjectURL(file);
      setShots((s) => ({ ...s, video: url }));
      stopAllCameras();
      patchUI('video', {
        phase: 'captured',
        error: '',
        label: 'Uploaded from this device',
        capturedAt: new Date().toLocaleString('en-IN'),
        recording: false
      });
      flash('Workshop video attached from this device.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setShots((s) => ({ ...s, [type]: reader.result }));
      stopAllCameras();
      patchUI(type, {
        phase: 'captured',
        error: '',
        label: 'Uploaded from this device',
        capturedAt: new Date().toLocaleString('en-IN')
      });
    };
    reader.readAsDataURL(file);
  }

  function startRecording() {
    const m = media.current;
    if (!m.stream) {
      flash('\u26a0\ufe0f Start the camera first.');
      return;
    }
    const rec = new MediaRecorder(m.stream);
    m.chunks = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) m.chunks.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(m.chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const secs = m.seconds;
      setShots((s) => ({ ...s, video: url }));
      patchUI('video', {
        phase: 'captured',
        error: '',
        label: `Live recording \u2022 ${secs}s`,
        capturedAt: new Date().toLocaleString('en-IN'),
        recording: false
      });
    };
    m.recorder = rec;
    rec.start();
    m.seconds = 0;
    setRecSeconds(0);
    patchUI('video', { recording: true });
    m.timer = setInterval(() => {
      m.seconds += 1;
      setRecSeconds(m.seconds);
      if (m.seconds >= 30 && m.recorder && m.recorder.state === 'recording') stopRecording();
    }, 1000);
  }

  function stopRecording() {
    const m = media.current;
    if (m.timer) clearInterval(m.timer);
    m.timer = null;
    if (m.recorder && m.recorder.state !== 'inactive') m.recorder.stop();
    if (m.stream) m.stream.getTracks().forEach((t) => t.stop());
    m.stream = null;
    patchUI('video', { recording: false });
  }

  function updateSkillCount(e) {
    setSkillCount((e?.target?.value || '').trim().length);
  }

  /* --------------------------------------------------------------- sign in */
  function signInArtisan(profile) {
    const authUser = {
      ...profile,
      role: 'artisan',
      giCertified: !!profile.giId,
      verified: true,
      isLoggedIn: true,
      loginTime: new Date().toISOString()
    };
    setUser(authUser);
    flash(`Welcome ${authUser.name}! Verified Artisan Session Active. Opening Seller Portal...`);
    setTimeout(() => navigate('/seller'), 900);
  }

  function submitLogin(e) {
    e.preventDefault();
    const email = String(login.email || '').trim();
    const pwd = login.password;

    if (!email || !pwd) {
      flash('\u26a0\ufe0f Please enter both your email address and password.');
      return;
    }

    const accounts = platformUsers;
    const known = accounts.find(
      (a) => String(a.email || '').toLowerCase() === email.toLowerCase()
    );

    if (!known) {
      flash(
        `\u26a0\ufe0f No artisan account found for "${email}". Please register first, or use a Quick Evaluator Demo pill below.`
      );
      return;
    }
    if (known.role && known.role !== 'artisan') {
      flash(
        `\u26a0\ufe0f "${email}" is a Buyer account. Please use the User Login portal instead.`
      );
      return;
    }
    if (String(known.password || '') !== pwd) {
      flash(
        `\u26a0\ufe0f Incorrect password for "${email}". Try again or use a Quick Evaluator Demo pill.`
      );
      return;
    }

    signInArtisan({
      name: known.name || 'Verified Artisan',
      email: known.email || email,
      phone: known.phone || '+91 00000 00000',
      business: known.business || 'Kashmir Heritage Atelier',
      craft: known.craft || 'pashmina',
      district: known.district || 'Srinagar',
      cluster: known.district || 'Srinagar',
      giCertified: !!known.giCertified,
      giId: known.giId || null,
      badge: known.badge || 'AR',
      title: known.title || 'Verified Artisan \u2022 Kashmir Heritage Guild'
    });
  }

  function quickFill(which) {
    const demo = DEMO_ARTISANS[which] || {};
    setMode('login');
    setLogin({ email: demo.email || '', password: AUTOFILL_CREDS[which]?.[1] || '' });
    signInArtisan({ ...demo });
  }

  /* -------------------------------------------------------------- register */
  function submitRegister(e) {
    e.preventDefault();
    const val = (key) => String(reg[key] || '').trim();
    const name = val('name');
    const phone = val('phone');
    const email = val('email');
    const pwd = reg.password;
    const cpwd = reg.cpassword;
    const craft = val('craft');
    const business = val('business');
    const district = val('district');

    if (!name || !phone || !email) {
      flash('\u26a0\ufe0f Name, mobile number and email are required.');
      return;
    }
    if (!reg.terms) {
      flash('\u26a0\ufe0f Please accept the artisan charter to continue.');
      return;
    }

    if (pwd !== cpwd) {
      flash('\u26a0\ufe0f Passwords do not match. Please verify.');
      return;
    }

    let giId = null;
    let skillDescription = null;

    if (giMode === 'with_gi') {
      giId = val('giId');
      skillDescription = val('skill');
      if (!giId) {
        flash('\u26a0\ufe0f Please enter your official GI Certification / Tag ID.');
        return;
      }
      if (!capture.current.cert) {
        flash('\u26a0\ufe0f Please capture a live camera photo of your GI Certificate.');
        document.getElementById('live-cert-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (!capture.current.video) {
        flash('\u26a0\ufe0f Please record a live video of your product or workshop/warehouse.');
        document.getElementById('live-video-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (!capture.current.passport) {
        flash('\u26a0\ufe0f Please capture your live passport-size seller photo.');
        document.getElementById('live-passport-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (skillDescription.length < 20) {
        flash('\u26a0\ufe0f Please describe your craft & skill in at least 20 characters.');
        return;
      }
    }

    stopAllCameras();

    const accounts = platformUsers;
    if (accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      flash('\u26a0\ufe0f An artisan account with this email already exists. Please sign in instead.');
      return;
    }

    const initials =
      name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'AR';

    const newAccount = {
      email,
      phone: `+91 ${phone}`,
      password: pwd,
      role: 'artisan',
      name,
      business,
      craft,
      district,
      giCertified: giMode === 'with_gi',
      giId,
      title:
        giMode === 'with_gi'
          ? `GI-Verified Artisan (${giId}) \u2022 ${district} Cluster`
          : `Standard Artisan \u2022 ${district} Cluster`,
      badge: initials
    };
    /* a new array, never a push onto store state */
    setPlatformUsers([...accounts, newAccount]);

    signInArtisan({
      name,
      email,
      phone: `+91 ${phone}`,
      business,
      craft,
      district,
      giId,
      skillDescription,
      badge: initials,
      title:
        giMode === 'with_gi'
          ? `GI-Verified Artisan (${giId}) \u2022 ${district} Cluster`
          : `Standard Artisan \u2022 ${district} Cluster`
    });
  }

  function submitForgot(e) {
    e.preventDefault();
    const email = String(forgotEmail || '').trim();
    if (!email) return;
    flash(`\u2709\ufe0f Password reset link dispatched to ${email}! Check inbox & spam.`);
    setTimeout(() => setMode('login'), 2000);
  }

  function socialAuth(provider) {
    flash(`Connecting to ${provider} Secure Identity Gateway...`);
    setTimeout(() => {
      signInArtisan({
        ...DEMO_ARTISANS.artisan_mir,
        name: 'Master Ghulam Qadir Mir',
        email: 'ustad.mir@gmail.com',
        title: 'Master Artisan \u2022 Srinagar Pashmina Guild',
        socialProvider: provider
      });
    }, 600);
  }

  function footerPrompt() {
    handleFooterAction(conf.footerAction);
  }

  function handleFooterAction(action) {
    setMode(action === 'register' ? 'register' : 'login');
  }

  /* ------------------------------------------------------------ hero pane */
  const cards = conf.cards;

  return (
    <>
      <div className="auth-container">
        <aside className="auth-hero-pane" id="auth-hero-pane">
          <div className="auth-hero-content">
            <div className="hero-top-bar">
              <Link to="/" className="hero-brand-logo">
                HunarLink
              </Link>
              <div className="hero-badge-pill">
                <span className="pill-dot">&#10058;</span> AUTHENTIC &bull; TRACEABLE &bull;
                ARTISAN-CENTRIC
              </div>
            </div>

            <div className="hero-middle-body">
              <h1 className="hero-headline" id="hero-headline">
                {conf.headline.map((line, i) => (
                  <React.Fragment key={line}>
                    {i > 0 && <br />}
                    {i === conf.headline.length - 1 && conf.headline.length > 1 ? (
                      <span className="accent-gold">{line}</span>
                    ) : (
                      line
                    )}
                  </React.Fragment>
                ))}
              </h1>
              <div className="hero-divider-bar" />
              <p className="hero-subtext" id="hero-subtext">
                {conf.subtext}
              </p>
            </div>

            <div
              className={`hero-cards-grid${cards.length === 3 ? ' three-cols' : ''}`}
              id="hero-cards-grid"
            >
              {cards.map((c) => (
                <div className="hero-card" key={c.title}>
                  <div className="hero-card-icon">{c.icon}</div>
                  <div className="hero-card-title">{c.title}</div>
                  <div className="hero-card-desc">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="auth-form-pane">
          <div className="form-inner-wrap">
            <div className="auth-back-nav">
              {mode === 'forgot' ? (
                <a
                  href="#"
                  className="auth-back-link"
                  id="auth-back-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setMode('login');
                  }}
                >
                  &larr; Back to Login
                </a>
              ) : (
                <Link to="/" className="auth-back-link" id="auth-back-link">
                  &larr; Back to Home
                </Link>
              )}
            </div>

            <div className="form-heading-group">
              <h2 className="form-title" id="form-title">
                {conf.title}
              </h2>
              <p className="form-subtitle" id="form-subtitle">
                {conf.subtitle}
              </p>
            </div>

            {/* the mode switchers, restored here as the single copy */}
            <div
              className="auth-pill-switcher"
              id="auth-pill-switcher"
              style={{ display: mode === 'login' ? 'flex' : 'none' }}
            >
              <div className="auth-pill-btn active" id="pill-artisan" style={{ cursor: 'default' }}>
                <span className="pill-icon"><IconHammer size={15} /></span>{' '}
                <span id="pill-artisan-text">{conf.artisanPillText}</span>
              </div>
            </div>

            <div
              className="gi-choice-switcher"
              id="gi-register-switcher"
              style={{ display: mode === 'register' ? 'grid' : 'none' }}
              role="tablist"
              aria-label="Seller GI Certification Status"
            >
              <button
                type="button"
                className={`gi-choice-btn${giMode === 'with_gi' ? ' active' : ''}`}
                id="btn-has-gi"
                role="tab"
                aria-selected={giMode === 'with_gi'}
                onClick={() => setGiMode('with_gi')}
              >
                <span className="gi-choice-title">
                  <IconShield size={15} />&#65039; Have GI Certification / Tag
                </span>
                <span className="gi-choice-sub">
                  Enter GI ID + live camera &amp; skill verification
                </span>
              </button>
              <button
                type="button"
                className={`gi-choice-btn${giMode === 'no_gi' ? ' active' : ''}`}
                id="btn-no-gi"
                role="tab"
                aria-selected={giMode === 'no_gi'}
                onClick={() => setGiMode('no_gi')}
              >
                <span className="gi-choice-title"><IconFile size={15} /> No GI Certification / Tag</span>
                <span className="gi-choice-sub">Standard seller account registration</span>
              </button>
            </div>

            {/* The forms themselves are the original markup. */}
            <AuthFormShell mode={mode} visible={mode}>
              <AuthMarkup
                giMode={giMode}
                setGiMode={setGiMode}
                mode={mode}
                formTitle={conf.title}
                formSubtitle={conf.subtitle}
                submitBtnText={conf.submitBtnText}
                submitBtnText={conf.submitBtnText}
                reg={reg}
                setRegField={setRegField}
                login={login}
                setLoginField={setLoginField}
                submitLogin={submitLogin}
                submitRegister={submitRegister}
                submitForgot={submitForgot}
                togglePw={togglePw}
                setMode={setMode}
                openCamera={openCamera}
                capturePhoto={capturePhoto}
                handleCaptureFile={handleCaptureFile}
                startRecording={startRecording}
                stopRecording={stopRecording}
                stopAllCameras={stopAllCameras}
                updateSkillCount={updateSkillCount}
                flash={flash}
                quickFill={quickFill}
                forgotEmail={forgotEmail}
                setForgotEmail={(e) => setForgotEmail(e.target.value)}
                captureUI={captureUI}
                shots={shots}
                recSeconds={recSeconds}
                setVideoEl={(type, el) => { videoEls.current[type] = el; }}
                setFileEl={(type, el) => { fileEls.current[type] = el; }}
                files={fileEls.current}
                pwType={pwType}
              />
            </AuthFormShell>

            <div
              className="auth-social-section"
              id="auth-social-section"
              style={{ display: mode === 'forgot' ? 'none' : 'block' }}
            >
              <div className="social-divider">
                <span>or continue with</span>
              </div>
              <div className="social-btns-grid">
                <button
                  type="button"
                  className="btn-social"
                  onClick={() => socialAuth('Google')}
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1a7 7 0 0 1-6.6-4.8H1.4v3.1A12 12 0 0 0 12 24z"
                    />
                    <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
                    <path
                      fill="#EA4335"
                      d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1A7 7 0 0 1 12 4.8z"
                    />
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  className="btn-social"
                  onClick={() => socialAuth('Apple')}
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
                    <path d="M16.4 12.9c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9s-1.9-.9-3.1-.8c-1.6 0-3 .9-3.9 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3.1-.7s1.9.7 3.1.7 2.1-1.1 2.9-2.2c.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.7zM14 5.4c.6-.8 1.1-1.9 1-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3z" />
                  </svg>
                  Apple
                </button>
              </div>
            </div>

            <div className="auth-footer-prompt" id="auth-footer-prompt">
              <span>{conf.footerText}</span>{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  footerPrompt();
                }}
              >
                {conf.footerLinkText}
              </a>
            </div>

            <div className="demo-evaluator-card">
              <div className="demo-evaluator-header">
                <span className="demo-evaluator-title">Quick Evaluator Demo Logins</span>
                <span className="demo-evaluator-badge">One-Tap Auth</span>
              </div>
              <div className="demo-pills-row">
                <button
                  type="button"
                  className="btn-demo-pill"
                  onClick={() => quickFill('artisan_wani')}
                >
                  &#9679; Artisan: Fayaz Ahmad (Walnut)
                </button>
                <button
                  type="button"
                  className="btn-demo-pill"
                  onClick={() => quickFill('artisan_mir')}
                >
                  &#9679; Artisan: Ustad Mir (Pashmina)
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>

      <div className={`auth-toast${toastVisible ? ' show' : ''}`} id="auth-toast">
        {flashMsg}
      </div>
    </>
  );
}

/* The three forms are separate <form> elements. Which one is on screen is a
   property of the route, so the shell sets each one's display from `mode` in
   the markup. The previous version hid all three and then un-hid one by id in
   an effect, which left the forms invisible for a frame on every mode change
   and depended on nodes it did not own. */
const FORM_FOR_MODE = { login: 'form-login', register: 'form-artisan-register', forgot: 'form-forgot' };

function AuthFormShell({ mode, children }) {
  const active = FORM_FOR_MODE[mode] || 'form-login';
  return (
    <div data-active-form={active}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        /* AuthMarkup owns the three <form> nodes; tell it which to show */
        return React.cloneElement(child, {
          showLogin: active === 'form-login',
          showRegister: active === 'form-artisan-register',
          showForgot: active === 'form-forgot'
        });
      })}
    </div>
  );
}

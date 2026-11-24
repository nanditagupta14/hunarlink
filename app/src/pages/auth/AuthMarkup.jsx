import React from 'react';
import '../../styles/auth.css';

/* ==========================================================================
   AuthMarkup — the three forms and the demo bar, exactly as authored
   --------------------------------------------------------------------------
   Generated from auth.html by tools/html2page.py and then trimmed to the
   region the page needs: the hero pane, the heading, the mode switchers and
   the social row all belong to AuthPage because they change with state. What
   is left here is the part that is genuinely static markup — login, register
   (with the camera suite) and forgot — plus the evaluator demo bar.

   Handlers are passed in as props. Nothing here writes to the DOM.
   ========================================================================== */

export default function AuthMarkup(props) {
  const {
    giMode, setGiMode, togglePw, setMode,
    openCamera, capturePhoto, handleCaptureFile,
    startRecording, stopRecording, stopAllCameras,
    updateSkillCount, flash, quickFill,
    submitLogin, submitRegister, submitForgot,
    submitBtnText = 'Sign In to Workspace \u2192',
    reg = {}, setRegField, login = {}, setLoginField,
    /* capture state, rendered instead of written to the DOM */
    captureUI = { cert: {}, video: {}, passport: {} },
    shots = {}, recSeconds = 0,
    setVideoEl, setFileEl, files,
    /* form visibility + controlled fields */
    showLogin = true, showRegister = false, showForgot = false,
    pwType = () => 'password',
    forgotEmail = '', setForgotEmail
  } = props;

  const cam = (type) => captureUI[type] || {};
  const isLive = (type) => cam(type).phase === 'live';
  const isCaptured = (type) => cam(type).phase === 'captured';
  /* while the camera is live the card offers snap/cancel; once something is
     captured it offers retake/upload. Never both. */
  const btn = (type) => {
    const c = cam(type);
    /* v1 revealed the "no camera" fallback proactively when the browser has no
       camera API at all, instead of waiting for a failed getUserMedia */
    const noCameraApi =
      typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia;
    if (noCameraApi && c.phase !== 'captured' && c.phase !== 'live') {
      return { open: true, snap: false, cancel: false, retake: false, upload: true };
    }
    if (c.phase === 'captured') return { open: false, snap: false, cancel: false, retake: true, upload: true };
    if (c.phase === 'live') return { open: false, snap: true, cancel: true, retake: false, upload: true };
    return { open: true, snap: false, cancel: false, retake: false, upload: false };
  };
  const show = (on) => ({ display: on ? 'inline-flex' : 'none' });
  const formatTimer = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const sec = String(secs % 60).padStart(2, '0');
    return `${m}:${sec}`;
  };
  /* clicking a hidden file input is the one thing that stays imperative:
     it is a browser gesture, not a state change */
  const fileEls = { click: (type) => { const el = files && files[type]; if (el) el.click(); } };

  return (
    <>
        <form id="form-login" style={{display: showLogin ? 'block' : 'none'}} onSubmit={submitLogin}>
          {/* Email Address */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </span>
              <input type="email" id="login-email" aria-label="Email address" className="input-field" placeholder="Enter your email" required
                value={login.email || ''} onChange={setLoginField('email')} />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </span>
              <input type={pwType('login-password')} id="login-password" aria-label="Password" className="input-field" placeholder="Enter your password" required
                value={login.password || ''} onChange={setLoginField('password')} />
              <button type="button" className="input-btn-eye" onClick={() => togglePw('login-password')}
                aria-label="Toggle password visibility">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
          </div>

          {/* Options: Remember Me & Forgot Password */}
          <div className="form-options-row">
            <label className="checkbox-label">
              <input type="checkbox" id="login-remember" checked />
              <span>Remember me</span>
            </label>
            <a href="#" className="link-forgot" onClick={(e) => { e.preventDefault(); setMode('forgot'); }}>Forgot Password?</a>
          </div>

          {/* Primary Submit Button */}
          <button type="submit" className="btn-submit-auth" id="login-submit-btn">
            {submitBtnText}
          </button>
        </form>

        {/* ====================================================================
             FORM 2: CREATE ARTISAN ACCOUNT (GI-CERTIFIED OR STANDARD SELLER)
             ==================================================================== */}
        <form id="form-artisan-register" style={{display: showRegister ? 'block' : 'none'}} onSubmit={submitRegister}>

          {/* Info Banner for Standard Seller (No GI Certification) */}
          <div className="no-gi-info-banner" id="no-gi-info-banner" style={{display: giMode === 'no_gi' ? 'flex' : 'none'}}>
            <span style={{fontSize: '1rem', lineHeight: '1'}}>ℹ️</span>
            <div>
              <strong>Standard Seller Account:</strong> Enter your basic artisan details below to create your account
              right away. You can apply for GI Certification anytime later from your Artisan Studio.
            </div>
          </div>

          {/* Row 1: Full Name & Phone */}
          <div className="form-grid-2col">
            <div className="form-group">
              <label className="form-label">Full Name <span className="req">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </span>
                <input type="text" id="artisan-reg-name" aria-label="Full name" className="input-field" placeholder="Enter your full name"
                  required value={reg.name || ''} onChange={setRegField('name')} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number <span className="req">*</span></label>
              <div className="input-wrapper phone-wrap">
                <div className="phone-prefix-box">
                  <span className="phone-prefix">🇮🇳 +91</span>
                </div>
                <input type="tel" id="artisan-reg-phone" aria-label="Mobile number" className="input-field" placeholder="Enter mobile number" required value={reg.phone || ''} onChange={setRegField('phone')} />
              </div>
            </div>
          </div>

          {/* Row 2: Email & Password */}
          <div className="form-grid-2col">
            <div className="form-group">
              <label className="form-label">Email Address <span className="req">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </span>
                <input type="email" id="artisan-reg-email" aria-label="Email address" className="input-field" placeholder="Enter your email" required value={reg.email || ''} onChange={setRegField('email')} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password <span className="req">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input type={pwType('artisan-reg-password')} id="artisan-reg-password" aria-label="Password" className="input-field" placeholder="Create strong password"
                  required value={reg.password || ''} onChange={setRegField('password')} />
                <button type="button" className="input-btn-eye" onClick={() => togglePw('artisan-reg-password')}
                  aria-label="Toggle password">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: Confirm Password & Craft Category */}
          <div className="form-grid-2col">
            <div className="form-group">
              <label className="form-label">Confirm Password <span className="req">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input type={pwType('artisan-reg-cpassword')} id="artisan-reg-cpassword" aria-label="Confirm password" className="input-field" placeholder="Re-enter password"
                  required value={reg.cpassword || ''} onChange={setRegField('cpassword')} />
                <button type="button" className="input-btn-eye" onClick={() => togglePw('artisan-reg-cpassword')}
                  aria-label="Toggle password">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Craft Category <span className="req">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                </span>
                <select id="artisan-reg-craft" aria-label="Craft category" className="input-field" required value={reg.craft || ''} onChange={setRegField('craft')} >
                  <option value="" disabled>Select Craft Discipline</option>
                  <option value="walnut">Walnut Woodcarving</option>
                  <option value="pashmina">Pashmina &amp; Cashmere Weaving</option>
                  <option value="papier-mache">Papier-Mâché Naqash Art</option>
                  <option value="silk-rugs">Silk Rugs &amp; Hand-Knotted Carpets</option>
                  <option value="kani-sozni">Kani Loom &amp; Sozni Needlework</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 4: Business / Workshop Name & City/District */}
          <div className="form-grid-2col">
            <div className="form-group">
              <label className="form-label">Business / Atelier Name <span className="req">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                </span>
                <input type="text" id="artisan-reg-business" aria-label="Business or atelier name" className="input-field"
                  placeholder="e.g. Wani Woodcraft Atelier" required value={reg.business || ''} onChange={setRegField('business')} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">City / District Cluster <span className="req">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </span>
                <select id="artisan-reg-district" aria-label="District cluster" className="input-field" required value={reg.district || ''} onChange={setRegField('district')} >
                  <option value="" disabled>Select J&amp;K Cluster</option>
                  <option value="Srinagar">Srinagar (Old City Craft Corridor)</option>
                  <option value="Anantnag">Anantnag (Mattan Wood &amp; Loom Cluster)</option>
                  <option value="Budgam">Budgam (Kanihama Loom Cluster)</option>
                  <option value="Baramulla">Baramulla (North Valley Guild)</option>
                  <option value="Bandipora">Bandipora (Wular Heritage Guild)</option>
                  <option value="Ganderbal">Ganderbal (Sindh River Loom Cluster)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ================================================================
               GI-CERTIFIED SELLER VERIFICATION SUITE (LIVE CAMERA ONLY)
               ================================================================ */}
          <div className="gi-verification-section" id="gi-verification-section" style={{display: giMode === 'with_gi' ? 'block' : 'none'}}>
            <div className="gi-section-header">
              <div className="gi-section-title">GI Certification &amp; Live Verification</div>
              <span className="gi-live-only-badge">● Live Camera • Auto Gallery Fallback</span>
            </div>

            {/* 1. GI Certification / Tag ID */}
            <div className="form-group">
              <label className="form-label" htmlFor="artisan-gi-id">GI Certification / Tag ID <span className="req">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <polyline points="9 12 11 14 15 10"></polyline>
                  </svg>
                </span>
                <input type="text" id="artisan-gi-id" className="input-field"
                  placeholder="Enter your official GI ID (e.g. GI-JK-PASH-8821)"
                  required={giMode === 'with_gi'} value={reg.giId || ''} onChange={setRegField('giId')} />
              </div>
            </div>

            {/* 2. Live Photo of GI Certificate (No Gallery / Folder Upload) */}
            <div className="live-capture-card" id="live-cert-card">
              <div className="capture-card-head">
                <div>
                  <div className="capture-card-label">1. Live Photo of GI Certificate <span className="req">*</span></div>
                  <div className="capture-card-hint">Hold your physical GI Certificate in front of your camera. If no webcam is
                    available on this device, a secure gallery-upload fallback appears automatically.</div>
                </div>
                <span className={`capture-status-pill${isCaptured('cert') ? ' is-done' : ''}`} id="cert-status-pill">
                  {isCaptured('cert') ? 'Captured' : 'Required'}
                </span>
              </div>

              <div className="camera-stage" id="cert-camera-stage" style={{display: isLive('cert') ? 'block' : 'none'}}>
                <video
                  id="cert-camera-video" autoplay playsInline muted
                  ref={(el) => setVideoEl && setVideoEl('cert', el)}
                ></video>
                <div className="cert-guide-overlay">
                  <span className="passport-guide-caption">ALIGN GI CERTIFICATE INSIDE FRAME</span>
                </div>
              </div>

              <div className="capture-preview-wrap" id="cert-preview-wrap" style={{display: isCaptured('cert') ? 'block' : 'none'}}>
                <img loading="lazy" decoding="async" id="cert-preview-img" className="capture-preview-img" src={shots.cert || undefined} alt="Captured Live GI Certificate" />
                <div className="capture-meta-stamp" id="cert-meta-stamp">
                  {isCaptured('cert') ? `${cam('cert').label} \u2022 ${cam('cert').capturedAt}` : ''}
                </div>
              </div>

              <div className="capture-actions-row">
                <button type="button" className="btn-cam primary" id="btn-cert-open" style={show(btn('cert').open)} onClick={() => openCamera('cert')}>Open Camera
                </button>
                <button type="button" className="btn-cam primary" id="btn-cert-snap" style={show(btn('cert').snap)} onClick={() => capturePhoto('cert')}>Capture Certificate Photo
                </button>
                <button type="button" className="btn-cam" id="btn-cert-cancel" style={show(btn('cert').cancel)} onClick={stopAllCameras}>
                  Cancel
                </button>
                <button type="button" className="btn-cam" id="btn-cert-retake" style={show(btn('cert').retake)} onClick={() => openCamera('cert')}>
                  ↺ Retake Live Photo
                </button>
                <button type="button" className="btn-cam" id="btn-cert-upload" style={show(btn('cert').upload)} onClick={() => fileEls.click('cert')}>Upload Certificate Photo (No Camera)
                </button>
                <input
                  type="file" id="cert-file-input" aria-label="Upload GI certificate photo" accept="image/*" style={{display: 'none'}}
                  ref={(el) => setFileEl && setFileEl('cert', el)}
                  onChange={(e) => handleCaptureFile('cert', e)}
                />
              </div>
              <div className="cam-error-msg" id="cert-cam-error" style={{display: cam('cert').error ? 'flex' : 'none'}}>{cam('cert').error}</div>
            </div>

            {/* 3. Live Video of Product or Workshop / Warehouse */}
            <div className="live-capture-card" id="live-video-card">
              <div className="capture-card-head">
                <div>
                  <div className="capture-card-label">2. Live Video of Product or Warehouse / Workshop <span
                      className="req">*</span></div>
                  <div className="capture-card-hint">Record a live video (3–30 sec) showing your handmade craft, loom, or
                    workshop directly from your camera. No camera detected? Use the upload fallback below.</div>
                </div>
                <span
                  className={`capture-status-pill${cam('video').recording ? ' recording' : isCaptured('video') ? ' is-done' : ''}`}
                  id="video-status-pill"
                >
                  {cam('video').recording ? '● Recording...' : isCaptured('video') ? 'Recorded' : 'Required'}
                </span>
              </div>

              <div className="camera-stage" id="video-camera-stage" style={{display: isLive('video') ? 'block' : 'none'}}>
                <video
                  id="video-camera-stream" autoplay playsInline muted
                  ref={(el) => setVideoEl && setVideoEl('video', el)}
                ></video>
                <span className={`rec-timer-pill${cam('video').recording ? ' active' : ''}`} id="video-rec-timer">
                  ● REC {formatTimer(recSeconds)} / 00:30
                </span>
              </div>

              <div className="capture-preview-wrap" id="video-preview-wrap" style={{display: isCaptured('video') ? 'block' : 'none'}}>
                <video id="video-preview-player" className="capture-preview-video" controls playsInline src={shots.video || undefined}></video>
                <div className="capture-meta-stamp" id="video-meta-stamp">
                  {isCaptured('video') ? `${cam('video').label} \u2022 ${cam('video').capturedAt}` : ''}
                </div>
              </div>

              <div className="capture-actions-row">
                <button type="button" className="btn-cam primary" id="btn-video-open" style={show(btn('video').open)} onClick={() => openCamera('video')}>Open Camera
                </button>
                <button type="button" className="btn-cam danger" id="btn-video-start" style={show(isLive('video') && !cam('video').recording)} onClick={startRecording}>
                  ⏺ Start Live Recording
                </button>
                <button type="button" className="btn-cam primary" id="btn-video-stop" style={show(isLive('video') && !!cam('video').recording)} onClick={stopRecording}>
                  ⏹ Stop &amp; Save Video
                </button>
                <button type="button" className="btn-cam" id="btn-video-cancel" style={show(btn('video').cancel)} onClick={stopAllCameras}>
                  Cancel
                </button>
                <button type="button" className="btn-cam" id="btn-video-retake" style={show(btn('video').retake)} onClick={() => openCamera('video')}>
                  ↺ Re-record Live Video
                </button>
                <button type="button" className="btn-cam" id="btn-video-upload" style={show(btn('video').upload)} onClick={() => fileEls.click('video')}>Upload Workshop Video (No Camera)
                </button>
                <input
                  type="file" id="video-file-input" aria-label="Upload workshop video" accept="video/*" style={{display: 'none'}}
                  ref={(el) => setFileEl && setFileEl('video', el)}
                  onChange={(e) => handleCaptureFile('video', e)}
                />
              </div>
              <div className="cam-error-msg" id="video-cam-error" style={{display: cam('video').error ? 'flex' : 'none'}}>{cam('video').error}</div>
            </div>

            {/* 4. Live Passport-Size Photo of Seller */}
            <div className="live-capture-card" id="live-passport-card">
              <div className="capture-card-head">
                <div>
                  <div className="capture-card-label">3. Live Passport-Size Photo of Seller <span className="req">*</span>
                  </div>
                  <div className="capture-card-hint">Center your face inside the passport guide (35×45 mm portrait ratio).
                    Captured live via front camera — with upload fallback when no camera is present.</div>
                </div>
                <span className={`capture-status-pill${isCaptured('passport') ? ' is-done' : ''}`} id="passport-status-pill">
                  {isCaptured('passport') ? 'Captured' : 'Required'}
                </span>
              </div>

              <div className="camera-stage" id="passport-camera-stage" style={{display: isLive('passport') ? 'block' : 'none'}}>
                <video
                  id="passport-camera-video" autoplay playsInline muted
                  ref={(el) => setVideoEl && setVideoEl('passport', el)}
                ></video>
                <div className="passport-guide-overlay">
                  <div className="passport-guide-oval"></div>
                  <span className="passport-guide-caption">PASSPORT SIZE (35×45 MM)</span>
                </div>
              </div>

              <div className="capture-preview-wrap" id="passport-preview-wrap" style={{display: isCaptured('passport') ? 'block' : 'none'}}>
                <img loading="lazy" decoding="async" id="passport-preview-img" className="capture-preview-img passport-frame"
                  src={shots.passport || undefined}
                  alt="Captured Live Seller Passport Photo" />
                <div className="capture-meta-stamp" id="passport-meta-stamp">
                  {isCaptured('passport') ? `${cam('passport').label} \u2022 ${cam('passport').capturedAt}` : ''}
                </div>
              </div>

              <div className="capture-actions-row">
                <button type="button" className="btn-cam primary" id="btn-passport-open" style={show(btn('passport').open)} onClick={() => openCamera('passport')}>Open Front Camera
                </button>
                <button type="button" className="btn-cam primary" id="btn-passport-snap" style={show(btn('passport').snap)} onClick={() => capturePhoto('passport')}>Capture Passport Photo
                </button>
                <button type="button" className="btn-cam" id="btn-passport-cancel" style={show(btn('passport').cancel)} onClick={stopAllCameras}>
                  Cancel
                </button>
                <button type="button" className="btn-cam" id="btn-passport-retake" style={show(btn('passport').retake)} onClick={() => openCamera('passport')}>
                  ↺ Retake Passport Photo
                </button>
                <button type="button" className="btn-cam" id="btn-passport-upload" style={show(btn('passport').upload)} onClick={() => fileEls.click('passport')}>Upload Passport Photo (No Camera)
                </button>
                <input
                  type="file" id="passport-file-input" aria-label="Upload passport photo" accept="image/*" style={{display: 'none'}}
                  ref={(el) => setFileEl && setFileEl('passport', el)}
                  onChange={(e) => handleCaptureFile('passport', e)}
                />
              </div>
              <div className="cam-error-msg" id="passport-cam-error" style={{display: cam('passport').error ? 'flex' : 'none'}}>{cam('passport').error}</div>
            </div>

            {/* 5. Artisan Skill Description Box */}
            <div className="form-group" style={{marginBottom: '0'}}>
              <label className="form-label" htmlFor="artisan-skill-desc">Describe Your Craft &amp; Skill <span
                  className="req">*</span></label>
              <textarea id="artisan-skill-desc" className="skill-textarea" rows="4" maxLength="600"
                placeholder="Tell buyers and verifiers about your craft specialization, years of experience, traditional techniques (e.g., Kani wooden bobbins, Sozni needlework, deep walnut relief carving), and workshop lineage..."
                value={reg.skill || ''}
                onChange={setRegField('skill')}
                onInput={updateSkillCount}
                required={giMode === 'with_gi'}
              />
              <div className="skill-char-row">
                <span>Minimum 20 characters for GI verification review</span>
                <span id="skill-char-count">{String(reg.skill || '').trim().length} / 600</span>
              </div>
            </div>
          </div>

          {/* Terms & Policy */}
          <label className="terms-label">
            <input type="checkbox" id="artisan-reg-terms" required checked={!!reg.terms} onChange={setRegField('terms')} />
            <span>I agree to the <a href="javascript:void(0)" onClick={() => flash('Terms of Service: GI-certified artisan onboarding charter (demo)')}>Terms of Service</a> and <a href="javascript:void(0)" onClick={() => flash('Privacy Policy: workshop data is verified, never sold (demo)')}>Privacy Policy</a></span>
          </label>

          {/* Submit Button */}
          <button type="submit" className="btn-submit-auth" id="artisan-register-submit-btn">
            Submit GI Verification &amp; Create Account →
          </button>
        </form>

        {/* ====================================================================
             FORM 4: FORGOT PASSWORD
             ==================================================================== */}
        <div id="form-forgot" style={{display: showForgot ? 'block' : 'none'}}>
          {/* Center Illustration */}
          <div className="forgot-illustration-wrap">
            <img loading="lazy" decoding="async" src="assets/auth/forgot_illustration.png" alt="Reset Password Security" className="forgot-illustration-img" />
          </div>

          <form onSubmit={submitForgot}>
            {/* Email Field */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </span>
                <input type="email" id="forgot-email" aria-label="Registered email address" className="input-field" placeholder="Enter your registered email"
                  value={forgotEmail} onChange={setForgotEmail} required />
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" className="btn-submit-auth" style={{marginTop: '8px'}}>
              Send reset link →
            </button>
          </form>

          {/* Golden Info Alert Banner */}
          <div className="auth-info-alert">
            <span className="info-icon">ⓘ</span>
            <div>
              we'll send a password reset link to your email. please check your inbox (and spam folder) as well
            </div>
          </div>
        </div>

    </>
  );
}

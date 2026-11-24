import React, { useState } from 'react';
import { useStore } from '../../state/StoreContext.jsx';
import { IconShield, IconMapPin, IconSearchScan, IconCheck } from '../../components/LineIcons.jsx';
import {
  VERIFICATION_STEPS,
  VERIFICATION_CARDS,
  VERIFY_SAMPLES
} from '../../data/verification.js';

/* ==========================================================================
   VerificationSection — the Valley Verification Flow
   --------------------------------------------------------------------------
   Three selectable step cards, a detail panel that reflects the selection,
   previous/next stepper, and a live GI lookup. Selection state that used to
   live in a module variable and a pile of classList.toggle calls is now a
   single piece of React state.
   ========================================================================== */

export default function VerificationSection() {
  const { openModal } = useStore();
  const [step, setStep] = useState(1);
  const detail = VERIFICATION_STEPS[step];

  const next = () => setStep((s) => (s === 3 ? 1 : s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  return (
    <section className="verification-section" id="verification-section">
      <div className="container">
        <div className="section-header-split">
          <div>
            <div className="section-kicker">&#9671; 100% GENUINE CRAFT PROMISE</div>
            <h2 className="section-title">The Valley Verification Flow</h2>
            <p className="section-desc">
              Every craft passes a transparent 3-step authenticity check before leaving Jammu &amp;
              Kashmir &mdash; verifying the artisan&rsquo;s workshop, lab-testing material purity, and
              sealing it with a scannable GI Tag.
            </p>
          </div>
          <div
            className="verification-pills-box"
            role="tablist"
            aria-label="Verification Steps"
          >
            {[
              'Origin Check',
              'Lab Purity Test',
              'GI Tag & QR Seal'
            ].map((label, i) => {
              const n = i + 1;
              return (
                <button
                  type="button"
                  key={n}
                  className={`verify-pill-badge${n === step ? ' active' : ''}${
                    n < step ? ' completed' : ''
                  }`}
                  id={`verify-pill-${n}`}
                  role="tab"
                  aria-selected={n === step}
                  onClick={() => setStep(n)}
                >
                  <span className="verify-pill-num">{n}</span> {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="verification-flow-track">
          {VERIFICATION_CARDS.map((c, idx) => (
            <React.Fragment key={c.n}>
              {idx > 0 && (
                <div className="verify-flow-arrow" aria-hidden="true">
                  &rarr;
                </div>
              )}
              <div
                className={`verify-step-card${c.n === step ? ' highlighted' : ''}${
                  c.n < step ? ' completed' : ''
                }`}
                id={`verify-card-${c.n}`}
                role="button"
                tabIndex={0}
                aria-pressed={c.n === step}
                onClick={() => setStep(c.n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setStep(c.n);
                  }
                }}
              >
                <div>
                  <div className="verify-card-top">
                    <div className="verify-step-meta">
                      <span className="verify-step-num">0{c.n}</span>
                      <span className="verify-step-tag" id={`verify-tag-${c.n}`}>
                        {c.n === step
                          ? 'Viewing Step'
                          : c.n < step
                          ? 'Checked'
                          : 'Click to Inspect'}
                      </span>
                    </div>
                    <span className="verify-step-icon" aria-hidden="true">
                      {c.icon === 'map-pin' ? (
                        <IconMapPin size={17} />
                      ) : c.icon === 'scan' ? (
                        <IconSearchScan size={17} />
                      ) : (
                        <IconShield size={17} />
                      )}
                    </span>
                  </div>
                  <h3 className="verify-step-title">{c.title}</h3>
                  <p className="verify-step-body">{c.body}</p>
                  <div className="verify-buyer-benefit">{c.benefit}</div>
                </div>
                <div className="verify-meter-box">
                  <div className="verify-meter-labels">
                    <span>{c.meterLabel}</span>
                    <span>{c.meterValue}</span>
                  </div>
                  <div className="verify-meter-bar">
                    <div
                      className={`verify-meter-fill${c.meterGold ? ' gold' : ''}`}
                      style={{ width: `${c.meterPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="verify-interactive-panel" id="verify-detail-panel" aria-live="polite">
          <div className="verify-detail-main" id="verify-detail-content">
            <div className="verify-detail-grid">
              <div>
                <div className="verify-detail-kicker">{detail.kicker}</div>
                <h3 className="verify-detail-heading">{detail.heading}</h3>
                <ul className="verify-checklist">
                  {detail.checks.map((c) => (
                    <li key={c}>
                      <span className="verify-check-icon"></span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="verify-sample-proof">
                <div className="verify-proof-header">
                  <span className="verify-proof-title">{detail.proofTitle}</span>
                  <span className="verify-proof-badge">{detail.proofBadge}</span>
                </div>
                <div className="verify-proof-rows">
                  {detail.proof.map((row) => (
                    <div className="verify-proof-item" key={row.label}>
                      <strong>{row.label}</strong>
                      <span>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="verify-detail-controls">
            <div className="verify-step-nav">
              <button
                type="button"
                className="verify-nav-btn"
                id="verify-prev-btn"
                disabled={step === 1}
                onClick={prev}
              >
                &larr; Previous Step
              </button>
              <span className="verify-step-counter" id="verify-step-counter">
                Step {step} of 3
              </span>
              <button
                type="button"
                className="verify-nav-btn primary"
                id="verify-next-btn"
                onClick={next}
              >
                {step === 3 ? 'Restart Flow \u21ba' : 'Next Step \u2192'}
              </button>
            </div>
          </div>
        </div>

        <QuickLookup onVerify={(code) => openModal('giVerify', { giId: code })} />
      </div>
    </section>
  );
}

function QuickLookup({ onVerify }) {
  const [code, setCode] = useState('');

  const submit = (value) => {
    const c = (value || code).trim() || 'GI-JK-PASH-8821';
    if (!value) setCode(c);
    onVerify(c);
  };

  return (
    <div className="verify-quick-lookup">
      <div className="verify-quick-left">
        <div className="verify-quick-title"><IconShield size={15} /> Try Live GI Tag Verification</div>
        <div className="verify-quick-sub">
          Enter any HunarLink GI code or tap a sample craft below to inspect its verified
          certificate.
        </div>
        <div className="verify-sample-chips">
          <span className="verify-sample-label">Try sample:</span>
          {VERIFY_SAMPLES.map((s) => (
            <button
              type="button"
              key={s.code}
              className="verify-sample-chip"
              onClick={() => submit(s.code)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <form
        className="verify-quick-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          type="text"
          id="inline-gi-input"
          className="verify-quick-input"
          placeholder="Enter GI ID (e.g. GI-JK-PASH-8821)"
          aria-label="Enter GI Tag ID"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="submit" className="verify-quick-btn">
          Verify Tag &rarr;
        </button>
      </form>
    </div>
  );
}

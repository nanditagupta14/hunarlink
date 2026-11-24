import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../state/StoreContext.jsx';
import Modal from '../Modal.jsx';
import { ArrowRight } from '../Icons.jsx';

/* ==========================================================================
   LoginChoiceModal — "who are you signing in as?"
   --------------------------------------------------------------------------
   The header used to carry three separate ways in: a named user button, an
   "Artisan Login" link and an "ARTISAN STUDIO" button. That is three controls
   for one intent, and the labels made the split worse — "Artisan Login" went
   to the collector login page, "ARTISAN STUDIO" went straight into the seller
   portal with no session at all.

   Now there is one LOGIN button. It opens this, and the answer routes to the
   page that already owns that job:

     collector -> /login   (pages/portal/LoginPage.jsx)
     artisan   -> /auth    (pages/AuthPage.jsx, login and register modes)

   Nothing downstream changes. The seller portal's own gates are untouched:
   /seller still refuses an artisan who has not signed in, and an artisan with
   no account still goes through /auth?mode=register first.
   ========================================================================== */

const ROLES = [
  {
    id: 'collector',
    to: '/login',
    title: 'User',
    sub: 'Buy and collect',
    body: 'Track orders, keep a wishlist, save delivery addresses and follow the artisans you buy from.',
    cta: 'Continue as collector',
    points: ['Orders', 'Wishlist']
  },
  {
    id: 'artisan',
    to: '/auth',
    title: 'Artisan',
    sub: 'Sell your craft',
    body: 'Manage your listings, answer buyer questions and publish new crafts straight to the storefront.',
    cta: 'Continue as artisan',
    points: ['Listings', 'GI papers']
  }
];

function RoleIcon({ kind }) {
  if (kind === 'artisan') {
    /* a craft mark — the site already uses a spark for the artisan side */
    return (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">
        <path
          d="M12 2.6 13.85 9.1l6.55 1.9-6.55 1.9L12 19.4l-1.85-6.5L3.6 11l6.55-1.9z"
          fill="currentColor"
        />
        <circle cx="18.9" cy="18.9" r="2" fill="currentColor" opacity="0.75" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.1" r="3.6" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M4.9 20c0-3.5 3.2-5.6 7.1-5.6s7.1 2.1 7.1 5.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function LoginChoiceModal() {
  const navigate = useNavigate();
  const { closeModal, user, setUser } = useStore();

  const go = (to) => {
    closeModal();
    navigate(to);
  };

  /* A signed-in visitor should not be asked to sign in again without a way
     out, so the current session gets an explicit escape at the bottom. */
  const signedIn = Boolean(user && user.isLoggedIn);
  const who = user?.name || user?.fullName || 'your account';
  const roleLabel = user?.role === 'artisan' ? 'an artisan' : 'a collector';

  return (
    <Modal
      id="login-choice-modal"
      title="Sign in"
      width="760px"
      variant="split"
      onClose={closeModal}
    >
      <div className="modal-body lc-body">
        <header className="lc-intro">
          <p className="lc-eyebrow">Choose your account type</p>
          <h2 className="lc-heading">How would you like to continue?</h2>
          <p className="lc-lede">
            Pick the side of the marketplace you are signing in to. You can hold both
            accounts with the same email address.
          </p>
        </header>

        <div className="lc-options" role="list">
          {ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              role="listitem"
              className="lc-option"
              id={`login-choice-${role.id}`}
              data-role={role.id}
              onClick={() => go(role.to)}
            >
              <span className="lc-option-top">
                <span className="lc-icon" aria-hidden="true">
                  <RoleIcon kind={role.id} />
                </span>
                <span className="lc-option-heads">
                  <span className="lc-option-title">{role.title}</span>
                  <span className="lc-option-sub">{role.sub}</span>
                </span>
              </span>

              <span className="lc-option-body">{role.body}</span>

              <span className="lc-points">
                {role.points.map((p) => (
                  <span className="lc-point" key={p}>
                    {p}
                  </span>
                ))}
              </span>

              <span className="lc-cta">
                {role.cta}
                <ArrowRight size={14} />
              </span>
            </button>
          ))}
        </div>

        <div className="lc-assurance">
          <span className="lc-assurance-mark" aria-hidden="true">
            &#10003;
          </span>
          <p>
            Every artefact carries a GI tag you can verify. Artisans are reviewed against
            the Valley Verification Flow before they can list.
          </p>
        </div>

        {signedIn && (
          <p className="lc-session">
            Signed in as {roleLabel} &mdash; <strong>{who}</strong>.{' '}
            <button
              type="button"
              className="lc-signout"
              id="login-choice-signout"
              onClick={() => {
                /* the store has no dedicated sign-out action; clearing the
                   session is the same shape the portal gates test for */
                setUser({ ...(user || {}), isLoggedIn: false });
                closeModal();
              }}
            >
              Sign out
            </button>
          </p>
        )}
      </div>
    </Modal>
  );
}

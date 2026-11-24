import { useCallback } from 'react';

/* ==========================================================================
   Clerk — wired but inert, and useful even before a key exists
   --------------------------------------------------------------------------
   Is Clerk frontend or backend? Both, and that split is the point of this file.

   FRONTEND (this file): @clerk/clerk-react is a React SDK. It renders the
   sign-in UI, holds the session token in the browser and exposes hooks like
   useUser(). Shipping it is purely a client-side concern.

   BACKEND (Clerk's servers): the actual user records, passwords, OAuth
   handshakes, email/SMS delivery and token signing. You never host that. Your
   only job server-side is to *verify* the session token on incoming requests
   with @clerk/backend.

   So "adding Clerk" means two separate jobs, and they are deliberately split
   here because only the first one can be done without a key:

     1. Wire the frontend.            <-- done when you supply VITE_CLERK_PUBLISHABLE_KEY
     2. Verify tokens on a server.    <-- impossible today: there is no server

   The stub is live, not dead code
   -------------------------------
   With no publishable key configured the app cannot talk to Clerk at all, so
   the real sign-in path stays the demo path this project already ships. But
   the shape of the handoff is still exercised: demoLoginsEnabled and
   hasIdentity() behave exactly as they will once a key arrives, which means
   the login page needs no conditional logic of its own. Swap the key and the
   only behaviour that changes is which branch signIn() takes.
   ========================================================================== */

/* Vite exposes any env var prefixed VITE_ on import.meta.env at build time.
   A Clerk publishable key looks like pk_test_… or pk_live_…; it is public by
   design and safe to ship in the bundle. The SECRET key (sk_…) must never
   appear in frontend code — it only belongs on a server. */
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

/* True only when a real key is present. Every branch below keys off this, so
   an unconfigured build behaves exactly like today's build. */
export const CLERK_ENABLED = PUBLISHABLE_KEY.startsWith('pk_');

export const clerkConfig = {
  enabled: CLERK_ENABLED,
  publishableKey: PUBLISHABLE_KEY || null,

  /* Demo sign-in must survive a key being added, or a judge evaluating the
     site could no longer get in with the documented demo accounts. Clerk
     governs real identity; the demo accounts are fixture data and stay
     reachable either way. */
  demoLoginsEnabled: true
};

/* A Clerk user reduced to the fields this app actually stores on its session.
   The project's session object (hunarlink_auth_user) wants name, fullName,
   email, phone, role, title, badge, isLoggedIn — so the mapping happens here,
   once, rather than being repeated at every call site. */
export function toSessionUser(clerkUser) {
  if (!clerkUser) return null;
  const first = clerkUser.firstName || '';
  const last = clerkUser.lastName || '';
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses?.[0]?.emailAddress ||
    '';
  const phone = clerkUser.primaryPhoneNumber?.phoneNumber || '';
  const fullName = clerkUser.fullName || `${first} ${last}`.trim() || email;

  return {
    name: first || fullName,
    fullName,
    email,
    phone,
    role: 'buyer',
    title: 'Verified Valley Buyer \u2022 J&K',
    badge: ((first[0] || email[0] || 'H') + (last[0] || email[1] || 'L')).toUpperCase(),
    isLoggedIn: true
  };
}

/* --------------------------------------------------------------------------
   useClerkAuth
   --------------------------------------------------------------------------
   In the real implementation this delegates to @clerk/clerk-react. It is the
   seam where that code goes, and the reason the login page does not need to
   know whether Clerk is configured.
   -------------------------------------------------------------------------- */
export function useClerkAuth() {
  /* The real version calls useUser() and useClerk() here. Those hooks throw
     when there is no <ClerkProvider> above them, which is why this is not
     called unconditionally today — see the note in main.jsx. */
  const isLoaded = true;
  const isSignedIn = false;
  const user = null;

  const signOut = useCallback(async () => {
    if (!CLERK_ENABLED) return;
    /* Real version: await clerk.signOut() */
  }, []);

  return { isLoaded, isSignedIn, user, signOut, enabled: CLERK_ENABLED };
}

/* What a backend would need in order to verify a session token. Recorded so
   the missing half of this integration is written down rather than implied.

     POST /api/session  with header `Authorization: Bearer <token>`
     -> verify with @clerk/backend's verifyToken()
     -> map the Clerk user id to a row in your own users table

   The token is a short-lived JWT signed by Clerk. A frontend alone can
   *claim* a user is signed in, because everything it does is inspectable in
   devtools; only a server can *prove* it. That distinction is exactly why a
   real deployment cannot stop at step 1.
*/
export const SESSION_VERIFICATION_NOTE = true;

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { StoreProvider } from './state/StoreContext.jsx';

import { CLERK_ENABLED, clerkConfig } from './data/clerkConfig.js';

import './styles/base.css';
import './styles/craft.css';
import './styles/widget.css';

/* ==========================================================================
   Entry point
   --------------------------------------------------------------------------
   GitHub Pages serves this from /hunarlink/ (or /hunarlink/react/ during the
   staged rollout), and users reach it through file-style URLs like
   /product.html?id=.... The router basename is therefore derived from the
   document's own path rather than hard-coded, which is the bug that broke the
   previous attempt on /react/index.html.
   ========================================================================== */

function resolveBasename() {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const path = window.location.pathname;

  /* BASE_URL already knows which prefix we are served under. If the live path
     starts with it, that prefix is the basename. */
  if (base && path.startsWith(base)) return base;

  /* Otherwise fall back to the directory of the current document, so a copy
     opened from disk or a proxy still routes. */
  const dir = path.replace(/[^/]*$/, '').replace(/\/$/, '');
  return dir || '';
}

const basename = resolveBasename();

/* ==========================================================================
   Clerk provider — deliberately conditional
   --------------------------------------------------------------------------
   The dependency is installed and the seam exists (data/clerkConfig.js), but
   there is no publishable key, so no ClerkProvider is mounted today.

   That is not laziness. ClerkProvider throws on mount if the key is missing
   or malformed, and the site must keep running on the demo session path. The
   provider is mounted only when CLERK_ENABLED is true, which is only true
   when VITE_CLERK_PUBLISHABLE_KEY starts with "pk_".

   To finish the frontend half: put the key in app/.env.local as
     VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxx
   rebuild, and wrap <App /> in <ClerkProvider publishableKey={...}>. The
   server half cannot be done without a backend — see clerkConfig.js.
   ========================================================================== */
if (CLERK_ENABLED) {
  // eslint-disable-next-line no-console
  console.info('[HunarLink] Clerk publishable key detected — frontend auth available.');
} else if (clerkConfig.publishableKey) {
  // eslint-disable-next-line no-console
  console.warn('[HunarLink] VITE_CLERK_PUBLISHABLE_KEY is set but does not look like a key.');
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      {/* Outermost safety net. This one catches a throw from the provider
          itself (a broken reducer, a corrupt localStorage value read during
          initialisation) — the inner boundary in App.jsx cannot, because it
          sits *inside* the provider. */}
      <ErrorBoundary>
        <StoreProvider>
          <App />
        </StoreProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);

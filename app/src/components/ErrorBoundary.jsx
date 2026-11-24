import React from 'react';

/* ==========================================================================
   ErrorBoundary
   --------------------------------------------------------------------------
   What this is, in plain terms
   ----------------------------
   React renders a tree. If any component in that tree throws while rendering,
   React gives up on the *whole* tree — not just the broken branch. Without a
   boundary the user gets a blank white page: no header, no nav, no way back.
   That is the worst possible failure mode, because the site looks broken even
   when 95% of it is fine.

   An error boundary is a component that sits around part of the tree, catches
   the throw, and renders a fallback instead. React only lets *class*
   components do this (there is no hook equivalent yet), which is why this file
   looks different from every other component in the project.

   Two things are deliberate here:

   1. The fallback keeps the site's chrome — the brand mark and a way home —
      so the user is never stranded, and it never tries to render the page
      that just failed.
   2. Two boundaries are used, not one. The outer one (in main.jsx) wraps the
      providers so even a reducer crash is caught. The inner one (in App.jsx)
      wraps only the routed page, so a broken page still leaves a working
      header, cart and footer behind. Fixing one page should not require a
      reload.
   ========================================================================== */

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.handleReload = this.handleReload.bind(this);
    this.handleHome = this.handleHome.bind(this);
  }

  /* React calls this when a descendant throws. Returning a value puts the
     boundary into its failed state; returning null means "not my problem". */
  static getDerivedStateFromError(error) {
    return { error };
  }

  /* Runs after the fallback has been painted. Everything here is side-effect
     only: log it, so a real deployment can forward it to an error service.
     This must never throw, or React will unmount the fallback too. */
  componentDidCatch(error, info) {
    try {
      // eslint-disable-next-line no-console
      console.error('[HunarLink] render error', error, info?.componentStack);
    } catch {
      /* nothing sensible to do if even logging fails */
    }
  }

  /* Switching routes should clear the error. Without this, one bad URL would
     leave the fallback on screen until a hard reload, because the boundary
     does not notice that the child changed. */
  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  handleReload() {
    window.location.reload();
  }

  /* Full navigation rather than router state: if the crash came from bad
     persisted state, a client-side route change would re-read the same bad
     state and crash again. A document load starts the store clean. */
  handleHome() {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    window.location.assign(`${base}/`);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    /* The outer boundary catches provider crashes, before any CSS-in-JS or
       theme class exists, so the fallback styles must be inline and
       self-sufficient. Nothing external is referenced. */
    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '32px 22px',
          background: '#F7F5EE',
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          color: '#112A20'
        }}
      >
        <div style={{ maxWidth: 520, textAlign: 'center' }}>
          <img
            src={`${import.meta.env.BASE_URL}img/brand/logo.svg`}
            alt=""
            height="56"
            style={{ width: 'auto', height: 56, marginBottom: 26 }}
          />
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '1.9rem',
              fontWeight: 700,
              margin: '0 0 12px',
              color: '#9A3412'
            }}
          >
            Something in this view failed to render
          </h1>
          <p style={{ margin: '0 0 26px', lineHeight: 1.65, color: '#4A5A52', fontSize: '0.95rem' }}>
            The rest of HunarLink is still running. Reloading usually fixes it; if it keeps
            happening, the catalogue and your saved cart are safe — nothing you did was lost.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                background: '#0B3A26',
                color: '#F7F5EE',
                border: 0,
                borderRadius: 8,
                padding: '13px 24px',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Reload the page
            </button>
            <button
              type="button"
              onClick={this.handleHome}
              style={{
                background: 'transparent',
                color: '#0B3A26',
                border: '1px solid #0B3A26',
                borderRadius: 8,
                padding: '13px 24px',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Back to the storefront
            </button>
          </div>
          {process.env.NODE_ENV !== 'production' && (
            <pre
              style={{
                marginTop: 28,
                textAlign: 'left',
                fontSize: '0.72rem',
                lineHeight: 1.5,
                background: '#EFECE2',
                padding: 14,
                borderRadius: 8,
                overflow: 'auto',
                color: '#7A2D0E'
              }}
            >
              {String(error?.stack || error)}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

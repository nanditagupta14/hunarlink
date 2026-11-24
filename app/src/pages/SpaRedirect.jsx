import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/* ==========================================================================
   SpaRedirect
   --------------------------------------------------------------------------
   GitHub Pages cannot serve a deep link to a client-routed app: any path it
   does not have on disk returns the 404 page. The 404 handler in public/ parks
   the requested path in sessionStorage and bounces to the app root; this
   restores it once the router is mounted.

   Ordering matters and caught the previous attempt out: the restorer ran
   alongside the normaliser, so it kept writing back the stale path right after
   it had been cleaned. Here it consumes the stash once and clears it, so a
   later refresh does not fight the router.
   ========================================================================== */

const LEGACY = {
  'index.html': '/',
  'product.html': '/product',
  'auth.html': '/auth',
  'wholesale.html': '/wholesale',
  'admin.html': '/admin',
  'seller.html': '/seller',
  'login.html': '/login',
  'orders.html': '/orders',
  'profile.html': '/profile',
  'user-portal/profile.html': '/profile',
  'user-portal/orders.html': '/orders',
  'admin-portal/index.html': '/admin',
  'wholesale-portal/wholesale.html': '/wholesale'
};

export default function SpaRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    let stashed = null;
    try {
      stashed = window.sessionStorage.getItem('hunar_spa_redirect');
      if (stashed) window.sessionStorage.removeItem('hunar_spa_redirect');
    } catch (e) {
      /* storage blocked — nothing to restore */
    }
    if (!stashed) return;

    /* The hash is parked in the same string, so it has to be split off before
       the path is rebuilt — otherwise '#marketplace-section' ends up inside a
       path segment and the route does not match. */
    const [rawPath, ...rest] = stashed.split('#');
    const hashPart = rest.length ? `#${rest.join('#')}` : '';
    const [pathOnly, query = ''] = rawPath.split('?');
    const clean = (pathOnly || '').replace(/^\/+/, '');
    /* A category URL is a real client route, so it is passed through as-is.
       LEGACY only covers the old .html filenames. */
    const mapped = LEGACY[clean] || (clean ? `/${clean}` : '/');
    navigate(`${mapped}${query ? `?${query}` : ''}${hashPart}`, { replace: true });
  }, [navigate]);

  return null;
}

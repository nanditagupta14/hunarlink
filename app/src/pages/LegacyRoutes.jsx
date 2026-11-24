import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/* ==========================================================================
   LegacyRoutes
   --------------------------------------------------------------------------
   The v1 site shipped its pages as files: index.html, product.html,
   user-portal/login.html, seller-portal/dashboard.html and so on. Those files
   are gone now that React owns the root, but the URLs are still out there in
   bookmarks, shared links and the GI certificate QR codes.

   Two things have to happen for them to keep working:

     1. A hard request for one of those paths gets served 404.html, which parks
        the path in sessionStorage and bounces to the app root. SpaRedirect
        already restores it — that is the round trip below.

     2. A soft request (the router navigating, or a stale link inside the app)
        never touches the server at all. This component catches the old path
        and replaces it with the current route in the same history entry, so
        the back button does not bounce between them.
   ========================================================================== */

const LEGACY = {
  'index.html': '/',
  'home.html': '/',
  'product.html': '/product',
  'auth.html': '/auth',
  'wholesale.html': '/wholesale',
  'admin.html': '/admin',
  'seller.html': '/seller',
  'login.html': '/login',
  'orders.html': '/orders',
  'profile.html': '/profile',

  /* the v1 portals lived in their own folders */
  'user-portal/index.html': '/login',
  'user-portal/login.html': '/login',
  'user-portal/profile.html': '/profile',
  'user-portal/orders.html': '/orders',
  'admin-portal/index.html': '/admin',
  'admin-portal/admin.html': '/admin',
  'seller-portal/index.html': '/seller',
  'seller-portal/dashboard.html': '/seller',
  'wholesale-portal/index.html': '/wholesale',
  'wholesale-portal/wholesale.html': '/wholesale'
};

export default function LegacyRoutes() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const clean = pathname.replace(/^\/+/, '');
    const mapped = LEGACY[clean];
    if (!mapped) return;
    navigate(`${mapped}${search || ''}`, { replace: true });
  }, [pathname, search, navigate]);

  return null;
}

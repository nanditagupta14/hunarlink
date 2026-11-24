import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/* ==========================================================================
   usePageTitle
   --------------------------------------------------------------------------
   Every route used to inherit the single <title> from index.html, so a browser
   tab strip showed "HunarLink — GI-Certified Kashmiri Handicrafts Marketplace"
   seven times over and history entries were indistinguishable. ProductPage
   already set its own; this gives the rest the same treatment.

   Pages that need a dynamic title (a product name, a seller's store name) can
   still call document.title directly after mount — this hook only sets the
   route-level fallback, and it re-runs on every navigation.
   ========================================================================== */

const SUFFIX = 'HunarLink — Valley Craft Guild';

const TITLES = {
  '/': 'Storefront',
  '/index.html': 'Storefront',
  '/product': 'Product',
  '/product.html': 'Product',
  '/auth': 'Artisan Sign In & Verification',
  '/auth.html': 'Artisan Sign In & Verification',
  '/wholesale': 'Wholesale Desk',
  '/wholesale.html': 'Wholesale Desk',
  '/admin': 'Admin Console',
  '/admin.html': 'Admin Console',
  '/seller': 'Artisan Portal',
  '/seller.html': 'Artisan Portal',
  '/login': 'User Sign In',
  '/login.html': 'User Sign In',
  '/orders': 'My Orders',
  '/orders.html': 'My Orders',
  '/profile': 'My Profile',
  '/profile.html': 'My Profile'
};

export default function usePageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const label = TITLES[pathname];
    /* '/' is the storefront, so it takes the brand title alone */
    if (!label || pathname === '/' || pathname === '/index.html') {
      document.title = SUFFIX;
      return;
    }
    document.title = `${label} · ${SUFFIX}`;
  }, [pathname]);
}

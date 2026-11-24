import { useEffect } from 'react';

/* ==========================================================================
   PortalScope
   --------------------------------------------------------------------------
   The six portal pages were authored against different root font sizes and
   different :root palettes, and `rem` always resolves against <html>. Both can
   only be reproduced by putting a class on <html> for as long as that portal
   is mounted — a container-level font-size does nothing for rem values, and
   all four portal stylesheets share one bundle (so the last :root wins).

   One class at a time, removed on unmount so the storefront gets its own
   17px root and palette back. Same mechanism as `auth-route` in AuthPage.

   family:
     'user'       — profile / orders / login  (16.5px root, user-portal palette)
     'seller'     — seller dashboard          (16.5px root, seller palette)
     'wholesale'  — wholesale portal          (16px root, wholesale palette)
     'admin'      — admin portal              (16px root, --color-* palette)
   ========================================================================== */

const CLASS_FOR_FAMILY = {
  user: 'portal-user',
  seller: 'portal-seller',
  wholesale: 'portal-wholesale',
  admin: 'portal-admin'
};

const ALL_CLASSES = ['portal-user', 'portal-seller', 'portal-wholesale', 'portal-admin'];

export default function PortalScope({ family }) {
  useEffect(() => {
    const root = document.documentElement;
    const wanted = CLASS_FOR_FAMILY[family];
    if (!wanted) return undefined;

    ALL_CLASSES.forEach((c) => root.classList.remove(c));
    root.classList.add(wanted);

    return () => root.classList.remove(wanted);
  }, [family]);

  return null;
}

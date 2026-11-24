/* ==========================================================================
   appHref — turn an app path into a real href
   --------------------------------------------------------------------------
   Vite builds this site under base '/hunarlink/', but the portals and account
   pages still use plain anchors rather than <Link>. An anchor written as
   href="/" is resolved by the browser against the HOST, not against the base:
   on the GitHub Pages deploy "github.io/hunarlink/" a link to "/" goes to
   "github.io/", which is not this site, so GitHub answers with its own
   "There isn't a GitHub Pages site here" 404.

   Every such anchor now goes through here, so the prefix comes from
   import.meta.env.BASE_URL instead of being typed at each call site.
   ========================================================================== */

const BASE = import.meta.env.BASE_URL || '/';

export function appHref(path = '/') {
  const p = String(path);

  /* external links and pure fragments are none of our business */
  if (/^(https?:|mailto:|tel:|data:)/.test(p)) return p;
  if (p.startsWith('#')) return p;

  const [pathPart, ...rest] = p.split('#');
  const suffix = rest.length ? `#${rest.join('#')}` : '';

  const joined = `${BASE.replace(/\/+$/, '')}/${pathPart.replace(/^\/+/, '')}`;

  /* the bare root must keep its trailing slash — "github.io/hunarlink" only
     works because the host redirects to "…/hunarlink/", and that redirect is
     a full page load we do not need */
  const normalised = joined.endsWith('/') ? joined : joined.replace(/\/?$/, '') || '/';

  return normalised + suffix;
}

export default appHref;

# HunarLink — Valley Craft Guild

GI-certified Jammu & Kashmir handicrafts marketplace. Connects geo-verified artisan
workshops directly with collectors and B2B hospitality buyers — **zero middleman cut**.

> **This is a fully working frontend prototype.** Every page runs with no backend, no
> API keys and no internet connection. Data is persisted in `localStorage`, so listings
> created in the artisan dashboard appear in the storefront, orders placed in checkout
> appear in the collector's order tracker, and so on.

The app is a **single-page React application**. React owns every page; there is no
static HTML fallback and no page-level controller code.

---

## Run it

The built site is committed at the repo root, so any static file server works —
but it must be started from the repo's **parent** directory, because every asset
URL is prefixed with `/hunarlink/`:

```bash
cd ..                          # the directory CONTAINING the hunarlink folder
python3 -m http.server 8000
# then open http://localhost:8000/hunarlink/
```

Starting the server *inside* the repo and opening `/` gives a blank page: the shell
loads, but `/hunarlink/assets/...` is not on that server.

For development with hot reload:

```bash
cd app
npm install
npm run dev          # vite dev server
```

> The site is deployed under the `/hunarlink/` prefix (a GitHub project page), so the
> built `index.html` references `/hunarlink/assets/…`. Serving the repo root directly
> at `/` will 404 on assets — use the dev server, or serve the repo's **parent**
> directory so the `/hunarlink/` prefix resolves.

---

## Build

```bash
cd app
npm run build        # vite build --mode root -> writes to ../dist
```

Then copy the output to the repo root. The build now emits several chunks —
the entry, the vendor chunks and one per lazily-loaded route — so copy them
all, and drop the previously hashed ones:

```bash
cd app
npm run build:root
cd ..
rm -f assets/index-*.js assets/index-*.css assets/vendor-*.js \
      assets/rolldown-runtime-*.js assets/AdminPage-*.js assets/SellerPage-*.js \
      assets/LoginPage-*.js assets/OrdersPage-*.js assets/ProfilePage-*.js
cp dist/index.html dist/404.html ./
cp dist/assets/*.js dist/assets/*.css assets/
```

`vite.config.js` sets `base: '/hunarlink/'` for the `root` mode so asset URLs match
the deployment prefix. There is a second mode (`vite build`) that emits to `react/`
for the older subpath deployment; the root mode is the one in use.

### Checking a build

`tools/` holds the three verification scripts, and `app/package.json` wires them
up. They drive a real Chromium, so install the one dependency first:

```bash
pip install -r tools/requirements.txt && playwright install chromium
```

Start the preview in one terminal, then check in another:

```bash
cd app && npm run serve          # the repo, served the way Pages serves it, :8123
npm run verify                   # all three checks below, in order
npm run check:routes             # 15 routes: does each render, any console error?
npm run check:a11y               # one h1, a distinct title, labelled fields
npm run audit                    # 22 interaction checks across every page
```

Point them elsewhere with `HUNARLINK_BASE=https://example.com npm run check:routes`.

---

## Pages

All routes are client-side. Legacy v1 URLs (`product.html`, `user-portal/login.html`,
`seller-portal/dashboard.html`, …) still resolve — `src/pages/LegacyRoutes.jsx` maps
each one to its current route.

| Route | Source | What it does |
|---|---|---|
| `/` | `pages/HomePage.jsx` | Storefront — hero, Valley Verification Flow, craft guilds, filterable catalogue, B2B banner |
| `/product?id=<id>` | `pages/ProductPage.jsx` | Product detail — gallery with hover zoom, GI passport, add to bag |
| `/auth` | `pages/AuthPage.jsx` | Artisan sign-in / registration, GI verification capture suite, demo evaluator logins |
| `/login` | `pages/portal/LoginPage.jsx` | Collector sign-in / sign-up, password or 6-digit OTP |
| `/profile` | `pages/ProfilePage.jsx` | Collector profile, addresses, UPI, wishlist |
| `/orders` | `pages/OrdersPage.jsx` | Order tracking with live loom/shipment stages |
| `/seller` | `pages/portal/SellerPage.jsx` | Artisan Command Center — publish, customize, orders, responses |
| `/wholesale` | `pages/WholesalePage.jsx` | B2B bulk ordering, live lot estimator, seller routing desk |
| `/admin` | `pages/portal/AdminPage.jsx` | Master admin console — 12 tabs, KPIs, GI audits, dealer matching |

Demo credentials:

* Admin console — `admin@hunarlink.com` / `AdminPass@123` (or the one-tap session)
* Artisan portal — any demo pill on `/auth`
* Collector — the "1-Tap Demo Login" on `/login`

---

## Project layout

```
app/                  Vite + React source
  src/
    pages/            route components
      portal/         seller, admin and collector login
      auth/           the auth page's static form markup
    components/       shared UI (header, drawers, modals, sections)
    state/            StoreContext — the shared store
    data/             product catalogue, guilds, admin demo dataset
    styles/           one stylesheet per surface
  public/             static assets copied into the build (images, chatbot)
  vite.config.js
assets/               deployed static assets + the live hashed JS/CSS bundle
index.html            the built SPA shell (committed)
404.html              SPA deep-link fallback for GitHub Pages
hunarsathi-chatbot/   vanilla-JS chat widget (injected by React, builds its own UI)
tools/                verification scripts (routes, a11y, behaviour audit)
```

---

## Notes

* **Deep links return HTTP 404.** GitHub Pages serves `404.html` for any path it
  cannot resolve; that page stashes the requested route and hands it back to the
  router. Visitors see the right page, but crawlers and link-preview bots see a 404.
  Fixing that needs a host with SPA rewrites.
* **Cross-tab sync is live.** `StoreContext` owns every key and listens for the
  `storage` event, so a craft published in the seller portal appears in an open
  storefront without a reload, and a cart added on a product page updates the
  storefront badge.
* **The bundle is split.** React, the router and the app core are separate
  chunks, and the three consoles plus the two account pages load on demand, so
  the storefront no longer ships the admin console. The storefront transfers
  about 508 KB of JS against 639 KB when it was one file.
* **The chatbot's backend is not included.** `hunarsathi-chatbot/widget.js` calls
  `127.0.0.1:5050`; with no backend it falls back to canned responses.

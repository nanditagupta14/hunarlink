import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  buildCatalogue,
  cartTotals,
  loadStorage,
  saveStorage,
  pushRecentlyViewed,
  readRecentlyViewed
} from '../utils/legacy.js';
import { SEED_PRODUCTS } from '../data/products.js';

/* ==========================================================================
   Store
   --------------------------------------------------------------------------
   The single owner of application state. Nothing else mutates the DOM, and
   nothing outside this file reads localStorage directly.

   Keys are unchanged from the static build, so a browser that already has a
   cart, a wishlist or an address keeps them.
   ========================================================================== */

const KEYS = {
  cart: 'hunarlink_cart',
  wishlist: 'hunarlink_wishlist',
  savedLater: 'hunarlink_saved_later',
  coupon: 'hunarlink_coupon',
  user: 'hunarlink_auth_user',
  addresses: 'hunarlink_addresses',
  orders: 'hunarlink_orders',
  customProducts: 'hunarlink_custom_products',
  productOverrides: 'hunarlink_product_overrides',
  reviews: 'hunarlink_reviews',
  sellerInquiries: 'hunarlink_seller_inquiries',
  buyerProfile: 'hunarlink_buyer_profile',
  platformUsers: 'hunarlink_platform_users',
  adminToken: 'hunarlink_admin_token'
};

/* Which state slice each storage key feeds. The cross-tab listener refreshes
   exactly the affected slice when another tab writes, so a craft published in
   the seller portal appears in an open storefront without a reload. */
const KEY_TO_SLICE = {
  [KEYS.cart]: 'cart',
  [KEYS.wishlist]: 'wishlist',
  [KEYS.savedLater]: 'savedLater',
  [KEYS.coupon]: 'coupon',
  [KEYS.user]: 'user',
  [KEYS.addresses]: 'addresses',
  [KEYS.orders]: 'orders',
  [KEYS.customProducts]: 'customProducts',
  [KEYS.productOverrides]: 'productOverrides',
  [KEYS.reviews]: 'reviews',
  [KEYS.sellerInquiries]: 'sellerInquiries',
  [KEYS.buyerProfile]: 'buyerProfile',
  [KEYS.platformUsers]: 'platformUsers'
};

/* The demo boots as a signed-in collector, exactly as the static build did —
   the header reads "Priya", the avatar reads PS. A visitor who signs out or
   signs in gets their own profile persisted under the same key. */
const DEFAULT_BUYER = {
  name: 'Priya',
  fullName: 'Priya Sharma',
  email: 'priya.sharma@valleycollector.in',
  role: 'buyer',
  title: 'Verified Valley Buyer \u2022 J&K',
  badge: 'PS',

  isLoggedIn: true
};

const DEFAULT_ADDRESS = {
  id: 'addr-1',
  name: 'Demo User',
  phone: '0000000000',
  line1: 'Houseboat Road, Dal Gate',
  city: 'Srinagar',
  state: 'Jammu & Kashmir',
  pin: '190001'
};

/* ------------------------------------------------------------ price bounds

   The slider used to be hard-wired to 500-220000 while the catalogue's real
   spread was 450-210000, so the left third of the track did nothing and the
   top was unreachable. Both ends are now measured from the catalogue itself:
   the cheapest listed piece and the dearest one.

   MAX_PRICE is the slider's *unfiltered* value. A slider has to have a
   numeric position for "show everything", and setting it to the dearest
   listing is what makes the whole catalogue visible at rest. */

const PRICE_MIN = Math.floor(Math.min(...SEED_PRODUCTS.map((p) => p.price)) / 50) * 50;
const PRICE_MAX = Math.ceil(Math.max(...SEED_PRODUCTS.map((p) => p.price)) / 50) * 50;
export const PRICE_BOUNDS = { min: PRICE_MIN, max: PRICE_MAX };

/* Filter defaults, matching the static build's AppState.filters exactly. The
   keys differ on purpose: the static one called search "search", this one
   calls it "query", and both the header and the toolbar write to it. */
const DEFAULT_FILTERS = {
  query: '',
  guild: 'all',
  technique: 'all',
  artisan: '',
  maxPrice: PRICE_MAX,
  minRating: 0,
  giTier: 0,
  district: 'all',
  sort: 'featured'
};

const initialState = {
  cart: loadStorage(KEYS.cart, []),
  wishlist: loadStorage(KEYS.wishlist, ['hl-kani-004', 'hl-papr-003', 'hl-waln-001']),
  savedLater: loadStorage(KEYS.savedLater, []),
  coupon: loadStorage(KEYS.coupon, null),
  user: loadStorage(KEYS.user, DEFAULT_BUYER),
  addresses: loadStorage(KEYS.addresses, [DEFAULT_ADDRESS]),
  orders: loadStorage(KEYS.orders, []),
  customProducts: loadStorage(KEYS.customProducts, []),
  productOverrides: loadStorage(KEYS.productOverrides, {}),
  reviews: loadStorage(KEYS.reviews, {}),
  sellerInquiries: loadStorage(KEYS.sellerInquiries, []),
  buyerProfile: loadStorage(KEYS.buyerProfile, null),
  platformUsers: loadStorage(KEYS.platformUsers, []),
  adminToken: loadStorage(KEYS.adminToken, null),
  recentlyViewed: readRecentlyViewed(),
  compareList: [],
  toasts: [],
  /* the catalogue-wide loading veil: raised by any control that narrows the
     product grid, including the header search */
  veil: { open: false, text: '' },
  ui: {
    drawer: null,           // 'cart' | 'wishlist' | null
    modal: null,            // { type, payload } | null
    filters: DEFAULT_FILTERS,
    loadingProducts: false
  }
};

let toastSeq = 0;

function reducer(state, action) {
  switch (action.type) {
    /* -------------------------------------------------------------- cart */
    case 'cart/add': {
      const { productId, qty = 1 } = action;
      const existing = state.cart.find((e) => e.productId === productId);
      const cart = existing
        ? state.cart.map((e) =>
            e.productId === productId ? { ...e, qty: Math.min(e.qty + qty, 10) } : e
          )
        : [...state.cart, { productId, qty }];
      return { ...state, cart };
    }
    case 'cart/setQty': {
      const cart = state.cart
        .map((e) => (e.productId === action.productId ? { ...e, qty: action.qty } : e))
        .filter((e) => e.qty > 0);
      return { ...state, cart };
    }
    case 'cart/remove':
      return { ...state, cart: state.cart.filter((e) => e.productId !== action.productId) };
    case 'cart/clear':
      return { ...state, cart: [] };
    case 'cart/saveForLater': {
      if (!state.cart.some((e) => e.productId === action.productId)) return state;
      return {
        ...state,
        cart: state.cart.filter((e) => e.productId !== action.productId),
        savedLater: state.savedLater.includes(action.productId)
          ? state.savedLater
          : [...state.savedLater, action.productId]
      };
    }
    case 'cart/moveBack': {
      const exists = state.cart.find((e) => e.productId === action.productId);
      return {
        ...state,
        savedLater: state.savedLater.filter((id) => id !== action.productId),
        cart: exists
          ? state.cart.map((e) =>
              e.productId === action.productId ? { ...e, qty: e.qty + 1 } : e
            )
          : [...state.cart, { productId: action.productId, qty: 1 }]
      };
    }

    /* ---------------------------------------------------------- wishlist */
    case 'wishlist/toggle': {
      const has = state.wishlist.includes(action.productId);
      return {
        ...state,
        wishlist: has
          ? state.wishlist.filter((id) => id !== action.productId)
          : [...state.wishlist, action.productId]
      };
    }
    case 'wishlist/remove':
      return { ...state, wishlist: state.wishlist.filter((id) => id !== action.productId) };

    /* ---------------------------------------------------------- catalogue
       A product published in the seller portal is a first-class catalogue
       change, not a seller-local detail: the storefront filters, wishes and
       prices all read it. */
    case 'products/add':
      return { ...state, customProducts: [action.product, ...state.customProducts] };
    case 'products/update':
      return {
        ...state,
        customProducts: state.customProducts.map((p) =>
          p.id === action.id ? { ...p, ...action.patch } : p
        )
      };
    case 'products/remove':
      return {
        ...state,
        customProducts: state.customProducts.filter((p) => p.id !== action.id)
      };
    case 'overrides/set':
      return { ...state, productOverrides: { ...state.productOverrides, [action.id]: { ...(state.productOverrides[action.id] || {}), ...action.patch } } };
    case 'inquiries/add':
      return { ...state, sellerInquiries: [action.inquiry, ...state.sellerInquiries] };
    case 'inquiries/reply':
      return {
        ...state,
        sellerInquiries: state.sellerInquiries.map((i) =>
          i.id === action.id ? { ...i, reply: action.reply } : i
        )
      };
    case 'buyerProfile/set':
      return { ...state, buyerProfile: action.profile };
    case 'platformUsers/set':
      return { ...state, platformUsers: action.users };
    case 'adminToken/set':
      return { ...state, adminToken: action.token };

    /* Cross-tab refresh: another tab wrote this key, so adopt its value. */
    case 'external/sync':
      return { ...state, [action.slice]: action.value };

    /* ------------------------------------------------------------- other */
    case 'coupon/set':
      return { ...state, coupon: action.code };
    case 'user/set':
      return { ...state, user: action.user };
    case 'addresses/set':
      return { ...state, addresses: action.addresses };
    case 'order/add':
      return { ...state, orders: [action.order, ...state.orders] };
    case 'order/advance':
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.orderId
            ? { ...o, stage: Math.min(5, (o.stage || 1) + 1) }
            : o
        )
      };
    case 'reviews/set':
      return { ...state, reviews: action.reviews };
    case 'recentlyViewed/push':
      return { ...state, recentlyViewed: pushRecentlyViewed(action.id) };
    case 'recentlyViewed/clear':
      saveStorage('hunarlink_recently_viewed', []);
      return { ...state, recentlyViewed: [] };
    case 'compare/clear':
      return { ...state, compareList: [] };
    case 'compare/toggle': {
      const has = state.compareList.includes(action.productId);
      return {
        ...state,
        compareList: has
          ? state.compareList.filter((id) => id !== action.productId)
          : [...state.compareList, action.productId].slice(-4)
      };
    }
    case 'reviews/add': {
      const forProduct = state.reviews[action.productId] || [];
      return {
        ...state,
        reviews: { ...state.reviews, [action.productId]: [action.review, ...forProduct] }
      };
    }

    /* ----------------------------------------------------------------- ui */
    case 'ui/drawer':
      return { ...state, ui: { ...state.ui, drawer: action.drawer } };
    case 'ui/modal':
      return {
        ...state,
        ui: { ...state.ui, modal: action.modal ? { type: action.modal, payload: action.payload || {} } : null }
      };
    case 'ui/filters': {
      const next = { ...state.ui.filters, ...action.patch };
      /* Changing guild clears the technique. A technique belongs to a single
         guild — Kani is a pashmina weave — so carrying it into Walnut would
         quietly return zero results and read as a broken catalogue. */
      if ('guild' in action.patch && !('technique' in action.patch)) {
        next.technique = 'all';
      }
      return { ...state, ui: { ...state.ui, filters: next } };
    }
    case 'ui/veil':
      return { ...state, veil: { open: action.open, text: action.text || '' } };
    case 'ui/filtersReset':
      return { ...state, ui: { ...state.ui, filters: DEFAULT_FILTERS } };
    case 'ui/loading':
      return { ...state, ui: { ...state.ui, loadingProducts: action.value } };

    /* -------------------------------------------------------------- toast */
    case 'toast/push': {
      toastSeq += 1;
      return { ...state, toasts: [...state.toasts, { id: toastSeq, ...action.toast }] };
    }
    case 'toast/dismiss':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };

    default:
      return state;
  }
}

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const mounted = useRef(false);

  /* The catalogue is derived, not stored — custom products and overrides can
     both change at runtime from the seller portal. */
  const catalogue = useMemo(() => buildCatalogue(state.customProducts), [state.customProducts]);

  const totals = useMemo(
    () => cartTotals(state.cart, catalogue, state.coupon),
    [state.cart, catalogue, state.coupon]
  );

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    saveStorage(KEYS.cart, state.cart);
    saveStorage(KEYS.wishlist, state.wishlist);
    saveStorage(KEYS.savedLater, state.savedLater);
    saveStorage(KEYS.coupon, state.coupon);
    saveStorage(KEYS.user, state.user);
    saveStorage(KEYS.addresses, state.addresses);
    saveStorage(KEYS.orders, state.orders);
    saveStorage(KEYS.reviews, state.reviews);
    saveStorage(KEYS.customProducts, state.customProducts);
    saveStorage(KEYS.productOverrides, state.productOverrides);
    saveStorage(KEYS.sellerInquiries, state.sellerInquiries);
    saveStorage(KEYS.buyerProfile, state.buyerProfile);
    saveStorage(KEYS.platformUsers, state.platformUsers);
    saveStorage(KEYS.adminToken, state.adminToken);
  }, [
    state.cart,
    state.wishlist,
    state.savedLater,
    state.coupon,
    state.user,
    state.addresses,
    state.orders,
    state.reviews,
    state.customProducts,
    state.productOverrides,
    state.sellerInquiries,
    state.buyerProfile,
    state.platformUsers,
    state.adminToken
  ]);

  /* ---------------------------------------------------------- cross-tab sync
     localStorage is shared between tabs but a write in one tab fires no event
     in another, so a craft published in the seller portal used to sit invisible
     in an open storefront until a manual reload. The 'storage' event fires in
     every OTHER tab; re-read the changed key and adopt it. */
  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key) return;                       // clear() — ignore
      const slice = KEY_TO_SLICE[e.key];
      if (!slice) return;
      let value;
      try {
        value = e.newValue === null ? null : JSON.parse(e.newValue);
      } catch (err) {
        return;
      }
      dispatch({ type: 'external/sync', slice, value });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => {
    const productById = (id) => catalogue.find((p) => p.id === id) || catalogue[0];

    const toast = (message, tone = 'default') => {
      dispatch({ type: 'toast/push', toast: { message, tone } });
    };

    return {
      ...state,
      catalogue,
      totals,
      productById,
      cartCount: state.cart.reduce((n, e) => n + e.qty, 0),
      wishlistCount: state.wishlist.length,
      cartItems: state.cart
        .map((e) => ({ ...e, product: productById(e.productId) }))
        .filter((e) => e.product),
      wishlistItems: state.wishlist.map(productById).filter(Boolean),
      savedItems: state.savedLater.map(productById).filter(Boolean),
      recentlyViewedItems: state.recentlyViewed.map(productById).filter(Boolean),
      compareItems: state.compareList.map(productById).filter(Boolean),

      addToCart(productId, qty = 1) {
        dispatch({ type: 'cart/add', productId, qty });
        const p = productById(productId);
        if (p) toast(`Added "${p.title}" to your Acquisition Bag`, 'success');
      },
      setQty: (productId, qty) => dispatch({ type: 'cart/setQty', productId, qty }),
      removeFromCart: (productId) => dispatch({ type: 'cart/remove', productId }),
      clearCart: () => dispatch({ type: 'cart/clear' }),
      saveForLater: (productId) => dispatch({ type: 'cart/saveForLater', productId }),
      moveToCart: (productId) => dispatch({ type: 'cart/moveBack', productId }),

      toggleWishlist(productId) {
        const adding = !state.wishlist.includes(productId);
        dispatch({ type: 'wishlist/toggle', productId });
        const p = productById(productId);
        if (p) {
          toast(
            adding ? `Saved "${p.title}" to Wishlist` : `Removed "${p.title}" from Wishlist`,
            adding ? 'success' : 'default'
          );
        }
      },
      removeFromWishlist: (id) => dispatch({ type: 'wishlist/remove', productId: id }),

      applyCoupon(code) {
        const normalised = String(code || '').trim().toUpperCase();
        const known = ['VALLEY10', 'FIRSTCRAFT'].includes(normalised);
        dispatch({ type: 'coupon/set', code: known ? normalised : null });
        toast(
          known ? `Coupon ${normalised} applied` : `"${normalised}" is not a valid privilege code`,
          known ? 'success' : 'error'
        );
        return known;
      },
      removeCoupon: () => dispatch({ type: 'coupon/set', code: null }),

      addAddress: (address) =>
        dispatch({ type: 'addresses/set', addresses: [...state.addresses, address] }),
      setAddresses: (addresses) => dispatch({ type: 'addresses/set', addresses }),
      addProduct: (product) => dispatch({ type: 'products/add', product }),
      updateProduct: (id, patch) => dispatch({ type: 'products/update', id, patch }),
      removeProduct: (id) => dispatch({ type: 'products/remove', id }),
      setProductOverride: (id, patch) => dispatch({ type: 'overrides/set', id, patch }),
      setReviews: (reviews) => dispatch({ type: 'reviews/set', reviews }),
      addInquiry: (inquiry) => dispatch({ type: 'inquiries/add', inquiry }),
      replyToInquiry: (id, reply) => dispatch({ type: 'inquiries/reply', id, reply }),
      setBuyerProfile: (profile) => dispatch({ type: 'buyerProfile/set', profile }),
      setPlatformUsers: (users) => dispatch({ type: 'platformUsers/set', users }),
      setAdminToken: (token) => dispatch({ type: 'adminToken/set', token }),

      placeOrder: (order) => dispatch({ type: 'order/add', order }),
      addOrder: (order) => dispatch({ type: 'order/add', order }),
      advanceOrder: (orderId) => dispatch({ type: 'order/advance', orderId }),
      addReview: (productId, review) => dispatch({ type: 'reviews/add', productId, review }),
      toggleCompare: (productId) => dispatch({ type: 'compare/toggle', productId }),
      clearCompare: () => dispatch({ type: 'compare/clear' }),

      openDrawer: (drawer) => dispatch({ type: 'ui/drawer', drawer }),
      closeDrawer: () => dispatch({ type: 'ui/drawer', drawer: null }),
      openModal: (modal, payload) => dispatch({ type: 'ui/modal', modal, payload }),
      closeModal: () => dispatch({ type: 'ui/modal', modal: null }),
      setFilters: (patch) => dispatch({ type: 'ui/filters', patch }),
      /* The filter veil used to be local state inside MarketplaceSection, which
         meant the header search -- a filter control living in a different
         component tree -- could not raise it. It is store state now so every
         control that narrows the catalogue goes through the same loading
         state. */
      raiseVeil: (text) => dispatch({ type: 'ui/veil', open: true, text }),
      lowerVeil: () => dispatch({ type: 'ui/veil', open: false }),
      resetFilters: () => dispatch({ type: 'ui/filtersReset' }),
      setLoadingProducts: (value) => dispatch({ type: 'ui/loading', value }),

      /* `silent` is for mirroring a session that already exists — syncing the
         header from disk, or landing after a page that has its own message.
         Without it every refresh of /login announced "Signed in as Priya". */
      setUser: (user, opts = {}) => {
        dispatch({ type: 'user/set', user });
        if (!opts.silent) {
          toast(user ? `Signed in as ${user.name || user.email}` : 'Signed out');
        }
      },
      pushRecent: (id) => dispatch({ type: 'recentlyViewed/push', id }),
      clearRecentlyViewed: () => dispatch({ type: 'recentlyViewed/clear' }),

      toast,
      dismissToast: (id) => dispatch({ type: 'toast/dismiss', id }),

      /* ---------------------------------------------------------- derived */
      /* Same predicate chain as getFilteredProducts() in the static build,
         so behaviour is identical, including the sort order. */
      filteredProducts: (() => {
        const f = state.ui.filters;
        const q = (f.query || '').trim().toLowerCase();
        let list = catalogue.filter((p) => {
          if (q) {
            const hay = `${p.title} ${p.guildLabel} ${p.artisan} ${p.district} ${p.giId}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          if (f.guild !== 'all' && p.guild !== f.guild) return false;
          /* Technique is a second axis inside one guild. 'all' means no
             narrowing, and products outside the pashmina family simply have no
             technique field, so they are unaffected by this filter. */
          if (f.technique && f.technique !== 'all' && p.technique !== f.technique) return false;
          if (f.artisan && p.artisan !== f.artisan) return false;
          if (p.price > f.maxPrice) return false;
          if (f.minRating > 0 && p.rating < f.minRating) return false;
          if (f.giTier > 0 && p.giLevel < f.giTier) return false;
          if (f.district !== 'all' && p.district !== f.district) return false;
          return true;
        });
        const s = f.sort;
        if (s === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
        else if (s === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
        else if (s === 'rating-desc') list = [...list].sort((a, b) => b.rating - a.rating);
        else if (s === 'hours-desc') list = [...list].sort((a, b) => b.loomHours - a.loomHours);
        return list;
      })()
    };
  }, [state, catalogue, totals]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
}

export { KEYS };

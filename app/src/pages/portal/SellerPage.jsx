import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/portal.css';
import PortalScope from '../../components/PortalScope.jsx';
import { useStore } from '../../state/StoreContext.jsx';
import { formatINR, asset } from '../../utils/legacy.js';
import { appHref } from '../../utils/href.js';
import { IconGrid, IconPlus, IconPalette, IconPackage, IconChat, IconHeart, IconX } from '../../components/LineIcons.jsx';

/* ==========================================================================
   SellerPage — artisan workspace (dashboard.html)
   --------------------------------------------------------------------------
   Behaviour ported from seller-portal/dashboard.js. The static controller had
   ~40 functions driving the DOM by id; every one is React state now:

     initPortal / populateSellerIdentity  -> the session gate + header identity
     switchSellerTab                      -> `tab`
     refreshAllData + 4 render* functions -> derived data + JSX below
     handlePublishProduct                 -> submitPublish
     renderSellerProducts / openEdit...   -> `products` + `editingId` modal
     saveCustomizedProduct / quickAdjust  -> saveEdit / adjustStock / delete
     renderIncomingOrders / setOrderStage -> `orders` + setStage
     saveSellerOrderNote                  -> saveNote
     simulateIncomingBuyerOrder           -> simulateOrder
     renderProductResponses / submitReply -> `responses` + submitReply
     simulateBuyerResponse                -> simulateInquiry
     image presets / upload / prefill     -> `newImage` + readPhoto

   Storage keys are unchanged, so a product published here still shows up on
   the storefront and an order placed there still lands here.
   ========================================================================== */

const KEYS = {
  AUTH: 'hunarlink_auth_user',
  CUSTOM_PRODUCTS: 'hunarlink_custom_products',
  OVERRIDES: 'hunarlink_product_overrides',
  ORDERS: 'hunarlink_orders',
  REVIEWS: 'hunarlink_reviews',
  INQUIRIES: 'hunarlink_seller_inquiries',
  WISHLIST: 'hunarlink_wishlist',
  CART: 'hunarlink_cart'
};

/* One entry per guild, each listing the techniques that guild actually has.
   Sellers used to be able to pick "Kani Jamawar & Sozni" as a category, which
   filed an embroidery technique as if it were a different craft family. */
const GUILD_META = {
  pashmina: {
    label: 'Pashmina Textiles',
    defaultImg: 'assets/products/pashmina_01.jpg',
    techniques: [
      { id: 'handwoven', label: 'Handwoven Pashmina' },
      { id: 'kani', label: 'Kani Tapestry Weave' },
      { id: 'sozni', label: 'Sozni Needle Embroidery' }
    ]
  },
  walnut: { label: 'Walnut Woodcarving', defaultImg: 'assets/products/walnut_01.jpg', techniques: [] },
  'papier-mache': { label: 'Papier-Mâché Art', defaultImg: 'assets/products/papier_01.jpg', techniques: [] },
  'silk-rugs': { label: 'Silk-on-Silk Rugs', defaultImg: 'assets/products/silkrug_01.jpg', techniques: [] }
};

const IMAGE_PRESETS = [
  { key: 'pashmina', label: 'Pashmina', path: 'assets/products/pashmina_01.jpg' },
  { key: 'walnut', label: 'Walnut', path: 'assets/products/walnut_01.jpg' },
  { key: 'papier-mache', label: 'Papier-Mâché', path: 'assets/products/papier_01.jpg' },
  { key: 'silk-rugs', label: 'Silk Rug', path: 'assets/products/silkrug_01.jpg' },
  { key: 'kani', label: 'Kani Weave', path: 'assets/products/kani_01.jpg' },
  { key: 'sozni', label: 'Sozni Embroidery', path: 'assets/products/sozni_01.jpg' },
  { key: 'loom', label: 'Kani Loom', path: 'assets/image_1.jpg' }
];

const TRACKING_STAGES = [
  '1. Order Confirmed',
  '2. GI Seal Verified',
  '3. Packed at Atelier',
  '4. Insured Transit',
  '5. Delivered'
];

const TAB_TITLES = {
  overview: {
    title: 'Artisan Command Center',
    sub: 'Real-time overview of your verified HunarLink store, earnings, and buyer activity.'
  },
  list: {
    title: 'List New Craft on HunarLink',
    sub: 'Publish a handmade Kashmiri craft directly to live buyers with zero middleman cut.'
  },
  products: {
    title: 'My Listed Products & Customizer',
    sub: 'Customize prices, stock, photos, GI details, and descriptions anytime.'
  },
  orders: {
    title: 'Incoming Customer Orders',
    sub: 'Inspect complete customer information, payment status, GI items, and dispatch tracking.'
  },
  responses: {
    title: 'Product Responses & Buyer Feedback',
    sub: 'See wishlist saves, active cart interest, customer reviews, and send artisan replies.'
  }
};

/* Starter featured crafts so a demo artisan has catalog items to customise. */
const DEMO_SEED_FALLBACK = [
  {
    id: 'hl-pash-001',
    title: 'Royal Khudrang Pashmina Shawl',
    guild: 'pashmina',
    technique: 'sozni',
    guildLabel: 'Pashmina Textiles',
    artisan: 'Master Ghulam Qadir Mir',
    district: 'Srinagar',
    price: 1650,
    mrp: 1990,
    rating: 4.9,
    reviewCount: 42,
    giId: 'GI-JK-PASH-8821',
    giLevel: 3,
    purityMetric: '14.2 Micron Changthangi Fleece • 100% Hand-Spun',
    loomHours: 420,
    dimensions: '205 cm × 102 cm',
    stock: 4,
    image: 'assets/products/pashmina_01.jpg',
    description:
      'Unbleached natural Khudrang Ladakhi Changthangi pashmina hand-woven on a traditional wooden loom in Srinagar with delicate Sozni hand-embroidered border.',
    isCatalogSeed: true
  },
  {
    id: 'hl-pash-002',
    title: 'Jamawar Heirloom Stole',
    guild: 'pashmina',
    technique: '',
    guildLabel: 'Pashmina Textiles',
    artisan: 'Master Ghulam Qadir Mir',
    district: 'Srinagar',
    price: 1850,
    mrp: 1999,
    rating: 4.9,
    reviewCount: 37,
    giId: 'GI-JK-PASH-8810',
    giLevel: 3,
    purityMetric: '14.5 Micron Changthangi • Natural Indigo & Madder Dyes',
    loomHours: 980,
    dimensions: '200 cm × 100 cm',
    stock: 3,
    image: 'assets/products/pashmina_02.jpg',
    description:
      'Heirloom Kani-border wrap blending deep forest-emerald field work with traditional Badam paisley motifs, dyed with natural valley indigo.',
    isCatalogSeed: true
  },
  {
    id: 'hl-waln-001',
    title: 'Openwork Chinar Lattice Walnut Chest',
    guild: 'walnut',
    guildLabel: 'Walnut Woodcarving',
    artisan: 'Fayaz Ahmad Wani',
    district: 'Anantnag',
    price: 14800,
    mrp: 21500,
    rating: 4.9,
    reviewCount: 46,
    giId: 'GI #JK-WNT-1180',
    giLevel: 3,
    purityMetric: 'Seasoned Juglans Regia Walnut • 5-Yr Cured',
    loomHours: 220,
    dimensions: '42 cm × 26 cm × 22 cm',
    stock: 2,
    image: 'assets/products/walnut_01.jpg',
    description:
      'Single-block seasoned Kashmiri walnut root chest chiseled with intricate Chinar leaf openwork and traditional Jali patterns, finished with natural beeswax polish.',
    isCatalogSeed: true
  }
];

const BLANK_NEW = {
  title: '',
  guild: 'pashmina',
  price: '',
  mrp: '',
  stock: '5',
  hours: '180',
  dimensions: '205 cm × 100 cm',
  district: 'Srinagar',
  purity: '',
  giId: '',
  description: ''
};

const resolveImg = (src) => {
  if (!src) return asset('assets/image_1.jpg');
  if (/^https?:|^data:/.test(src)) return src;
  return asset(String(src).replace(/^\/+/, ''));
};

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    /* quota — the page keeps working for this session */
  }
};

export default function SellerPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const editFileRef = useRef(null);

  const [seller, setSeller] = useState(null);
  const [tab, setTab] = useState('overview');

  /* The catalogue lives in the store, which is the single owner of
     hunarlink_custom_products. Reading it from here instead of a private
     useState is what lets a publish reach a storefront open in another tab. */
  const {
    toast,
    user: storeUser,
    customProducts,
    orders,
    reviews,
    wishlist,
    cart,
    productOverrides: overrides,
    sellerInquiries: inquiries,
    addProduct,
    updateProduct,
    removeProduct: removeProductFromStore,
    setProductOverride,
    replyToInquiry,
    addInquiry,
    setReviews
  } = useStore();

  /* Overrides and inquiries are maps/arrays owned by the store. These thin
     wrappers keep the call sites below readable while every write still goes
     through a reducer action, so another tab sees it. */
  const setOverrides = (updater) => {
    const next = typeof updater === 'function' ? updater(overrides) : updater;
    Object.keys(next).forEach((id) => {
      if (JSON.stringify(next[id]) !== JSON.stringify(overrides[id])) {
        setProductOverride(id, next[id]);
      }
    });
  };

  const [newForm, setNewForm] = useState(BLANK_NEW);
  const [newImage, setNewImage] = useState('assets/products/pashmina_01.jpg');
  const [newPhotoName, setNewPhotoName] = useState('');
  const [prodQuery, setProdQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editImage, setEditImage] = useState(null);

  const [replyDrafts, setReplyDrafts] = useState({});
  const [notes, setNotes] = useState({});

  /* ---- session gate --------------------------------------------------
     The signed-in user is store state now, so signing in or out in any tab
     re-renders this gate without a focus or storage listener. */
  useEffect(() => {
    const artisan =
      storeUser && storeUser.isLoggedIn && storeUser.role === 'artisan' ? storeUser : null;
    setSeller(artisan);
  }, [storeUser]);

  /* seedInitialSellerInquiriesIfEmpty — the static console seeded two sample
     responses the first time a seller opened the workspace. */
  useEffect(() => {
    if (!seller) return;
    if (inquiries && inquiries.length > 0) return;
    const sample = [
      {
        id: 'inq-101',
        type: 'Inquiry',
        author: 'Ananya Kapoor (New Delhi)',
        productTitle: 'Royal Khudrang Pashmina Shawl',
        date: 'Today, 10:15 AM',
        rating: null,
        comment:
          'Namaste Ustad ji! Does this shawl come with the official J&K GI lab micron report and gift cedar box?',
        reply: ''
      },
      {
        id: 'inq-102',
        type: 'Review',
        author: 'Vikramaditya Singh (Mumbai)',
        productTitle: 'Openwork Chinar Lattice Walnut Chest',
        date: 'Yesterday',
        rating: 5,
        comment:
          'Extraordinary deep relief carving! Scanned the GI QR tag on arrival and verified Anantnag lineage immediately.',
        reply:
          'Thank you for supporting Kashmiri walnut artisans directly. Wishing your family generations of joy with this heirloom!'
      }
    ];
    addInquiry(sample);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seller]);

  /* Persistence belongs to the store — see StoreContext's single write effect.
     This page no longer touches localStorage for any of these collections. */

  /* ---- derived: the seller's catalogue -------------------------------- */
  const products = useMemo(() => {
    const sellerName = String(seller?.name || '').toLowerCase();
    const seedMatches = sellerName
      ? DEMO_SEED_FALLBACK.filter((p) => {
          const a = p.artisan.toLowerCase();
          return (
            sellerName.includes(a) ||
            a.includes(sellerName.replace(/^ustad\s+|^master\s+/i, ''))
          );
        })
      : [];
    const seen = new Set();
    return [...customProducts, ...seedMatches]
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .map((p) => (overrides[p.id] ? { ...p, ...overrides[p.id] } : p));
  }, [customProducts, overrides, seller]);

  const filteredProducts = useMemo(() => {
    const q = prodQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        String(p.giId || '').toLowerCase().includes(q) ||
        String(p.guildLabel || '').toLowerCase().includes(q)
    );
  }, [products, prodQuery]);

  const visibleOrders = useMemo(() => {
    if (orderFilter === 'active') return orders.filter((o) => (o.stage || 1) < 5);
    if (orderFilter === 'delivered') return orders.filter((o) => (o.stage || 1) >= 5);
    return orders;
  }, [orders, orderFilter]);

  /* renderProductResponses: inquiries plus every storefront review. */
  const responses = useMemo(() => {
    const list = [...(inquiries || [])];
    Object.entries(reviews || {}).forEach(([prodId, arr]) => {
      if (!Array.isArray(arr)) return;
      const prod = products.find((p) => p.id === prodId);
      const title = prod ? prod.title : `Craft (${prodId})`;
      arr.forEach((rev, i) => {
        list.push({
          id: `rev-${prodId}-${i}`,
          sourceKey: prodId,
          sourceIndex: i,
          type: 'Verified Buyer Review',
          author: rev.author || 'Verified Buyer',
          productTitle: title,
          date: rev.date || 'Recent',
          rating: rev.rating || 5,
          comment: rev.comment || '',
          reply: rev.artisanReply || ''
        });
      });
    });
    return list;
  }, [inquiries, reviews, products]);

  const newOrderCount = orders.filter((o) => o.isNewForSeller).length;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const liveCount = products.filter((p) => p.status !== 'paused').length;

  const initials =
    seller?.badge ||
    String(seller?.name || 'UM')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  /* ---- actions -------------------------------------------------------- */
  function switchTab(next) {
    setTab(next);
    if (next === 'orders' && newOrderCount > 0) {
      /* markOrdersSeenBySeller */
      setOrders((list) => list.map((o) => ({ ...o, isNewForSeller: false })));
    }
  }

  function logout() {
    try {
      localStorage.removeItem(KEYS.AUTH);
    } catch (err) {
      /* ignore */
    }
    navigate('/auth?mode=login&role=artisan');
  }

  /* handleProductImageUpload — downscale to 720px and keep it as a data URL so
     localStorage does not blow up. */
  function readPhoto(file, onDone) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 720 / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        onDone(canvas.toDataURL('image/jpeg', 0.82));
        toast('Product photograph ready!', 'success');
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function pickPreset(path, label) {
    setNewImage(path);
    setNewPhotoName('');
    toast(`Selected preset: ${label}`);
  }

  function submitPublish(e) {
    e.preventDefault();
    if (!seller) return;
    const price = parseInt(newForm.price, 10);
    if (!newForm.title.trim() || !price) {
      toast('A product title and selling price are required.');
      return;
    }
    const mrpInput = parseInt(newForm.mrp, 10);
    const mrp = Math.max(price, mrpInput || Math.round(price * 1.18));
    const guildInfo = GUILD_META[newForm.guild] || GUILD_META.pashmina;
    const giRaw = newForm.giId.trim();
    const generatedGi = seller.giCertified
      ? giRaw || seller.giId || `GI-JK-${Math.floor(1000 + Math.random() * 9000)}`
      : giRaw || `HL-ART-${Math.floor(1000 + Math.random() * 9000)}`;

    const product = {
      id: 'hl-seller-' + Date.now(),
      title: newForm.title.trim(),
      guild: newForm.guild,
      technique: guildInfo.techniques.length ? newForm.technique || guildInfo.techniques[0].id : '',
      guildLabel: guildInfo.label,
      artisan: seller.name,
      sellerEmail: seller.email,
      district: newForm.district,
      price,
      mrp,
      rating: 5.0,
      reviewCount: 0,
      giId: generatedGi,
      giLevel: seller.giCertified ? 3 : 1,
      purityMetric: newForm.purity.trim(),
      loomHours: parseInt(newForm.hours, 10) || 120,
      dimensions: newForm.dimensions.trim(),
      stock: parseInt(newForm.stock, 10) || 1,
      status: 'live',
      image: newImage || guildInfo.defaultImg,
      description: newForm.description.trim(),
      listedAt: new Date().toISOString()
    };

    addProduct(product);
    setNewForm({ ...BLANK_NEW, guild: seller.craft || 'pashmina', district: seller.district || 'Srinagar', giId: seller.giCertified ? seller.giId || '' : '' });
    setNewImage(guildInfo.defaultImg);
    setNewPhotoName('');
    setTab('products');
    toast(`"${product.title}" is now LIVE on HunarLink (${generatedGi})!`, 'success');
  }

  function openEdit(product) {
    setEditingId(product.id);
    setEditImage(product.image);
    setEditForm({
      title: product.title || '',
      guild: product.guild || 'pashmina',
      technique: product.technique || '',
      price: product.price || 1500,
      mrp: product.mrp || 1990,
      stock: product.stock ?? 1,
      hours: product.loomHours || 120,
      dimensions: product.dimensions || '',
      status: product.status === 'paused' ? 'paused' : 'live',
      purity: product.purityMetric || '',
      giId: product.giId || '',
      description: product.description || ''
    });
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm(null);
    setEditImage(null);
  }

  function saveEdit(e) {
    e.preventDefault();
    const id = editingId;
    const price = parseInt(editForm.price, 10) || 1000;
    const mrpInput = parseInt(editForm.mrp, 10) || price;
    const guild = editForm.guild;

    const updates = {
      title: editForm.title.trim(),
      guild,
      technique: GUILD_META[guild]?.techniques.length
        ? editForm.technique || GUILD_META[guild].techniques[0].id
        : '',
      guildLabel: GUILD_META[guild]?.label || guild,
      price,
      mrp: Math.max(price, mrpInput),
      stock: Math.max(0, parseInt(editForm.stock, 10) || 0),
      loomHours: parseInt(editForm.hours, 10) || 120,
      dimensions: editForm.dimensions.trim(),
      status: editForm.status,
      purityMetric: editForm.purity.trim(),
      giId: editForm.giId.trim(),
      description: editForm.description.trim(),
      image: editImage || GUILD_META[guild].defaultImg,
      updatedAt: new Date().toISOString()
    };

    /* custom products live in their own key; catalog seeds are only patched
       through the overrides map, exactly as the static controller did. */
    if (customProducts.some((p) => p.id === id)) {
      updateProduct(id, updates);
    } else {
      setOverrides((map) => ({ ...map, [id]: { ...(map[id] || {}), ...updates } }));
    }
    closeEdit();
    toast(`Customized "${updates.title}" — live on HunarLink!`, 'success');
  }

  function adjustStock(id, delta) {
    if (customProducts.some((p) => p.id === id)) {
      const current = customProducts.find((p) => p.id === id);
      updateProduct(id, { stock: Math.max(0, ((current && current.stock) || 0) + delta) });
    } else {
      const current = products.find((p) => p.id === id);
      const next = Math.max(0, ((current && current.stock) || 0) + delta);
      setOverrides((map) => ({ ...map, [id]: { ...(map[id] || {}), stock: next } }));
    }
    toast('Stock updated and synced to storefront!', 'success');
  }

  function removeProduct(id) {
    if (!window.confirm('Remove this product listing from HunarLink?')) return;
    removeProductFromStore(id);
    toast('Listing removed from HunarLink catalog.');
  }

  function setStage(orderId, stage) {
    setOrders((list) =>
      list.map((o) =>
        o.id === orderId ? { ...o, stage, isNewForSeller: false } : o
      )
    );
    toast(`Order #${orderId} updated to: ${TRACKING_STAGES[stage - 1]}`, 'success');
  }

  function saveNote(orderId) {
    const note = String(notes[orderId] || '').trim();
    setOrders((list) => list.map((o) => (o.id === orderId ? { ...o, sellerNote: note } : o)));
    toast(`Dispatch update saved for Order #${orderId} & sent to buyer!`, 'success');
  }

  function simulateOrder() {
    const prod = products[0] || DEMO_SEED_FALLBACK[0];
    const now = new Date();
    const orderId = 'HL-ORD-2026-' + Math.floor(1000 + Math.random() * 9000);
    const buyers = [
      { name: 'Priya Sharma', phone: '+91 98112 77420', email: 'priya.sharma@valleycollector.in', locality: 'B-42 Defence Colony, Ring Road', city: 'New Delhi', pincode: '110024', addressType: 'Home' },
      { name: 'Arjun Malhotra', phone: '+91 98201 33915', email: 'arjun.m@heritagehomes.in', locality: '14th Floor, Seaface Residency, Worli', city: 'Mumbai, Maharashtra', pincode: '400018', addressType: 'Office' },
      { name: 'Meera Nair', phone: '+91 98450 61890', email: 'meera.nair@designcraft.in', locality: '72 Indiranagar 100ft Road', city: 'Bengaluru, Karnataka', pincode: '560038', addressType: 'Home' }
    ];
    const b = buyers[Math.floor(Math.random() * buyers.length)];

    const order = {
      id: orderId,
      date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      createdAt: now.toISOString(),
      buyer: { ...b, fullAddress: `${b.name}, ${b.locality}, ${b.city} - ${b.pincode}` },
      items: [
        {
          productId: prod.id,
          title: prod.title,
          qty: 1,
          price: prod.price,
          lineTotal: prod.price,
          giId: prod.giId,
          artisan: prod.artisan,
          guild: prod.guildLabel || prod.guild,
          image: prod.image
        }
      ],
      subtotal: prod.price,
      discount: 0,
      couponCode: null,
      shippingFee: 0,
      total: prod.price,
      artisanPayout: prod.price,
      paymentMethod: 'UPI Verified Escrow',
      paymentStatus: 'Paid (Escrow Protected)',
      address: `${b.name}, ${b.locality}, ${b.city} - ${b.pincode}`,
      stage: 1,
      sellerNote: '',
      isNewForSeller: true
    };
    setOrders((list) => [order, ...list]);
    toast(`New Order #${orderId} received from ${b.name} (${formatINR(prod.price)})!`, 'success');
  }

  function submitReply(e, resp) {
    e.preventDefault();
    const text = String(replyDrafts[resp.id] || '').trim();
    if (!text) return;
    if (resp.sourceKey && resp.sourceIndex >= 0) {
      const next = { ...reviews };
      if (next[resp.sourceKey] && next[resp.sourceKey][resp.sourceIndex]) {
        next[resp.sourceKey] = next[resp.sourceKey].map((r, i) =>
          i === resp.sourceIndex ? { ...r, artisanReply: text } : r
        );
        setReviews(next);
        setReviews(next);
      }
    } else {
      replyToInquiry(resp.id, text);
    }
    setReplyDrafts((d) => ({ ...d, [resp.id]: '' }));
    toast('Your artisan response has been published!', 'success');
  }

  function simulateInquiry() {
    const prod = products[0] || DEMO_SEED_FALLBACK[0];
    addInquiry({
        id: 'inq-' + Date.now(),
        type: 'Buyer Question',
        author: 'Rhea Deshmukh (Pune)',
        productTitle: prod.title,
        date: 'Just now',
        rating: 5,
        comment: `Hi ${seller?.name || 'Ustad ji'}, I loved "${prod.title}"! Can you include a gift card and confirm dispatch time to Pune?`,
        reply: ''
      });
    toast('New buyer inquiry received on your product!', 'success');
  }

  const meta = TAB_TITLES[tab] || TAB_TITLES.overview;
  const newDiscountHint = (() => {
    const price = Number(newForm.price || 0);
    const mrp = Number(newForm.mrp || 0);
    if (price > 0 && mrp > price) {
      const pct = Math.round(((mrp - price) / mrp) * 100);
      return { text: `Shows ${pct}% OFF direct artisan savings on HunarLink`, color: 'var(--success-600)' };
    }
    return { text: 'MRP should be equal to or higher than Selling Price', color: 'var(--text-500)' };
  })();

  return (
    <>
      <PortalScope family="seller" />

      {/* VERIFICATION & LOGIN GATE */}
      <section
        className="auth-gate-screen"
        id="auth-gate-screen"
        style={{ display: seller ? 'none' : 'flex' }}
      >
        <div className="auth-gate-card">
          <div className="gate-emblem">H</div>
          <h2 className="gate-title">Artisan Verification Required</h2>
          <p className="gate-desc">
            The HunarLink Seller Workspace is exclusively available to logged-in and verified Kashmiri
            artisans. Please sign in or complete your GI / Standard seller registration to list crafts,
            customize product details, and receive real-time customer orders.
          </p>
          <div className="gate-actions">
            <a href={appHref('/auth?mode=login&role=artisan')} className="btn-forest" style={{ width: '100%' }}>Sign In as Verified Artisan →
            </a>
            <a href={appHref('/auth?mode=register&role=artisan')} className="btn-gold" style={{ width: '100%' }}>Complete Seller Registration &amp; Verification
            </a>
            <a href={appHref('/')} className="btn-outline" style={{ width: '100%' }}>
              ← Back to HunarLink Marketplace
            </a>
          </div>
        </div>
      </section>

      {/* AUTHENTICATED SELLER WORKSPACE */}
      <div
        className="portal-shell"
        id="portal-shell"
        style={{ display: seller ? 'grid' : 'none' }}
      >
        {/* Sidebar */}
        <aside className="portal-sidebar">
          <div>
            <a href={appHref('/')} className="sidebar-brand">
              <span className="sidebar-emblem">H</span>
              <div>
                <div className="sidebar-brand-title">HunarLink</div>
                <div className="sidebar-brand-sub">Artisan Seller Portal</div>
              </div>
            </a>

            <div className="sidebar-identity">
              <div className="seller-avatar" id="seller-avatar">{initials}</div>
              <div className="seller-id-text">
                <div className="seller-id-name" id="seller-name">{seller?.name || 'Verified Artisan'}</div>
                <div className="seller-id-atelier" id="seller-atelier">
                  {seller?.business || `${seller?.district || 'Kashmir'} Heritage Atelier`}
                </div>
              </div>
              <span
                className={`seller-status-badge${seller?.giCertified ? '' : ' standard'}`}
                id="seller-gi-badge"
              >
                {seller?.giCertified
                  ? `GI Certified • ${seller.giId || 'Verified'}`
                  : 'Verified Standard Artisan'}
              </span>
            </div>

            <nav className="sidebar-nav" aria-label="Seller Workspace Sections">
              <button
                type="button"
                className={`nav-tab-btn${tab === 'overview' ? ' active' : ''}`}
                data-tab="overview"
                onClick={() => switchTab('overview')}
              >
                <span className="nav-icon"><IconGrid size={16} /></span> Overview
              </button>
              <button
                type="button"
                className={`nav-tab-btn${tab === 'list' ? ' active' : ''}`}
                data-tab="list"
                onClick={() => switchTab('list')}
              >
                <span className="nav-icon"><IconPlus size={16} /></span> List New Product
              </button>
              <button
                type="button"
                className={`nav-tab-btn${tab === 'products' ? ' active' : ''}`}
                data-tab="products"
                onClick={() => switchTab('products')}
              >
                <span className="nav-icon"><IconPalette size={16} /></span> My Products &amp; Edit
                <span className="nav-badge" id="badge-products-count">{products.length}</span>
              </button>
              <button
                type="button"
                className={`nav-tab-btn${tab === 'orders' ? ' active' : ''}`}
                data-tab="orders"
                onClick={() => switchTab('orders')}
              >
                <span className="nav-icon"><IconPackage size={16} /></span> Incoming Orders
                <span className={`nav-badge${newOrderCount > 0 ? ' alert' : ''}`} id="badge-orders-count">
                  {newOrderCount > 0 ? `${newOrderCount} NEW` : orders.length}
                </span>
              </button>
              <button
                type="button"
                className={`nav-tab-btn${tab === 'responses' ? ' active' : ''}`}
                data-tab="responses"
                onClick={() => switchTab('responses')}
              >
                <span className="nav-icon"><IconChat size={16} /></span> Product Responses
                <span className="nav-badge" id="badge-responses-count">{responses.length}</span>
              </button>
            </nav>
          </div>

          <div className="sidebar-footer">
            <a href={appHref('/')} className="btn-outline sidebar-storefront-link">Live Storefront ↗</a>
            <button type="button" className="btn-outline" onClick={logout}>Sign Out</button>
          </div>
        </aside>

        {/* Main */}
        <div className="portal-main">
          <header className="portal-topbar">
            <div className="topbar-title-group">
              <h1 id="topbar-heading">{meta.title}</h1>
              <div className="topbar-sub" id="topbar-sub">{meta.sub}</div>
            </div>
            <div className="topbar-actions">
              <button
                type="button"
                className="btn-outline"
                onClick={() => toast('Synced live products, customer orders & buyer responses from HunarLink!', 'success')}
              >Sync Live Data
              </button>
              <button type="button" className="btn-gold" onClick={() => switchTab('list')}>
                ＋ List New Craft
              </button>
            </div>
          </header>

          <main className="portal-content">
            {/* TAB 1: OVERVIEW */}
            <section className={`tab-panel${tab === 'overview' ? ' active' : ''}`} id="tab-overview">
              <div className="verification-banner" id="verification-banner">
                <div>
                  <h2 id="banner-welcome-title">Welcome, {seller?.name || 'Master Artisan'}</h2>
                  <p id="banner-welcome-desc">
                    {seller?.skillDescription
                      ? `"${seller.skillDescription}"`
                      : `Your ${seller?.business || 'Artisan Studio'} (${seller?.district || 'Jammu & Kashmir'} Cluster) is verified and connected live to the HunarLink marketplace.`}
                  </p>
                  <div className="verification-pills" id="verification-pills">
                    <span className="v-pill gold">Account Authenticated</span>
                    {seller?.giCertified ? (
                      <>
                        <span className="v-pill gold">GI ID: {seller.giId || 'Registered'}</span>
                        {seller.liveVerification?.certPhotoCaptured && (
                          <span className="v-pill">Live GI Certificate Verified</span>
                        )}
                        {seller.liveVerification?.productVideoRecorded && (
                          <span className="v-pill">Workshop Video Verified ({seller.liveVerification.videoDurationSec || 5}s)
                          </span>
                        )}
                        {seller.liveVerification?.passportPhotoCaptured && (
                          <span className="v-pill">Live Passport ID Verified</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="v-pill">Standard Seller Account</span>
                        <span className="v-pill">{seller?.district || 'Jammu & Kashmir'} Cluster</span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn-gold" onClick={() => switchTab('list')}>
                    ＋ List a Craft Now
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ background: 'rgba(255,255,255,0.12)', color: '#FFF', borderColor: 'rgba(255,255,255,0.3)' }}
                    onClick={() => switchTab('orders')}
                  >
                    View Orders →
                  </button>
                </div>
              </div>

              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-label">Listed Crafts</span>
                    <span className="kpi-icon"><IconPalette size={17} /></span>
                  </div>
                  <div className="kpi-value" id="kpi-listed">{products.length}</div>
                  <div className="kpi-sub" id="kpi-listed-sub">{liveCount} active live on HunarLink</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-label">Total Orders Received</span>
                    <span className="kpi-icon"><IconPackage size={17} /></span>
                  </div>
                  <div className="kpi-value" id="kpi-orders">{orders.length}</div>
                  <div className="kpi-sub" id="kpi-orders-sub">
                    {newOrderCount > 0
                      ? `${newOrderCount} new order(s) awaiting review`
                      : 'All orders synced live'}
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-label">Direct Artisan Earnings</span>
                    <span className="kpi-icon">₹</span>
                  </div>
                  <div className="kpi-value" id="kpi-revenue">{formatINR(totalRevenue)}</div>
                  <div className="kpi-sub">Zero middleman commission (100% yours)</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-label">Buyer Responses</span>
                    <span className="kpi-icon"><IconChat size={17} /></span>
                  </div>
                  <div className="kpi-value" id="kpi-responses">{responses.length}</div>
                  <div className="kpi-sub" id="kpi-responses-sub">Reviews, saves &amp; inquiries</div>
                </div>
              </div>

              <div className="section-card">
                <div className="section-card-head">
                  <h3 className="section-card-title">Latest Customer Order Activity</h3>
                  <button type="button" className="btn-outline" onClick={() => switchTab('orders')}>
                    Manage All Orders →
                  </button>
                </div>
                <div id="overview-latest-orders">
                  {orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-500)', fontSize: '0.86rem' }}>
                      No orders received yet. When a user orders on HunarLink, complete customer and item details
                      appear here instantly!
                    </div>
                  ) : (
                    orders.slice(0, 2).map((o) => {
                      const buyerName =
                        o.buyer?.name || (o.address || '').split(',')[0] || 'HunarLink User';
                      const stageLbl = TRACKING_STAGES[(o.stage || 1) - 1] || TRACKING_STAGES[0];
                      return (
                        <div
                          key={o.id}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            gap: '14px', flexWrap: 'wrap', padding: '14px',
                            background: 'var(--ivory-bg)', border: '1px solid var(--border-light)',
                            borderRadius: '12px', marginBottom: '10px'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--forest-950)', fontSize: '0.92rem' }}>
                              {o.id}
                              {o.isNewForSeller && (
                                <span className="status-chip new-order" style={{ marginLeft: '6px' }}>
                                  NEW ORDER
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-700)', marginTop: '2px' }}>
                              <strong>Buyer:</strong> {buyerName} • {(o.items || []).length} item(s) •{' '}
                              <strong>{formatINR(o.total)}</strong>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-500)', marginTop: '2px' }}>
                              {o.date || 'Recent'} • {o.paymentMethod || 'Escrow'} • Stage: {stageLbl}
                            </div>
                          </div>
                          <button type="button" className="btn-forest" onClick={() => switchTab('orders')}>
                            Inspect Full Order →
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            {/* TAB 2: LIST NEW PRODUCT */}
            <section className={`tab-panel${tab === 'list' ? ' active' : ''}`} id="tab-list">
              <div className="section-card">
                <div className="section-card-head">
                  <div>
                    <h3 className="section-card-title">List a New Craft on HunarLink</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-500)' }}>
                      Published products appear immediately on the live HunarLink storefront &amp; product detail pages.
                    </p>
                  </div>
                  <span className="status-chip live">● Instant Live Sync</span>
                </div>

                <form id="new-product-form" onSubmit={submitPublish}>
                  <div className="form-grid-2">
                    <div className="field-group">
                      <label className="field-label" htmlFor="np-title">Product Title *</label>
                      <input
                        type="text" id="np-title" className="field-input"
                        placeholder="e.g. Hand-Spun Badam Kani Pashmina Shawl" required
                        value={newForm.title}
                        onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="np-guild">Craft Category / Guild *</label>
                      <select
                        id="np-guild" className="field-select" required
                        value={newForm.guild}
                        onChange={(e) => {
                          const guild = e.target.value;
                          const meta = GUILD_META[guild];
                          setNewForm({ ...newForm, guild });
                          if (meta && !newImage.startsWith('data:')) setNewImage(meta.defaultImg);
                        }}
                      >
                        <option value="pashmina">Pashmina Textiles</option>
                        <option value="walnut">Walnut Woodcarving</option>
                        <option value="papier-mache">Papier-Mâché Art</option>
                        <option value="silk-rugs">Silk-on-Silk Rugs</option>
                      </select>
                    </div>

                    {/* Technique only exists inside the guilds that have one,
                        so this select appears for pashmina and hides for the
                        wood, lacquer and rug guilds. */}
                    {GUILD_META[newForm.guild]?.techniques.length > 0 && (
                      <div className="field-group">
                        <label className="field-label" htmlFor="np-technique">Technique *</label>
                        <select
                          id="np-technique" className="field-select" required
                          value={newForm.technique || GUILD_META[newForm.guild].techniques[0].id}
                          onChange={(e) => setNewForm({ ...newForm, technique: e.target.value })}
                        >
                          {GUILD_META[newForm.guild].techniques.map((t) => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="form-grid-3" style={{ marginTop: '14px' }}>
                    <div className="field-group">
                      <label className="field-label" htmlFor="np-price">Selling Price (₹) *</label>
                      <input
                        type="number" id="np-price" className="field-input" min="100" required
                        placeholder="e.g. 1650" value={newForm.price}
                        onChange={(e) => setNewForm({ ...newForm, price: e.target.value })}
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="np-mrp">Showroom MRP (₹) *</label>
                      <input
                        type="number" id="np-mrp" className="field-input" min="100" required
                        placeholder="e.g. 1990" value={newForm.mrp}
                        onChange={(e) => setNewForm({ ...newForm, mrp: e.target.value })}
                      />
                      <span className="field-hint" id="np-discount-hint" style={{ color: newDiscountHint.color }}>
                        {newDiscountHint.text}
                      </span>
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="np-stock">Available Stock (Qty) *</label>
                      <input
                        type="number" id="np-stock" className="field-input" min="1" max="500" required
                        value={newForm.stock}
                        onChange={(e) => setNewForm({ ...newForm, stock: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-grid-3" style={{ marginTop: '14px' }}>
                    <div className="field-group">
                      <label className="field-label" htmlFor="np-hours">Crafting / Loom Hours *</label>
                      <input
                        type="number" id="np-hours" className="field-input" min="1" required
                        value={newForm.hours}
                        onChange={(e) => setNewForm({ ...newForm, hours: e.target.value })}
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="np-dimensions">Dimensions / Size *</label>
                      <input
                        type="text" id="np-dimensions" className="field-input"
                        placeholder="e.g. 205 cm × 102 cm" required
                        value={newForm.dimensions}
                        onChange={(e) => setNewForm({ ...newForm, dimensions: e.target.value })}
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="np-district">Origin District Cluster *</label>
                      <select
                        id="np-district" className="field-select" required
                        value={newForm.district}
                        onChange={(e) => setNewForm({ ...newForm, district: e.target.value })}
                      >
                        <option value="Srinagar">Srinagar</option>
                        <option value="Budgam">Budgam</option>
                        <option value="Anantnag">Anantnag</option>
                        <option value="Baramulla">Baramulla</option>
                        <option value="Pulwama">Pulwama</option>
                        <option value="Bandipora">Bandipora</option>
                        <option value="Ganderbal">Ganderbal</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-grid-2" style={{ marginTop: '14px' }}>
                    <div className="field-group">
                      <label className="field-label" htmlFor="np-purity">Material Purity &amp; Craft Specification *</label>
                      <input
                        type="text" id="np-purity" className="field-input"
                        placeholder="e.g. 14.2 Micron Changthangi Fleece • 100% Hand-Spun" required
                        value={newForm.purity}
                        onChange={(e) => setNewForm({ ...newForm, purity: e.target.value })}
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="np-gi-id">GI Tag / Registry ID</label>
                      <input
                        type="text" id="np-gi-id" className="field-input"
                        placeholder="Auto-filled from GI profile or generated"
                        value={newForm.giId}
                        onChange={(e) => setNewForm({ ...newForm, giId: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="field-group full" style={{ marginTop: '16px' }}>
                    <label className="field-label">Product Photograph (Select Preset or Upload Custom Photo) *</label>
                    <div className="image-preset-grid" id="np-image-presets">
                      {IMAGE_PRESETS.map((p) => (
                        <button
                          type="button"
                          key={p.path}
                          className={`img-preset-btn${newImage === p.path ? ' selected' : ''}`}
                          data-path={p.path}
                          onClick={() => pickPreset(p.path, p.label)}
                        >
                          <img src={resolveImg(p.path)} alt={p.label} />
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="custom-photo-upload-row">
                      <label className="btn-outline" style={{ cursor: 'pointer' }}>Upload Product Image
                        <input
                          type="file" id="np-photo-file" accept="image/*" style={{ display: 'none' }}
                          ref={fileRef}
                          onChange={(e) => {
                            const file = e.target.files && e.target.files[0];
                            readPhoto(file, (dataUrl) => {
                              setNewImage(dataUrl);
                              setNewPhotoName(file.name);
                            });
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <img
                        id="np-custom-preview"
                        className="upload-preview-thumb"
                        style={{ display: newPhotoName ? 'block' : 'none' }}
                        src={newImage.startsWith('data:') ? newImage : undefined}
                        alt="Uploaded craft preview"
                      />
                      <span className="field-hint" id="np-photo-status">
                        {newPhotoName ? `Uploaded custom craft photo: ${newPhotoName}` : 'Selected: Heritage craft gallery photo'}
                      </span>
                    </div>
                  </div>

                  <div className="field-group full" style={{ marginTop: '16px' }}>
                    <label className="field-label" htmlFor="np-description">Craft Story &amp; Detailed Product Description *</label>
                    <textarea
                      id="np-description" className="field-textarea" required
                      placeholder="Describe weave motifs, natural dyes, heirloom care instructions, and the artisan lineage behind this piece..."
                      value={newForm.description}
                      onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                    ></textarea>
                  </div>

                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="reset"
                      className="btn-outline"
                      onClick={() => {
                        setNewForm(BLANK_NEW);
                        setNewImage(GUILD_META[BLANK_NEW.guild].defaultImg);
                        setNewPhotoName('');
                      }}
                    >
                      Clear Form
                    </button>
                    <button type="submit" className="btn-forest">Publish Product Live on HunarLink →</button>
                  </div>
                </form>
              </div>
            </section>

            {/* TAB 3: MY PRODUCTS */}
            <section className={`tab-panel${tab === 'products' ? ' active' : ''}`} id="tab-products">
              <div className="section-card">
                <div className="section-card-head">
                  <div>
                    <h3 className="section-card-title">My Listed Crafts — Customize Any Detail</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-500)' }}>
                      Edit pricing, stock, descriptions, photos, dimensions, GI specs, or pause listings anytime.
                      Changes reflect immediately on HunarLink.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="text" id="seller-prod-search" aria-label="Search my crafts" className="field-input"
                      style={{ width: '220px', padding: '8px 12px' }}
                      placeholder="Search my crafts..."
                      value={prodQuery}
                      onChange={(e) => setProdQuery(e.target.value)}
                    />
                    <button type="button" className="btn-gold" onClick={() => switchTab('list')}>＋ Add Craft</button>
                  </div>
                </div>

                <div className="seller-products-grid" id="seller-products-grid">
                  {filteredProducts.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '38px 16px', color: 'var(--text-500)' }}>
                      <div style={{ marginBottom: '8px', color: 'var(--forest-700)' }}><IconPalette size={30} /></div>
                      <strong style={{ color: 'var(--forest-950)' }}>No crafts listed yet</strong>
                      <p style={{ fontSize: '0.82rem', margin: '6px 0 14px' }}>
                        Publish your first Kashmiri craft to make it available to HunarLink buyers worldwide.
                      </p>
                      <button type="button" className="btn-gold" onClick={() => switchTab('list')}>
                        ＋ List Your First Product
                      </button>
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const paused = p.status === 'paused';
                      const discPct = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
                      const wishCount = wishlist.includes(p.id) ? 1 : 0;
                      const soldCount = orders.reduce(
                        (acc, o) =>
                          acc +
                          (o.items || [])
                            .filter((i) => i.productId === p.id || i.title === p.title)
                            .reduce((s, i) => s + (i.qty || 1), 0),
                        0
                      );
                      return (
                        <article className="seller-product-card" key={p.id}>
                          <div>
                            <div className="sp-img-wrap">
                              <img src={resolveImg(p.image)} alt={p.title} />
                              <div className="sp-badges">
                                <span className="status-chip gi">{p.giId || 'GI-VERIFIED'}</span>
                                <span className={`status-chip ${paused ? 'paused' : 'live'}`}>
                                  {paused ? '⏸ Paused' : '● Live'}
                                </span>
                              </div>
                            </div>

                            <div className="sp-body">
                              <div className="sp-guild">
                                {p.guildLabel || p.guild} • {p.district || 'J&K'}
                              </div>
                              <h4 className="sp-title">{p.title}</h4>
                              <div className="sp-price-row">
                                <span className="sp-price">{formatINR(p.price)}</span>
                                {p.mrp > p.price && <span className="sp-mrp">{formatINR(p.mrp)}</span>}
                                {discPct > 0 && (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success-600)' }}>
                                    {discPct}% OFF
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: '0.76rem', color: 'var(--text-500)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {p.description}
                              </p>
                              <div className="sp-metrics-strip">
                                <div>
                                  <div className="sp-metric-val">{p.stock}</div>
                                  <div className="sp-metric-lbl">In Stock</div>
                                </div>
                                <div>
                                  <div className="sp-metric-val">{soldCount}</div>
                                  <div className="sp-metric-lbl">Ordered</div>
                                </div>
                                <div>
                                  <div className="sp-metric-val">{wishCount + (p.reviewCount || 0)}</div>
                                  <div className="sp-metric-lbl">Interest</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="sp-actions">
                            <button type="button" className="btn-forest" onClick={() => openEdit(p)}>Customize
                            </button>
                            <a href={appHref(`/product?id=${encodeURIComponent(p.id)}`)} target="_blank" rel="noreferrer" className="btn-outline">
                              Store ↗
                            </a>
                            <button type="button" className="btn-outline" onClick={() => adjustStock(p.id, 1)} title="Add +1 Stock">
                              +1 Stock
                            </button>
                            {!p.isCatalogSeed && (
                              <button type="button" className="btn-danger-outline" onClick={() => removeProduct(p.id)} title="Delete Listing"> </button>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            {/* TAB 4: INCOMING ORDERS */}
            <section className={`tab-panel${tab === 'orders' ? ' active' : ''}`} id="tab-orders">
              <div className="section-card">
                <div className="section-card-head">
                  <div>
                    <h3 className="section-card-title">Customer Orders — Complete Information &amp; Fulfillment</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-500)' }}>
                      Every order placed by buyers on HunarLink arrives here with full customer contact, shipping
                      address, payment status, GI items, and live tracking controls.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <select
                      id="order-stage-filter" aria-label="Filter orders by stage" className="field-select"
                      style={{ width: 'auto', padding: '8px 12px' }}
                      value={orderFilter}
                      onChange={(e) => setOrderFilter(e.target.value)}
                    >
                      <option value="all">All Orders</option>
                      <option value="active">Active / In Progress</option>
                      <option value="delivered">Delivered (Stage 5)</option>
                    </select>
                    <button type="button" className="btn-outline" onClick={simulateOrder}>Simulate New Buyer Order
                    </button>
                  </div>
                </div>

                <div id="orders-container">
                  {visibleOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-500)' }}>
                      <div style={{ marginBottom: '8px', color: 'var(--forest-700)' }}><IconPackage size={32} /></div>
                      <strong style={{ color: 'var(--forest-950)' }}>No matching orders yet</strong>
                      <p style={{ fontSize: '0.82rem', margin: '6px 0 16px' }}>
                        When a customer orders any product on HunarLink, you receive every customer, shipping,
                        payment, and item detail here.
                      </p>
                      <button type="button" className="btn-gold" onClick={simulateOrder}>Simulate a Live Customer Order
                      </button>
                    </div>
                  ) : (
                    visibleOrders.map((o) => {
                      const stage = o.stage || 1;
                      const buyer = o.buyer || {};
                      const name = buyer.name || (o.address || '').split(',')[0] || 'HunarLink User';
                      const phone = buyer.phone || '+91 98110 44210';
                      const email = buyer.email || 'collector@hunarlink.in';
                      const locality = buyer.locality || o.address || 'Verified Delivery Address';
                      const cityPin = buyer.city
                        ? `${buyer.city}${buyer.pincode ? ' - ' + buyer.pincode : ''}`
                        : 'India (Insured Transit)';
                      return (
                        <article className="order-card" key={o.id}>
                          <div className="oc-head">
                            <div>
                              <div className="oc-id">#{o.id}</div>
                              <div className="oc-date">
                                {o.date || 'Recent'} {o.time || ''}
                                {o.isNewForSeller ? ' • NEW' : ''}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span className="status-chip live">
                                {TRACKING_STAGES[stage - 1] || TRACKING_STAGES[0]}
                              </span>
                              <button type="button" className="btn-outline" onClick={() => window.print()}>Print Packing Slip
                              </button>
                            </div>
                          </div>

                          <div className="oc-grid">
                            <div className="oc-block">
                              <div className="oc-block-title">Customer &amp; Delivery</div>
                              <div className="oc-line"><strong>{name}</strong></div>
                              <div className="oc-line">{phone}</div>
                              <div className="oc-line">{email}</div>
                              <div className="oc-line">{locality}</div>
                              <div className="oc-line">{cityPin}</div>
                              <div className="oc-line">Type: {buyer.addressType || 'Home'}</div>
                            </div>

                            <div className="oc-block">
                              <div className="oc-block-title">Payment &amp; Items</div>
                              {(o.items || []).map((i, idx) => (
                                <div className="oc-line" key={idx}>
                                  {i.qty || 1} × {i.title} — {formatINR(i.lineTotal || i.price)}
                                  {i.giId ? ` • ${i.giId}` : ''}
                                </div>
                              ))}
                              <div className="oc-line">Method: {o.paymentMethod || 'UPI Verified Escrow'}</div>
                              <div className="oc-line">Status: {o.paymentStatus || 'Paid (Escrow Protected)'}</div>
                              <div className="oc-line"><strong>Total: {formatINR(o.total)}</strong></div>
                              <div className="oc-line">Your payout: {formatINR(o.artisanPayout || o.total)}</div>
                            </div>
                          </div>

                          <div className="stage-stepper">
                            {TRACKING_STAGES.map((label, i) => {
                              const sNum = i + 1;
                              return (
                                <button
                                  type="button"
                                  key={label}
                                  className={`stage-pill${sNum <= stage ? ' done' : ''}`}
                                  onClick={() => setStage(o.id, sNum)}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>

                          <div className="oc-note-row">
                            <input
                              type="text"
                              className="field-input"
                              placeholder="Add a dispatch note for the buyer (courier, AWB, timing)..."
                              value={notes[o.id] ?? o.sellerNote ?? ''}
                              onChange={(e) => setNotes({ ...notes, [o.id]: e.target.value })}
                            />
                            <button type="button" className="btn-forest" onClick={() => saveNote(o.id)}>Send Dispatch Update
                            </button>
                          </div>
                          {o.sellerNote && (
                            <div className="oc-saved-note">Last note sent: {o.sellerNote}</div>
                          )}
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            {/* TAB 5: RESPONSES */}
            <section className={`tab-panel${tab === 'responses' ? ' active' : ''}`} id="tab-responses">
              <div className="section-card">
                <div className="section-card-head">
                  <div>
                    <h3 className="section-card-title">Product Performance &amp; Buyer Responses</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-500)' }}>
                      Track wishlist saves, active shopping bag interest, and reply directly to customer reviews and
                      product questions.
                    </p>
                  </div>
                  <button type="button" className="btn-outline" onClick={simulateInquiry}>Simulate New Buyer Inquiry
                  </button>
                </div>

                <div className="kpi-grid" id="engagement-kpi-grid" style={{ marginBottom: '20px' }}>
                  <div className="kpi-card">
                    <div className="kpi-top">
                      <span className="kpi-label">Wishlist Saves</span>
                      <span className="kpi-icon"><IconHeart size={17} /></span>
                    </div>
                    <div className="kpi-value">{products.filter((p) => wishlist.includes(p.id)).length}</div>
                    <div className="kpi-sub">Users watching your crafts</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-top">
                      <span className="kpi-label">In Shopping Bags</span>
                      <span className="kpi-icon">️</span>
                    </div>
                    <div className="kpi-value">
                      {products.filter((p) => (cart || []).some((c) => c.productId === p.id)).length}
                    </div>
                    <div className="kpi-sub">Added but not yet purchased</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-top">
                      <span className="kpi-label">Reviews &amp; Inquiries</span>
                      <span className="kpi-icon"><IconChat size={17} /></span>
                    </div>
                    <div className="kpi-value">{responses.length}</div>
                    <div className="kpi-sub">
                      {responses.filter((r) => !r.reply).length} awaiting your reply
                    </div>
                  </div>
                </div>

                <div id="responses-list">
                  {responses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-500)', fontSize: '0.85rem' }}>
                      No buyer responses yet. Reviews and questions from collectors will appear here.
                    </div>
                  ) : (
                    responses.map((r) => (
                      <article className="response-card" key={r.id}>
                        <div className="rc-head">
                          <div>
                            <div className="rc-type">{r.type}</div>
                            <div className="rc-author">{r.author}</div>
                          </div>
                          <div className="rc-meta">
                            {r.rating ? `★ ${r.rating}` : ''} {r.date ? `• ${r.date}` : ''}
                          </div>
                        </div>
                        <div className="rc-product">On: {r.productTitle}</div>
                        <p className="rc-comment">{r.comment}</p>
                        {r.reply ? (
                          <div className="rc-reply">
                            <strong>Your reply:</strong> {r.reply}
                          </div>
                        ) : (
                          <form className="rc-reply-form" onSubmit={(e) => submitReply(e, r)}>
                            <input
                              type="text"
                              className="field-input"
                              placeholder="Write your artisan response..." aria-label="Your reply to this buyer"
                              value={replyDrafts[r.id] || ''}
                              onChange={(e) => setReplyDrafts({ ...replyDrafts, [r.id]: e.target.value })}
                            />
                            <button type="submit" className="btn-forest">Send Reply</button>
                          </form>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* MODAL: CUSTOMIZE PRODUCT */}
      <div className={`modal-backdrop${editForm ? ' open' : ''}`} id="edit-product-modal">
        <div className="modal-dialog">
          <div className="modal-head">
            <h3>Customize Product Details</h3>
            <button type="button" className="modal-close" aria-label="Close" onClick={closeEdit}><IconX size={15} /></button>
          </div>
          <div className="modal-body">
            {editForm && (
              <form id="edit-product-form" onSubmit={saveEdit}>
                <input type="hidden" id="edit-id" value={editingId || ''} readOnly />
                <div className="form-grid-2">
                  <div className="field-group">
                    <label className="field-label" htmlFor="edit-title">Product Title *</label>
                    <input
                      type="text" id="edit-title" className="field-input" required
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label" htmlFor="edit-guild">Craft Category *</label>
                    <select
                      id="edit-guild" className="field-select" required
                      value={editForm.guild}
                      onChange={(e) => setEditForm({ ...editForm, guild: e.target.value })}
                    >
                      <option value="pashmina">Pashmina Textiles</option>
                      <option value="walnut">Walnut Woodcarving</option>
                      <option value="papier-mache">Papier-Mâché Art</option>
                      <option value="silk-rugs">Silk-on-Silk Rugs</option>
                    </select>
                  </div>
                  {GUILD_META[editForm.guild]?.techniques.length > 0 && (
                    <div className="field-group">
                      <label className="field-label" htmlFor="edit-technique">Technique</label>
                      <select
                        id="edit-technique" className="field-select"
                        value={editForm.technique || GUILD_META[editForm.guild].techniques[0].id}
                        onChange={(e) => setEditForm({ ...editForm, technique: e.target.value })}
                      >
                        {GUILD_META[editForm.guild].techniques.map((t) => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="form-grid-3" style={{ marginTop: '12px' }}>
                  <div className="field-group">
                    <label className="field-label" htmlFor="edit-price">Selling Price (₹) *</label>
                    <input
                      type="number" id="edit-price" className="field-input" min="100" required
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label" htmlFor="edit-mrp">Showroom MRP (₹) *</label>
                    <input
                      type="number" id="edit-mrp" className="field-input" min="100" required
                      value={editForm.mrp}
                      onChange={(e) => setEditForm({ ...editForm, mrp: e.target.value })}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label" htmlFor="edit-stock">Available Stock *</label>
                    <input
                      type="number" id="edit-stock" className="field-input" min="0" required
                      value={editForm.stock}
                      onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-3" style={{ marginTop: '12px' }}>
                  <div className="field-group">
                    <label className="field-label" htmlFor="edit-hours">Loom / Carving Hours</label>
                    <input
                      type="number" id="edit-hours" className="field-input" min="1"
                      value={editForm.hours}
                      onChange={(e) => setEditForm({ ...editForm, hours: e.target.value })}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label" htmlFor="edit-dimensions">Dimensions / Size</label>
                    <input
                      type="text" id="edit-dimensions" className="field-input"
                      value={editForm.dimensions}
                      onChange={(e) => setEditForm({ ...editForm, dimensions: e.target.value })}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label" htmlFor="edit-status">Listing Status</label>
                    <select
                      id="edit-status" className="field-select"
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      <option value="live">Active (Live on HunarLink)</option>
                      <option value="paused">Paused (Hidden from Store)</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginTop: '12px' }}>
                  <div className="field-group">
                    <label className="field-label" htmlFor="edit-purity">Material Purity Specification</label>
                    <input
                      type="text" id="edit-purity" className="field-input"
                      value={editForm.purity}
                      onChange={(e) => setEditForm({ ...editForm, purity: e.target.value })}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label" htmlFor="edit-gi-id">GI Tag ID</label>
                    <input
                      type="text" id="edit-gi-id" className="field-input"
                      value={editForm.giId}
                      onChange={(e) => setEditForm({ ...editForm, giId: e.target.value })}
                    />
                  </div>
                </div>

                <div className="field-group full" style={{ marginTop: '12px' }}>
                  <label className="field-label">Update Product Photograph</label>
                  <div className="custom-photo-upload-row" style={{ marginTop: '2px' }}>
                    <img id="edit-photo-preview" className="upload-preview-thumb" src={resolveImg(editImage)} alt="Current product photo" />
                    <label className="btn-outline" style={{ cursor: 'pointer' }}>Change Photo
                      <input
                        type="file" id="edit-photo-file" accept="image/*" style={{ display: 'none' }}
                        ref={editFileRef}
                        onChange={(e) => {
                          const file = e.target.files && e.target.files[0];
                          readPhoto(file, (dataUrl) => setEditImage(dataUrl));
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="field-group full" style={{ marginTop: '12px' }}>
                  <label className="field-label" htmlFor="edit-description">Product Description &amp; Craft Story *</label>
                  <textarea
                    id="edit-description" className="field-textarea" required
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  ></textarea>
                </div>

                <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn-outline" onClick={closeEdit}>Cancel</button>
                  <button type="submit" className="btn-forest">Save Customized Details →</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Toast Stack */}
      <div className="portal-toast" id="portal-toast"></div>
    </>
  );
}

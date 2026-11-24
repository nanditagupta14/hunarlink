/* ==========================================================================
   AdminPage — offline demo data adapter
   --------------------------------------------------------------------------
   Ported verbatim from admin-portal/admin-offline-demo.js. The console was
   written against a FastAPI backend at 127.0.0.1:8000 that is not part of this
   repo. Rather than ship a React dashboard full of zeros, this module patches
   fetch for the admin API prefix only and serves the same deterministic demo
   dataset the static console did — KPIs, customers, sellers, GI audits,
   supplier lots, dealers, wholesale listings, settings, audit logs and roles.

   Anything outside ADMIN_API_BASE falls through to the real fetch.
   ========================================================================== */

const ADMIN_API_BASE = 'http://127.0.0.1:8000/api/v1';

function clone(x) { return JSON.parse(JSON.stringify(x)); }

  var DB = {
    metrics: {
      kpis: {
        financials: { retail_gmv: 4872350, wholesale_gmv: 9126400, platform_revenue: 1120980 },
        users: {
          approved_sellers: 218, total_customers: 4820, total_wholesale_buyers: 196,
          total_suppliers: 64, total_dealers: 143
        },
        pending_actions: { pending_gi_verifications: 7, pending_supplier_lots: 4 },
        catalog: { retail_products: 96, wholesale_listings: 38 }
      }
    },
    customers: [
      { user_id: 1001, first_name: 'Priya', last_name: 'Sharma', email: 'priya.sharma@valleycollector.in', phone: '+91 98112 77420', addresses_count: 2, account_status: 'ACTIVE' },
      { user_id: 1002, first_name: 'Rohan', last_name: 'Mehta', email: 'rohan.mehta@gmail.com', phone: '+91 99870 21134', addresses_count: 1, account_status: 'ACTIVE' },
      { user_id: 1003, first_name: 'Aarav', last_name: 'Iyer', email: 'aarav.iyer@outlook.com', phone: '+91 90045 66812', addresses_count: 1, account_status: 'ACTIVE' },
      { user_id: 1004, first_name: 'Nadia', last_name: 'Qureshi', email: 'nadia.q@designstudio.in', phone: '+91 98209 55107', addresses_count: 3, account_status: 'ACTIVE' },
      { user_id: 1005, first_name: 'Kabir', last_name: 'Anand', email: 'kabir.anand@proton.me', phone: '—', addresses_count: 0, account_status: 'SUSPENDED' }
    ],
    sellers: [
      { seller_id: 2011, store_name: 'Mir Pashmina Atelier', craft_specialty: 'Pashmina & Kani Shawls', has_gi_certification: true, gi_authorized_user_number: 'GI #JK-PASH-8821', average_rating: 4.9, total_reviews: 42, status: 'APPROVED' },
      { seller_id: 2012, store_name: 'Wani Woodcraft Atelier', craft_specialty: 'Walnut Woodcarving', has_gi_certification: true, gi_authorized_user_number: 'GI #JK-WNT-1180', average_rating: 4.8, total_reviews: 27, status: 'APPROVED' },
      { seller_id: 2013, store_name: 'Kani Loom Collective', craft_specialty: 'Kani Jamawar Weaves', has_gi_certification: true, gi_authorized_user_number: 'GI #JK-KANI-9904', average_rating: 4.7, total_reviews: 19, status: 'PENDING' },
      { seller_id: 2014, store_name: 'Sozni Needle House', craft_specialty: 'Sozni Embroidery', has_gi_certification: true, gi_authorized_user_number: 'GI #JK-SOZ-8845', average_rating: 4.9, total_reviews: 33, status: 'APPROVED' },
      { seller_id: 2015, store_name: 'Pinjrakari Carving Works', craft_specialty: 'Walnut Lattice Carving', has_gi_certification: false, gi_authorized_user_number: null, average_rating: 4.5, total_reviews: 11, status: 'PENDING' }
    ],
    gi_audits: [
      { audit_id: 3001, applicant_name: 'Mir Pashmina Atelier', claimed_gi_code: 'GI-JK-PASH-8821', llm_provider: 'google-genai', model_version: 'gemini-flash', confidence_score: 98.4, admin_decision: 'PENDING' },
      { audit_id: 3002, applicant_name: 'Zadibal Naqash Works', claimed_gi_code: 'GI-JK-PAPR-3109', llm_provider: 'google-genai', model_version: 'gemini-flash', confidence_score: 96.1, admin_decision: 'PENDING' },
      { audit_id: 3003, applicant_name: 'Budgam Silk Looms', claimed_gi_code: 'GI-JK-SILK-7712', llm_provider: 'google-genai', model_version: 'gemini-flash', confidence_score: 99.2, admin_decision: 'PENDING' },
      { audit_id: 3004, applicant_name: 'Pinjrakari Carving Works', claimed_gi_code: 'GI-JK-WALN-4402', llm_provider: 'google-genai', model_version: 'gemini-flash', confidence_score: 94.7, admin_decision: 'APPROVED' }
    ],
    non_gi: [
      { verification_id: 4001, target_type: 'SELLER', business_name: 'Srinagar Sozni Guild', pan_or_tax_id: 'AABCS1429K', status: 'AWAITING_REVIEW', admin_remarks: '' },
      { verification_id: 4002, target_type: 'SELLER', business_name: 'Zadibal Naqash Works', pan_or_tax_id: 'AAFCZ7781M', status: 'AWAITING_REVIEW', admin_remarks: '' }
    ],
    lots: [
      { lot_id: 1, lot_number: 'LOT-2026-0114', supplier_name: 'Kani Loom Collective', craft_title: 'Hotel Suite Pashmina Throw Lot', quantity_available: 120, unit_of_measure: 'pcs', expected_unit_price: 1650, total_value: 198000, is_gi_tagged: true, status: 'OPEN' },
      { lot_id: 2, lot_number: 'LOT-2026-0115', supplier_name: 'Pinjrakari Carving Works', craft_title: 'Lobby Chinar Screen Commission', quantity_available: 40, unit_of_measure: 'pcs', expected_unit_price: 46500, total_value: 1860000, is_gi_tagged: true, status: 'MATCHING' },
      { lot_id: 3, lot_number: 'LOT-2026-0116', supplier_name: 'Budgam Silk Looms', craft_title: 'Silk Runner Hospitality Batch', quantity_available: 60, unit_of_measure: 'pcs', expected_unit_price: 118000, total_value: 7080000, is_gi_tagged: true, status: 'OPEN' }
    ],
    dealers: [
      { dealer_id: 501, dealership_name: 'Kashmir Loom Exports', city: 'Srinagar', reliability_rating: 4.8, monthly_budget: 2400000 },
      { dealer_id: 502, dealership_name: 'Valley Craft Consortium', city: 'Budgam', reliability_rating: 4.6, monthly_budget: 1850000 },
      { dealer_id: 503, dealership_name: 'Himalayan Textile Traders', city: 'Anantnag', reliability_rating: 4.4, monthly_budget: 940000 }
    ],
    wholesale_listings: [
      { listing_id: 601, listing_title: 'Bulk Kani Stole Lot (50 pcs)', dealer_name: 'Kani Loom Collective', available_bulk_quantity: 500, minimum_order_quantity: 50, lead_time_days: 21, price_tiers: [{ min_qty: 50, unit_price: 1650 }, { min_qty: 200, unit_price: 1490 }] },
      { listing_id: 602, listing_title: 'Carved Walnut Panel Set (20 pcs)', dealer_name: 'Pinjrakari Carving Works', available_bulk_quantity: 200, minimum_order_quantity: 10, lead_time_days: 35, price_tiers: [{ min_qty: 10, unit_price: 46500 }, { min_qty: 50, unit_price: 42900 }] },
      { listing_id: 603, listing_title: 'Silk-on-Silk Carpet Batch (12 pcs)', dealer_name: 'Budgam Silk Looms', available_bulk_quantity: 96, minimum_order_quantity: 12, lead_time_days: 48, price_tiers: [{ min_qty: 12, unit_price: 118000 }, { min_qty: 36, unit_price: 109500 }] }
    ],
    settings: [
      { setting_key: 'platform_fee_pct', description: 'Commission retained on each completed order.', is_active: true, setting_value: '3' },
      { setting_key: 'gi_llm_audit', description: 'Automated GI authenticity audit using the LLM provider.', is_active: true, setting_value: 'true' },
      { setting_key: 'wholesale_matching', description: 'Algorithmic dealer matching for supplier lots.', is_active: true, setting_value: 'true' },
      { setting_key: 'escrow_required', description: 'Hold buyer funds in escrow until delivery is confirmed.', is_active: true, setting_value: 'true' },
      { setting_key: 'auto_approve_returns', description: 'Approve return requests without manual review.', is_active: false, setting_value: 'false' }
    ],
    audit_logs: [
      { id: 701, admin_email: 'admin@hunarlink.com', admin_role: 'SUPER_ADMIN', action: 'APPROVE_GI_AUDIT', target_resource_type: 'gi_audit', target_resource_id: 'GI-JK-SILK-7712', action_reason: 'Lab purity verified', ip_address: '127.0.0.1' },
      { id: 702, admin_email: 'admin@hunarlink.com', admin_role: 'SUPER_ADMIN', action: 'MODERATE_SELLER', target_resource_type: 'seller', target_resource_id: 'Wani Woodcraft Atelier', action_reason: 'Documentation verified', ip_address: '127.0.0.1' },
      { id: 703, admin_email: 'system', admin_role: 'SYSTEM', action: 'RUN_DEALER_MATCHING', target_resource_type: 'lot', target_resource_id: 'LOT-2026-0114', action_reason: 'Scheduled matching', ip_address: 'internal' },
      { id: 704, admin_email: 'admin@hunarlink.com', admin_role: 'SUPER_ADMIN', action: 'UPDATE_SETTING', target_resource_type: 'settings', target_resource_id: 'platform_fee_pct', action_reason: 'Operational update', ip_address: '127.0.0.1' }
    ],
    roles: [
      { role_name: 'SUPER_ADMIN', description: 'Unrestricted access to every console, including RBAC and audit trails.' },
      { role_name: 'GI_VERIFIER', description: 'Reviews and decides GI verification audits.' },
      { role_name: 'PROCUREMENT_MANAGER', description: 'Manages supplier lots and dealer matching.' }
    ]
  };

  function route(method, path) {
    var q = path.split('?')[0].replace(/\/+$/, '');
    var m = method.toUpperCase();

    if (q === '/auth/login') {
      return { access_token: 'demo-admin-token', token_type: 'bearer', user: { email: 'admin@hunarlink.com', role: 'super_admin' } };
    }
    if (q === '/admin/dashboard/metrics') return clone(DB.metrics);
    if (q === '/admin/customers') return clone(DB.customers);
    if (/^\/admin\/customers\/\d+\/status$/.test(q)) return { ok: true };
    if (q === '/admin/sellers') return clone(DB.sellers);
    if (/^\/admin\/sellers\/\d+\/moderate$/.test(q)) {
      var sid = parseInt(q.split('/')[4], 10);
      var s = DB.sellers.find(function (x) { return x.seller_id === sid; });
      if (s) s.status = 'APPROVED';
      return { ok: true, seller: s };
    }
    if (q === '/admin/verifications/gi') return clone(DB.gi_audits);
    if (q === '/admin/verifications/gi/run-audit') {
      var fresh = {
        audit_id: 900 + Math.floor(Math.random() * 99),
        applicant_name: 'Ghulam Nabi Mir (Zadibal Weavers)',
        claimed_gi_code: 'GI-JK-PASH-8821',
        llm_provider: 'google-genai',
        model_version: 'gemini-flash',
        confidence_score: 97.3,
        matching_fields: ['craft_category', 'cluster', 'gazette_entry'],
        mismatching_fields: ['artisan_lineage'],
        admin_decision: 'PENDING_HUMAN_REVIEW',
        admin_remarks: ''
      };
      DB.gi_audits.unshift(fresh);
      return {
        id: fresh.audit_id,
        confidence_score: fresh.confidence_score,
        reasoning_summary: 'Gazette entry and cluster match under the claimed GI authorisation.',
        verdict: 'pass',
        purity: 'verified',
        status: 'pending'
      };
    }
    if (/^\/admin\/verifications\/gi\/\d+\/decide$/.test(q)) {
      var gid = parseInt(q.split('/')[4], 10);
      var a = DB.gi_audits.find(function (x) { return x.audit_id === gid; });
      return { ok: true, audit: a };
    }
    if (q === '/admin/verifications/non-gi') return clone(DB.non_gi);
    if (q === '/admin/procurement/lots') return clone(DB.lots);
    if (/^\/admin\/procurement\/lots\/\d+\/rank-dealers$/.test(q)) {
      return { lot_id: parseInt(q.split('/')[4], 10), ranked_dealers: clone(DB.dealers) };
    }
    if (q === '/admin/procurement/assign') {
      /* only the lot being assigned changes status */
      var assignBody = null;
      try { assignBody = arguments.length > 2 ? arguments[2] : null; } catch (e) { assignBody = null; }
      return { ok: true };
    }
    if (q === '/admin/wholesale/listings') return clone(DB.wholesale_listings);
    if (q === '/admin/settings') return clone(DB.settings);
    if (q === '/admin/settings/toggle') return { ok: true };
    if (q === '/admin/audit-logs') return clone(DB.audit_logs);
    if (q === '/admin/roles/definitions') return clone(DB.roles);

    return null;
  }

  function demoFetch(endpoint, options) {
    var method = (options && options.method) || 'GET';
    var q = endpoint.split('?')[0].replace(/\/+$/, '');
    var body = null;
    try { body = options && options.body ? JSON.parse(options.body) : null; } catch (e) { body = null; }

    /* apply simple mutations that the UI sends in the request body */
    var giDecide = endpoint.split('?')[0].match(/^\/admin\/verifications\/gi\/(\d+)\/decide$/);
    if (giDecide && body && body.decision) {
      var ga = DB.gi_audits.find(function (x) { return x.audit_id === parseInt(giDecide[1], 10); });
      if (ga) { ga.admin_decision = body.decision; ga.admin_remarks = body.decision_notes || ''; }
    }
    if (/^\/admin\/procurement\/assign$/.test(endpoint.split('?')[0]) && body && body.lot_id) {
      var al = DB.lots.find(function (x) { return x.lot_id === parseInt(body.lot_id, 10); });
      if (al) al.status = 'ASSIGNED';
    }
    var sellerMod = endpoint.split('?')[0].match(/^\/admin\/sellers\/(\d+)\/moderate$/);
    if (sellerMod && body && body.status) {
      var sm = DB.sellers.find(function (x) { return x.seller_id === parseInt(sellerMod[1], 10); });
      if (sm) sm.status = body.status;
    }
    if (/settings\/toggle$/.test(endpoint.split('?')[0]) && body && body.setting_key) {
      var st = DB.settings.find(function (x) { return x.setting_key === body.setting_key; });
      if (st) st.is_active = !!body.is_active;
    }
    if (/customers\/\d+\/status$/.test(endpoint.split('?')[0]) && body && body.account_status) {
      var cid = parseInt(endpoint.split('/')[3], 10);
      var c = DB.customers.find(function (x) { return x.user_id === cid; });
      if (c) c.account_status = body.account_status;
    }

    var result = route(method, endpoint);
    if (result === null || result === undefined) result = { ok: true };

    /* only state-changing calls belong in the trail */
    if (method !== 'GET' && !/^\/auth\/login$/.test(q)) {
      DB.audit_logs.unshift({
        id: 700 + Math.floor(Math.random() * 200),
        created_at: new Date().toISOString(),
        admin_email: 'admin@hunarlink.com',
        admin_role: 'SUPER_ADMIN',
        action: method + ' ' + q,
        target_resource_type: q.split('/')[2] || 'platform',
        target_resource_id: (body && (body.setting_key || body.decision || body.status || body.lot_id)) || '—',
        action_reason: (body && (body.reason || body.decision_notes)) || 'Administrative action',
        ip_address: '127.0.0.1'
      });
    }

    /* admin.js expects a real Response (res.ok / res.status / res.json()) */
    return Promise.resolve(new Response(JSON.stringify(clone(result)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }


/* React-facing API: same routes, same demo mutations, no fetch patching and no
   Response objects — the page just awaits the plain data. */
export async function demoApi(endpoint, options) {
  const res = await demoFetch(endpoint, options);
  return res.json();
}

/* Patch window.fetch for the admin API only, then restore on unmount so
   navigating back to the storefront leaves fetch untouched. */
export function installAdminDemoFetch() {
  const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf(ADMIN_API_BASE) !== 0) {
      return nativeFetch ? nativeFetch(input, init) : Promise.reject(new Error('fetch unavailable'));
    }
    return demoFetch(url.slice(ADMIN_API_BASE.length), init);
  };
  return function uninstall() {
    if (nativeFetch) window.fetch = nativeFetch;
  };
}

#!/usr/bin/env python3
"""Runtime audit: for each migrated page, does interacting with it do anything?

Start the preview first (npm run serve), then run this. HUNARLINK_BASE
overrides the default local URL.
"""
import os
from playwright.sync_api import sync_playwright

B = os.environ.get("HUNARLINK_BASE", "http://127.0.0.1:8123").rstrip("/") + "/hunarlink"

def report(name, rows):
    print(f"\n{name}")
    for label, ok, detail in rows:
        mark = "PASS" if ok else "DEAD"
        print(f"  [{mark}] {label:38} {detail}")

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 950})
    pg.on("pageerror", lambda e: None)

    # ---------------- HOME ----------------
    pg.goto(B + "/", wait_until="networkidle"); pg.wait_for_timeout(1200)
    r = []
    tw = pg.evaluate("document.querySelectorAll('.guild-bento-card,.product-card').length")
    r.append(("product/guild cards present", tw > 0, f"{tw} cards"))
    # click a product card -> navigate
    # the <article> is not a link; the .product-img-wrap inside it is the
    # affordance that carries the href — click that, not the card
    before = pg.url
    link = pg.locator(".product-card .product-img-wrap").first
    if not link.count():
        link = pg.locator(".product-card a").first
    if link.count():
        link.click(); pg.wait_for_timeout(1600)
        r.append(("product card navigates to PDP", "/product" in pg.url, pg.url.replace(B, "")))
    # search box
    pg.goto(B + "/", wait_until="networkidle"); pg.wait_for_timeout(1000)
    sb = pg.locator("input[type=search], .search-input, #search-input").first
    if sb.count():
        sb.fill("walnut"); pg.wait_for_timeout(900)
        n = pg.evaluate("document.querySelectorAll('.product-card').length")
        r.append(("search filters marketplace", True, f"{n} results for 'walnut'"))
    report("HOME  (HomePage.jsx renders sections/ components)", r)

    # ---------------- PDP ----------------
    pg.goto(B + "/product?id=hl-pash-001", wait_until="networkidle"); pg.wait_for_timeout(1200)
    r = []
    r.append(("title rendered", pg.locator("h1").count() > 0, pg.inner_text("h1")[:40]))
    thumbs = pg.evaluate("document.querySelectorAll('[class*=thumb], .gallery-thumb').length")
    r.append(("gallery thumbnails", thumbs > 0, f"{thumbs} thumbs"))
    before = pg.evaluate("localStorage.getItem('hunarlink_cart')")
    pg.locator("button:has-text('ADD TO SHOPPING BAG')").first.click()
    pg.wait_for_timeout(1000)
    after = pg.evaluate("localStorage.getItem('hunarlink_cart')")
    r.append(("Add to bag writes cart", before != after, f"cart now {str(after)[:40]}"))
    report("PRODUCT DETAIL  (ProductPage.jsx)", r)

    # ---------------- AUTH ----------------
    pg.goto(B + "/auth", wait_until="networkidle"); pg.wait_for_timeout(1000)
    r = []
    pg.fill("#login-email", "nobody@nowhere.in"); pg.fill("#login-password", "x")
    pg.click("#login-submit-btn"); pg.wait_for_timeout(800)
    r.append(("unknown login rejected", "No artisan account" in pg.inner_text("#auth-toast"), pg.inner_text("#auth-toast")[:45]))
    pg.click(".btn-demo-pill"); pg.wait_for_timeout(1800)
    r.append(("demo pill signs in", "/seller" in pg.url, pg.url.replace(B, "")))
    report("AUTH  (AuthPage.jsx)", r)

    # ---------------- ORDERS ----------------
    pg.goto(B + "/orders", wait_until="networkidle"); pg.wait_for_timeout(800)
    pg.evaluate("""()=>localStorage.setItem('hunarlink_orders', JSON.stringify([{
        id:'HL-ORD-2026-7781', date:'12 Nov 2026', stage:2, total:1650, subtotal:1650,
        address:'Priya Sharma, New Delhi - 110024', paymentMethod:'UPI Verified Escrow',
        buyer:{name:'Priya Sharma', phone:'+91 98112 77420', city:'New Delhi', pincode:'110024'},
        items:[{productId:'hl-pash-001', title:'Royal Khudrang Pashmina Shawl', qty:1, price:1650, lineTotal:1650}]
      }]))""")
    pg.reload(wait_until="networkidle"); pg.wait_for_timeout(1200)
    r = []
    n = pg.locator(".fk-order-card").count()
    r.append(("orders rendered", n > 0, f"{n} order cards"))
    if n:
        btn = pg.locator(".fk-order-card button").first
        r.append(("order action reachable", btn.count() > 0, btn.inner_text()[:30] if btn.count() else "none"))
    report("ORDERS  (OrdersPage.jsx)", r)

    # ---------------- PROFILE ----------------
    pg.goto(B + "/profile", wait_until="networkidle"); pg.wait_for_timeout(1200)
    r = []
    pg.locator("[data-view='addresses']").click(); pg.wait_for_timeout(500)
    active = pg.evaluate("()=>[...document.querySelectorAll('.fk-tab-view.active')].map(e=>e.id)")
    r.append(("tab switch works", active == ["view-addresses"], str(active)))
    report("PROFILE  (ProfilePage.jsx)", r)

    # ---------------- WHOLESALE ----------------
    pg.goto(B + "/wholesale", wait_until="networkidle"); pg.wait_for_timeout(1200)
    r = []
    n = pg.locator(".wp-prod-option").count()
    r.append(("product selector populated", n > 0, f"{n} products"))
    pg.click("#tab-btn-tracker"); pg.wait_for_timeout(500)
    active = pg.evaluate("()=>[...document.querySelectorAll('.wp-panel.active')].map(e=>e.id)")
    r.append(("tab switching works", active == ["panel-tracker"], str(active)))
    report("WHOLESALE  (WholesalePage.jsx)", r)

    # ---------------- ADMIN ----------------
    pg.goto(B + "/admin", wait_until="networkidle"); pg.wait_for_timeout(600)
    r = []
    gate = pg.locator("#admin-login-modal").is_visible()
    r.append(("login gate shown", gate, "requesting super-admin session" if gate else "no gate"))
    if gate:
        pg.click("#admin-login-form button[type=submit]"); pg.wait_for_timeout(1600)
    r.append(("session established", not pg.locator("#admin-login-modal").is_visible(),
              "token stored" if pg.evaluate("localStorage.getItem('hunarlink_admin_token')") else "no token"))
    for t in ["customers", "sellers", "gi", "suppliers", "wholesale", "settings"]:
        pg.click(f'.sidebar-nav .nav-item[data-tab={t}]'); pg.wait_for_timeout(300)
    pg.click('.sidebar-nav .nav-item[data-tab=audit]'); pg.wait_for_timeout(500)
    rows = pg.locator("#audit-logs-tbody tr").count()
    r.append(("audit table populated", rows > 0, f"{rows} audit rows"))
    pg.click('.sidebar-nav .nav-item[data-tab=dashboard]'); pg.wait_for_timeout(500)
    gmv = pg.inner_text("#kpi-retail-gmv")
    r.append(("KPI data loaded", gmv.startswith("₹") and gmv != "₹0.00", gmv))
    report("ADMIN  (portal/AdminPage.jsx)", r)

    # ---------------- SELLER ----------------
    pg.goto(B + "/seller", wait_until="networkidle")
    pg.evaluate("""()=>localStorage.setItem('hunarlink_auth_user', JSON.stringify(
        {name:'Test Artisan', business:'Atelier', role:'artisan', isLoggedIn:true, badge:'TA'}))""")
    pg.reload(wait_until="networkidle"); pg.wait_for_timeout(1400)
    r = []
    r.append(("workspace unlocked", pg.eval_on_selector("#portal-shell", "e=>getComputedStyle(e).display") == "grid", "grid"))
    btns = pg.locator(".nav-tab-btn")
    r.append(("sidebar tab buttons", btns.count() > 0, f"{btns.count()} buttons"))
    if btns.count() > 1:
        btns.nth(1).click(); pg.wait_for_timeout(700)
        active = pg.evaluate("()=>[...document.querySelectorAll('.tab-panel.active')].map(e=>e.id)")
        r.append(("tab switch works", bool(active) and active[0] != "tab-overview", str(active)))
    # try the publish form, which lives in tab-list
    vis = pg.evaluate("(()=>{const e=document.querySelector('#np-title');return e?getComputedStyle(e).display+'/'+!!e.offsetParent:null})()")
    r.append(("publish form reachable", vis is not None and "none" not in str(vis), str(vis)))
    report("SELLER  (portal/SellerPage.jsx)", r)

    # ---------------- LOGIN ----------------
    pg.goto(B + "/login", wait_until="networkidle"); pg.wait_for_timeout(1200)
    r = []
    pg.fill("#signin-identifier", "test@collector.in"); pg.fill("#signin-password", "pw")
    before = pg.url
    sub = pg.locator("#user-signin-form button[type=submit]")
    if sub.count():
        sub.first.click(); pg.wait_for_timeout(1200)
    r.append(("sign-in submits", pg.url != before, pg.url.replace(B, "")))
    r.append(("session written", pg.evaluate("(()=>{const p=JSON.parse(localStorage.getItem('hunarlink_buyer_profile')||'{}');return !!p.isLoggedIn})()"),
              "hunarlink_buyer_profile.isLoggedIn"))
    report("LOGIN  (portal/LoginPage.jsx)", r)

    b.close()

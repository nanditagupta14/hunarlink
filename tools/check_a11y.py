#!/usr/bin/env python3
"""Check the three a11y invariants that are cheap to regress.

  - exactly one h1 per route
  - a distinct document.title per route
  - no visible field without an accessible name

Start the preview first (npm run serve), then run this.
"""
import os
from playwright.sync_api import sync_playwright

B = os.environ.get("HUNARLINK_BASE", "http://127.0.0.1:8123").rstrip("/") + "/hunarlink"
ROUTES=["/","/product?id=hl-pash-001","/auth","/wholesale","/seller","/admin","/profile","/orders","/login"]
with sync_playwright() as p:
    br=p.chromium.launch(); pg=br.new_page(viewport={"width":1440,"height":950})
    print(f"{'route':26s} {'h1':>3s} {'title':38s} {'unlabelled':>10s}")
    print("-"*84)
    for r in ROUTES:
        pg.goto(B+r, wait_until="networkidle"); pg.wait_for_timeout(700)
        if r=="/admin":
            pg.evaluate("()=>localStorage.setItem('hunarlink_admin_token','d')"); pg.reload(wait_until="networkidle"); pg.wait_for_timeout(900)
        if r=="/seller":
            pg.evaluate("()=>localStorage.setItem('hunarlink_auth_user',JSON.stringify({name:'A',role:'artisan',isLoggedIn:true}))"); pg.reload(wait_until="networkidle"); pg.wait_for_timeout(700)
        h1=pg.evaluate("document.querySelectorAll('h1').length")
        title=pg.title()
        unl=pg.evaluate("""()=>[...document.querySelectorAll('input,select,textarea')]
            .filter(i=>i.type!=='hidden')
            .filter(i=>!i.labels?.length && !i.getAttribute('aria-label') && !i.getAttribute('aria-labelledby'))
            .filter(i=>!i.closest('#hunarsathi-window, .hs-window')).length""")
        print(f"{r:26s} {h1:3d} {title[:36]:38s} {unl:10d}")

    # ---- the single login entry point -------------------------------------
    # One LOGIN button replaces the old user / artisan-login / studio trio, and
    # it must offer both roles and route each to the page that owns the job.
    pg.goto(B + "/", wait_until="networkidle")
    pg.wait_for_timeout(900)
    legacy = pg.evaluate(
        "()=>['#user-login-btn','#seller-login-btn','#artisan-studio-btn']"
        ".filter(s=>document.querySelector(s))")
    has_login = pg.evaluate("()=>!!document.querySelector('#login-btn')")
    pg.click("#login-btn")
    pg.wait_for_timeout(500)
    # LOGIN now goes straight to /login, which offers the two roles as an
    # always-visible choice above the sign-in / register tabs. Check them there
    # rather than in the retired #login-choice-modal.
    pg.goto(B + "/login", wait_until="networkidle")
    pg.wait_for_timeout(900)
    roles = pg.evaluate(
        "()=>[...document.querySelectorAll('.seg-btn')]"
        ".map(e=>e.id.replace('role-',''))")
    print()
    print(f"login entry    single button={has_login} legacy controls left={legacy or 'none'} roles={roles}")
    br.close()

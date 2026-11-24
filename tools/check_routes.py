#!/usr/bin/env python3
"""Smoke-test every route the built site serves.

Serves nothing itself: start the preview first (npm run serve), then run this.
Set HUNARLINK_BASE to point somewhere other than the local preview.

    HUNARLINK_BASE=https://hunarlink.example npm run check:routes
"""
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get("HUNARLINK_BASE", "http://127.0.0.1:8123").rstrip("/")
ROUTES=["/hunarlink/",
        "/hunarlink/product?id=hl-pash-001","/hunarlink/product.html?id=hl-pash-001",
        "/hunarlink/auth","/hunarlink/auth?mode=register",
        "/hunarlink/wholesale","/hunarlink/admin",
        "/hunarlink/seller","/hunarlink/profile",
        "/hunarlink/orders","/hunarlink/login",
        # category pages: a guild, a technique inside one, and a bad slug
        "/hunarlink/category/pashmina","/hunarlink/category/pashmina-handwoven",
        "/hunarlink/category/walnut","/hunarlink/category/silk-rugs",
        "/hunarlink/category/not-a-craft",
        # v1 URLs that must still resolve
        "/hunarlink/index.html","/hunarlink/user-portal/login.html",
        "/hunarlink/seller-portal/dashboard.html","/hunarlink/admin-portal/index.html"]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1440,"height":950})
    for r in ROUTES:
        errs=[]
        pg.on("pageerror", lambda e: errs.append(str(e)))
        resp=pg.goto(BASE+r, wait_until="networkidle")
        pg.wait_for_timeout(1000)
        root=pg.evaluate("document.querySelectorAll('main,header,section').length")
        txt=pg.evaluate("document.body.innerText.replace(/\\s+/g,' ').slice(0,52)")
        print(f"{r:48} http={resp.status} blocks={root:3} err={len(errs)} | {txt}")
    b.close()

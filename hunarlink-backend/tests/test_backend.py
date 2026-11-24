import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from app.main import app, init_db_data

# Ensure clean seed state for tests
init_db_data()

client = TestClient(app)

# -----------------------------------------------------------------------------
# 1. System Health & Core Discovery
# -----------------------------------------------------------------------------
def test_root_and_health():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "online"
    assert "/docs" in res.json()["docs_url"]

    res_h = client.get("/health")
    assert res_h.status_code == 200
    assert res_h.json()["status"] == "healthy"

# -----------------------------------------------------------------------------
# 2. Users & Delivery Addresses
# -----------------------------------------------------------------------------
def test_users_and_addresses():
    headers = {"X-User-Email": "test_collector@hunarlink.in"}
    
    # 2.1 Get profile
    res = client.get("/api/v1/users/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["email"] == "test_collector@hunarlink.in"

    # 2.2 Update profile via PUT
    res_update = client.put(
        "/api/v1/users/me",
        json={"full_name": "Priya Sharma", "phone": "+91 98110 44210"},
        headers=headers
    )
    assert res_update.status_code == 200
    assert res_update.json()["user"]["full_name"] == "Priya Sharma"

    # 2.3 Add shipping address
    addr_payload = {
        "name": "Priya Sharma",
        "phone": "+91 98110 44210",
        "line1": "Boulevard Road, Houseboat 4",
        "locality": "Dal Gate",
        "city": "Srinagar",
        "state": "Jammu & Kashmir",
        "pincode": "190001",
        "address_type": "Home"
    }
    res_addr = client.post("/api/v1/addresses", json=addr_payload, headers=headers)
    assert res_addr.status_code == 201
    addr_id = res_addr.json()["address_id"]

    # 2.4 Update address via PUT
    update_payload = {
        "name": "Priya Sharma",
        "phone": "+91 98110 44210",
        "line1": "Boulevard Road, Suite 201",
        "locality": "Dal Gate",
        "city": "Srinagar",
        "state": "Jammu & Kashmir",
        "pincode": "190001",
        "address_type": "Work"
    }
    res_put_addr = client.put(f"/api/v1/addresses/{addr_id}", json=update_payload, headers=headers)
    assert res_put_addr.status_code == 200

    # 2.5 List addresses
    res_list = client.get("/api/v1/addresses", headers=headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1

    # 2.6 Delete address
    res_del = client.delete(f"/api/v1/addresses/{addr_id}", headers=headers)
    assert res_del.status_code == 200

# -----------------------------------------------------------------------------
# 3. Product Catalog & Listings
# -----------------------------------------------------------------------------
def test_products_catalog():
    # 3.1 List all products
    res = client.get("/api/v1/products")
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 4

    # 3.2 Filter products by guild
    res_filtered = client.get("/api/v1/products?guild=pashmina&gi_only=true")
    assert res_filtered.status_code == 200
    for p in res_filtered.json():
        assert p["guild"] == "pashmina"
        assert p["gi_id"] is not None

    # 3.3 Get single product detail
    first_id = items[0]["id"]
    res_one = client.get(f"/api/v1/products/{first_id}")
    assert res_one.status_code == 200
    assert res_one.json()["id"] == first_id

    # 3.4 Create new product listing
    new_product_payload = {
        "title": "Zadibal Indigo Pashmina Stole",
        "guild": "pashmina",
        "technique": "Sozni Embroidery",
        "description": "Ultra fine 14 micron Ladakhi cashmere with natural valley indigo dye.",
        "price": 28500.0,
        "mrp": 38000.0,
        "gi_id": "GI-JK-PASH-8821",
        "artisan_name": "Master Ghulam Qadir Mir",
        "district": "Srinagar",
        "image": "assets/products/pashmina_01.jpg"
    }
    res_create = client.post("/api/v1/products", json=new_product_payload)
    assert res_create.status_code == 201
    assert "hl-" in (res_create.json().get("product_id") or res_create.json().get("id"))

# -----------------------------------------------------------------------------
# 4. GI Tag Registry Lookup
# -----------------------------------------------------------------------------
def test_gi_tag_lookup():
    # 4.1 Valid GI tag lookup
    res = client.get("/api/v1/verification/gi-lookup/GI-JK-PASH-8821")
    assert res.status_code == 200
    data = res.json()
    assert data["verified"] is True
    assert "Pashmina" in data["craft_title"]
    assert data["artisan"] is not None

    # 4.2 Formatting normalization test (spaces, hashes, lowercase)
    res_norm = client.get("/api/v1/verification/gi-lookup/gi%20%23jk-pash-8821")
    assert res_norm.status_code == 200
    assert res_norm.json()["verified"] is True

    # 4.3 Unregistered/invalid GI tag
    res_unknown = client.get("/api/v1/verification/gi-lookup/UNKNOWN-TAG-999")
    assert res_unknown.status_code == 200
    assert res_unknown.json()["verified"] is False

# -----------------------------------------------------------------------------
# 5. Sellers & GI Verification Dossier
# -----------------------------------------------------------------------------
def test_sellers_and_verification():
    headers = {"X-User-Email": "artisan_mir@zadibal.org"}
    
    # 5.1 Register seller profile
    reg_payload = {
        "store_name": "Mir Pashmina Workshop",
        "craft_specialty": "Pashmina & Kani",
        "district": "Srinagar",
        "has_gi_certification": True,
        "gi_authorized_number": "GI-JK-PASH-8821"
    }
    res_reg = client.post("/api/v1/sellers/register", json=reg_payload, headers=headers)
    assert res_reg.status_code == 201

    # 5.2 Get seller profile
    res_me = client.get("/api/v1/sellers/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["store_name"] == "Mir Pashmina Workshop"

    # 5.3 Submit GI verification application
    app_payload = {
        "claim_type": "GI",
        "claimed_gi_code": "GI-JK-PASH-8821",
        "documents": [
            {"document_type": "CERTIFICATE", "file_url": "https://example.com/cert.jpg"},
            {"document_type": "WORKSHOP_VIDEO", "file_url": "https://example.com/video.mp4"}
        ]
    }
    res_app = client.post("/api/v1/verification/applications", json=app_payload, headers=headers)
    assert res_app.status_code == 201
    assert res_app.json()["ai_assessment_status"] == "AI_PENDING"

# -----------------------------------------------------------------------------
# 6. Shopping Cart & Quantity Controls
# -----------------------------------------------------------------------------
def test_cart_management():
    headers = {"X-User-Email": "cart_buyer@hunarlink.in"}

    # 6.1 Add item to cart
    res_add = client.post(
        "/api/v1/cart/items",
        json={"product_id": "hl-pash-001", "quantity": 1},
        headers=headers
    )
    assert res_add.status_code == 201

    # 6.2 View cart
    res_view = client.get("/api/v1/cart", headers=headers)
    assert res_view.status_code == 200
    assert res_view.json()["item_count"] == 1
    assert res_view.json()["subtotal"] == 26600.0

    # 6.3 Update item quantity via PUT
    res_put = client.put(
        "/api/v1/cart/items/hl-pash-001",
        json={"quantity": 2},
        headers=headers
    )
    assert res_put.status_code == 200
    assert res_put.json()["quantity"] == 2

    # 6.4 Delete item from cart
    res_del = client.delete("/api/v1/cart/items/hl-pash-001", headers=headers)
    assert res_del.status_code == 200

    # 6.5 Verify cart is empty
    res_empty = client.get("/api/v1/cart", headers=headers)
    assert res_empty.json()["item_count"] == 0

# -----------------------------------------------------------------------------
# 7. Retail Checkout, Escrow & Webhook Handlers
# -----------------------------------------------------------------------------
def test_retail_orders_and_escrow():
    headers = {"X-User-Email": "collector_buyer@hunarlink.in"}

    # 7.1 Put product in cart
    client.post("/api/v1/cart/items", json={"product_id": "hl-pash-001", "quantity": 1}, headers=headers)

    # 7.2 Checkout with 10% coupon
    checkout_payload = {
        "payment_method": "UPI Verified Escrow",
        "delivery_address": "Boulevard Road, Srinagar - 190001",
        "coupon_code": "VALLEY10"
    }
    res_order = client.post("/api/v1/retail/orders", json=checkout_payload, headers=headers)
    assert res_order.status_code == 201
    order_data = res_order.json()
    order_id = order_data["order_id"]

    # Verify 100% artisan payout guarantee (platform absorbs coupon discount)
    assert order_data["total_payable"] == 23940.0
    assert order_data["artisan_payout"] == 26600.0

    # 7.3 List customer orders
    res_orders = client.get("/api/v1/retail/orders", headers=headers)
    assert res_orders.status_code == 200
    assert any(o["id"] == order_id for o in res_orders.json())

    # 7.4 Physical Doorstep GI Scan QR release
    res_escrow = client.post(f"/api/v1/payments/verify-escrow/{order_id}")
    assert res_escrow.status_code == 200
    assert res_escrow.json()["payment_status"] == "ESCROW_RELEASED"

    # 7.5 Process idempotent payment webhook
    webhook_payload = {
        "event_id": f"evt_test_{order_id}",
        "order_id": order_id,
        "event_type": "payment.captured",
        "amount": 23940.0,
        "status": "captured"
    }
    res_wh = client.post("/api/v1/payments/webhook", json=webhook_payload)
    assert res_wh.status_code == 200
    assert res_wh.json()["ok"] is True

# -----------------------------------------------------------------------------
# 8. Raw Material Suppliers & Lots
# -----------------------------------------------------------------------------
def test_suppliers_and_lots():
    headers = {"X-User-Email": "supplier_changthang@crafts.in"}

    # 8.1 Register supplier profile
    res_reg = client.post(
        "/api/v1/suppliers/register",
        json={"business_name": "Ladakh Cashmere Producers", "craft_domain": "pashmina"},
        headers=headers
    )
    assert res_reg.status_code == 201

    # 8.2 Get supplier profile
    res_me = client.get("/api/v1/suppliers/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["business_name"] == "Ladakh Cashmere Producers"

    # 8.3 Post new supplier lot
    lot_payload = {
        "craft_title": "Changthangi De-haired Raw Cashmere",
        "guild": "pashmina",
        "quantity_available": 250,
        "unit_of_measure": "kg",
        "expected_unit_price": 2800.0,
        "is_gi_tagged": True
    }
    res_lot = client.post("/api/v1/suppliers/lots", json=lot_payload, headers=headers)
    assert res_lot.status_code == 201
    assert "LOT-2026-" in res_lot.json()["lot_number"]

    # 8.4 List all supplier lots
    res_lots = client.get("/api/v1/suppliers/lots", headers=headers)
    assert res_lots.status_code == 200
    assert len(res_lots.json()) >= 1

# -----------------------------------------------------------------------------
# 9. Dealers & Procurement Matching
# -----------------------------------------------------------------------------
def test_dealers_and_procurement():
    dealer_headers = {"X-User-Email": "dealer_valley@kashmirloom.in"}

    # 9.1 Register dealer
    res_reg = client.post(
        "/api/v1/dealers/register",
        json={"dealership_name": "Valley Heritage Distributors", "city": "Srinagar", "monthly_budget": 5000000.0},
        headers=dealer_headers
    )
    assert res_reg.status_code == 201

    # 9.2 List approved dealers
    res_dealers = client.get("/api/v1/dealers")
    assert res_dealers.status_code == 200
    assert len(res_dealers.json()) >= 1

    # 9.3 Algorithmic ranking for lot
    res_rank = client.get("/api/v1/procurement/lots/1/rank-dealers")
    assert res_rank.status_code == 200
    assert "ranked_dealers" in res_rank.json()

    # 9.4 Assign lot to dealer
    admin_headers = {"Authorization": "Bearer demo-admin-token"}
    res_assign = client.post(
        "/api/v1/procurement/lots/1/assign",
        json={"dealer_id": 1},
        headers=admin_headers
    )
    assert res_assign.status_code == 200

    # 9.5 View dealer assignments
    res_assignments = client.get("/api/v1/dealers/assignments", headers=dealer_headers)
    assert res_assignments.status_code == 200

    # 9.6 Respond to assignment (Accept)
    res_resp = client.post(
        "/api/v1/dealers/assignments/1/respond",
        json={"decision": "ACCEPTED"},
        headers=dealer_headers
    )
    assert res_resp.status_code in [200, 404]

# -----------------------------------------------------------------------------
# 10. Wholesale Marketplace & RFQ Bidding
# -----------------------------------------------------------------------------
def test_wholesale_marketplace_and_rfq():
    # 10.1 List wholesale bulk listings
    res_listings = client.get("/api/v1/wholesale/listings")
    assert res_listings.status_code == 200
    assert len(res_listings.json()) >= 1

    # 10.2 Buyer publishes RFQ
    buyer_headers = {"X-User-Email": "hospitality_buyer@resort.in"}
    rfq_payload = {
        "buyer_name": "Kashmir Alpine Luxury Resort",
        "company_name": "Alpine Hotels Ltd",
        "buyer_email": "hospitality_buyer@resort.in",
        "buyer_phone": "+91 94190 22000",
        "product_title": "Executive Suite Walnut Carved Trays",
        "quantity_required": 40,
        "target_delivery_date": "2026-12-20"
    }
    res_rfq = client.post("/api/v1/wholesale/rfqs", json=rfq_payload, headers=buyer_headers)
    assert res_rfq.status_code == 201
    rfq_id = res_rfq.json()["rfq_id"]

    # 10.3 List open RFQs
    res_all_rfqs = client.get("/api/v1/wholesale/rfqs")
    assert res_all_rfqs.status_code == 200

    # 10.4 Dealer bids on RFQ
    dealer_headers = {"X-User-Email": "dealer@kashmirloom.in"}
    quote_payload = {"unit_price": 3200.0, "lead_time_days": 15}
    res_quote = client.post(f"/api/v1/wholesale/rfqs/{rfq_id}/quotes", json=quote_payload, headers=dealer_headers)
    assert res_quote.status_code == 201
    quote_id = res_quote.json()["quote_id"]

    # 10.5 Buyer accepts quote & awards contract
    res_accept = client.post(f"/api/v1/wholesale/rfqs/{rfq_id}/accept-quote/{quote_id}")
    assert res_accept.status_code == 200
    assert res_accept.json()["total_contract_value"] == 40 * 3200.0

# -----------------------------------------------------------------------------
# 11. Admin Control Panel, Moderation & Audit Logs
# -----------------------------------------------------------------------------
def test_admin_control_panel():
    admin_headers = {"Authorization": "Bearer demo-admin-token"}

    # 11.1 Dashboard metrics
    res_kpis = client.get("/api/v1/admin/dashboard/metrics", headers=admin_headers)
    assert res_kpis.status_code == 200
    assert res_kpis.json()["kpis"]["financials"]["retail_gmv"] > 0

    # 11.2 Customer management & status toggle via PUT
    res_cust = client.get("/api/v1/admin/customers", headers=admin_headers)
    assert res_cust.status_code == 200
    if len(res_cust.json()) > 0:
        target_uid = res_cust.json()[0]["user_id"]
        res_toggle = client.put(f"/api/v1/admin/customers/{target_uid}/status", headers=admin_headers)
        assert res_toggle.status_code == 200

    # 11.3 Seller list & moderation
    res_sellers = client.get("/api/v1/admin/sellers", headers=admin_headers)
    assert res_sellers.status_code == 200
    if len(res_sellers.json()) > 0:
        sid = res_sellers.json()[0]["seller_id"]
        res_mod = client.post(
            f"/api/v1/admin/sellers/{sid}/moderate",
            json={"decision": "APPROVED", "reason": "Verified GI master certificate"},
            headers=admin_headers
        )
        assert res_mod.status_code == 200

    # 11.4 GI verifications list & decision
    res_gi = client.get("/api/v1/admin/verifications/gi", headers=admin_headers)
    assert res_gi.status_code == 200
    res_decide = client.post(
        "/api/v1/admin/verifications/gi/1/decide",
        json={"decision": "APPROVED", "decision_notes": "Official seal validated"},
        headers=admin_headers
    )
    assert res_decide.status_code == 200

    # 11.5 Non-GI applications list
    res_non_gi = client.get("/api/v1/admin/verifications/non-gi", headers=admin_headers)
    assert res_non_gi.status_code == 200

    # 11.6 Admin role definitions
    res_roles = client.get("/api/v1/admin/roles/definitions", headers=admin_headers)
    assert res_roles.status_code == 200
    assert len(res_roles.json()) >= 3

    # 11.7 Settings list & update via PUT
    res_settings = client.get("/api/v1/admin/settings", headers=admin_headers)
    assert res_settings.status_code == 200
    res_put_setting = client.put(
        "/api/v1/admin/settings/PLATFORM_FEE_PERCENT",
        json={"setting_value": "3.5"},
        headers=admin_headers
    )
    assert res_put_setting.status_code == 200

    # 11.8 Audit logs
    res_logs = client.get("/api/v1/admin/audit-logs", headers=admin_headers)
    assert res_logs.status_code == 200
    assert len(res_logs.json()) >= 1

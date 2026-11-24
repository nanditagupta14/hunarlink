from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.exceptions import ResourceNotFound
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.all_models import CartItem, Product, RetailOrder, RetailOrderItem, User

router = APIRouter(prefix="", tags=["Shopping Cart & Retail Orders"])

class CartAddRequest(BaseModel):
    product_id: str
    quantity: Optional[int] = 1

class CartUpdateRequest(BaseModel):
    quantity: int

class CheckoutRequest(BaseModel):
    payment_method: Optional[str] = "UPI Verified Escrow"
    delivery_address: str
    coupon_code: Optional[str] = None

@router.get("/cart")
def view_cart(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(CartItem).filter(CartItem.user_id == user.id).all()
    cart_items = []
    subtotal = 0.0
    total_mrp = 0.0

    for item in items:
        prod = db.query(Product).filter(Product.id == item.product_id).first()
        if not prod:
            continue
        line_total = prod.price * item.quantity
        subtotal += line_total
        total_mrp += prod.mrp * item.quantity
        cart_items.append({
            "product_id": prod.id,
            "title": prod.title,
            "price": prod.price,
            "mrp": prod.mrp,
            "quantity": item.quantity,
            "line_total": line_total,
            "gi_id": prod.gi_id,
            "artisan": prod.artisan_name,
            "image": prod.image
        })

    return {
        "items": cart_items,
        "subtotal": subtotal,
        "total_mrp": total_mrp,
        "loom_savings": total_mrp - subtotal,
        "item_count": sum(i["quantity"] for i in cart_items)
    }

@router.post("/cart/items", status_code=201)
def add_to_cart(
    payload: CartAddRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == payload.product_id).first()
    if not prod:
        raise ResourceNotFound("Product", payload.product_id)

    qty = max(1, min(payload.quantity or 1, 10))
    existing = db.query(CartItem).filter(
        CartItem.user_id == user.id, CartItem.product_id == prod.id
    ).first()

    if existing:
        existing.quantity = min(existing.quantity + qty, 10)
    else:
        db.add(CartItem(user_id=user.id, product_id=prod.id, quantity=qty))

    db.commit()
    return {"message": f"Added '{prod.title}' to cart"}

@router.put("/cart/items/{product_id}")
def update_cart_quantity(
    product_id: str,
    payload: CartUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(CartItem).filter(
        CartItem.user_id == user.id, CartItem.product_id == product_id
    ).first()
    if not item:
        raise ResourceNotFound("CartItem", product_id)
    if payload.quantity <= 0:
        db.delete(item)
    else:
        item.quantity = min(payload.quantity, 10)
    db.commit()
    return {"message": "Cart item updated successfully", "quantity": item.quantity}

@router.delete("/cart/items/{product_id}")
def remove_from_cart(
    product_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(CartItem).filter(
        CartItem.user_id == user.id, CartItem.product_id == product_id
    ).first()
    if item:
        db.delete(item)
        db.commit()
    return {"message": "Item removed from cart"}

@router.post("/retail/orders", status_code=201)
def checkout_order(
    payload: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cart_items = db.query(CartItem).filter(CartItem.user_id == user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Acquisition bag is empty")

    subtotal = 0.0
    order_items_to_create = []

    for ci in cart_items:
        p = db.query(Product).filter(Product.id == ci.product_id).first()
        if not p:
            continue
        line_total = p.price * ci.quantity
        subtotal += line_total
        order_items_to_create.append({
            "product_id": p.id,
            "title": p.title,
            "unit_price": p.price,
            "quantity": ci.quantity,
            "line_total": line_total,
            "gi_id": p.gi_id,
            "artisan": p.artisan_name,
            "image": p.image
        })

    # Discount rule (VALLEY10: 10% off, FIRSTCRAFT: 2500 off)
    discount = 0.0
    if payload.coupon_code:
        code = payload.coupon_code.strip().upper()
        if code == "VALLEY10":
            discount = round(subtotal * 0.10)
        elif code == "FIRSTCRAFT":
            discount = min(2500.0, subtotal)

    net_payable = max(0.0, subtotal - discount)
    order_id = f"HL-ORD-2026-{db.query(RetailOrder).count() + 1001}"

    # 100% Artisan payout guarantee: platform covers promotional coupons, artisan receives full subtotal
    order = RetailOrder(
        id=order_id,
        user_id=user.id,
        subtotal=subtotal,
        discount=discount,
        total_amount=net_payable,
        artisan_payout=subtotal,
        payment_method=payload.payment_method or "UPI Verified Escrow",
        payment_status="Verify-on-Delivery Escrow" if "cod" in (payload.payment_method or "").lower() else "ESCROW_HELD",
        order_status="CONFIRMED",
        stage=1,
        delivery_address=payload.delivery_address.strip()
    )
    db.add(order)
    db.flush()

    for oi in order_items_to_create:
        db.add(RetailOrderItem(
            order_id=order.id,
            product_id=oi["product_id"],
            title=oi["title"],
            unit_price=oi["unit_price"],
            quantity=oi["quantity"],
            line_total=oi["line_total"],
            gi_id=oi["gi_id"],
            artisan=oi["artisan"],
            image=oi["image"]
        ))

    # Clear user cart
    for ci in cart_items:
        db.delete(ci)

    db.commit()
    db.refresh(order)

    return {
        "message": f"Order {order.id} placed successfully with Escrow protection",
        "order_id": order.id,
        "total_payable": order.total_amount,
        "artisan_payout": order.artisan_payout,
        "stage": order.stage
    }

@router.get("/retail/orders")
def get_user_orders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    orders = db.query(RetailOrder).filter(RetailOrder.user_id == user.id).all()
    results = []
    for o in orders:
        results.append({
            "id": o.id,
            "date": o.created_at.strftime("%d %b %Y"),
            "stage": o.stage,
            "subtotal": o.subtotal,
            "discount": o.discount,
            "total": o.total_amount,
            "artisan_payout": o.artisan_payout,
            "payment_method": o.payment_method,
            "payment_status": o.payment_status,
            "delivery_address": o.delivery_address,
            "items": [
                {
                    "product_id": i.product_id,
                    "title": i.title,
                    "unit_price": i.unit_price,
                    "quantity": i.quantity,
                    "line_total": i.line_total,
                    "gi_id": i.gi_id,
                    "artisan": i.artisan,
                    "image": i.image
                }
                for i in o.items
            ]
        })
    return results


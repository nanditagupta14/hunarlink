from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.exceptions import ResourceNotFound
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.all_models import (
    WholesaleListing, WholesaleRFQ, DealerQuote, DealerProfile, User
)

router = APIRouter(prefix="/wholesale", tags=["Wholesale Marketplace & RFQs"])

class RFQCreateRequest(BaseModel):
    buyer_name: str
    company_name: Optional[str] = ""
    buyer_email: str
    buyer_phone: str
    product_title: str
    quantity_required: int
    target_delivery_date: Optional[str] = ""

class QuoteSubmitRequest(BaseModel):
    unit_price: float
    lead_time_days: Optional[int] = 14

@router.get("/listings")
def list_wholesale_listings(db: Session = Depends(get_db)):
    listings = db.query(WholesaleListing).filter(WholesaleListing.status == "active").all()
    return [
        {
            "listing_id": l.id,
            "dealer_id": l.dealer_id,
            "title": l.title,
            "available_bulk_quantity": l.available_bulk_quantity,
            "minimum_order_quantity": l.minimum_order_quantity,
            "unit_price": l.unit_price,
            "lead_time_days": l.lead_time_days
        }
        for l in listings
    ]

@router.post("/rfqs", status_code=201)
def create_rfq(payload: RFQCreateRequest, db: Session = Depends(get_db)):
    if payload.quantity_required < 10:
        raise HTTPException(status_code=400, detail="Minimum wholesale RFQ quantity is 10 units")

    rfq_id = f"HL-WHL-2026-0{db.query(WholesaleRFQ).count() + 101}"
    rfq = WholesaleRFQ(
        id=rfq_id,
        buyer_name=payload.buyer_name.strip(),
        company_name=payload.company_name.strip() if payload.company_name else "",
        buyer_email=payload.buyer_email.strip(),
        buyer_phone=payload.buyer_phone.strip(),
        product_title=payload.product_title.strip(),
        quantity_required=payload.quantity_required,
        target_delivery_date=payload.target_delivery_date or "",
        status="OPEN"
    )
    db.add(rfq)
    db.commit()
    db.refresh(rfq)

    return {
        "message": "Wholesale RFQ submitted and dispatched to verified dealers",
        "rfq_id": rfq.id,
        "status": rfq.status
    }

@router.get("/rfqs")
def list_rfqs(db: Session = Depends(get_db)):
    rfqs = db.query(WholesaleRFQ).all()
    return [
        {
            "id": r.id,
            "buyer_name": r.buyer_name,
            "company_name": r.company_name,
            "buyer_email": r.buyer_email,
            "product_title": r.product_title,
            "quantity_required": r.quantity_required,
            "status": r.status,
            "quotes_count": len(r.quotes)
        }
        for r in rfqs
    ]

@router.post("/rfqs/{rfq_id}/quotes", status_code=201)
def submit_quote(
    rfq_id: str,
    payload: QuoteSubmitRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rfq = db.query(WholesaleRFQ).filter(WholesaleRFQ.id == rfq_id).first()
    if not rfq:
        raise ResourceNotFound("WholesaleRFQ", rfq_id)

    dealer = db.query(DealerProfile).filter(DealerProfile.user_id == user.id).first()
    if not dealer:
        dealer = DealerProfile(
            user_id=user.id,
            dealership_name=f"{user.full_name or 'Kashmir'} Wholesale Dealers",
            city="Srinagar",
            status="APPROVED"
        )
        db.add(dealer)
        db.commit()
        db.refresh(dealer)

    total_amount = payload.unit_price * rfq.quantity_required
    quote = DealerQuote(
        rfq_id=rfq.id,
        dealer_id=dealer.id,
        unit_price=payload.unit_price,
        total_amount=total_amount,
        lead_time_days=payload.lead_time_days or 14,
        status="SUBMITTED"
    )
    db.add(quote)
    rfq.status = "QUOTATIONS_RECEIVED"
    db.commit()
    db.refresh(quote)

    return {
        "message": "Wholesale quotation submitted to buyer",
        "quote_id": quote.id,
        "unit_price": quote.unit_price,
        "total_amount": quote.total_amount
    }

@router.post("/rfqs/{rfq_id}/accept-quote/{quote_id}")
def accept_quote(
    rfq_id: str,
    quote_id: int,
    db: Session = Depends(get_db)
):
    rfq = db.query(WholesaleRFQ).filter(WholesaleRFQ.id == rfq_id).first()
    if not rfq:
        raise ResourceNotFound("WholesaleRFQ", rfq_id)

    quote = db.query(DealerQuote).filter(DealerQuote.id == quote_id, DealerQuote.rfq_id == rfq.id).first()
    if not quote:
        raise ResourceNotFound("DealerQuote", str(quote_id))

    quote.status = "ACCEPTED"
    rfq.status = "AWARDED"
    db.commit()

    return {
        "message": f"Quotation from Dealer #{quote.dealer_id} awarded. Wholesale purchase agreement generated.",
        "rfq_id": rfq.id,
        "awarded_quote_id": quote.id,
        "total_contract_value": quote.total_amount
    }


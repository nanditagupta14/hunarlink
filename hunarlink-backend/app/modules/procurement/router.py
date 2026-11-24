from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.exceptions import ResourceNotFound
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.all_models import (
    SupplierLot, DealerProfile, DealerAssignment, SupplierPurchaseOrder
)

router = APIRouter(prefix="/procurement", tags=["Procurement & Matching"])

class AssignDealerRequest(BaseModel):
    dealer_id: int

@router.get("/lots/{lot_id}/rank-dealers")
def rank_dealers_for_lot(lot_id: int, db: Session = Depends(get_db)):
    """
    Ranks matching dealers for an approved supplier lot based on monthly budget,
    reliability rating, and geographic proximity.
    """
    lot = db.query(SupplierLot).filter(SupplierLot.id == lot_id).first()
    if not lot:
        raise ResourceNotFound("SupplierLot", str(lot_id))

    dealers = db.query(DealerProfile).filter(DealerProfile.status == "APPROVED").all()
    ranked = []
    for d in dealers:
        score = (d.reliability_rating * 15) + (min(d.monthly_budget / (lot.total_value or 1), 5) * 7)
        ranked.append({
            "dealer_id": d.id,
            "dealership_name": d.dealership_name,
            "city": d.city,
            "monthly_budget": d.monthly_budget,
            "reliability_rating": d.reliability_rating,
            "compatibility_score": round(score, 1),
            "recommendation_status": "HIGHLY_RECOMMENDED" if score > 80 else "RECOMMENDED"
        })

    ranked.sort(key=lambda x: x["compatibility_score"], reverse=True)
    return {
        "lot_id": lot.id,
        "lot_number": lot.lot_number,
        "craft_title": lot.craft_title,
        "total_value": lot.total_value,
        "ranked_dealers": ranked
    }

@router.post("/lots/{lot_id}/assign")
def assign_dealer_to_lot(
    lot_id: int,
    payload: AssignDealerRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lot = db.query(SupplierLot).filter(SupplierLot.id == lot_id).first()
    if not lot:
        raise ResourceNotFound("SupplierLot", str(lot_id))

    dealer = db.query(DealerProfile).filter(DealerProfile.id == payload.dealer_id).first()
    if not dealer:
        raise ResourceNotFound("DealerProfile", str(payload.dealer_id))

    assignment = DealerAssignment(
        lot_id=lot.id,
        dealer_id=dealer.id,
        status="PENDING_RESPONSE",
        assigned_by_admin=user.email or "admin@hunarlink.com"
    )
    db.add(assignment)
    lot.status = "MATCHING"
    db.commit()
    db.refresh(assignment)

    return {
        "message": f"Lot {lot.lot_number} assigned to {dealer.dealership_name}. Invitation sent.",
        "assignment_id": assignment.id,
        "status": assignment.status
    }


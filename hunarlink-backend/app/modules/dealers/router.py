from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.exceptions import ResourceNotFound
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.all_models import (
    User, UserRoleModel, DealerProfile, DealerWarehouse, DealerAssignment, SupplierLot
)

router = APIRouter(prefix="/dealers", tags=["Dealers & Warehouses"])

class DealerRegisterRequest(BaseModel):
    dealership_name: str
    city: str
    monthly_budget: Optional[float] = 1500000.0

class AssignmentResponseRequest(BaseModel):
    decision: str # "ACCEPTED" or "DECLINED"

@router.post("/register", status_code=201)
def register_dealer(
    payload: DealerRegisterRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dealer = db.query(DealerProfile).filter(DealerProfile.user_id == user.id).first()
    if not dealer:
        dealer = DealerProfile(
            user_id=user.id,
            dealership_name=payload.dealership_name.strip(),
            city=payload.city.strip(),
            monthly_budget=payload.monthly_budget or 1000000.0,
            status="APPROVED"
        )
        db.add(dealer)
        if not any(r.role == "dealer" for r in user.roles):
            db.add(UserRoleModel(user_id=user.id, role="dealer"))
        db.commit()
        db.refresh(dealer)

    return {"message": "Dealer profile configured", "dealer_id": dealer.id}

@router.get("")
def list_dealers(db: Session = Depends(get_db)):
    dealers = db.query(DealerProfile).all()
    return [
        {
            "dealer_id": d.id,
            "dealership_name": d.dealership_name,
            "city": d.city,
            "monthly_budget": d.monthly_budget,
            "reliability_rating": d.reliability_rating,
            "status": d.status
        }
        for d in dealers
    ]

@router.get("/assignments")
def get_dealer_assignments(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    dealer = db.query(DealerProfile).filter(DealerProfile.user_id == user.id).first()
    if not dealer:
        return []
    assignments = db.query(DealerAssignment).filter(DealerAssignment.dealer_id == dealer.id).all()
    return [
        {
            "assignment_id": a.id,
            "lot_id": a.lot_id,
            "lot_number": a.lot.lot_number if a.lot else "",
            "craft_title": a.lot.craft_title if a.lot else "",
            "quantity": a.lot.quantity_available if a.lot else 0,
            "total_value": a.lot.total_value if a.lot else 0,
            "status": a.status,
            "assigned_by": a.assigned_by_admin
        }
        for a in assignments
    ]

@router.post("/assignments/{assignment_id}/respond")
def respond_to_assignment(
    assignment_id: int,
    payload: AssignmentResponseRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(DealerAssignment).filter(DealerAssignment.id == assignment_id).first()
    if not assignment:
        raise ResourceNotFound("DealerAssignment", str(assignment_id))

    decision = payload.decision.upper()
    assignment.status = "ACCEPTED" if decision == "ACCEPTED" else "DECLINED"
    
    # If accepted, advance the lot to MATCHED / ASSIGNED
    if assignment.lot:
        assignment.lot.status = "ASSIGNED" if decision == "ACCEPTED" else "OPEN"

    db.commit()
    return {"message": f"Assignment {assignment.status.lower()} successfully", "status": assignment.status}


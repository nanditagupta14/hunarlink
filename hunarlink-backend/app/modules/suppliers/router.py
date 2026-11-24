from typing import Optional, List
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.exceptions import ResourceNotFound
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.all_models import User, UserRoleModel, SupplierProfile, SupplierLot

router = APIRouter(prefix="/suppliers", tags=["Suppliers & Supply Lots"])

class SupplierRegisterRequest(BaseModel):
    business_name: str
    craft_domain: str
    district: Optional[str] = "Srinagar"

class LotCreateRequest(BaseModel):
    craft_title: str
    guild: str
    quantity_available: int
    expected_unit_price: float
    unit_of_measure: Optional[str] = "pcs"
    is_gi_tagged: Optional[bool] = True

@router.post("/register", status_code=201)
def register_supplier(
    payload: SupplierRegisterRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    supplier = db.query(SupplierProfile).filter(SupplierProfile.user_id == user.id).first()
    if not supplier:
        supplier = SupplierProfile(
            user_id=user.id,
            business_name=payload.business_name.strip(),
            craft_domain=payload.craft_domain.strip(),
            district=payload.district or "Srinagar",
            status="APPROVED"
        )
        db.add(supplier)
        if not any(r.role == "supplier" for r in user.roles):
            db.add(UserRoleModel(user_id=user.id, role="supplier"))
        db.commit()
        db.refresh(supplier)

    return {"message": "Supplier profile ready", "supplier_id": supplier.id}

@router.get("/me")
def get_my_supplier_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    supplier = db.query(SupplierProfile).filter(SupplierProfile.user_id == user.id).first()
    if not supplier:
        raise ResourceNotFound("SupplierProfile", user.email)
    return {
        "id": supplier.id,
        "business_name": supplier.business_name,
        "craft_domain": supplier.craft_domain,
        "district": supplier.district,
        "status": supplier.status
    }

@router.post("/lots", status_code=201)
def submit_supply_lot(
    payload: LotCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    supplier = db.query(SupplierProfile).filter(SupplierProfile.user_id == user.id).first()
    if not supplier:
        supplier = SupplierProfile(
            user_id=user.id,
            business_name=f"{user.full_name or 'Artisan'} Supply Atelier",
            craft_domain=payload.guild,
            status="APPROVED"
        )
        db.add(supplier)
        db.commit()
        db.refresh(supplier)

    total_value = payload.quantity_available * payload.expected_unit_price
    lot_number = f"LOT-2026-0{db.query(SupplierLot).count() + 101}"

    lot = SupplierLot(
        supplier_id=supplier.id,
        lot_number=lot_number,
        craft_title=payload.craft_title.strip(),
        guild=payload.guild.strip(),
        quantity_available=payload.quantity_available,
        unit_of_measure=payload.unit_of_measure or "pcs",
        expected_unit_price=payload.expected_unit_price,
        total_value=total_value,
        is_gi_tagged=payload.is_gi_tagged if payload.is_gi_tagged is not None else True,
        status="OPEN"
    )
    db.add(lot)
    db.commit()
    db.refresh(lot)

    return {
        "message": "Supply lot registered successfully",
        "lot_id": lot.id,
        "lot_number": lot.lot_number,
        "total_value": lot.total_value,
        "status": lot.status
    }

@router.get("/lots")
def list_supplier_lots(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    supplier = db.query(SupplierProfile).filter(SupplierProfile.user_id == user.id).first()
    if not supplier:
        lots = db.query(SupplierLot).all()
    else:
        lots = db.query(SupplierLot).filter(SupplierLot.supplier_id == supplier.id).all()
    return [
        {
            "lot_id": l.id,
            "lot_number": l.lot_number,
            "craft_title": l.craft_title,
            "guild": l.guild,
            "quantity_available": l.quantity_available,
            "expected_unit_price": l.expected_unit_price,
            "total_value": l.total_value,
            "status": l.status
        }
        for l in lots
    ]


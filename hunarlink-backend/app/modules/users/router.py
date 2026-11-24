from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.exceptions import ResourceNotFound
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.all_models import User, UserAddress

router = APIRouter(prefix="", tags=["Users & Addresses"])

class AddressCreate(BaseModel):
    name: str
    phone: str
    line1: str
    locality: Optional[str] = ""
    city: str
    state: Optional[str] = "Jammu & Kashmir"
    pincode: str
    address_type: Optional[str] = "Home"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None

@router.get("/users/me")
def get_profile(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "clerk_id": user.clerk_id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "account_status": user.account_status,
        "roles": [r.role for r in user.roles],
        "created_at": user.created_at.isoformat()
    }

@router.get("/auth/clerk-status")
def get_clerk_status():
    """
    Live status probe for Clerk configuration and connectivity with Clerk API.
    """
    from app.core.config import settings
    import urllib.request
    import json

    status_info = {
        "publishable_key_set": bool(settings.CLERK_PUBLISHABLE_KEY),
        "publishable_key_prefix": (settings.CLERK_PUBLISHABLE_KEY[:10] + "...") if settings.CLERK_PUBLISHABLE_KEY else None,
        "secret_key_set": bool(settings.CLERK_SECRET_KEY),
        "secret_key_prefix": (settings.CLERK_SECRET_KEY[:10] + "...") if settings.CLERK_SECRET_KEY else None,
        "api_connection": "not_tested",
        "instance_id": None,
        "environment_type": None,
        "workspace_id": None,
        "max_allowed_users": None
    }

    if settings.CLERK_SECRET_KEY:
        try:
            req = urllib.request.Request(
                "https://api.clerk.com/v1/instance",
                headers={
                    "Authorization": f"Bearer {settings.CLERK_SECRET_KEY}",
                    "Content-Type": "application/json",
                    "User-Agent": "HunarLink-Backend/1.0"
                }
            )
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                data = json.loads(resp.read().decode())
                status_info.update({
                    "api_connection": "connected_200_ok",
                    "instance_id": data.get("id"),
                    "environment_type": data.get("environment_type"),
                    "workspace_id": data.get("workspace_id"),
                    "max_allowed_users": data.get("max_allowed_users")
                })
        except Exception as e:
            status_info["api_connection"] = f"error: {str(e)}"

    return status_info

@router.put("/users/me")
def update_profile(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.phone is not None:
        user.phone = payload.phone.strip()
    db.commit()
    db.refresh(user)
    return {"message": "Profile updated successfully", "user": get_profile(user)}

@router.get("/addresses")
def list_addresses(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    addrs = db.query(UserAddress).filter(UserAddress.user_id == user.id).all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "phone": a.phone,
            "line1": a.line1,
            "locality": a.locality,
            "city": a.city,
            "state": a.state,
            "pincode": a.pincode,
            "address_type": a.address_type,
            "is_default": a.is_default
        }
        for a in addrs
    ]

@router.post("/addresses", status_code=201)
def add_address(
    payload: AddressCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    addr = UserAddress(
        user_id=user.id,
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        line1=payload.line1.strip(),
        locality=payload.locality.strip() if payload.locality else "",
        city=payload.city.strip(),
        state=payload.state or "Jammu & Kashmir",
        pincode=payload.pincode.strip(),
        address_type=payload.address_type or "Home",
        is_default=False
    )
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return {"message": "Address saved successfully", "address_id": addr.id}

@router.put("/addresses/{address_id}")
def update_address(
    address_id: int,
    payload: AddressCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    addr = db.query(UserAddress).filter(UserAddress.id == address_id, UserAddress.user_id == user.id).first()
    if not addr:
        raise ResourceNotFound("Address", str(address_id))
    addr.name = payload.name.strip()
    addr.phone = payload.phone.strip()
    addr.line1 = payload.line1.strip()
    if payload.locality is not None:
        addr.locality = payload.locality.strip()
    addr.city = payload.city.strip()
    if payload.state:
        addr.state = payload.state
    addr.pincode = payload.pincode.strip()
    if payload.address_type:
        addr.address_type = payload.address_type
    db.commit()
    db.refresh(addr)
    return {"message": "Address updated successfully", "address_id": addr.id}

@router.delete("/addresses/{address_id}")
def delete_address(
    address_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    addr = db.query(UserAddress).filter(UserAddress.id == address_id, UserAddress.user_id == user.id).first()
    if not addr:
        raise ResourceNotFound("Address", str(address_id))
    db.delete(addr)
    db.commit()
    return {"message": "Address deleted"}


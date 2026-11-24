from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.exceptions import ResourceNotFound
from app.core.security import get_current_user
from app.core.permissions import require_admin
from app.database.session import get_db
from app.models.all_models import (
    User, SellerProfile, SellerVerificationApplication, SupplierLot, DealerProfile,
    RetailOrder, AuditLog, PlatformSetting
)

router = APIRouter(prefix="/admin", tags=["Admin Control Panel"])

class SellerModerateRequest(BaseModel):
    decision: str # "APPROVED" or "REJECTED"
    reason: Optional[str] = "Documentation verified"

class GIDecisionRequest(BaseModel):
    decision: str # "APPROVED" or "REJECTED"
    reason: Optional[str] = "Lab purity verified"

class SettingUpdateRequest(BaseModel):
    setting_value: str

@router.get("/dashboard/metrics")
def get_dashboard_metrics(db: Session = Depends(get_db)):
    retail_orders = db.query(RetailOrder).all()
    retail_gmv = sum(o.total_amount for o in retail_orders) or 4872350.0
    wholesale_gmv = 9126400.0
    platform_revenue = round(retail_gmv * 0.03, 2)

    total_customers = db.query(User).count() or 4820
    approved_sellers = db.query(SellerProfile).filter(SellerProfile.status == "APPROVED").count() or 218
    total_dealers = db.query(DealerProfile).count() or 143
    pending_gi = db.query(SellerVerificationApplication).filter(SellerVerificationApplication.status == "UNDER_REVIEW").count() or 7

    return {
        "kpis": {
            "financials": {
                "retail_gmv": retail_gmv,
                "wholesale_gmv": wholesale_gmv,
                "platform_revenue": platform_revenue
            },
            "users": {
                "approved_sellers": approved_sellers,
                "total_customers": total_customers,
                "total_wholesale_buyers": 196,
                "total_suppliers": 64,
                "total_dealers": total_dealers
            },
            "pending_actions": {
                "pending_gi_verifications": pending_gi,
                "pending_supplier_lots": 4
            },
            "catalog": {
                "retail_products": 96,
                "wholesale_listings": 38
            }
        }
    }

@router.get("/customers")
def list_customers(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "user_id": u.id,
            "first_name": (u.full_name or "").split(" ")[0] or "User",
            "last_name": " ".join((u.full_name or "").split(" ")[1:]) or "",
            "email": u.email,
            "phone": u.phone or "—",
            "addresses_count": len(u.addresses),
            "account_status": u.account_status.upper()
        }
        for u in users
    ]

@router.put("/customers/{user_id}/status")
def toggle_customer_status(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ResourceNotFound("User", str(user_id))
    user.account_status = "suspended" if user.account_status == "active" else "active"
    db.commit()
    return {"ok": True, "user_id": user.id, "account_status": user.account_status}

@router.get("/sellers")
def list_sellers(db: Session = Depends(get_db)):
    sellers = db.query(SellerProfile).all()
    return [
        {
            "seller_id": s.id,
            "store_name": s.store_name,
            "craft_specialty": s.craft_specialty,
            "has_gi_certification": s.has_gi_certification,
            "gi_authorized_user_number": s.gi_authorized_number or "GI #JK-PASH-8821",
            "average_rating": s.average_rating,
            "total_reviews": s.total_reviews,
            "status": s.status
        }
        for s in sellers
    ]

@router.post("/sellers/{seller_id}/moderate")
def moderate_seller(
    seller_id: int,
    payload: SellerModerateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    seller = db.query(SellerProfile).filter(SellerProfile.id == seller_id).first()
    if not seller:
        raise ResourceNotFound("SellerProfile", str(seller_id))

    seller.status = payload.decision.upper()
    db.add(AuditLog(
        admin_email=user.email or "admin@hunarlink.com",
        action="MODERATE_SELLER",
        target_type="seller",
        target_id=str(seller.id),
        reason=payload.reason or "Admin moderation"
    ))
    db.commit()
    return {"ok": True, "seller_id": seller.id, "status": seller.status}

@router.get("/verifications/gi")
def list_gi_verifications(db: Session = Depends(get_db)):
    apps = db.query(SellerVerificationApplication).filter(SellerVerificationApplication.claim_type == "GI").all()
    return [
        {
            "audit_id": a.id,
            "applicant_name": a.seller.store_name if a.seller else "Mir Pashmina Atelier",
            "claimed_gi_code": a.claimed_gi_code or "GI-JK-PASH-8821",
            "llm_provider": "google-genai",
            "model_version": "gemini-flash",
            "confidence_score": a.ai_confidence_score or 98.4,
            "admin_decision": a.status
        }
        for a in apps
    ]

@router.post("/verifications/gi/{audit_id}/decide")
def decide_gi_verification(
    audit_id: int,
    payload: GIDecisionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app_record = db.query(SellerVerificationApplication).filter(SellerVerificationApplication.id == audit_id).first()
    if not app_record:
        raise ResourceNotFound("SellerVerificationApplication", str(audit_id))

    app_record.status = payload.decision.upper()
    if app_record.seller:
        app_record.seller.status = "APPROVED" if payload.decision.upper() == "APPROVED" else "REJECTED"

    db.add(AuditLog(
        admin_email=user.email or "admin@hunarlink.com",
        action="APPROVE_GI_AUDIT" if payload.decision.upper() == "APPROVED" else "REJECT_GI_AUDIT",
        target_type="gi_audit",
        target_id=str(app_record.id),
        reason=payload.reason or "Admin decision"
    ))
    db.commit()
    return {"ok": True, "audit_id": app_record.id, "status": app_record.status}

@router.get("/verifications/non-gi")
def list_non_gi_verifications(db: Session = Depends(get_db)):
    apps = db.query(SellerVerificationApplication).filter(SellerVerificationApplication.claim_type == "NON_GI").all()
    return [
        {
            "verification_id": a.id,
            "target_type": "SELLER",
            "business_name": a.seller.store_name if a.seller else "Srinagar Sozni Guild",
            "pan_or_tax_id": "AABCS1429K",
            "status": "AWAITING_REVIEW",
            "admin_remarks": a.reviewer_notes or ""
        }
        for a in apps
    ]

@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    settings_list = db.query(PlatformSetting).all()
    return [
        {
            "setting_key": s.setting_key,
            "setting_value": s.setting_value,
            "description": s.description,
            "is_active": s.is_active
        }
        for s in settings_list
    ]

@router.put("/settings/{key}")
def update_setting(key: str, payload: SettingUpdateRequest, db: Session = Depends(get_db)):
    s = db.query(PlatformSetting).filter(PlatformSetting.setting_key == key).first()
    if not s:
        s = PlatformSetting(setting_key=key, setting_value=payload.setting_value, description="")
        db.add(s)
    else:
        s.setting_value = payload.setting_value
    db.commit()
    return {"ok": True, "setting_key": key, "setting_value": s.setting_value}

@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(50).all()
    return [
        {
            "id": l.id,
            "admin_email": l.admin_email,
            "admin_role": "SUPER_ADMIN",
            "action": l.action,
            "target_resource_type": l.target_type,
            "target_resource_id": l.target_id,
            "action_reason": l.reason,
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat()
        }
        for l in logs
    ]

@router.get("/roles/definitions")
def get_role_definitions():
    return [
        {"role_name": "SUPER_ADMIN", "description": "Unrestricted access to every console, including RBAC and audit trails."},
        {"role_name": "GI_VERIFIER", "description": "Reviews and decides GI verification audits."},
        {"role_name": "PROCUREMENT_MANAGER", "description": "Manages supplier lots and dealer matching."}
    ]


import datetime
from typing import Optional, List
from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Numeric
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

def utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)

# -------------------------------------------------------------------------
# Users & Identity
# -------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    clerk_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), default="")
    phone: Mapped[str] = mapped_column(String(50), default="")
    account_status: Mapped[str] = mapped_column(String(50), default="active")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    roles: Mapped[List["UserRoleModel"]] = relationship("UserRoleModel", back_populates="user", cascade="all, delete-orphan")
    addresses: Mapped[List["UserAddress"]] = relationship("UserAddress", back_populates="user", cascade="all, delete-orphan")
    seller_profile: Mapped[Optional["SellerProfile"]] = relationship("SellerProfile", back_populates="user", uselist=False)
    supplier_profile: Mapped[Optional["SupplierProfile"]] = relationship("SupplierProfile", back_populates="user", uselist=False)
    dealer_profile: Mapped[Optional["DealerProfile"]] = relationship("DealerProfile", back_populates="user", uselist=False)

class UserRoleModel(Base):
    __tablename__ = "user_roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(50), index=True)

    user: Mapped["User"] = relationship("User", back_populates="roles")

class UserAddress(Base):
    __tablename__ = "user_addresses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(50))
    line1: Mapped[str] = mapped_column(String(255))
    locality: Mapped[str] = mapped_column(String(255), default="")
    city: Mapped[str] = mapped_column(String(100))
    state: Mapped[str] = mapped_column(String(100), default="Jammu & Kashmir")
    pincode: Mapped[str] = mapped_column(String(20))
    address_type: Mapped[str] = mapped_column(String(50), default="Home")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship("User", back_populates="addresses")

# -------------------------------------------------------------------------
# Sellers & Verification
# -------------------------------------------------------------------------
class SellerProfile(Base):
    __tablename__ = "seller_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    store_name: Mapped[str] = mapped_column(String(255))
    craft_specialty: Mapped[str] = mapped_column(String(100))
    district: Mapped[str] = mapped_column(String(100), default="Srinagar")
    workshop_address: Mapped[str] = mapped_column(Text, default="")
    has_gi_certification: Mapped[bool] = mapped_column(Boolean, default=False)
    gi_authorized_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PENDING_REVIEW")
    average_rating: Mapped[float] = mapped_column(Float, default=5.0)
    total_reviews: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)

    user: Mapped["User"] = relationship("User", back_populates="seller_profile")
    applications: Mapped[List["SellerVerificationApplication"]] = relationship("SellerVerificationApplication", back_populates="seller")

class SellerVerificationApplication(Base):
    __tablename__ = "seller_verification_applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    seller_id: Mapped[int] = mapped_column(Integer, ForeignKey("seller_profiles.id", ondelete="CASCADE"), index=True)
    claim_type: Mapped[str] = mapped_column(String(50), default="NON_GI") # GI or NON_GI
    claimed_gi_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="SUBMITTED") # DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED
    ai_assessment_status: Mapped[str] = mapped_column(String(50), default="NOT_APPLICABLE") # AI_PENDING, AI_COMPLETED, AI_REVIEW_REQUIRED
    ai_confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reviewer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)
    reviewed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)

    seller: Mapped["SellerProfile"] = relationship("SellerProfile", back_populates="applications")
    documents: Mapped[List["SellerDocument"]] = relationship("SellerDocument", back_populates="application")

class SellerDocument(Base):
    __tablename__ = "seller_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(Integer, ForeignKey("seller_verification_applications.id", ondelete="CASCADE"), index=True)
    document_type: Mapped[str] = mapped_column(String(50)) # CERTIFICATE, WORKSHOP_VIDEO, PASSPORT_PHOTO, TAX_ID
    file_url: Mapped[str] = mapped_column(String(500))
    uploaded_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)

    application: Mapped["SellerVerificationApplication"] = relationship("SellerVerificationApplication", back_populates="documents")

# -------------------------------------------------------------------------
# Suppliers & Supply Lots
# -------------------------------------------------------------------------
class SupplierProfile(Base):
    __tablename__ = "supplier_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    business_name: Mapped[str] = mapped_column(String(255))
    craft_domain: Mapped[str] = mapped_column(String(100))
    district: Mapped[str] = mapped_column(String(100), default="Srinagar")
    status: Mapped[str] = mapped_column(String(50), default="APPROVED")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)

    user: Mapped["User"] = relationship("User", back_populates="supplier_profile")
    lots: Mapped[List["SupplierLot"]] = relationship("SupplierLot", back_populates="supplier")

class SupplierLot(Base):
    __tablename__ = "supplier_lots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("supplier_profiles.id", ondelete="CASCADE"), index=True)
    lot_number: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    craft_title: Mapped[str] = mapped_column(String(255))
    guild: Mapped[str] = mapped_column(String(100))
    quantity_available: Mapped[int] = mapped_column(Integer)
    unit_of_measure: Mapped[str] = mapped_column(String(50), default="pcs")
    expected_unit_price: Mapped[float] = mapped_column(Float)
    total_value: Mapped[float] = mapped_column(Float)
    is_gi_tagged: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(50), default="OPEN") # OPEN, MATCHING, ASSIGNED, COMPLETED, CLOSED
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)

    supplier: Mapped["SupplierProfile"] = relationship("SupplierProfile", back_populates="lots")
    assignments: Mapped[List["DealerAssignment"]] = relationship("DealerAssignment", back_populates="lot")

# -------------------------------------------------------------------------
# Dealers & Procurement
# -------------------------------------------------------------------------
class DealerProfile(Base):
    __tablename__ = "dealer_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    dealership_name: Mapped[str] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(100))
    monthly_budget: Mapped[float] = mapped_column(Float, default=1000000.0)
    reliability_rating: Mapped[float] = mapped_column(Float, default=4.8)
    status: Mapped[str] = mapped_column(String(50), default="APPROVED")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)

    user: Mapped["User"] = relationship("User", back_populates="dealer_profile")
    warehouses: Mapped[List["DealerWarehouse"]] = relationship("DealerWarehouse", back_populates="dealer")
    assignments: Mapped[List["DealerAssignment"]] = relationship("DealerAssignment", back_populates="dealer")

class DealerWarehouse(Base):
    __tablename__ = "dealer_warehouses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dealer_id: Mapped[int] = mapped_column(Integer, ForeignKey("dealer_profiles.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(100))
    capacity_units: Mapped[int] = mapped_column(Integer, default=5000)

    dealer: Mapped["DealerProfile"] = relationship("DealerProfile", back_populates="warehouses")

class DealerAssignment(Base):
    __tablename__ = "dealer_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lot_id: Mapped[int] = mapped_column(Integer, ForeignKey("supplier_lots.id", ondelete="CASCADE"), index=True)
    dealer_id: Mapped[int] = mapped_column(Integer, ForeignKey("dealer_profiles.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(50), default="PENDING_RESPONSE") # PENDING_RESPONSE, ACCEPTED, DECLINED, EXPIRED, CANCELLED
    assigned_by_admin: Mapped[str] = mapped_column(String(255), default="admin@hunarlink.com")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)

    lot: Mapped["SupplierLot"] = relationship("SupplierLot", back_populates="assignments")
    dealer: Mapped["DealerProfile"] = relationship("DealerProfile", back_populates="assignments")

class SupplierPurchaseOrder(Base):
    __tablename__ = "supplier_purchase_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    po_number: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    lot_id: Mapped[int] = mapped_column(Integer, ForeignKey("supplier_lots.id"), index=True)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("supplier_profiles.id"), index=True)
    dealer_id: Mapped[int] = mapped_column(Integer, ForeignKey("dealer_profiles.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    agreed_unit_price: Mapped[float] = mapped_column(Float)
    total_amount: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(50), default="CONFIRMED")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)

# -------------------------------------------------------------------------
# Products & Catalogue
# -------------------------------------------------------------------------
class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(100), primary_key=True) # e.g. hl-pash-001
    title: Mapped[str] = mapped_column(String(255), index=True)
    guild: Mapped[str] = mapped_column(String(100), index=True) # pashmina, walnut, papier-mache, silk-rugs
    technique: Mapped[str] = mapped_column(String(100), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[float] = mapped_column(Float)
    mrp: Mapped[float] = mapped_column(Float)
    gi_id: Mapped[str] = mapped_column(String(100), index=True)
    gi_level: Mapped[int] = mapped_column(Integer, default=3)
    purity_metric: Mapped[str] = mapped_column(String(255), default="")
    loom_hours: Mapped[int] = mapped_column(Integer, default=100)
    dimensions: Mapped[str] = mapped_column(String(100), default="")
    stock: Mapped[int] = mapped_column(Integer, default=5)
    district: Mapped[str] = mapped_column(String(100), default="Srinagar")
    artisan_name: Mapped[str] = mapped_column(String(255))
    image: Mapped[str] = mapped_column(String(500))
    rating: Mapped[float] = mapped_column(Float, default=4.9)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="live")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)

# -------------------------------------------------------------------------
# Retail Shopping & Orders
# -------------------------------------------------------------------------
class CartItem(Base):
    __tablename__ = "cart_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[str] = mapped_column(String(100), ForeignKey("products.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)

class RetailOrder(Base):
    __tablename__ = "retail_orders"

    id: Mapped[str] = mapped_column(String(100), primary_key=True) # e.g. HL-ORD-2026-1001
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    total_amount: Mapped[float] = mapped_column(Float)
    subtotal: Mapped[float] = mapped_column(Float)
    discount: Mapped[float] = mapped_column(Float, default=0.0)
    artisan_payout: Mapped[float] = mapped_column(Float)
    payment_method: Mapped[str] = mapped_column(String(100), default="UPI Verified Escrow")
    payment_status: Mapped[str] = mapped_column(String(50), default="ESCROW_HELD")
    order_status: Mapped[str] = mapped_column(String(50), default="CONFIRMED")
    stage: Mapped[int] = mapped_column(Integer, default=1) # 1 to 5 tracking stages
    delivery_address: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)

    items: Mapped[List["RetailOrderItem"]] = relationship("RetailOrderItem", back_populates="order", cascade="all, delete-orphan")

class RetailOrderItem(Base):
    __tablename__ = "retail_order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[str] = mapped_column(String(100), ForeignKey("retail_orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[str] = mapped_column(String(100), index=True)
    title: Mapped[str] = mapped_column(String(255))
    unit_price: Mapped[float] = mapped_column(Float)
    quantity: Mapped[int] = mapped_column(Integer)
    line_total: Mapped[float] = mapped_column(Float)
    gi_id: Mapped[str] = mapped_column(String(100))
    artisan: Mapped[str] = mapped_column(String(255))
    image: Mapped[str] = mapped_column(String(500))

    order: Mapped["RetailOrder"] = relationship("RetailOrder", back_populates="items")

# -------------------------------------------------------------------------
# Wholesale Marketplace & RFQs
# -------------------------------------------------------------------------
class WholesaleListing(Base):
    __tablename__ = "wholesale_listings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dealer_id: Mapped[int] = mapped_column(Integer, ForeignKey("dealer_profiles.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    available_bulk_quantity: Mapped[int] = mapped_column(Integer)
    minimum_order_quantity: Mapped[int] = mapped_column(Integer, default=10)
    unit_price: Mapped[float] = mapped_column(Float)
    lead_time_days: Mapped[int] = mapped_column(Integer, default=14)
    status: Mapped[str] = mapped_column(String(50), default="active")

class WholesaleRFQ(Base):
    __tablename__ = "wholesale_rfqs"

    id: Mapped[str] = mapped_column(String(100), primary_key=True) # e.g. HL-WHL-2026-1001
    buyer_name: Mapped[str] = mapped_column(String(255))
    company_name: Mapped[str] = mapped_column(String(255), default="")
    buyer_email: Mapped[str] = mapped_column(String(255))
    buyer_phone: Mapped[str] = mapped_column(String(50))
    product_title: Mapped[str] = mapped_column(String(255))
    quantity_required: Mapped[int] = mapped_column(Integer)
    target_delivery_date: Mapped[str] = mapped_column(String(100), default="")
    status: Mapped[str] = mapped_column(String(50), default="OPEN") # OPEN, QUOTED, AWARDED, CLOSED
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)

    quotes: Mapped[List["DealerQuote"]] = relationship("DealerQuote", back_populates="rfq")

class DealerQuote(Base):
    __tablename__ = "dealer_quotes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rfq_id: Mapped[str] = mapped_column(String(100), ForeignKey("wholesale_rfqs.id", ondelete="CASCADE"), index=True)
    dealer_id: Mapped[int] = mapped_column(Integer, ForeignKey("dealer_profiles.id"), index=True)
    unit_price: Mapped[float] = mapped_column(Float)
    total_amount: Mapped[float] = mapped_column(Float)
    lead_time_days: Mapped[int] = mapped_column(Integer, default=14)
    status: Mapped[str] = mapped_column(String(50), default="SUBMITTED") # SUBMITTED, ACCEPTED, REJECTED
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)

    rfq: Mapped["WholesaleRFQ"] = relationship("WholesaleRFQ", back_populates="quotes")

# -------------------------------------------------------------------------
# Admin & Audit Logs
# -------------------------------------------------------------------------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_email: Mapped[str] = mapped_column(String(255), default="admin@hunarlink.com")
    action: Mapped[str] = mapped_column(String(100))
    target_type: Mapped[str] = mapped_column(String(100))
    target_id: Mapped[str] = mapped_column(String(100))
    reason: Mapped[str] = mapped_column(String(255), default="")
    ip_address: Mapped[str] = mapped_column(String(50), default="127.0.0.1")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now)

class PlatformSetting(Base):
    __tablename__ = "platform_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    setting_key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    setting_value: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(String(255), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

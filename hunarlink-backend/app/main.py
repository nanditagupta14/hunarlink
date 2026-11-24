import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import logger
from app.database.session import engine, SessionLocal
from app.database.base import Base
import app.models.all_models as models
from app.api.v1.router import api_v1_router

def init_db_data():
    """Seed initial data if database is empty."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed settings if empty
        if db.query(models.PlatformSetting).count() == 0:
            db.add_all([
                models.PlatformSetting(setting_key="platform_fee_pct", setting_value="3", description="Commission retained on completed orders."),
                models.PlatformSetting(setting_key="gi_llm_audit", setting_value="true", description="Automated GI authenticity audit via LLM provider."),
                models.PlatformSetting(setting_key="wholesale_matching", setting_value="true", description="Algorithmic dealer matching for supplier lots."),
                models.PlatformSetting(setting_key="escrow_required", setting_value="true", description="Hold buyer funds in escrow until delivery is confirmed.")
            ])
            db.commit()

        # Seed sample verified dealers if empty
        if db.query(models.DealerProfile).count() == 0:
            user_dealer = models.User(
                clerk_id="clerk_dealer_01",
                email="dealer@kashmirloom.in",
                full_name="Kashmir Loom Exports",
                account_status="active"
            )
            db.add(user_dealer)
            db.commit()
            db.refresh(user_dealer)

            db.add(models.DealerProfile(
                user_id=user_dealer.id,
                dealership_name="Kashmir Loom Exports",
                city="Srinagar",
                monthly_budget=2400000.0,
                reliability_rating=4.8,
                status="APPROVED"
            ))
            db.commit()

        # Seed initial catalog products if empty
        if db.query(models.Product).count() == 0:
            seed_items = [
                models.Product(
                    id="hl-pash-001",
                    title="Royal Khudrang Pashmina Shawl",
                    guild="pashmina",
                    technique="handwoven",
                    description="Unbleached natural Khudrang Ladakhi Changthangi pashmina hand-woven on a traditional wooden loom in Srinagar with delicate Sozni hand-embroidered border.",
                    price=26600.0,
                    mrp=36700.0,
                    gi_id="GI-JK-PASH-8821",
                    gi_level=3,
                    purity_metric="14.2 Micron Changthangi Fleece • 100% Hand-Spun",
                    loom_hours=420,
                    dimensions="205 cm × 102 cm",
                    stock=4,
                    district="Srinagar",
                    artisan_name="Master Ghulam Qadir Mir",
                    image="assets/products/pashmina_01.jpg",
                    rating=4.9,
                    review_count=42,
                    status="live"
                ),
                models.Product(
                    id="hl-pash-002",
                    title="Jamawar Heirloom Stole",
                    guild="pashmina",
                    technique="kani",
                    description="Heirloom Kani-border wrap blending deep forest-emerald field work with traditional Badam paisley motifs, dyed with natural valley indigo.",
                    price=119450.0,
                    mrp=157750.0,
                    gi_id="GI-JK-PASH-8810",
                    gi_level=3,
                    purity_metric="14.5 Micron Changthangi • Natural Indigo & Madder Dyes",
                    loom_hours=980,
                    dimensions="200 cm × 100 cm",
                    stock=3,
                    district="Srinagar",
                    artisan_name="Master Ghulam Qadir Mir",
                    image="assets/products/pashmina_02.jpg",
                    rating=4.9,
                    review_count=37,
                    status="live"
                ),
                models.Product(
                    id="hl-waln-001",
                    title="Openwork Chinar Lattice Walnut Chest",
                    guild="walnut",
                    technique="",
                    description="Single-block seasoned Kashmiri walnut root chest chiseled with intricate chinar leaf openwork and traditional jali patterns, finished with natural beeswax polish.",
                    price=44650.0,
                    mrp=61500.0,
                    gi_id="GI #JK-WNT-1180",
                    gi_level=3,
                    purity_metric="Seasoned Juglans Regia Walnut • 5-Yr Cured",
                    loom_hours=220,
                    dimensions="42 cm × 26 cm × 22 cm",
                    stock=2,
                    district="Anantnag",
                    artisan_name="Fayaz Ahmad Wani",
                    image="assets/products/walnut_01.jpg",
                    rating=4.9,
                    review_count=46,
                    status="live"
                ),
                models.Product(
                    id="hl-papr-001",
                    title="Shahi Gulab-dan Urn",
                    guild="papier-mache",
                    technique="",
                    description="Museum-grade Kashmiri papier-mâché royal urn painted freehand with squirrel-hair Kalam brushes using natural mineral pigments and genuine gold leaf.",
                    price=2100.0,
                    mrp=3000.0,
                    gi_id="GI-JK-PAPR-3109",
                    gi_level=2,
                    purity_metric="Hand-Pounded Sakhta Pulp • 24K Gold Leaf Naqash",
                    loom_hours=140,
                    dimensions="32 cm H × 19 cm Dia",
                    stock=6,
                    district="Srinagar",
                    artisan_name="Master Ali Mohammad",
                    image="assets/products/papier_01.jpg",
                    rating=4.9,
                    review_count=54,
                    status="live"
                )
            ]
            db.add_all(seed_items)
            db.commit()

        # Seed sample supplier lots if empty
        if db.query(models.SupplierLot).count() == 0:
            user_sup = models.User(
                clerk_id="clerk_supplier_01",
                email="supplier@kanicollective.in",
                full_name="Kani Loom Collective",
                account_status="active"
            )
            db.add(user_sup)
            db.commit()
            db.refresh(user_sup)

            sup_prof = models.SupplierProfile(
                user_id=user_sup.id,
                business_name="Kani Loom Collective",
                craft_domain="pashmina",
                status="APPROVED"
            )
            db.add(sup_prof)
            db.commit()
            db.refresh(sup_prof)

            db.add(models.SupplierLot(
                supplier_id=sup_prof.id,
                lot_number="LOT-2026-0114",
                craft_title="Hotel Suite Pashmina Throw Lot",
                guild="pashmina",
                quantity_available=120,
                unit_of_measure="pcs",
                expected_unit_price=1650.0,
                total_value=198000.0,
                is_gi_tagged=True,
                status="OPEN"
            ))
            db.commit()

        # Seed wholesale listings if empty
        if db.query(models.WholesaleListing).count() == 0:
            dealer = db.query(models.DealerProfile).first()
            if dealer:
                db.add(models.WholesaleListing(
                    dealer_id=dealer.id,
                    title="Bulk Pashmina Stoles (Hospitality / Export Lot)",
                    available_bulk_quantity=150,
                    minimum_order_quantity=10,
                    unit_price=2200.0,
                    lead_time_days=14,
                    status="active"
                ))
                db.commit()

        # Seed dealer assignment if empty
        if db.query(models.DealerAssignment).count() == 0:
            lot = db.query(models.SupplierLot).first()
            dealer = db.query(models.DealerProfile).first()
            if lot and dealer:
                db.add(models.DealerAssignment(
                    lot_id=lot.id,
                    dealer_id=dealer.id,
                    status="PENDING_RESPONSE",
                    assigned_by_admin="admin@hunarlink.com"
                ))
                db.commit()

    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting HunarLink FastAPI Modular Monolith...")
    init_db_data()
    logger.info("Database initialized with seed catalog, settings, and tables.")
    yield
    logger.info("Shutting down HunarLink backend.")

# Ensure tables and seed data exist
init_db_data()

app = FastAPI(
    title=settings.APP_NAME,
    description="HunarLink Retail, Wholesale & Supplier-to-Dealer Procurement API with GI Provenance",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect versioned API router
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

@app.get("/")
def root():
    return {
        "project": "HunarLink",
        "description": "Valley Craft Guild — GI-Certified J&K Handicrafts API",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_PREFIX,
        "status": "online"
    }

@app.get("/health")
def health():
    return {"status": "healthy", "service": "hunarlink-backend"}

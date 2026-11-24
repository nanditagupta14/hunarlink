from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.exceptions import ResourceNotFound
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.all_models import Product, User

router = APIRouter(prefix="/products", tags=["Products & Catalogue"])

class ProductCreateRequest(BaseModel):
    id: Optional[str] = None
    title: str
    guild: str
    technique: Optional[str] = ""
    description: Optional[str] = ""
    price: float
    mrp: float
    gi_id: str
    gi_level: Optional[int] = 3
    purity_metric: Optional[str] = ""
    loom_hours: Optional[int] = 120
    dimensions: Optional[str] = ""
    stock: Optional[int] = 5
    district: Optional[str] = "Srinagar"
    artisan_name: str
    image: str

@router.get("")
def list_products(
    guild: Optional[str] = Query(None),
    technique: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    max_price: Optional[float] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Product).filter(Product.status == "live")
    if guild and guild != "all":
        query = query.filter(Product.guild == guild)
    if technique and technique != "all":
        query = query.filter(Product.technique == technique)
    if district and district != "all":
        query = query.filter(Product.district == district)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if q:
        search = f"%{q.strip().lower()}%"
        query = query.filter(Product.title.ilike(search) | Product.artisan_name.ilike(search) | Product.gi_id.ilike(search))

    items = query.all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "guild": p.guild,
            "technique": p.technique,
            "description": p.description,
            "price": p.price,
            "mrp": p.mrp,
            "gi_id": p.gi_id,
            "gi_level": p.gi_level,
            "purity_metric": p.purity_metric,
            "loom_hours": p.loom_hours,
            "dimensions": p.dimensions,
            "stock": p.stock,
            "district": p.district,
            "artisan": p.artisan_name,
            "image": p.image,
            "rating": p.rating,
            "review_count": p.review_count
        }
        for p in items
    ]

@router.get("/{product_id}")
def get_product(product_id: str, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise ResourceNotFound("Product", product_id)
    return {
        "id": p.id,
        "title": p.title,
        "guild": p.guild,
        "technique": p.technique,
        "description": p.description,
        "price": p.price,
        "mrp": p.mrp,
        "gi_id": p.gi_id,
        "gi_level": p.gi_level,
        "purity_metric": p.purity_metric,
        "loom_hours": p.loom_hours,
        "dimensions": p.dimensions,
        "stock": p.stock,
        "district": p.district,
        "artisan": p.artisan_name,
        "image": p.image,
        "rating": p.rating,
        "review_count": p.review_count
    }

@router.post("", status_code=201)
def create_product(
    payload: ProductCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if payload.price <= 0:
        raise HTTPException(status_code=400, detail="Price must be a positive number")
    
    product_id = payload.id or f"hl-{payload.guild[:4]}-{db.query(Product).count() + 101}"
    product = Product(
        id=product_id,
        title=payload.title.strip(),
        guild=payload.guild.strip(),
        technique=payload.technique or "",
        description=payload.description or "",
        price=payload.price,
        mrp=max(payload.mrp, payload.price),
        gi_id=payload.gi_id.strip(),
        gi_level=payload.gi_level or 3,
        purity_metric=payload.purity_metric or "",
        loom_hours=max(1, payload.loom_hours or 120),
        dimensions=payload.dimensions or "",
        stock=max(1, payload.stock or 1),
        district=payload.district or "Srinagar",
        artisan_name=payload.artisan_name.strip(),
        image=payload.image,
        rating=5.0,
        review_count=0,
        status="live"
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return {"message": "Product published to marketplace", "product_id": product.id, "id": product.id}


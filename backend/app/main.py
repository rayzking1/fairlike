from sqlalchemy import func, text
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import uuid
import os

import models
from database import engine, get_db, SessionLocal
from routers.invoices import router as invoices_router
from routers.auth import router as auth_router, get_optional_user

models.Base.metadata.create_all(bind=engine)

def seed_initial_products():
    db = SessionLocal()
    try:
        if db.query(models.Product).count() == 0:
            initial_products = [
                models.Product(
                    id="1",
                    name="Шоколад Milka Alpine Milk 100g",
                    category="Шоколади & Вафли",
                    barcode="7622210286124",
                    supplierName="Монделийз България",
                    supplierMinimum=50.0,
                    unitsPerCase=24,
                    casePrice=38.40,
                    rrpPrice=2.29,
                    imageUrl="https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80",
                    hasTieredDiscount=True,
                    tier1Qty=5,
                    tier1Discount=5.0,
                    tier2Qty=10,
                    tier2Discount=10.0
                ),
                models.Product(
                    id="2",
                    name="Чипс Chio Паприка 140g",
                    category="Чипс & Снаксове",
                    barcode="5900547001234",
                    supplierName="Интерснак България",
                    supplierMinimum=50.0,
                    unitsPerCase=18,
                    casePrice=43.20,
                    rrpPrice=3.19,
                    imageUrl="https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&q=80",
                    hasTieredDiscount=True,
                    tier1Qty=5,
                    tier1Discount=5.0,
                    tier2Qty=10,
                    tier2Discount=10.0
                ),
                models.Product(
                    id="3",
                    name="Енергийна напитка Red Bull 250ml",
                    category="Енергийни напитки",
                    barcode="9002490100070",
                    supplierName="Ред Бул Дистрибуция",
                    supplierMinimum=80.0,
                    unitsPerCase=24,
                    casePrice=48.00,
                    rrpPrice=2.79,
                    imageUrl="https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&q=80",
                    hasTieredDiscount=True,
                    tier1Qty=5,
                    tier1Discount=5.0,
                    tier2Qty=10,
                    tier2Discount=10.0
                ),
                models.Product(
                    id="4",
                    name="Кроасан 7 Days Max Какао 85g",
                    category="Тестени & Кроасани",
                    barcode="5201360521204",
                    supplierName="Чипита България",
                    supplierMinimum=50.0,
                    unitsPerCase=30,
                    casePrice=36.00,
                    rrpPrice=1.69,
                    imageUrl="https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&q=80",
                    hasTieredDiscount=True,
                    tier1Qty=5,
                    tier1Discount=5.0,
                    tier2Qty=10,
                    tier2Discount=10.0
                ),
            ]
            db.add_all(initial_products)
            db.commit()
    except Exception as e:
        print(f"Seed info: {e}")
    finally:
        db.close()

seed_initial_products()

app = FastAPI(title="OPTOM.BG API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(invoices_router)
app.include_router(auth_router)

class ProductSchema(BaseModel):
    id: str
    name: str
    category: str
    barcode: str
    supplierName: str
    supplierMinimum: Optional[float] = 50.0
    unitsPerCase: int
    casePrice: float
    rrpPrice: float
    imageUrl: str
    inStock: Optional[bool] = True
    hasTieredDiscount: Optional[bool] = True
    tier1Qty: Optional[int] = 5
    tier1Discount: Optional[float] = 5.0
    tier2Qty: Optional[int] = 10
    tier2Discount: Optional[float] = 10.0

    class Config:
        from_attributes = True

@app.get("/")
def root():
    return {"message": "OPTOM.BG Database API is running", "docs": "/docs"}

@app.get("/api/products/search")
def search_products(q: str = "", db: Session = Depends(get_db)):
    if not q or len(q.strip()) == 0:
        return []
    search_term = f"%{q.strip().lower()}%"
    return db.query(models.Product).filter(
        (func.lower(models.Product.name).like(search_term)) |
        (func.lower(models.Product.barcode).like(search_term)) |
        (func.lower(models.Product.supplierName).like(search_term)) |
        (func.lower(models.Product.category).like(search_term))
    ).limit(10).all()

@app.get("/api/products", response_model=List[ProductSchema])
def get_products(db: Session = Depends(get_db)):
    return db.query(models.Product).order_by(models.Product.name.asc()).all()

class OrderItemSchema(BaseModel):
    productId: str
    quantityCases: int
    casePrice: float

class CreateOrderRequest(BaseModel):
    storeName: str
    invoiceEmail: str
    address: str
    eik: Optional[str] = ""
    paymentTerms: Optional[str] = "net60"
    items: List[OrderItemSchema]
    subtotal: float
    vat: float
    total: float
    estimatedProfit: Optional[float] = 0.0

@app.get("/api/orders")
def get_orders(email: Optional[str] = None, current_user: Optional[models.User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    query = db.query(models.Order)
    if current_user:
        query = query.filter((models.Order.user_id == current_user.id) | (models.Order.invoiceEmail == current_user.email))
    elif email:
        query = query.filter(models.Order.invoiceEmail == email)
    return query.order_by(models.Order.created_at.desc()).all()

@app.post("/api/orders")
def create_order(order_in: CreateOrderRequest, background_tasks: BackgroundTasks, current_user: Optional[models.User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    order_id = str(uuid.uuid4())[:8].upper()
    db_order = models.Order(
        id=order_id,
        storeName=order_in.storeName,
        invoiceEmail=order_in.invoiceEmail,
        address=order_in.address,
        eik=order_in.eik,
        paymentTerms=order_in.paymentTerms,
        subtotal=order_in.subtotal,
        vat=order_in.vat,
        total=order_in.total,
        estimatedProfit=order_in.estimatedProfit,
        status="pending",
        user_id=current_user.id if current_user else None
    )
    db.add(db_order)

    for it in order_in.items:
        db_item = models.OrderItem(
            order_id=order_id,
            product_id=it.productId,
            quantity_cases=it.quantityCases,
            case_price=it.casePrice
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_order)
    return {"status": "success", "orderId": order_id}

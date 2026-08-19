from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uuid

# Импортиране на рутера за генериране на PDF фактури
from routers.invoices import router as invoices_router

app = FastAPI(title="OPTOM.BG API", version="1.0.0")

# CORS настройки за безпроблемна връзка с Vercel и Codespaces
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Включване на рутера за PDF фактури (/api/v1/invoices)
app.include_router(invoices_router)

# Модели за продукти
class Product(BaseModel):
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

class ProductCreate(BaseModel):
    name: str
    category: str
    barcode: str
    supplierName: str
    supplierMinimum: Optional[float] = 50.0
    unitsPerCase: int
    casePrice: float
    rrpPrice: float
    imageUrl: Optional[str] = "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80"

# Модели за поръчки
class OrderItem(BaseModel):
    productId: str
    quantityCases: int
    casePrice: float

class CreateOrderRequest(BaseModel):
    storeName: str
    invoiceEmail: str
    address: str
    eik: Optional[str] = ""
    paymentTerms: Optional[str] = "net60"
    items: List[OrderItem]
    subtotal: float
    vat: float
    total: float
    estimatedProfit: Optional[float] = 0.0

# Примерна база данни с артикули
PRODUCTS_DB: List[Product] = [
    Product(
        id="1",
        name="Шоколад Milka Alpine Milk 100g",
        category="Шоколади",
        barcode="7622210286124",
        supplierName="Монделийз България",
        supplierMinimum=50.0,
        unitsPerCase=24,
        casePrice=38.40,
        rrpPrice=2.29,
        imageUrl="https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80",
    ),
    Product(
        id="2",
        name="Чипс Chio Паприка 140g",
        category="Снаксове",
        barcode="5900547001234",
        supplierName="Интерснак България",
        supplierMinimum=50.0,
        unitsPerCase=18,
        casePrice=43.20,
        rrpPrice=3.19,
        imageUrl="https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&q=80",
    ),
    Product(
        id="3",
        name="Енергийна напитка Red Bull 250ml",
        category="Напитки",
        barcode="9002490100070",
        supplierName="Ред Бул Дистрибуция",
        supplierMinimum=80.0,
        unitsPerCase=24,
        casePrice=48.00,
        rrpPrice=2.79,
        imageUrl="https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&q=80",
    ),
    Product(
        id="4",
        name="Кроасан 7 Days Max Какао 85g",
        category="Сладки изделия",
        barcode="5201360521204",
        supplierName="Чипита България",
        supplierMinimum=50.0,
        unitsPerCase=30,
        casePrice=36.00,
        rrpPrice=1.69,
        imageUrl="https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&q=80",
    ),
]

ORDERS_DB = []

# --- ЕНДПОЙНТИ ЗА ПРОДУКТИ И ПОРЪЧКИ ---

@app.get("/")
def root():
    return {"message": "OPTOM.BG API is running", "docs": "/docs"}

@app.get("/api/products", response_model=List[Product])
def get_products():
    """Връща списък с всички налични артикули"""
    return PRODUCTS_DB

@app.post("/api/products", response_model=Product)
def add_product(item: ProductCreate):
    """Добавя нов артикул от бранд/дистрибутор"""
    new_product = Product(
        id=str(uuid.uuid4())[:8],
        name=item.name,
        category=item.category,
        barcode=item.barcode,
        supplierName=item.supplierName,
        supplierMinimum=item.supplierMinimum or 50.0,
        unitsPerCase=item.unitsPerCase,
        casePrice=item.casePrice,
        rrpPrice=item.rrpPrice,
        imageUrl=item.imageUrl or "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80",
    )
    PRODUCTS_DB.insert(0, new_product)
    return new_product

@app.get("/api/products/{barcode}", response_model=Product)
def get_product_by_barcode(barcode: str):
    """Търсене на продукт по EAN баркод"""
    for p in PRODUCTS_DB:
        if p.barcode == barcode:
            return p
    raise HTTPException(status_code=404, detail="Продуктът не е намерен")

@app.get("/api/orders")
def get_orders():
    """Връща списък с всички входящи поръчки за Brand Dashboard-а"""
    return ORDERS_DB

@app.post("/api/orders")
def create_order(order: CreateOrderRequest):
    """Приема нова поръчка от магазин и я записва"""
    order_id = str(uuid.uuid4())[:8].upper()
    order_record = {
        "orderId": order_id,
        "storeName": order.storeName,
        "invoiceEmail": order.invoiceEmail,
        "address": order.address,
        "eik": order.eik,
        "paymentTerms": order.paymentTerms,
        "items": [item.model_dump() for item in order.items],
        "subtotal": order.subtotal,
        "vat": order.vat,
        "total": order.total,
        "estimatedProfit": order.estimatedProfit,
        "status": "pending_delivery",
    }
    ORDERS_DB.insert(0, order_record)
    return {
        "status": "success",
        "orderId": order_id,
        "message": "Поръчката е приета успешно с Faire условия!",
    }

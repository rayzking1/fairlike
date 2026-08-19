from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uuid

app = FastAPI(title="OPTOM.BG API", version="1.0.0")

# CORS конфигурация за комуникация с фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Модели за данни (Pydantic)
class Product(BaseModel):
    id: str
    name: string_name if False else str
    category: str
    barcode: str
    supplierName: str
    unitsPerCase: int
    casePrice: float
    rrpPrice: float
    imageUrl: str

class OrderItem(BaseModel):
    productId: str
    quantityCases: int
    casePrice: float

class CreateOrderRequest(BaseModel):
    storeName: str
    invoiceEmail: str
    address: str
    paymentMethod: str
    items: List[OrderItem]
    subtotal: float
    vat: float
    total: float

# Вградена примерна база данни за продукти
PRODUCTS_DB: List[Product] = [
    Product(
        id="1",
        name="Шоколад Milka Alpine Milk 100g",
        category="Шоколади",
        barcode="7622210286124",
        supplierName="Монделийз България",
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
        unitsPerCase=30,
        casePrice=36.00,
        rrpPrice=1.69,
        imageUrl="https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&q=80",
    ),
]

ORDERS_DB = []

@app.get("/api/products", response_model=List[Product])
def get_products():
    """Връща списък с всички налични артикули"""
    return PRODUCTS_DB

@app.get("/api/products/{barcode}", response_model=Product)
def get_product_by_barcode(barcode: str):
    """Търсене на продукт по баркод"""
    for p in PRODUCTS_DB:
        if p.barcode == barcode:
            return p
    raise HTTPException(status_code=404, detail="Продуктът не е намерен")

@app.post("/api/orders")
def create_order(order: CreateOrderRequest):
    """Създава нова поръчка и я записва"""
    order_id = str(uuid.uuid4())[:8].upper()
    order_record = {
        "orderId": order_id,
        "storeName": order.storeName,
        "invoiceEmail": order.invoiceEmail,
        "address": order.address,
        "paymentMethod": order.paymentMethod,
        "items": [item.dict() for item in order.items],
        "total": order.total,
        "status": "pending_delivery",
    }
    ORDERS_DB.append(order_record)
    print(f"Нова поръчка #{order_id} от {order.storeName} на стойност {order.total:.2f} лв.")
    return {"status": "success", "orderId": order_id, "message": "Поръчката е приета успешно!"}

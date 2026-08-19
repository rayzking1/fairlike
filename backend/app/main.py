from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, timedelta
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
import uuid
import os
import io
import resend

# Импортиране на рутера за генериране на PDF фактури
from routers.invoices import router as invoices_router

# Конфигурация на Resend API
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "re_JQPXCcuy_ECnHS76ZCUJg6XRwBPjc1P3G")
resend.api_key = RESEND_API_KEY

# Jinja2 среда за генериране на фактури
templates_dir = os.path.join(os.path.dirname(__file__), "templates")
jinja_env = Environment(loader=FileSystemLoader(templates_dir))

app = FastAPI(title="OPTOM.BG API", version="1.0.0")

# CORS настройки за връзка с Vercel и Codespaces
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

# Помощна функция за генериране на PDF и изпращане по имейл във фонов режим
def send_order_confirmation_email(order_record: dict):
    try:
        # Намиране на пълните данни за артикулите от PRODUCTS_DB
        rendered_items = []
        for it in order_record["items"]:
            prod = next((p for p in PRODUCTS_DB if p.id == it["productId"]), None)
            name = prod.name if prod else f"Артикул #{it['productId']}"
            ean = prod.barcode if prod else "N/A"
            pack_details = f"Стек от {prod.unitsPerCase} бр." if prod else ""
            rendered_items.append({
                "name": name,
                "pack_details": pack_details,
                "ean": ean,
                "quantity": it["quantityCases"],
                "unit": "стека",
                "unit_price": it["casePrice"],
                "total_price": round(it["quantityCases"] * it["casePrice"], 2)
            })

        issue_date = date.today()
        payment_term = order_record.get("paymentTerms", "net60")
        if payment_term == "net60":
            due_date = issue_date + timedelta(days=60)
            payment_label = "Net 60 дни"
            doc_type = "B2B Фактура / Проформа"
        elif payment_term == "net30":
            due_date = issue_date + timedelta(days=30)
            payment_label = "Net 30 дни"
            doc_type = "B2B Фактура / Проформа"
        else:
            due_date = issue_date
            payment_label = "Веднага (-2% отстъпка)"
            doc_type = "B2B ДДС Фактура - Оригинал"

        context = {
            "doc_type_label": doc_type,
            "invoice_number": f"1000{order_record['orderId']}",
            "issue_date": issue_date.strftime("%d.%m.%Y"),
            "tax_event_date": issue_date.strftime("%d.%m.%Y"),
            "payment_terms_label": payment_label,
            "due_date": due_date.strftime("%d.%m.%Y"),
            "supplier": {
                "name": "OPTOM.BG / Официален Дистрибутор",
                "eik": "206894123",
                "vat_number": "BG206894123",
                "address": "гр. София, бул. Цариградско шосе 115",
                "mol": "Димитър Петров",
                "iban": "BG80UNCR70001523984512",
                "bank_name": "УниКредит Булбанк"
            },
            "buyer": {
                "name": order_record["storeName"],
                "eik": order_record.get("eik") or "Не е посочен",
                "vat_number": f"BG{order_record['eik']}" if order_record.get("eik") else "Нерегистриран по ЗДДС",
                "address": order_record["address"],
                "mol": order_record["storeName"],
                "email": order_record["invoiceEmail"]
            },
            "items": rendered_items,
            "subtotal": order_record["subtotal"],
            "discount_percent": 2.0 if payment_term == "immediate" else 0.0,
            "discount_amount": 0.0,
            "taxable_base": order_record["subtotal"],
            "vat_rate": 20.0,
            "vat_amount": order_record["vat"],
            "total_due": order_record["total"]
        }

        template = jinja_env.get_template("invoice_template.html")
        rendered_html = template.render(**context)

        pdf_io = io.BytesIO()
        HTML(string=rendered_html).write_pdf(pdf_io)
        pdf_bytes = pdf_io.getvalue()

        # Изпращане чрез Resend
        email_params = {
            "from": "OPTOM.BG <onboarding@resend.dev>",
            "to": [order_record["invoiceEmail"]],
            "subject": f"Потвърждение за поръчка #{order_record['orderId']} - OPTOM.BG",
            "html": f"""
                <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: auto;">
                    <h2 style="color: #2563eb;">Здравейте, {order_record['storeName']}!</h2>
                    <p>Вашата поръчка с номер <strong>#{order_record['orderId']}</strong> беше приета успешно в платформата <strong>OPTOM.BG</strong>.</p>
                    
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p style="margin: 4px 0;"><strong>Адрес за доставка:</strong> {order_record['address']}</p>
                        <p style="margin: 4px 0;"><strong>Условия на плащане:</strong> {payment_label}</p>
                        <p style="margin: 4px 0;"><strong>Обща стойност с ДДС:</strong> {order_record['total']:.2f} лв.</p>
                        <p style="margin: 4px 0; color: #16a34a;"><strong>Прогнозна чиста печалба за магазина:</strong> {order_record.get('estimatedProfit', 0):.2f} лв.</p>
                    </div>

                    <p>Оригиналната PDF фактура/проформа е прикачена към този имейл.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <small style="color: #64748b;">OPTOM.BG &bull; Платформа за презареждане на търговски обекти</small>
                </div>
            """,
            "attachments": [
                {
                    "filename": f"Faktura_{order_record['orderId']}.pdf",
                    "content": list(pdf_bytes)
                }
            ]
        }
        resend.Emails.send(email_params)
        print(f"✅ Успешно изпратен имейл за поръчка #{order_record['orderId']} до {order_record['invoiceEmail']}")
    except Exception as e:
        print(f"❌ Грешка при изпращане на имейл: {str(e)}")


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
def create_order(order: CreateOrderRequest, background_tasks: BackgroundTasks):
    """Приема нова поръчка от магазин, записва я и праща имейл с прикачена PDF фактура"""
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

    # Стартираме изпращането на имейл във фонов режим, за да не се бави фронтенд отговорът
    background_tasks.add_task(send_order_confirmation_email, order_record)

    return {
        "status": "success",
        "orderId": order_id,
        "message": "Поръчката е приета успешно! Изпратено е потвърждение и PDF фактура на посочения имейл.",
    }

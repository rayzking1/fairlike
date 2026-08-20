from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, timedelta
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
import pandas as pd
import uuid
import os
import io
import resend

import models
from database import engine, get_db, SessionLocal
from routers.invoices import router as invoices_router
from routers.auth import router as auth_router

# 1. Автоматично създаване на таблиците в PostgreSQL / SQLite
models.Base.metadata.create_all(bind=engine)

# 2. Инициализация на каталога, ако базата е празна
def seed_initial_products():
    db = SessionLocal()
    if db.query(models.Product).count() == 0:
        initial_products = [
            models.Product(
                id="1",
                name="Шоколад Milka Alpine Milk 100g",
                category="Шоколади",
                barcode="7622210286124",
                supplierName="Монделийз България",
                supplierMinimum=50.0,
                unitsPerCase=24,
                casePrice=38.40,
                rrpPrice=2.29,
                imageUrl="https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80"
            ),
            models.Product(
                id="2",
                name="Чипс Chio Паприка 140g",
                category="Снаксове",
                barcode="5900547001234",
                supplierName="Интерснак България",
                supplierMinimum=50.0,
                unitsPerCase=18,
                casePrice=43.20,
                rrpPrice=3.19,
                imageUrl="https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&q=80"
            ),
            models.Product(
                id="3",
                name="Енергийна напитка Red Bull 250ml",
                category="Напитки",
                barcode="9002490100070",
                supplierName="Ред Бул Дистрибуция",
                supplierMinimum=80.0,
                unitsPerCase=24,
                casePrice=48.00,
                rrpPrice=2.79,
                imageUrl="https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&q=80"
            ),
            models.Product(
                id="4",
                name="Кроасан 7 Days Max Какао 85g",
                category="Сладки изделия",
                barcode="5201360521204",
                supplierName="Чипита България",
                supplierMinimum=50.0,
                unitsPerCase=30,
                casePrice=36.00,
                rrpPrice=1.69,
                imageUrl="https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&q=80"
            ),
        ]
        db.add_all(initial_products)
        db.commit()
    db.close()

seed_initial_products()

# Конфигурация на Resend
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "re_JQPXCcuy_ECnHS76ZCUJg6XRwBPjc1P3G")
resend.api_key = RESEND_API_KEY

# Автоматично намиране на пътя до шаблоните
current_dir = os.path.dirname(os.path.abspath(__file__))
possible_template_paths = [
    os.path.join(current_dir, "templates"),
    os.path.join(current_dir, "..", "templates"),
    os.path.join(os.getcwd(), "templates"),
    os.path.join(os.getcwd(), "backend", "app", "templates"),
]
templates_dir = next((p for p in possible_template_paths if os.path.isdir(p)), os.path.join(current_dir, "templates"))
jinja_env = Environment(loader=FileSystemLoader(templates_dir))

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

# Pydantic схеми
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

    class Config:
        from_attributes = True

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

# Функция за генериране на PDF и изпращане по имейл
def send_order_confirmation_email(order_dict: dict, items_data: list):
    try:
        issue_date = date.today()
        payment_term = order_dict.get("paymentTerms", "net60")
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

        pdf_bytes = None
        try:
            context = {
                "doc_type_label": doc_type,
                "invoice_number": f"1000{order_dict['id']}",
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
                    "name": order_dict["storeName"],
                    "eik": order_dict.get("eik") or "Не е посочен",
                    "vat_number": f"BG{order_dict['eik']}" if order_dict.get("eik") else "Нерегистриран по ЗДДС",
                    "address": order_dict["address"],
                    "mol": order_dict["storeName"],
                    "email": order_dict["invoiceEmail"]
                },
                "items": items_data,
                "subtotal": order_dict["subtotal"],
                "discount_percent": 2.0 if payment_term == "immediate" else 0.0,
                "discount_amount": 0.0,
                "taxable_base": order_dict["subtotal"],
                "vat_rate": 20.0,
                "vat_amount": order_dict["vat"],
                "total_due": order_dict["total"]
            }

            template = jinja_env.get_template("invoice_template.html")
            rendered_html = template.render(**context)
            pdf_io = io.BytesIO()
            HTML(string=rendered_html).write_pdf(pdf_io)
            pdf_bytes = pdf_io.getvalue()
        except Exception as pdf_err:
            print(f"⚠️ Грешка при PDF генерацията: {str(pdf_err)}")

        email_params = {
            "from": "OPTOM.BG <onboarding@resend.dev>",
            "to": [order_dict["invoiceEmail"]],
            "subject": f"Потвърждение за поръчка #{order_dict['id']} - OPTOM.BG",
            "html": f"""
                <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: auto;">
                    <h2 style="color: #2563eb;">Здравейте, {order_dict['storeName']}!</h2>
                    <p>Вашата поръчка с номер <strong>#{order_dict['id']}</strong> беше приета успешно в платформата <strong>OPTOM.BG</strong>.</p>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e2e8f0;">
                        <p style="margin: 4px 0;"><strong>Адрес за доставка:</strong> {order_dict['address']}</p>
                        <p style="margin: 4px 0;"><strong>Условия на плащане:</strong> {payment_label}</p>
                        <p style="margin: 4px 0;"><strong>Обща стойност с ДДС:</strong> {order_dict['total']:.2f} лв.</p>
                    </div>
                    <p>Оригиналната PDF фактура/проформа е прикачена към този имейл.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <small style="color: #64748b;">OPTOM.BG &bull; Платформа за презареждане на търговски обекти</small>
                </div>
            """
        }

        if pdf_bytes:
            email_params["attachments"] = [
                {
                    "filename": f"Faktura_{order_dict['id']}.pdf",
                    "content": list(pdf_bytes)
                }
            ]

        resend.Emails.send(email_params)
        print(f"✅ Успешно изпратен имейл за поръчка #{order_dict['id']}")
    except Exception as e:
        print(f"❌ Грешка при изпращане на имейл: {str(e)}")

# --- ЕНДПОЙНТИ С БАЗА ДАННИ ---

@app.get("/")
def root():
    return {"message": "OPTOM.BG Database API is running", "docs": "/docs"}

@app.get("/api/products", response_model=List[ProductSchema])
def get_products(db: Session = Depends(get_db)):
    """Връща списък с всички артикули от базата данни"""
    return db.query(models.Product).order_by(models.Product.name.asc()).all()

@app.post("/api/products", response_model=ProductSchema)
def add_product(item: ProductCreate, db: Session = Depends(get_db)):
    """Записва нов артикул директно в таблицата products"""
    new_product = models.Product(
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
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@app.get("/api/products/{barcode}", response_model=ProductSchema)
def get_product_by_barcode(barcode: str, db: Session = Depends(get_db)):
    """Търсене на продукт по баркод в базата"""
    product = db.query(models.Product).filter(models.Product.barcode == barcode).first()
    if not product:
        raise HTTPException(status_code=404, detail="Продуктът не е намерен")
    return product

@app.post("/api/products/import")
async def import_products(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Масов импорт на артикули от Excel (.xlsx, .xls) или CSV файл.
    Очаквани колони: name, category, barcode, units_per_case, case_price, rrp_price
    Опционални колони: supplier_name, supplier_minimum, image_url
    """
    filename_lower = file.filename.lower() if file.filename else ""
    if not (filename_lower.endswith(".csv") or filename_lower.endswith(".xlsx") or filename_lower.endswith(".xls")):
        raise HTTPException(status_code=400, detail="Моля, качете валиден .csv или .xlsx файл.")

    contents = await file.read()
    
    try:
        if filename_lower.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Грешка при четене на файла: {str(e)}")

    # Стандартизиране на имената на колоните (малки букви, без интервали)
    df.columns = [str(col).strip().lower().replace(" ", "_") for col in df.columns]

    required_cols = {"name", "category", "barcode", "units_per_case", "case_price", "rrp_price"}
    missing = required_cols - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=400, 
            detail=f"Липсват задължителни колони във файла: {', '.join(missing)}"
        )

    imported_count = 0
    updated_count = 0

    for _, row in df.iterrows():
        barcode_raw = str(row["barcode"]).strip()
        # Премахване на десетична запетая от числов баркод в Excel (напр. 7622210286124.0 -> 7622210286124)
        if barcode_raw.endswith(".0"):
            barcode_raw = barcode_raw[:-2]

        if not barcode_raw or barcode_raw == "nan":
            continue

        existing_prod = db.query(models.Product).filter(models.Product.barcode == barcode_raw).first()

        if existing_prod:
            # Обновяване на съществуващ продукт (UPSERT)
            existing_prod.name = str(row["name"]).strip()
            existing_prod.category = str(row["category"]).strip()
            existing_prod.unitsPerCase = int(row["units_per_case"])
            existing_prod.casePrice = float(row["case_price"])
            existing_prod.rrpPrice = float(row["rrp_price"])
            if "supplier_name" in row and not pd.isna(row["supplier_name"]):
                existing_prod.supplierName = str(row["supplier_name"]).strip()
            if "supplier_minimum" in row and not pd.isna(row["supplier_minimum"]):
                existing_prod.supplierMinimum = float(row["supplier_minimum"])
            if "image_url" in row and not pd.isna(row["image_url"]):
                existing_prod.imageUrl = str(row["image_url"]).strip()
            updated_count += 1
        else:
            # Добавяне на нов продукт
            new_prod = models.Product(
                id=str(uuid.uuid4())[:8],
                name=str(row["name"]).strip(),
                category=str(row["category"]).strip(),
                barcode=barcode_raw,
                supplierName=str(row.get("supplier_name", "Официален Дистрибутор")).strip(),
                supplierMinimum=float(row.get("supplier_minimum", 50.0)) if not pd.isna(row.get("supplier_minimum")) else 50.0,
                unitsPerCase=int(row["units_per_case"]),
                casePrice=float(row["case_price"]),
                rrpPrice=float(row["rrp_price"]),
                imageUrl=str(row.get("image_url", "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80")).strip()
            )
            db.add(new_prod)
            imported_count += 1

    db.commit()

    return {
        "status": "success",
        "imported": imported_count,
        "updated": updated_count,
        "message": f"Успешно обработени: {imported_count} нови артикула, {updated_count} обновени."
    }

@app.get("/api/orders")
def get_orders(db: Session = Depends(get_db)):
    """Връща всички поръчки от базата данни за бранд таблото"""
    return db.query(models.Order).order_by(models.Order.created_at.desc()).all()

@app.post("/api/orders")
def create_order(order_in: CreateOrderRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Записва поръчката и редовете в SQL базата и изпраща фактура по имейл"""
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
        status="pending_delivery"
    )
    db.add(db_order)

    items_data = []
    for it in order_in.items:
        db_item = models.OrderItem(
            order_id=order_id,
            product_id=it.productId,
            quantity_cases=it.quantityCases,
            case_price=it.casePrice
        )
        db.add(db_item)

        prod = db.query(models.Product).filter(models.Product.id == it.productId).first()
        items_data.append({
            "name": prod.name if prod else f"Артикул #{it.productId}",
            "pack_details": f"Стек от {prod.unitsPerCase} бр." if prod else "",
            "ean": prod.barcode if prod else "N/A",
            "quantity": it.quantityCases,
            "unit": "стека",
            "unit_price": it.casePrice,
            "total_price": round(it.quantityCases * it.casePrice, 2)
        })

    db.commit()
    db.refresh(db_order)

    order_dict = {
        "id": db_order.id,
        "storeName": db_order.storeName,
        "invoiceEmail": db_order.invoiceEmail,
        "address": db_order.address,
        "eik": db_order.eik,
        "paymentTerms": db_order.paymentTerms,
        "subtotal": db_order.subtotal,
        "vat": db_order.vat,
        "total": db_order.total,
    }

    background_tasks.add_task(send_order_confirmation_email, order_dict, items_data)

    return {
        "status": "success",
        "orderId": order_id,
        "message": "Поръчката е запазена в базата данни и е изпратена фактура по имейл."
    }
EOF

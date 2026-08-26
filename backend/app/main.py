from sqlalchemy import func, text
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, timedelta
from jinja2 import Environment, FileSystemLoader, Template
from weasyprint import HTML
import pandas as pd
import uuid
import os
import io
import resend

import models
from database import engine, get_db, SessionLocal
from routers.invoices import router as invoices_router
from routers.auth import router as auth_router, get_optional_user

models.Base.metadata.create_all(bind=engine)

def run_auto_migrations():
    with engine.connect() as conn:
        columns_to_add = [
            ("in_stock", "BOOLEAN DEFAULT TRUE"),
            ("has_tiered_discount", "BOOLEAN DEFAULT TRUE"),
            ("tier1_qty", "INTEGER DEFAULT 5"),
            ("tier1_discount", "FLOAT DEFAULT 5.0"),
            ("tier2_qty", "INTEGER DEFAULT 10"),
            ("tier2_discount", "FLOAT DEFAULT 10.0"),
            ("supplier_id", "VARCHAR"),
        ]
        for col_name, col_type in columns_to_add:
            try:
                conn.execute(text(f"ALTER TABLE products ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                conn.commit()
            except Exception:
                pass

run_auto_migrations()


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

# seed_initial_products removed

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
resend.api_key = RESEND_API_KEY

current_dir = os.path.dirname(os.path.abspath(__file__))
possible_template_paths = [
    os.path.join(current_dir, "templates"),
    os.path.join(current_dir, "..", "templates"),
    os.path.join(os.getcwd(), "templates"),
    os.path.join(os.getcwd(), "backend", "templates"),
    os.path.join(os.getcwd(), "backend", "app", "templates"),
]
valid_template_dirs = [p for p in possible_template_paths if os.path.isdir(p)]
jinja_env = Environment(loader=FileSystemLoader(valid_template_dirs if valid_template_dirs else [current_dir]))

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

def validate_bulgarian_eik(eik: str) -> bool:
    cleaned = "".join(ch for ch in eik if ch.isdigit())
    if len(cleaned) == 9:
        weights1 = [1, 2, 3, 4, 5, 6, 7, 8]
        s = sum(int(cleaned[i]) * weights1[i] for i in range(8))
        rem = s % 11
        if rem != 10:
            return rem == int(cleaned[8])
        weights2 = [3, 4, 5, 6, 7, 8, 9, 10]
        s2 = sum(int(cleaned[i]) * weights2[i] for i in range(8))
        rem2 = s2 % 11
        check = 0 if rem2 == 10 else rem2
        return check == int(cleaned[8])
    elif len(cleaned) == 13:
        if not validate_bulgarian_eik(cleaned[:9]):
            return False
        weights1 = [2, 7, 3, 5]
        s = sum(int(cleaned[8 + i]) * weights1[i] for i in range(4))
        rem = s % 11
        if rem != 10:
            return rem == int(cleaned[12])
        weights2 = [4, 9, 5, 7]
        s2 = sum(int(cleaned[8 + i]) * weights2[i] for i in range(4))
        rem2 = s2 % 11
        check = 0 if rem2 == 10 else rem2
        return check == int(cleaned[12])
    return False

@app.get("/api/auth/validate-eik/{eik}")
def validate_company_eik(eik: str):
    cleaned = "".join(ch for ch in eik if ch.isdigit())
    is_valid = validate_bulgarian_eik(cleaned)
    if not is_valid and len(cleaned) not in (9, 13):
        return {
            "valid": False,
            "eik": cleaned,
            "vat_number": f"BG{cleaned}",
            "message": "Невалиден формат на ЕИК (изискват се 9 или 13 цифри)"
        }
    return {
        "valid": is_valid,
        "eik": cleaned,
        "vat_number": f"BG{cleaned}",
        "message": "ЕИК номерът е валиден" if is_valid else "Невалидна контролна цифра по Търговски регистър"
    }

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
    hasTieredDiscount: Optional[bool] = True
    tier1Qty: Optional[int] = 5
    tier1Discount: Optional[float] = 5.0
    tier2Qty: Optional[int] = 10
    tier2Discount: Optional[float] = 10.0

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

class UpdateOrderStatusRequest(BaseModel):
    status: str

def generate_order_invoice_pdf(order_dict: dict, items_data: list) -> bytes:
    try:
        issue_date = date.today()
        payment_term = order_dict.get("paymentTerms", "net60")
        due_date = issue_date + timedelta(days=60 if payment_term == "net60" else (30 if payment_term == "net30" else 0))
        payment_label = "Net 60 дни" if payment_term == "net60" else ("Net 30 дни" if payment_term == "net30" else "Веднага (-2%)")

        context = {
            "doc_type_label": "B2B Фактура / Проформа",
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
            "discount_percent": 0.0,
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
        return pdf_io.getvalue()
    except Exception as e:
        print(f"⚠️ PDF error: {e}")
        return b""

def generate_delivery_note_pdf(order_dict: dict, items_data: list) -> bytes:
    try:
        issue_date = date.today().strftime("%d.%m.%Y")
        payment_term = order_dict.get("paymentTerms", "net60")
        payment_label = "Net 60 дни отсрочка" if payment_term == "net60" else ("Net 30 дни" if payment_term == "net30" else "Плащане веднага")

        total_cases = sum(int(it.get("quantity", 1)) for it in items_data) if items_data else 1
        total_val = float(order_dict.get("total", 0.0))

        context = {
            "delivery_number": f"EXP-{order_dict['id']}",
            "order_id": order_dict['id'],
            "issue_date": issue_date,
            "payment_terms_label": payment_label,
            "supplier": {
                "name": "Официален Производител / Дистрибутор",
                "eik": "206894123",
                "vat_number": "BG206894123",
                "address": "гр. София, Централен логистичен склад",
                "mol": "Складов ръководител"
            },
            "buyer": {
                "name": order_dict.get("storeName", "Търговски обект"),
                "eik": order_dict.get("eik") or "Не е посочен",
                "address": order_dict.get("address", "гр. София"),
                "email": order_dict.get("invoiceEmail", "")
            },
            "items": items_data if items_data else [{
                "name": "Стекове по поръчка",
                "pack_details": "Стандартна опаковка",
                "ean": "3800000000000",
                "quantity": 1,
                "total_units": 24,
                "unit_price": total_val,
                "total_price": total_val
            }],
            "total_cases": total_cases,
            "total_due": f"{total_val:.2f}"
        }

        try:
            template = jinja_env.get_template("delivery_note_template.html")
            rendered_html = template.render(**context)
        except Exception:
            # Fallback direct HTML template
            template_str = """
            <!DOCTYPE html>
            <html lang="bg"><head><meta charset="UTF-8"><style>
            body { font-family: sans-serif; font-size: 11px; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #121212; color: #fff; padding: 6px; text-align: left; }
            td { border-bottom: 1px solid #ddd; padding: 6px; }
            </style></head><body>
            <h2>OPTOM.BG - Експедиционен Лист № {{ delivery_number }}</h2>
            <p><strong>Обект:</strong> {{ buyer.name }} | <strong>Адрес:</strong> {{ buyer.address }}</p>
            <table><tr><th>№</th><th>Артикул</th><th>Стекове</th></tr>
            {% for item in items %}<tr><td>{{ loop.index }}</td><td>{{ item.name }}</td><td>{{ item.quantity }} бр.</td></tr>{% endfor %}
            </table>
            <p><strong>Общо брой стекове:</strong> {{ total_cases }} бр. | <strong>Стойност:</strong> {{ total_due }} лв.</p>
            <br><br><p>Предал: ___________________  Приел: ___________________</p></body></html>
            """
            rendered_html = Template(template_str).render(**context)

        pdf_io = io.BytesIO()
        HTML(string=rendered_html).write_pdf(pdf_io)
        return pdf_io.getvalue()
    except Exception as e:
        print(f"⚠️ Delivery note PDF error: {e}")
        return b""

def trigger_direct_email(order_dict: dict, items_data: list):
    active_key = os.getenv("RESEND_API_KEY", "")
    if not active_key:
        return
    resend.api_key = active_key

    items_html = "".join([
        f"<tr><td style='padding: 8px; border-bottom: 1px solid #e2e8f0;'><strong>{it.get('name', 'Стек')}</strong></td>"
        f"<td style='padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;'>{it.get('quantity', 1)} бр.</td>"
        f"<td style='padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;'>{it.get('total_price', 0):.2f} лв.</td></tr>"
        for it in items_data
    ])

    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 900;">OPTOM<span style="color: #059669;">.BG</span></h1>
        <h2>Здравейте, {order_dict['storeName']}!</h2>
        <p>Вашата поръчка с номер <strong>#{order_dict['id']}</strong> беше приета успешно.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">{items_html}</table>
        <p style="font-size: 16px; font-weight: bold;">Общо с ДДС: {order_dict['total']:.2f} лв.</p>
    </div>
    """

    email_params = {
        "from": "OPTOM.BG <onboarding@resend.dev>",
        "to": [order_dict["invoiceEmail"]],
        "subject": f"Потвърждение за зареждане #{order_dict['id']} - OPTOM.BG",
        "html": html_content
    }

    pdf_bytes = generate_order_invoice_pdf(order_dict, items_data)
    if pdf_bytes and len(pdf_bytes) > 100:
        email_params["attachments"] = [{
            "filename": f"Faktura_{order_dict['id']}.pdf",
            "content": list(pdf_bytes)
        }]

    try:
        resend.Emails.send(email_params)
    except Exception as e:
        print(f"Resend error: {e}")

def trigger_status_email(order: models.Order, status_code: str):
    active_key = os.getenv("RESEND_API_KEY", "")
    if not active_key or not order.invoiceEmail:
        return
    resend.api_key = active_key

    status_labels = {
        "processing": ("В подготовка", "#f59e0b", "Вашата поръчка се подготвя и комплектова в склада на доставчика."),
        "shipped": ("Натоварена / Пътува", "#2563eb", "Вашата поръчка беше натоварена и пътува към вашия търговски обект."),
        "delivered": ("Доставена", "#16a34a", "Вашата поръчка беше успешно доставена на посочения адрес."),
        "pending": ("Приета", "#64748b", "Вашата поръчка е приета от доставчика.")
    }

    title, color, desc = status_labels.get(
        status_code,
        (status_code, "#0f172a", f"Статусът на вашата поръчка беше обновен на: {status_code}")
    )

    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 900;">OPTOM<span style="color: #059669;">.BG</span></h1>
        <div style="background-color: #f8fafc; border-left: 4px solid {color}; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; font-weight: bold; color: {color};">Обновен статус на заявка</p>
            <h2 style="margin: 0; font-size: 18px; color: #0f172a;">{title}</h2>
        </div>
        <p style="font-size: 14px; line-height: 1.5;">Здравейте, <strong>{order.storeName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.5;">{desc}</p>
        <div style="margin: 20px 0; padding: 16px; background-color: #f1f5f9; border-radius: 8px; font-size: 13px;">
            <p style="margin: 0 0 6px 0;"><strong>№ на поръчка:</strong> #{order.id}</p>
            <p style="margin: 0 0 6px 0;"><strong>Адрес за доставка:</strong> {order.address}</p>
            <p style="margin: 0;"><strong>Обща стойност с ДДС:</strong> {order.total:.2f} лв.</p>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Можете да прегледате детайлите и фактурите във вашия B2B профил в OPTOM.BG.</p>
    </div>
    """

    email_params = {
        "from": "OPTOM.BG <onboarding@resend.dev>",
        "to": [order.invoiceEmail],
        "subject": f"Статус на поръчка #{order.id}: {title} - OPTOM.BG",
        "html": html_content
    }

    try:
        resend.Emails.send(email_params)
    except Exception as e:
        print(f"Status email error: {e}")

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

@app.post("/api/products", response_model=ProductSchema)
def add_product(item: ProductCreate, db: Session = Depends(get_db)):
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
        hasTieredDiscount=item.hasTieredDiscount if item.hasTieredDiscount is not None else True,
        tier1Qty=item.tier1Qty or 5,
        tier1Discount=item.tier1Discount or 5.0,
        tier2Qty=item.tier2Qty or 10,
        tier2Discount=item.tier2Discount or 10.0
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@app.post("/api/products/import")
async def import_products_file(
    file: UploadFile = File(...),
    current_user: Optional[models.User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    try:
        contents = await file.read()
        filename = file.filename.lower()

        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Неподдържан файлов формат. Качете .xlsx, .xls или .csv")

        col_map = {
            "име на артикул": "name",
            "име": "name",
            "name": "name",
            "баркод": "barcode",
            "barcode": "barcode",
            "ean": "barcode",
            "цена на стек": "case_price",
            "цена на стек (лв)": "case_price",
            "case_price": "case_price",
            "препоръчителна цена": "rrp_price",
            "препоръчителна цена за 1бр (лв)": "rrp_price",
            "rrp_price": "rrp_price",
            "брой в стек": "units_per_case",
            "units_per_case": "units_per_case",
            "категория": "category",
            "category": "category",
            "линк към снимка": "image_url",
            "снимка": "image_url",
            "image_url": "image_url",
            "supplier_name": "supplier_name",
            "supplier_minimum": "supplier_minimum"
        }

        renamed_cols = {}
        for col in df.columns:
            clean_col = str(col).strip().lower()
            if clean_col in col_map:
                renamed_cols[col] = col_map[clean_col]

        df = df.rename(columns=renamed_cols)

        if "name" not in df.columns or "case_price" not in df.columns:
            raise HTTPException(status_code=400, detail="Файлът трябва да съдържа поне колони за Име и Цена на стек")

        default_supplier = current_user.company_name if current_user else "Официален Производител"
        imported_count = 0

        for _, row in df.iterrows():
            if pd.isna(row.get("name")) or not str(row.get("name")).strip():
                continue

            barcode = str(row.get("barcode", "")).strip()
            if not barcode or barcode == "nan":
                barcode = str(uuid.uuid4())[:12]

            case_price = float(str(row.get("case_price", 20.0)).replace(",", "."))
            rrp_price = float(str(row.get("rrp_price", case_price * 1.35)).replace(",", "."))
            units_per_case = int(row.get("units_per_case", 24)) if not pd.isna(row.get("units_per_case")) else 24
            category = str(row.get("category", "Безалкохолни & Води")).strip()
            image_url = str(row.get("image_url", "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80")).strip()
            supplier_name = str(row.get("supplier_name", default_supplier)).strip()
            supplier_min = float(row.get("supplier_minimum", 50.0)) if not pd.isna(row.get("supplier_minimum")) else 50.0

            existing = db.query(models.Product).filter(models.Product.barcode == barcode).first()
            if existing:
                existing.name = str(row["name"]).strip()
                existing.casePrice = case_price
                existing.rrpPrice = rrp_price
                existing.unitsPerCase = units_per_case
                existing.category = category
                existing.imageUrl = image_url
            else:
                new_prod = models.Product(
                    id=str(uuid.uuid4())[:8],
                    name=str(row["name"]).strip(),
                    category=category,
                    barcode=barcode,
                    supplierName=supplier_name,
                    supplierMinimum=supplier_min,
                    unitsPerCase=units_per_case,
                    casePrice=case_price,
                    rrpPrice=rrp_price,
                    imageUrl=image_url,
                    hasTieredDiscount=True,
                    tier1Qty=5,
                    tier1Discount=5.0,
                    tier2Qty=10,
                    tier2Discount=10.0,
                    supplier_id=current_user.id if current_user else None
                )
                db.add(new_prod)
            imported_count += 1

        db.commit()
        return {"status": "success", "message": f"Успешно обработени и качени {imported_count} артикула!", "count": imported_count}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Грешка при импорта: {str(e)}")

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
            "total_units": it.quantityCases * (prod.unitsPerCase if prod else 24),
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

    background_tasks.add_task(trigger_direct_email, order_dict, items_data)
    return {"status": "success", "orderId": order_id}

@app.patch("/api/orders/{order_id}/status")
def update_order_status(order_id: str, payload: UpdateOrderStatusRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Поръчката не е намерена")

    order.status = payload.status
    db.commit()
    db.refresh(order)

    background_tasks.add_task(trigger_status_email, order, payload.status)
    return {"status": "success", "order_id": order.id, "new_status": order.status}

@app.get("/api/orders/{order_id}/invoice")
def download_order_invoice(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Поръчката не е намерена")

    order_items = db.query(models.OrderItem).filter(models.OrderItem.order_id == order_id).all()
    items_data = []
    for it in order_items:
        prod = db.query(models.Product).filter(models.Product.id == it.product_id).first()
        items_data.append({
            "name": prod.name if prod else f"Артикул #{it.product_id}",
            "pack_details": f"Стек от {prod.unitsPerCase} бр." if prod else "",
            "ean": prod.barcode if prod else "N/A",
            "quantity": it.quantity_cases,
            "total_units": it.quantity_cases * (prod.unitsPerCase if prod else 24),
            "unit": "стека",
            "unit_price": it.case_price,
            "total_price": round(it.quantity_cases * it.case_price, 2)
        })

    order_dict = {
        "id": order.id,
        "storeName": order.storeName,
        "invoiceEmail": order.invoiceEmail,
        "address": order.address,
        "eik": order.eik,
        "paymentTerms": order.paymentTerms,
        "subtotal": order.subtotal,
        "vat": order.vat,
        "total": order.total,
    }

    pdf_bytes = generate_order_invoice_pdf(order_dict, items_data)
    if not pdf_bytes or len(pdf_bytes) == 0:
        raise HTTPException(status_code=500, detail="Грешка при генериране на фактурата")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Faktura_{order.id}.pdf"}
    )

# --- ЕНДПОЙНТ ЗА ИЗТЕГЛЯНЕ НА ЕКСПЕДИЦИОНЕН ЛИСТ (PDF) ---
@app.get("/api/orders/{order_id}/delivery-note")
def download_delivery_note(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Поръчката не е намерена")

    order_items = db.query(models.OrderItem).filter(models.OrderItem.order_id == order_id).all()
    items_data = []
    for it in order_items:
        prod = db.query(models.Product).filter(models.Product.id == it.product_id).first()
        items_data.append({
            "name": prod.name if prod else f"Артикул #{it.product_id}",
            "pack_details": f"Стек от {prod.unitsPerCase} бр." if prod else "",
            "ean": prod.barcode if prod else "N/A",
            "quantity": it.quantity_cases,
            "total_units": it.quantity_cases * (prod.unitsPerCase if prod else 24),
            "unit_price": it.case_price,
            "total_price": round(it.quantity_cases * it.case_price, 2)
        })

    order_dict = {
        "id": order.id,
        "storeName": order.storeName,
        "invoiceEmail": order.invoiceEmail,
        "address": order.address,
        "eik": order.eik,
        "paymentTerms": order.paymentTerms,
        "total": order.total,
    }

    pdf_bytes = generate_delivery_note_pdf(order_dict, items_data)
    if not pdf_bytes or len(pdf_bytes) == 0:
        raise HTTPException(status_code=500, detail="Грешка при генериране на експедиционния лист")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Ekspeditsionen_List_{order.id}.pdf"}
    )

class UpdateProductRequest(BaseModel):
    casePrice: Optional[float] = None
    rrpPrice: Optional[float] = None
    inStock: Optional[bool] = None
    supplierMinimum: Optional[float] = None
    hasTieredDiscount: Optional[bool] = None
    tier1Qty: Optional[int] = None
    tier1Discount: Optional[float] = None
    tier2Qty: Optional[int] = None
    tier2Discount: Optional[float] = None

@app.patch("/api/products/{product_id}")
def update_product(product_id: str, payload: UpdateProductRequest, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Продуктът не е намерен")

    if payload.casePrice is not None:
        product.casePrice = payload.casePrice
    if payload.rrpPrice is not None:
        product.rrpPrice = payload.rrpPrice
    if payload.supplierMinimum is not None:
        product.supplierMinimum = payload.supplierMinimum
    if payload.inStock is not None:
        product.inStock = payload.inStock
    if payload.hasTieredDiscount is not None:
        product.hasTieredDiscount = payload.hasTieredDiscount
    if payload.tier1Qty is not None:
        product.tier1Qty = payload.tier1Qty
    if payload.tier1Discount is not None:
        product.tier1Discount = payload.tier1Discount
    if payload.tier2Qty is not None:
        product.tier2Qty = payload.tier2Qty
    if payload.tier2Discount is not None:
        product.tier2Discount = payload.tier2Discount

    db.commit()
    db.refresh(product)
    return {"status": "success", "product": product}

@app.delete("/api/products/{product_id}")
def delete_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Продуктът не е намерен")
    db.delete(product)
    db.commit()
    return {"status": "success", "message": f"Продукт #{product_id} беше изтрит"}

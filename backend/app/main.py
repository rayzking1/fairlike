from sqlalchemy import func
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
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
from routers.auth import router as auth_router, get_current_user, get_optional_user

models.Base.metadata.create_all(bind=engine)

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

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
resend.api_key = RESEND_API_KEY

current_dir = os.path.dirname(os.path.abspath(__file__))
possible_template_paths = [
    os.path.join(current_dir, "templates"),
    os.path.join(current_dir, "..", "templates"),
    os.path.join(os.getcwd(), "templates"),
    os.path.join(os.getcwd(), "backend", "templates"),
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
    supplier_id: Optional[str] = None

    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    name: str
    category: str
    barcode: str
    supplierName: Optional[str] = None
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

class UpdateOrderStatusRequest(BaseModel):
    status: str

def generate_order_invoice_pdf(order: models.Order, items_data: list) -> bytes:
    issue_date = date.today()
    payment_term = order.paymentTerms or "net60"
    due_date = issue_date + timedelta(days=60 if payment_term == "net60" else (30 if payment_term == "net30" else 0))
    payment_label = "Net 60 дни" if payment_term == "net60" else ("Net 30 дни" if payment_term == "net30" else "Веднага (-2% отстъпка)")

    context = {
        "doc_type_label": "B2B Фактура / Проформа",
        "invoice_number": f"1000{order.id}",
        "issue_date": issue_date.strftime("%d.%m.%Y"),
        "tax_event_date": issue_date.strftime("%d.%m.%Y"),
        "payment_terms_label": payment_label,
        "due_date": due_date.strftime("%d.%m.%Y"),
        "supplier": {
            "name": order.supplier_name or "OPTOM.BG / Официален Дистрибутор",
            "eik": "206894123",
            "vat_number": "BG206894123",
            "address": "гр. София, бул. Цариградско шосе 115",
            "mol": "Димитър Петров",
            "iban": "BG80UNCR70001523984512",
            "bank_name": "УниКредит Булбанк"
        },
        "buyer": {
            "name": order.storeName,
            "eik": order.eik or "Не е посочен",
            "vat_number": f"BG{order.eik}" if order.eik else "Нерегистриран по ЗДДС",
            "address": order.address,
            "mol": order.storeName,
            "email": order.invoiceEmail
        },
        "items": items_data,
        "subtotal": order.subtotal,
        "discount_percent": 2.0 if payment_term == "immediate" else 0.0,
        "discount_amount": 0.0,
        "taxable_base": order.subtotal,
        "vat_rate": 20.0,
        "vat_amount": order.vat,
        "total_due": order.total
    }

    template = jinja_env.get_template("invoice_template.html")
    rendered_html = template.render(**context)
    pdf_io = io.BytesIO()
    HTML(string=rendered_html).write_pdf(pdf_io)
    return pdf_io.getvalue()

def send_order_confirmation_email(order_dict: dict, items_data: list):
    active_key = os.getenv("RESEND_API_KEY", "")
    if not active_key:
        return
    resend.api_key = active_key
    try:
        class DummyOrder:
            pass
        dummy = DummyOrder()
        for k, v in order_dict.items():
            setattr(dummy, k, v)
        pdf_bytes = generate_order_invoice_pdf(dummy, items_data)

        items_html = "".join([
            f"<tr><td style='padding: 8px; border-bottom: 1px solid #e2e8f0;'><strong>{it.get('name', 'Стек')}</strong></td>"
            f"<td style='padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;'>{it.get('quantity', 1)} бр.</td>"
            f"<td style='padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;'>{it.get('total_price', 0):.2f} лв.</td></tr>"
            for it in items_data
        ])

        html_content = f"""
        <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h2>Потвърждение за заявка #{order_dict['id']} ({order_dict.get('supplier_name', 'B2B')})</h2>
            <p>Обект: <strong>{order_dict['storeName']}</strong></p>
            <p>Адрес за доставка: {order_dict['address']}</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">{items_html}</table>
            <p style="font-size: 16px; font-weight: bold;">Общо с ДДС: {order_dict['total']:.2f} лв.</p>
        </div>
        """

        email_params = {
            "from": "OPTOM.BG <onboarding@resend.dev>",
            "to": [order_dict["invoiceEmail"]],
            "subject": f"Потвърждение за зареждане #{order_dict['id']} - OPTOM.BG",
            "html": html_content,
            "attachments": [{"filename": f"Faktura_{order_dict['id']}.pdf", "content": list(pdf_bytes)}] if pdf_bytes else []
        }
        resend.Emails.send(email_params)
    except Exception as e:
        print(f"Resend error: {e}")

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
def get_products(supplier_only: bool = False, current_user: Optional[models.User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    query = db.query(models.Product)
    if supplier_only and current_user and current_user.role == "supplier":
        query = query.filter((models.Product.supplier_id == current_user.id) | (models.Product.supplierName == current_user.company_name))
    return query.order_by(models.Product.name.asc()).all()

@app.post("/api/products", response_model=ProductSchema)
def add_product(item: ProductCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "supplier":
        raise HTTPException(status_code=403, detail="Само производители/доставчици могат да добавят артикули")

    new_product = models.Product(
        id=str(uuid.uuid4())[:8],
        name=item.name,
        category=item.category,
        barcode=item.barcode,
        supplierName=current_user.company_name or item.supplierName or "Официален Дистрибутор",
        supplierMinimum=item.supplierMinimum or 50.0,
        unitsPerCase=item.unitsPerCase,
        casePrice=item.casePrice,
        rrpPrice=item.rrpPrice,
        imageUrl=item.imageUrl or "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80",
        inStock=True,
        supplier_id=current_user.id
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@app.post("/api/products/import")
async def import_products(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "supplier":
        raise HTTPException(status_code=403, detail="Само производители могат да импортират ценови листи")

    contents = await file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Грешка при четене: {e}")

    df.columns = [str(col).strip().lower().replace(" ", "_") for col in df.columns]
    imported, updated = 0, 0

    for _, row in df.iterrows():
        bcode = str(row.get("barcode", "")).replace(".0", "").strip()
        if not bcode:
            continue
        prod = db.query(models.Product).filter(models.Product.barcode == bcode).first()
        if prod:
            prod.name = str(row.get("name", prod.name)).strip()
            prod.casePrice = float(row.get("case_price", prod.casePrice))
            prod.rrpPrice = float(row.get("rrp_price", prod.rrpPrice))
            prod.unitsPerCase = int(row.get("units_per_case", prod.unitsPerCase))
            updated += 1
        else:
            new_p = models.Product(
                id=str(uuid.uuid4())[:8],
                name=str(row.get("name", "Артикул")).strip(),
                category=str(row.get("category", "Храни")).strip(),
                barcode=bcode,
                supplierName=current_user.company_name,
                supplierMinimum=float(row.get("supplier_minimum", 50.0)),
                unitsPerCase=int(row.get("units_per_case", 24)),
                casePrice=float(row.get("case_price", 20.0)),
                rrpPrice=float(row.get("rrp_price", 25.0)),
                inStock=True,
                supplier_id=current_user.id
            )
            db.add(new_p)
            imported += 1
    db.commit()
    return {"status": "success", "imported": imported, "updated": updated}

@app.get("/api/orders")
def get_orders(current_user: Optional[models.User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    query = db.query(models.Order)
    if current_user:
        if current_user.role == "retailer":
            query = query.filter((models.Order.user_id == current_user.id) | (models.Order.invoiceEmail == current_user.email))
        elif current_user.role == "supplier":
            query = query.filter(models.Order.supplier_name == current_user.company_name)
    return query.order_by(models.Order.created_at.desc()).all()

@app.post("/api/orders")
def create_order(order_in: CreateOrderRequest, background_tasks: BackgroundTasks, current_user: Optional[models.User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    if current_user and order_in.paymentTerms in ["net30", "net60"]:
        limit = current_user.credit_limit or 3000.0
        used = current_user.used_credit or 0.0
        if (used + order_in.total) > limit:
            raise HTTPException(
                status_code=400,
                detail=f"Надвишен B2B кредитен лимит! Наличен: {(limit - used):.2f} лв."
            )
        current_user.used_credit = used + order_in.total

    vendor_buckets = {}
    for it in order_in.items:
        prod = db.query(models.Product).filter(models.Product.id == it.productId).first()
        supp_name = prod.supplierName if prod else "Официален Дистрибутор"
        if supp_name not in vendor_buckets:
            vendor_buckets[supp_name] = []
        vendor_buckets[supp_name].append((it, prod))

    created_ids = []

    for supp_name, bucket in vendor_buckets.items():
        sub = sum(it.quantityCases * it.casePrice for it, _ in bucket)
        disc = (sub * 0.02) if order_in.paymentTerms == "immediate" else 0.0
        base = sub - disc
        vat = base * 0.20
        total = base + vat

        order_id = str(uuid.uuid4())[:8].upper()
        db_order = models.Order(
            id=order_id,
            storeName=order_in.storeName,
            invoiceEmail=order_in.invoiceEmail,
            address=order_in.address,
            eik=order_in.eik,
            paymentTerms=order_in.paymentTerms,
            subtotal=round(base, 2),
            vat=round(vat, 2),
            total=round(total, 2),
            estimatedProfit=order_in.estimatedProfit,
            status="pending_delivery",
            user_id=current_user.id if current_user else None,
            supplier_name=supp_name
        )
        db.add(db_order)

        items_data = []
        for it, prod in bucket:
            db_item = models.OrderItem(
                order_id=order_id,
                product_id=it.productId,
                quantity_cases=it.quantityCases,
                case_price=it.casePrice
            )
            db.add(db_item)
            items_data.append({
                "name": prod.name if prod else f"Артикул #{it.productId}",
                "pack_details": f"Стек от {prod.unitsPerCase} бр." if prod else "",
                "ean": prod.barcode if prod else "N/A",
                "quantity": it.quantityCases,
                "unit": "стека",
                "unit_price": it.casePrice,
                "total_price": round(it.quantityCases * it.casePrice, 2)
            })

        created_ids.append(order_id)
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
            "supplier_name": supp_name
        }
        background_tasks.add_task(send_order_confirmation_email, order_dict, items_data)

    db.commit()
    return {"status": "success", "orderId": created_ids[0], "allOrderIds": created_ids}

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
            "unit": "стека",
            "unit_price": it.case_price,
            "total_price": round(it.quantity_cases * it.case_price, 2)
        })

    pdf_bytes = generate_order_invoice_pdf(order, items_data)
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=Faktura_{order.id}.pdf"})

class UpdateProductRequest(BaseModel):
    casePrice: Optional[float] = None
    rrpPrice: Optional[float] = None
    inStock: Optional[bool] = None
    supplierMinimum: Optional[float] = None

@app.patch("/api/products/{product_id}")
def update_product(product_id: str, payload: UpdateProductRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Продуктът не е намерен")
    if product.supplier_id and product.supplier_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нямате права да редактирате артикул на друг производител")

    if payload.casePrice is not None:
        product.casePrice = payload.casePrice
    if payload.rrpPrice is not None:
        product.rrpPrice = payload.rrpPrice
    if payload.inStock is not None:
        product.inStock = payload.inStock
    if payload.supplierMinimum is not None:
        product.supplierMinimum = payload.supplierMinimum

    db.commit()
    db.refresh(product)
    return {"status": "success", "product": product}

@app.delete("/api/products/{product_id}")
def delete_product(product_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Продуктът не е намерен")
    if product.supplier_id and product.supplier_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нямате права да изтриете артикул на друг производител")

    db.delete(product)
    db.commit()
    return {"status": "success", "message": f"Продукт #{product_id} беше успешно изтрит"}

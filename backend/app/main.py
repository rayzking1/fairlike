from sqlalchemy import func, text
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import uuid
import os
import io
import pandas as pd
from weasyprint import HTML
from jinja2 import Environment, FileSystemLoader

templates_dir = os.path.join(os.path.dirname(__file__), "templates")
jinja_env = Environment(loader=FileSystemLoader(templates_dir))


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

import resend

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


@app.post("/api/products/import")
async def import_products_excel(
    file: UploadFile = File(...),
    current_user: Optional[models.User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if not current_user or current_user.role != "supplier":
        raise HTTPException(status_code=403, detail="Само регистрирани доставчици могат да качват ценоразписи.")
    
    contents = await file.read()
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Грешка при четене на файла: {str(e)}")

    imported_count = 0
    for _, row in df.iterrows():
        name = str(row.get("name") or row.get("Име на артикул") or "").strip()
        if not name:
            continue
        
        barcode = str(row.get("barcode") or row.get("Баркод") or f"3800{imported_count}").strip()
        case_price = float(row.get("case_price") or row.get("Цена на стек (лв)") or 20.0)
        rrp_price = float(row.get("rrp_price") or row.get("Препоръчителна цена за 1бр (лв)") or 2.5)
        units_per_case = int(row.get("units_per_case") or row.get("Брой в стек") or 24)
        category = str(row.get("category") or row.get("Категория") or "Безалкохолни & Води").strip()
        image_url = str(row.get("imageUrl") or row.get("image_url") or row.get("Линк към снимка") or "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80").strip()

        existing = db.query(models.Product).filter(models.Product.barcode == barcode).first()
        if existing:
            existing.name = name
            existing.casePrice = case_price
            existing.rrpPrice = rrp_price
            existing.unitsPerCase = units_per_case
            existing.category = category
            existing.supplierName = current_user.company_name
            existing.supplier_id = current_user.id
            existing.imageUrl = image_url
        else:
            new_prod = models.Product(
                id=str(uuid.uuid4())[:8],
                name=name,
                barcode=barcode,
                casePrice=case_price,
                rrpPrice=rrp_price,
                unitsPerCase=units_per_case,
                category=category,
                supplierName=current_user.company_name,
                supplier_id=current_user.id,
                imageUrl=image_url,
                supplierMinimum=50.0,
                hasTieredDiscount=True,
                tier1Qty=5,
                tier1Discount=5.0,
                tier2Qty=10,
                tier2Discount=10.0
            )
            db.add(new_prod)
        imported_count += 1

    db.commit()

# --- ДОБАВЕНИ ЛИПСВАЩИ ЕНДПОИНТИ И ИМПОРТИ ---
from fastapi import Response
from datetime import date, timedelta

@app.post("/api/products")
def add_product(payload: dict, current_user: Optional[models.User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    if not current_user or current_user.role != "supplier":
        raise HTTPException(status_code=403, detail="Нямате права.")
    
    new_prod = models.Product(
        id=str(uuid.uuid4())[:8],
        name=payload.get("name"),
        barcode=payload.get("barcode"),
        casePrice=payload.get("casePrice", 0),
        rrpPrice=payload.get("rrpPrice", 0),
        unitsPerCase=payload.get("unitsPerCase", 1),
        category=payload.get("category", "Други"),
        supplierName=current_user.company_name,
        supplier_id=current_user.id,
        imageUrl=payload.get("imageUrl", ""),
        supplierMinimum=payload.get("supplierMinimum", 50.0),
        hasTieredDiscount=payload.get("hasTieredDiscount", True),
        tier1Qty=payload.get("tier1Qty", 5),
        tier1Discount=payload.get("tier1Discount", 5.0),
        tier2Qty=payload.get("tier2Qty", 10),
        tier2Discount=payload.get("tier2Discount", 10.0)
    )
    db.add(new_prod)
    db.commit()
    return {"status": "success"}

@app.patch("/api/products/{product_id}")
def update_product(product_id: str, payload: dict, current_user: Optional[models.User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    prod = db.query(models.Product).filter(models.Product.id == product_id).first()
    if prod:
        for key, value in payload.items():
            if hasattr(prod, key):
                setattr(prod, key, value)
        db.commit()
    return {"status": "success"}

@app.delete("/api/products/{product_id}")
def delete_product(product_id: str, current_user: Optional[models.User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    prod = db.query(models.Product).filter(models.Product.id == product_id).first()
    if prod:
        db.delete(prod)
        db.commit()
    return {"status": "success"}

@app.patch("/api/orders/{order_id}/status")
def update_order_status(order_id: str, payload: dict, current_user: Optional[models.User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if order and "status" in payload:
        order.status = payload["status"]
        db.commit()
    return {"status": "success"}

@app.get("/api/orders/{order_id}/invoice")
def get_order_invoice(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    items_data = []
    for it in order.items:
        prod = db.query(models.Product).filter(models.Product.id == it.product_id).first()
        items_data.append({
            "name": prod.name if prod else "Артикул",
            "quantity": it.quantity_cases,
            "unit_price": it.case_price,
            "total_price": it.quantity_cases * it.case_price,
            "ean": prod.barcode if prod else "",
            "pack_details": f"Стек {prod.unitsPerCase} бр." if prod else ""
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
        "total": order.total
    }
    
    pdf_bytes = generate_order_invoice_pdf(order_dict, items_data)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Invoice_{order.id}.pdf"'}
    )

@app.get("/api/orders/{order_id}/delivery-note")
def get_order_delivery_note(order_id: str, db: Session = Depends(get_db)):
    return get_order_invoice(order_id, db)

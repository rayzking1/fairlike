from sqlalchemy import func
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, timedelta
from jinja2 import Environment, FileSystemLoader
import pandas as pd
import uuid
import os
import io
import resend

import models
from database import engine, get_db, SessionLocal
from routers.invoices import router as invoices_router
from routers.auth import router as auth_router

models.Base.metadata.create_all(bind=engine)

# Вземане на ключа от средата или дефинирания тестов
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
resend.api_key = RESEND_API_KEY

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

class UpdateOrderStatusRequest(BaseModel):
    status: str

def generate_order_invoice_pdf(order_dict: dict, items_data: list) -> bytes:
    try:
        from weasyprint import HTML
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
        print(f"⚠️ Грешка при WeasyPrint PDF генериране: {e}")
        return b""

def trigger_direct_email(order_dict: dict, items_data: list):
    active_key = os.getenv("RESEND_API_KEY", "")
    if not active_key:
        print("⚠️ Липсва RESEND_API_KEY!")
        return

    resend.api_key = active_key
    target_recipient = "ivanoff.miro@gmail.com"

    # Изграждане на редовете с артикули за красив имейл
    items_html = "".join([
        f"<tr>"
        f"<td style='padding: 8px; border-bottom: 1px solid #e2e8f0;'><strong>{it.get('name', 'Стек')}</strong> ({it.get('pack_details', '')})</td>"
        f"<td style='padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;'>{it.get('quantity', 1)} бр.</td>"
        f"<td style='padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;'>{it.get('total_price', 0):.2f} лв.</td>"
        f"</tr>"
        for it in items_data
    ])

    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px;">OPTOM<span style="color: #059669;">.BG</span></h1>
            <span style="background: #ecfdf5; color: #065f46; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 6px;">Потвърдена B2B Заявка</span>
        </div>

        <h2 style="font-size: 16px; margin-top: 0;">Здравейте, {order_dict['storeName']}!</h2>
        <p style="font-size: 13px; color: #475569; line-height: 1.5;">Вашата поръчка с номер <strong>#{order_dict['id']}</strong> беше приета успешно в системата.</p>

        <div style="background-color: #f8fafc; padding: 14px; border-radius: 10px; margin: 16px 0; border: 1px solid #e2e8f0; font-size: 12px;">
            <p style="margin: 4px 0;"><strong>Обект:</strong> {order_dict['storeName']} (ЕИК: {order_dict.get('eik') or '206894123'})</p>
            <p style="margin: 4px 0;"><strong>Адрес за доставка:</strong> {order_dict['address']}</p>
            <p style="margin: 4px 0;"><strong>Условия на плащане:</strong> {order_dict.get('paymentTerms', 'Net 60 дни')}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin: 16px 0;">
            <thead>
                <tr style="background: #f1f5f9; text-align: left; font-size: 11px; text-transform: uppercase;">
                    <th style="padding: 8px;">Артикул</th>
                    <th style="padding: 8px; text-align: center;">Стекове</th>
                    <th style="padding: 8px; text-align: right;">Сума</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
            </tbody>
        </table>

        <div style="text-align: right; padding: 12px 0; border-top: 2px solid #f1f5f9; font-size: 13px;">
            <p style="margin: 2px 0; color: #64748b;">Данъчна основа: <strong>{order_dict['subtotal']:.2f} лв.</strong></p>
            <p style="margin: 2px 0; color: #64748b;">ДДС (20%): <strong>{order_dict['vat']:.2f} лв.</strong></p>
            <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 900; color: #0f172a;">Общо с ДДС: {order_dict['total']:.2f} лв.</p>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">OPTOM.BG &bull; Платформа за презареждане на търговски обекти</p>
    </div>
    """

    email_params = {
        "from": "OPTOM.BG <onboarding@resend.dev>",
        "to": [target_recipient],
        "subject": f"Потвърждение за зареждане #{order_dict['id']} - OPTOM.BG",
        "html": html_content
    }

    # Опит за добавяне на PDF фактурата
    pdf_bytes = generate_order_invoice_pdf(order_dict, items_data)
    if pdf_bytes and len(pdf_bytes) > 100:
        email_params["attachments"] = [{
            "filename": f"Faktura_{order_dict['id']}.pdf",
            "content": list(pdf_bytes)
        }]

    try:
        response = resend.Emails.send(email_params)
        print(f"🚀 УСПЕШНО ИЗПРАТЕН ИМЕЙЛ ПРЕЗ RESEND: {response}")
    except Exception as e:
        print(f"❌ Resend API грешка: {str(e)}")

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
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@app.get("/api/orders")
def get_orders(email: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Order)
    if email:
        query = query.filter(models.Order.invoiceEmail == email)
    return query.order_by(models.Order.created_at.desc()).all()

@app.post("/api/orders")
def create_order(order_in: CreateOrderRequest, db: Session = Depends(get_db)):
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

    # Директно изпращане
    trigger_direct_email(order_dict, items_data)

    return {
        "status": "success",
        "orderId": order_id,
        "message": "Поръчката е приета и имейлът с фактурата е изпратен."
    }

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
    pdf_stream = io.BytesIO(pdf_bytes)

    return StreamingResponse(
        pdf_stream,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Faktura_{order.id}.pdf"}
    )

@app.patch("/api/orders/{order_id}/status")
def update_order_status(order_id: str, payload: UpdateOrderStatusRequest, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Поръчката не е намерена")
    order.status = payload.status
    db.commit()
    return {"status": "success", "orderId": order_id, "newStatus": payload.status}

class UpdateProductRequest(BaseModel):
    casePrice: Optional[float] = None
    rrpPrice: Optional[float] = None
    inStock: Optional[bool] = None
    supplierMinimum: Optional[float] = None

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

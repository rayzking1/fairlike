from fastapi import APIRouter, HTTPException, Response
from datetime import date, timedelta
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
import io
import os

from schemas.invoice import InvoiceRequest, PaymentTermEnum

router = APIRouter(prefix="/api/v1/invoices", tags=["Invoices"])

# Зареждане на Jinja2 шаблона от директорията templates
templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
jinja_env = Environment(loader=FileSystemLoader(templates_dir))

@router.post("/generate-pdf")
async def generate_invoice_pdf(payload: InvoiceRequest):
    try:
        # Изчисляване на суми
        subtotal = sum(item.quantity * item.unit_price for item in payload.items)
        discount_percent = 2.0 if payload.payment_terms == PaymentTermEnum.IMMEDIATE else 0.0
        discount_amount = round(subtotal * (discount_percent / 100.0), 2)
        taxable_base = round(subtotal - discount_amount, 2)
        vat_amount = round(taxable_base * (payload.vat_rate / 100.0), 2)
        total_due = round(taxable_base + vat_amount, 2)

        # Логика за B2B падежни срокове
        if payload.payment_terms == PaymentTermEnum.NET_60:
            due_date = payload.issue_date + timedelta(days=60)
            payment_terms_label = "Net 60 дни"
            doc_type_label = "B2B Фактура / Проформа"
        elif payload.payment_terms == PaymentTermEnum.NET_30:
            due_date = payload.issue_date + timedelta(days=30)
            payment_terms_label = "Net 30 дни"
            doc_type_label = "B2B Фактура / Проформа"
        else:
            due_date = payload.issue_date
            payment_terms_label = "Веднага (-2% отстъпка)"
            doc_type_label = "B2B ДДС Фактура - Оригинал"

        template_items = [
            {
                "name": it.name,
                "pack_details": it.pack_details,
                "ean": it.ean,
                "quantity": it.quantity,
                "unit": it.unit,
                "unit_price": it.unit_price,
                "total_price": round(it.quantity * it.unit_price, 2)
            }
            for it in payload.items
        ]

        context = {
            "doc_type_label": doc_type_label,
            "invoice_number": payload.invoice_number,
            "issue_date": payload.issue_date.strftime("%d.%m.%Y"),
            "tax_event_date": payload.issue_date.strftime("%d.%m.%Y"),
            "payment_terms_label": payment_terms_label,
            "due_date": due_date.strftime("%d.%m.%Y"),
            "supplier": payload.supplier.model_dump(),
            "buyer": payload.buyer.model_dump(),
            "items": template_items,
            "subtotal": subtotal,
            "discount_percent": discount_percent,
            "discount_amount": discount_amount,
            "taxable_base": taxable_base,
            "vat_rate": payload.vat_rate,
            "vat_amount": vat_amount,
            "total_due": total_due
        }

        template = jinja_env.get_template("invoice_template.html")
        rendered_html = template.render(**context)

        pdf_io = io.BytesIO()
        HTML(string=rendered_html).write_pdf(pdf_io)
        pdf_bytes = pdf_io.getvalue()

        filename = f"Invoice_{payload.invoice_number}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{filename}"'}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Грешка при генериране на фактура: {str(e)}")

from datetime import date
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class PaymentTermEnum(str, Enum):
    IMMEDIATE = "immediate"
    NET_30 = "net_30"
    NET_60 = "net_60"

class CompanyDetails(BaseModel):
    name: str
    eik: str
    vat_number: str
    address: str
    mol: str
    iban: Optional[str] = None
    bic: Optional[str] = None
    bank_name: Optional[str] = None
    email: Optional[str] = None

class InvoiceItem(BaseModel):
    name: str
    pack_details: Optional[str] = None
    ean: str
    quantity: int
    unit: str = "стека"
    unit_price: float

class InvoiceRequest(BaseModel):
    invoice_number: str
    issue_date: date = Field(default_factory=date.today)
    payment_terms: PaymentTermEnum = PaymentTermEnum.NET_60
    supplier: CompanyDetails
    buyer: CompanyDetails
    items: List[InvoiceItem]
    vat_rate: float = 20.0

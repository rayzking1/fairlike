from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from database import Base

def generate_uuid():
    return str(uuid.uuid4())[:8]

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    company_name = Column(String, nullable=False)
    eik = Column(String, nullable=False)
    address = Column(String, nullable=False)
    mol = Column(String, nullable=False)
    role = Column(String, default="retailer")
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="owner")
    orders = relationship("Order", back_populates="user")

class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)
    barcode = Column(String, unique=True, index=True, nullable=False)
    supplierName = Column("supplier_name", String, nullable=False)
    supplierMinimum = Column("supplier_minimum", Float, default=50.0)
    unitsPerCase = Column("units_per_case", Integer, nullable=False)
    casePrice = Column("case_price", Float, nullable=False)
    rrpPrice = Column("rrp_price", Float, nullable=False)
    imageUrl = Column("image_url", Text, default="https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80")
    inStock = Column("in_stock", Boolean, default=True)
    
    # Персонализирани обемни отстъпки от доставчика
    hasTieredDiscount = Column("has_tiered_discount", Boolean, default=True)
    tier1Qty = Column("tier1_qty", Integer, default=5)
    tier1Discount = Column("tier1_discount", Float, default=5.0)
    tier2Qty = Column("tier2_qty", Integer, default=10)
    tier2Discount = Column("tier2_discount", Float, default=10.0)

    supplier_id = Column(String, ForeignKey("users.id"), nullable=True)
    owner = relationship("User", back_populates="products")

class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=lambda: generate_uuid().upper())
    storeName = Column("store_name", String, nullable=False)
    invoiceEmail = Column("invoice_email", String, nullable=False)
    address = Column(String, nullable=False)
    eik = Column(String, default="")
    paymentTerms = Column("payment_terms", String, default="net60")
    subtotal = Column(Float, nullable=False)
    vat = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    estimatedProfit = Column("estimated_profit", Float, default=0.0)
    status = Column(String, default="pending_delivery")
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    product_id = Column(String, nullable=False)
    quantity_cases = Column(Integer, nullable=False)
    case_price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")

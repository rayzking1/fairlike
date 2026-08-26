from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import models
from database import engine, get_db, SessionLocal
from routers.invoices import router as invoices_router
from routers.auth import router as auth_router, get_optional_user

models.Base.metadata.create_all(bind=engine)

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

@app.get("/")
def root():
    return {"message": "OPTOM.BG Database API is running", "docs": "/docs"}

@app.get("/api/products")
def get_products(db: Session = Depends(get_db)):
    return db.query(models.Product).order_by(models.Product.name.asc()).all()

@app.get("/api/products/search")
def search_products(q: str = "", db: Session = Depends(get_db)):
    if not q or len(q.strip()) == 0:
        return []
    search_term = f"%{q.strip().lower()}%"
    return db.query(models.Product).filter(
        models.Product.name.ilike(search_term) |
        models.Product.barcode.ilike(search_term) |
        models.Product.supplierName.ilike(search_term) |
        models.Product.category.ilike(search_term)
    ).limit(10).all()

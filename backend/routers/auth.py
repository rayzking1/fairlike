from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr
import bcrypt
import uuid
import os

from database import get_db
import models
from schemas.auth import UserRegister, UserLogin, UserOut, TokenResponse, UserRole

router = APIRouter(prefix="/api/auth", tags=["Auth"])

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "OPTOM_B2B_SUPER_SECRET_PRODUCTION_KEY_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 дни валидност на сесията

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security), db: Session = Depends(get_db)) -> Optional[models.User]:
    if not credentials:
        return None
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            return None
        return db.query(models.User).filter(models.User.id == user_id).first()
    except Exception:
        return None

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security), db: Session = Depends(get_db)) -> models.User:
    user = get_optional_user(credentials, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалиден или липсващ токен за достъп",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

class GoogleAuthRequest(BaseModel):
    email: EmailStr
    company_name: str
    role: str
    eik: Optional[str] = "206894123"
    mol: Optional[str] = "Управител"
    address: Optional[str] = "гр. София"

@router.post("/google", response_model=TokenResponse)
def auth_google(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Реално създаване или влизане през Google директно в базата данни"""
    user = db.query(models.User).filter(models.User.email == payload.email.lower()).first()
    if not user:
        user = models.User(
            id=str(uuid.uuid4())[:8],
            email=payload.email.lower(),
            hashed_password=hash_password(str(uuid.uuid4())),
            company_name=payload.company_name,
            eik=payload.eik or "206894123",
            address=payload.address or "гр. София",
            mol=payload.mol or "Управител",
            role=payload.role
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "company_name": user.company_name,
            "eik": user.eik,
            "address": user.address,
            "mol": user.mol,
            "role": user.role
        }
    }

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Вече съществува профил с този имейл адрес")

    new_user = models.User(
        id=str(uuid.uuid4())[:8],
        email=user_in.email.lower(),
        hashed_password=hash_password(user_in.password),
        company_name=user_in.company_name,
        eik=user_in.eik,
        address=user_in.address,
        mol=user_in.mol,
        role=user_in.role.value
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": new_user.id, "role": new_user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "company_name": new_user.company_name,
            "eik": new_user.eik,
            "address": new_user.address,
            "mol": new_user.mol,
            "role": new_user.role
        }
    }

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email.lower()).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Грешен имейл адрес или парола"
        )

    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "company_name": user.company_name,
            "eik": user.eik,
            "address": user.address,
            "mol": user.mol,
            "role": user.role
        }
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Връща актуалния профил от базата данни при зареждане на сайта"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "company_name": current_user.company_name,
        "eik": current_user.eik,
        "address": current_user.address,
        "mol": current_user.mol,
        "role": current_user.role
    }

@router.get("/validate-eik/{eik}")
def validate_eik(eik: str):
    if len(eik) in (9, 13) and eik.isdigit():
        return {"valid": True, "message": "ЕИК е валиден"}
    return {"valid": False, "message": "Невалиден формат на ЕИК"}

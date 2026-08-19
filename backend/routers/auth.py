from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import List
import uuid

from schemas.auth import UserRegister, UserLogin, UserOut, TokenResponse, UserRole

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# Настройки за сигурност
SECRET_KEY = "OPTOM_B2B_SECRET_KEY_CHANGE_IN_PRODUCTION"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 дни валидност

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Вградена база данни за потребители (в паметта до добавяне на PostgreSQL)
USERS_DB = []

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Невалиден или изтекъл токен за достъп",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = next((u for u in USERS_DB if u["id"] == user_id), None)
    if user is None:
        raise credentials_exception
    return user

def require_role(allowed_role: UserRole):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] != allowed_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нямате права за достъп до този ресурс"
            )
        return current_user
    return role_checker


@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegister):
    # Проверка дали имейлът вече съществува
    if any(u["email"] == user_in.email for u in USERS_DB):
        raise HTTPException(status_code=400, detail="Вече съществува профил с този имейл адрес")

    user_id = str(uuid.uuid4())[:8]
    user_dict = {
        "id": user_id,
        "email": user_in.email,
        "hashed_password": hash_password(user_in.password),
        "company_name": user_in.company_name,
        "eik": user_in.eik,
        "address": user_in.address,
        "mol": user_in.mol,
        "role": user_in.role
    }
    USERS_DB.append(user_dict)

    token = create_access_token({"sub": user_id, "role": user_in.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_dict
    }


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin):
    user = next((u for u in USERS_DB if u["email"] == credentials.email), None)
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Грешен имейл адрес или парола"
        )

    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UserOut)
def get_me(current_user: dict = Depends(get_current_user)):
    """Връща текущо логнатия профил (за Next.js сесията)"""
    return current_user

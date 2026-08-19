from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    RETAILER = "retailer"
    SUPPLIER = "supplier"

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    company_name: str
    eik: str
    address: str
    mol: str
    role: UserRole = UserRole.RETAILER

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: EmailStr
    company_name: str
    eik: str
    address: str
    mol: str
    role: UserRole

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional, Union, Any
from beanie import PydanticObjectId
from app.schemas.base import PyObjectId
from datetime import datetime
import re

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str  # admin, teacher, student
    semester: Optional[int] = None  # For students
    degree_type: Optional[str] = None  # For students
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v
    
    @field_validator('semester')
    @classmethod
    def validate_semester(cls, v):
        if v is not None and (v < 1 or v > 8):
            raise ValueError('Semester must be between 1 and 8')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str


# Response models
class UserResponse(BaseModel):

    id: PyObjectId
    email: str
    full_name: str
    role: str
    avatar: Optional[str] = None
    semester: Optional[int] = None
    degree_type: Optional[str] = None
    competency_score: Optional[int] = None
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    semester: Optional[int] = None
    degree_type: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class GoogleAuthRequest(BaseModel):
    credential: str # ID Token

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v

from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
import hashlib
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def _hash_password(password: str) -> str:
    """Pre-hash with SHA256 to avoid bcrypt's 72-byte limit"""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(_hash_password(plain_password), hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(_hash_password(password))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Only set type to access if not already specified (e.g. for verification tokens)
    if "type" not in to_encode:
        to_encode.update({"type": "access"})
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

from beanie import PydanticObjectId

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    try:
        user = await User.get(PydanticObjectId(user_id))
    except:
        user = None

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user

def require_role(allowed_roles: list):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        print(f"[DEBUG] ROLE CHECK: User={current_user.email}, Role={current_user.role}, Type={type(current_user.role)}")
        user_role = str(current_user.role).lower()
        print(f"[DEBUG] ROLE CHECK: Converted Role='{user_role}' vs Allowed={allowed_roles}")
        
        # Handle Enum string representation issues
        if "userrole." in user_role:
             user_role = user_role.split(".")[-1]
             print(f"[DEBUG] ROLE CHECK: Fixed Enum Role='{user_role}'")

        if user_role not in [role.lower() for role in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

# Role dependencies
def get_admin_user(current_user: User = Depends(require_role(["admin"]))) -> User:
    return current_user

def get_teacher_user(current_user: User = Depends(require_role(["admin", "teacher"]))) -> User:
    return current_user

def get_student_user(current_user: User = Depends(require_role(["admin", "teacher", "student"]))) -> User:
    return current_user

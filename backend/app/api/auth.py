from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, datetime
from typing import Any, Dict

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, verify_password, get_password_hash, get_current_user, decode_token
from app.models.user import User, UserRole
from app.models.analytics import UserAnalytics
from app.schemas.user import (
    UserCreate, UserResponse, TokenResponse, GoogleAuthRequest, 
    RefreshTokenRequest, UserLogin, UserUpdate,
    PasswordResetRequest, PasswordResetConfirm
)
from app.services.email import email_service
import httpx
import secrets

router = APIRouter()

def create_verification_token(email: str) -> str:
    return create_access_token(
        data={"sub": email, "type": "verification"},
        expires_delta=timedelta(hours=24)
    )

def create_reset_token(email: str) -> str:
    return create_access_token(
        data={"sub": email, "type": "reset"},
        expires_delta=timedelta(hours=1)
    )

@router.post("/signup")
async def signup(user_data: UserCreate):
    # Check if user exists
    user = await User.find_one(User.email == user_data.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        role=user_data.role,
        semester=user_data.semester,
        degree_type=user_data.degree_type,
        is_active=True,
        is_verified=True  # Auto-verify for simplified auth
    )
    
    # Save user
    await new_user.create()
    
    # Initialize analytics
    analytics = UserAnalytics(user_id=new_user.id)
    await analytics.create()
    
    return {
        "message": "Registration successful. You can now log in."
    }

@router.post("/verify-email")
async def verify_email(token_data: RefreshTokenRequest): # Reuse schema or create new one? Using RefreshTokenRequest for simple {refresh_token: str} wrapper is hacky but works. Better to use dict or correct schema.
    # Using RefreshTokenRequest where field is 'refresh_token' is confusing. Let's assume it's passed as query param or body.
    # Let's switch to query param for GET link usually, but frontend might POST.
    # Let's clean this up.
    pass

@router.get("/verify-email")
async def verify_email_link(token: str):
    payload = decode_token(token)
    if not payload or payload.get("type") != "verification":
        raise HTTPException(status_code=400, detail="Invalid token")
        
    email = payload.get("sub")
    user = await User.find_one(User.email == email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.is_verified:
        return {"message": "Email already verified"}
        
    user.is_verified = True
    await user.save()
    
    return {"message": "Email verified successfully"}

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    # Find user
    user = await User.find_one(User.email == credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not user.hashed_password: # OAuth users might not have password
        raise HTTPException(status_code=400, detail="Please login with Google")
        
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if active
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    # Generate tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "role": user.role}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/google", response_model=TokenResponse)
async def google_login(auth_data: GoogleAuthRequest):
    # Verify token with Google
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={auth_data.credential}")
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Google token")
            
            google_data = response.json()
            
            # Check audience
            if settings.GOOGLE_CLIENT_ID and google_data.get("aud") != settings.GOOGLE_CLIENT_ID:
                 raise HTTPException(status_code=400, detail="Invalid token audience")
                 
            email = google_data.get("email")
            if not email:
                raise HTTPException(status_code=400, detail="Google account has no email")
                
            # Find or create user
            user = await User.find_one(User.email == email)
            if not user:
                # Create user
                user = User(
                    email=email,
                    full_name=google_data.get("name", "Unknown"),
                    role=UserRole.student, # Default to student for Google Auth
                    google_id=google_data.get("sub"),
                    avatar=google_data.get("picture"),
                    is_verified=True # Google emails are verified
                )
                await user.create()
                
                # Init analytics
                analytics = UserAnalytics(user_id=user.id)
                await analytics.create()
            else:
                # Update info if needed
                if not user.google_id:
                    user.google_id = google_data.get("sub")
                    if not user.is_verified:
                        user.is_verified = True
                    await user.save()
            
            # Generate tokens
            access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": str(user.id), "role": user.role},
                expires_delta=access_token_expires
            )
            refresh_token = create_refresh_token(
                data={"sub": str(user.id), "role": user.role}
            )
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "user": user
            }
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Detailed Google login error: {e}")
        # Return the actual error to the frontend for diagnosis
        raise HTTPException(status_code=400, detail=f"Google auth failed: {str(e)}")

@router.post("/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    user = await User.find_one(User.email == request.email)
    if not user:
        # Don't reveal user existence? Security best practice says generic message. 
        # But for this proj, maybe useful. Let's just say sent.
        return {"message": "If email exists, reset link sent"}
        
    token = create_reset_token(user.email)
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    
    email_content = f"""
    <h1>Reset Password</h1>
    <p>Click the link below to reset your password:</p>
    <a href="{reset_url}">Reset Password</a>
    <p>Link expires in 1 hour.</p>
    """
    
    email_service.send_email(user.email, "Password Reset Request", email_content)
    return {"message": "Password reset email sent"}

@router.post("/reset-password")
async def reset_password(data: PasswordResetConfirm):
    payload = decode_token(data.token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    email = payload.get("sub")
    user = await User.find_one(User.email == email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.hashed_password = get_password_hash(data.new_password)
    await user.save()
    
    return {"message": "Password updated successfully"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token_endpoint(token_data: RefreshTokenRequest):
    payload = decode_token(token_data.refresh_token)
    if not payload or payload.get("type") != "refresh":
         raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("sub")
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id), "role": user.role})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

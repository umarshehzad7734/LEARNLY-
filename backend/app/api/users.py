from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Optional
from pathlib import Path
import os
import shutil

from app.core.security import get_current_user, get_admin_user, get_password_hash
from app.models.user import User
from beanie import PydanticObjectId
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter()

@router.patch("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile info"""
    if user_data.full_name is not None:
        current_user.full_name = user_data.full_name
        
    if user_data.email is not None and user_data.email.lower() != current_user.email.lower():
        # Check if email is available
        existing = await User.find_one(User.email == user_data.email.lower())
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        current_user.email = user_data.email.lower()
        
    if user_data.password is not None and user_data.password.strip():
        current_user.hashed_password = get_password_hash(user_data.password)
        
    if user_data.semester is not None:
        current_user.semester = user_data.semester
        
    if user_data.degree_type is not None:
        current_user.degree_type = user_data.degree_type
    
    await current_user.save()
    return current_user

@router.get("/", response_model=List[UserResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    role: str = None,
    current_user: User = Depends(get_admin_user)
):
    """Get all users (Admin only)"""
    query = User.find_all()
    
    if role:
        query = User.find(User.role == role)
    
    return await query.skip(skip).limit(limit).to_list()

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: PydanticObjectId,
    current_user: User = Depends(get_current_user)
):
    """Get user by ID"""
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user"
        )
    
    user = await User.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.patch("/{user_id}/activate")
async def activate_user(
    user_id: PydanticObjectId,
    current_user: User = Depends(get_admin_user)
):
    """Activate user (Admin only)"""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = True
    await user.save()
    
    return {"message": "User activated successfully"}

@router.patch("/{user_id}/deactivate")
async def deactivate_user(
    user_id: PydanticObjectId,
    current_user: User = Depends(get_admin_user)
):
    """Deactivate user (Admin only)"""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = False
    await user.save()
    
    return {"message": "User deactivated successfully"}

@router.delete("/delete-avatar")
async def delete_avatar(
    current_user: User = Depends(get_current_user)
):
    """Delete profile picture for current user"""
    if not current_user.avatar:
        raise HTTPException(status_code=404, detail="No avatar to delete")
    
    # Delete file if exists
    if os.path.exists(current_user.avatar):
        try:
            os.remove(current_user.avatar)
        except:
            pass
    
    # Clear avatar path
    current_user.avatar = None
    await current_user.save()
    
    return {"message": "Avatar deleted successfully"}

@router.delete("/{user_id}")
async def delete_user(
    user_id: PydanticObjectId,
    current_user: User = Depends(get_admin_user)
):
    """Delete user (Admin only)"""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check dependencies (e.g. created courses) if needed?
    # For now just delete
    await user.delete()
    return {"message": "User deleted successfully"}

@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload profile picture for current user"""
    # Validate file type
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_ext} not allowed. Allowed: {allowed_extensions}"
        )
    
    # Create avatars directory
    avatars_dir = Path("uploads") / "avatars"
    avatars_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file with user ID
    file_path = avatars_dir / f"user_{current_user.id}{file_ext}"
    
    # Delete old avatar if exists
    if current_user.avatar and os.path.exists(current_user.avatar):
        try:
            os.remove(current_user.avatar)
        except:
            pass
    
    # Save new file
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    # Update user avatar path
    current_user.avatar = str(file_path)
    await current_user.save()
    
    return {
        "message": "Avatar uploaded successfully",
        "avatar_url": f"/uploads/avatars/user_{current_user.id}{file_ext}"
    }



@router.get("/stats/count")
async def get_user_stats(
    current_user: User = Depends(get_admin_user)
):
    """Get user statistics (Admin only)"""
    total_users = await User.find_all().count()
    admins = await User.find(User.role == "admin").count()
    teachers = await User.find(User.role == "teacher").count()
    students = await User.find(User.role == "student").count()
    active_users = await User.find(User.is_active == True).count()
    
    return {
        "total_users": total_users,
        "admins": admins,
        "teachers": teachers,
        "students": students,
        "active_users": active_users
    }

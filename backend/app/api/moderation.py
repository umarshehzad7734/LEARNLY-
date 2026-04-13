from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.core.security import get_admin_user
from app.models.user import User
from beanie import PydanticObjectId
from app.models.moderation import ModerationSettings, ModerationLog
from app.schemas.moderation import (
    ModerationSettingsCreate,
    ModerationSettingsUpdate,
    ModerationSettingsResponse,
    ModerationLogResponse
)

router = APIRouter()

@router.post("/settings", response_model=ModerationSettingsResponse)
async def create_moderation_settings(
    settings_data: ModerationSettingsCreate,
    current_user: User = Depends(get_admin_user)
):
    """Create moderation settings (Admin only)"""
    # Check if settings for category already exist
    existing = await ModerationSettings.find_one(
        ModerationSettings.category == settings_data.category
    )
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Settings for this category already exist"
        )
    
    settings = ModerationSettings(
        category=settings_data.category,
        threshold=settings_data.threshold,
        is_enabled=settings_data.is_enabled
    )
    
    await settings.create()
    
    return settings

@router.get("/settings", response_model=List[ModerationSettingsResponse])
async def get_moderation_settings(
    current_user: User = Depends(get_admin_user)
):
    """Get all moderation settings (Admin only)"""
    settings = await ModerationSettings.find_all().to_list()
    return settings

@router.patch("/settings/{category}", response_model=ModerationSettingsResponse)
async def update_moderation_settings(
    category: str,
    settings_data: ModerationSettingsUpdate,
    current_user: User = Depends(get_admin_user)
):
    """Update moderation settings (Admin only)"""
    settings = await ModerationSettings.find_one(
        ModerationSettings.category == category
    )
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settings not found"
        )
    
    update_data = settings_data.dict(exclude_unset=True)
    await settings.update({"$set": update_data})
    
    return settings

@router.get("/logs", response_model=List[ModerationLogResponse])
async def get_moderation_logs(
    skip: int = 0,
    limit: int = 100,
    flagged_only: bool = False,
    current_user: User = Depends(get_admin_user)
):
    """Get moderation logs (Admin only)"""
    query = ModerationLog.find_all()
    
    if flagged_only:
        query = ModerationLog.find(ModerationLog.flagged == True)
    
    logs = await query.sort("-created_at").skip(skip).limit(limit).to_list()
    
    return logs

@router.get("/logs/{log_id}", response_model=ModerationLogResponse)
async def get_moderation_log(
    log_id: PydanticObjectId,
    current_user: User = Depends(get_admin_user)
):
    """Get specific moderation log (Admin only)"""
    log = await ModerationLog.get(log_id)
    
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log not found"
        )
    
    return log

@router.get("/stats")
async def get_moderation_stats(
    current_user: User = Depends(get_admin_user)
):
    """Get moderation statistics (Admin only)"""
    total_logs = await ModerationLog.find_all().count()
    flagged_logs = await ModerationLog.find(ModerationLog.flagged == True).count()
    
    # Get category breakdown
    categories = {}
    for category in ["hate", "violence", "weapons", "religion", "safety", "health", "harassment", "sexual"]:
        count = await ModerationLog.find(
            ModerationLog.category == category,
            ModerationLog.flagged == True
        ).count()
        categories[category] = count
    
    return {
        "total_checked": total_logs,
        "total_flagged": flagged_logs,
        "pass_rate": (total_logs - flagged_logs) / total_logs if total_logs > 0 else 1.0,
        "categories": categories
    }

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from beanie import PydanticObjectId
from app.core.security import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
async def get_my_notifications(current_user: User = Depends(get_current_user)):
    notifications = await Notification.find(
        Notification.user_id == current_user.id
    ).sort("-created_at").to_list()
    
    result = []
    for notif in notifications:
        n_dict = notif.model_dump()
        n_dict["id"] = str(notif.id)
        n_dict["user_id"] = str(notif.user_id)
        result.append(n_dict)
    return result

@router.put("/read-all", response_model=dict)
async def mark_all_as_read(current_user: User = Depends(get_current_user)):
    # Using raw motor engine for bulk update
    await Notification.find(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"$set": {"is_read": True}})
    
    return {"message": "All notifications marked as read"}

@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(notification_id: str, current_user: User = Depends(get_current_user)):
    notification = await Notification.get(PydanticObjectId(notification_id))
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    notification.is_read = True
    await notification.save()
    
    n_dict = notification.model_dump()
    n_dict["id"] = str(notification.id)
    n_dict["user_id"] = str(notification.user_id)
    return n_dict

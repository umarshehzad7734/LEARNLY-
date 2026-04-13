from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from pydantic import BaseModel
from beanie import PydanticObjectId

from app.core.security import get_admin_user
from app.models.user import User
from app.models.department import Department

router = APIRouter()


class DepartmentCreate(BaseModel):
    name: str
    color: str = "#4F46E5"
    total_semesters: int = 8


class DepartmentResponse(BaseModel):
    id: str
    name: str
    color: str
    total_semesters: int

    class Config:
        from_attributes = True


@router.get("/", response_model=List[DepartmentResponse])
async def get_departments():
    """Get all departments (public - needed by signup form)"""
    departments = await Department.find_all().to_list()
    return [
        {"id": str(d.id), "name": d.name, "color": d.color, "total_semesters": d.total_semesters}
        for d in departments
    ]


@router.post("/", response_model=DepartmentResponse)
async def create_department(
    data: DepartmentCreate,
    current_user: User = Depends(get_admin_user)
):
    """Create a new department (Admin only)"""
    existing = await Department.find_one(Department.name == data.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department with this name already exists"
        )

    dept = Department(name=data.name, color=data.color, total_semesters=data.total_semesters)
    await dept.create()
    return {"id": str(dept.id), "name": dept.name, "color": dept.color, "total_semesters": dept.total_semesters}


@router.delete("/{department_id}")
async def delete_department(
    department_id: PydanticObjectId,
    current_user: User = Depends(get_admin_user)
):
    """Delete a department (Admin only)"""
    dept = await Department.get(department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    await dept.delete()
    return {"message": "Department deleted successfully"}

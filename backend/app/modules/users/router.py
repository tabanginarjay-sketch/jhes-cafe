"""Users and Staff REST API router."""

from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.core.airtable import AirtableError, AirtableNotFoundError
from app.modules.users.repository import StaffRepository, UserRepository
from app.modules.users.schemas import (
    StaffCreate,
    StaffResponse,
    StaffUpdate,
    UserCreate,
    UserResponse,
    UserUpdate,
)

router = APIRouter(tags=["Users & Staff"])

user_repo = UserRepository()
staff_repo = StaffRepository()


# ==================== USERS (CUSTOMERS) ====================

@router.get("/users", response_model=List[UserResponse], summary="List customers")
async def list_users() -> List[UserResponse]:
    try:
        return await user_repo.list_all()
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Register customer")
async def create_user(payload: UserCreate) -> UserResponse:
    try:
        existing = await user_repo.get_by_email(payload.email)
        if existing:
            return existing
        return await user_repo.create(payload)
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.get("/users/{user_id}", response_model=UserResponse, summary="Get customer by ID")
async def get_user(user_id: str) -> UserResponse:
    try:
        return await user_repo.get_by_id(user_id)
    except AirtableNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found.")
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


# ==================== STAFF ====================

@router.get("/staff", response_model=List[StaffResponse], summary="List staff members")
async def list_staff(
    active_only: bool = Query(default=True, description="Filter only active staff"),
) -> List[StaffResponse]:
    try:
        if active_only:
            return await staff_repo.list_active()
        return await staff_repo.list_all()
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.post("/staff", response_model=StaffResponse, status_code=status.HTTP_201_CREATED, summary="Add staff member")
async def create_staff(payload: StaffCreate) -> StaffResponse:
    try:
        return await staff_repo.create(payload)
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.get("/staff/{staff_id}", response_model=StaffResponse, summary="Get staff member by ID")
async def get_staff(staff_id: str) -> StaffResponse:
    try:
        return await staff_repo.get_by_id(staff_id)
    except AirtableNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Staff '{staff_id}' not found.")
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.patch("/staff/{staff_id}", response_model=StaffResponse, summary="Update staff shift or role")
async def update_staff(staff_id: str, payload: StaffUpdate) -> StaffResponse:
    try:
        return await staff_repo.update(staff_id, payload)
    except AirtableNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Staff '{staff_id}' not found.")
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)

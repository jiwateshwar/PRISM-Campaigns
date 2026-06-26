from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User, UserOperatorRole, UserRole
from app.schemas.user import UserCreate, UserUpdate, UserRead, UserOperatorRoleCreate, UserOperatorRoleRead, ChangePasswordRequest
from app.core.deps import get_current_user, get_current_superadmin
from app.core.security import hash_password, verify_password
import uuid

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
async def list_users(
    current_user: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.deleted_at == None).order_by(User.full_name)
    )
    return result.scalars().all()


@router.post("", response_model=UserRead, status_code=201)
async def create_user(
    payload: UserCreate,
    current_user: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        is_super_admin=payload.is_super_admin,
    )
    db.add(user)
    await db.flush()
    return user


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserRead)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(current_user, k, v)
    await db.flush()
    return current_user


@router.post("/me/change-password", status_code=204)
async def change_my_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(payload.new_password)
    await db.flush()


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at == None))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    current_user: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at == None))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(user, k, v)
    await db.flush()
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at == None))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    from datetime import datetime, timezone
    user.deleted_at = datetime.now(timezone.utc)
    await db.flush()


# ─── Operator Role Assignment ──────────────────────────────────────────────────

@router.post("/operator-roles", response_model=UserOperatorRoleRead, status_code=201)
async def assign_operator_role(
    payload: UserOperatorRoleCreate,
    current_user: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    # Check if already exists
    existing = await db.execute(
        select(UserOperatorRole).where(
            UserOperatorRole.user_id == payload.user_id,
            UserOperatorRole.operator_id == payload.operator_id,
        )
    )
    role_record = existing.scalar_one_or_none()
    if role_record:
        role_record.role = UserRole(payload.role)
        await db.flush()
        return role_record

    role_record = UserOperatorRole(
        user_id=payload.user_id,
        operator_id=payload.operator_id,
        role=UserRole(payload.role),
    )
    db.add(role_record)
    await db.flush()
    return role_record

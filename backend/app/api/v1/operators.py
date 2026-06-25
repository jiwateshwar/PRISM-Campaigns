from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.operator import Operator
from app.models.user import User, UserOperatorRole, UserRole
from app.schemas.operator import OperatorCreate, OperatorUpdate, OperatorRead
from app.core.deps import get_current_user, get_current_superadmin
import uuid

router = APIRouter(prefix="/operators", tags=["operators"])


@router.get("", response_model=list[OperatorRead])
async def list_operators(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.is_super_admin:
        result = await db.execute(select(Operator).where(Operator.deleted_at == None).order_by(Operator.name))
        return result.scalars().all()
    # Return only operators this user has access to
    result = await db.execute(
        select(Operator)
        .join(UserOperatorRole, UserOperatorRole.operator_id == Operator.id)
        .where(UserOperatorRole.user_id == current_user.id, Operator.deleted_at == None)
        .order_by(Operator.name)
    )
    return result.scalars().all()


@router.post("", response_model=OperatorRead, status_code=status.HTTP_201_CREATED)
async def create_operator(
    payload: OperatorCreate,
    current_user: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    # Check slug uniqueness
    existing = await db.execute(select(Operator).where(Operator.slug == payload.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already taken")

    operator = Operator(**payload.model_dump())
    db.add(operator)
    await db.flush()
    return operator


@router.get("/{operator_id}", response_model=OperatorRead)
async def get_operator(
    operator_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Operator).where(Operator.id == operator_id, Operator.deleted_at == None))
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")
    return op


@router.patch("/{operator_id}", response_model=OperatorRead)
async def update_operator(
    operator_id: uuid.UUID,
    payload: OperatorUpdate,
    current_user: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Operator).where(Operator.id == operator_id, Operator.deleted_at == None))
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(op, field, value)
    await db.flush()
    return op


@router.delete("/{operator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_operator(
    operator_id: uuid.UUID,
    current_user: User = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Operator).where(Operator.id == operator_id, Operator.deleted_at == None))
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")
    from datetime import datetime, timezone
    op.deleted_at = datetime.now(timezone.utc)
    await db.flush()

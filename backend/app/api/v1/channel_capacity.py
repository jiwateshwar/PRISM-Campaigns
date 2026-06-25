from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.channel_capacity import ChannelCapacity
from app.core.deps import require_viewer, require_admin
from pydantic import BaseModel
from typing import Optional
import uuid
import datetime

router = APIRouter(prefix="/{operator_slug}/capacity", tags=["channel-capacity"])

VALID_CHANNELS = ["sms", "whatsapp", "obd", "ussd", "ivr", "push"]


class CapacityCreate(BaseModel):
    channel: str
    month: datetime.date
    daily_capacity: int = 0
    monthly_capacity: int = 0
    notes: Optional[str] = None


class CapacityUpdate(BaseModel):
    daily_capacity: Optional[int] = None
    monthly_capacity: Optional[int] = None
    allocated: Optional[int] = None
    notes: Optional[str] = None


class CapacityRead(BaseModel):
    id: uuid.UUID
    operator_id: uuid.UUID
    channel: str
    month: datetime.date
    daily_capacity: int
    monthly_capacity: int
    allocated: int
    utilization_pct: float
    is_over_capacity: bool
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


@router.get("", response_model=list[CapacityRead])
async def list_capacities(
    operator_slug: str,
    month: str | None = Query(None, description="YYYY-MM format"),
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    q = select(ChannelCapacity).where(ChannelCapacity.operator_id == operator.id)
    if month:
        target = datetime.date.fromisoformat(month + "-01")
        q = q.where(ChannelCapacity.month == target)
    q = q.order_by(ChannelCapacity.month.desc(), ChannelCapacity.channel)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=CapacityRead, status_code=201)
async def create_capacity(
    operator_slug: str,
    payload: CapacityCreate,
    auth=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    if payload.channel not in VALID_CHANNELS:
        raise HTTPException(status_code=400, detail=f"Invalid channel. Must be one of: {VALID_CHANNELS}")

    capacity = ChannelCapacity(operator_id=operator.id, **payload.model_dump())
    db.add(capacity)
    await db.flush()
    return capacity


@router.patch("/{capacity_id}", response_model=CapacityRead)
async def update_capacity(
    operator_slug: str,
    capacity_id: uuid.UUID,
    payload: CapacityUpdate,
    auth=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(ChannelCapacity).where(ChannelCapacity.id == capacity_id, ChannelCapacity.operator_id == operator.id)
    )
    cap = result.scalar_one_or_none()
    if not cap:
        raise HTTPException(status_code=404, detail="Capacity record not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(cap, k, v)
    await db.flush()
    return cap


@router.get("/conflict-check")
async def check_conflicts(
    operator_slug: str,
    month: str,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    """Return channels that are over capacity for a given month."""
    current_user, operator = auth
    target = datetime.date.fromisoformat(month + "-01")
    result = await db.execute(
        select(ChannelCapacity).where(
            ChannelCapacity.operator_id == operator.id,
            ChannelCapacity.month == target,
        )
    )
    capacities = result.scalars().all()
    conflicts = [
        {
            "channel": c.channel,
            "monthly_capacity": c.monthly_capacity,
            "allocated": c.allocated,
            "overage": c.allocated - c.monthly_capacity,
        }
        for c in capacities if c.is_over_capacity
    ]
    return {"month": month, "conflicts": conflicts, "has_conflicts": len(conflicts) > 0}

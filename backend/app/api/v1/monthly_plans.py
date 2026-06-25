from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.monthly_plan import MonthlyPlan
from app.models.business_objective import BusinessObjective
from app.core.deps import require_viewer, require_planner
from pydantic import BaseModel
from typing import Optional
import uuid
import datetime

router = APIRouter(prefix="/{operator_slug}/plans", tags=["monthly-plans"])


class PlanCreate(BaseModel):
    name: str
    month: datetime.date
    product_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    target_activations: int = 0
    target_revenue: float = 0.0
    target_churn_reduction: float = 0.0
    notes: Optional[str] = None


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    target_activations: Optional[int] = None
    target_revenue: Optional[float] = None
    target_churn_reduction: Optional[float] = None
    notes: Optional[str] = None


class PlanRead(BaseModel):
    id: uuid.UUID
    operator_id: uuid.UUID
    product_id: Optional[uuid.UUID] = None
    name: str
    month: datetime.date
    status: str
    target_activations: int
    target_revenue: float
    target_churn_reduction: float
    notes: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


class ObjectiveCreate(BaseModel):
    name: str
    description: Optional[str] = None
    objective_type: str
    target_value: float
    target_unit: str = "count"
    weight: int = 1


class ObjectiveRead(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    objective_type: str
    target_value: float
    target_unit: str
    current_value: float
    weight: int

    model_config = {"from_attributes": True}


@router.get("", response_model=list[PlanRead])
async def list_plans(
    operator_slug: str,
    product_id: uuid.UUID | None = None,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    q = select(MonthlyPlan).where(MonthlyPlan.operator_id == operator.id, MonthlyPlan.deleted_at == None)
    if product_id:
        q = q.where(MonthlyPlan.product_id == product_id)
    q = q.order_by(MonthlyPlan.month.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=PlanRead, status_code=201)
async def create_plan(
    operator_slug: str,
    payload: PlanCreate,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    plan = MonthlyPlan(operator_id=operator.id, created_by_id=current_user.id, **payload.model_dump())
    db.add(plan)
    await db.flush()
    return plan


@router.get("/{plan_id}", response_model=PlanRead)
async def get_plan(
    operator_slug: str,
    plan_id: uuid.UUID,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(MonthlyPlan).where(MonthlyPlan.id == plan_id, MonthlyPlan.operator_id == operator.id, MonthlyPlan.deleted_at == None)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.patch("/{plan_id}", response_model=PlanRead)
async def update_plan(
    operator_slug: str,
    plan_id: uuid.UUID,
    payload: PlanUpdate,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(MonthlyPlan).where(MonthlyPlan.id == plan_id, MonthlyPlan.operator_id == operator.id, MonthlyPlan.deleted_at == None)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(plan, k, v)
    await db.flush()
    return plan


@router.delete("/{plan_id}", status_code=204)
async def delete_plan(
    operator_slug: str,
    plan_id: uuid.UUID,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(MonthlyPlan).where(MonthlyPlan.id == plan_id, MonthlyPlan.operator_id == operator.id, MonthlyPlan.deleted_at == None)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    from datetime import datetime, timezone
    plan.deleted_at = datetime.now(timezone.utc)
    await db.flush()


# ─── Business Objectives ──────────────────────────────────────────────────────

@router.get("/{plan_id}/objectives", response_model=list[ObjectiveRead])
async def list_objectives(
    operator_slug: str,
    plan_id: uuid.UUID,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(BusinessObjective).where(BusinessObjective.monthly_plan_id == plan_id)
        .order_by(BusinessObjective.weight.desc())
    )
    return result.scalars().all()


@router.post("/{plan_id}/objectives", response_model=ObjectiveRead, status_code=201)
async def create_objective(
    operator_slug: str,
    plan_id: uuid.UUID,
    payload: ObjectiveCreate,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    obj = BusinessObjective(
        operator_id=operator.id,
        monthly_plan_id=plan_id,
        **payload.model_dump(),
    )
    db.add(obj)
    await db.flush()
    return obj

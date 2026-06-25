from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.campaign import Campaign, CampaignSupportTask, CampaignDependency, CampaignActual
from app.models.user import User
from app.models.operator import Operator
from app.schemas.campaign import (
    CampaignCreate, CampaignUpdate, CampaignRead,
    SupportTaskCreate, SupportTaskUpdate, SupportTaskRead,
    DependencyCreate, DependencyRead,
    ActualResultCreate, ActualResultRead,
)
from app.core.deps import get_current_user, require_viewer, require_planner
import uuid

router = APIRouter(prefix="/{operator_slug}/campaigns", tags=["campaigns"])


def _calc_forecast(forecast: dict) -> dict:
    """Compute derived forecast outputs from inputs."""
    reach = forecast.get("estimated_reach", 0)
    conv_pct = forecast.get("expected_conversion_pct", 0.0) / 100
    arpu = forecast.get("monthly_arpu", 0.0)
    forecast["expected_activations"] = int(reach * conv_pct)
    forecast["expected_revenue"] = round(forecast["expected_activations"] * arpu, 2)
    return forecast


@router.get("", response_model=list[CampaignRead])
async def list_campaigns(
    operator_slug: str,
    status_filter: str | None = Query(None, alias="status"),
    monthly_plan_id: uuid.UUID | None = None,
    product_id: uuid.UUID | None = None,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    q = select(Campaign).where(Campaign.operator_id == operator.id, Campaign.deleted_at == None)
    if status_filter:
        q = q.where(Campaign.status == status_filter)
    if monthly_plan_id:
        q = q.where(Campaign.monthly_plan_id == monthly_plan_id)
    if product_id:
        q = q.where(Campaign.product_id == product_id)
    q = q.order_by(Campaign.planned_start_date.asc().nullslast(), Campaign.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=CampaignRead, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    operator_slug: str,
    payload: CampaignCreate,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    data = payload.model_dump()
    forecast = data.pop("forecast", {})
    forecast = _calc_forecast(dict(forecast))
    campaign = Campaign(
        operator_id=operator.id,
        created_by_id=current_user.id,
        forecast=forecast,
        **data,
    )
    db.add(campaign)
    await db.flush()
    return campaign


@router.get("/{campaign_id}", response_model=CampaignRead)
async def get_campaign(
    operator_slug: str,
    campaign_id: uuid.UUID,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.operator_id == operator.id, Campaign.deleted_at == None)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.patch("/{campaign_id}", response_model=CampaignRead)
async def update_campaign(
    operator_slug: str,
    campaign_id: uuid.UUID,
    payload: CampaignUpdate,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.operator_id == operator.id, Campaign.deleted_at == None)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    data = payload.model_dump(exclude_none=True)
    if "forecast" in data and data["forecast"]:
        data["forecast"] = _calc_forecast(dict(data["forecast"]))
    for field, value in data.items():
        setattr(campaign, field, value)
    await db.flush()
    return campaign


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    operator_slug: str,
    campaign_id: uuid.UUID,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.operator_id == operator.id, Campaign.deleted_at == None)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    from datetime import datetime, timezone
    campaign.deleted_at = datetime.now(timezone.utc)
    await db.flush()


# ─── Support Tasks ────────────────────────────────────────────────────────────

@router.get("/{campaign_id}/tasks", response_model=list[SupportTaskRead])
async def list_tasks(
    operator_slug: str,
    campaign_id: uuid.UUID,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(CampaignSupportTask).where(CampaignSupportTask.campaign_id == campaign_id)
        .order_by(CampaignSupportTask.due_date.asc().nullslast())
    )
    return result.scalars().all()


@router.post("/{campaign_id}/tasks", response_model=SupportTaskRead, status_code=201)
async def create_task(
    operator_slug: str,
    campaign_id: uuid.UUID,
    payload: SupportTaskCreate,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    task = CampaignSupportTask(campaign_id=campaign_id, **payload.model_dump())
    db.add(task)
    await db.flush()
    return task


@router.patch("/{campaign_id}/tasks/{task_id}", response_model=SupportTaskRead)
async def update_task(
    operator_slug: str,
    campaign_id: uuid.UUID,
    task_id: uuid.UUID,
    payload: SupportTaskUpdate,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(select(CampaignSupportTask).where(CampaignSupportTask.id == task_id, CampaignSupportTask.campaign_id == campaign_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(task, k, v)
    await db.flush()
    return task


# ─── Dependencies ─────────────────────────────────────────────────────────────

@router.get("/{campaign_id}/dependencies", response_model=list[DependencyRead])
async def list_dependencies(
    operator_slug: str,
    campaign_id: uuid.UUID,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(CampaignDependency).where(CampaignDependency.dependent_campaign_id == campaign_id)
    )
    return result.scalars().all()


@router.post("/{campaign_id}/dependencies", response_model=DependencyRead, status_code=201)
async def create_dependency(
    operator_slug: str,
    campaign_id: uuid.UUID,
    payload: DependencyCreate,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    dep = CampaignDependency(dependent_campaign_id=campaign_id, **payload.model_dump())
    db.add(dep)
    await db.flush()
    return dep


# ─── Actuals ──────────────────────────────────────────────────────────────────

@router.post("/{campaign_id}/actuals", response_model=ActualResultRead, status_code=201)
async def import_actuals(
    operator_slug: str,
    campaign_id: uuid.UUID,
    payload: ActualResultCreate,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    actual = CampaignActual(
        campaign_id=campaign_id,
        imported_by_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(actual)
    # Auto-advance status to results_imported
    res = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = res.scalar_one_or_none()
    if campaign and campaign.status == "completed":
        campaign.status = "results_imported"
    await db.flush()
    return actual

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, text
from app.db.session import get_db
from app.models.campaign import Campaign, CampaignActual
from app.models.monthly_plan import MonthlyPlan
from app.models.segment import Segment
from app.models.offer import Offer
from app.models.channel_capacity import ChannelCapacity
from app.core.deps import require_viewer
import uuid
import datetime

router = APIRouter(prefix="/{operator_slug}/analytics", tags=["analytics"])


@router.get("/operator-summary")
async def operator_summary(
    operator_slug: str,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    """High-level operator KPIs for the operator dashboard."""
    current_user, operator = auth

    # Campaign counts by status
    result = await db.execute(
        select(Campaign.status, func.count(Campaign.id).label("count"))
        .where(Campaign.operator_id == operator.id, Campaign.deleted_at == None)
        .group_by(Campaign.status)
    )
    status_counts = {row.status: row.count for row in result}

    # Total forecast
    camp_result = await db.execute(
        select(Campaign).where(Campaign.operator_id == operator.id, Campaign.deleted_at == None)
    )
    campaigns = camp_result.scalars().all()

    total_forecast_reach = sum(c.forecast.get("estimated_reach", 0) for c in campaigns)
    total_forecast_activations = sum(c.forecast.get("expected_activations", 0) for c in campaigns)
    total_forecast_revenue = sum(c.forecast.get("expected_revenue", 0.0) for c in campaigns)

    # Actuals
    actual_result = await db.execute(
        select(
            func.sum(CampaignActual.actual_activations).label("activations"),
            func.sum(CampaignActual.actual_revenue).label("revenue"),
        ).join(Campaign, CampaignActual.campaign_id == Campaign.id)
        .where(Campaign.operator_id == operator.id)
    )
    actual_row = actual_result.one()

    # Segments count
    seg_result = await db.execute(
        select(func.count(Segment.id)).where(Segment.operator_id == operator.id, Segment.deleted_at == None)
    )
    segment_count = seg_result.scalar()

    # Active offers count
    offer_result = await db.execute(
        select(func.count(Offer.id)).where(Offer.operator_id == operator.id, Offer.status == "active", Offer.deleted_at == None)
    )
    offer_count = offer_result.scalar()

    return {
        "campaign_status_counts": status_counts,
        "total_campaigns": sum(status_counts.values()),
        "forecast": {
            "reach": total_forecast_reach,
            "activations": total_forecast_activations,
            "revenue": total_forecast_revenue,
        },
        "actuals": {
            "activations": actual_row.activations or 0,
            "revenue": actual_row.revenue or 0.0,
        },
        "segment_count": segment_count or 0,
        "active_offer_count": offer_count or 0,
    }


@router.get("/campaign-performance")
async def campaign_performance(
    operator_slug: str,
    months: int = Query(6, ge=1, le=24),
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    """Campaign performance trend over recent months."""
    current_user, operator = auth
    from_date = datetime.date.today().replace(day=1)
    # Go back N months
    year, month = from_date.year, from_date.month
    month -= months
    while month <= 0:
        month += 12
        year -= 1
    from_date = datetime.date(year, month, 1)

    result = await db.execute(
        select(
            func.date_trunc("month", Campaign.planned_start_date).label("month"),
            Campaign.status,
            func.count(Campaign.id).label("count"),
            func.sum(func.cast(Campaign.forecast["expected_activations"].as_string(), type_=func.Integer())).label("forecast_activations"),
        )
        .where(
            Campaign.operator_id == operator.id,
            Campaign.deleted_at == None,
            Campaign.planned_start_date >= from_date,
        )
        .group_by("month", Campaign.status)
        .order_by("month")
    )
    rows = result.fetchall()
    return [{"month": str(r.month)[:7] if r.month else None, "status": r.status, "count": r.count} for r in rows]


@router.get("/channel-capacity")
async def channel_capacity_stats(
    operator_slug: str,
    month: str | None = None,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    """Channel capacity utilization."""
    current_user, operator = auth
    target_month = datetime.date.today().replace(day=1)
    if month:
        try:
            target_month = datetime.date.fromisoformat(month + "-01")
        except ValueError:
            pass

    result = await db.execute(
        select(ChannelCapacity).where(
            ChannelCapacity.operator_id == operator.id,
            ChannelCapacity.month == target_month,
        )
    )
    capacities = result.scalars().all()
    return [
        {
            "channel": c.channel,
            "monthly_capacity": c.monthly_capacity,
            "allocated": c.allocated,
            "utilization_pct": c.utilization_pct,
            "is_over_capacity": c.is_over_capacity,
        }
        for c in capacities
    ]


@router.get("/forecast-vs-actual")
async def forecast_vs_actual(
    operator_slug: str,
    monthly_plan_id: uuid.UUID | None = None,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    """Compare forecast to actual results per campaign."""
    current_user, operator = auth
    q = (
        select(Campaign)
        .where(Campaign.operator_id == operator.id, Campaign.deleted_at == None)
    )
    if monthly_plan_id:
        q = q.where(Campaign.monthly_plan_id == monthly_plan_id)

    result = await db.execute(q)
    campaigns = result.scalars().all()

    output = []
    for c in campaigns:
        actual_res = await db.execute(
            select(CampaignActual).where(CampaignActual.campaign_id == c.id)
        )
        actuals = actual_res.scalars().all()
        total_actual_activations = sum(a.actual_activations for a in actuals)
        total_actual_revenue = sum(a.actual_revenue for a in actuals)
        output.append({
            "campaign_id": str(c.id),
            "name": c.name,
            "status": c.status,
            "forecast_activations": c.forecast.get("expected_activations", 0),
            "actual_activations": total_actual_activations,
            "forecast_revenue": c.forecast.get("expected_revenue", 0.0),
            "actual_revenue": total_actual_revenue,
            "variance_activations": total_actual_activations - c.forecast.get("expected_activations", 0),
        })
    return output

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.journey import Journey, JourneyTemplate
from app.schemas.journey import JourneyCreate, JourneyUpdate, JourneyRead, JourneyTemplateRead
from app.core.deps import require_viewer, require_planner
import uuid

router = APIRouter(prefix="/{operator_slug}/journeys", tags=["journeys"])


@router.get("", response_model=list[JourneyRead])
async def list_journeys(
    operator_slug: str,
    campaign_id: uuid.UUID | None = None,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    q = select(Journey).where(Journey.operator_id == operator.id, Journey.deleted_at == None, Journey.is_template == False)
    if campaign_id:
        q = q.where(Journey.campaign_id == campaign_id)
    q = q.order_by(Journey.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=JourneyRead, status_code=201)
async def create_journey(
    operator_slug: str,
    payload: JourneyCreate,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    journey = Journey(
        operator_id=operator.id,
        created_by_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(journey)
    await db.flush()
    return journey


@router.get("/templates", response_model=list[JourneyTemplateRead])
async def list_templates(
    operator_slug: str,
    category: str | None = None,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    q = select(JourneyTemplate).where(JourneyTemplate.deleted_at == None)
    if category:
        q = q.where(JourneyTemplate.category == category)
    q = q.order_by(JourneyTemplate.usage_count.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/templates/{template_id}/clone", response_model=JourneyRead, status_code=201)
async def clone_template(
    operator_slug: str,
    template_id: uuid.UUID,
    name: str = "Cloned Journey",
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(select(JourneyTemplate).where(JourneyTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    journey = Journey(
        operator_id=operator.id,
        created_by_id=current_user.id,
        name=name,
        nodes=template.nodes,
        edges=template.edges,
        viewport=template.viewport,
        template_id=template.id,
    )
    db.add(journey)
    template.usage_count += 1
    await db.flush()
    return journey


@router.get("/{journey_id}", response_model=JourneyRead)
async def get_journey(
    operator_slug: str,
    journey_id: uuid.UUID,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Journey).where(Journey.id == journey_id, Journey.operator_id == operator.id, Journey.deleted_at == None)
    )
    journey = result.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    return journey


@router.patch("/{journey_id}", response_model=JourneyRead)
async def update_journey(
    operator_slug: str,
    journey_id: uuid.UUID,
    payload: JourneyUpdate,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Journey).where(Journey.id == journey_id, Journey.operator_id == operator.id, Journey.deleted_at == None)
    )
    journey = result.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(journey, k, v)
    await db.flush()
    return journey


@router.delete("/{journey_id}", status_code=204)
async def delete_journey(
    operator_slug: str,
    journey_id: uuid.UUID,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Journey).where(Journey.id == journey_id, Journey.operator_id == operator.id, Journey.deleted_at == None)
    )
    journey = result.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    from datetime import datetime, timezone
    journey.deleted_at = datetime.now(timezone.utc)
    await db.flush()

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.offer import Offer
from app.schemas.offer import OfferCreate, OfferUpdate, OfferRead
from app.core.deps import require_viewer, require_planner
import uuid

router = APIRouter(prefix="/{operator_slug}/offers", tags=["offers"])


@router.get("", response_model=list[OfferRead])
async def list_offers(
    operator_slug: str,
    status_filter: str | None = None,
    product_id: uuid.UUID | None = None,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    q = select(Offer).where(Offer.operator_id == operator.id, Offer.deleted_at == None)
    if status_filter:
        q = q.where(Offer.status == status_filter)
    if product_id:
        q = q.where(Offer.product_id == product_id)
    q = q.order_by(Offer.name)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=OfferRead, status_code=201)
async def create_offer(
    operator_slug: str,
    payload: OfferCreate,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    offer = Offer(operator_id=operator.id, **payload.model_dump())
    db.add(offer)
    await db.flush()
    return offer


@router.get("/{offer_id}", response_model=OfferRead)
async def get_offer(
    operator_slug: str,
    offer_id: uuid.UUID,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Offer).where(Offer.id == offer_id, Offer.operator_id == operator.id, Offer.deleted_at == None)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer


@router.patch("/{offer_id}", response_model=OfferRead)
async def update_offer(
    operator_slug: str,
    offer_id: uuid.UUID,
    payload: OfferUpdate,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Offer).where(Offer.id == offer_id, Offer.operator_id == operator.id, Offer.deleted_at == None)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(offer, k, v)
    await db.flush()
    return offer


@router.delete("/{offer_id}", status_code=204)
async def delete_offer(
    operator_slug: str,
    offer_id: uuid.UUID,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Offer).where(Offer.id == offer_id, Offer.operator_id == operator.id, Offer.deleted_at == None)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    from datetime import datetime, timezone
    offer.deleted_at = datetime.now(timezone.utc)
    await db.flush()

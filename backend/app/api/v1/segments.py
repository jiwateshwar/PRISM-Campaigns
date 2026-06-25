from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.segment import Segment, SegmentVersion
from app.schemas.segment import SegmentCreate, SegmentUpdate, SegmentRead, SegmentVersionRead
from app.core.deps import require_viewer, require_planner
import uuid

router = APIRouter(prefix="/{operator_slug}/segments", tags=["segments"])


@router.get("", response_model=list[SegmentRead])
async def list_segments(
    operator_slug: str,
    active_only: bool = True,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    q = select(Segment).where(Segment.operator_id == operator.id, Segment.deleted_at == None)
    if active_only:
        q = q.where(Segment.is_active == True)
    q = q.order_by(Segment.name)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=SegmentRead, status_code=201)
async def create_segment(
    operator_slug: str,
    payload: SegmentCreate,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    segment = Segment(operator_id=operator.id, **payload.model_dump())
    db.add(segment)
    await db.flush()

    # Create initial version
    version = SegmentVersion(
        segment_id=segment.id,
        version_number=1,
        business_rules=segment.business_rules,
        estimated_audience_size=segment.estimated_audience_size,
        eligible_audience_size=segment.eligible_audience_size,
        change_notes="Initial version",
        created_by_id=current_user.id,
    )
    db.add(version)
    await db.flush()
    return segment


@router.get("/{segment_id}", response_model=SegmentRead)
async def get_segment(
    operator_slug: str,
    segment_id: uuid.UUID,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Segment).where(Segment.id == segment_id, Segment.operator_id == operator.id, Segment.deleted_at == None)
    )
    segment = result.scalar_one_or_none()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    return segment


@router.patch("/{segment_id}", response_model=SegmentRead)
async def update_segment(
    operator_slug: str,
    segment_id: uuid.UUID,
    payload: SegmentUpdate,
    change_notes: str = "Updated",
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Segment).where(Segment.id == segment_id, Segment.operator_id == operator.id, Segment.deleted_at == None)
    )
    segment = result.scalar_one_or_none()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    data = payload.model_dump(exclude_none=True)
    rules_changed = "business_rules" in data

    for k, v in data.items():
        setattr(segment, k, v)

    if rules_changed:
        # Create new version on business rules change
        segment.current_version += 1
        version = SegmentVersion(
            segment_id=segment.id,
            version_number=segment.current_version,
            business_rules=segment.business_rules,
            estimated_audience_size=segment.estimated_audience_size,
            eligible_audience_size=segment.eligible_audience_size,
            change_notes=change_notes,
            created_by_id=current_user.id,
        )
        db.add(version)

    await db.flush()
    return segment


@router.get("/{segment_id}/versions", response_model=list[SegmentVersionRead])
async def list_segment_versions(
    operator_slug: str,
    segment_id: uuid.UUID,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(SegmentVersion).where(SegmentVersion.segment_id == segment_id)
        .order_by(SegmentVersion.version_number.desc())
    )
    return result.scalars().all()


@router.delete("/{segment_id}", status_code=204)
async def delete_segment(
    operator_slug: str,
    segment_id: uuid.UUID,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Segment).where(Segment.id == segment_id, Segment.operator_id == operator.id, Segment.deleted_at == None)
    )
    segment = result.scalar_one_or_none()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    from datetime import datetime, timezone
    segment.deleted_at = datetime.now(timezone.utc)
    await db.flush()

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.db.session import get_db
from app.models.creative import Creative, CreativeVersion
from app.core.deps import require_viewer, require_planner
from pydantic import BaseModel
from typing import Optional
import uuid
import datetime

router = APIRouter(prefix="/{operator_slug}/creatives", tags=["creatives"])


class CreativeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    channels: list[str] = []
    content: dict = {}
    telco_name: Optional[str] = None
    language: str = "en"
    status: str = "draft"
    tags: list = []
    is_shared: bool = False


class CreativeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    channels: Optional[list[str]] = None
    content: Optional[dict] = None
    telco_name: Optional[str] = None
    language: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[list] = None
    is_shared: Optional[bool] = None


class CreativeRead(BaseModel):
    id: uuid.UUID
    operator_id: Optional[uuid.UUID] = None
    name: str
    description: Optional[str] = None
    channels: list = []
    content: dict = {}
    telco_name: Optional[str] = None
    language: str
    current_version: int
    status: str
    tags: list = []
    is_shared: bool
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


class CreativeVersionRead(BaseModel):
    id: uuid.UUID
    creative_id: uuid.UUID
    version_number: int
    channels: list
    content: dict
    change_notes: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


@router.get("", response_model=list[CreativeRead])
async def list_creatives(
    operator_slug: str,
    channel: str | None = None,
    shared_only: bool = False,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    q = select(Creative).where(
        Creative.deleted_at == None,
        or_(Creative.operator_id == operator.id, Creative.is_shared == True)
    )
    if shared_only:
        q = q.where(Creative.is_shared == True)
    q = q.order_by(Creative.name)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=CreativeRead, status_code=201)
async def create_creative(
    operator_slug: str,
    payload: CreativeCreate,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    creative = Creative(operator_id=operator.id, **payload.model_dump())
    db.add(creative)
    await db.flush()

    # Initial version
    version = CreativeVersion(
        creative_id=creative.id,
        version_number=1,
        channels=creative.channels,
        content=creative.content,
        change_notes="Initial version",
        created_by_id=current_user.id,
    )
    db.add(version)
    await db.flush()
    return creative


@router.get("/{creative_id}", response_model=CreativeRead)
async def get_creative(
    operator_slug: str,
    creative_id: uuid.UUID,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Creative).where(Creative.id == creative_id, Creative.deleted_at == None)
    )
    creative = result.scalar_one_or_none()
    if not creative:
        raise HTTPException(status_code=404, detail="Creative not found")
    return creative


@router.patch("/{creative_id}", response_model=CreativeRead)
async def update_creative(
    operator_slug: str,
    creative_id: uuid.UUID,
    payload: CreativeUpdate,
    change_notes: str = "Updated",
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Creative).where(Creative.id == creative_id, Creative.deleted_at == None)
    )
    creative = result.scalar_one_or_none()
    if not creative:
        raise HTTPException(status_code=404, detail="Creative not found")

    data = payload.model_dump(exclude_none=True)
    content_changed = "content" in data or "channels" in data

    for k, v in data.items():
        setattr(creative, k, v)

    if content_changed:
        creative.current_version += 1
        version = CreativeVersion(
            creative_id=creative.id,
            version_number=creative.current_version,
            channels=creative.channels,
            content=creative.content,
            change_notes=change_notes,
            created_by_id=current_user.id,
        )
        db.add(version)

    await db.flush()
    return creative


@router.get("/{creative_id}/versions", response_model=list[CreativeVersionRead])
async def list_versions(
    operator_slug: str,
    creative_id: uuid.UUID,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(CreativeVersion).where(CreativeVersion.creative_id == creative_id)
        .order_by(CreativeVersion.version_number.desc())
    )
    return result.scalars().all()


@router.delete("/{creative_id}", status_code=204)
async def delete_creative(
    operator_slug: str,
    creative_id: uuid.UUID,
    auth=Depends(require_planner),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Creative).where(Creative.id == creative_id, Creative.deleted_at == None)
    )
    creative = result.scalar_one_or_none()
    if not creative:
        raise HTTPException(status_code=404, detail="Creative not found")
    from datetime import datetime, timezone
    creative.deleted_at = datetime.now(timezone.utc)
    await db.flush()

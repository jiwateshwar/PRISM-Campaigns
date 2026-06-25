from pydantic import BaseModel
from typing import Optional
import uuid
import datetime


class SegmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    business_rules: dict = {}
    estimated_audience_size: int = 0
    eligible_audience_size: int = 0
    owner: Optional[str] = None
    tags: list[str] = []
    notes: Optional[str] = None


class SegmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    business_rules: Optional[dict] = None
    estimated_audience_size: Optional[int] = None
    eligible_audience_size: Optional[int] = None
    owner: Optional[str] = None
    tags: Optional[list[str]] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class SegmentRead(BaseModel):
    id: uuid.UUID
    operator_id: uuid.UUID
    name: str
    description: Optional[str] = None
    business_rules: dict = {}
    estimated_audience_size: int
    eligible_audience_size: int
    current_version: int
    owner: Optional[str] = None
    tags: list = []
    is_active: bool
    notes: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


class SegmentVersionRead(BaseModel):
    id: uuid.UUID
    segment_id: uuid.UUID
    version_number: int
    business_rules: dict
    estimated_audience_size: int
    eligible_audience_size: int
    change_notes: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}

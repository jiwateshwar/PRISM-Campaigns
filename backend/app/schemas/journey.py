from pydantic import BaseModel
from typing import Optional
import uuid


class JourneyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    campaign_id: Optional[uuid.UUID] = None
    nodes: list = []
    edges: list = []
    viewport: dict = {}
    is_template: bool = False
    template_id: Optional[uuid.UUID] = None


class JourneyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    campaign_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    nodes: Optional[list] = None
    edges: Optional[list] = None
    viewport: Optional[dict] = None


class JourneyRead(BaseModel):
    id: uuid.UUID
    operator_id: uuid.UUID
    campaign_id: Optional[uuid.UUID] = None
    name: str
    description: Optional[str] = None
    status: str
    nodes: list = []
    edges: list = []
    viewport: dict = {}
    is_template: bool
    template_id: Optional[uuid.UUID] = None

    model_config = {"from_attributes": True}


class JourneyTemplateRead(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    category: str
    nodes: list = []
    edges: list = []
    viewport: dict = {}
    thumbnail_url: Optional[str] = None
    usage_count: int
    tags: list = []

    model_config = {"from_attributes": True}

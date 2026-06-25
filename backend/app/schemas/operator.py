from pydantic import BaseModel
from typing import Optional
import uuid


class OperatorCreate(BaseModel):
    name: str
    slug: str
    country: str
    timezone: str = "UTC"
    currency: str = "USD"
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    settings: dict = {}


class OperatorUpdate(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    is_active: Optional[bool] = None
    settings: Optional[dict] = None


class OperatorRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    country: str
    timezone: str
    currency: str
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    is_active: bool
    settings: dict = {}

    model_config = {"from_attributes": True}

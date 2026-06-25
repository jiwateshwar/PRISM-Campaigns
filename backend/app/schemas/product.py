from pydantic import BaseModel
from typing import Optional
import uuid


class ProductCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    metadata_: dict = {}


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None
    metadata_: Optional[dict] = None


class ProductRead(BaseModel):
    id: uuid.UUID
    operator_id: uuid.UUID
    name: str
    code: str
    description: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}

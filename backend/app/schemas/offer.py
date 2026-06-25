from pydantic import BaseModel
from typing import Optional
import uuid


class OfferCreate(BaseModel):
    name: str
    description: Optional[str] = None
    product_id: Optional[uuid.UUID] = None
    price: float = 0.0
    currency: str = "USD"
    validity_days: int = 30
    expected_monthly_arpu: float = 0.0
    expected_conversion_rate: float = 0.0
    status: str = "active"
    notes: Optional[str] = None


class OfferUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    product_id: Optional[uuid.UUID] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    validity_days: Optional[int] = None
    expected_monthly_arpu: Optional[float] = None
    expected_conversion_rate: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class OfferRead(BaseModel):
    id: uuid.UUID
    operator_id: uuid.UUID
    product_id: Optional[uuid.UUID] = None
    name: str
    description: Optional[str] = None
    price: float
    currency: str
    validity_days: int
    expected_monthly_arpu: float
    expected_conversion_rate: float
    status: str

    model_config = {"from_attributes": True}

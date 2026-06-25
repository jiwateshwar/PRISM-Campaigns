from pydantic import BaseModel
from typing import Optional
import uuid
import datetime


class CampaignForecast(BaseModel):
    estimated_reach: int = 0
    expected_conversion_pct: float = 0.0
    monthly_arpu: float = 0.0
    expected_churn_reduction: float = 0.0
    expected_retention: float = 0.0
    expected_upsell: float = 0.0
    # Calculated
    expected_activations: int = 0
    expected_revenue: float = 0.0
    objective_contribution_pct: float = 0.0


class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    product_id: Optional[uuid.UUID] = None
    monthly_plan_id: Optional[uuid.UUID] = None
    segment_id: Optional[uuid.UUID] = None
    offer_id: Optional[uuid.UUID] = None
    creative_id: Optional[uuid.UUID] = None
    planned_start_date: Optional[datetime.date] = None
    planned_end_date: Optional[datetime.date] = None
    channels: list[str] = []
    objective_ids: list[str] = []
    forecast: CampaignForecast = CampaignForecast()
    priority: int = 3
    notes: Optional[str] = None
    tags: list[str] = []


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    product_id: Optional[uuid.UUID] = None
    monthly_plan_id: Optional[uuid.UUID] = None
    segment_id: Optional[uuid.UUID] = None
    offer_id: Optional[uuid.UUID] = None
    creative_id: Optional[uuid.UUID] = None
    planned_start_date: Optional[datetime.date] = None
    planned_end_date: Optional[datetime.date] = None
    actual_start_date: Optional[datetime.date] = None
    actual_end_date: Optional[datetime.date] = None
    channels: Optional[list[str]] = None
    objective_ids: Optional[list[str]] = None
    forecast: Optional[CampaignForecast] = None
    priority: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[list[str]] = None


class CampaignRead(BaseModel):
    id: uuid.UUID
    operator_id: uuid.UUID
    name: str
    description: Optional[str] = None
    status: str
    product_id: Optional[uuid.UUID] = None
    monthly_plan_id: Optional[uuid.UUID] = None
    segment_id: Optional[uuid.UUID] = None
    offer_id: Optional[uuid.UUID] = None
    creative_id: Optional[uuid.UUID] = None
    planned_start_date: Optional[datetime.date] = None
    planned_end_date: Optional[datetime.date] = None
    actual_start_date: Optional[datetime.date] = None
    actual_end_date: Optional[datetime.date] = None
    channels: list[str] = []
    objective_ids: list[str] = []
    forecast: dict = {}
    priority: int = 3
    notes: Optional[str] = None
    tags: list[str] = []
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


class SupportTaskCreate(BaseModel):
    team: str
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[datetime.date] = None
    status: str = "pending"
    completion_pct: int = 0
    comments: Optional[str] = None


class SupportTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[datetime.date] = None
    status: Optional[str] = None
    completion_pct: Optional[int] = None
    comments: Optional[str] = None


class SupportTaskRead(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    team: str
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[datetime.date] = None
    status: str
    completion_pct: int

    model_config = {"from_attributes": True}


class DependencyCreate(BaseModel):
    depends_on_campaign_id: Optional[uuid.UUID] = None
    dependency_type: str
    description: Optional[str] = None


class DependencyRead(BaseModel):
    id: uuid.UUID
    dependent_campaign_id: uuid.UUID
    depends_on_campaign_id: Optional[uuid.UUID] = None
    dependency_type: str
    description: Optional[str] = None
    is_resolved: bool

    model_config = {"from_attributes": True}


class ActualResultCreate(BaseModel):
    actual_reach: int = 0
    actual_activations: int = 0
    actual_revenue: float = 0.0
    actual_conversion_rate: float = 0.0
    actual_churn_reduction: float = 0.0
    raw_data: dict = {}
    notes: Optional[str] = None


class ActualResultRead(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    actual_reach: int
    actual_activations: int
    actual_revenue: float
    actual_conversion_rate: float
    actual_churn_reduction: float
    notes: Optional[str] = None

    model_config = {"from_attributes": True}

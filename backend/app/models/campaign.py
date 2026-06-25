import uuid
import datetime
from sqlalchemy import String, ForeignKey, Text, JSON, Boolean, Integer, Float, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin, SoftDeleteMixin


class Campaign(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("operators.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    monthly_plan_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("monthly_plans.id"), nullable=True, index=True)
    segment_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("segments.id"), nullable=True)
    offer_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("offers.id"), nullable=True)
    creative_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("creatives.id"), nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Lifecycle status
    status: Mapped[str] = mapped_column(
        String(50),
        default="draft",
        nullable=False,
        index=True,
    )
    # Valid: draft | planned | ready | scheduled | executing | completed | results_imported | closed

    # Timing
    planned_start_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    planned_end_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    actual_start_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    actual_end_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)

    # Channels (list of channel strings)
    channels: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # Objectives contributions (list of objective_ids this campaign contributes to)
    objective_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # KPI Forecast (stored as structured JSON for flexibility)
    forecast: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    """
    forecast structure:
    {
      "estimated_reach": 0,
      "expected_conversion_pct": 0.0,
      "monthly_arpu": 0.0,
      "expected_churn_reduction": 0.0,
      "expected_retention": 0.0,
      "expected_upsell": 0.0,
      # calculated outputs:
      "expected_activations": 0,
      "expected_revenue": 0.0,
      "objective_contribution_pct": 0.0
    }
    """

    priority: Mapped[int] = mapped_column(Integer, default=3, nullable=False)  # 1=Critical, 2=High, 3=Medium, 4=Low
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # Relationships
    operator: Mapped["Operator"] = relationship(back_populates="campaigns")
    product: Mapped["Product | None"] = relationship(back_populates="campaigns")
    monthly_plan: Mapped["MonthlyPlan | None"] = relationship(back_populates="campaigns")
    segment: Mapped["Segment | None"] = relationship()
    offer: Mapped["Offer | None"] = relationship()
    creative: Mapped["Creative | None"] = relationship()
    created_by: Mapped["User | None"] = relationship()
    journeys: Mapped[list["Journey"]] = relationship(back_populates="campaign")
    support_tasks: Mapped[list["CampaignSupportTask"]] = relationship(back_populates="campaign", cascade="all, delete-orphan")
    actuals: Mapped[list["CampaignActual"]] = relationship(back_populates="campaign", cascade="all, delete-orphan")

    # Dependencies where this campaign is the dependent
    dependencies: Mapped[list["CampaignDependency"]] = relationship(
        back_populates="dependent_campaign",
        foreign_keys="CampaignDependency.dependent_campaign_id",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Campaign {self.name} [{self.status}]>"


class CampaignDependency(Base, TimestampMixin):
    __tablename__ = "campaign_dependencies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dependent_campaign_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    depends_on_campaign_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=True)
    dependency_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # Types: creative_ready | offer_configured | content_available | ussd_updated |
    #        pricing_activated | partner_approval | campaign_completed | other
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    dependent_campaign: Mapped["Campaign"] = relationship(
        back_populates="dependencies",
        foreign_keys=[dependent_campaign_id],
    )
    depends_on_campaign: Mapped["Campaign | None"] = relationship(
        foreign_keys=[depends_on_campaign_id],
    )


class CampaignSupportTask(Base, TimestampMixin):
    __tablename__ = "campaign_support_tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    team: Mapped[str] = mapped_column(String(100), nullable=False)
    # Teams: marketing | product | technical_ops | content | campaign_ops | partners | other
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    due_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    # pending | in_progress | completed | blocked
    completion_pct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    campaign: Mapped["Campaign"] = relationship(back_populates="support_tasks")


class CampaignActual(Base, TimestampMixin):
    """Actual results imported after campaign completion."""
    __tablename__ = "campaign_actuals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    actual_reach: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    actual_activations: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    actual_revenue: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    actual_conversion_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    actual_churn_reduction: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    raw_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    imported_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    campaign: Mapped["Campaign"] = relationship(back_populates="actuals")
    imported_by: Mapped["User | None"] = relationship()

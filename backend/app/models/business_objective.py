import uuid
from sqlalchemy import String, ForeignKey, Text, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin


class BusinessObjective(Base, TimestampMixin):
    __tablename__ = "business_objectives"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("operators.id", ondelete="CASCADE"), nullable=False, index=True)
    monthly_plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("monthly_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    objective_type: Mapped[str] = mapped_column(String(100), nullable=False)  # activations, revenue, churn, upsell, renewal, other
    target_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    target_unit: Mapped[str] = mapped_column(String(50), default="count", nullable=False)  # count, %, currency
    current_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    weight: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # priority weight

    monthly_plan: Mapped["MonthlyPlan"] = relationship(back_populates="business_objectives")

    def __repr__(self) -> str:
        return f"<BusinessObjective {self.name}>"

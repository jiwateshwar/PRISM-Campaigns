import uuid
from sqlalchemy import String, Boolean, ForeignKey, Text, JSON, Date, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin, SoftDeleteMixin
import datetime


class MonthlyPlan(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "monthly_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("operators.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    month: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)

    # Aggregate objectives
    target_activations: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    target_revenue: Mapped[float] = mapped_column(default=0.0, nullable=False)
    target_churn_reduction: Mapped[float] = mapped_column(default=0.0, nullable=False)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    operator: Mapped["Operator"] = relationship(back_populates="monthly_plans")
    product: Mapped["Product | None"] = relationship()
    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="monthly_plan")
    business_objectives: Mapped[list["BusinessObjective"]] = relationship(back_populates="monthly_plan", cascade="all, delete-orphan")
    created_by: Mapped["User | None"] = relationship()

    def __repr__(self) -> str:
        return f"<MonthlyPlan {self.name} {self.month}>"

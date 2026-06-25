import uuid
from sqlalchemy import String, ForeignKey, Text, Float, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin, SoftDeleteMixin


class Offer(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "offers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("operators.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    validity_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    expected_monthly_arpu: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    expected_conversion_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # 0-100 %
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)  # active, inactive, archived
    tags: Mapped[list] = mapped_column(String(500), default="", nullable=False)  # comma-separated
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    operator: Mapped["Operator"] = relationship(back_populates="offers")
    product: Mapped["Product | None"] = relationship()

    def __repr__(self) -> str:
        return f"<Offer {self.name}>"

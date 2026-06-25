import uuid
import datetime
from sqlalchemy import String, ForeignKey, Integer, Date, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin


class ChannelCapacity(Base, TimestampMixin):
    __tablename__ = "channel_capacities"
    __table_args__ = (
        UniqueConstraint("operator_id", "channel", "month", name="uq_capacity_operator_channel_month"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("operators.id", ondelete="CASCADE"), nullable=False, index=True)
    channel: Mapped[str] = mapped_column(String(50), nullable=False)  # sms, whatsapp, obd, ussd, ivr, push
    month: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    daily_capacity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    monthly_capacity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    allocated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    operator: Mapped["Operator"] = relationship(back_populates="channel_capacities")

    @property
    def utilization_pct(self) -> float:
        if self.monthly_capacity == 0:
            return 0.0
        return round((self.allocated / self.monthly_capacity) * 100, 2)

    @property
    def is_over_capacity(self) -> bool:
        return self.allocated > self.monthly_capacity

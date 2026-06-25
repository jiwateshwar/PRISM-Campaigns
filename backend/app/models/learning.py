import uuid
from sqlalchemy import String, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy import ARRAY, String as SAString
from app.db.base import Base, TimestampMixin


class LearningEntry(Base, TimestampMixin):
    __tablename__ = "learning_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("operators.id", ondelete="CASCADE"), nullable=False, index=True)
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True)

    category: Mapped[str] = mapped_column(String(100), nullable=False)
    # lesson | best_practice | conversion_data | journey_performance | offer_performance | creative_performance

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    insight: Mapped[str] = mapped_column(Text, nullable=False)

    # Structured performance data for recommendation engine
    performance_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    """
    {
      "channel": "sms",
      "segment_type": "high_value",
      "conversion_rate": 12.5,
      "arpu": 2.5,
      "reach": 50000,
      "activations": 6250,
      "product": "CallerTunez",
      "offer_name": "...",
      "journey_type": "winback"
    }
    """

    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    is_public: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    campaign: Mapped["Campaign | None"] = relationship()
    created_by: Mapped["User | None"] = relationship()

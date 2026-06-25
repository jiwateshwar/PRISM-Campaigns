import uuid
from sqlalchemy import String, ForeignKey, Text, Integer, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin, SoftDeleteMixin

CHANNEL_TYPES = ["sms", "whatsapp", "ussd", "obd", "ivr", "push", "email", "rich_media", "banner"]


class Creative(Base, TimestampMixin, SoftDeleteMixin):
    """
    Creative library — cross-operator with telco/language tagging.
    operator_id nullable: None means globally shared creative.
    """
    __tablename__ = "creatives"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Nullable so a creative can be operator-specific OR globally shared
    operator_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("operators.id", ondelete="SET NULL"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Which channels this creative supports — list of channel type strings
    channels: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # Per-channel content: {"sms": {"body": "..."}, "whatsapp": {"body": "...", "media_url": "..."}}
    content: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Telco and language metadata
    telco_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)

    current_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    is_shared: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    versions: Mapped[list["CreativeVersion"]] = relationship(back_populates="creative", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Creative {self.name} v{self.current_version}>"


class CreativeVersion(Base, TimestampMixin):
    __tablename__ = "creative_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creative_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("creatives.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    channels: Mapped[list] = mapped_column(JSON, nullable=False)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)
    change_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    creative: Mapped["Creative"] = relationship(back_populates="versions")
    created_by: Mapped["User | None"] = relationship()

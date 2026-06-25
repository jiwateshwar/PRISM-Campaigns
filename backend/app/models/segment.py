import uuid
from sqlalchemy import String, ForeignKey, Text, Integer, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin, SoftDeleteMixin


class Segment(Base, TimestampMixin, SoftDeleteMixin):
    """
    Segment library — stores ONLY the business definition of an audience.
    No customer identities (MSISDN, phone numbers, IDs) are ever stored here.
    """
    __tablename__ = "segments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("operators.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Business rules as structured JSON — defines WHO this segment is without storing identities
    business_rules: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Audience estimates — counts only, no actual identities
    estimated_audience_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    eligible_audience_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    current_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    operator: Mapped["Operator"] = relationship(back_populates="segments")
    versions: Mapped[list["SegmentVersion"]] = relationship(back_populates="segment", cascade="all, delete-orphan", order_by="SegmentVersion.version_number.desc()")

    def __repr__(self) -> str:
        return f"<Segment {self.name} v{self.current_version}>"


class SegmentVersion(Base, TimestampMixin):
    __tablename__ = "segment_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    segment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("segments.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    business_rules: Mapped[dict] = mapped_column(JSON, nullable=False)
    estimated_audience_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    eligible_audience_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    change_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    segment: Mapped["Segment"] = relationship(back_populates="versions")
    created_by: Mapped["User | None"] = relationship()

import uuid
from sqlalchemy import String, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin, SoftDeleteMixin


class Operator(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "operators"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC", nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    settings: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    user_roles: Mapped[list["UserOperatorRole"]] = relationship(back_populates="operator", cascade="all, delete-orphan")
    products: Mapped[list["Product"]] = relationship(back_populates="operator", cascade="all, delete-orphan")
    monthly_plans: Mapped[list["MonthlyPlan"]] = relationship(back_populates="operator")
    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="operator")
    segments: Mapped[list["Segment"]] = relationship(back_populates="operator")
    offers: Mapped[list["Offer"]] = relationship(back_populates="operator")
    channel_capacities: Mapped[list["ChannelCapacity"]] = relationship(back_populates="operator")

    def __repr__(self) -> str:
        return f"<Operator {self.name}>"

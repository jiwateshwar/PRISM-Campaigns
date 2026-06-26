"""Initial schema

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Operators
    op.create_table(
        "operators",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("country", sa.String(100)),
        sa.Column("timezone", sa.String(100), server_default="UTC"),
        sa.Column("currency", sa.String(10), server_default="USD"),
        sa.Column("logo_url", sa.Text()),
        sa.Column("primary_color", sa.String(20), server_default="#0A7EA4"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("settings", postgresql.JSONB(), server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )

    # Users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("full_name", sa.String(255)),
        sa.Column("hashed_password", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("is_super_admin", sa.Boolean(), server_default="false"),
        sa.Column("avatar_url", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )

    # User operator roles
    userrole_enum = postgresql.ENUM('SUPER_ADMIN', 'OPERATOR_ADMIN', 'PLANNER', 'VIEWER', name='userrole')
    userrole_enum.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "user_operator_roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("operator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("operators.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.Enum('SUPER_ADMIN', 'OPERATOR_ADMIN', 'PLANNER', 'VIEWER', name='userrole'), nullable=False, server_default="VIEWER"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "operator_id", name="uq_user_operator"),
    )

    # Products
    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("operator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("operators.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("category", sa.String(100)),
        sa.Column("icon", sa.String(10)),
        sa.Column("color", sa.String(20)),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("metadata", postgresql.JSONB(), server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )

    # Monthly plans
    op.create_table(
        "monthly_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("operator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("operators.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="SET NULL")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("month", sa.Date(), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("status", sa.String(50), server_default="draft"),
        sa.Column("target_activations", sa.Integer(), server_default="0"),
        sa.Column("target_revenue", sa.Numeric(18, 2), server_default="0"),
        sa.Column("target_churn_reduction", sa.Numeric(5, 2)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )

    # Business objectives
    op.create_table(
        "business_objectives",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("operator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("operators.id", ondelete="CASCADE"), nullable=False),
        sa.Column("monthly_plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("monthly_plans.id", ondelete="CASCADE")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("objective_type", sa.String(100)),
        sa.Column("target_value", sa.Numeric(18, 2)),
        sa.Column("target_unit", sa.String(50)),
        sa.Column("current_value", sa.Numeric(18, 2)),
        sa.Column("weight", sa.Numeric(5, 2), server_default="1.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Segments (no PII - business rules only)
    op.create_table(
        "segments",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("operator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("operators.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("business_rules", postgresql.JSONB(), server_default="{}"),
        sa.Column("estimated_audience_size", sa.Integer(), server_default="0"),
        sa.Column("eligible_audience_size", sa.Integer(), server_default="0"),
        sa.Column("current_version", sa.Integer(), server_default="1"),
        sa.Column("owner", sa.String(255)),
        sa.Column("tags", postgresql.JSONB(), server_default="[]"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "segment_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("segment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("segments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("business_rules", postgresql.JSONB(), server_default="{}"),
        sa.Column("estimated_audience_size", sa.Integer()),
        sa.Column("eligible_audience_size", sa.Integer()),
        sa.Column("change_notes", sa.Text()),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Offers
    op.create_table(
        "offers",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("operator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("operators.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="SET NULL")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("price", sa.Numeric(10, 4), server_default="0"),
        sa.Column("currency", sa.String(10), server_default="USD"),
        sa.Column("validity_days", sa.Integer(), server_default="30"),
        sa.Column("expected_monthly_arpu", sa.Numeric(10, 4), server_default="0"),
        sa.Column("expected_conversion_rate", sa.Numeric(7, 4), server_default="0"),
        sa.Column("status", sa.String(50), server_default="active"),
        sa.Column("tags", sa.String(500), server_default=""),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )

    # Creatives (operator_id nullable → global shared if is_shared=True)
    op.create_table(
        "creatives",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("operator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("operators.id", ondelete="CASCADE")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("channels", postgresql.JSONB(), server_default="[]"),
        sa.Column("content", postgresql.JSONB(), server_default="{}"),
        sa.Column("telco_name", sa.String(255)),
        sa.Column("language", sa.String(100), server_default="English"),
        sa.Column("current_version", sa.Integer(), server_default="1"),
        sa.Column("status", sa.String(50), server_default="draft"),
        sa.Column("tags", postgresql.JSONB(), server_default="[]"),
        sa.Column("is_shared", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "creative_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("creative_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("creatives.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("channels", postgresql.JSONB(), server_default="[]"),
        sa.Column("content", postgresql.JSONB(), server_default="{}"),
        sa.Column("change_notes", sa.Text()),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Journey templates
    op.create_table(
        "journey_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("category", sa.String(100)),
        sa.Column("nodes", postgresql.JSONB(), server_default="[]"),
        sa.Column("edges", postgresql.JSONB(), server_default="[]"),
        sa.Column("viewport", postgresql.JSONB(), server_default="{}"),
        sa.Column("thumbnail_url", sa.Text()),
        sa.Column("usage_count", sa.Integer(), server_default="0"),
        sa.Column("tags", postgresql.JSONB(), server_default="[]"),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )

    # Journeys
    op.create_table(
        "journeys",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("operator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("operators.id", ondelete="CASCADE"), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True)),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("status", sa.String(50), server_default="draft"),
        sa.Column("nodes", postgresql.JSONB(), server_default="[]"),
        sa.Column("edges", postgresql.JSONB(), server_default="[]"),
        sa.Column("viewport", postgresql.JSONB(), server_default="{}"),
        sa.Column("is_template", sa.Boolean(), server_default="false"),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journey_templates.id", ondelete="SET NULL")),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )

    # Campaigns
    op.create_table(
        "campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("operator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("operators.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="SET NULL")),
        sa.Column("monthly_plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("monthly_plans.id", ondelete="SET NULL")),
        sa.Column("segment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("segments.id", ondelete="SET NULL")),
        sa.Column("offer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("offers.id", ondelete="SET NULL")),
        sa.Column("creative_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("creatives.id", ondelete="SET NULL")),
        sa.Column("journey_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journeys.id", ondelete="SET NULL")),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("status", sa.String(50), server_default="draft"),
        sa.Column("planned_start_date", sa.Date()),
        sa.Column("planned_end_date", sa.Date()),
        sa.Column("actual_start_date", sa.Date()),
        sa.Column("actual_end_date", sa.Date()),
        sa.Column("channels", postgresql.JSONB(), server_default="[]"),
        sa.Column("objective_ids", postgresql.JSONB(), server_default="[]"),
        sa.Column("forecast", postgresql.JSONB(), server_default="{}"),
        sa.Column("priority", sa.Integer(), server_default="2"),
        sa.Column("notes", sa.Text()),
        sa.Column("tags", postgresql.JSONB(), server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )

    # Campaign support tasks
    op.create_table(
        "campaign_support_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("team", sa.String(255), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("owner", sa.String(255)),
        sa.Column("due_date", sa.Date()),
        sa.Column("status", sa.String(50), server_default="pending"),
        sa.Column("completion_pct", sa.Integer(), server_default="0"),
        sa.Column("comments", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Campaign actuals
    op.create_table(
        "campaign_actuals",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("actual_reach", sa.Integer(), server_default="0"),
        sa.Column("actual_activations", sa.Integer(), nullable=False),
        sa.Column("actual_revenue", sa.Numeric(18, 2), server_default="0"),
        sa.Column("actual_conversion_rate", sa.Numeric(7, 4)),
        sa.Column("actual_churn_reduction", sa.Numeric(7, 4)),
        sa.Column("raw_data", postgresql.JSONB(), server_default="{}"),
        sa.Column("imported_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Campaign dependencies
    op.create_table(
        "campaign_dependencies",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("dependent_campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("depends_on_campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campaigns.id", ondelete="CASCADE")),
        sa.Column("dependency_type", sa.String(50), server_default="sequential"),
        sa.Column("is_resolved", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Channel capacity
    op.create_table(
        "channel_capacities",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("operator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("operators.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel", sa.String(50), nullable=False),
        sa.Column("month", sa.Date(), nullable=False),
        sa.Column("daily_capacity", sa.Integer(), server_default="0"),
        sa.Column("monthly_capacity", sa.Integer(), nullable=False),
        sa.Column("allocated", sa.Integer(), server_default="0"),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("operator_id", "channel", "month", name="uq_channel_capacity"),
    )

    # Learning entries
    op.create_table(
        "learning_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("operator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("operators.id", ondelete="CASCADE"), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campaigns.id", ondelete="SET NULL")),
        sa.Column("category", sa.String(100)),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("insight", sa.Text(), nullable=False),
        sa.Column("performance_data", postgresql.JSONB(), server_default="{}"),
        sa.Column("tags", postgresql.JSONB(), server_default="[]"),
        sa.Column("is_public", sa.Boolean(), server_default="false"),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Recommendations
    op.create_table(
        "recommendations",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("operator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("operators.id", ondelete="CASCADE"), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campaigns.id", ondelete="SET NULL")),
        sa.Column("recommendation_type", sa.String(100)),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("rationale", sa.Text()),
        sa.Column("confidence_score", sa.Numeric(4, 3)),
        sa.Column("supporting_data", postgresql.JSONB(), server_default="{}"),
        sa.Column("status", sa.String(50), server_default="pending"),
        sa.Column("dismissed_reason", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Audit log
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("operator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("operators.id", ondelete="SET NULL")),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(100)),
        sa.Column("resource_id", sa.String(255)),
        sa.Column("changes", postgresql.JSONB(), server_default="{}"),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("user_agent", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Indexes for common queries
    op.create_index("ix_campaigns_operator_status", "campaigns", ["operator_id", "status"])
    op.create_index("ix_campaigns_monthly_plan", "campaigns", ["monthly_plan_id"])
    op.create_index("ix_segments_operator", "segments", ["operator_id"])
    op.create_index("ix_offers_operator", "offers", ["operator_id"])
    op.create_index("ix_creatives_operator", "creatives", ["operator_id"])
    op.create_index("ix_journeys_operator", "journeys", ["operator_id"])
    op.create_index("ix_audit_logs_user", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_operator", "audit_logs", ["operator_id"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("recommendations")
    op.drop_table("learning_entries")
    op.drop_table("channel_capacities")
    op.drop_table("campaign_dependencies")
    op.drop_table("campaign_actuals")
    op.drop_table("campaign_support_tasks")
    op.drop_table("campaigns")
    op.drop_table("journeys")
    op.drop_table("journey_templates")
    op.drop_table("creative_versions")
    op.drop_table("creatives")
    op.drop_table("offers")
    op.drop_table("segment_versions")
    op.drop_table("segments")
    op.drop_table("business_objectives")
    op.drop_table("monthly_plans")
    op.drop_table("products")
    op.drop_table("user_operator_roles")
    op.drop_table("users")
    op.drop_table("operators")

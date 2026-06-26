"""
Seed script — bootstraps superadmin and sample data on first run.
Safe to re-run: skips existing records.
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserOperatorRole, UserRole
from app.models.operator import Operator
from app.models.product import Product
from app.models.segment import Segment, SegmentVersion
from app.models.offer import Offer
from app.models.journey import JourneyTemplate
from app.models.channel_capacity import ChannelCapacity
from app.core.security import hash_password
from app.core.config import settings
import uuid
import datetime


async def seed():
    async with AsyncSessionLocal() as db:
        # ─── Super Admin ──────────────────────────────────────────────────────
        existing = await db.execute(select(User).where(User.email == settings.FIRST_SUPERUSER_EMAIL))
        if not existing.scalar_one_or_none():
            admin = User(
                email=settings.FIRST_SUPERUSER_EMAIL,
                full_name=settings.FIRST_SUPERUSER_NAME,
                hashed_password=hash_password(settings.FIRST_SUPERUSER_PASSWORD),
                is_super_admin=True,
                is_active=True,
            )
            db.add(admin)
            await db.flush()
            print(f"✓ Created superadmin: {settings.FIRST_SUPERUSER_EMAIL}")
        else:
            result = await db.execute(select(User).where(User.email == settings.FIRST_SUPERUSER_EMAIL))
            admin = result.scalar_one()
            print(f"  Superadmin already exists: {settings.FIRST_SUPERUSER_EMAIL}")

        # ─── Demo Operator: Airtel Ghana ──────────────────────────────────────
        existing_op = await db.execute(select(Operator).where(Operator.slug == "airtel-ghana"))
        if not existing_op.scalar_one_or_none():
            op1 = Operator(
                name="Airtel Ghana",
                slug="airtel-ghana",
                country="Ghana",
                timezone="Africa/Accra",
                currency="GHS",
                primary_color="#E40000",
                is_active=True,
                settings={},
            )
            db.add(op1)
            await db.flush()
            print(f"✓ Created operator: Airtel Ghana")

            # Assign admin to operator
            role = UserOperatorRole(
                user_id=admin.id,
                operator_id=op1.id,
                role=UserRole.OPERATOR_ADMIN,
            )
            db.add(role)

            # Products
            products_data = [
                {"name": "CallerTunez", "code": "RBT", "category": "RBT", "icon": "music", "color": "#E40000"},
                {"name": "Music OTT", "code": "MOTT", "category": "OTT", "icon": "headphones", "color": "#7C3AED"},
                {"name": "Video OTT", "code": "VOTT", "category": "OTT", "icon": "video", "color": "#DC2626"},
                {"name": "Gaming", "code": "GAME", "category": "Gaming", "icon": "gamepad", "color": "#059669"},
                {"name": "CPaaS Services", "code": "CPAAS", "category": "CPaaS", "icon": "cloud", "color": "#0891B2"},
            ]
            created_products = []
            for pd in products_data:
                p = Product(operator_id=op1.id, **pd, description=f"{pd['name']} product for Airtel Ghana")
                db.add(p)
                created_products.append(p)
            await db.flush()
            print(f"✓ Created {len(products_data)} products for Airtel Ghana")

            # Segments
            segments_data = [
                {
                    "name": "High Value Subscribers",
                    "description": "Subscribers with ARPU > 5 USD, tenure > 12 months",
                    "business_rules": {
                        "arpu_min": 5.0,
                        "tenure_months_min": 12,
                        "status": "active",
                    },
                    "estimated_audience_size": 250000,
                    "eligible_audience_size": 220000,
                    "owner": "Marketing Team",
                },
                {
                    "name": "Churned Subscribers - 90 Days",
                    "description": "Subscribers who churned in the last 90 days",
                    "business_rules": {
                        "churn_window_days": 90,
                        "status": "churned",
                    },
                    "estimated_audience_size": 45000,
                    "eligible_audience_size": 40000,
                    "owner": "Retention Team",
                },
                {
                    "name": "RBT Non-Subscribers",
                    "description": "Active subscribers not on any RBT plan",
                    "business_rules": {
                        "rbt_subscriber": False,
                        "status": "active",
                        "data_user": True,
                    },
                    "estimated_audience_size": 800000,
                    "eligible_audience_size": 750000,
                    "owner": "CallerTunez Team",
                },
                {
                    "name": "Renewal Risk Subscribers",
                    "description": "Active subscribers whose plan expires within 7 days",
                    "business_rules": {
                        "plan_expires_days": 7,
                        "status": "active",
                    },
                    "estimated_audience_size": 30000,
                    "eligible_audience_size": 28000,
                    "owner": "Retention Team",
                },
            ]
            for sd in segments_data:
                seg = Segment(operator_id=op1.id, **sd, tags=[])
                db.add(seg)
                await db.flush()
                ver = SegmentVersion(
                    segment_id=seg.id,
                    version_number=1,
                    business_rules=seg.business_rules,
                    estimated_audience_size=seg.estimated_audience_size,
                    eligible_audience_size=seg.eligible_audience_size,
                    change_notes="Initial version",
                    created_by_id=admin.id,
                )
                db.add(ver)
            print(f"✓ Created {len(segments_data)} segments for Airtel Ghana")

            # Offers
            offers_data = [
                {
                    "name": "RBT Basic - 30 Days",
                    "description": "Basic CallerTunez subscription for 30 days",
                    "price": 1.50,
                    "currency": "USD",
                    "validity_days": 30,
                    "expected_monthly_arpu": 1.50,
                    "expected_conversion_rate": 12.5,
                    "status": "active",
                },
                {
                    "name": "RBT Premium - 30 Days",
                    "description": "Premium CallerTunez with unlimited songs for 30 days",
                    "price": 3.00,
                    "currency": "USD",
                    "validity_days": 30,
                    "expected_monthly_arpu": 3.00,
                    "expected_conversion_rate": 8.0,
                    "status": "active",
                },
                {
                    "name": "Music OTT - Weekly",
                    "description": "Music streaming 7-day pass",
                    "price": 0.75,
                    "currency": "USD",
                    "validity_days": 7,
                    "expected_monthly_arpu": 3.00,
                    "expected_conversion_rate": 15.0,
                    "status": "active",
                },
                {
                    "name": "Winback Special - 50% Off",
                    "description": "Exclusive winback offer for churned subscribers",
                    "price": 0.75,
                    "currency": "USD",
                    "validity_days": 30,
                    "expected_monthly_arpu": 1.50,
                    "expected_conversion_rate": 20.0,
                    "status": "active",
                },
            ]
            for od in offers_data:
                o = Offer(operator_id=op1.id, **od, tags="")
                db.add(o)
            print(f"✓ Created {len(offers_data)} offers for Airtel Ghana")

            # Channel capacities for current month
            today = datetime.date.today()
            month_start = today.replace(day=1)
            channels_caps = [
                {"channel": "sms", "daily_capacity": 500000, "monthly_capacity": 15000000},
                {"channel": "whatsapp", "daily_capacity": 100000, "monthly_capacity": 3000000},
                {"channel": "obd", "daily_capacity": 50000, "monthly_capacity": 1500000},
                {"channel": "ussd", "daily_capacity": 200000, "monthly_capacity": 6000000},
                {"channel": "push", "daily_capacity": 300000, "monthly_capacity": 9000000},
                {"channel": "ivr", "daily_capacity": 20000, "monthly_capacity": 600000},
            ]
            for cc in channels_caps:
                cap = ChannelCapacity(operator_id=op1.id, month=month_start, allocated=0, **cc)
                db.add(cap)
            print(f"✓ Created channel capacities for Airtel Ghana")

            await db.flush()
        else:
            print(f"  Operator Airtel Ghana already exists")

        # ─── Demo Operator: MTN Uganda ─────────────────────────────────────────
        existing_op2 = await db.execute(select(Operator).where(Operator.slug == "mtn-uganda"))
        if not existing_op2.scalar_one_or_none():
            op2 = Operator(
                name="MTN Uganda",
                slug="mtn-uganda",
                country="Uganda",
                timezone="Africa/Kampala",
                currency="UGX",
                primary_color="#FFCC00",
                is_active=True,
                settings={},
            )
            db.add(op2)
            await db.flush()
            print(f"✓ Created operator: MTN Uganda")

            role2 = UserOperatorRole(
                user_id=admin.id,
                operator_id=op2.id,
                role=UserRole.OPERATOR_ADMIN,
            )
            db.add(role2)

            # Products for MTN Uganda
            mtn_products = [
                {"name": "CallerTunez", "code": "RBT", "category": "RBT", "icon": "music", "color": "#FFCC00"},
                {"name": "Video OTT", "code": "VOTT", "category": "OTT", "icon": "video", "color": "#DC2626"},
                {"name": "Lifestyle Services", "code": "LIFE", "category": "Lifestyle", "icon": "heart", "color": "#EC4899"},
            ]
            for pd in mtn_products:
                p = Product(operator_id=op2.id, **pd, description=f"{pd['name']} product for MTN Uganda")
                db.add(p)
            await db.flush()
            print(f"✓ Created products for MTN Uganda")

        # ─── Journey Templates ─────────────────────────────────────────────────
        existing_tmpl = await db.execute(select(JourneyTemplate).limit(1))
        if not existing_tmpl.scalars().first():
            templates = [
                {
                    "name": "Customer Acquisition",
                    "description": "Multi-channel campaign to acquire new subscribers",
                    "category": "acquisition",
                    "tags": ["acquisition", "new_subscriber"],
                    "nodes": [
                        {"id": "start", "type": "start", "position": {"x": 100, "y": 200}, "data": {"label": "Start"}},
                        {"id": "sms1", "type": "sms", "position": {"x": 300, "y": 200}, "data": {"label": "Welcome SMS", "delay": 0}},
                        {"id": "wait1", "type": "wait", "position": {"x": 500, "y": 200}, "data": {"label": "Wait 2 Days", "duration": 2, "unit": "days"}},
                        {"id": "decision1", "type": "decision", "position": {"x": 700, "y": 200}, "data": {"label": "Subscribed?"}},
                        {"id": "push1", "type": "push", "position": {"x": 900, "y": 100}, "data": {"label": "Push Notification"}},
                        {"id": "exit_yes", "type": "exit", "position": {"x": 1100, "y": 100}, "data": {"label": "Converted"}},
                        {"id": "exit_no", "type": "exit", "position": {"x": 1100, "y": 300}, "data": {"label": "Not Converted"}},
                    ],
                    "edges": [
                        {"id": "e1", "source": "start", "target": "sms1"},
                        {"id": "e2", "source": "sms1", "target": "wait1"},
                        {"id": "e3", "source": "wait1", "target": "decision1"},
                        {"id": "e4", "source": "decision1", "target": "push1", "label": "No"},
                        {"id": "e5", "source": "decision1", "target": "exit_yes", "label": "Yes"},
                        {"id": "e6", "source": "push1", "target": "exit_no"},
                    ],
                    "viewport": {"x": 0, "y": 0, "zoom": 1},
                },
                {
                    "name": "Winback Campaign",
                    "description": "Re-engage churned subscribers with special offer",
                    "category": "winback",
                    "tags": ["winback", "churn", "retention"],
                    "nodes": [
                        {"id": "start", "type": "start", "position": {"x": 100, "y": 200}, "data": {"label": "Start"}},
                        {"id": "sms1", "type": "sms", "position": {"x": 300, "y": 200}, "data": {"label": "Winback SMS Offer"}},
                        {"id": "wait1", "type": "wait", "position": {"x": 500, "y": 200}, "data": {"label": "Wait 3 Days", "duration": 3, "unit": "days"}},
                        {"id": "decision1", "type": "decision", "position": {"x": 700, "y": 200}, "data": {"label": "Re-subscribed?"}},
                        {"id": "obd1", "type": "obd", "position": {"x": 900, "y": 300}, "data": {"label": "OBD Call"}},
                        {"id": "exit_won", "type": "exit", "position": {"x": 1100, "y": 100}, "data": {"label": "Won Back"}},
                        {"id": "exit_lost", "type": "exit", "position": {"x": 1100, "y": 300}, "data": {"label": "Lost"}},
                    ],
                    "edges": [
                        {"id": "e1", "source": "start", "target": "sms1"},
                        {"id": "e2", "source": "sms1", "target": "wait1"},
                        {"id": "e3", "source": "wait1", "target": "decision1"},
                        {"id": "e4", "source": "decision1", "target": "exit_won", "label": "Yes"},
                        {"id": "e5", "source": "decision1", "target": "obd1", "label": "No"},
                        {"id": "e6", "source": "obd1", "target": "exit_lost"},
                    ],
                    "viewport": {"x": 0, "y": 0, "zoom": 1},
                },
                {
                    "name": "Renewal Reminder",
                    "description": "Remind subscribers approaching expiry to renew",
                    "category": "renewal",
                    "tags": ["renewal", "retention"],
                    "nodes": [
                        {"id": "start", "type": "start", "position": {"x": 100, "y": 200}, "data": {"label": "7 Days Before Expiry"}},
                        {"id": "push1", "type": "push", "position": {"x": 300, "y": 200}, "data": {"label": "Renewal Push"}},
                        {"id": "wait1", "type": "wait", "position": {"x": 500, "y": 200}, "data": {"label": "Wait 3 Days"}},
                        {"id": "decision1", "type": "decision", "position": {"x": 700, "y": 200}, "data": {"label": "Renewed?"}},
                        {"id": "sms1", "type": "sms", "position": {"x": 900, "y": 300}, "data": {"label": "Final Reminder SMS"}},
                        {"id": "exit_renewed", "type": "exit", "position": {"x": 1100, "y": 100}, "data": {"label": "Renewed"}},
                        {"id": "exit_expired", "type": "exit", "position": {"x": 1100, "y": 300}, "data": {"label": "Expired"}},
                    ],
                    "edges": [
                        {"id": "e1", "source": "start", "target": "push1"},
                        {"id": "e2", "source": "push1", "target": "wait1"},
                        {"id": "e3", "source": "wait1", "target": "decision1"},
                        {"id": "e4", "source": "decision1", "target": "exit_renewed", "label": "Yes"},
                        {"id": "e5", "source": "decision1", "target": "sms1", "label": "No"},
                        {"id": "e6", "source": "sms1", "target": "exit_expired"},
                    ],
                    "viewport": {"x": 0, "y": 0, "zoom": 1},
                },
                {
                    "name": "Upsell Journey",
                    "description": "Upsell existing subscribers to premium plans",
                    "category": "upsell",
                    "tags": ["upsell", "premium"],
                    "nodes": [
                        {"id": "start", "type": "start", "position": {"x": 100, "y": 200}, "data": {"label": "Start"}},
                        {"id": "sms1", "type": "sms", "position": {"x": 300, "y": 200}, "data": {"label": "Premium Offer SMS"}},
                        {"id": "wait1", "type": "wait", "position": {"x": 500, "y": 200}, "data": {"label": "Wait 2 Days"}},
                        {"id": "decision1", "type": "decision", "position": {"x": 700, "y": 200}, "data": {"label": "Upgraded?"}},
                        {"id": "exit_yes", "type": "exit", "position": {"x": 900, "y": 100}, "data": {"label": "Upsold"}},
                        {"id": "exit_no", "type": "exit", "position": {"x": 900, "y": 300}, "data": {"label": "Declined"}},
                    ],
                    "edges": [
                        {"id": "e1", "source": "start", "target": "sms1"},
                        {"id": "e2", "source": "sms1", "target": "wait1"},
                        {"id": "e3", "source": "wait1", "target": "decision1"},
                        {"id": "e4", "source": "decision1", "target": "exit_yes", "label": "Yes"},
                        {"id": "e5", "source": "decision1", "target": "exit_no", "label": "No"},
                    ],
                    "viewport": {"x": 0, "y": 0, "zoom": 1},
                },
                {
                    "name": "Football Season Campaign",
                    "description": "Multi-channel campaign for football season promotions",
                    "category": "seasonal",
                    "tags": ["football", "seasonal", "sports"],
                    "nodes": [
                        {"id": "start", "type": "start", "position": {"x": 100, "y": 200}, "data": {"label": "Campaign Start"}},
                        {"id": "sms1", "type": "sms", "position": {"x": 300, "y": 100}, "data": {"label": "Football SMS Blast"}},
                        {"id": "push1", "type": "push", "position": {"x": 300, "y": 300}, "data": {"label": "Match Day Push"}},
                        {"id": "wait1", "type": "wait", "position": {"x": 500, "y": 200}, "data": {"label": "Wait 1 Week"}},
                        {"id": "whatsapp1", "type": "whatsapp", "position": {"x": 700, "y": 200}, "data": {"label": "WhatsApp Follow-up"}},
                        {"id": "exit1", "type": "exit", "position": {"x": 900, "y": 200}, "data": {"label": "Campaign End"}},
                    ],
                    "edges": [
                        {"id": "e1", "source": "start", "target": "sms1"},
                        {"id": "e2", "source": "start", "target": "push1"},
                        {"id": "e3", "source": "sms1", "target": "wait1"},
                        {"id": "e4", "source": "push1", "target": "wait1"},
                        {"id": "e5", "source": "wait1", "target": "whatsapp1"},
                        {"id": "e6", "source": "whatsapp1", "target": "exit1"},
                    ],
                    "viewport": {"x": 0, "y": 0, "zoom": 1},
                },
            ]

            for tmpl_data in templates:
                tmpl = JourneyTemplate(
                    created_by_id=admin.id,
                    **tmpl_data,
                )
                db.add(tmpl)
            print(f"✓ Created {len(templates)} journey templates")

        await db.commit()
        print("\n✅ Seed completed successfully")


if __name__ == "__main__":
    asyncio.run(seed())

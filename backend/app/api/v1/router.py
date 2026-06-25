from fastapi import APIRouter
from app.api.v1 import auth, users, operators, products, campaigns, segments, offers, creatives, journeys, monthly_plans, analytics, channel_capacity

api_router = APIRouter(prefix="/api/v1")

# Global routes
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(operators.router)

# Operator-scoped routes (all have /{operator_slug}/ prefix)
api_router.include_router(products.router)
api_router.include_router(monthly_plans.router)
api_router.include_router(campaigns.router)
api_router.include_router(segments.router)
api_router.include_router(offers.router)
api_router.include_router(creatives.router)
api_router.include_router(journeys.router)
api_router.include_router(analytics.router)
api_router.include_router(channel_capacity.router)

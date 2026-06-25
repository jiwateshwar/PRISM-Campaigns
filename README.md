# Prism Campaigns

**Marketing Planning, Operations and Decision Support Platform for Telecom Operators**

Prism is a multi-tenant enterprise web application designed for telecom VAS marketing teams. Each operator tenant (e.g. Airtel Ghana, MTN Uganda) is fully isolated. The platform covers the complete campaign lifecycle: monthly planning → business objectives → campaigns → journeys → segments → offers → creatives → analytics.

> **Privacy first:** Prism never stores customer identities (MSISDN, phone numbers, hashed identifiers, or any personal data). Segments contain only business rules and estimated audience sizes.

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Portainer (optional, for GUI management)

### 1. Clone & configure

```bash
cp .env.example .env
# Edit .env — set strong SECRET_KEY, POSTGRES_PASSWORD, MINIO_SECRET_KEY
```

### 2. Start all services

```bash
docker compose up -d
```

Services:
| Service | Port | Description |
|---------|------|-------------|
| nginx | **80** | Reverse proxy (entry point) |
| frontend | 3000 | Next.js 14 |
| backend | 8000 | FastAPI |
| postgres | 5432 | PostgreSQL 16 |
| redis | 6379 | Cache & task queue |
| minio | 9000/9001 | Object storage |

### 3. Access the application

Open [http://localhost](http://localhost)

**Default credentials:**
```
Super Admin:   admin@prism.internal / changeme123
```

The database is automatically seeded with:
- Airtel Ghana (with CallerTunez, Music OTT, Video OTT, Gaming, CPaaS products)
- MTN Uganda (with 3 products)
- 5 journey templates (acquisition, winback, renewal, upsell, seasonal)
- Sample segments, offers, and channel capacities

---

## Architecture

```
nginx (80)
  ├── /api/ → FastAPI (8000)
  └── /    → Next.js (3000)

FastAPI
  ├── PostgreSQL 16 (SQLAlchemy 2.0 async)
  ├── Redis 7 (cache)
  └── MinIO (object storage)
```

### Key design decisions

| Concern | Decision |
|---------|----------|
| Multi-tenancy | Shared schema, `operator_id` FK on every table |
| Auth | JWT (access 15m + refresh 7d), httpOnly-safe localStorage |
| RBAC | 4 tiers: super_admin → operator_admin → planner → viewer |
| Segment privacy | `business_rules` JSONB only — no identity columns exist |
| Creative sharing | `is_shared=True` makes creatives visible across all operators |
| Forecast | Server-side: `activations = reach × (conv_pct / 100)`, `revenue = activations × ARPU` |
| Version control | SegmentVersion + CreativeVersion on content change |
| Journey builder | React Flow nodes/edges stored as JSONB in PostgreSQL |

---

## Technology Stack

**Frontend**
- Next.js 14 (App Router, TypeScript, standalone output)
- Tailwind CSS + shadcn/ui + Radix UI
- TanStack Query v5 (server state)
- Zustand (auth state, persist)
- @xyflow/react (Journey Builder canvas)
- Apache ECharts via echarts-for-react (analytics)
- Sonner (toast notifications)

**Backend**
- FastAPI + Python 3.11
- SQLAlchemy 2.0 (async) + asyncpg
- Alembic (migrations)
- Pydantic v2
- python-jose (JWT)
- passlib + bcrypt (passwords)

**Infrastructure**
- PostgreSQL 16
- Redis 7
- MinIO (S3-compatible)
- Nginx (reverse proxy, rate limiting)
- Docker Compose

---

## Directory Structure

```
PRISM Campaigns/
├── docker-compose.yml
├── .env.example
├── nginx/nginx.conf
├── docker/postgres/init.sql
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/
│   │   └── versions/001_initial_schema.py
│   ├── scripts/seed.py
│   └── app/
│       ├── core/          # config, security, deps
│       ├── db/            # session, base
│       ├── models/        # SQLAlchemy models
│       ├── schemas/       # Pydantic v2 schemas
│       ├── api/v1/        # route handlers
│       └── main.py
└── frontend/
    ├── Dockerfile
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/login/
    │   │   ├── operators/
    │   │   ├── (dashboard)/[operatorSlug]/
    │   │   │   ├── dashboard/
    │   │   │   ├── planning/
    │   │   │   ├── campaigns/
    │   │   │   │   └── [id]/       # Campaign detail + actuals
    │   │   │   ├── segments/
    │   │   │   ├── offers/
    │   │   │   ├── creatives/
    │   │   │   ├── journeys/
    │   │   │   │   └── [id]/       # React Flow builder
    │   │   │   ├── analytics/
    │   │   │   └── settings/
    │   │   └── admin/operators/
    │   ├── components/
    │   │   └── layout/             # Sidebar, Header
    │   ├── lib/
    │   │   ├── api.ts              # Axios ApiClient
    │   │   └── utils.ts            # Formatters, helpers
    │   ├── store/auth.ts           # Zustand auth store
    │   └── types/index.ts          # TypeScript interfaces
```

---

## API Routes

All operator-scoped routes are prefixed `/api/v1/{operator_slug}/`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Login, returns JWT pair |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Current user |
| GET/POST | `/api/v1/operators` | List / create operators |
| GET/POST | `/{slug}/plans` | Monthly plans |
| GET/POST | `/{slug}/campaigns` | Campaigns |
| PATCH | `/{slug}/campaigns/{id}` | Update campaign / advance status |
| POST | `/{slug}/campaigns/{id}/actuals` | Import actual results |
| GET/POST | `/{slug}/segments` | Segment library |
| GET/POST | `/{slug}/offers` | Offer library |
| GET/POST | `/{slug}/creatives` | Creative library |
| GET/POST | `/{slug}/journeys` | Journeys |
| GET | `/{slug}/journeys/templates` | Journey templates |
| POST | `/{slug}/journeys/templates/{id}/clone` | Clone template |
| GET | `/{slug}/analytics/operator-summary` | Dashboard KPIs |
| GET | `/{slug}/analytics/campaign-performance` | Monthly bars |
| GET | `/{slug}/analytics/forecast-vs-actual` | Forecast accuracy |
| GET/POST | `/{slug}/capacity` | Channel capacity slots |
| GET | `/{slug}/capacity/conflict-check` | Over-capacity warnings |

---

## Campaign Lifecycle

```
draft → planned → ready → scheduled → executing → completed → results_imported → closed
```

Actuals import automatically advances status to `results_imported`.

---

## Development

### Backend

```bash
cd backend
pip install -r requirements.txt
# Set DATABASE_URL in .env then:
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Linting

```bash
cd backend && ruff check .
cd frontend && npm run lint
```

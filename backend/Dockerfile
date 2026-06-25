FROM python:3.11-alpine

# System deps — musl-based, no apt needed
RUN apk add --no-cache \
    curl \
    gcc \
    musl-dev \
    libpq-dev \
    postgresql-dev

WORKDIR /app

# Install Python dependencies (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -S prism && adduser -S -G prism prism
RUN chown -R prism:prism /app
USER prism

EXPOSE 8000

# Run migrations then start server
CMD ["sh", "-c", "alembic upgrade head && python scripts/seed.py && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"]

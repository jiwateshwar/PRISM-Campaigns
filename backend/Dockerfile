FROM python:3.11-alpine

WORKDIR /app

# All packages are pre-compiled wheels — no system libs needed
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN addgroup -S prism && adduser -S -G prism prism
RUN chown -R prism:prism /app
USER prism

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && python scripts/seed.py && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"]

FROM python:3.11-slim

WORKDIR /app

# --prefer-binary forces pre-compiled wheels; never compile from source
# psycopg2-binary, asyncpg, orjson all ship manylinux wheels for slim/glibc
COPY requirements.txt .
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

COPY . .

RUN addgroup --system prism && adduser --system --ingroup prism prism
RUN chown -R prism:prism /app
USER prism

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && python scripts/seed.py && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"]

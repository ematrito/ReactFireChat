FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for PostgreSQL and other tools
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Run with gunicorn for production
CMD ["sh", "-c", "gunicorn -w 2 -b 0.0.0.0:${PORT:-8000} -k uvicorn.workers.UvicornWorker main:app"]
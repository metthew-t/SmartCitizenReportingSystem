FROM python:3.11-slim

# Install system dependencies for PostGIS and psycopg2
RUN apt-get update && apt-get install -y \
    binutils \
    libproj-dev \
    gdal-bin \
    libgdal-dev \
    python3-gdal \
    libpq-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Apply migrations (pre-generated), collect static, then start gunicorn
# makemigrations is NOT run here — migrations are version-controlled in the repo
CMD python manage.py migrate --run-syncdb && \
    python manage.py collectstatic --no-input && \
    gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 2 --timeout 120 --keep-alive 5

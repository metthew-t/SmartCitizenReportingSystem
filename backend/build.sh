#!/usr/bin/env bash
# exit on error
set -o errexit

cd backend

pip install -r requirements.txt

# PostGIS requires GDAL, Render native python env has some limitations but we will try.
# If GDAL is an issue on Render, user might need to use a Docker deployment.
# We will use collectstatic and migrate.
python manage.py collectstatic --no-input

# Run raw SQL to add new columns because makemigrations dynamically skips on Render
python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.db import connection
try:
    with connection.cursor() as cursor:
        cursor.execute('ALTER TABLE core_report ADD COLUMN aanaa VARCHAR(255) NULL;')
        cursor.execute('ALTER TABLE core_report ADD COLUMN kuta_magaalaa VARCHAR(255) NULL;')
        cursor.execute('ALTER TABLE core_report ADD COLUMN iddoo_addaa VARCHAR(255) NULL;')
    print('Successfully added missing address columns to core_report.')
except Exception as e:
    print('Columns might already exist:', e)
"

python manage.py makemigrations
python manage.py migrate

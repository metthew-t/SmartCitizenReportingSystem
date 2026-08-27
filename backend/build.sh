#!/usr/bin/env bash
# exit on error
set -o errexit

cd backend

pip install -r requirements.txt

# PostGIS requires GDAL, Render native python env has some limitations but we will try.
# If GDAL is an issue on Render, user might need to use a Docker deployment.
# We will use collectstatic and migrate.
python manage.py collectstatic --no-input
python manage.py makemigrations
python manage.py migrate

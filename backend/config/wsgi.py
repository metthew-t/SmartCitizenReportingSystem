"""
WSGI config for Adama Smart Citizen Reporting System.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()

try:
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS aanaa VARCHAR(255) NULL;')
        cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS kuta_magaalaa VARCHAR(255) NULL;')
        cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS iddoo_addaa VARCHAR(255) NULL;')
except Exception as e:
    pass

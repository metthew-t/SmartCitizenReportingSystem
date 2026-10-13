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
        cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS kebele VARCHAR(255) NULL;')
        cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS iddoo_addaa VARCHAR(255) NULL;')
        cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS ai_confidence_score DOUBLE PRECISION NULL;')
        cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS ai_suggested_department_id INTEGER NULL;')
        cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS ai_summary TEXT NULL;')
        cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;')
        cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;')
        cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS resolution_notes TEXT NULL;')
        
        # CitizenProfile gamification fields
        cursor.execute('ALTER TABLE core_citizenprofile ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;')
        cursor.execute("ALTER TABLE core_citizenprofile ADD COLUMN IF NOT EXISTS civic_level VARCHAR(50) DEFAULT 'Beginner';")
        
        # Accounts User fields
        cursor.execute('ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(100) NULL;')
        cursor.execute('ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS email VARCHAR(254) UNIQUE NULL;')
        cursor.execute("ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) DEFAULT '';")
except Exception as e:
    pass

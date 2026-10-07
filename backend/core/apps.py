from django.apps import AppConfig
import sys

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                # Add missing columns safely in Postgres
                cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS aanaa VARCHAR(255) NULL;')
                cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS kuta_magaalaa VARCHAR(255) NULL;')
                cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS kebele VARCHAR(255) NULL;')
                cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS iddoo_addaa VARCHAR(255) NULL;')
        except Exception as e:
            pass

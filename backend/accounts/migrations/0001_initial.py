from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    """
    Initial migration for accounts app.
    Uses SeparateDatabaseAndState with IF NOT EXISTS / IF NOT EXISTS ALTER so it
    is safe to run on a Render DB that already has accounts_user created by
    prior raw-SQL auto-heal code or a previous partial migration.
    """

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    CREATE TABLE IF NOT EXISTS accounts_user (
                        id SERIAL PRIMARY KEY,
                        password VARCHAR(128) NOT NULL,
                        last_login TIMESTAMP WITH TIME ZONE,
                        is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
                        first_name VARCHAR(150) NOT NULL DEFAULT '',
                        last_name VARCHAR(150) NOT NULL DEFAULT '',
                        is_staff BOOLEAN NOT NULL DEFAULT FALSE,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        phone_number VARCHAR(20) UNIQUE,
                        email VARCHAR(254) UNIQUE,
                        full_name VARCHAR(255) NOT NULL DEFAULT '',
                        is_citizen BOOLEAN NOT NULL DEFAULT FALSE,
                        is_officer BOOLEAN NOT NULL DEFAULT FALSE,
                        is_department_manager BOOLEAN NOT NULL DEFAULT FALSE,
                        is_city_admin BOOLEAN NOT NULL DEFAULT FALSE,
                        is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
                        is_mayor BOOLEAN NOT NULL DEFAULT FALSE,
                        profile_photo VARCHAR(100),
                        must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
                        telegram_chat_id VARCHAR(100),
                        telegram_username VARCHAR(100),
                        whatsapp_phone_number VARCHAR(30),
                        notify_via_telegram BOOLEAN NOT NULL DEFAULT FALSE,
                        notify_via_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
                        notify_via_in_app BOOLEAN NOT NULL DEFAULT TRUE,
                        notify_via_sms BOOLEAN NOT NULL DEFAULT TRUE
                    );

                    -- If table already existed, ensure all new columns are present
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS is_mayor BOOLEAN NOT NULL DEFAULT FALSE;
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(100);
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(100);
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS whatsapp_phone_number VARCHAR(30);
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS notify_via_telegram BOOLEAN NOT NULL DEFAULT FALSE;
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS notify_via_whatsapp BOOLEAN NOT NULL DEFAULT FALSE;
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS notify_via_in_app BOOLEAN NOT NULL DEFAULT TRUE;
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS notify_via_sms BOOLEAN NOT NULL DEFAULT TRUE;

                    -- Groups join table
                    CREATE TABLE IF NOT EXISTS accounts_user_groups (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
                        group_id INTEGER NOT NULL REFERENCES auth_group(id) ON DELETE CASCADE,
                        UNIQUE (user_id, group_id)
                    );

                    -- User permissions join table
                    CREATE TABLE IF NOT EXISTS accounts_user_user_permissions (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
                        permission_id INTEGER NOT NULL REFERENCES auth_permission(id) ON DELETE CASCADE,
                        UNIQUE (user_id, permission_id)
                    );
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.CreateModel(
                    name='User',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('password', models.CharField(max_length=128, verbose_name='password')),
                        ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                        ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                        ('first_name', models.CharField(blank=True, max_length=150, verbose_name='first name')),
                        ('last_name', models.CharField(blank=True, max_length=150, verbose_name='last name')),
                        ('is_staff', models.BooleanField(default=False, help_text='Designates whether the user can log into this admin site.', verbose_name='staff status')),
                        ('is_active', models.BooleanField(default=True, help_text='Designates whether this user should be treated as active.', verbose_name='active')),
                        ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                        ('phone_number', models.CharField(blank=True, max_length=20, null=True, unique=True)),
                        ('email', models.EmailField(blank=True, max_length=254, null=True, unique=True)),
                        ('full_name', models.CharField(blank=True, default='', max_length=255)),
                        ('is_citizen', models.BooleanField(default=False)),
                        ('is_officer', models.BooleanField(default=False)),
                        ('is_department_manager', models.BooleanField(default=False)),
                        ('is_city_admin', models.BooleanField(default=False)),
                        ('is_super_admin', models.BooleanField(default=False)),
                        ('is_mayor', models.BooleanField(default=False)),
                        ('profile_photo', models.ImageField(blank=True, null=True, upload_to='profiles/')),
                        ('must_change_password', models.BooleanField(default=False)),
                        ('telegram_chat_id', models.CharField(blank=True, max_length=100, null=True)),
                        ('telegram_username', models.CharField(blank=True, max_length=100, null=True)),
                        ('whatsapp_phone_number', models.CharField(blank=True, max_length=30, null=True)),
                        ('notify_via_telegram', models.BooleanField(default=False)),
                        ('notify_via_whatsapp', models.BooleanField(default=False)),
                        ('notify_via_in_app', models.BooleanField(default=True)),
                        ('notify_via_sms', models.BooleanField(default=True)),
                        ('groups', models.ManyToManyField(
                            blank=True,
                            help_text='The groups this user belongs to.',
                            related_name='user_set',
                            related_query_name='user',
                            to='auth.group',
                            verbose_name='groups',
                        )),
                        ('user_permissions', models.ManyToManyField(
                            blank=True,
                            help_text='Specific permissions for this user.',
                            related_name='user_set',
                            related_query_name='user',
                            to='auth.permission',
                            verbose_name='user permissions',
                        )),
                    ],
                    options={
                        'verbose_name': 'user',
                        'verbose_name_plural': 'users',
                        'abstract': False,
                    },
                ),
            ],
        ),
    ]

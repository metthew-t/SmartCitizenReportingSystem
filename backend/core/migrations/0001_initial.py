from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """
    Initial migration for core app — includes ALL models.
    Uses SeparateDatabaseAndState so it is safe to run even if tables
    already exist on Render (created by _ensure_table() raw SQL helpers).
    The database operations are wrapped in CREATE TABLE IF NOT EXISTS RunSQL
    so a re-run never fails.
    """

    initial = True

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    # We separate the Django ORM state changes from the actual DB operations.
    # The state operations tell Django's migration framework what the schema is.
    # The database operations use IF NOT EXISTS so they are idempotent.
    operations = [
        migrations.SeparateDatabaseAndState(
            # ── DATABASE SIDE: idempotent raw SQL ────────────────────────────
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    CREATE TABLE IF NOT EXISTS core_department (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL UNIQUE,
                        description TEXT,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS core_reportcategory (
                        id SERIAL PRIMARY KEY,
                        name_om VARCHAR(255) NOT NULL,
                        name_am VARCHAR(255) NOT NULL,
                        name_en VARCHAR(255) NOT NULL,
                        description TEXT,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE
                    );

                    CREATE TABLE IF NOT EXISTS core_citizenprofile (
                        id SERIAL PRIMARY KEY,
                        national_id VARCHAR(50),
                        full_name VARCHAR(255) NOT NULL,
                        preferred_language VARCHAR(10) NOT NULL DEFAULT 'om',
                        points INTEGER NOT NULL DEFAULT 0,
                        civic_level VARCHAR(50) NOT NULL DEFAULT 'Beginner',
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        user_id INTEGER NOT NULL UNIQUE REFERENCES accounts_user(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS core_officerprofile (
                        id SERIAL PRIMARY KEY,
                        full_name VARCHAR(255) NOT NULL,
                        is_manager BOOLEAN NOT NULL DEFAULT FALSE,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        department_id INTEGER REFERENCES core_department(id) ON DELETE SET NULL,
                        user_id INTEGER NOT NULL UNIQUE REFERENCES accounts_user(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS core_report (
                        id SERIAL PRIMARY KEY,
                        case_number VARCHAR(50) NOT NULL UNIQUE,
                        is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
                        description TEXT NOT NULL,
                        latitude DOUBLE PRECISION,
                        longitude DOUBLE PRECISION,
                        location_accuracy DOUBLE PRECISION,
                        address TEXT,
                        aanaa VARCHAR(255),
                        kuta_magaalaa VARCHAR(255),
                        kebele VARCHAR(255),
                        iddoo_addaa VARCHAR(255),
                        status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
                        priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
                        ai_confidence_score DOUBLE PRECISION,
                        ai_summary TEXT,
                        is_public BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        resolved_at TIMESTAMP WITH TIME ZONE,
                        closed_at TIMESTAMP WITH TIME ZONE,
                        rejection_reason TEXT,
                        resolution_notes TEXT,
                        sla_deadline TIMESTAMP WITH TIME ZONE,
                        sla_hours INTEGER NOT NULL DEFAULT 48,
                        is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
                        escalation_level VARCHAR(30) NOT NULL DEFAULT 'NONE',
                        escalation_reason TEXT,
                        resolution_proof_url VARCHAR(1000),
                        citizen_confirmed_resolution BOOLEAN,
                        citizen_confirmation_notes TEXT,
                        affected_count INTEGER NOT NULL DEFAULT 1,
                        is_within_geofence BOOLEAN NOT NULL DEFAULT TRUE,
                        ai_suggested_department_id INTEGER REFERENCES core_department(id) ON DELETE SET NULL,
                        assigned_officer_id INTEGER REFERENCES core_officerprofile(id) ON DELETE SET NULL,
                        citizen_id INTEGER REFERENCES accounts_user(id) ON DELETE SET NULL,
                        category_id INTEGER REFERENCES core_reportcategory(id) ON DELETE SET NULL,
                        primary_department_id INTEGER REFERENCES core_department(id) ON DELETE SET NULL
                    );

                    CREATE TABLE IF NOT EXISTS core_report_shared_with (
                        id SERIAL PRIMARY KEY,
                        report_id INTEGER NOT NULL REFERENCES core_report(id) ON DELETE CASCADE,
                        department_id INTEGER NOT NULL REFERENCES core_department(id) ON DELETE CASCADE,
                        UNIQUE (report_id, department_id)
                    );

                    CREATE TABLE IF NOT EXISTS core_reportmedia (
                        id SERIAL PRIMARY KEY,
                        media_type VARCHAR(20) NOT NULL,
                        file_url VARCHAR(1000) NOT NULL,
                        uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        report_id INTEGER NOT NULL REFERENCES core_report(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS core_routingrule (
                        id SERIAL PRIMARY KEY,
                        priority INTEGER NOT NULL DEFAULT 0,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        category_id INTEGER REFERENCES core_reportcategory(id) ON DELETE CASCADE,
                        department_id INTEGER NOT NULL REFERENCES core_department(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS core_routingkeyword (
                        id SERIAL PRIMARY KEY,
                        keyword VARCHAR(100) NOT NULL,
                        language VARCHAR(10) NOT NULL,
                        rule_id INTEGER NOT NULL REFERENCES core_routingrule(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS core_message (
                        id SERIAL PRIMARY KEY,
                        content TEXT,
                        media_url VARCHAR(1000),
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        report_id INTEGER NOT NULL REFERENCES core_report(id) ON DELETE CASCADE,
                        sender_id INTEGER NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS core_departmentmessage (
                        id SERIAL PRIMARY KEY,
                        content TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        department_id INTEGER NOT NULL REFERENCES core_department(id) ON DELETE CASCADE,
                        sender_id INTEGER NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS core_departmentchatseen (
                        id SERIAL PRIMARY KEY,
                        last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        department_id INTEGER NOT NULL REFERENCES core_department(id) ON DELETE CASCADE,
                        user_id INTEGER NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
                        CONSTRAINT unique_dept_user_seen UNIQUE (department_id, user_id)
                    );

                    CREATE TABLE IF NOT EXISTS core_auditlog (
                        id SERIAL PRIMARY KEY,
                        actor_name VARCHAR(255),
                        actor_role VARCHAR(50),
                        ip_address VARCHAR(60),
                        action VARCHAR(100) NOT NULL,
                        entity_type VARCHAR(100) NOT NULL,
                        entity_id VARCHAR(100) NOT NULL,
                        changes JSONB,
                        tamper_hash VARCHAR(64),
                        prev_hash VARCHAR(64),
                        timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        user_id INTEGER REFERENCES accounts_user(id) ON DELETE SET NULL
                    );

                    CREATE TABLE IF NOT EXISTS core_reportaffectedcitizen (
                        id SERIAL PRIMARY KEY,
                        ip_address VARCHAR(60),
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        report_id INTEGER NOT NULL REFERENCES core_report(id) ON DELETE CASCADE,
                        user_id INTEGER REFERENCES accounts_user(id) ON DELETE SET NULL
                    );

                    CREATE TABLE IF NOT EXISTS core_notificationlog (
                        id SERIAL PRIMARY KEY,
                        recipient_phone VARCHAR(50),
                        recipient_name VARCHAR(255),
                        channel VARCHAR(30) NOT NULL DEFAULT 'SMS',
                        event_type VARCHAR(60) NOT NULL,
                        message_body TEXT NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'SENT',
                        sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        report_id INTEGER REFERENCES core_report(id) ON DELETE SET NULL
                    );

                    CREATE TABLE IF NOT EXISTS core_feedback (
                        id SERIAL PRIMARY KEY,
                        rating INTEGER NOT NULL,
                        timeliness_rating INTEGER NOT NULL DEFAULT 4,
                        quality_rating INTEGER NOT NULL DEFAULT 4,
                        comment TEXT,
                        is_satisfied BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        citizen_id INTEGER NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
                        department_id INTEGER REFERENCES core_department(id) ON DELETE SET NULL,
                        report_id INTEGER NOT NULL UNIQUE REFERENCES core_report(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS core_appeal (
                        id SERIAL PRIMARY KEY,
                        appeal_number VARCHAR(60) NOT NULL UNIQUE,
                        reason TEXT NOT NULL,
                        desired_outcome TEXT,
                        status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
                        reviewer_name VARCHAR(255),
                        reviewer_decision TEXT,
                        reviewed_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        citizen_id INTEGER NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
                        department_id INTEGER REFERENCES core_department(id) ON DELETE SET NULL,
                        report_id INTEGER NOT NULL REFERENCES core_report(id) ON DELETE CASCADE,
                        reviewer_id INTEGER REFERENCES accounts_user(id) ON DELETE SET NULL
                    );

                    CREATE TABLE IF NOT EXISTS core_reportstatushistory (
                        id SERIAL PRIMARY KEY,
                        old_status VARCHAR(30),
                        new_status VARCHAR(30) NOT NULL,
                        changed_by_name VARCHAR(255),
                        note TEXT,
                        changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        changed_by_id INTEGER REFERENCES accounts_user(id) ON DELETE SET NULL,
                        report_id INTEGER NOT NULL REFERENCES core_report(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS core_officialreport (
                        id SERIAL PRIMARY KEY,
                        reference_number VARCHAR(60) NOT NULL UNIQUE,
                        title VARCHAR(255) NOT NULL,
                        report_type VARCHAR(40) NOT NULL DEFAULT 'FIELD_INVESTIGATION',
                        level VARCHAR(30) NOT NULL DEFAULT 'OFFICER_TO_MANAGER',
                        sender_name VARCHAR(255) NOT NULL DEFAULT '',
                        sender_role VARCHAR(50) NOT NULL DEFAULT '',
                        priority VARCHAR(20) NOT NULL DEFAULT 'ROUTINE',
                        status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
                        executive_summary TEXT NOT NULL,
                        findings TEXT NOT NULL,
                        recommendations TEXT,
                        attachment_url VARCHAR(1000),
                        reviewer_name VARCHAR(255),
                        reviewer_feedback TEXT,
                        reviewed_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        department_id INTEGER NOT NULL REFERENCES core_department(id) ON DELETE CASCADE,
                        linked_citizen_report_id INTEGER REFERENCES core_report(id) ON DELETE SET NULL,
                        reviewer_id INTEGER REFERENCES accounts_user(id) ON DELETE SET NULL,
                        sender_id INTEGER NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
                        target_department_id INTEGER REFERENCES core_department(id) ON DELETE SET NULL
                    );

                    CREATE TABLE IF NOT EXISTS core_mayordirective (
                        id SERIAL PRIMARY KEY,
                        reference_number VARCHAR(60) NOT NULL UNIQUE,
                        title VARCHAR(255) NOT NULL,
                        priority VARCHAR(20) NOT NULL DEFAULT 'CRITICAL',
                        status VARCHAR(30) NOT NULL DEFAULT 'ISSUED',
                        instructions TEXT NOT NULL,
                        deadline TIMESTAMP WITH TIME ZONE,
                        acknowledgement_notes TEXT,
                        completed_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        issued_by_id INTEGER NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
                        target_department_id INTEGER REFERENCES core_department(id) ON DELETE CASCADE
                    );

                    -- Notification models (from core/notifications.py)
                    CREATE TABLE IF NOT EXISTS core_notification (
                        id SERIAL PRIMARY KEY,
                        notification_type VARCHAR(50) NOT NULL,
                        title VARCHAR(255) NOT NULL,
                        body TEXT NOT NULL,
                        report_id INTEGER,
                        is_read BOOLEAN NOT NULL DEFAULT FALSE,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        recipient_id INTEGER NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE
                    );

                    CREATE INDEX IF NOT EXISTS core_notification_recipient_is_read
                        ON core_notification(recipient_id, is_read);

                    CREATE TABLE IF NOT EXISTS core_devicetoken (
                        id SERIAL PRIMARY KEY,
                        token VARCHAR(512) NOT NULL UNIQUE,
                        platform VARCHAR(20) NOT NULL DEFAULT 'android',
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        user_id INTEGER NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE
                    );

                    -- Ensure accounts_user has all social notification columns
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(100);
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(100);
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS whatsapp_phone_number VARCHAR(30);
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS notify_via_telegram BOOLEAN NOT NULL DEFAULT FALSE;
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS notify_via_whatsapp BOOLEAN NOT NULL DEFAULT FALSE;
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS notify_via_in_app BOOLEAN NOT NULL DEFAULT TRUE;
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS notify_via_sms BOOLEAN NOT NULL DEFAULT TRUE;
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS is_mayor BOOLEAN NOT NULL DEFAULT FALSE;
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            # ── STATE SIDE: tells Django ORM about the schema ─────────────────
            state_operations=[
                migrations.CreateModel(
                    name='Department',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('name', models.CharField(max_length=255, unique=True)),
                        ('description', models.TextField(blank=True, null=True)),
                        ('is_active', models.BooleanField(default=True)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                    ],
                ),
                migrations.CreateModel(
                    name='ReportCategory',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('name_om', models.CharField(max_length=255)),
                        ('name_am', models.CharField(max_length=255)),
                        ('name_en', models.CharField(max_length=255)),
                        ('description', models.TextField(blank=True, null=True)),
                        ('is_active', models.BooleanField(default=True)),
                    ],
                ),
                migrations.CreateModel(
                    name='CitizenProfile',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('national_id', models.CharField(blank=True, max_length=50, null=True)),
                        ('full_name', models.CharField(max_length=255)),
                        ('preferred_language', models.CharField(choices=[('om', 'Afaan Oromo'), ('am', 'Amharic'), ('en', 'English')], default='om', max_length=10)),
                        ('points', models.IntegerField(default=0)),
                        ('civic_level', models.CharField(default='Beginner', max_length=50)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='citizen_profile', to='accounts.user')),
                    ],
                ),
                migrations.CreateModel(
                    name='OfficerProfile',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('full_name', models.CharField(max_length=255)),
                        ('is_manager', models.BooleanField(default=False)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('department', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='officers', to='core.department')),
                        ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='officer_profile', to='accounts.user')),
                    ],
                ),
                migrations.CreateModel(
                    name='Report',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('case_number', models.CharField(max_length=50, unique=True)),
                        ('is_anonymous', models.BooleanField(default=False)),
                        ('description', models.TextField()),
                        ('latitude', models.FloatField(blank=True, null=True)),
                        ('longitude', models.FloatField(blank=True, null=True)),
                        ('location_accuracy', models.FloatField(blank=True, null=True)),
                        ('address', models.TextField(blank=True, null=True)),
                        ('aanaa', models.CharField(blank=True, max_length=255, null=True)),
                        ('kuta_magaalaa', models.CharField(blank=True, max_length=255, null=True)),
                        ('kebele', models.CharField(blank=True, max_length=255, null=True)),
                        ('iddoo_addaa', models.CharField(blank=True, max_length=255, null=True)),
                        ('status', models.CharField(choices=[('SUBMITTED', 'Submitted'), ('RECEIVED', 'Received'), ('ASSIGNED', 'Assigned'), ('UNDER_INVESTIGATION', 'Under Investigation'), ('IN_PROGRESS', 'In Progress'), ('RESOLVED', 'Resolved'), ('CLOSED', 'Closed'), ('REOPENED', 'Reopened'), ('REJECTED', 'Rejected')], default='SUBMITTED', max_length=30)),
                        ('priority', models.CharField(choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('CRITICAL', 'Critical')], default='MEDIUM', max_length=20)),
                        ('ai_confidence_score', models.FloatField(blank=True, null=True)),
                        ('ai_summary', models.TextField(blank=True, null=True)),
                        ('is_public', models.BooleanField(default=True)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                        ('resolved_at', models.DateTimeField(blank=True, null=True)),
                        ('closed_at', models.DateTimeField(blank=True, null=True)),
                        ('rejection_reason', models.TextField(blank=True, null=True)),
                        ('resolution_notes', models.TextField(blank=True, null=True)),
                        ('sla_deadline', models.DateTimeField(blank=True, null=True)),
                        ('sla_hours', models.IntegerField(default=48)),
                        ('is_escalated', models.BooleanField(default=False)),
                        ('escalation_level', models.CharField(choices=[('NONE', 'None'), ('MANAGER', 'Manager Attention'), ('MAYOR', 'Mayor Escalated Queue')], default='NONE', max_length=30)),
                        ('escalation_reason', models.TextField(blank=True, null=True)),
                        ('resolution_proof_url', models.URLField(blank=True, max_length=1000, null=True)),
                        ('citizen_confirmed_resolution', models.BooleanField(blank=True, null=True)),
                        ('citizen_confirmation_notes', models.TextField(blank=True, null=True)),
                        ('affected_count', models.PositiveIntegerField(default=1)),
                        ('is_within_geofence', models.BooleanField(default=True)),
                        ('ai_suggested_department', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ai_suggested_reports', to='core.department')),
                        ('assigned_officer', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_reports', to='core.officerprofile')),
                        ('citizen', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reports', to='accounts.user')),
                        ('category', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.reportcategory')),
                        ('primary_department', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='primary_reports', to='core.department')),
                        ('shared_with', models.ManyToManyField(blank=True, related_name='shared_reports', to='core.department')),
                    ],
                    options={'ordering': ['-created_at']},
                ),
                migrations.CreateModel(
                    name='ReportMedia',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('media_type', models.CharField(choices=[('IMAGE', 'Image'), ('VIDEO', 'Video'), ('AUDIO', 'Audio'), ('DOCUMENT', 'Document')], max_length=20)),
                        ('file_url', models.URLField(max_length=1000)),
                        ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                        ('report', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='media', to='core.report')),
                    ],
                ),
                migrations.CreateModel(
                    name='RoutingRule',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('priority', models.IntegerField(default=0)),
                        ('is_active', models.BooleanField(default=True)),
                        ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='core.reportcategory')),
                        ('department', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='routing_rules', to='core.department')),
                    ],
                ),
                migrations.CreateModel(
                    name='RoutingKeyword',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('keyword', models.CharField(max_length=100)),
                        ('language', models.CharField(choices=[('om', 'Afaan Oromo'), ('am', 'Amharic'), ('en', 'English')], max_length=10)),
                        ('rule', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='keywords', to='core.routingrule')),
                    ],
                ),
                migrations.CreateModel(
                    name='Message',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('content', models.TextField(blank=True, null=True)),
                        ('media_url', models.URLField(blank=True, max_length=1000, null=True)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('report', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='core.report')),
                        ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='accounts.user')),
                    ],
                ),
                migrations.CreateModel(
                    name='DepartmentMessage',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('content', models.TextField()),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('department', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dept_messages', to='core.department')),
                        ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='accounts.user')),
                    ],
                    options={'ordering': ['created_at']},
                ),
                migrations.CreateModel(
                    name='DepartmentChatSeen',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('last_seen_at', models.DateTimeField(auto_now=True)),
                        ('department', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='seen_receipts', to='core.department')),
                        ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dept_seen_receipts', to='accounts.user')),
                    ],
                    options={'ordering': ['-last_seen_at'], 'unique_together': {('department', 'user')}},
                ),
                migrations.CreateModel(
                    name='AuditLog',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('actor_name', models.CharField(blank=True, max_length=255, null=True)),
                        ('actor_role', models.CharField(blank=True, max_length=50, null=True)),
                        ('ip_address', models.CharField(blank=True, max_length=60, null=True)),
                        ('action', models.CharField(max_length=100)),
                        ('entity_type', models.CharField(max_length=100)),
                        ('entity_id', models.CharField(max_length=100)),
                        ('changes', models.JSONField(blank=True, null=True)),
                        ('tamper_hash', models.CharField(blank=True, max_length=64, null=True)),
                        ('prev_hash', models.CharField(blank=True, max_length=64, null=True)),
                        ('timestamp', models.DateTimeField(auto_now_add=True)),
                        ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='accounts.user')),
                    ],
                    options={'ordering': ['-timestamp']},
                ),
                migrations.CreateModel(
                    name='ReportAffectedCitizen',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('ip_address', models.CharField(blank=True, max_length=60, null=True)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('report', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='affected_citizens', to='core.report')),
                        ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='accounts.user')),
                    ],
                    options={'ordering': ['-created_at']},
                ),
                migrations.CreateModel(
                    name='NotificationLog',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('recipient_phone', models.CharField(blank=True, max_length=50, null=True)),
                        ('recipient_name', models.CharField(blank=True, max_length=255, null=True)),
                        ('channel', models.CharField(choices=[('SMS', 'TextBee SMS Gateway'), ('TELEGRAM', 'Telegram Bot'), ('WHATSAPP', 'WhatsApp Cloud Messaging'), ('PUSH', 'FCM Push Notification'), ('SYSTEM', 'System Alert')], default='SMS', max_length=30)),
                        ('event_type', models.CharField(max_length=60)),
                        ('message_body', models.TextField()),
                        ('status', models.CharField(default='SENT', max_length=20)),
                        ('sent_at', models.DateTimeField(auto_now_add=True)),
                        ('report', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='notification_logs', to='core.report')),
                    ],
                    options={'ordering': ['-sent_at']},
                ),
                migrations.CreateModel(
                    name='Feedback',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('rating', models.IntegerField(choices=[(i, i) for i in range(1, 6)])),
                        ('timeliness_rating', models.IntegerField(choices=[(i, i) for i in range(1, 6)], default=4)),
                        ('quality_rating', models.IntegerField(choices=[(i, i) for i in range(1, 6)], default=4)),
                        ('comment', models.TextField(blank=True, null=True)),
                        ('is_satisfied', models.BooleanField(default=True)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('citizen', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='accounts.user')),
                        ('department', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='citizen_feedbacks', to='core.department')),
                        ('report', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='feedback', to='core.report')),
                    ],
                    options={'ordering': ['-created_at']},
                ),
                migrations.CreateModel(
                    name='Appeal',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('appeal_number', models.CharField(max_length=60, unique=True)),
                        ('reason', models.TextField()),
                        ('desired_outcome', models.TextField(blank=True, null=True)),
                        ('status', models.CharField(choices=[('SUBMITTED', 'Submitted for Review'), ('UNDER_REVIEW', 'Under Administrative Investigation'), ('UPHELD', 'Upheld / Case Reopened for Redress'), ('DISMISSED', 'Dismissed with Justification')], default='SUBMITTED', max_length=30)),
                        ('reviewer_name', models.CharField(blank=True, max_length=255, null=True)),
                        ('reviewer_decision', models.TextField(blank=True, null=True)),
                        ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                        ('citizen', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='filed_appeals', to='accounts.user')),
                        ('department', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='received_appeals', to='core.department')),
                        ('report', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='appeals', to='core.report')),
                        ('reviewer', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_appeals', to='accounts.user')),
                    ],
                    options={'ordering': ['-created_at']},
                ),
                migrations.CreateModel(
                    name='ReportStatusHistory',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('old_status', models.CharField(blank=True, max_length=30, null=True)),
                        ('new_status', models.CharField(max_length=30)),
                        ('changed_by_name', models.CharField(blank=True, max_length=255, null=True)),
                        ('note', models.TextField(blank=True, null=True)),
                        ('changed_at', models.DateTimeField(auto_now_add=True)),
                        ('changed_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='accounts.user')),
                        ('report', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='status_history', to='core.report')),
                    ],
                    options={'ordering': ['changed_at']},
                ),
                migrations.CreateModel(
                    name='OfficialReport',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('reference_number', models.CharField(max_length=60, unique=True)),
                        ('title', models.CharField(max_length=255)),
                        ('report_type', models.CharField(choices=[('FIELD_INVESTIGATION', 'Field Investigation & Case Finding'), ('INTER_DEPT_COLLABORATION', 'Inter-Department Case Collaboration'), ('WEEKLY_ACTIVITY', 'Weekly Departmental Activity Report'), ('MONTHLY_SUMMARY', 'Monthly Operations & Performance Report'), ('INCIDENT_ESCALATION', 'Urgent Incident / Emergency Escalation'), ('RESOURCE_REQUEST', 'Resource, Equipment & Budget Request'), ('POLICY_RECOMMENDATION', 'Administrative & Policy Recommendation')], default='FIELD_INVESTIGATION', max_length=40)),
                        ('level', models.CharField(choices=[('OFFICER_TO_MANAGER', 'Officer to Department Manager'), ('MANAGER_TO_ADMIN', 'Department Manager to City Admin'), ('INTER_DEPARTMENT', 'Inter-Department Collaboration')], default='OFFICER_TO_MANAGER', max_length=30)),
                        ('sender_name', models.CharField(blank=True, max_length=255)),
                        ('sender_role', models.CharField(blank=True, max_length=50)),
                        ('priority', models.CharField(choices=[('ROUTINE', 'Routine'), ('PRIORITY', 'Priority'), ('URGENT', 'Urgent'), ('CRITICAL', 'Critical / Immediate Action')], default='ROUTINE', max_length=20)),
                        ('status', models.CharField(choices=[('DRAFT', 'Draft'), ('SUBMITTED', 'Submitted for Review'), ('UNDER_REVIEW', 'Under Official Review'), ('APPROVED', 'Approved / Endorsed'), ('REVISION_REQUESTED', 'Revision Requested'), ('REJECTED', 'Rejected'), ('DIRECTIVE_ISSUED', 'Executive Directive Issued')], default='SUBMITTED', max_length=30)),
                        ('executive_summary', models.TextField()),
                        ('findings', models.TextField()),
                        ('recommendations', models.TextField(blank=True, null=True)),
                        ('attachment_url', models.URLField(blank=True, max_length=1000, null=True)),
                        ('reviewer_name', models.CharField(blank=True, max_length=255, null=True)),
                        ('reviewer_feedback', models.TextField(blank=True, null=True)),
                        ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                        ('department', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='official_reports', to='core.department')),
                        ('linked_citizen_report', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='official_reports', to='core.report')),
                        ('reviewer', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_official_reports', to='accounts.user')),
                        ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='submitted_official_reports', to='accounts.user')),
                        ('target_department', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='received_official_reports', to='core.department')),
                    ],
                    options={'ordering': ['-created_at']},
                ),
                migrations.CreateModel(
                    name='MayorDirective',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('reference_number', models.CharField(max_length=60, unique=True)),
                        ('title', models.CharField(max_length=255)),
                        ('priority', models.CharField(choices=[('ROUTINE', 'Routine Directive'), ('CRITICAL', 'Critical Executive Priority'), ('EMERGENCY', 'State of Emergency / Immediate Action')], default='CRITICAL', max_length=20)),
                        ('status', models.CharField(choices=[('ISSUED', 'Issued / Active'), ('IN_PROGRESS', 'Department In Progress'), ('COMPLETED', 'Fulfilled / Completed'), ('CANCELLED', 'Revoked / Superseded')], default='ISSUED', max_length=30)),
                        ('instructions', models.TextField()),
                        ('deadline', models.DateTimeField(blank=True, null=True)),
                        ('acknowledgement_notes', models.TextField(blank=True, null=True)),
                        ('completed_at', models.DateTimeField(blank=True, null=True)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                        ('issued_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='issued_mayor_directives', to='accounts.user')),
                        ('target_department', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='mayor_directives', to='core.department')),
                    ],
                    options={'ordering': ['-created_at']},
                ),
                # Notification models (from core/notifications.py — same DB, same app label)
                migrations.CreateModel(
                    name='Notification',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('notification_type', models.CharField(max_length=50)),
                        ('title', models.CharField(max_length=255)),
                        ('body', models.TextField()),
                        ('report_id', models.IntegerField(blank=True, null=True)),
                        ('is_read', models.BooleanField(default=False)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='accounts.user')),
                    ],
                    options={'ordering': ['-created_at']},
                ),
                migrations.CreateModel(
                    name='DeviceToken',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                        ('token', models.CharField(max_length=512, unique=True)),
                        ('platform', models.CharField(choices=[('android', 'Android'), ('ios', 'iOS')], default='android', max_length=20)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='device_tokens', to='accounts.user')),
                    ],
                ),
            ],
        ),
    ]

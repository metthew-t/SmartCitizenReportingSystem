from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from core.models import Report, Department, ReportCategory, Message, DepartmentMessage, OfficialReport
from .serializers import ReportSerializer, DepartmentSerializer, ReportCategorySerializer, MessageSerializer, DepartmentMessageSerializer, OfficialReportSerializer
from django.db.models import Q
import uuid

def _safe_hasattr(obj, attr):
    try:
        return getattr(obj, attr) is not None
    except Exception:
        return False

from rest_framework.views import APIView


class PingView(APIView):
    """Lightweight health-check / keep-alive endpoint — zero database overhead."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'status': 'ok'})


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Department.objects.prefetch_related('officers').all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['get'])
    def officers(self, request, pk=None):
        dept = self.get_object()
        officers = dept.officers.all()
        data = [{'id': o.id, 'full_name': o.full_name} for o in officers]
        return Response(data)

class ReportCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ReportCategory.objects.all()
    serializer_class = ReportCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base_qs = Report.objects.select_related(
            'primary_department', 'category', 'citizen',
            'assigned_officer', 'assigned_officer__user',
            'ai_suggested_department',
        ).prefetch_related('media', 'shared_with', 'status_history')

        if user.is_city_admin or user.is_superuser or getattr(user, 'is_super_admin', False):
            return base_qs.order_by('-created_at')
        elif (user.is_department_manager or user.is_officer) and _safe_hasattr(user, 'officer_profile'):
            if user.officer_profile.department:
                return base_qs.filter(
                    Q(primary_department=user.officer_profile.department) |
                    Q(shared_with=user.officer_profile.department) |
                    Q(assigned_officer=user.officer_profile)
                ).distinct().order_by('-created_at')
            return base_qs.order_by('-created_at')
        else:
            return base_qs.filter(citizen=user).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            # Self-healing for missing schema columns in PostgreSQL
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
                    cursor.execute('ALTER TABLE core_citizenprofile ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;')
                    cursor.execute("ALTER TABLE core_citizenprofile ADD COLUMN IF NOT EXISTS civic_level VARCHAR(50) DEFAULT 'Beginner';")
                    cursor.execute("""CREATE TABLE IF NOT EXISTS core_reportstatushistory (
                        id SERIAL PRIMARY KEY,
                        old_status VARCHAR(30) NULL,
                        new_status VARCHAR(30) NOT NULL,
                        changed_by_name VARCHAR(255) NULL,
                        note TEXT NULL,
                        changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        report_id INTEGER NOT NULL,
                        changed_by_id INTEGER NULL
                    );""")
                    cursor.execute('ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(100) NULL;')
                    cursor.execute('ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS email VARCHAR(254) UNIQUE NULL;')
                    cursor.execute("""CREATE TABLE IF NOT EXISTS core_reportstatushistory (
                        id SERIAL PRIMARY KEY,
                        old_status VARCHAR(30) NULL,
                        new_status VARCHAR(30) NOT NULL,
                        changed_by_name VARCHAR(255) NULL,
                        note TEXT NULL,
                        changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        report_id INTEGER NOT NULL,
                        changed_by_id INTEGER NULL
                    );""")
                return super().list(request, *args, **kwargs)
            except Exception as e2:
                import traceback
                return Response({'error': str(e2), 'traceback': traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, *args, **kwargs):
        try:
            return super().retrieve(request, *args, **kwargs)
        except Exception as e:
            try:
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS ai_confidence_score DOUBLE PRECISION NULL;')
                    cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS ai_suggested_department_id INTEGER NULL;')
                    cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS ai_summary TEXT NULL;')
                    cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;')
                    cursor.execute('ALTER TABLE core_citizenprofile ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;')
                    cursor.execute("ALTER TABLE core_citizenprofile ADD COLUMN IF NOT EXISTS civic_level VARCHAR(50) DEFAULT 'Beginner';")
                    cursor.execute("""CREATE TABLE IF NOT EXISTS core_reportstatushistory (
                        id SERIAL PRIMARY KEY,
                        old_status VARCHAR(30) NULL,
                        new_status VARCHAR(30) NOT NULL,
                        changed_by_name VARCHAR(255) NULL,
                        note TEXT NULL,
                        changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        report_id INTEGER NOT NULL,
                        changed_by_id INTEGER NULL
                    );""")
                return super().retrieve(request, *args, **kwargs)
            except Exception as e2:
                import traceback
                return Response({'error': str(e2), 'traceback': traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create(self, request, *args, **kwargs):
        data = request.data
        lat = data.get('latitude')
        lng = data.get('longitude')
        if not lat or not lng:
            return Response({'error': 'Location is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        lat = float(lat)
        lng = float(lng)
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # Generate the case number properly
        case_number = f"AD-{uuid.uuid4().hex[:6].upper()}"
        
        # Check if the frontend provided a department name string
        department_name = data.get('department_name')
        department = None
        
        if department_name:
            department = Department.objects.filter(name__iexact=department_name).first()
            
        # If no department was provided by name, check the serializer data (if it was an ID)
        if not department:
            department = serializer.validated_data.get('primary_department')
            
        # If still no department, try to route it via AI
        if not department:
            from core.services import route_report
            recommendation = route_report(
                data.get('description', ''), 
                data.get('category')
            )
            department = recommendation.get('primary')

        # Resolve Category if provided by name or id
        category = serializer.validated_data.get('category')
        if not category:
            cat_name = data.get('category_name') or data.get('category')
            if cat_name and isinstance(cat_name, str):
                category = ReportCategory.objects.filter(
                    Q(name_en__iexact=cat_name) | Q(name_om__iexact=cat_name) | Q(name_am__iexact=cat_name)
                ).first()
                if not category:
                    category = ReportCategory.objects.create(
                        name_en=cat_name, name_om=cat_name, name_am=cat_name
                    )

        priority = data.get('priority', 'MEDIUM')
        if priority not in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']:
            priority = 'MEDIUM'
        
        try:
            report = serializer.save(
                citizen=request.user,
                latitude=lat,
                longitude=lng,
                case_number=case_number,
                status='SUBMITTED',
                primary_department=department,
                category=category,
                priority=priority,
            )
            
            # Fire notification to citizen
            from core.push_service import notify_report_submitted, notify_department_new_report
            try:
                notify_report_submitted(report)
                notify_department_new_report(report)
            except Exception as ne:
                print(f"[Notification] Warning: {ne}")
            
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            import traceback
            return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def fix_db(self, request):
        """One-time migration helper. Temporarily open to fix login crash."""
        from django.db import connection
        results = {}
        
        # Drop old columns that are no longer in the model but cause NOT NULL constraint errors
        try:
            with connection.cursor() as cursor:
                cursor.execute('ALTER TABLE core_report DROP COLUMN IF EXISTS location;')
                cursor.execute('ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS email VARCHAR(254) UNIQUE NULL;')
                cursor.execute('ALTER TABLE accounts_user ALTER COLUMN phone_number DROP NOT NULL;')
                cursor.execute("UPDATE accounts_user SET email = phone_number, phone_number = NULL WHERE phone_number LIKE '%@%' AND (email IS NULL OR email = '');")
            results['schema_fixes'] = 'applied'
        except Exception as e:
            results['schema_fixes'] = f'error: {e}'
            
        columns_to_add = {
            'core_report': {
                'latitude': 'DOUBLE PRECISION NULL',
                'longitude': 'DOUBLE PRECISION NULL',
                'location_accuracy': 'DOUBLE PRECISION NULL',
                'address': 'TEXT NULL',
                'aanaa': 'VARCHAR(255) NULL',
                'kuta_magaalaa': 'VARCHAR(255) NULL',
                'kebele': 'VARCHAR(255) NULL',
                'iddoo_addaa': 'VARCHAR(255) NULL',
                'status': "VARCHAR(30) DEFAULT 'SUBMITTED'",
                'priority': "VARCHAR(20) DEFAULT 'MEDIUM'",
                'is_anonymous': 'BOOLEAN DEFAULT FALSE',
                'rejection_reason': 'TEXT NULL',
                'resolved_at': 'TIMESTAMP WITH TIME ZONE NULL',
                'closed_at': 'TIMESTAMP WITH TIME ZONE NULL',
                'created_at': 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
                'updated_at': 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
                'citizen_id': 'INTEGER NULL',
                'category_id': 'INTEGER NULL',
                'primary_department_id': 'INTEGER NULL',
                'assigned_officer_id': 'INTEGER NULL',
                'case_number': 'VARCHAR(50) NULL',
                'description': 'TEXT NULL',
                'resolution_notes': 'TEXT NULL',
                'ai_confidence_score': 'DOUBLE PRECISION NULL',
                'ai_suggested_department_id': 'INTEGER NULL',
                'ai_summary': 'TEXT NULL',
                'is_public': 'BOOLEAN DEFAULT TRUE',
            },
            'core_citizenprofile': {
                'national_id': 'VARCHAR(50) NULL',
                'full_name': 'VARCHAR(255) NULL',
                'preferred_language': "VARCHAR(10) DEFAULT 'om'",
                'created_at': 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
                'user_id': 'INTEGER NULL',
                'points': 'INTEGER DEFAULT 0',
                'civic_level': "VARCHAR(50) DEFAULT 'Beginner'",
            },
            'accounts_user': {
                'is_city_admin': 'BOOLEAN DEFAULT FALSE',
                'is_citizen': 'BOOLEAN DEFAULT FALSE',
                'is_officer': 'BOOLEAN DEFAULT FALSE',
                'is_department_manager': 'BOOLEAN DEFAULT FALSE',
                'is_super_admin': 'BOOLEAN DEFAULT FALSE',
                'is_mayor': 'BOOLEAN DEFAULT FALSE',
                'full_name': "VARCHAR(255) DEFAULT ''",
                'profile_photo': 'VARCHAR(100) NULL',
                'email': 'VARCHAR(254) UNIQUE NULL',
                'must_change_password': 'BOOLEAN DEFAULT FALSE',
                'is_active': 'BOOLEAN DEFAULT TRUE',
            },
        }
        for table, columns in columns_to_add.items():
            for col, col_def in columns.items():
                try:
                    with connection.cursor() as cursor:
                        cursor.execute(f'ALTER TABLE {table} ADD COLUMN {col} {col_def};')
                    results[f'{table}.{col}'] = 'added'
                except Exception as e:
                    results[f'{table}.{col}'] = f'skipped/error: {e}'
        
        # Create missing tables (M2M join tables, etc.)
        tables_to_create = [
            """CREATE TABLE IF NOT EXISTS core_report_shared_with (
                id SERIAL PRIMARY KEY,
                report_id INTEGER NOT NULL,
                department_id INTEGER NOT NULL,
                UNIQUE(report_id, department_id)
            )""",
            """CREATE TABLE IF NOT EXISTS core_reportmedia (
                id SERIAL PRIMARY KEY,
                media_type VARCHAR(20) NOT NULL,
                file_url VARCHAR(1000) NOT NULL,
                uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                report_id INTEGER NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS core_message (
                id SERIAL PRIMARY KEY,
                content TEXT NULL,
                media_url VARCHAR(1000) NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                report_id INTEGER NOT NULL,
                sender_id INTEGER NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS core_feedback (
                id SERIAL PRIMARY KEY,
                rating INTEGER NOT NULL,
                timeliness_rating INTEGER DEFAULT 4,
                quality_rating INTEGER DEFAULT 4,
                comment TEXT NULL,
                is_satisfied BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                report_id INTEGER NOT NULL UNIQUE,
                citizen_id INTEGER NOT NULL,
                department_id INTEGER NULL
            )""",
            """CREATE TABLE IF NOT EXISTS core_appeal (
                id SERIAL PRIMARY KEY,
                appeal_number VARCHAR(60) UNIQUE NOT NULL,
                reason TEXT NOT NULL,
                desired_outcome TEXT NULL,
                status VARCHAR(30) DEFAULT 'SUBMITTED',
                reviewer_name VARCHAR(255) NULL,
                reviewer_decision TEXT NULL,
                reviewed_at TIMESTAMP WITH TIME ZONE NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                report_id INTEGER NOT NULL,
                citizen_id INTEGER NOT NULL,
                department_id INTEGER NULL,
                reviewer_id INTEGER NULL
            )""",
            """CREATE TABLE IF NOT EXISTS core_auditlog (
                id SERIAL PRIMARY KEY,
                action VARCHAR(100) NOT NULL,
                entity_type VARCHAR(100) NOT NULL,
                entity_id VARCHAR(100) NOT NULL,
                changes JSONB NULL,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                user_id INTEGER NULL
            )""",
            """CREATE TABLE IF NOT EXISTS core_devicetoken (
                id SERIAL PRIMARY KEY,
                token VARCHAR(500) NOT NULL,
                device_type VARCHAR(20) DEFAULT 'android',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                user_id INTEGER NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS core_notification (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                body TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                user_id INTEGER NOT NULL,
                report_id INTEGER NULL
            )""",
            """CREATE TABLE IF NOT EXISTS core_routingrule (
                id SERIAL PRIMARY KEY,
                priority INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                department_id INTEGER NOT NULL,
                category_id INTEGER NULL
            )""",
            """CREATE TABLE IF NOT EXISTS core_routingkeyword (
                id SERIAL PRIMARY KEY,
                keyword VARCHAR(100) NOT NULL,
                language VARCHAR(10) NOT NULL,
                rule_id INTEGER NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS core_departmentmessage (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                department_id INTEGER NOT NULL,
                sender_id INTEGER NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS core_reportstatushistory (
                id SERIAL PRIMARY KEY,
                old_status VARCHAR(30) NULL,
                new_status VARCHAR(30) NOT NULL,
                changed_by_name VARCHAR(255) NULL,
                note TEXT NULL,
                changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                report_id INTEGER NOT NULL,
                changed_by_id INTEGER NULL
            )""",
            """CREATE TABLE IF NOT EXISTS core_officialreport (
                id SERIAL PRIMARY KEY,
                reference_number VARCHAR(60) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL,
                report_type VARCHAR(40) NOT NULL,
                level VARCHAR(30) NOT NULL,
                sender_name VARCHAR(255) NULL,
                sender_role VARCHAR(50) NULL,
                priority VARCHAR(20) DEFAULT 'ROUTINE',
                status VARCHAR(30) DEFAULT 'SUBMITTED',
                executive_summary TEXT NOT NULL,
                findings TEXT NOT NULL,
                recommendations TEXT NULL,
                attachment_url VARCHAR(1000) NULL,
                reviewer_name VARCHAR(255) NULL,
                reviewer_feedback TEXT NULL,
                reviewed_at TIMESTAMP WITH TIME ZONE NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                department_id INTEGER NOT NULL,
                target_department_id INTEGER NULL,
                linked_citizen_report_id INTEGER NULL,
                reviewer_id INTEGER NULL,
                sender_id INTEGER NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS core_mayordirective (
                id SERIAL PRIMARY KEY,
                reference_number VARCHAR(60) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL,
                priority VARCHAR(20) DEFAULT 'CRITICAL',
                status VARCHAR(30) DEFAULT 'ISSUED',
                instructions TEXT NOT NULL,
                deadline TIMESTAMP WITH TIME ZONE NULL,
                acknowledgement_notes TEXT NULL,
                completed_at TIMESTAMP WITH TIME ZONE NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                issued_by_id INTEGER NOT NULL,
                target_department_id INTEGER NULL
            )""",
        ]
        for sql in tables_to_create:
            table_name = sql.split('IF NOT EXISTS ')[1].split(' ')[0] if 'IF NOT EXISTS' in sql else 'unknown'
            try:
                with connection.cursor() as cursor:
                    cursor.execute(sql)
                results[f'table:{table_name}'] = 'created/exists'
            except Exception as e:
                results[f'table:{table_name}'] = f'error: {e}'

        # Ensure separate Super Admin and Mayor accounts exist
        try:
            from django.contrib.auth import get_user_model
            from core.models import Department, OfficerProfile
            User = get_user_model()

            # 1. Dedicated Super Admin (admin@adama.gov.et / Admin@123)
            super_admin = User.objects.filter(email__iexact='admin@adama.gov.et').first() or User.objects.filter(is_city_admin=True, is_mayor=False).first()
            if super_admin:
                super_admin.email = 'admin@adama.gov.et'
                super_admin.full_name = 'City Super Administrator'
                super_admin.is_super_admin = True
                super_admin.is_city_admin = True
                super_admin.is_mayor = False
                super_admin.is_superuser = True
                super_admin.is_staff = True
                super_admin.set_password('Admin@123')
                super_admin.save()
                results['super_admin'] = 'configured (admin@adama.gov.et / Admin@123)'
            else:
                super_admin = User(
                    email='admin@adama.gov.et',
                    full_name='City Super Administrator',
                    is_super_admin=True,
                    is_city_admin=True,
                    is_mayor=False,
                    is_staff=True,
                    is_superuser=True
                )
                super_admin.set_password('Admin@123')
                super_admin.save()
                results['super_admin'] = 'created (admin@adama.gov.et / Admin@123)'

            # 2. Dedicated Mayor Account (mayor@adama.gov.et / Mayor@123)
            mayor_dept = Department.objects.filter(name__iexact='Waajjira Kantiibaa').first()
            mayor = User.objects.filter(email__iexact='mayor@adama.gov.et').first()
            if mayor:
                mayor.full_name = 'H.E. Mayor of Adama City'
                mayor.is_mayor = True
                mayor.is_super_admin = False
                mayor.is_city_admin = False
                mayor.is_department_manager = True
                mayor.is_staff = True
                mayor.set_password('Mayor@123')
                mayor.save()
                results['mayor_account'] = 'configured (mayor@adama.gov.et / Mayor@123)'
            else:
                mayor = User(
                    email='mayor@adama.gov.et',
                    full_name='H.E. Mayor of Adama City',
                    is_mayor=True,
                    is_super_admin=False,
                    is_city_admin=False,
                    is_department_manager=True,
                    is_staff=True,
                    is_officer=True,
                )
                mayor.set_password('Mayor@123')
                mayor.save()
                results['mayor_account'] = 'created (mayor@adama.gov.et / Mayor@123)'

            if mayor_dept:
                prof, _ = OfficerProfile.objects.get_or_create(user=mayor, defaults={'full_name': 'H.E. Mayor of Adama City'})
                prof.department = mayor_dept
                prof.is_manager = True
                prof.save()
        except Exception as e:
            results['accounts_bootstrap'] = f'error: {e}'
        
        return Response({"status": "done", "columns": results})



    @action(detail=False, methods=['post', 'get'], permission_classes=[permissions.AllowAny])
    def setup_admin(self, request):
        """Bootstrap or recover both dedicated Super Admin and Mayor accounts."""
        from django.contrib.auth import get_user_model
        from core.models import Department, OfficerProfile
        User = get_user_model()

        # Super Admin
        super_admin = User.objects.filter(email__iexact='admin@adama.gov.et').first()
        if not super_admin:
            super_admin = User(email='admin@adama.gov.et')
        super_admin.full_name = 'City Super Administrator'
        super_admin.is_super_admin = True
        super_admin.is_city_admin = True
        super_admin.is_mayor = False
        super_admin.is_superuser = True
        super_admin.is_staff = True
        super_admin.set_password('Admin@123')
        super_admin.save()

        # Mayor
        mayor_dept = Department.objects.filter(name__iexact='Waajjira Kantiibaa').first()
        mayor = User.objects.filter(email__iexact='mayor@adama.gov.et').first()
        if not mayor:
            mayor = User(email='mayor@adama.gov.et')
        mayor.full_name = 'H.E. Mayor of Adama City'
        mayor.is_mayor = True
        mayor.is_super_admin = False
        mayor.is_city_admin = False
        mayor.is_department_manager = True
        mayor.is_staff = True
        mayor.is_officer = True
        mayor.set_password('Mayor@123')
        mayor.save()
        if mayor_dept:
            prof, _ = OfficerProfile.objects.get_or_create(user=mayor, defaults={'full_name': 'H.E. Mayor of Adama City'})
            prof.department = mayor_dept
            prof.is_manager = True
            prof.save()

        return Response({
            'status': 'success',
            'super_admin': {
                'email': 'admin@adama.gov.et',
                'password': 'Admin@123',
                'role': 'super_admin',
                'dashboard': '/dashboard'
            },
            'mayor': {
                'email': 'mayor@adama.gov.et',
                'password': 'Mayor@123',
                'role': 'mayor',
                'command_center': '/mayor'
            }
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def init_departments(self, request):
        if not (request.user.is_superuser or request.user.is_city_admin or getattr(request.user, 'is_super_admin', False)):            return Response({'error': 'Superuser or city admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        
        departments = [
            "Galmeessa Siivilii", "Waajjira Invastimantii", "Bulchiinsaa fi Nageenya",
            "Waajjira Hojjataa fi Hawaasummaa", "Waajjira Aadaa fi Turiizimii",
            "Waajjira Milishaa", "Waajjira Dargaggoo fi Ispoortii",
            "Waajjira Karoora/Pilaanii fi Misoomaa", "Qajeelcha Poolisii",
            "Buusaa Gonofaa", "Abbaa Taayitaa Eegumsa Naannoo",
            "Abbaa Taayitaa Konistiraakshinii", "Koomishinii Turizimii",
            "Waajjira Lafaa", "Waajjira Fayyaa", "Waajjira Abbaa Alangaa",
            "Waajjira Saayinsii fi Teeknoloojii", "Waajjira Bishaan Dhugaatii fi Dhangala'aa",
            "Giddu-gala Tajaajilaa", "Waldaa Hojii Gamtaa", "Waajjira Albuuda",
            "Waajjira Dhimma Dubartootaa fi Daa'immanii", "Mana Qopheessaa",
            "Waajjira Galii", "Ejansii Geejjibaa", "Waajjira Kantiibaa",
            "Waajjira PSMQN", "Waajjira Kominikeeshinii", "Waajjira Daldala",
            "Waajjira Qonnaa", "Waajjira Maallaqaa", "Waajjira Carraa Hojii Uumuu fi Ogummaa",
            "Waajjira Barnoota"
        ]
        
        created_count = 0
        for dept_name in departments:
            obj, created = Department.objects.get_or_create(name=dept_name)
            if created:
                created_count += 1
                
        return Response({"status": "success", "departments_created": created_count})

    @action(detail=True, methods=['post'], url_path='update_status')
    def update_status(self, request, pk=None):
        report = self.get_object()
        user = request.user
        new_status = request.data.get('status')
        note = request.data.get('note', '') or request.data.get('resolution_notes', '')

        if new_status not in dict(Report.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        # ── Permission check ──────────────────────────────────────────────────
        # City admins and superusers: full access
        # Department managers: can update reports in their department
        # Officers: can only update reports assigned to them
        is_admin = user.is_city_admin or user.is_superuser or getattr(user, 'is_super_admin', False)
        is_manager = user.is_department_manager and _safe_hasattr(user, 'officer_profile')
        is_assigned_officer = (
            user.is_officer
            and _safe_hasattr(user, 'officer_profile')
            and report.assigned_officer is not None
            and report.assigned_officer == user.officer_profile
        )

        if not (is_admin or is_manager or is_assigned_officer):
            return Response(
                {'error': 'Only the assigned officer, department manager, or city admin can update this report status.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        old_status = report.status
        rejection_reason = (request.data.get('rejection_reason', '') or request.data.get('reason', '') or '').strip()
        resolution_notes = note if note else request.data.get('resolution_notes')

        if new_status == 'REJECTED':
            final_reason = rejection_reason or (resolution_notes or '').strip()
            if not final_reason:
                return Response(
                    {'error': 'A valid rejection reason is mandatory when rejecting a report.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            report.rejection_reason = final_reason
            resolution_notes = final_reason

        report.status = new_status
        if resolution_notes and new_status != 'REJECTED':
            report.resolution_notes = resolution_notes

        resolution_doc = request.FILES.get('resolution_document')
        if resolution_doc:
            from core.models import ReportMedia
            doc_url = None
            try:
                import cloudinary.uploader
                upload_res = cloudinary.uploader.upload(resolution_doc, resource_type='auto')
                doc_url = upload_res.get('secure_url')
            except Exception:
                pass
            if not doc_url:
                doc_url = f"https://mock-s3-bucket.s3.amazonaws.com/{report.id}_{resolution_doc.name}"
            ReportMedia.objects.create(
                report=report,
                media_type='DOCUMENT',
                file_url=doc_url
            )

        report.save()

        # ── Record status history ─────────────────────────────────────────────
        from core.models import ReportStatusHistory, OfficerProfile
        changed_by_name = None
        if _safe_hasattr(user, 'officer_profile'):
            changed_by_name = user.officer_profile.full_name
        elif _safe_hasattr(user, 'citizen_profile'):
            changed_by_name = user.citizen_profile.full_name
        else:
            changed_by_name = user.full_name or user.phone_number

        ReportStatusHistory.objects.create(
            report=report,
            old_status=old_status,
            new_status=new_status,
            changed_by=user,
            changed_by_name=changed_by_name,
            note=resolution_notes or '',
        )

        # ── Notify citizen + all admins & managers ────────────────────────────
        from core.push_service import notify_status_changed, send_push_notification
        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            notify_status_changed(report)
        except Exception as ne:
            print(f"[Notification] citizen notify warning: {ne}")

        # Notify all city admins
        try:
            admins = User.objects.filter(Q(is_city_admin=True) | Q(is_super_admin=True) | Q(is_superuser=True))
            for admin in admins:
                if admin != user and admin != report.citizen:
                    send_push_notification(
                        admin,
                        title=f'Status Updated: {report.case_number}',
                        body=f'{changed_by_name} changed status to "{new_status}".',
                        data={'type': 'STATUS_CHANGED', 'report_id': report.id},
                    )
        except Exception as ne:
            print(f"[Notification] admin notify warning: {ne}")

        # Notify department managers of the primary department
        try:
            if report.primary_department:
                managers = OfficerProfile.objects.filter(
                    department=report.primary_department, is_manager=True
                ).select_related('user')
                for mgr in managers:
                    if mgr.user and mgr.user != user:
                        send_push_notification(
                            mgr.user,
                            title=f'Status Updated: {report.case_number}',
                            body=f'{changed_by_name} changed status to "{new_status}".',
                            data={'type': 'STATUS_CHANGED', 'report_id': report.id},
                        )
        except Exception as ne:
            print(f"[Notification] manager notify warning: {ne}")

        return Response({'status': 'status updated', 'new_status': new_status})

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny], url_path='public_reports')
    def public_reports(self, request):
        """Public transparency reports endpoint (anonymized, public reports only)."""
        reports = Report.objects.filter(is_public=True).order_by('-created_at')[:100]
        serializer = self.get_serializer(reports, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny], url_path='public_stats')
    def public_stats(self, request):
        """Public transparency dashboard metrics."""
        from django.utils import timezone
        
        total = Report.objects.count()
        resolved = Report.objects.filter(status__in=['RESOLVED', 'CLOSED']).count()
        in_progress = Report.objects.filter(status='IN_PROGRESS').count()
        today_reports = Report.objects.filter(created_at__gte=timezone.now().date()).count()
        
        from core.models import CitizenProfile
        top_citizens = CitizenProfile.objects.order_by('-points')[:5]
        top_citizens_data = [{
            'name': (c.full_name[:1] + '***' + c.full_name[-1:]) if len(c.full_name) > 2 else 'Citizen',
            'points': c.points,
            'civic_level': c.civic_level,
        } for c in top_citizens]

        return Response({
            'total_reports': total,
            'resolved_reports': resolved,
            'in_progress_reports': in_progress,
            'today_reports': today_reports,
            'resolution_rate': round((resolved / total) * 100) if total > 0 else 0,
            'top_citizens': top_citizens_data,
        })

    @action(detail=True, methods=['post'], url_path='assign_officer')
    def assign_officer(self, request, pk=None):
        report = self.get_object()
        officer_id = request.data.get('officer_id')
        user = request.user
        
        from core.models import OfficerProfile
        
        if officer_id:
            # Manager assigning to someone
            if not user.is_department_manager and not user.is_city_admin and not getattr(user, 'is_super_admin', False) and not user.is_superuser:
                return Response({'error': 'Not authorized to assign others'}, status=status.HTTP_403_FORBIDDEN)
            officer = OfficerProfile.objects.filter(id=officer_id).first()
            if not officer:
                return Response({'error': 'Officer not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Officer assigning to self
            if not _safe_hasattr(user, 'officer_profile'):
                return Response({'error': 'Only officers can self-assign'}, status=status.HTTP_403_FORBIDDEN)
            officer = user.officer_profile
            
        report.assigned_officer = officer
        report.status = 'ASSIGNED'
        report.save()
        return Response({'status': 'assigned', 'officer_name': officer.full_name})

    @action(detail=True, methods=['get'], url_path='status_history')
    def status_history(self, request, pk=None):
        """Returns the full status-change history for a report."""
        report = self.get_object()
        from core.models import ReportStatusHistory
        history = ReportStatusHistory.objects.filter(report=report).order_by('changed_at')
        data = [
            {
                'id': h.id,
                'old_status': h.old_status,
                'new_status': h.new_status,
                'changed_by_name': h.changed_by_name or 'System',
                'note': h.note or '',
                'changed_at': h.changed_at.isoformat(),
            }
            for h in history
        ]
        return Response(data)

    @action(detail=True, methods=['post'], url_path='share_report')
    def share_report(self, request, pk=None):
        # Only department managers and city admins may share reports
        user = request.user
        if not (user.is_department_manager or user.is_city_admin or user.is_superuser or getattr(user, 'is_super_admin', False)):
            return Response(
                {'error': 'Only department managers or city admins can share reports.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        report = self.get_object()
        department_id = request.data.get('department_id')
        if not department_id:
            return Response({'error': 'Department ID required'}, status=status.HTTP_400_BAD_REQUEST)

        from core.models import Department
        dept = Department.objects.filter(id=department_id).first()
        if not dept:
            return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)

        report.shared_with.add(dept)

        # Notify the target department about the newly shared report
        try:
            from core.push_service import notify_department_new_report
            notify_department_new_report(report)
        except Exception as ne:
            print(f"[Notification] share_report warning: {ne}")

        return Response({
            'status': 'shared',
            'department_name': dept.name,
            'shared_with': list(report.shared_with.values_list('name', flat=True)),
        })

    @action(detail=True, methods=['post'])
    def upload_media(self, request, pk=None):
        report = self.get_object()
        file = request.FILES.get('file')
        media_type = request.data.get('media_type', 'IMAGE')
        
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        # In a real app, upload to S3/MinIO and save URL.
        # Here we mock it
        from core.models import ReportMedia
        
        media = ReportMedia.objects.create(
            report=report,
            media_type=media_type,
            file_url=f"https://mock-s3-bucket.s3.amazonaws.com/{report.id}_{file.name}"
        )
        return Response({'status': 'uploaded', 'url': media.file_url})

    @action(detail=False, methods=['post'])
    def recommend_department(self, request):
        description = request.data.get('description', '')
        category_id = request.data.get('category_id')
        is_emergency = request.data.get('is_emergency', False)
        
        from core.services import route_report
        recommendation = route_report(description, category_id, is_emergency)
        
        primary = recommendation['primary']
        supporting = recommendation['supporting']
        
        return Response({
            'primary_department': DepartmentSerializer(primary).data if primary else None,
            'supporting_departments': DepartmentSerializer(supporting, many=True).data,
        })

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        report_id = self.request.query_params.get('report', None)
        if report_id:
            return Message.objects.filter(report_id=report_id).order_by('created_at')
        return Message.objects.none()

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        report = serializer.validated_data.get('report')
        user = self.request.user
        
        # Check if user is an officer (and not the citizen who created it)
        if user.is_officer and not user.is_city_admin and not getattr(user, 'is_super_admin', False) and not user.is_superuser and report.citizen != user:
            # Department managers can chat on any report in their department
            if user.is_department_manager:
                dept = user.officer_profile.department
                if dept != report.primary_department and not report.shared_with.filter(id=dept.id).exists():
                    raise PermissionDenied("You can only chat on reports within your department.")
            else:
                # Regular officers must be assigned
                if report.assigned_officer != user.officer_profile:
                    raise PermissionDenied("You cannot communicate with the citizen before being assigned to this case.")
                    
        serializer.save(sender=user)


class DepartmentMessageViewSet(viewsets.ModelViewSet):
    """Inter-department messaging channel"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dept_id = self.request.query_params.get('department', None)
        if dept_id:
            return DepartmentMessage.objects.filter(department_id=dept_id)
        return DepartmentMessage.objects.none()

    def get_serializer_class(self):
        return DepartmentMessageSerializer

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)


class OfficialReportViewSet(viewsets.ModelViewSet):
    """
    Formal internal government reports hierarchy:
    - Officer to Department Manager: field investigations, daily/weekly activity, resource needs
    - Department Manager to City Admin: departmental operations briefs, major escalations, policy requests
    """
    serializer_class = OfficialReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _ensure_table(self):
        from django.db import connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS core_officialreport (
                    id SERIAL PRIMARY KEY,
                    reference_number VARCHAR(60) UNIQUE NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    report_type VARCHAR(40) NOT NULL,
                    level VARCHAR(30) NOT NULL,
                    sender_name VARCHAR(255) NULL,
                    sender_role VARCHAR(50) NULL,
                    priority VARCHAR(20) DEFAULT 'ROUTINE',
                    status VARCHAR(30) DEFAULT 'SUBMITTED',
                    executive_summary TEXT NOT NULL,
                    findings TEXT NOT NULL,
                    recommendations TEXT NULL,
                    attachment_url VARCHAR(1000) NULL,
                    reviewer_name VARCHAR(255) NULL,
                    reviewer_feedback TEXT NULL,
                    reviewed_at TIMESTAMP WITH TIME ZONE NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    department_id INTEGER NOT NULL,
                    target_department_id INTEGER NULL,
                    linked_citizen_report_id INTEGER NULL,
                    reviewer_id INTEGER NULL,
                    sender_id INTEGER NOT NULL
                );
                """)
                cursor.execute("ALTER TABLE core_officialreport ADD COLUMN IF NOT EXISTS target_department_id INTEGER NULL;")
        except Exception:
            pass

    def get_queryset(self):
        self._ensure_table()
        user = self.request.user
        if not user.is_authenticated:
            return OfficialReport.objects.none()

        level_filter = self.request.query_params.get('level')
        status_filter = self.request.query_params.get('status')
        dept_filter = self.request.query_params.get('department')

        if user.is_city_admin or user.is_superuser or getattr(user, 'is_super_admin', False) or getattr(user, 'is_mayor', False):
            qs = OfficialReport.objects.select_related('department', 'target_department', 'linked_citizen_report', 'sender', 'reviewer').all()
        elif user.is_department_manager:
            from core.models import OfficerProfile
            prof = getattr(user, 'officer_profile', None) or OfficerProfile.objects.filter(user=user).select_related('department').first()
            dept = prof.department if prof else None
            if dept:
                qs = OfficialReport.objects.select_related('department', 'target_department', 'linked_citizen_report', 'sender', 'reviewer').filter(
                    Q(department=dept) | Q(sender=user) | Q(target_department=dept)
                )
            else:
                qs = OfficialReport.objects.select_related('department', 'target_department', 'linked_citizen_report', 'sender', 'reviewer').all()
        elif user.is_officer:
            from core.models import OfficerProfile
            prof = getattr(user, 'officer_profile', None) or OfficerProfile.objects.filter(user=user).select_related('department').first()
            dept = prof.department if prof else None
            if dept:
                qs = OfficialReport.objects.select_related('department', 'target_department', 'linked_citizen_report', 'sender', 'reviewer').filter(
                    Q(sender=user) | (Q(department=dept) & Q(level='OFFICER_TO_MANAGER')) | Q(target_department=dept)
                )
            else:
                qs = OfficialReport.objects.select_related('department', 'target_department', 'linked_citizen_report', 'sender', 'reviewer').filter(sender=user)
        else:
            return OfficialReport.objects.none()

        if level_filter:
            qs = qs.filter(level=level_filter)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if dept_filter:
            qs = qs.filter(department_id=dept_filter)

        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied, ValidationError
        from datetime import datetime
        self._ensure_table()
        user = self.request.user

        if not (user.is_officer or user.is_department_manager or user.is_city_admin or user.is_superuser or getattr(user, 'is_super_admin', False)):
            raise PermissionDenied("Only government personnel can file official reports.")

        # Determine level & department
        dept = None
        target_dept = None
        sender_role = 'Officer'
        level = self.request.data.get('level', 'OFFICER_TO_MANAGER')

        if user.is_city_admin or user.is_superuser or getattr(user, 'is_super_admin', False):
            sender_role = 'City Admin'
            dept_id = self.request.data.get('department')
            if dept_id:
                dept = Department.objects.filter(id=dept_id).first()
            if not dept:
                dept = Department.objects.first()
            if level not in ['OFFICER_TO_MANAGER', 'MANAGER_TO_ADMIN', 'INTER_DEPARTMENT']:
                level = 'MANAGER_TO_ADMIN'
        elif user.is_department_manager:
            sender_role = 'Department Manager'
            dept = user.officer_profile.department if _safe_hasattr(user, 'officer_profile') else None
            if not dept:
                dept_id = self.request.data.get('department')
                if dept_id:
                    dept = Department.objects.filter(id=dept_id).first()
                if not dept:
                    dept = Department.objects.first()
            if level not in ['MANAGER_TO_ADMIN', 'INTER_DEPARTMENT']:
                level = 'MANAGER_TO_ADMIN'
        else:
            sender_role = 'Field Officer'
            level = 'OFFICER_TO_MANAGER'
            dept = user.officer_profile.department if _safe_hasattr(user, 'officer_profile') else None
            if not dept:
                dept_id = self.request.data.get('department')
                if dept_id:
                    dept = Department.objects.filter(id=dept_id).first()
                if not dept:
                    dept = Department.objects.first()

        # Target department for Inter-Department collaboration
        target_dept_id = self.request.data.get('target_department')
        if target_dept_id:
            target_dept = Department.objects.filter(id=target_dept_id).first()

        if level == 'INTER_DEPARTMENT' and not target_dept:
            raise ValidationError({'target_department': 'A target collaborating department is required for inter-department reports.'})

        if not dept:
            raise ValidationError({'department': 'You must be assigned to an active department to submit an official report.'})

        # Generate standard official reference number: ADM-{OFF|EXEC|COLLAB}-{YYYY}-{RANDOM}
        if level == 'INTER_DEPARTMENT':
            prefix = 'COLLAB'
        elif level == 'OFFICER_TO_MANAGER':
            prefix = 'OFF'
        else:
            prefix = 'EXEC'
        year = datetime.now().year
        ref_num = f"ADM-{prefix}-{year}-{uuid.uuid4().hex[:6].upper()}"

        sender_name = user.full_name or (user.officer_profile.full_name if _safe_hasattr(user, 'officer_profile') else '') or user.email or user.phone_number

        instance = serializer.save(
            sender=user,
            sender_name=sender_name,
            sender_role=sender_role,
            department=dept,
            target_department=target_dept,
            level=level,
            reference_number=ref_num,
            status=self.request.data.get('status', 'SUBMITTED')
        )

        # Notify target department manager if collaboration
        if target_dept:
            try:
                from core.push_service import send_push_notification
                from django.contrib.auth import get_user_model
                U = get_user_model()
                target_mgrs = U.objects.filter(is_department_manager=True, officer_profile__department=target_dept)
                for tm in target_mgrs:
                    send_push_notification(
                        tm,
                        title=f"New Inter-Department Case: {instance.title}",
                        body=f"[{dept.name}] requested case collaboration: '{instance.title}' (Ref: {ref_num})",
                        data={'type': 'OFFICIAL_REPORT', 'report_id': instance.id}
                    )
            except Exception as pe:
                print(f"[Push] Inter-dept notification error: {pe}")

        try:
            from api.analytics_views import log_audit_event
            log_audit_event(
                user=user,
                action='OFFICIAL_REPORT_SUBMITTED',
                entity_type='OFFICIAL_REPORT',
                entity_id=ref_num,
                changes={
                    'title': getattr(instance, 'title', ''),
                    'level': level,
                    'department': dept.name if dept else '',
                    'target_department': target_dept.name if target_dept else None,
                    'priority': getattr(instance, 'priority', 'ROUTINE'),
                    'status': getattr(instance, 'status', 'SUBMITTED'),
                },
                request=self.request
            )
        except Exception:
            pass

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        from django.utils import timezone
        from rest_framework.exceptions import PermissionDenied
        self._ensure_table()
        official_report = self.get_object()
        user = request.user

        # Permission check:
        # Officer cannot review reports.
        # Department Manager can review:
        # 1. Reports submitted by their officers (level='OFFICER_TO_MANAGER' and department=dept)
        # 2. Inter-department collaboration reports sent to their department (level='INTER_DEPARTMENT' and target_department=dept)
        # City Admin / Super Admin / Mayor can review all reports.
        is_admin = bool(user.is_city_admin or user.is_superuser or getattr(user, 'is_super_admin', False) or getattr(user, 'is_mayor', False))
        if user.is_officer and not user.is_department_manager and not is_admin:
            raise PermissionDenied("Officers cannot review official government reports.")

        if user.is_department_manager and not is_admin:
            dept = user.officer_profile.department if _safe_hasattr(user, 'officer_profile') else None
            is_origin_mgr = (official_report.department == dept and official_report.level == 'OFFICER_TO_MANAGER')
            is_target_collab_mgr = (official_report.target_department == dept and official_report.level == 'INTER_DEPARTMENT')
            if not (is_origin_mgr or is_target_collab_mgr):
                raise PermissionDenied("You can only review officer reports submitted within your department or inter-department collaboration requests sent to your department.")

        new_status = request.data.get('status')
        feedback = request.data.get('feedback', '')

        valid_statuses = ['UNDER_REVIEW', 'APPROVED', 'REVISION_REQUESTED', 'REJECTED', 'DIRECTIVE_ISSUED']
        if new_status not in valid_statuses:
            return Response(
                {'error': f"Invalid status. Must be one of: {', '.join(valid_statuses)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_status == 'REJECTED' and not (feedback or '').strip():
            return Response(
                {'error': 'A valid justification / rejection reason is mandatory when rejecting an official report.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reviewer_name = user.full_name or (user.officer_profile.full_name if _safe_hasattr(user, 'officer_profile') else '') or user.email or user.phone_number

        official_report.status = new_status
        official_report.reviewer = user
        official_report.reviewer_name = reviewer_name
        official_report.reviewer_feedback = feedback
        official_report.reviewed_at = timezone.now()
        official_report.save()

        # Send official notification to the sender
        try:
            from core.models import Notification
            status_labels = {
                'APPROVED': 'Approved / Endorsed',
                'REVISION_REQUESTED': 'Revision Requested',
                'REJECTED': 'Rejected',
                'DIRECTIVE_ISSUED': 'Directive Issued',
                'UNDER_REVIEW': 'Marked Under Review',
            }
            Notification.objects.create(
                user=official_report.sender,
                title=f"Official Report {status_labels.get(new_status, new_status)}",
                message=f"Report [{official_report.reference_number}] '{official_report.title}' has been {status_labels.get(new_status, new_status).lower()} by {reviewer_name}.",
                notification_type='OFFICIAL_REPORT'
            )
        except Exception:
            pass

        # Record system audit event
        try:
            from api.analytics_views import log_audit_event
            log_audit_event(
                user=user,
                action=f'OFFICIAL_REPORT_{new_status}',
                entity_type='OFFICIAL_REPORT',
                entity_id=official_report.reference_number,
                changes={
                    'title': official_report.title,
                    'status': new_status,
                    'feedback': feedback,
                    'reviewer': reviewer_name,
                },
                request=request
            )
        except Exception:
            pass

        return Response(OfficialReportSerializer(official_report).data)


class MayorOverviewView(APIView):
    """
    Mayor Executive Command Center Overview Endpoint.
    Provides total municipal sector telemetry, cross-sector live audit trails,
    department performance rankings, kebele spatial distribution, and active mayoral directives.
    Restricted to Mayor, Super Admin, and City Admin.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        is_mayor = bool(getattr(user, 'is_mayor', False))
        is_super = bool(user.is_superuser or getattr(user, 'is_super_admin', False))
        is_admin = bool(user.is_city_admin)

        if not (is_mayor or is_super or is_admin):
            return Response({'error': 'Access Denied. Mayoral Clearance Required.'}, status=status.HTTP_403_FORBIDDEN)

        from core.models import Report, Department, ReportStatusHistory, OfficialReport, MayorDirective, Feedback
        from django.db.models import Count, Q, Avg
        from django.utils import timezone

        # Ensure directives table exists
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS core_mayordirective (
                        id SERIAL PRIMARY KEY,
                        reference_number VARCHAR(60) UNIQUE NOT NULL,
                        title VARCHAR(255) NOT NULL,
                        priority VARCHAR(20) DEFAULT 'CRITICAL',
                        status VARCHAR(30) DEFAULT 'ISSUED',
                        instructions TEXT NOT NULL,
                        deadline TIMESTAMP WITH TIME ZONE NULL,
                        acknowledgement_notes TEXT NULL,
                        completed_at TIMESTAMP WITH TIME ZONE NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        issued_by_id INTEGER NOT NULL,
                        target_department_id INTEGER NULL
                    );
                """)
        except Exception:
            pass

        # ── City-Wide Telemetry ──────────────────────────────────────────────
        total_reports = Report.objects.count()
        resolved_count = Report.objects.filter(status='RESOLVED').count()
        closed_count = Report.objects.filter(status='CLOSED').count()
        in_progress_count = Report.objects.filter(status='IN_PROGRESS').count()
        investigation_count = Report.objects.filter(status='UNDER_INVESTIGATION').count()
        submitted_count = Report.objects.filter(status='SUBMITTED').count()
        critical_count = Report.objects.filter(priority='CRITICAL').exclude(status__in=['RESOLVED', 'CLOSED']).count()
        high_count = Report.objects.filter(priority='HIGH').exclude(status__in=['RESOLVED', 'CLOSED']).count()

        completed_total = resolved_count + closed_count
        resolution_rate = round((completed_total / total_reports * 100), 1) if total_reports > 0 else 0.0

        # Citizen Satisfaction rating (1 to 5)
        satisfaction_avg = 4.2
        try:
            fb = Feedback.objects.aggregate(avg_rating=Avg('rating'))
            if fb.get('avg_rating'):
                satisfaction_avg = round(fb['avg_rating'], 1)
        except Exception:
            pass

        # ── All Sectors (Departments) Performance Matrix ────────────────────
        sectors_matrix = []
        departments = Department.objects.all().order_by('name')

        for dept in departments:
            d_total = Report.objects.filter(primary_department=dept).count()
            d_resolved = Report.objects.filter(primary_department=dept, status='RESOLVED').count()
            d_closed = Report.objects.filter(primary_department=dept, status='CLOSED').count()
            d_in_progress = Report.objects.filter(primary_department=dept, status='IN_PROGRESS').count()
            d_investigation = Report.objects.filter(primary_department=dept, status='UNDER_INVESTIGATION').count()
            d_pending = Report.objects.filter(primary_department=dept, status='SUBMITTED').count()
            d_critical = Report.objects.filter(primary_department=dept, priority='CRITICAL').exclude(status__in=['RESOLVED', 'CLOSED']).count()

            d_done = d_resolved + d_closed
            d_rate = round((d_done / d_total * 100), 1) if d_total > 0 else (100.0 if d_total == 0 else 0.0)

            # Department citizen satisfaction metrics
            d_fb_count = 0
            d_fb_avg = 4.0
            d_fb_satisfaction_pct = 85.0
            try:
                dept_feedbacks = Feedback.objects.filter(Q(department=dept) | Q(report__primary_department=dept))
                d_fb_count = dept_feedbacks.count()
                if d_fb_count > 0:
                    d_avg = dept_feedbacks.aggregate(avg=Avg('rating'))['avg']
                    d_fb_avg = round(float(d_avg), 1) if d_avg else 4.0
                    satisfied_count = dept_feedbacks.filter(is_satisfied=True).count()
                    d_fb_satisfaction_pct = round((satisfied_count / d_fb_count) * 100, 1)
            except Exception:
                pass

            # Performance Tier
            if d_rate >= 80:
                tier = 'EXCELLENT'
            elif d_rate >= 50:
                tier = 'SATISFACTORY'
            else:
                tier = 'ATTENTION_REQUIRED'

            sectors_matrix.append({
                'id': dept.id,
                'name': dept.name,
                'total_reports': d_total,
                'resolved': d_resolved,
                'closed': d_closed,
                'in_progress': d_in_progress,
                'under_investigation': d_investigation,
                'pending': d_pending,
                'critical_active': d_critical,
                'resolution_rate': d_rate,
                'citizen_satisfaction': d_fb_avg,
                'satisfaction_percentage': d_fb_satisfaction_pct,
                'feedback_count': d_fb_count,
                'performance_tier': tier,
            })

        # Sort sectors by highest critical count and lower resolution rate
        sectors_matrix.sort(key=lambda s: (s['critical_active'], -s['resolution_rate']), reverse=True)

        # ── Live Cross-Sector Activity Feed ──────────────────────────────────
        recent_activity = []
        try:
            histories = ReportStatusHistory.objects.select_related('report', 'report__primary_department').order_by('-changed_at')[:30]
            for h in histories:
                recent_activity.append({
                    'id': h.id,
                    'case_number': h.report.case_number if h.report else 'N/A',
                    'report_title': h.report.description[:50] if h.report and h.report.description else 'Citizen Report',
                    'department_name': h.report.primary_department.name if h.report and h.report.primary_department else 'City Municipal',
                    'old_status': h.old_status,
                    'new_status': h.new_status,
                    'actor_name': h.changed_by_name or 'Official',
                    'timestamp': h.changed_at.isoformat(),
                    'note': h.note or '',
                    'priority': h.report.priority if h.report else 'MEDIUM',
                })
        except Exception:
            pass

        # ── Official Executive Reports Submitted to Mayor/Admin ──────────────
        executive_reports = []
        try:
            exec_qs = OfficialReport.objects.select_related('department', 'sender').order_by('-created_at')[:15]
            for er in exec_qs:
                executive_reports.append({
                    'id': er.id,
                    'reference_number': er.reference_number,
                    'title': er.title,
                    'department_name': er.department.name if er.department else 'Municipal Sector',
                    'sender_name': er.sender_name or 'Department Manager',
                    'level': er.level,
                    'status': er.status,
                    'priority': er.priority,
                    'created_at': er.created_at.isoformat(),
                    'executive_summary': er.executive_summary[:120] if er.executive_summary else '',
                })
        except Exception:
            pass

        # ── Mayor Directives ────────────────────────────────────────────────
        directives = []
        try:
            dirs = MayorDirective.objects.select_related('target_department', 'issued_by').order_by('-created_at')[:20]
            for d in dirs:
                directives.append({
                    'id': d.id,
                    'reference_number': d.reference_number,
                    'title': d.title,
                    'target_department': d.target_department.name if d.target_department else 'ALL SECTORS',
                    'target_department_id': d.target_department_id,
                    'priority': d.priority,
                    'status': d.status,
                    'instructions': d.instructions,
                    'deadline': d.deadline.isoformat() if d.deadline else None,
                    'created_at': d.created_at.isoformat(),
                })
        except Exception:
            pass

        # ── Kebele / Ward Summary ────────────────────────────────────────────
        kebele_summary = []
        try:
            kebeles = (
                Report.objects.exclude(kebele__isnull=True)
                .exclude(kebele__exact='')
                .values('kebele')
                .annotate(
                    total=Count('id'),
                    resolved=Count('id', filter=Q(status__in=['RESOLVED', 'CLOSED']))
                )
                .order_by('-total')[:10]
            )
            for k in kebeles:
                total_k = k['total']
                res_k = k['resolved']
                rate_k = round((res_k / total_k * 100), 1) if total_k > 0 else 0
                kebele_summary.append({
                    'kebele': k['kebele'],
                    'total': total_k,
                    'resolved': res_k,
                    'rate': rate_k,
                })
        except Exception:
            pass

        # ── Citizen Appeals Telemetry ─────────────────────────────────────────
        appeals_summary = {'total': 0, 'pending': 0, 'upheld': 0, 'dismissed': 0}
        recent_appeals = []
        try:
            from core.models import Appeal
            total_app = Appeal.objects.count()
            pending_app = Appeal.objects.filter(status__in=['SUBMITTED', 'UNDER_REVIEW']).count()
            upheld_app = Appeal.objects.filter(status='UPHELD').count()
            dismissed_app = Appeal.objects.filter(status='DISMISSED').count()
            appeals_summary = {
                'total': total_app,
                'pending': pending_app,
                'upheld': upheld_app,
                'dismissed': dismissed_app,
            }
            app_list = Appeal.objects.select_related('report', 'department', 'citizen').order_by('-created_at')[:10]
            for a in app_list:
                recent_appeals.append({
                    'id': a.id,
                    'appeal_number': a.appeal_number,
                    'case_number': a.report.case_number if a.report else 'N/A',
                    'department_name': a.department.name if a.department else 'Municipal Sector',
                    'reason': a.reason[:100],
                    'desired_outcome': a.desired_outcome,
                    'status': a.status,
                    'reviewer_name': a.reviewer_name,
                    'reviewer_decision': a.reviewer_decision,
                    'created_at': a.created_at.isoformat(),
                })
        except Exception:
            pass

        return Response({
            'telemetry': {
                'total_reports': total_reports,
                'resolved_count': resolved_count,
                'closed_count': closed_count,
                'in_progress_count': in_progress_count,
                'investigation_count': investigation_count,
                'submitted_count': submitted_count,
                'critical_active': critical_count,
                'high_active': high_count,
                'resolution_rate': resolution_rate,
                'citizen_satisfaction': satisfaction_avg,
                'total_sectors': len(departments),
                'total_appeals': appeals_summary['total'],
                'pending_appeals': appeals_summary['pending'],
            },
            'sectors_matrix': sectors_matrix,
            'recent_activity': recent_activity,
            'executive_reports': executive_reports,
            'directives': directives,
            'kebele_summary': kebele_summary,
            'appeals_summary': appeals_summary,
            'recent_appeals': recent_appeals,
        })


class MayorDirectiveViewSet(viewsets.ModelViewSet):
    """Endpoints for Mayor to issue, acknowledge and manage executive directives."""
    permission_classes = (permissions.IsAuthenticated,)
    from api.serializers import MayorDirectiveSerializer
    serializer_class = MayorDirectiveSerializer

    def get_queryset(self):
        from core.models import MayorDirective
        return MayorDirective.objects.select_related('target_department', 'issued_by').all().order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        is_mayor = bool(getattr(user, 'is_mayor', False))
        is_super = bool(user.is_superuser or getattr(user, 'is_super_admin', False))
        if not (is_mayor or is_super or user.is_city_admin):
            raise PermissionDenied("Only the Mayor or Super Admin can issue executive directives.")

        import uuid
        from datetime import datetime
        year = datetime.now().year
        ref_num = f"MYR-DIR-{year}-{uuid.uuid4().hex[:6].upper()}"

        directive = serializer.save(
            issued_by=user,
            reference_number=ref_num
        )

        try:
            from api.analytics_views import log_audit_event
            log_audit_event(
                user=user,
                action='MAYOR_DIRECTIVE_PROMULGATED',
                entity_type='MAYOR_DIRECTIVE',
                entity_id=ref_num,
                changes={
                    'title': directive.title,
                    'priority': directive.priority,
                    'target_department': directive.target_department.name if directive.target_department else 'ALL_SECTORS',
                },
                request=self.request
            )
        except Exception:
            pass

        # Broadcast push notification to department managers
        try:
            from core.push_service import send_push_notification
            from django.contrib.auth import get_user_model
            User = get_user_model()
            target_dept = directive.target_department
            if target_dept:
                managers = User.objects.filter(is_department_manager=True, officer_profile__department=target_dept)
            else:
                managers = User.objects.filter(is_department_manager=True)

            for m in managers:
                send_push_notification(
                    m,
                    title=f"MAYORAL DIRECTIVE: {directive.title}",
                    body=f"Executive Order [{ref_num}] issued by the Mayor's Office. Priority: {directive.priority}.",
                    data={'type': 'MAYOR_DIRECTIVE', 'directive_id': directive.id}
                )
        except Exception:
            pass


class FeedbackViewSet(viewsets.ModelViewSet):
    """
    Citizen Case Satisfaction & Service Quality Feedback:
    Citizens evaluate municipal service delivery upon case completion.
    Metrics feed directly into Mayor Executive Telemetry and Department Rankings.
    """
    permission_classes = [permissions.IsAuthenticated]
    from api.serializers import FeedbackSerializer
    serializer_class = FeedbackSerializer

    def _ensure_table(self):
        from django.db import connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS core_feedback (
                    id SERIAL PRIMARY KEY,
                    rating INTEGER NOT NULL,
                    timeliness_rating INTEGER DEFAULT 4,
                    quality_rating INTEGER DEFAULT 4,
                    comment TEXT NULL,
                    is_satisfied BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    report_id INTEGER NOT NULL UNIQUE,
                    citizen_id INTEGER NOT NULL,
                    department_id INTEGER NULL
                );
                """)
                cursor.execute("ALTER TABLE core_feedback ADD COLUMN IF NOT EXISTS department_id INTEGER NULL;")
                cursor.execute("ALTER TABLE core_feedback ADD COLUMN IF NOT EXISTS timeliness_rating INTEGER DEFAULT 4;")
                cursor.execute("ALTER TABLE core_feedback ADD COLUMN IF NOT EXISTS quality_rating INTEGER DEFAULT 4;")
        except Exception:
            pass

    def get_queryset(self):
        self._ensure_table()
        from core.models import Feedback
        user = self.request.user
        qs = Feedback.objects.select_related('report', 'citizen', 'department').all()

        dept_id = self.request.query_params.get('department')
        if dept_id:
            qs = qs.filter(department_id=dept_id)

        if user.is_city_admin or user.is_superuser or getattr(user, 'is_super_admin', False) or getattr(user, 'is_mayor', False):
            return qs.order_by('-created_at')
        elif user.is_department_manager:
            dept = user.officer_profile.department if _safe_hasattr(user, 'officer_profile') else None
            if dept:
                return qs.filter(department=dept).order_by('-created_at')
            return qs.order_by('-created_at')
        else:
            return qs.filter(citizen=user).order_by('-created_at')

    def perform_create(self, serializer):
        self._ensure_table()
        user = self.request.user
        report_id = self.request.data.get('report')
        from core.models import Report, Feedback
        from rest_framework.exceptions import ValidationError, PermissionDenied

        report = Report.objects.filter(id=report_id).first()
        if not report:
            raise ValidationError({'report': 'Valid report ID required.'})

        if report.citizen and report.citizen != user and not (user.is_superuser or getattr(user, 'is_super_admin', False)):
            raise PermissionDenied("You can only submit feedback for your own reported cases.")

        rating = int(self.request.data.get('rating', 5))
        timeliness = int(self.request.data.get('timeliness_rating', rating))
        quality = int(self.request.data.get('quality_rating', rating))
        is_satisfied = rating >= 4

        # Upsert feedback if already exists
        existing = Feedback.objects.filter(report=report).first()
        if existing:
            existing.rating = rating
            existing.timeliness_rating = timeliness
            existing.quality_rating = quality
            existing.comment = self.request.data.get('comment', existing.comment)
            existing.is_satisfied = is_satisfied
            existing.department = report.primary_department
            existing.save()
            return existing

        instance = serializer.save(
            citizen=user,
            report=report,
            department=report.primary_department,
            rating=rating,
            timeliness_rating=timeliness,
            quality_rating=quality,
            is_satisfied=is_satisfied,
        )

        try:
            from api.analytics_views import log_audit_event
            log_audit_event(
                user=user,
                action='CITIZEN_FEEDBACK_SUBMITTED',
                entity_type='FEEDBACK',
                entity_id=str(report.case_number),
                changes={
                    'rating': rating,
                    'is_satisfied': is_satisfied,
                    'department': report.primary_department.name if report.primary_department else None,
                },
                request=self.request
            )
        except Exception:
            pass

        return instance


class AppealViewSet(viewsets.ModelViewSet):
    """
    Formal Administrative Appeals Tribunal & Oversight:
    Citizens can lodge an appeal when a case is rejected, unaddressed, or inadequately resolved.
    Department Managers, City Administration, and Mayor's Executive Office review appeals.
    """
    permission_classes = [permissions.IsAuthenticated]
    from api.serializers import AppealSerializer
    serializer_class = AppealSerializer

    def _ensure_table(self):
        from django.db import connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS core_appeal (
                    id SERIAL PRIMARY KEY,
                    appeal_number VARCHAR(60) UNIQUE NOT NULL,
                    reason TEXT NOT NULL,
                    desired_outcome TEXT NULL,
                    status VARCHAR(30) DEFAULT 'SUBMITTED',
                    reviewer_name VARCHAR(255) NULL,
                    reviewer_decision TEXT NULL,
                    reviewed_at TIMESTAMP WITH TIME ZONE NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    report_id INTEGER NOT NULL,
                    citizen_id INTEGER NOT NULL,
                    department_id INTEGER NULL,
                    reviewer_id INTEGER NULL
                );
                """)
        except Exception:
            pass

    def get_queryset(self):
        self._ensure_table()
        from core.models import Appeal
        user = self.request.user
        qs = Appeal.objects.select_related('report', 'citizen', 'department', 'reviewer').all()

        dept_id = self.request.query_params.get('department')
        status_param = self.request.query_params.get('status')
        if dept_id:
            qs = qs.filter(department_id=dept_id)
        if status_param:
            qs = qs.filter(status=status_param)

        if user.is_city_admin or user.is_superuser or getattr(user, 'is_super_admin', False) or getattr(user, 'is_mayor', False):
            return qs.order_by('-created_at')
        elif user.is_department_manager:
            dept = user.officer_profile.department if _safe_hasattr(user, 'officer_profile') else None
            if dept:
                return qs.filter(department=dept).order_by('-created_at')
            return qs.order_by('-created_at')
        else:
            return qs.filter(citizen=user).order_by('-created_at')

    def perform_create(self, serializer):
        self._ensure_table()
        user = self.request.user
        report_id = self.request.data.get('report')
        from core.models import Report
        from rest_framework.exceptions import ValidationError, PermissionDenied
        from datetime import datetime
        import uuid

        report = Report.objects.filter(id=report_id).first()
        if not report:
            raise ValidationError({'report': 'Valid report ID required.'})

        year = datetime.now().year
        ref_num = f"ADM-APP-{year}-{uuid.uuid4().hex[:6].upper()}"

        instance = serializer.save(
            appeal_number=ref_num,
            citizen=user,
            report=report,
            department=report.primary_department,
            status='SUBMITTED'
        )

        # Notify department manager & city admin
        try:
            from core.push_service import send_push_notification
            from django.contrib.auth import get_user_model
            U = get_user_model()
            admins = U.objects.filter(Q(is_city_admin=True) | Q(is_super_admin=True))
            for admin in admins:
                send_push_notification(
                    admin,
                    title=f"Citizen Appeal Lodged: {report.case_number}",
                    body=f"Appeal [{ref_num}] submitted regarding case {report.case_number}.",
                    data={'type': 'APPEAL_SUBMITTED', 'appeal_id': instance.id, 'report_id': report.id}
                )
            if report.primary_department:
                mgrs = U.objects.filter(is_department_manager=True, officer_profile__department=report.primary_department)
                for m in mgrs:
                    send_push_notification(
                        m,
                        title=f"Case Appeal: {report.case_number}",
                        body=f"Citizen filed appeal [{ref_num}] contesting resolution/status.",
                        data={'type': 'APPEAL_SUBMITTED', 'appeal_id': instance.id, 'report_id': report.id}
                    )
        except Exception as pe:
            print(f"[Push] Appeal notify error: {pe}")

        try:
            from api.analytics_views import log_audit_event
            log_audit_event(
                user=user,
                action='CITIZEN_APPEAL_LODGED',
                entity_type='APPEAL',
                entity_id=ref_num,
                changes={
                    'case_number': report.case_number,
                    'reason': instance.reason,
                    'department': report.primary_department.name if report.primary_department else None,
                },
                request=self.request
            )
        except Exception:
            pass

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        self._ensure_table()
        appeal = self.get_object()
        user = request.user

        is_admin = bool(user.is_city_admin or user.is_superuser or getattr(user, 'is_super_admin', False) or getattr(user, 'is_mayor', False))
        is_mgr = bool(user.is_department_manager and _safe_hasattr(user, 'officer_profile') and user.officer_profile.department == appeal.department)

        if not (is_admin or is_mgr):
            raise PermissionDenied("Only Department Managers, City Administration, or Mayor Office can adjudicate appeals.")

        new_status = request.data.get('status')
        decision = (request.data.get('reviewer_decision') or request.data.get('decision', '')).strip()

        valid_statuses = ['UNDER_REVIEW', 'UPHELD', 'DISMISSED']
        if new_status not in valid_statuses:
            return Response({'error': f"Invalid status. Choose from: {', '.join(valid_statuses)}"}, status=status.HTTP_400_BAD_REQUEST)

        if not decision:
            return Response({'error': 'Official decision notes are mandatory when adjudicating an appeal.'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        reviewer_name = user.full_name or (user.officer_profile.full_name if _safe_hasattr(user, 'officer_profile') else '') or user.email

        appeal.status = new_status
        appeal.reviewer = user
        appeal.reviewer_name = reviewer_name
        appeal.reviewer_decision = decision
        appeal.reviewed_at = timezone.now()
        appeal.save()

        # If appeal is UPHELD (citizen appeal accepted), automatically reopen the underlying case!
        if new_status == 'UPHELD' and appeal.report:
            rep = appeal.report
            old_st = rep.status
            rep.status = 'REOPENED'
            rep.resolution_notes = f"[APPEAL UPHELD - {appeal.appeal_number}]: {decision}"
            rep.save()
            from core.models import ReportStatusHistory
            ReportStatusHistory.objects.create(
                report=rep,
                old_status=old_st,
                new_status='REOPENED',
                changed_by=user,
                changed_by_name=f"{reviewer_name} (Appeal Review)",
                note=f"Appeal {appeal.appeal_number} UPHELD: {decision}",
            )

        # Notify citizen appellant
        try:
            from core.push_service import send_push_notification
            status_text = "UPHELD / Case Reopened" if new_status == 'UPHELD' else ("DISMISSED" if new_status == 'DISMISSED' else "Under Investigation")
            send_push_notification(
                appeal.citizen,
                title=f"Appeal Decision: {appeal.appeal_number}",
                body=f"Your appeal regarding {appeal.report.case_number} has been {status_text}.",
                data={'type': 'APPEAL_DECIDED', 'appeal_id': appeal.id, 'report_id': appeal.report.id}
            )
        except Exception:
            pass

        try:
            from api.analytics_views import log_audit_event
            log_audit_event(
                user=user,
                action=f'APPEAL_{new_status}',
                entity_type='APPEAL',
                entity_id=appeal.appeal_number,
                changes={
                    'status': new_status,
                    'decision': decision,
                    'reviewer': reviewer_name,
                    'case_number': appeal.report.case_number,
                },
                request=request
            )
        except Exception:
            pass

        from api.serializers import AppealSerializer
        return Response(AppealSerializer(appeal).data)




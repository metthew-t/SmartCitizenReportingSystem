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

        if user.is_city_admin or user.is_superuser:
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
                'full_name': "VARCHAR(255) DEFAULT ''",
                'profile_photo': 'VARCHAR(100) NULL',
                'email': 'VARCHAR(254) UNIQUE NULL',
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
                comment TEXT NULL,
                is_satisfied BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                report_id INTEGER NOT NULL UNIQUE,
                citizen_id INTEGER NOT NULL
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
                linked_citizen_report_id INTEGER NULL,
                reviewer_id INTEGER NULL,
                sender_id INTEGER NOT NULL
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
        
        return Response({"status": "done", "columns": results})



    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def setup_admin(self, request):
        """One-time endpoint to create the master City Admin account."""
        if not (request.user.is_superuser or request.user.is_city_admin):
            return Response({'error': 'Superuser or city admin access required.'}, status=status.HTTP_403_FORBIDDEN)
            
        from django.contrib.auth import get_user_model
        User = get_user_model()
        email = request.data.get('email', 'admin@adama.gov.et')
        password = request.data.get('password', 'Admin@123')
        
        admin = User.objects.filter(is_city_admin=True).first()
        if admin:
            admin.email = email
            admin.set_password(password)
            admin.save()
            return Response({'message': f'Existing master admin updated! You can now log in with Email: {email} and Password: {password}'})
            
        user = User(
            email=email,
            is_city_admin=True,
            is_staff=True,
            is_superuser=True
        )
        user.set_password(password)
        user.save()
        return Response({'message': f'Master admin created! You can now log in with Email: {email} and Password: {password}'})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def init_departments(self, request):
        if not (request.user.is_superuser or request.user.is_city_admin):
            return Response({'error': 'Superuser or city admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        
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
        is_admin = user.is_city_admin or user.is_superuser
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
        resolution_notes = note if note else request.data.get('resolution_notes')

        report.status = new_status
        if resolution_notes:
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
            admins = User.objects.filter(is_city_admin=True)
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
            if not user.is_department_manager and not user.is_city_admin:
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
        if not (user.is_department_manager or user.is_city_admin or user.is_superuser):
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
        if user.is_officer and not user.is_city_admin and report.citizen != user:
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
                    linked_citizen_report_id INTEGER NULL,
                    reviewer_id INTEGER NULL,
                    sender_id INTEGER NOT NULL
                );
                """)
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

        if user.is_city_admin or user.is_superuser:
            qs = OfficialReport.objects.select_related('department', 'linked_citizen_report', 'sender', 'reviewer').all()
        elif user.is_department_manager:
            dept = user.officer_profile.department if _safe_hasattr(user, 'officer_profile') else None
            if dept:
                qs = OfficialReport.objects.select_related('department', 'linked_citizen_report', 'sender', 'reviewer').filter(
                    Q(department=dept) | Q(sender=user)
                )
            else:
                qs = OfficialReport.objects.select_related('department', 'linked_citizen_report', 'sender', 'reviewer').filter(sender=user)
        elif user.is_officer:
            qs = OfficialReport.objects.select_related('department', 'linked_citizen_report', 'sender', 'reviewer').filter(sender=user)
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

        if not (user.is_officer or user.is_department_manager or user.is_city_admin or user.is_superuser):
            raise PermissionDenied("Only government personnel can file official reports.")

        # Determine level & department
        dept = None
        sender_role = 'Officer'
        if user.is_city_admin or user.is_superuser:
            sender_role = 'City Admin'
            dept_id = self.request.data.get('department')
            if dept_id:
                dept = Department.objects.filter(id=dept_id).first()
            if not dept:
                dept = Department.objects.first()
            level = self.request.data.get('level', 'MANAGER_TO_ADMIN')
        elif user.is_department_manager:
            sender_role = 'Department Manager'
            level = 'MANAGER_TO_ADMIN'
            dept = user.officer_profile.department if _safe_hasattr(user, 'officer_profile') else None
        else:
            sender_role = 'Field Officer'
            level = 'OFFICER_TO_MANAGER'
            dept = user.officer_profile.department if _safe_hasattr(user, 'officer_profile') else None

        if not dept:
            raise ValidationError({'department': 'You must be assigned to an active department to submit an official report.'})

        # Generate standard official reference number: ADM-{OFF|EXEC}-{YYYY}-{RANDOM}
        prefix = 'OFF' if level == 'OFFICER_TO_MANAGER' else 'EXEC'
        year = datetime.now().year
        ref_num = f"ADM-{prefix}-{year}-{uuid.uuid4().hex[:6].upper()}"

        sender_name = user.full_name or (user.officer_profile.full_name if _safe_hasattr(user, 'officer_profile') else '') or user.email or user.phone_number

        serializer.save(
            sender=user,
            sender_name=sender_name,
            sender_role=sender_role,
            department=dept,
            level=level,
            reference_number=ref_num,
            status=self.request.data.get('status', 'SUBMITTED')
        )

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        from django.utils import timezone
        from rest_framework.exceptions import PermissionDenied
        self._ensure_table()
        official_report = self.get_object()
        user = request.user

        # Permission check:
        # Officer cannot review reports.
        # Department Manager can review reports submitted to their department (level='OFFICER_TO_MANAGER').
        # City Admin can review all reports (especially level='MANAGER_TO_ADMIN').
        if user.is_officer and not user.is_department_manager and not user.is_city_admin and not user.is_superuser:
            raise PermissionDenied("Officers cannot review official government reports.")

        if user.is_department_manager and not (user.is_city_admin or user.is_superuser):
            dept = user.officer_profile.department if _safe_hasattr(user, 'officer_profile') else None
            if official_report.department != dept or official_report.level != 'OFFICER_TO_MANAGER':
                raise PermissionDenied("You can only review officer reports submitted within your department.")

        new_status = request.data.get('status')
        feedback = request.data.get('feedback', '')

        valid_statuses = ['UNDER_REVIEW', 'APPROVED', 'REVISION_REQUESTED', 'REJECTED', 'DIRECTIVE_ISSUED']
        if new_status not in valid_statuses:
            return Response(
                {'error': f"Invalid status. Must be one of: {', '.join(valid_statuses)}"},
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

        return Response(OfficialReportSerializer(official_report).data)



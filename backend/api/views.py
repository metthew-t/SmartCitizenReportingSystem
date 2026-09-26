from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from core.models import Report, Department, ReportCategory, Message
from .serializers import ReportSerializer, DepartmentSerializer, ReportCategorySerializer, MessageSerializer
from django.contrib.gis.geos import Point
from django.db.models import Q
import uuid

class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Department.objects.all()
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
        if user.is_city_admin or user.is_superuser:
            return Report.objects.all().order_by('-created_at')
        elif (user.is_department_manager or user.is_officer) and hasattr(user, 'officer_profile'):
            if user.officer_profile.department:
                return Report.objects.filter(
                    Q(primary_department=user.officer_profile.department) |
                    Q(shared_with=user.officer_profile.department) |
                    Q(assigned_officer=user.officer_profile)
                ).distinct().order_by('-created_at')
            return Report.objects.all().order_by('-created_at')
        else:
            return Report.objects.filter(citizen=user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        data = request.data
        lat = data.get('latitude')
        lng = data.get('longitude')
        if not lat or not lng:
            return Response({'error': 'Location is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        point = Point(float(lng), float(lat))
        
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
                location=point,
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
        from django.db import connection
        try:
            with connection.cursor() as cursor:
                cursor.execute('ALTER TABLE core_report ADD COLUMN aanaa VARCHAR(255) NULL;')
                cursor.execute('ALTER TABLE core_report ADD COLUMN kuta_magaalaa VARCHAR(255) NULL;')
                cursor.execute('ALTER TABLE core_report ADD COLUMN iddoo_addaa VARCHAR(255) NULL;')
            return Response({"status": "fixed"})
        except Exception as e:
            return Response({"status": "error", "message": str(e)})

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def init_departments(self, request):
        import os
        from django.conf import settings
        from core.models import Department
        
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
        new_status = request.data.get('status')
        if new_status not in dict(Report.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        report.status = new_status
        report.save()
        
        # Fire notification
        from core.push_service import notify_status_changed
        notify_status_changed(report)
        
        return Response({'status': 'status updated'})

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
            if not hasattr(user, 'officer_profile'):
                return Response({'error': 'Only officers can self-assign'}, status=status.HTTP_403_FORBIDDEN)
            officer = user.officer_profile
            
        report.assigned_officer = officer
        report.status = 'ASSIGNED'
        report.save()
        return Response({'status': 'assigned', 'officer_name': officer.full_name})

    @action(detail=True, methods=['post'], url_path='share_report')
    def share_report(self, request, pk=None):
        report = self.get_object()
        department_id = request.data.get('department_id')
        if not department_id:
            return Response({'error': 'Department ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from core.models import Department
        dept = Department.objects.filter(id=department_id).first()
        if not dept:
            return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)
            
        report.shared_with.add(dept)
        return Response({'status': 'shared', 'department_name': dept.name})

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
        # We also need to notify the recipient depending on who sends the message.
        msg = serializer.save(sender=self.request.user)
        # We can add chat notification logic here later.


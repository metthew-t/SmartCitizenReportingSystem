from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from core.models import Report, Department, ReportCategory, Message
from .serializers import ReportSerializer, DepartmentSerializer, ReportCategorySerializer, MessageSerializer
from django.contrib.gis.geos import Point
import uuid

class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]

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
            return Report.objects.all()
        elif user.is_department_manager:
            return Report.objects.filter(primary_department=user.officer_profile.department)
        elif user.is_officer:
            return Report.objects.filter(assigned_officer=user.officer_profile)
        else:
            return Report.objects.filter(citizen=user)

    def create(self, request, *args, **kwargs):
        data = request.data
        lat = data.get('latitude')
        lng = data.get('longitude')
        if not lat or not lng:
            return Response({'error': 'Location is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        point = Point(float(lng), float(lat))
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # In a real app, generate the case number properly
        case_number = f"AD-{uuid.uuid4().hex[:6].upper()}"
        
        # If primary_department is not provided, try to route it
        department = serializer.validated_data.get('primary_department')
        if not department:
            from core.services import route_report
            recommendation = route_report(
                data.get('description', ''), 
                data.get('category')
            )
            department = recommendation.get('primary')
        
        try:
            report = serializer.save(
                citizen=request.user,
                location=point,
                case_number=case_number,
                status='SUBMITTED',
                primary_department=department
            )
            
            # Fire notification to citizen
            from core.push_service import notify_report_submitted, notify_department_new_report
            notify_report_submitted(report)
            notify_department_new_report(report)
            
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            import traceback
            return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
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

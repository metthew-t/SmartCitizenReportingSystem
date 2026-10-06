from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from core.models import Report, Department

def _safe_hasattr(obj, attr):
    try:
        return getattr(obj, attr) is not None
    except Exception:
        return False



def _scoped_reports(user):
    """Return a Report queryset scoped to what the requesting user is allowed to see."""
    if user.is_city_admin or user.is_superuser:
        return Report.objects.all()
    elif (user.is_department_manager or user.is_officer) and _safe_hasattr(user, 'officer_profile'):
        if user.officer_profile.department:
            return Report.objects.filter(
                Q(primary_department=user.officer_profile.department) |
                Q(shared_with=user.officer_profile.department) |
                Q(assigned_officer=user.officer_profile)
            ).distinct()
        return Report.objects.all()
    else:
        return Report.objects.filter(citizen=user)


class AnalyticsSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        last_30 = now - timedelta(days=30)

        qs = _scoped_reports(request.user)

        return Response({
            'total_reports': qs.count(),
            'new_last_30_days': qs.filter(created_at__gte=last_30).count(),
            'submitted': qs.filter(status='SUBMITTED').count(),
            'in_progress': qs.filter(status='IN_PROGRESS').count(),
            'resolved': qs.filter(status='RESOLVED').count(),
            'closed': qs.filter(status='CLOSED').count(),
            'critical': qs.filter(priority='CRITICAL').count(),
            'overdue_unassigned': qs.filter(
                status='SUBMITTED',
                created_at__lt=now - timedelta(hours=4)
            ).count(),
        })


class AnalyticsByDepartmentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _scoped_reports(request.user)
        data = (
            qs.values('primary_department__name')
            .annotate(total=Count('id'))
            .order_by('-total')
        )
        return Response(list(data))


class AnalyticsByStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _scoped_reports(request.user)
        data = (
            qs.values('status')
            .annotate(total=Count('id'))
            .order_by('status')
        )
        return Response(list(data))


class ReportGeoJSONView(APIView):
    """
    Returns reports as GeoJSON for Leaflet/MapLibre rendering.
    Filters by status, department, category, priority via query params.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _scoped_reports(request.user).exclude(latitude__isnull=True)

        # Optional filters
        status_filter = request.query_params.get('status')
        dept_filter = request.query_params.get('department_id')
        priority_filter = request.query_params.get('priority')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if dept_filter:
            qs = qs.filter(primary_department_id=dept_filter)
        if priority_filter:
            qs = qs.filter(priority=priority_filter)

        features = []
        for report in qs.select_related('category', 'primary_department')[:500]:
            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [report.longitude, report.latitude],
                },
                'properties': {
                    'id': report.id,
                    'case_number': report.case_number,
                    'status': report.status,
                    'priority': report.priority,
                    'category': report.category.name_en if report.category else None,
                    'department': report.primary_department.name if report.primary_department else None,
                    'created_at': report.created_at.isoformat(),
                }
            })

        return Response({
            'type': 'FeatureCollection',
            'features': features,
        })

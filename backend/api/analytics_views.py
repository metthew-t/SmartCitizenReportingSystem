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


class SLAOverviewView(APIView):
    """
    SLA (Service Level Agreement) tracking.
    Returns reports that are overdue based on priority:
    - CRITICAL: 24 hours
    - HIGH: 48 hours
    - MEDIUM: 7 days
    - LOW: 14 days
    """
    permission_classes = [IsAuthenticated]

    SLA_THRESHOLDS = {
        'CRITICAL': timedelta(hours=24),
        'HIGH': timedelta(hours=48),
        'MEDIUM': timedelta(days=7),
        'LOW': timedelta(days=14),
    }

    def get(self, request):
        now = timezone.now()
        qs = _scoped_reports(request.user).exclude(
            status__in=['RESOLVED', 'CLOSED', 'REJECTED']
        )

        overdue_reports = []
        sla_summary = {'total_open': 0, 'overdue': 0, 'at_risk': 0, 'on_track': 0}

        for report in qs.select_related('primary_department', 'category'):
            sla_summary['total_open'] += 1
            threshold = self.SLA_THRESHOLDS.get(report.priority, timedelta(days=7))
            deadline = report.created_at + threshold
            time_remaining = deadline - now
            hours_remaining = time_remaining.total_seconds() / 3600

            if hours_remaining < 0:
                status = 'OVERDUE'
                sla_summary['overdue'] += 1
            elif hours_remaining < (threshold.total_seconds() / 3600) * 0.25:
                status = 'AT_RISK'
                sla_summary['at_risk'] += 1
            else:
                status = 'ON_TRACK'
                sla_summary['on_track'] += 1

            if status in ('OVERDUE', 'AT_RISK'):
                overdue_reports.append({
                    'id': report.id,
                    'case_number': report.case_number,
                    'priority': report.priority,
                    'status': report.status,
                    'sla_status': status,
                    'department': report.primary_department.name if report.primary_department else None,
                    'category': report.category.name_en if report.category else None,
                    'created_at': report.created_at.isoformat(),
                    'deadline': deadline.isoformat(),
                    'hours_overdue': round(abs(hours_remaining), 1) if hours_remaining < 0 else 0,
                    'hours_remaining': round(max(0, hours_remaining), 1),
                })

        overdue_reports.sort(key=lambda x: x['hours_overdue'], reverse=True)

        return Response({
            'summary': sla_summary,
            'overdue_reports': overdue_reports[:50],
        })


class DepartmentPerformanceView(APIView):
    """
    Performance analytics by department.
    Shows average resolution time, SLA compliance rate, and workload.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_city_admin or request.user.is_superuser):
            return Response({'error': 'Only city admins can view performance analytics'}, status=403)

        now = timezone.now()
        last_30 = now - timedelta(days=30)
        departments = Department.objects.filter(is_active=True)
        performance = []

        for dept in departments:
            total = Report.objects.filter(primary_department=dept).count()
            total_30d = Report.objects.filter(primary_department=dept, created_at__gte=last_30).count()
            resolved = Report.objects.filter(primary_department=dept, status='RESOLVED').count()
            open_reports = Report.objects.filter(
                primary_department=dept
            ).exclude(status__in=['RESOLVED', 'CLOSED', 'REJECTED']).count()

            # Calculate average resolution time
            resolved_with_time = Report.objects.filter(
                primary_department=dept,
                status='RESOLVED',
                resolved_at__isnull=False
            )
            avg_hours = 0
            if resolved_with_time.exists():
                total_hours = sum(
                    (r.resolved_at - r.created_at).total_seconds() / 3600
                    for r in resolved_with_time
                )
                avg_hours = round(total_hours / resolved_with_time.count(), 1)

            # SLA compliance (resolved within threshold)
            sla_compliant = 0
            sla_thresholds = {'CRITICAL': 24, 'HIGH': 48, 'MEDIUM': 168, 'LOW': 336}
            for r in resolved_with_time:
                if r.resolved_at and r.created_at:
                    hours_taken = (r.resolved_at - r.created_at).total_seconds() / 3600
                    threshold = sla_thresholds.get(r.priority, 168)
                    if hours_taken <= threshold:
                        sla_compliant += 1

            sla_rate = round((sla_compliant / resolved_with_time.count()) * 100, 1) if resolved_with_time.count() > 0 else 0

            performance.append({
                'department': dept.name,
                'department_id': dept.id,
                'total_reports': total,
                'reports_last_30d': total_30d,
                'resolved': resolved,
                'open': open_reports,
                'resolution_rate': round((resolved / total) * 100, 1) if total > 0 else 0,
                'avg_resolution_hours': avg_hours,
                'sla_compliance_rate': sla_rate,
            })

        performance.sort(key=lambda x: x['sla_compliance_rate'], reverse=True)
        return Response(performance)


class AuditLogView(APIView):
    """View audit logs of all status changes and actions."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_city_admin or request.user.is_superuser):
            return Response({'error': 'Only city admins can view audit logs'}, status=403)

        from core.models import AuditLog
        logs = AuditLog.objects.all().order_by('-timestamp')[:200]
        data = []
        for log in logs:
            data.append({
                'id': log.id,
                'user': log.user.phone_number if log.user else 'System',
                'action': log.action,
                'entity_type': log.entity_type,
                'entity_id': log.entity_id,
                'changes': log.changes,
                'timestamp': log.timestamp.isoformat(),
            })
        return Response(data)


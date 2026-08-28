from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import (
    RegisterSerializer, OfficerRegisterSerializer,
    CustomTokenObtainPairSerializer, UserSerializer
)

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(APIView):
    """Citizen registration: phone + password + full_name"""
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'phone_number': user.phone_number,
                    'full_name': serializer.validated_data['full_name'],
                    'is_citizen': True,
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class OfficerRegisterView(APIView):
    """Officer/Department Manager registration"""
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = OfficerRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'phone_number': user.phone_number,
                    'full_name': serializer.validated_data['full_name'],
                    'department': serializer.validated_data['department_name'],
                    'is_officer': True,
                    'is_department_manager': serializer.validated_data.get('is_manager', False),
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user

class UserListView(APIView):
    """Admin-only endpoint to list all users and delete them"""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        if not (request.user.is_city_admin or request.user.is_superuser):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        users = User.objects.all().order_by('-date_joined')
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def delete(self, request, pk=None):
        if not (request.user.is_city_admin or request.user.is_superuser):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        user_id = pk or request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
            if user.id == request.user.id:
                return Response({'error': 'Cannot delete your own account'}, status=status.HTTP_400_BAD_REQUEST)
            user.delete()
            return Response({'status': 'User deleted'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

class StatsView(APIView):
    """Real-time dashboard statistics"""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        from core.models import Report, Department
        from django.db.models import Count, Q
        from datetime import datetime, timedelta

        user = request.user
        
        # Determine which reports to show
        if user.is_city_admin or user.is_superuser:
            reports = Report.objects.all()
        elif user.is_department_manager and hasattr(user, 'officer_profile'):
            reports = Report.objects.filter(primary_department=user.officer_profile.department)
        elif user.is_officer and hasattr(user, 'officer_profile'):
            reports = Report.objects.filter(assigned_officer=user.officer_profile)
        else:
            reports = Report.objects.filter(citizen=user)

        total = reports.count()
        status_counts = dict(reports.values_list('status').annotate(c=Count('id')))
        priority_counts = dict(reports.values_list('priority').annotate(c=Count('id')))

        resolved = status_counts.get('RESOLVED', 0)
        closed = status_counts.get('CLOSED', 0)
        pending = total - resolved - closed - status_counts.get('REJECTED', 0)
        critical = priority_counts.get('CRITICAL', 0)
        resolution_rate = round(((resolved + closed) / total) * 100) if total > 0 else 0

        # Weekly trend (last 8 weeks)
        weekly_trend = []
        now = datetime.now()
        for w in range(7, -1, -1):
            week_start = now - timedelta(weeks=w+1)
            week_end = now - timedelta(weeks=w)
            count = reports.filter(created_at__gte=week_start, created_at__lt=week_end).count()
            weekly_trend.append({
                'label': week_start.strftime('%b %d'),
                'count': count,
            })

        # Status distribution
        all_statuses = ['SUBMITTED', 'RECEIVED', 'ASSIGNED', 'UNDER_INVESTIGATION',
                        'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'REJECTED']
        status_distribution = {s: status_counts.get(s, 0) for s in all_statuses}

        # Priority distribution
        all_priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        priority_distribution = {p: priority_counts.get(p, 0) for p in all_priorities}

        # Recent reports
        recent = reports.order_by('-created_at')[:5]
        recent_list = [{
            'id': r.id,
            'case_number': r.case_number,
            'description': r.description[:80],
            'status': r.status,
            'priority': r.priority,
            'department_name': r.primary_department.name if r.primary_department else 'Unassigned',
            'created_at': r.created_at.isoformat(),
        } for r in recent]

        return Response({
            'total': total,
            'resolved': resolved,
            'closed': closed,
            'pending': pending,
            'critical': critical,
            'resolution_rate': resolution_rate,
            'status_distribution': status_distribution,
            'priority_distribution': priority_distribution,
            'weekly_trend': weekly_trend,
            'recent_reports': recent_list,
        })

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.conf import settings as django_settings
from .serializers import (

    RegisterSerializer, OfficerRegisterSerializer,
    CustomTokenObtainPairSerializer, UserSerializer
)

def _safe_hasattr(obj, attr):
    try:
        return getattr(obj, attr) is not None
    except Exception:
        return False

User = get_user_model()


# ── OTP endpoints ─────────────────────────────────────────────────────────────

class SendOTPView(APIView):
    """
    POST /api/v1/auth/send-otp/
    Body: { "phone_number": "09xxxxxxxx" }

    Generates a 6-digit OTP, stores it in Django cache, and sends it via
    TextBee SMS to the provided phone number.

    Call this before showing the OTP entry screen. A fresh OTP replaces any
    previously issued but unconsumed OTP for the same number.
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        phone_number = request.data.get('phone_number', '').strip()
        if not phone_number:
            return Response(
                {'error': 'phone_number is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from core.sms_service import send_otp_sms, _normalise_e164
        normalised = _normalise_e164(phone_number)
        
        # Check if user already exists for registration
        is_forgot_password = request.data.get('is_forgot_password', False)
        
        user_exists = User.objects.filter(phone_number__in=[phone_number, normalised]).exists()
        
        if not is_forgot_password and user_exists:
            return Response(
                {'error': 'This user phone number already exists.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        if is_forgot_password and not user_exists:
            return Response(
                {'error': 'Phone number not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        result = send_otp_sms(phone_number)

        if result['success']:
            expiry = getattr(django_settings, 'OTP_EXPIRY_MINUTES', 10)
            return Response(
                {'message': f'OTP sent successfully. Valid for {expiry} minutes.'},
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {'error': f'Failed to send OTP: {result.get("error", "Unknown error")}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class VerifyOTPView(APIView):
    """
    POST /api/v1/auth/verify-otp/
    Body: { "phone_number": "09xxxxxxxx", "otp": "123456" }

    Verifies the supplied OTP. On success the phone is flagged as verified in
    cache for 15 minutes. The client must complete registration (POST
    /auth/register/) within that window.
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        phone_number = request.data.get('phone_number', '').strip()
        otp = request.data.get('otp', '').strip()

        if not phone_number or not otp:
            return Response(
                {'error': 'phone_number and otp are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from core.sms_service import verify_otp
        if verify_otp(phone_number, otp):
            return Response(
                {'verified': True, 'message': 'Phone number verified successfully.'},
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {'verified': False, 'error': 'Invalid or expired OTP. Please request a new one.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


# ── Password / account management ─────────────────────────────────────────────

class ChangePasswordView(APIView):
    """Allow authenticated users to change their password."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if not old_password or not new_password:
            return Response(
                {'error': 'old_password and new_password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not user.check_password(old_password):
            return Response({'error': 'Old password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 6:
            return Response(
                {'error': 'New password must be at least 6 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)


class DeleteAccountView(APIView):
    """Allow authenticated users to delete their own account."""
    permission_classes = (IsAuthenticated,)

    def delete(self, request):
        user = request.user
        password = request.data.get('password')
        if not password or not user.check_password(password):
            return Response({'error': 'Password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response({'message': 'Account deleted successfully.'}, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """
    Reset password for users who forgot their password.
    Requires phone OTP to have been verified first.
    Body: { "phone_number": "...", "new_password": "..." }
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        phone_number = request.data.get('phone_number', '').strip()
        new_password = request.data.get('new_password', '')
        
        if not phone_number or not new_password:
            return Response({'error': 'phone_number and new_password are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if len(new_password) < 6:
            return Response({'error': 'New password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        from core.sms_service import is_phone_verified, consume_phone_verified, _normalise_e164
        normalised = _normalise_e164(phone_number)
        
        if not is_phone_verified(phone_number) and not is_phone_verified(normalised):
            return Response(
                {'error': 'Phone number not verified. Please verify your phone with OTP first.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            # Get the user by phone number or normalised phone number
            user = User.objects.filter(phone_number__in=[phone_number, normalised]).first()
            if not user:
                return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
                
            user.set_password(new_password)
            user.save()
            
            # Consume the verified flag so it can't be reused
            consume_phone_verified(phone_number)
            consume_phone_verified(normalised)
            
            return Response({'message': 'Password reset successfully.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── Auth ──────────────────────────────────────────────────────────────────────

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(APIView):
    """
    Citizen registration.
    Requires phone OTP to have been verified first via:
      POST /auth/send-otp/ → POST /auth/verify-otp/ → POST /auth/register/

    Body: { "phone_number", "password", "full_name", "national_id" (optional) }
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        phone_number = request.data.get('phone_number', '').strip()

        # Enforce OTP verification before account creation
        from core.sms_service import is_phone_verified, consume_phone_verified, _normalise_e164
        normalised = _normalise_e164(phone_number)
        # Check both the raw input and the normalised form
        if not is_phone_verified(phone_number) and not is_phone_verified(normalised):
            return Response(
                {'error': 'Phone number not verified. Please verify your phone with OTP first.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Consume the verified flag so it can't be reused
            consume_phone_verified(phone_number)
            consume_phone_verified(normalised)

            refresh = RefreshToken.for_user(user)

            # Send welcome SMS
            try:
                from core.sms_service import send_sms
                send_sms(
                    user.phone_number,
                    f'[Adama Smart Citizen] Baga mana geessan! '
                    f'Galmaan keessan raawwatame. '
                    f'Amma raga gabaafachuu ni dandeessu.',
                )
            except Exception as e:
                print(f'[SMS] Welcome SMS failed: {e}')

            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'phone_number': user.phone_number,
                    'full_name': serializer.validated_data['full_name'],
                    'is_citizen': True,
                },
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OfficerRegisterView(APIView):
    """Officer / Department Manager registration (admin-initiated)."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        user = request.user
        if not (user.is_city_admin or user.is_superuser or user.is_department_manager):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
            
        data = request.data.copy()
        
        # Enforce department restriction for department managers
        if user.is_department_manager and not (user.is_city_admin or user.is_superuser):
            dept = user.officer_profile.department
            if dept:
                data['department_name'] = dept.name
            data['is_manager'] = False # Managers cannot create other managers
            data['is_city_admin'] = False

        serializer = OfficerRegisterSerializer(data=data)
        if serializer.is_valid():
            new_user = serializer.save()
            return Response({'status': 'User created successfully', 'email': new_user.email}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user


# ── Admin ─────────────────────────────────────────────────────────────────────

class UserListView(APIView):
    """Admin-only endpoint to list all users and delete them."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        user = request.user
        if not (user.is_city_admin or user.is_superuser or user.is_department_manager):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        if user.is_city_admin or user.is_superuser:
            users = User.objects.all().order_by('-date_joined')
        else:
            # Department manager can only see users in their department
            dept = user.officer_profile.department
            users = User.objects.filter(officer_profile__department=dept).order_by('-date_joined')
            
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def delete(self, request, pk=None):
        user = request.user
        if not (user.is_city_admin or user.is_superuser or user.is_department_manager):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        user_id = pk or request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user = User.objects.get(id=user_id)
            if target_user.id == user.id:
                return Response({'error': 'Cannot delete your own account'}, status=status.HTTP_400_BAD_REQUEST)
            
            if user.is_department_manager and not (user.is_city_admin or user.is_superuser):
                dept = user.officer_profile.department
                if not target_user.is_officer or target_user.officer_profile.department != dept:
                    return Response({'error': 'You can only delete officers in your department'}, status=status.HTTP_403_FORBIDDEN)

            target_user.delete()
            return Response({'status': 'User deleted'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


class StatsView(APIView):
    """Real-time dashboard statistics."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        from core.models import Report, Department
        from django.db.models import Count, Q
        from django.utils import timezone
        from datetime import timedelta

        user = request.user

        if user.is_city_admin or user.is_superuser:
            reports = Report.objects.all()
        elif (user.is_department_manager or user.is_officer) and _safe_hasattr(user, 'officer_profile'):
            if user.officer_profile.department:
                reports = Report.objects.filter(
                    Q(primary_department=user.officer_profile.department) |
                    Q(shared_with=user.officer_profile.department) |
                    Q(assigned_officer=user.officer_profile)
                ).distinct()
            else:
                reports = Report.objects.all()
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

        weekly_trend = []
        now = timezone.now()
        for w in range(7, -1, -1):
            week_start = now - timedelta(weeks=w + 1)
            week_end = now - timedelta(weeks=w)
            count = reports.filter(created_at__gte=week_start, created_at__lt=week_end).count()
            weekly_trend.append({'label': week_start.strftime('%b %d'), 'count': count})

        all_statuses = ['SUBMITTED', 'RECEIVED', 'ASSIGNED', 'UNDER_INVESTIGATION',
                        'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'REJECTED']
        status_distribution = {s: status_counts.get(s, 0) for s in all_statuses}

        all_priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        priority_distribution = {p: priority_counts.get(p, 0) for p in all_priorities}

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

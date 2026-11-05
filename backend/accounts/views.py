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

        from core.sms_service import send_otp_sms, get_phone_variants
        variants = get_phone_variants(phone_number)
        
        # Check if user already exists for registration
        is_forgot_password = request.data.get('is_forgot_password', False)
        
        user_exists = User.objects.filter(phone_number__in=variants).exists()
        
        if not is_forgot_password and user_exists:
            return Response(
                {'error': 'This user phone number already exists.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        if is_forgot_password and not user_exists:
            return Response(
                {'error': 'Phone number not found in our records.'},
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

        # Enforce government 12-character strong password standard
        from .validators import validate_strong_password
        from django.core.exceptions import ValidationError
        try:
            validate_strong_password(new_password)
        except ValidationError as ve:
            return Response(
                {'error': ve.message if hasattr(ve, 'message') else str(ve)},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.must_change_password = False
        user.save()
        return Response({'message': 'Password changed successfully. Your account is fully secured and updated.'}, status=status.HTTP_200_OK)


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

        from core.sms_service import is_phone_verified, consume_phone_verified, get_phone_variants
        variants = get_phone_variants(phone_number)
        
        if not is_phone_verified(phone_number):
            return Response(
                {'error': 'Phone number not verified. Please verify your phone with OTP first.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            # Get the user by phone number or any of its standard variants
            user = User.objects.filter(phone_number__in=variants).first()
            if not user:
                return Response({'error': 'User not found in our records.'}, status=status.HTTP_404_NOT_FOUND)
                
            user.set_password(new_password)
            user.save()
            
            # Consume the verified flag so it can't be reused
            consume_phone_verified(phone_number)
            
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
        from core.sms_service import is_phone_verified, consume_phone_verified
        if not is_phone_verified(phone_number):
            return Response(
                {'error': 'Phone number not verified. Please verify your phone with OTP first.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Consume the verified flag so it can't be reused
            consume_phone_verified(phone_number)

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
        is_super = bool(user.is_superuser or getattr(user, 'is_super_admin', False))
        if not (user.is_city_admin or is_super or user.is_department_manager):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
            
        data = request.data.copy()
        
        # Enforce department restriction for department managers
        if user.is_department_manager and not (user.is_city_admin or is_super):
            dept = user.officer_profile.department
            if dept:
                data['department_name'] = dept.name
            data['is_manager'] = False # Managers cannot create other managers
            data['is_city_admin'] = False
            data['is_super_admin'] = False
            data['is_mayor'] = False

        # Only super admin can create city admins, super admins, or mayors
        if not is_super:
            data['is_city_admin'] = False
            data['is_super_admin'] = False
            data['is_mayor'] = False

        serializer = OfficerRegisterSerializer(data=data)
        if serializer.is_valid():
            new_user = serializer.save()
            return Response({'status': 'User created successfully', 'email': new_user.email}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute('ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;')
                cursor.execute('ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;')
        except Exception:
            pass
        return super().get(request, *args, **kwargs)

    def get_object(self):
        user = self.request.user
        # Auto-heal legacy accounts where email was stored in phone_number
        if user.phone_number and '@' in user.phone_number:
            if not user.email:
                user.email = user.phone_number
            user.phone_number = None
            try:
                user.save(update_fields=['email', 'phone_number'])
            except Exception:
                pass
        return user

    def patch(self, request, *args, **kwargs):
        user = request.user
        data = request.data

        # Only City Admin / Super Admin / Mayor can edit their email
        if 'email' in data:
            new_email = (data.get('email') or '').strip().lower()
            if new_email and new_email != (user.email or '').lower():
                if not (user.is_city_admin or user.is_superuser or getattr(user, 'is_super_admin', False) or getattr(user, 'is_mayor', False)):
                    return Response(
                        {'error': 'Officers and Department Managers cannot change their own email. Please contact City Admin.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                if User.objects.filter(email__iexact=new_email).exclude(id=user.id).exists():
                    return Response({'error': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)
                user.email = new_email

        if 'phone_number' in data:
            new_phone = (data.get('phone_number') or '').strip()
            if new_phone:
                if User.objects.filter(phone_number=new_phone).exclude(id=user.id).exists():
                    return Response({'error': 'A user with this phone number already exists.'}, status=status.HTTP_400_BAD_REQUEST)
                user.phone_number = new_phone
            else:
                user.phone_number = None

        if 'full_name' in data:
            name = (data.get('full_name') or '').strip()
            if name:
                user.full_name = name
                if _safe_hasattr(user, 'officer_profile'):
                    user.officer_profile.full_name = name
                    user.officer_profile.save()
                elif _safe_hasattr(user, 'citizen_profile'):
                    user.citizen_profile.full_name = name
                    user.citizen_profile.save()

        user.save()
        return Response(UserSerializer(user).data)


class ProfilePhotoUploadView(APIView):
    """Upload or update profile photo for the logged-in user."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        photo = request.FILES.get('photo')
        if not photo:
            return Response({'error': 'No photo file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        user.profile_photo = photo
        user.save()
        photo_url = request.build_absolute_uri(user.profile_photo.url) if user.profile_photo else None
        return Response({'message': 'Profile photo updated.', 'photo_url': photo_url}, status=status.HTTP_200_OK)


class AdminResetPasswordView(APIView):
    """
    Admin or Department Manager can reset a user's password.
    Body: { "user_id": <int>, "new_password": "..." }
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        requester = request.user
        user_id = request.data.get('user_id')
        new_password = request.data.get('new_password', '')

        if not user_id or not new_password:
            return Response({'error': 'user_id and new_password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce government 12-character strong password standard
        from .validators import validate_strong_password
        from django.core.exceptions import ValidationError
        try:
            validate_strong_password(new_password)
        except ValidationError as ve:
            return Response(
                {'error': ve.message if hasattr(ve, 'message') else str(ve)},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        def _finish_reset(u):
            u.set_password(new_password)
            u.must_change_password = True
            u.save()
            if u.phone_number:
                try:
                    from core.sms_service import send_sms
                    send_sms(
                        u.phone_number,
                        f"[Adama Smart City] Your official account password was reset by administration. You are REQUIRED to change your password immediately upon login to protect your account."
                    )
                except Exception as se:
                    print(f"[SMS] Reset notification error: {se}")

        # City admin / superuser can reset anyone (but city admin cannot reset super admin)
        if requester.is_city_admin or requester.is_superuser or getattr(requester, 'is_super_admin', False):
            # City admin cannot reset super admin passwords
            requester_is_super = bool(requester.is_superuser or getattr(requester, 'is_super_admin', False))
            target_is_super = bool(target_user.is_superuser or getattr(target_user, 'is_super_admin', False))
            target_is_mayor = bool(getattr(target_user, 'is_mayor', False))
            if (target_is_super or target_is_mayor) and not requester_is_super:
                return Response({'error': 'Only Super Admin can reset Mayor or Super Admin passwords.'}, status=status.HTTP_403_FORBIDDEN)
            _finish_reset(target_user)
            return Response({'message': f'Password for {target_user.email or target_user.phone_number} has been reset. Mandatory password change SMS triggered.'})

        # Department manager can only reset officers in their department
        if requester.is_department_manager:
            if not _safe_hasattr(requester, 'officer_profile') or not requester.officer_profile.department:
                return Response({'error': 'You are not assigned to a department.'}, status=status.HTTP_403_FORBIDDEN)
            req_dept = requester.officer_profile.department
            if not _safe_hasattr(target_user, 'officer_profile') or target_user.officer_profile.department != req_dept:
                return Response({'error': 'You can only reset passwords for officers in your own department.'}, status=status.HTTP_403_FORBIDDEN)
            if target_user.is_city_admin or target_user.is_department_manager:
                return Response({'error': 'You cannot reset a manager or admin password.'}, status=status.HTTP_403_FORBIDDEN)
            _finish_reset(target_user)
            return Response({'message': f'Password for {target_user.email or target_user.phone_number} has been reset. Mandatory password change SMS triggered.'})

        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)


# ── Admin ─────────────────────────────────────────────────────────────────────

class UserListView(APIView):
    """Admin-only endpoint to list all users and delete them."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        user = request.user
        is_super = bool(user.is_superuser or getattr(user, 'is_super_admin', False))
        if not (user.is_city_admin or is_super or user.is_department_manager):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        if user.is_city_admin or is_super:
            users = User.objects.all().order_by('-date_joined')
        else:
            # Department manager can only see users in their department
            dept = user.officer_profile.department
            users = User.objects.filter(officer_profile__department=dept).order_by('-date_joined')
            
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def delete(self, request, pk=None):
        user = request.user
        is_super = bool(user.is_superuser or getattr(user, 'is_super_admin', False))
        if not (user.is_city_admin or is_super or user.is_department_manager):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        user_id = pk or request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user = User.objects.get(id=user_id)
            if target_user.id == user.id:
                return Response({'error': 'Cannot delete your own account'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Super admin or Mayor accounts can only be deleted by Super Admin
            target_is_super = bool(target_user.is_superuser or getattr(target_user, 'is_super_admin', False))
            target_is_mayor = bool(getattr(target_user, 'is_mayor', False))
            if (target_is_super or target_is_mayor) and not is_super:
                return Response({'error': 'Only Super Admin can delete a Super Admin or Mayor account.'}, status=status.HTTP_403_FORBIDDEN)
            
            # City admin accounts can only be deleted by super admin
            if target_user.is_city_admin and not is_super:
                return Response({'error': 'Only Super Admin can delete a City Admin account.'}, status=status.HTTP_403_FORBIDDEN)

            if user.is_department_manager and not (user.is_city_admin or is_super):
                dept = user.officer_profile.department
                if not target_user.is_officer or target_user.officer_profile.department != dept:
                    return Response({'error': 'You can only delete officers in your department'}, status=status.HTTP_403_FORBIDDEN)

            target_user.delete()
            return Response({'status': 'User deleted'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk=None):
        caller = request.user
        caller_is_super = bool(caller.is_superuser or getattr(caller, 'is_super_admin', False))
        if not (caller.is_city_admin or caller_is_super or caller.is_department_manager):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        user_id = pk or request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # Super admin or Mayor accounts can only be edited by Super Admin
        target_is_super = bool(target_user.is_superuser or getattr(target_user, 'is_super_admin', False))
        target_is_mayor = bool(getattr(target_user, 'is_mayor', False))
        if (target_is_super or target_is_mayor) and not caller_is_super:
            return Response({'error': 'Only Super Admin can edit a Super Admin or Mayor account.'}, status=status.HTTP_403_FORBIDDEN)

        # City admin accounts can only be edited by super admin
        if target_user.is_city_admin and not caller_is_super:
            return Response({'error': 'Only Super Admin can edit a City Admin account.'}, status=status.HTTP_403_FORBIDDEN)

        # Department manager can only edit officers in their own department
        if caller.is_department_manager and not (caller.is_city_admin or caller_is_super):
            dept = caller.officer_profile.department if _safe_hasattr(caller, 'officer_profile') else None
            if not target_user.is_officer or not _safe_hasattr(target_user, 'officer_profile') or target_user.officer_profile.department != dept:
                return Response({'error': 'You can only edit officers in your department'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        if 'email' in data:
            new_email = (data.get('email') or '').strip().lower()
            if new_email and new_email != (target_user.email or '').lower():
                if User.objects.filter(email__iexact=new_email).exclude(id=target_user.id).exists():
                    return Response({'error': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)
                target_user.email = new_email

        if 'phone_number' in data:
            new_phone = (data.get('phone_number') or '').strip()
            if new_phone:
                if User.objects.filter(phone_number=new_phone).exclude(id=target_user.id).exists():
                    return Response({'error': 'A user with this phone number already exists.'}, status=status.HTTP_400_BAD_REQUEST)
                target_user.phone_number = new_phone
            else:
                target_user.phone_number = None

        if 'full_name' in data:
            name = (data.get('full_name') or '').strip()
            if name:
                target_user.full_name = name
                if _safe_hasattr(target_user, 'officer_profile'):
                    target_user.officer_profile.full_name = name
                    target_user.officer_profile.save()
                elif _safe_hasattr(target_user, 'citizen_profile'):
                    target_user.citizen_profile.full_name = name
                    target_user.citizen_profile.save()

        if 'is_active' in data:
            if target_user.id == caller.id:
                return Response({'error': 'You cannot deactivate your own account.'}, status=status.HTTP_400_BAD_REQUEST)
            target_user.is_active = bool(data.get('is_active'))

        target_user.save()
        return Response(UserSerializer(target_user).data)


class StatsView(APIView):
    """Real-time dashboard statistics."""
    permission_classes = (IsAuthenticated,)
    def get(self, request):
        try:
            return self._calculate_stats(request)
        except Exception:
            try:
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS ai_confidence_score DOUBLE PRECISION NULL;')
                    cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS ai_suggested_department_id INTEGER NULL;')
                    cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS ai_summary TEXT NULL;')
                    cursor.execute('ALTER TABLE core_report ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;')
                    cursor.execute('ALTER TABLE core_citizenprofile ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;')
                    cursor.execute("ALTER TABLE core_citizenprofile ADD COLUMN IF NOT EXISTS civic_level VARCHAR(50) DEFAULT 'Beginner';")
                return self._calculate_stats(request)
            except Exception as e:
                import traceback
                return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _calculate_stats(self, request):
        from core.models import Report, Department
        from django.db.models import Count, Q
        from django.utils import timezone
        from datetime import timedelta

        user = request.user

        if user.is_city_admin or user.is_superuser or getattr(user, 'is_super_admin', False):
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

        recent = reports.select_related('primary_department').order_by('-created_at')[:5]
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

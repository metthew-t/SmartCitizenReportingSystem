from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

def _safe_hasattr(obj, attr):
    try:
        return getattr(obj, attr) is not None
    except Exception:
        return False


User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()
    is_super_admin = serializers.SerializerMethodField()
    is_mayor = serializers.SerializerMethodField()
    officer_profile_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'phone_number', 'email', 'full_name', 'department_name',
                  'is_citizen', 'is_officer', 'is_department_manager', 'is_city_admin', 'is_super_admin', 'is_mayor',
                  'is_active', 'must_change_password', 'date_joined', 'profile_photo_url', 'officer_profile_id')
        read_only_fields = ('is_citizen', 'is_officer', 'is_department_manager', 'is_city_admin', 'is_super_admin', 'is_mayor', 'officer_profile_id')

    def get_officer_profile_id(self, obj):
        try:
            return obj.officer_profile.id if hasattr(obj, 'officer_profile') else None
        except Exception:
            return None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Self-heal legacy records where email address was stored in phone_number field
        phone = ret.get('phone_number')
        email = ret.get('email')
        if phone and '@' in str(phone):
            if not email:
                ret['email'] = phone
            ret['phone_number'] = None
        return ret

    def get_is_super_admin(self, obj):
        return bool(obj.is_superuser or getattr(obj, 'is_super_admin', False))

    def get_is_mayor(self, obj):
        return bool(getattr(obj, 'is_mayor', False))

    def get_full_name(self, obj):
        # Try model field first
        if hasattr(obj, 'full_name') and obj.full_name:
            return obj.full_name
        if _safe_hasattr(obj, 'citizen_profile'):
            return obj.citizen_profile.full_name
        if _safe_hasattr(obj, 'officer_profile'):
            return obj.officer_profile.full_name
        return obj.phone_number

    def get_department_name(self, obj):
        if _safe_hasattr(obj, 'officer_profile') and obj.officer_profile.department:
            return obj.officer_profile.department.name
        return None

    def get_profile_photo_url(self, obj):
        try:
            if obj.profile_photo:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.profile_photo.url)
                return obj.profile_photo.url
        except Exception:
            pass
        return None

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        is_mayor = bool(getattr(user, 'is_mayor', False))
        is_super = bool((user.is_superuser or getattr(user, 'is_super_admin', False)) and not is_mayor)
        token['phone_number'] = user.phone_number
        token['email'] = user.email
        token['is_citizen'] = user.is_citizen
        token['is_officer'] = user.is_officer
        token['is_department_manager'] = user.is_department_manager
        token['is_city_admin'] = is_super or user.is_city_admin
        token['is_super_admin'] = is_super
        token['is_mayor'] = is_mayor
        token['must_change_password'] = bool(getattr(user, 'must_change_password', False))
        token['role'] = 'mayor' if is_mayor else ('super_admin' if is_super else ('city_admin' if user.is_city_admin else ('department_manager' if user.is_department_manager else ('officer' if user.is_officer else 'citizen'))))

        return token

    def validate(self, attrs):
        # Auto-heal must_change_password column if missing
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute('ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;')
        except Exception:
            pass

        # The default USERNAME_FIELD is phone_number, but officials log in with email.
        # Resolve the identifier to the actual phone_number so SimpleJWT can find the user.
        from django.db.models import Q
        identifier = attrs.get(User.USERNAME_FIELD, '')
        resolved_user = None
        try:
            try:
                resolved_user = User.objects.get(Q(phone_number=identifier) | Q(email=identifier))
            except Exception:
                resolved_user = User.objects.get(phone_number=identifier)
            attrs[User.USERNAME_FIELD] = resolved_user.phone_number or resolved_user.email
        except (User.DoesNotExist, User.MultipleObjectsReturned):
            pass  # let SimpleJWT handle the error

        data = super().validate(attrs)
        # Include must_change_password in login payload for instant client enforcement
        if resolved_user:
            data['must_change_password'] = bool(getattr(resolved_user, 'must_change_password', False))
        return data

class RegisterSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, min_length=4)
    full_name = serializers.CharField(max_length=255)
    national_id = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('A user with this phone number already exists.')
        return value

    def create(self, validated_data):
        from core.models import CitizenProfile
        user = User.objects.create_user(
            phone_number=validated_data['phone_number'],
            password=validated_data['password'],
            is_citizen=True
        )
        CitizenProfile.objects.create(
            user=user,
            full_name=validated_data['full_name'],
            national_id=validated_data.get('national_id', ''),
        )
        return user

class OfficerRegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    password = serializers.CharField(write_only=True, min_length=12)
    full_name = serializers.CharField(max_length=255)
    department_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    is_manager = serializers.BooleanField(default=False)
    is_city_admin = serializers.BooleanField(default=False)
    is_super_admin = serializers.BooleanField(default=False)
    is_mayor = serializers.BooleanField(default=False)

    def validate_password(self, value):
        from .validators import validate_strong_password
        return validate_strong_password(value)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_phone_number(self, value):
        if value and value.strip():
            clean = value.strip()
            if User.objects.filter(phone_number=clean).exists():
                raise serializers.ValidationError('A user with this phone number already exists.')
            return clean
        return ''

    def validate_department_name(self, value):
        from core.models import Department
        if not value or value in ['City Administration', 'All Departments', 'Bulchiinsa Magaalaa']:
            return value
        if not Department.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError(f'Department "{value}" does not exist.')
        return value

    def create(self, validated_data):
        from core.models import Department, OfficerProfile
        dept_name = validated_data.get('department_name', '')
        is_mayor = validated_data.get('is_mayor', False)
        is_super_admin = validated_data.get('is_super_admin', False) and not is_mayor
        
        if is_mayor:
            dept_name = 'Waajjira Kantiibaa'
            is_city_admin = False
            is_manager = False
            is_staff = True
            is_superuser = False
        else:
            is_city_admin = validated_data.get('is_city_admin', False) or is_super_admin or dept_name in ['City Administration', 'All Departments', 'Bulchiinsa Magaalaa']
            is_manager = validated_data.get('is_manager', False) or is_super_admin
            is_staff = is_city_admin or is_super_admin
            is_superuser = is_super_admin

        dept = Department.objects.filter(name__iexact=dept_name).first() if dept_name else None
        phone = validated_data.get('phone_number', '').strip() or None

        user = User.objects.create_user(
            phone_number=phone,
            email=validated_data['email'],
            password=validated_data['password'],
            is_officer=True,
            is_department_manager=False if is_mayor else (is_manager or is_city_admin),
            is_city_admin=is_city_admin,
            is_super_admin=is_super_admin,
            is_mayor=is_mayor,
            is_staff=is_staff,
            is_superuser=is_superuser,
            must_change_password=True,
        )
        OfficerProfile.objects.create(
            user=user,
            full_name=validated_data['full_name'],
            department=dept,
            is_manager=False if is_mayor else (is_manager or is_city_admin),
        )

        # Send immediate SMS notification to user instructing them to change their password
        if phone:
            try:
                from core.sms_service import send_sms
                send_sms(
                    phone,
                    f"[Adama Smart City] Your official account ({user.email}) has been provisioned. In accordance with municipal cybersecurity policy, you are REQUIRED to change your password immediately upon first login before accessing the system."
                )
            except Exception as se:
                print(f"[SMS] Account creation notification error: {se}")

        return user

class OTPVerifySerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    otp = serializers.CharField(max_length=6)

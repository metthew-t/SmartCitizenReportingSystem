from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'phone_number', 'full_name', 'department_name',
                  'is_citizen', 'is_officer', 'is_department_manager', 'is_city_admin',
                  'date_joined')
        read_only_fields = ('is_citizen', 'is_officer', 'is_department_manager', 'is_city_admin')

    def get_full_name(self, obj):
        if hasattr(obj, 'citizen_profile'):
            return obj.citizen_profile.full_name
        if hasattr(obj, 'officer_profile'):
            return obj.officer_profile.full_name
        return obj.phone_number

    def get_department_name(self, obj):
        if hasattr(obj, 'officer_profile') and obj.officer_profile.department:
            return obj.officer_profile.department.name
        return None

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['phone_number'] = user.phone_number
        token['is_citizen'] = user.is_citizen
        token['is_officer'] = user.is_officer
        token['is_department_manager'] = user.is_department_manager
        token['is_city_admin'] = user.is_city_admin

        return token

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
    phone_number = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, min_length=4)
    full_name = serializers.CharField(max_length=255)
    department_name = serializers.CharField(max_length=255)
    is_manager = serializers.BooleanField(default=False)

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('A user with this phone number already exists.')
        return value

    def validate_department_name(self, value):
        from core.models import Department
        if not Department.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError(f'Department "{value}" does not exist.')
        return value

    def create(self, validated_data):
        from core.models import Department, OfficerProfile
        dept = Department.objects.filter(name__iexact=validated_data['department_name']).first()
        is_manager = validated_data.get('is_manager', False)

        user = User.objects.create_user(
            phone_number=validated_data['phone_number'],
            password=validated_data['password'],
            is_officer=True,
            is_department_manager=is_manager,
        )
        OfficerProfile.objects.create(
            user=user,
            full_name=validated_data['full_name'],
            department=dept,
            is_manager=is_manager,
        )
        return user

class OTPVerifySerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    otp = serializers.CharField(max_length=6)

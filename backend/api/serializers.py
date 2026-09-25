from rest_framework import serializers
from core.models import Report, ReportCategory, Department, ReportMedia, Message

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class ReportCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportCategory
        fields = '__all__'

class ReportMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportMedia
        fields = '__all__'

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ['sender']

    def get_sender_name(self, obj):
        if obj.sender:
            if hasattr(obj.sender, 'citizen_profile'):
                return obj.sender.citizen_profile.full_name
            elif hasattr(obj.sender, 'officer_profile'):
                return obj.sender.officer_profile.full_name
            return obj.sender.phone_number
        return 'Unknown'

class ReportSerializer(serializers.ModelSerializer):
    media = ReportMediaSerializer(many=True, read_only=True)
    department_name = serializers.CharField(source='primary_department.name', read_only=True)
    category_name = serializers.CharField(source='category.name_en', read_only=True)
    latitude = serializers.FloatField(source='location.y', read_only=True)
    longitude = serializers.FloatField(source='location.x', read_only=True)
    citizen_name = serializers.SerializerMethodField()
    citizen_phone = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'id', 'case_number', 'citizen', 'citizen_name', 'citizen_phone',
            'is_anonymous', 'category', 'category_name', 
            'description', 'latitude', 'longitude', 'status', 'priority', 
            'primary_department', 'department_name', 'assigned_officer', 
            'created_at', 'updated_at', 'resolved_at', 'closed_at', 'media',
            'aanaa', 'kuta_magaalaa', 'iddoo_addaa'
        ]
        read_only_fields = ['case_number', 'status', 'citizen']

    def get_citizen_name(self, obj):
        if obj.is_anonymous:
            return "Anonymous"
        if obj.citizen:
            if hasattr(obj.citizen, 'citizen_profile') and obj.citizen.citizen_profile.full_name:
                return obj.citizen.citizen_profile.full_name
            return obj.citizen.phone_number
        return "Unknown"

    def get_citizen_phone(self, obj):
        if obj.is_anonymous:
            return ""
        if obj.citizen:
            return obj.citizen.phone_number
        return ""

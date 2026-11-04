from rest_framework import serializers
from core.models import Report, ReportCategory, Department, ReportMedia, Message, DepartmentMessage, ReportStatusHistory, OfficialReport

def _safe_hasattr(obj, attr):
    try:
        return getattr(obj, attr) is not None
    except Exception:
        return False


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

class ReportStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportStatusHistory
        fields = ['id', 'old_status', 'new_status', 'changed_by', 'changed_by_name', 'note', 'changed_at']

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ['sender']

    def get_sender_name(self, obj):
        if obj.sender:
            if _safe_hasattr(obj.sender, 'citizen_profile'):
                return obj.sender.citizen_profile.full_name
            elif _safe_hasattr(obj.sender, 'officer_profile'):
                return obj.sender.officer_profile.full_name
            return obj.sender.phone_number
        return 'Unknown'

class DepartmentMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_dept_name = serializers.SerializerMethodField()

    class Meta:
        model = DepartmentMessage
        fields = ['id', 'department', 'sender', 'sender_name', 'sender_dept_name', 'content', 'created_at']
        read_only_fields = ['sender']

    def get_sender_name(self, obj):
        if obj.sender:
            if _safe_hasattr(obj.sender, 'officer_profile'):
                return obj.sender.officer_profile.full_name
            elif _safe_hasattr(obj.sender, 'citizen_profile'):
                return obj.sender.citizen_profile.full_name
            return obj.sender.phone_number
        return 'Unknown'

    def get_sender_dept_name(self, obj):
        if obj.sender and _safe_hasattr(obj.sender, 'officer_profile') and obj.sender.officer_profile.department:
            return obj.sender.officer_profile.department.name
        return None

class ReportSerializer(serializers.ModelSerializer):
    media = ReportMediaSerializer(many=True, read_only=True)
    status_history = ReportStatusHistorySerializer(many=True, read_only=True)
    department_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    citizen_name = serializers.SerializerMethodField()
    citizen_phone = serializers.SerializerMethodField()
    assigned_officer_name = serializers.SerializerMethodField()
    ai_suggested_department_name = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'id', 'case_number', 'citizen', 'citizen_name', 'citizen_phone',
            'is_anonymous', 'category', 'category_name', 
            'description', 'latitude', 'longitude', 'status', 'priority', 
            'primary_department', 'department_name', 'shared_with', 'assigned_officer', 'assigned_officer_name',
            'created_at', 'updated_at', 'resolved_at', 'closed_at', 'media', 'status_history',
            'aanaa', 'kuta_magaalaa', 'kebele', 'iddoo_addaa', 'resolution_notes',
            'ai_confidence_score', 'ai_suggested_department', 'ai_suggested_department_name', 'ai_summary', 'is_public'
        ]
        read_only_fields = ['case_number', 'status', 'citizen']

    def get_ai_suggested_department_name(self, obj):
        try:
            return obj.ai_suggested_department.name if obj.ai_suggested_department else None
        except Exception:
            return None

    def get_department_name(self, obj):
        try:
            return obj.primary_department.name if obj.primary_department else None
        except Exception:
            return None

    def get_category_name(self, obj):
        try:
            return obj.category.name_en if obj.category else None
        except Exception:
            return None

    def get_latitude(self, obj):
        try:
            return obj.latitude
        except Exception:
            return None

    def get_longitude(self, obj):
        try:
            return obj.longitude
        except Exception:
            return None

    def get_assigned_officer_name(self, obj):
        try:
            return obj.assigned_officer.full_name if obj.assigned_officer else None
        except Exception:
            return None

    def get_citizen_name(self, obj):
        try:
            if obj.is_anonymous:
                return "Anonymous"
            if obj.citizen:
                if _safe_hasattr(obj.citizen, 'citizen_profile'):
                    cp = obj.citizen.citizen_profile
                    if cp and cp.full_name:
                        return cp.full_name
                return obj.citizen.phone_number
            return "Unknown"
        except Exception:
            return "Unknown"

    def get_citizen_phone(self, obj):
        try:
            if obj.is_anonymous:
                return ""
            if obj.citizen:
                return obj.citizen.phone_number
            return ""
        except Exception:
            return ""


class OfficialReportSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    linked_case_number = serializers.CharField(source='linked_citizen_report.case_number', read_only=True, default=None)
    linked_report_title = serializers.CharField(source='linked_citizen_report.title', read_only=True, default=None)

    class Meta:
        model = OfficialReport
        fields = [
            'id', 'reference_number', 'title', 'report_type', 'level',
            'sender', 'sender_name', 'sender_role',
            'department', 'department_name',
            'linked_citizen_report', 'linked_case_number', 'linked_report_title',
            'priority', 'status',
            'executive_summary', 'findings', 'recommendations', 'attachment_url',
            'reviewer', 'reviewer_name', 'reviewer_feedback', 'reviewed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'reference_number', 'sender', 'sender_name', 'sender_role',
            'department_name', 'linked_case_number', 'linked_report_title',
            'reviewer', 'reviewer_name', 'reviewed_at', 'created_at', 'updated_at'
        ]


class MayorDirectiveSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='target_department.name', read_only=True, default='All Sectors')
    issued_by_name = serializers.SerializerMethodField()

    class Meta:
        from core.models import MayorDirective
        model = MayorDirective
        fields = '__all__'
        read_only_fields = ('reference_number', 'issued_by', 'created_at', 'updated_at')

    def get_issued_by_name(self, obj):
        if not obj.issued_by:
            return 'Mayor of Adama'
        return obj.issued_by.full_name or obj.issued_by.email or 'Mayor of Adama'


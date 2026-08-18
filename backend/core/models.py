from django.db import models
from django.conf import settings
from django.contrib.gis.db import models as gis_models

class Department(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class CitizenProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='citizen_profile')
    national_id = models.CharField(max_length=50, blank=True, null=True)
    full_name = models.CharField(max_length=255)
    preferred_language = models.CharField(max_length=10, choices=[('om', 'Afaan Oromo'), ('am', 'Amharic'), ('en', 'English')], default='om')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name

class OfficerProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='officer_profile')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name='officers')
    full_name = models.CharField(max_length=255)
    is_manager = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} ({self.department})"

class ReportCategory(models.Model):
    name_om = models.CharField(max_length=255)
    name_am = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name_en

class Report(gis_models.Model):
    STATUS_CHOICES = [
        ('SUBMITTED', 'Submitted'),
        ('RECEIVED', 'Received'),
        ('ASSIGNED', 'Assigned'),
        ('UNDER_INVESTIGATION', 'Under Investigation'),
        ('IN_PROGRESS', 'In Progress'),
        ('RESOLVED', 'Resolved'),
        ('CLOSED', 'Closed'),
        ('REOPENED', 'Reopened'),
        ('REJECTED', 'Rejected'),
    ]

    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    case_number = models.CharField(max_length=50, unique=True)
    citizen = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='reports')
    is_anonymous = models.BooleanField(default=False)
    
    category = models.ForeignKey(ReportCategory, on_delete=models.SET_NULL, null=True)
    description = models.TextField()
    
    # Location
    location = gis_models.PointField(geography=True)
    location_accuracy = models.FloatField(null=True, blank=True)
    address = models.TextField(blank=True, null=True)
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='SUBMITTED')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')
    
    primary_department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name='primary_reports')
    assigned_officer = models.ForeignKey(OfficerProfile, on_delete=models.SET_NULL, null=True, related_name='assigned_reports')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    rejection_reason = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.case_number

class ReportMedia(models.Model):
    MEDIA_TYPES = [
        ('IMAGE', 'Image'),
        ('VIDEO', 'Video'),
        ('AUDIO', 'Audio'),
        ('DOCUMENT', 'Document'),
    ]
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='media')
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPES)
    file_url = models.URLField(max_length=1000)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
class RoutingRule(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='routing_rules')
    category = models.ForeignKey(ReportCategory, on_delete=models.CASCADE, null=True, blank=True)
    priority = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
class RoutingKeyword(models.Model):
    rule = models.ForeignKey(RoutingRule, on_delete=models.CASCADE, related_name='keywords')
    keyword = models.CharField(max_length=100)
    language = models.CharField(max_length=10, choices=[('om', 'Afaan Oromo'), ('am', 'Amharic'), ('en', 'English')])

class Message(models.Model):
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField(blank=True, null=True)
    media_url = models.URLField(max_length=1000, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100)
    changes = models.JSONField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

class Feedback(models.Model):
    report = models.OneToOneField(Report, on_delete=models.CASCADE, related_name='feedback')
    citizen = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField(blank=True, null=True)
    is_satisfied = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Feedback for {self.report.case_number} - {self.rating} Stars"

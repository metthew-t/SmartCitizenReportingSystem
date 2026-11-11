from django.db import models
from django.conf import settings

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
    points = models.IntegerField(default=0)
    civic_level = models.CharField(max_length=50, default='Beginner')
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

class Report(models.Model):
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
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_accuracy = models.FloatField(null=True, blank=True)
    address = models.TextField(blank=True, null=True)
    aanaa = models.CharField(max_length=255, blank=True, null=True)
    kuta_magaalaa = models.CharField(max_length=255, blank=True, null=True)
    kebele = models.CharField(max_length=255, blank=True, null=True)
    iddoo_addaa = models.CharField(max_length=255, blank=True, null=True)
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='SUBMITTED')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')
    
    # AI Triage Features
    ai_confidence_score = models.FloatField(null=True, blank=True)
    ai_suggested_department = models.ForeignKey('Department', on_delete=models.SET_NULL, null=True, related_name='ai_suggested_reports')
    ai_summary = models.TextField(blank=True, null=True)
    is_public = models.BooleanField(default=True) # For Transparency Dashboard
    
    primary_department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name='primary_reports')
    shared_with = models.ManyToManyField(Department, related_name='shared_reports', blank=True)
    assigned_officer = models.ForeignKey(OfficerProfile, on_delete=models.SET_NULL, null=True, related_name='assigned_reports')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    rejection_reason = models.TextField(blank=True, null=True)
    resolution_notes = models.TextField(blank=True, null=True)
    
    # ── SLA & Auto-Escalation Engine ──────────────────────────────────────────
    sla_deadline = models.DateTimeField(null=True, blank=True)
    sla_hours = models.IntegerField(default=48)
    is_escalated = models.BooleanField(default=False)
    escalation_level = models.CharField(
        max_length=30, 
        choices=[('NONE', 'None'), ('MANAGER', 'Manager Attention'), ('MAYOR', 'Mayor Escalated Queue')],
        default='NONE'
    )
    escalation_reason = models.TextField(blank=True, null=True)

    # ── Officer Field Verification: Before & After Proof ──────────────────────
    resolution_proof_url = models.URLField(max_length=1000, blank=True, null=True)
    citizen_confirmed_resolution = models.BooleanField(null=True, blank=True)
    citizen_confirmation_notes = models.TextField(blank=True, null=True)

    # ── Public Transparency & "I am also affected" (+1) ───────────────────────
    affected_count = models.PositiveIntegerField(default=1)

    # ── Geofencing Municipal Boundary ─────────────────────────────────────────
    is_within_geofence = models.BooleanField(default=True)

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

class DepartmentMessage(models.Model):
    """Inter-department communication messages"""
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='dept_messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.department.name}] {self.sender} - {self.content[:40]}"

class DepartmentChatSeen(models.Model):
    """Tracks read receipts / seen by identity for departmental channels"""
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='seen_receipts')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='dept_seen_receipts')
    last_seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('department', 'user')
        ordering = ['-last_seen_at']

    def __str__(self):
        return f"{self.user} seen {self.department} at {self.last_seen_at}"

class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    actor_name = models.CharField(max_length=255, blank=True, null=True)
    actor_role = models.CharField(max_length=50, blank=True, null=True)
    ip_address = models.CharField(max_length=60, blank=True, null=True)
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100)
    changes = models.JSONField(blank=True, null=True)
    tamper_hash = models.CharField(max_length=64, blank=True, null=True)
    prev_hash = models.CharField(max_length=64, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M')}] {self.actor_name or 'System'} - {self.action} on {self.entity_type} #{self.entity_id}"

class ReportAffectedCitizen(models.Model):
    """Tracks 'I am also affected' (+1) community upvotes per report without duplicate tickets"""
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='affected_citizens')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.CharField(max_length=60, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Affected: {self.report.case_number} by {self.user or self.ip_address}"

class NotificationLog(models.Model):
    """Audit and dispatch log for multi-channel notifications (SMS, Telegram, Push, System)"""
    CHANNEL_CHOICES = [
        ('SMS', 'TextBee SMS Gateway'),
        ('TELEGRAM', 'Telegram Bot'),
        ('WHATSAPP', 'WhatsApp Cloud Messaging'),
        ('PUSH', 'FCM Push Notification'),
        ('SYSTEM', 'System Alert'),
    ]
    recipient_phone = models.CharField(max_length=50, blank=True, null=True)
    recipient_name = models.CharField(max_length=255, blank=True, null=True)
    channel = models.CharField(max_length=30, choices=CHANNEL_CHOICES, default='SMS')
    event_type = models.CharField(max_length=60) # SUBMITTED, ASSIGNED, RESOLVED, ESCALATED, SLA_BREACH
    report = models.ForeignKey(Report, on_delete=models.SET_NULL, null=True, blank=True, related_name='notification_logs')
    message_body = models.TextField()
    status = models.CharField(max_length=20, default='SENT') # SENT, SIMULATED, FAILED
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"[{self.channel}] {self.event_type} to {self.recipient_phone or self.recipient_name}: {self.status}"

class Feedback(models.Model):
    report = models.OneToOneField(Report, on_delete=models.CASCADE, related_name='feedback')
    citizen = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='citizen_feedbacks')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    timeliness_rating = models.IntegerField(default=4, choices=[(i, i) for i in range(1, 6)])
    quality_rating = models.IntegerField(default=4, choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField(blank=True, null=True)
    is_satisfied = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Feedback for {self.report.case_number} - {self.rating} Stars"

class Appeal(models.Model):
    """
    Formal Administrative Appeal Process:
    Citizens can appeal unresolved, rejected, or unsatisfactorily closed cases.
    Reviewed by Department Managers, City Administration, and Mayor's Office.
    """
    STATUS_CHOICES = [
        ('SUBMITTED', 'Submitted for Review'),
        ('UNDER_REVIEW', 'Under Administrative Investigation'),
        ('UPHELD', 'Upheld / Case Reopened for Redress'),
        ('DISMISSED', 'Dismissed with Justification'),
    ]

    appeal_number = models.CharField(max_length=60, unique=True)
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='appeals')
    citizen = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='filed_appeals')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_appeals')
    
    reason = models.TextField(help_text="Detailed grounds for appealing the decision or handling of the report")
    desired_outcome = models.TextField(blank=True, null=True, help_text="Specific administrative remedy requested by citizen")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='SUBMITTED')
    
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_appeals')
    reviewer_name = models.CharField(max_length=255, blank=True, null=True)
    reviewer_decision = models.TextField(blank=True, null=True, help_text="Official administrative decision and explanation")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.appeal_number}] Appeal for {self.report.case_number} ({self.status})"

class ReportStatusHistory(models.Model):
    """Immutable log of every status change on a report."""
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=30, blank=True, null=True)
    new_status = models.CharField(max_length=30)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    changed_by_name = models.CharField(max_length=255, blank=True, null=True)
    note = models.TextField(blank=True, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['changed_at']

    def __str__(self):
        return f"{self.report.case_number}: {self.old_status} -> {self.new_status}"

class OfficialReport(models.Model):
    """
    Formal internal government reports hierarchy:
    1. Officer -> Department Manager (Work reports, incident investigations, field reports)
    2. Department Manager -> City Admin (Executive departmental reports, policy requests, monthly briefs)
    """
    LEVEL_CHOICES = [
        ('OFFICER_TO_MANAGER', 'Officer to Department Manager'),
        ('MANAGER_TO_ADMIN', 'Department Manager to City Admin'),
        ('INTER_DEPARTMENT', 'Inter-Department Collaboration'),
    ]

    REPORT_TYPE_CHOICES = [
        ('FIELD_INVESTIGATION', 'Field Investigation & Case Finding'),
        ('INTER_DEPT_COLLABORATION', 'Inter-Department Case Collaboration'),
        ('WEEKLY_ACTIVITY', 'Weekly Departmental Activity Report'),
        ('MONTHLY_SUMMARY', 'Monthly Operations & Performance Report'),
        ('INCIDENT_ESCALATION', 'Urgent Incident / Emergency Escalation'),
        ('RESOURCE_REQUEST', 'Resource, Equipment & Budget Request'),
        ('POLICY_RECOMMENDATION', 'Administrative & Policy Recommendation'),
    ]

    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted for Review'),
        ('UNDER_REVIEW', 'Under Official Review'),
        ('APPROVED', 'Approved / Endorsed'),
        ('REVISION_REQUESTED', 'Revision Requested'),
        ('REJECTED', 'Rejected'),
        ('DIRECTIVE_ISSUED', 'Executive Directive Issued'),
    ]

    PRIORITY_CHOICES = [
        ('ROUTINE', 'Routine'),
        ('PRIORITY', 'Priority'),
        ('URGENT', 'Urgent'),
        ('CRITICAL', 'Critical / Immediate Action'),
    ]

    reference_number = models.CharField(max_length=60, unique=True)
    title = models.CharField(max_length=255)
    report_type = models.CharField(max_length=40, choices=REPORT_TYPE_CHOICES, default='FIELD_INVESTIGATION')
    level = models.CharField(max_length=30, choices=LEVEL_CHOICES, default='OFFICER_TO_MANAGER')

    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submitted_official_reports')
    sender_name = models.CharField(max_length=255, blank=True)
    sender_role = models.CharField(max_length=50, blank=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='official_reports')
    target_department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_official_reports')

    linked_citizen_report = models.ForeignKey(Report, on_delete=models.SET_NULL, null=True, blank=True, related_name='official_reports')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='ROUTINE')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='SUBMITTED')

    executive_summary = models.TextField(help_text="Brief executive overview")
    findings = models.TextField(help_text="Detailed investigation/activity findings")
    recommendations = models.TextField(blank=True, null=True, help_text="Proposed official actions or directives")
    attachment_url = models.URLField(max_length=1000, blank=True, null=True)

    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_official_reports')
    reviewer_name = models.CharField(max_length=255, blank=True, null=True)
    reviewer_feedback = models.TextField(blank=True, null=True, help_text="Official remarks, feedback, or executive directive")
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.reference_number}] {self.title} ({self.status})"


class MayorDirective(models.Model):
    """Executive directives issued by the Mayor directly to sectors / municipal departments."""
    PRIORITY_CHOICES = (
        ('ROUTINE', 'Routine Directive'),
        ('CRITICAL', 'Critical Executive Priority'),
        ('EMERGENCY', 'State of Emergency / Immediate Action'),
    )
    STATUS_CHOICES = (
        ('ISSUED', 'Issued / Active'),
        ('IN_PROGRESS', 'Department In Progress'),
        ('COMPLETED', 'Fulfilled / Completed'),
        ('CANCELLED', 'Revoked / Superseded'),
    )

    reference_number = models.CharField(max_length=60, unique=True)
    title = models.CharField(max_length=255)
    target_department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True, related_name='mayor_directives')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='CRITICAL')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='ISSUED')
    instructions = models.TextField()
    deadline = models.DateTimeField(null=True, blank=True)
    issued_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='issued_mayor_directives')
    acknowledgement_notes = models.TextField(blank=True, null=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        dept_name = self.target_department.name if self.target_department else 'ALL SECTORS'
        return f"[{self.reference_number}] To {dept_name}: {self.title}"

from django.db import models
from django.conf import settings

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('REPORT_SUBMITTED', 'Report Submitted'),
        ('REPORT_RECEIVED', 'Report Received'),
        ('REPORT_ASSIGNED', 'Report Assigned'),
        ('STATUS_CHANGED', 'Status Changed'),
        ('NEW_MESSAGE', 'New Message'),
        ('REPORT_RESOLVED', 'Report Resolved'),
        ('REPORT_REOPENED', 'Report Reopened'),
        ('ESCALATION', 'Escalation'),
        ('ANNOUNCEMENT', 'Announcement'),
        ('SLA_WARNING', 'SLA Warning'),
        ('EMERGENCY', 'Emergency Alert'),
    ]

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    body = models.TextField()
    report_id = models.IntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"{self.notification_type} -> {self.recipient}"


class DeviceToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='device_tokens')
    token = models.CharField(max_length=512, unique=True)
    platform = models.CharField(max_length=20, choices=[('android', 'Android'), ('ios', 'iOS')], default='android')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.platform}"

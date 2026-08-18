"""
Escalation Engine.
Runs as a management command (or scheduled via cron/Celery) to detect
overdue reports and escalate them according to configured rules.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from core.models import Report, Department
from core.push_service import send_push_notification
from core.notifications import Notification
from django.contrib.auth import get_user_model

User = get_user_model()

# Configurable deadlines (in hours). In production, move to DB-backed EscalationRule model.
RESPONSE_DEADLINE_HOURS = 4       # From SUBMITTED to ASSIGNED
INVESTIGATION_DEADLINE_HOURS = 24  # From ASSIGNED to IN_PROGRESS
RESOLUTION_DEADLINE_HOURS = 72     # From IN_PROGRESS to RESOLVED


class Command(BaseCommand):
    help = 'Run escalation engine for overdue reports'

    def handle(self, *args, **options):
        now = timezone.now()
        escalated = 0

        # --- Level 1: Unassigned reports past response deadline ---
        unassigned_overdue = Report.objects.filter(
            status='SUBMITTED',
            created_at__lt=now - timedelta(hours=RESPONSE_DEADLINE_HOURS)
        )
        for report in unassigned_overdue:
            self._escalate(report, 'Response deadline exceeded - report unassigned')
            escalated += 1

        # --- Level 2: Assigned but not started past investigation deadline ---
        investigation_overdue = Report.objects.filter(
            status='ASSIGNED',
            updated_at__lt=now - timedelta(hours=INVESTIGATION_DEADLINE_HOURS)
        )
        for report in investigation_overdue:
            self._escalate(report, 'Investigation deadline exceeded')
            escalated += 1

        # --- Level 3: In progress but not resolved past resolution deadline ---
        resolution_overdue = Report.objects.filter(
            status='IN_PROGRESS',
            updated_at__lt=now - timedelta(hours=RESOLUTION_DEADLINE_HOURS)
        )
        for report in resolution_overdue:
            self._escalate(report, 'Resolution deadline exceeded - critical')
            escalated += 1

        self.stdout.write(self.style.SUCCESS(f'Escalated {escalated} overdue reports.'))

    def _escalate(self, report, reason: str):
        # Bump priority if not already CRITICAL
        if report.priority != 'CRITICAL':
            report.priority = 'HIGH' if report.priority == 'MEDIUM' else 'CRITICAL'
            report.save(update_fields=['priority'])

        # Notify department managers
        if report.primary_department:
            managers = User.objects.filter(
                is_department_manager=True,
                officer_profile__department=report.primary_department
            )
            for manager in managers:
                send_push_notification(
                    manager,
                    title='Gabaasa Yeroo Dabree',
                    body=f'{report.case_number}: {reason}',
                    data={'type': 'ESCALATION', 'report_id': report.id}
                )

        # Notify city admins for CRITICAL
        if report.priority == 'CRITICAL':
            city_admins = User.objects.filter(is_city_admin=True)
            for admin in city_admins:
                send_push_notification(
                    admin,
                    title='Gabaasa Xiyyeeffannoo Guddaa Gaafatu',
                    body=f'{report.case_number}: {reason}',
                    data={'type': 'ESCALATION', 'report_id': report.id}
                )

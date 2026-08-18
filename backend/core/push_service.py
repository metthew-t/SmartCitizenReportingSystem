"""
FCM Push Notification Service.
Sends notifications via Firebase Cloud Messaging.
In production, set FIREBASE_SERVER_KEY in environment variables.
"""
import json
import urllib.request
import urllib.error
from django.conf import settings
from core.notifications import Notification, DeviceToken


FCM_URL = 'https://fcm.googleapis.com/fcm/send'


def get_fcm_key():
    return getattr(settings, 'FIREBASE_SERVER_KEY', None)


def send_push_notification(user, title: str, body: str, data: dict = None):
    """
    Creates a DB notification record and attempts to push to FCM if key is set.
    Always saves to DB so users see notifications in-app even without FCM.
    """
    # 1. Save to database always
    notif = Notification.objects.create(
        recipient=user,
        notification_type=data.get('type', 'ANNOUNCEMENT') if data else 'ANNOUNCEMENT',
        title=title,
        body=body,
        report_id=data.get('report_id') if data else None,
    )

    # 2. Try FCM push
    fcm_key = get_fcm_key()
    if not fcm_key:
        # FCM key not configured - silently skip push, notification is in DB
        return notif

    tokens = DeviceToken.objects.filter(user=user).values_list('token', flat=True)
    if not tokens:
        return notif

    payload = {
        'registration_ids': list(tokens),
        'notification': {
            'title': title,
            'body': body,
            'sound': 'default',
        },
        'data': data or {},
    }

    try:
        request = urllib.request.Request(
            FCM_URL,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Authorization': f'key={fcm_key}',
                'Content-Type': 'application/json',
            },
            method='POST'
        )
        with urllib.request.urlopen(request, timeout=5) as response:
            pass  # Log response if needed
    except Exception as e:
        # FCM failure should not break the main flow
        print(f'[FCM] Push failed for {user}: {e}')

    return notif


def notify_report_submitted(report):
    if report.citizen:
        send_push_notification(
            report.citizen,
            title='Gabaasi keessan fudhatame',
            body=f'Lakkoofsi wabii keessan: {report.case_number}',
            data={'type': 'REPORT_SUBMITTED', 'report_id': report.id}
        )


def notify_status_changed(report):
    if report.citizen:
        send_push_notification(
            report.citizen,
            title='Haala gabaasaa jijjiirame',
            body=f'Gabaasi keessan {report.case_number} amma "{report.status}" ta\'e.',
            data={'type': 'STATUS_CHANGED', 'report_id': report.id}
        )


def notify_officer_assigned(report):
    if report.assigned_officer and report.assigned_officer.user:
        send_push_notification(
            report.assigned_officer.user,
            title='Gabaasa haaraa siif ramadame',
            body=f'Lakk. {report.case_number} - {report.description[:60]}',
            data={'type': 'REPORT_ASSIGNED', 'report_id': report.id}
        )

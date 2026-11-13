"""
Robust Civic Engine for Adama Smart Citizen Reporting System
Implements international civic tech and Open311 / GovTech best practices:
1. Geofencing Enforcement (Adama Municipal Bounds)
2. SLA Calculation & Auto-Escalation Engine
3. Spatial Duplicate Detection (Haversine Formula)
4. Tamper-Proof Cryptographic Audit Trail (SHA-256 Hash Chain)
5. Multi-Channel Notification Dispatch & Audit Logger (SMS, Push, Telegram)
"""

import os
import math
import hashlib
import json
from datetime import timedelta
from django.utils import timezone
from django.conf import settings

# ── 1. Geofencing: Adama Municipal Boundary ──────────────────────────────────
# Geographic bounding envelope for Adama (Nazret) City Administration
ADAMA_LAT_MIN = 8.4500
ADAMA_LAT_MAX = 8.6300
ADAMA_LON_MIN = 39.1700
ADAMA_LON_MAX = 39.3700

def check_adama_geofence(latitude, longitude):
    """
    Validates whether the provided coordinates fall within the Adama City municipal limits.
    Returns: dict(is_inside=bool, message=str, distance_from_center_km=float)
    """
    if latitude is None or longitude is None:
        return {'is_inside': True, 'message': 'Location coordinates not provided; municipal address used.', 'distance_from_center_km': 0.0}
    
    try:
        lat = float(latitude)
        lon = float(longitude)
    except (ValueError, TypeError):
        return {'is_inside': True, 'message': 'Coordinate format invalid; bypassed.', 'distance_from_center_km': 0.0}

    # Center of Adama City hall / post office ~ 8.5400, 39.2700
    center_lat, center_lon = 8.5400, 39.2700
    d_lat = math.radians(lat - center_lat)
    d_lon = math.radians(lon - center_lon)
    a = math.sin(d_lat/2)**2 + math.cos(math.radians(center_lat)) * math.cos(math.radians(lat)) * math.sin(d_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    dist_km = round(6371 * c, 2)

    is_inside = (ADAMA_LAT_MIN <= lat <= ADAMA_LAT_MAX) and (ADAMA_LON_MIN <= lon <= ADAMA_LON_MAX)
    
    if is_inside:
        msg = f"Verified inside Adama City Administration zone (~{dist_km} km from city center)."
    else:
        msg = f"Alert: Coordinates ({lat:.4f}, {lon:.4f}) fall outside Adama municipal limits (~{dist_km} km away). Regional handover may be required."

    return {
        'is_inside': is_inside,
        'message': msg,
        'distance_from_center_km': dist_km
    }


# ── 2. SLA & Auto-Escalation Engine ──────────────────────────────────────────
# Standard government SLA turnaround expectations in hours
SLA_HOURS_MAP = {
    'CRITICAL': 12,   # Immediate public hazard (e.g., exposed live wire, major water main burst)
    'HIGH': 24,       # Road blockage, sewage overflow
    'MEDIUM': 48,     # Streetlight repair, illegal dumping
    'LOW': 72,        # Routine maintenance, graffiti
}

def compute_sla_deadline(priority, start_time=None):
    """Calculates official SLA resolution deadline timestamp based on case priority."""
    if not start_time:
        start_time = timezone.now()
    hours = SLA_HOURS_MAP.get(str(priority).upper(), 48)
    deadline = start_time + timedelta(hours=hours)
    return hours, deadline

def evaluate_report_sla(report):
    """
    Calculates real-time SLA metrics: remaining hours, breach status, and auto-escalation trigger.
    Updates the report escalation level if overdue.
    """
    now = timezone.now()
    if not report.sla_deadline:
        hours, deadline = compute_sla_deadline(report.priority, report.created_at)
        report.sla_hours = hours
        report.sla_deadline = deadline
        report.save(update_fields=['sla_hours', 'sla_deadline'])
    else:
        deadline = report.sla_deadline

    # If already resolved or closed, SLA is frozen
    if report.status in ['RESOLVED', 'CLOSED', 'REJECTED']:
        return {
            'sla_hours': report.sla_hours,
            'sla_deadline': deadline,
            'is_breached': False,
            'remaining_seconds': 0,
            'remaining_hours': 0,
            'status_label': 'COMPLETED',
            'escalation_level': report.escalation_level
        }

    remaining_delta = deadline - now
    remaining_seconds = int(remaining_delta.total_seconds())
    remaining_hours = round(remaining_seconds / 3600.0, 1)
    is_breached = remaining_seconds < 0

    # Auto-escalation evaluation
    updated_fields = []
    if is_breached:
        overdue_hours = abs(remaining_hours)
        if overdue_hours >= 24 and report.escalation_level != 'MAYOR':
            report.is_escalated = True
            report.escalation_level = 'MAYOR'
            report.escalation_reason = f"CRITICAL BREACH: Overdue by {overdue_hours:.1f} hours without resolution. Automatically escalated to Mayor Command Center."
            updated_fields.extend(['is_escalated', 'escalation_level', 'escalation_reason'])
        elif report.escalation_level == 'NONE':
            report.is_escalated = True
            report.escalation_level = 'MANAGER'
            report.escalation_reason = f"SLA BREACH: Overdue by {overdue_hours:.1f} hours. Escalated to Department Manager for prompt intervention."
            updated_fields.extend(['is_escalated', 'escalation_level', 'escalation_reason'])
        
        if updated_fields:
            report.save(update_fields=updated_fields)

    return {
        'sla_hours': report.sla_hours,
        'sla_deadline': deadline,
        'is_breached': is_breached,
        'remaining_seconds': remaining_seconds,
        'remaining_hours': remaining_hours,
        'status_label': 'BREACHED' if is_breached else ('NEARING_BREACH' if remaining_hours <= 4 else 'ON_TRACK'),
        'escalation_level': report.escalation_level
    }


# ── 3. Spatial Duplicate Detection ───────────────────────────────────────────
def find_potential_duplicates(latitude, longitude, department_id=None, department_name=None, category_id=None, title=None, description=None, threshold_meters=100):
    """
    Searches for open or ongoing reports near candidate coordinates (<= 100m).
    Enforces exact issue matching:
    - Distance MUST be within threshold (100m).
    - Report issue MUST match (category, department, or high semantic keywords).
    - If distance is farther than 100m OR report is a different issue, it is NOT considered a duplicate.
    """
    from core.models import Report
    import re

    if latitude is None or longitude is None:
        return []

    try:
        lat1 = float(latitude)
        lon1 = float(longitude)
    except (ValueError, TypeError):
        return []

    # Filter to active reports with valid coordinates
    active_statuses = ['SUBMITTED', 'RECEIVED', 'ASSIGNED', 'UNDER_INVESTIGATION', 'IN_PROGRESS']
    qs = Report.objects.filter(status__in=active_statuses, latitude__isnull=False, longitude__isnull=False)

    duplicates = []
    # Earth radius in meters
    R = 6371000

    for rep in qs.order_by('-created_at')[:80]:
        try:
            lat2 = float(rep.latitude)
            lon2 = float(rep.longitude)
        except (ValueError, TypeError):
            continue

        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance_meters = round(R * c, 1)

        # 1. Enforce strict 100m boundary: reports farther than 100m are never duplicates
        if distance_meters > threshold_meters:
            continue

        # 2. Check issue similarity: only flag duplicate if the reported issue matches
        is_same_issue = False

        # Department match
        if department_id and rep.primary_department_id:
            if str(rep.primary_department_id) == str(department_id):
                is_same_issue = True
        elif department_name and rep.primary_department:
            clean_dname = department_name.strip().lower()
            rep_dname = rep.primary_department.name.lower()
            if clean_dname in rep_dname or rep_dname in clean_dname:
                is_same_issue = True

        # Category match
        if not is_same_issue and category_id and rep.category_id:
            if str(rep.category_id) == str(category_id):
                is_same_issue = True

        # Text keyword match
        candidate_text = f"{title or ''} {description or ''}".lower()
        rep_text = f"{getattr(rep, 'title', '') or ''} {rep.description or ''}".lower()

        stop_words = {'this', 'that', 'with', 'from', 'have', 'there', 'please', 'help', 'adama', 'city', 'waajjira', 'akka', 'near', 'around', 'area'}
        candidate_words = {w for w in re.findall(r'[a-zA-Z]{4,}', candidate_text) if w not in stop_words}
        rep_words = {w for w in re.findall(r'[a-zA-Z]{4,}', rep_text) if w not in stop_words}

        if candidate_words and rep_words:
            shared = candidate_words.intersection(rep_words)
            if len(shared) >= 1:
                is_same_issue = True

        # If neither department, category, nor keywords match, it's a DIFFERENT issue even if close
        if not is_same_issue and (department_id or department_name or candidate_words):
            continue

        duplicates.append({
            'id': rep.id,
            'case_number': rep.case_number,
            'title': getattr(rep, 'title', '') or rep.description[:60],
            'description': rep.description[:140],
            'status': rep.status,
            'department_name': rep.primary_department.name if rep.primary_department else 'General',
            'distance_meters': distance_meters,
            'created_at': rep.created_at.isoformat(),
            'affected_count': getattr(rep, 'affected_count', 1),
            'is_exact_match': is_same_issue,
        })

    return sorted(duplicates, key=lambda x: x['distance_meters'])


# ── 4. Tamper-Proof Cryptographic Audit Trail (SHA-256 Chaining) ──────────────
def record_tamper_proof_audit(user, action, entity_type, entity_id, changes=None, request=None):
    """
    Records an append-only, cryptographically hashed audit entry.
    Each entry's hash is computed from its predecessor's hash, forming an immutable hash chain.
    """
    from core.models import AuditLog

    now = timezone.now()
    last_log = AuditLog.objects.order_by('-id').first()
    prev_hash = last_log.tamper_hash if last_log and last_log.tamper_hash else 'GENESIS_ADAMA_CIVIC_AUDIT_00000000'

    actor_name = 'System Process'
    actor_role = 'SYSTEM'
    ip_address = '127.0.0.1'

    if user and user.is_authenticated:
        actor_name = user.full_name or user.email or user.phone_number
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_super_admin', False):
            actor_role = 'SUPER_ADMIN'
        elif getattr(user, 'is_city_admin', False):
            actor_role = 'CITY_ADMIN'
        elif getattr(user, 'is_department_manager', False):
            actor_role = 'DEPARTMENT_MANAGER'
        elif getattr(user, 'is_officer', False):
            actor_role = 'OFFICER'
        elif getattr(user, 'is_citizen', False):
            actor_role = 'CITIZEN'

    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR', ip_address)

    # Compute SHA-256 block hash
    hash_payload = f"{prev_hash}|{actor_name}|{actor_role}|{action}|{entity_type}|{entity_id}|{now.isoformat()}|{json.dumps(changes or {}, sort_keys=True)}"
    tamper_hash = hashlib.sha256(hash_payload.encode('utf-8')).hexdigest()

    log_entry = AuditLog.objects.create(
        user=user if user and user.is_authenticated else None,
        actor_name=actor_name,
        actor_role=actor_role,
        ip_address=ip_address,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        changes=changes,
        prev_hash=prev_hash,
        tamper_hash=tamper_hash,
    )
    return log_entry


# ── 5. Multi-Channel Notification Dispatch & Audit Logger ────────────────────
def dispatch_civic_notification(report, event_type, recipient_user=None, custom_msg=None):
    """
    Dispatches alerts across SMS, Push Notification, and records into NotificationLog table.
    Ensures end-to-end multi-channel compliance.
    """
    from core.models import NotificationLog
    from core.sms_service import send_sms
    from core.push_service import send_push_notification

    target_user = recipient_user or report.citizen
    phone = target_user.phone_number if target_user and hasattr(target_user, 'phone_number') else ''
    recipient_name = target_user.full_name if target_user else 'Citizen'

    tracking_url = f"https://adama.gov.et/track/{report.case_number}"
    dept_name = report.primary_department.name if report.primary_department else 'Adama Municipality'

    if custom_msg:
        msg_body = custom_msg
    elif event_type == 'SUBMITTED':
        msg_body = f"Adama Gov: Report #{report.case_number} registered successfully with {dept_name}. Track status: {tracking_url}"
    elif event_type == 'ASSIGNED':
        officer_name = report.assigned_officer.full_name if report.assigned_officer else 'Designated Officer'
        msg_body = f"Adama Gov: Report #{report.case_number} has been officially assigned to Officer {officer_name}."
    elif event_type == 'RESOLVED':
        msg_body = f"Adama Gov: Case #{report.case_number} has been marked RESOLVED by {dept_name}. Please inspect and confirm completion: {tracking_url}"
    elif event_type == 'ESCALATED':
        msg_body = f"Adama Gov ALERT: Case #{report.case_number} has been ESCALATED to {report.escalation_level} due to SLA threshold breach."
    else:
        msg_body = f"Adama Gov: Status update on Case #{report.case_number}: {report.status}."

    # 1. Dispatch SMS
    sms_status = 'SIMULATED'
    if phone:
        try:
            sms_res = send_sms(phone, msg_body)
            sms_status = 'SENT' if sms_res.get('success') else 'FAILED'
        except Exception as e:
            sms_status = f'ERR: {str(e)[:15]}'

    # Log SMS
    NotificationLog.objects.create(
        recipient_phone=phone or 'N/A',
        recipient_name=recipient_name,
        channel='SMS',
        event_type=event_type,
        report=report,
        message_body=msg_body,
        status=sms_status
    )

    # 2. Dispatch FCM Push Notification if target user exists
    if target_user:
        try:
            send_push_notification(
                target_user,
                title=f"Adama Civic: {event_type.replace('_', ' ').title()}",
                body=msg_body,
                data={'case_number': report.case_number, 'report_id': report.id, 'event_type': event_type}
            )
            NotificationLog.objects.create(
                recipient_phone=phone or 'N/A',
                recipient_name=recipient_name,
                channel='PUSH',
                event_type=event_type,
                report=report,
                message_body=msg_body,
                status='SENT'
            )
        except Exception:
            pass

        # 3. Multi-Channel Social Media Notification Dispatch (Telegram & WhatsApp)
        if getattr(target_user, 'notify_via_telegram', False) and (getattr(target_user, 'telegram_chat_id', None) or getattr(target_user, 'telegram_username', None)):
            try:
                dispatch_social_notification(target_user, msg_body, channel='TELEGRAM', report=report, event_type=event_type)
            except Exception:
                pass

        if getattr(target_user, 'notify_via_whatsapp', False) and (getattr(target_user, 'whatsapp_phone_number', None) or phone):
            try:
                dispatch_social_notification(target_user, msg_body, channel='WHATSAPP', report=report, event_type=event_type)
            except Exception:
                pass

    return True


# ── 6. Social Media Notification Dispatcher (Telegram & WhatsApp) ─────────────
def dispatch_social_notification(user, message_body, channel='TELEGRAM', report=None, event_type='ALERT'):
    """
    Delivers direct social media notifications to the citizen or official's connected Telegram / WhatsApp account.
    Records delivery telemetry in the NotificationLog table.
    """
    from core.models import NotificationLog
    import urllib.request
    import urllib.parse

    status = 'SIMULATED'
    target_id = 'N/A'
    error_detail = None

    if channel == 'TELEGRAM':
        # Prefer numeric chat_id; also accept @username but warn
        chat_id = getattr(user, 'telegram_chat_id', None) or getattr(user, 'telegram_username', None)
        if chat_id:
            chat_id = str(chat_id).strip()
        target_id = chat_id if chat_id else 'NOT_CONNECTED'

        if not chat_id:
            status = 'NO_CHAT_ID'
            error_detail = 'No Telegram Chat ID configured. Message @userinfobot on Telegram to get your numeric ID.'
        else:
            bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', os.environ.get('TELEGRAM_BOT_TOKEN', ''))
            if not bot_token:
                status = 'NO_BOT_TOKEN'
                error_detail = 'TELEGRAM_BOT_TOKEN is not configured on the server.'
            else:
                try:
                    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                    payload = json.dumps({
                        'chat_id': chat_id,
                        'text': message_body,
                        'parse_mode': 'Markdown'
                    }).encode('utf-8')
                    req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
                    with urllib.request.urlopen(req, timeout=10) as response:
                        resp_data = json.loads(response.read().decode('utf-8'))
                        status = 'SENT' if resp_data.get('ok') else 'FAILED'
                        if not resp_data.get('ok'):
                            error_detail = resp_data.get('description', 'Unknown Telegram error')
                except urllib.error.HTTPError as e:
                    try:
                        err_body = json.loads(e.read().decode('utf-8'))
                        error_detail = err_body.get('description', str(e))
                    except Exception:
                        error_detail = str(e)
                    status = f'ERR:{e.code}'
                except Exception as e:
                    status = f'ERR: {str(e)[:30]}'
                    error_detail = str(e)

    elif channel == 'WHATSAPP':
        # CallMeBot WhatsApp API – free, no Meta/Business account needed.
        # User must activate once: send WhatsApp to +34 644 59 76 56 with text
        # "I allow callmebot to send me messages" and get their apikey reply.
        phone = getattr(user, 'whatsapp_phone_number', None) or getattr(user, 'phone_number', None)
        api_key = getattr(user, 'whatsapp_callmebot_apikey', None)
        target_id = str(phone) if phone else 'NOT_CONNECTED'

        if not phone:
            status = 'NO_PHONE'
            error_detail = 'No WhatsApp phone number configured.'
        elif not api_key:
            status = 'NO_APIKEY'
            error_detail = (
                'CallMeBot API key not set. Send a WhatsApp message to +34 644 59 76 56 '
                'with text "I allow callmebot to send me messages" to get your key, '
                'then enter it in Settings.'
            )
        else:
            try:
                encoded_msg = urllib.parse.quote(message_body)
                encoded_phone = urllib.parse.quote(str(phone).strip())
                url = (
                    f"https://api.callmebot.com/whatsapp.php"
                    f"?phone={encoded_phone}&text={encoded_msg}&apikey={api_key}"
                )
                req = urllib.request.Request(url, headers={'User-Agent': 'AdamaGovBot/1.0'})
                with urllib.request.urlopen(req, timeout=12) as response:
                    body = response.read().decode('utf-8', errors='ignore')
                    # CallMeBot returns "Message queued" or similar on success
                    if response.status == 200 and ('queued' in body.lower() or 'message' in body.lower() or 'sent' in body.lower()):
                        status = 'SENT'
                    else:
                        status = 'FAILED'
                        error_detail = body[:100]
            except urllib.error.HTTPError as e:
                status = f'ERR:{e.code}'
                error_detail = str(e)
            except Exception as e:
                status = f'ERR: {str(e)[:30]}'
                error_detail = str(e)

    try:
        NotificationLog.objects.create(
            recipient_phone=target_id,
            recipient_name=getattr(user, 'full_name', '') or getattr(user, 'email', '') or getattr(user, 'phone_number', '') or 'Citizen',
            channel=channel,
            event_type=event_type,
            report=report,
            message_body=message_body,
            status=status
        )
    except Exception:
        pass

    return {'channel': channel, 'target': target_id, 'status': status, 'error': error_detail}


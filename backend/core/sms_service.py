"""
TextBee SMS Gateway Service
https://textbee.dev

Handles:
  - Sending SMS via TextBee REST API
  - OTP generation, storage (Django cache), and verification
  - Notification SMS for report events

TextBee API base: https://api.textbee.dev/api/v1
Auth header: x-api-key: <TEXTBEE_API_KEY>
Send endpoint: POST /gateway/send-sms
"""

import json
import random
import string
import urllib.request
import urllib.error
from django.conf import settings
from django.core.cache import cache

TEXTBEE_BASE = 'https://api.textbee.dev/api/v1'
OTP_CACHE_PREFIX = 'otp_'
OTP_VERIFIED_PREFIX = 'otp_verified_'


# ── Low-level sender ──────────────────────────────────────────────────────────

def send_sms(phone_number: str, message: str) -> dict:
    """
    Send an SMS via TextBee to a single recipient.

    phone_number must be in E.164 format (+251xxxxxxxxx).
    Returns a dict with keys: success (bool), message (str), error (str|None).
    """
    api_key = getattr(settings, 'TEXTBEE_API_KEY', '')
    device_id = getattr(settings, 'TEXTBEE_DEVICE_ID', '')

    if not api_key:
        print('[TextBee] TEXTBEE_API_KEY not configured — SMS skipped.')
        return {'success': False, 'error': 'TEXTBEE_API_KEY not set', 'message': ''}

    # Normalise phone number to E.164
    phone_number = _normalise_e164(phone_number)

    payload = {
        'recipients': [phone_number],
        'message': message,
    }
    # Include deviceId only when explicitly set; otherwise TextBee uses the default device
    if device_id:
        payload['deviceId'] = device_id

    try:
        req = urllib.request.Request(
            f'{TEXTBEE_BASE}/gateway/send-sms',
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'x-api-key': api_key,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read().decode('utf-8'))
            # TextBee wraps response in a "data" key
            data = body.get('data', body)
            return {
                'success': bool(data.get('success', True)),
                'message': data.get('message', 'SMS queued'),
                'batch_id': data.get('smsBatchId', ''),
                'error': None,
            }
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        print(f'[TextBee] HTTP {e.code} sending to {phone_number}: {body}')
        return {'success': False, 'error': f'HTTP {e.code}: {body}', 'message': ''}
    except Exception as e:
        print(f'[TextBee] Error sending to {phone_number}: {e}')
        return {'success': False, 'error': str(e), 'message': ''}


def _normalise_e164(phone: str) -> str:
    """
    Convert common Ethiopian formats to E.164.
      09xxxxxxxx  → +251 9xxxxxxxx
      2519xxxxxxx → +2519xxxxxxx
      +251...     → unchanged
    """
    phone = phone.strip().replace(' ', '').replace('-', '')
    if phone.startswith('+'):
        return phone
    if phone.startswith('00'):
        return '+' + phone[2:]
    if phone.startswith('0'):
        return '+251' + phone[1:]
    if phone.startswith('251'):
        return '+' + phone
    return phone


# ── OTP helpers ───────────────────────────────────────────────────────────────

def generate_otp(length: int = 6) -> str:
    """Return a numeric OTP of the given length."""
    return ''.join(random.choices(string.digits, k=length))


def store_otp(phone_number: str, otp: str) -> None:
    """
    Store the OTP in Django's cache.
    TTL = OTP_EXPIRY_MINUTES * 60 (default 10 minutes).
    Key is prefixed so it never clashes with other cache entries.
    """
    expiry_seconds = getattr(settings, 'OTP_EXPIRY_MINUTES', 10) * 60
    cache.set(f'{OTP_CACHE_PREFIX}{phone_number}', otp, timeout=expiry_seconds)
    # Clear any previous verified flag for this number
    cache.delete(f'{OTP_VERIFIED_PREFIX}{phone_number}')


def verify_otp(phone_number: str, otp: str) -> bool:
    """
    Check the supplied OTP against the stored one.
    On success, deletes the OTP and writes a short-lived verified flag
    so the registration endpoint can confirm verification happened.
    Returns True if correct, False otherwise.
    """
    stored = cache.get(f'{OTP_CACHE_PREFIX}{phone_number}')
    if stored is None:
        return False  # Expired or never sent
    if stored != otp.strip():
        return False
    # Correct — consume the OTP and mark phone as verified for 15 minutes
    cache.delete(f'{OTP_CACHE_PREFIX}{phone_number}')
    cache.set(f'{OTP_VERIFIED_PREFIX}{phone_number}', True, timeout=15 * 60)
    return True


def is_phone_verified(phone_number: str) -> bool:
    """Return True if this phone passed OTP verification recently."""
    return bool(cache.get(f'{OTP_VERIFIED_PREFIX}{phone_number}'))


def consume_phone_verified(phone_number: str) -> None:
    """Remove the verified flag after successful registration."""
    cache.delete(f'{OTP_VERIFIED_PREFIX}{phone_number}')


# ── OTP send helper ───────────────────────────────────────────────────────────

def send_otp_sms(phone_number: str) -> dict:
    """
    Generate a fresh OTP, store it, and send it via TextBee.
    Returns {'success': bool, 'error': str|None}.
    """
    otp = generate_otp(6)
    store_otp(phone_number, otp)

    message = (
        f'[Adama Smart Citizen] Your verification code is: {otp}\n'
        f'Valid for {getattr(settings, "OTP_EXPIRY_MINUTES", 10)} minutes. '
        f'Do not share this code with anyone.'
    )
    result = send_sms(phone_number, message)
    if not result['success']:
        # Remove stored OTP so the user can retry
        cache.delete(f'{OTP_CACHE_PREFIX}{phone_number}')
    return result


# ── Notification SMS helpers ──────────────────────────────────────────────────

def sms_report_submitted(report) -> None:
    """SMS confirmation to citizen when a report is submitted."""
    if not report.citizen:
        return
    phone = report.citizen.phone_number
    send_sms(phone, (
        f'[Adama Smart Citizen] Gabaasi keessan fudhatame.\n'
        f'Case number: {report.case_number}\n'
        f'Haalli gabaasaa keessan hordofuuf app-icha fayyadamaa.'
    ))


def sms_status_changed(report) -> None:
    """SMS to citizen whenever their report status changes."""
    if not report.citizen:
        return
    phone = report.citizen.phone_number
    status_display = report.status.replace('_', ' ').title()
    send_sms(phone, (
        f'[Adama Smart Citizen] Haalli gabaasaa keessan jijjiirame.\n'
        f'Case: {report.case_number}\n'
        f'Haala haaraa: {status_display}\n'
        f'Bal\'inaan app-icha ilaali.'
    ))


def sms_report_assigned(report) -> None:
    """SMS to officer when a report is assigned to them."""
    if not report.assigned_officer or not report.assigned_officer.user:
        return
    phone = report.assigned_officer.user.phone_number
    send_sms(phone, (
        f'[Adama Smart Citizen] Gabaasi haaraan si mudate.\n'
        f'Case: {report.case_number}\n'
        f'Ibsa: {report.description[:80]}'
    ))

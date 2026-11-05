import re
from django.core.exceptions import ValidationError

def validate_strong_password(password: str) -> str:
    """
    Standard Government & NIST SP 800-63B Strong Password Validator:
    - Minimum length: 12 characters
    - Must contain at least one uppercase letter (A-Z)
    - Must contain at least one lowercase letter (a-z)
    - Must contain at least one numeric digit (0-9)
    - Must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>? etc.)
    """
    if not password or len(password) < 12:
        raise ValidationError('Password must be at least 12 characters long according to government security standards.')
    
    if not re.search(r'[A-Z]', password):
        raise ValidationError('Password must include at least one uppercase letter (A-Z).')

    if not re.search(r'[a-z]', password):
        raise ValidationError('Password must include at least one lowercase letter (a-z).')

    if not re.search(r'[0-9]', password):
        raise ValidationError('Password must include at least one numeric digit (0-9).')

    if not re.search(r'[^A-Za-z0-9]', password):
        raise ValidationError('Password must include at least one special character (e.g. !@#$%^&*).')

    return password


from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class EmailOrPhoneModelBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        # 'username' parameter might be an email or a phone number
        identifier = kwargs.get(User.USERNAME_FIELD) or username
        if not identifier:
            return None

        try:
            clean_id = identifier.strip()
            user = User.objects.filter(Q(phone_number__iexact=clean_id) | Q(email__iexact=clean_id)).first()
            if not user:
                return None
        except Exception:
            try:
                user = User.objects.filter(phone_number__iexact=clean_id).first()
                if not user:
                    return None
            except Exception:
                return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

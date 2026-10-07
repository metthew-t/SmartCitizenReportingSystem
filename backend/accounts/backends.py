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
            user = User.objects.get(Q(phone_number=identifier) | Q(email=identifier))
        except User.DoesNotExist:
            return None
        except User.MultipleObjectsReturned:
            return User.objects.filter(Q(phone_number=identifier) | Q(email=identifier)).order_by('id').first()
        except Exception:
            # email column might not exist yet
            try:
                user = User.objects.get(phone_number=identifier)
            except User.DoesNotExist:
                return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

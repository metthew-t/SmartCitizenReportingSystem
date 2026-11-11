from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

class UserManager(BaseUserManager):
    def create_user(self, phone_number=None, email=None, password=None, **extra_fields):
        if not phone_number and not email:
            raise ValueError('Either Phone Number or Email must be set')
        user = self.model(phone_number=phone_number, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number=None, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_super_admin', True)
        extra_fields.setdefault('is_city_admin', True)
        return self.create_user(phone_number=phone_number, email=email, password=password, **extra_fields)

class User(AbstractUser):
    username = None
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    full_name = models.CharField(max_length=255, blank=True, default='')
    is_citizen = models.BooleanField(default=False)
    is_officer = models.BooleanField(default=False)
    is_department_manager = models.BooleanField(default=False)
    is_city_admin = models.BooleanField(default=False)
    is_super_admin = models.BooleanField(default=False)
    is_mayor = models.BooleanField(default=False)
    profile_photo = models.ImageField(upload_to='profiles/', null=True, blank=True)
    must_change_password = models.BooleanField(default=False)

    # Social Media & Multi-Channel Notification Integration
    telegram_chat_id = models.CharField(max_length=100, null=True, blank=True)
    telegram_username = models.CharField(max_length=100, null=True, blank=True)
    whatsapp_phone_number = models.CharField(max_length=30, null=True, blank=True)
    notify_via_telegram = models.BooleanField(default=False)
    notify_via_whatsapp = models.BooleanField(default=False)
    notify_via_in_app = models.BooleanField(default=True)
    notify_via_sms = models.BooleanField(default=True)

    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.phone_number

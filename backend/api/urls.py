from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import (
    CustomTokenObtainPairView, RegisterView, OfficerRegisterView,
    CurrentUserView, UserListView, StatsView, ChangePasswordView, DeleteAccountView,
    SendOTPView, VerifyOTPView, ResetPasswordView,
    ProfilePhotoUploadView, AdminResetPasswordView,
)
from api.analytics_views import (
    AnalyticsSummaryView, AnalyticsByDepartmentView, AnalyticsByStatusView, ReportGeoJSONView,
    SLAOverviewView, DepartmentPerformanceView, AuditLogView
)
from rest_framework.routers import DefaultRouter
from api.views import ReportViewSet, DepartmentViewSet, ReportCategoryViewSet, MessageViewSet, DepartmentMessageViewSet
from api.notification_views import NotificationViewSet, DeviceTokenViewSet

router = DefaultRouter()
router.register(r'reports', ReportViewSet, basename='report')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'categories', ReportCategoryViewSet, basename='category')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'device-tokens', DeviceTokenViewSet, basename='device-token')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'dept-messages', DepartmentMessageViewSet, basename='dept-message')

urlpatterns = [
    # Auth Endpoints
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/send-otp/', SendOTPView.as_view(), name='send_otp'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('auth/officer-register/', OfficerRegisterView.as_view(), name='officer_register'),
    path('auth/me/', CurrentUserView.as_view(), name='current_user'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('auth/delete-account/', DeleteAccountView.as_view(), name='delete_account'),
    path('auth/upload-photo/', ProfilePhotoUploadView.as_view(), name='upload_photo'),
    path('auth/admin-reset-password/', AdminResetPasswordView.as_view(), name='admin_reset_password'),
    # Admin
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/<int:pk>/', UserListView.as_view(), name='user_detail'),
    path('stats/', StatsView.as_view(), name='stats'),
    # Analytics
    path('analytics/summary/', AnalyticsSummaryView.as_view(), name='analytics_summary'),
    path('analytics/by-department/', AnalyticsByDepartmentView.as_view(), name='analytics_by_dept'),
    path('analytics/by-status/', AnalyticsByStatusView.as_view(), name='analytics_by_status'),
    path('analytics/geojson/', ReportGeoJSONView.as_view(), name='analytics_geojson'),
    path('analytics/sla-overview/', SLAOverviewView.as_view(), name='analytics_sla'),
    path('analytics/performance/', DepartmentPerformanceView.as_view(), name='analytics_performance'),
    path('analytics/audit-logs/', AuditLogView.as_view(), name='analytics_audit_logs'),
] + router.urls

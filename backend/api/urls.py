from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import CustomTokenObtainPairView, RegisterView, CurrentUserView, MockOTPRequestView, MockOTPVerifyView
from api.analytics_views import AnalyticsSummaryView, AnalyticsByDepartmentView, AnalyticsByStatusView, ReportGeoJSONView
from rest_framework.routers import DefaultRouter
from api.views import ReportViewSet, DepartmentViewSet, ReportCategoryViewSet, MessageViewSet
from api.notification_views import NotificationViewSet, DeviceTokenViewSet

router = DefaultRouter()
router.register(r'reports', ReportViewSet, basename='report')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'categories', ReportCategoryViewSet, basename='category')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'device-tokens', DeviceTokenViewSet, basename='device-token')
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    # Auth Endpoints
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/me/', CurrentUserView.as_view(), name='current_user'),
    path('auth/otp/request/', MockOTPRequestView.as_view(), name='otp_request'),
    path('auth/otp/verify/', MockOTPVerifyView.as_view(), name='otp_verify'),
    # Analytics
    path('analytics/summary/', AnalyticsSummaryView.as_view(), name='analytics_summary'),
    path('analytics/by-department/', AnalyticsByDepartmentView.as_view(), name='analytics_by_dept'),
    path('analytics/by-status/', AnalyticsByStatusView.as_view(), name='analytics_by_status'),
    path('analytics/geojson/', ReportGeoJSONView.as_view(), name='analytics_geojson'),
] + router.urls

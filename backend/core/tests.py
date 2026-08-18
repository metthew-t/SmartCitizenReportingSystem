"""
Phase 11: Backend Tests
Tests: Auth, RBAC, Report workflow, Routing engine, Escalation
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(phone_number='+251911000001', password='testpass123', is_citizen=True)

    def test_login_success(self):
        resp = self.client.post('/api/v1/auth/login/', {'phone_number': '+251911000001', 'password': 'testpass123'})
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)

    def test_login_wrong_password(self):
        resp = self.client.post('/api/v1/auth/login/', {'phone_number': '+251911000001', 'password': 'wrong'})
        self.assertEqual(resp.status_code, 401)

    def test_register(self):
        resp = self.client.post('/api/v1/auth/register/', {'phone_number': '+251911000002', 'password': 'newpass123'})
        self.assertEqual(resp.status_code, 201)

    def test_protected_route_requires_auth(self):
        resp = self.client.get('/api/v1/reports/')
        self.assertEqual(resp.status_code, 401)

    def test_mock_otp_flow(self):
        resp = self.client.post('/api/v1/auth/otp/request/', {'phone_number': '+251911000003'})
        self.assertEqual(resp.status_code, 200)
        resp2 = self.client.post('/api/v1/auth/otp/verify/', {'phone_number': '+251911000003', 'otp': '123456'})
        self.assertEqual(resp2.status_code, 200)
        self.assertIn('access', resp2.data)


class RBACTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.citizen = User.objects.create_user(phone_number='+251911000010', password='pass', is_citizen=True)
        self.officer = User.objects.create_user(phone_number='+251911000011', password='pass', is_officer=True)

    def _login(self, user):
        resp = self.client.post('/api/v1/auth/login/', {'phone_number': user.phone_number, 'password': 'pass'})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")

    def test_citizen_can_access_reports(self):
        self._login(self.citizen)
        resp = self.client.get('/api/v1/reports/')
        self.assertEqual(resp.status_code, 200)


class RoutingTests(TestCase):
    def setUp(self):
        from core.models import Department, RoutingRule, RoutingKeyword
        self.dept = Department.objects.create(name="Waajjira Bishaan Dhugaatii fi Dhangala'aa", is_active=True)
        rule = RoutingRule.objects.create(department=self.dept, priority=1, is_active=True)
        RoutingKeyword.objects.create(rule=rule, keyword='bishaan', language='om')
        RoutingKeyword.objects.create(rule=rule, keyword='water', language='en')

    def test_oromo_keyword_routes_correctly(self):
        from core.services import route_report
        result = route_report("Bishaan dhangala'aa jira", is_emergency=False)
        self.assertIsNotNone(result['primary'])
        self.assertEqual(result['primary'].id, self.dept.id)

    def test_english_keyword_routes_correctly(self):
        from core.services import route_report
        result = route_report("There is a water leak on my street", is_emergency=False)
        self.assertIsNotNone(result['primary'])
        self.assertEqual(result['primary'].id, self.dept.id)

    def test_emergency_routing(self):
        from core.models import Department
        from core.services import route_report
        Department.objects.create(name='Qajeelcha Poolisii', is_active=True)
        result = route_report("emergency", is_emergency=True)
        self.assertIsNotNone(result['primary'])


class ReportWorkflowTests(TestCase):
    def setUp(self):
        from core.models import Department
        self.client = APIClient()
        self.citizen = User.objects.create_user(phone_number='+251911000020', password='pass', is_citizen=True)
        self.dept = Department.objects.create(name='Test Dept', is_active=True)

    def _login(self):
        resp = self.client.post('/api/v1/auth/login/', {'phone_number': '+251911000020', 'password': 'pass'})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")

    def test_create_report_without_location_fails(self):
        self._login()
        resp = self.client.post('/api/v1/reports/', {
            'description': 'Test report',
        })
        self.assertEqual(resp.status_code, 400)

    def test_create_report_with_location_succeeds(self):
        self._login()
        resp = self.client.post('/api/v1/reports/', {
            'description': 'Bishaan dhangala\'aa jira',
            'latitude': 8.54,
            'longitude': 39.27,
        })
        self.assertEqual(resp.status_code, 201)
        self.assertIn('case_number', resp.data)

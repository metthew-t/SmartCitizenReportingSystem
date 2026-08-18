"""
Seed demo data for testing all 33 department dashboards.
Creates: demo users, categories, 100+ reports with varied statuses/priorities.
Safe to re-run (uses get_or_create).

Usage:
    python manage.py seed_demo_data
"""
import random
import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.utils import timezone
from django.contrib.auth import get_user_model

from core.models import (
    Department, Report, ReportCategory, CitizenProfile,
    OfficerProfile,
)

User = get_user_model()

# Adama city center: 8.54°N, 39.27°E — reports scattered within ~3 km radius
ADAMA_LAT = 8.54
ADAMA_LNG = 39.27
SCATTER = 0.025  # ~2.5 km

STATUSES = [
    'SUBMITTED', 'RECEIVED', 'ASSIGNED', 'UNDER_INVESTIGATION',
    'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'REJECTED',
]
STATUS_WEIGHTS = [15, 10, 12, 8, 18, 20, 10, 4, 3]  # weighted distribution

PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
PRIORITY_WEIGHTS = [20, 45, 25, 10]

CATEGORIES_DATA = [
    ('Rakkoo Bu\'uuraa', 'የመሠረት ልማት ችግር', 'Infrastructure Issue'),
    ('Bishaan fi Dhangala\'aa', 'ውሃ እና ፍሳሽ', 'Water & Sanitation'),
    ('Nageenya Hawaasaa', 'የሕዝብ ደህንነት', 'Public Safety'),
    ('Naannoo fi Qulqullinaa', 'አካባቢ እና ንጽህና', 'Environment & Cleanliness'),
    ('Geejjibaa fi Tiraafikaa', 'ትራንስፖርት እና ትራፊክ', 'Transport & Traffic'),
    ('Tajaajila Hawaasummaa', 'ማህበራዊ አገልግሎት', 'Social Services'),
]

# Sample report descriptions in English for demo
SAMPLE_DESCRIPTIONS = [
    "Broken water pipe flooding the street near the main market area.",
    "Large pothole on the road causing traffic accidents. Multiple vehicles damaged.",
    "Illegal waste dumping behind residential buildings. Health hazard for residents.",
    "Street light not working for over a week. Area is very dark and unsafe at night.",
    "Sewage overflow near the school. Children at risk of waterborne diseases.",
    "Damaged road sign at the intersection. Causing confusion for drivers.",
    "Noise pollution from construction site during late hours. Disturbing residents.",
    "Stray animals blocking the main road. Traffic disruption daily.",
    "Broken sidewalk tiles creating tripping hazard for pedestrians.",
    "Water supply cut off for three days in our neighborhood. Urgent attention needed.",
    "Traffic signal malfunction at the busy junction. No traffic control.",
    "Garbage not collected for two weeks. Overflowing bins attracting pests.",
    "Building under construction without proper safety barriers.",
    "Flooding on the main road after rain. No drainage system working.",
    "Public toilet facility in very poor condition. Needs maintenance.",
    "Tree branches falling on power lines. Risk of electrical fire.",
    "Unauthorized parking blocking emergency vehicle access.",
    "Road marking faded and invisible. Accidents increasing.",
    "Public park benches vandalized. Community space unusable.",
    "Bus stop shelter damaged by storm. Passengers exposed to weather.",
    "Open manhole cover on pedestrian walkway. Very dangerous.",
    "Cracked wall on government building. Structural safety concern.",
    "Dusty unpaved road causing respiratory issues for residents.",
    "Broken playground equipment in children's park. Safety hazard.",
    "Market area fire hydrant not functioning. Major safety risk.",
]


class Command(BaseCommand):
    help = 'Seed demo data: users, categories, and 100+ reports across all 33 departments'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=120,
            help='Number of demo reports to create (default: 120)',
        )

    def handle(self, *args, **options):
        report_count = options['count']
        now = timezone.now()

        # --- 1. Create demo users ---
        self.stdout.write('Creating demo users...')

        citizen_user, _ = User.objects.get_or_create(
            phone_number='0911000001',
            defaults={'is_citizen': True}
        )
        if not citizen_user.has_usable_password():
            citizen_user.set_password('demo1234')
            citizen_user.save()

        CitizenProfile.objects.get_or_create(
            user=citizen_user,
            defaults={
                'full_name': 'Abebe Kebede (Demo Citizen)',
                'preferred_language': 'om',
            }
        )

        admin_user, _ = User.objects.get_or_create(
            phone_number='0911000002',
            defaults={
                'is_city_admin': True,
                'is_staff': True,
            }
        )
        if not admin_user.has_usable_password():
            admin_user.set_password('admin1234')
            admin_user.save()

        # Create 3 officer users for the first 3 departments
        departments = list(Department.objects.all())
        if not departments:
            self.stderr.write(self.style.ERROR(
                'No departments found! Run seed_departments first.'
            ))
            return

        officer_users = []
        for i, dept in enumerate(departments[:3]):
            officer_user, _ = User.objects.get_or_create(
                phone_number=f'091100010{i}',
                defaults={
                    'is_officer': True,
                    'is_department_manager': (i == 0),
                }
            )
            if not officer_user.has_usable_password():
                officer_user.set_password('officer1234')
                officer_user.save()

            OfficerProfile.objects.get_or_create(
                user=officer_user,
                defaults={
                    'department': dept,
                    'full_name': f'Officer {i+1} - {dept.name[:30]}',
                    'is_manager': (i == 0),
                }
            )
            officer_users.append(officer_user)

        self.stdout.write(self.style.SUCCESS(
            f'  Created/verified: 1 citizen, 1 admin, {len(officer_users)} officers'
        ))

        # --- 2. Create report categories ---
        self.stdout.write('Creating report categories...')
        categories = []
        for om, am, en in CATEGORIES_DATA:
            cat, _ = ReportCategory.objects.get_or_create(
                name_en=en,
                defaults={'name_om': om, 'name_am': am, 'is_active': True}
            )
            categories.append(cat)

        self.stdout.write(self.style.SUCCESS(
            f'  {len(categories)} categories ready'
        ))

        # --- 3. Create demo reports ---
        self.stdout.write(f'Creating {report_count} demo reports...')
        existing_count = Report.objects.filter(
            case_number__startswith='DEMO-'
        ).count()

        if existing_count >= report_count:
            self.stdout.write(self.style.WARNING(
                f'  Already have {existing_count} demo reports. Skipping.'
            ))
        else:
            to_create = report_count - existing_count
            reports_created = 0

            for i in range(to_create):
                dept = random.choice(departments)
                cat = random.choice(categories)
                status = random.choices(STATUSES, weights=STATUS_WEIGHTS, k=1)[0]
                priority = random.choices(PRIORITIES, weights=PRIORITY_WEIGHTS, k=1)[0]
                description = random.choice(SAMPLE_DESCRIPTIONS)

                # Random location near Adama center
                lat = ADAMA_LAT + random.uniform(-SCATTER, SCATTER)
                lng = ADAMA_LNG + random.uniform(-SCATTER, SCATTER)
                point = Point(lng, lat)

                # Random creation date within last 60 days
                days_ago = random.randint(0, 60)
                created = now - timedelta(
                    days=days_ago,
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59),
                )

                case_number = f"DEMO-{uuid.uuid4().hex[:6].upper()}"

                resolved_at = None
                closed_at = None
                if status in ('RESOLVED', 'CLOSED'):
                    resolved_at = created + timedelta(
                        days=random.randint(1, 10),
                        hours=random.randint(0, 12),
                    )
                if status == 'CLOSED':
                    closed_at = resolved_at + timedelta(days=random.randint(1, 5))

                Report.objects.create(
                    case_number=case_number,
                    citizen=citizen_user,
                    is_anonymous=random.choice([True, False, False, False]),
                    category=cat,
                    description=description,
                    location=point,
                    status=status,
                    priority=priority,
                    primary_department=dept,
                    created_at=created,
                    resolved_at=resolved_at,
                    closed_at=closed_at,
                )
                reports_created += 1

            self.stdout.write(self.style.SUCCESS(
                f'  Created {reports_created} demo reports'
            ))

        # --- Summary ---
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('DEMO DATA SEEDED SUCCESSFULLY'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('')
        self.stdout.write('Demo Accounts:')
        self.stdout.write(f'  Citizen:  phone=0911000001  password=demo1234')
        self.stdout.write(f'  Admin:    phone=0911000002  password=admin1234')
        self.stdout.write(f'  Officer:  phone=0911000100  password=officer1234')
        self.stdout.write('')
        self.stdout.write(f'  Total departments: {len(departments)}')
        self.stdout.write(f'  Total categories:  {len(categories)}')
        self.stdout.write(f'  Total demo reports: {Report.objects.filter(case_number__startswith="DEMO-").count()}')
        self.stdout.write('')
        self.stdout.write('You can now test:')
        self.stdout.write('  - Web Dashboard: http://localhost:3000')
        self.stdout.write('  - API: http://localhost:8000/api/v1/')
        self.stdout.write('  - Mobile: flutter run (use 0911000001 + OTP 123456)')

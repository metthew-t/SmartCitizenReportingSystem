"""
Department seeder management command.
Seeds the exact 33 Adama City departments. Safe to re-run (get_or_create).
"""
from django.core.management.base import BaseCommand
from core.models import Department

DEPARTMENTS = [
    "Galmeessa Siivilii",
    "Waajjira Invastimantii",
    "Bulchiinsaa fi Nageenya",
    "Waajjira Hojjataa fi Hawaasummaa",
    "Waajjira Aadaa fi Turiizimii",
    "Waajjira Milishaa",
    "Waajjira Dargaggoo fi Ispoortii",
    "Waajjira Karoora/Pilaanii fi Misoomaa",
    "Qajeelcha Poolisii",
    "Buusaa Gonofaa",
    "Abbaa Taayitaa Eegumsa Naannoo",
    "Abbaa Taayitaa Konistiraakshinii",
    "Koomishinii Turizimii",
    "Waajjira Lafaa",
    "Waajjira Fayyaa",
    "Waajjira Abbaa Alangaa",
    "Waajjira Saayinsii fi Teeknoloojii",
    "Waajjira Bishaan Dhugaatii fi Dhangala'aa",
    "Giddu-gala Tajaajilaa",
    "Waldaa Hojii Gamtaa",
    "Waajjira Albuuda",
    "Waajjira Dhimma Dubartootaa fi Daa'immanii",
    "Mana Qopheessaa",
    "Waajjira Galii",
    "Ejansii Geejjibaa",
    "Waajjira Kantiibaa",
    "Waajjira PSMQN",
    "Waajjira Kominikeeshinii",
    "Waajjira Daldala",
    "Waajjira Qonnaa",
    "Waajjira Maallaqaa",
    "Waajjira Carraa Hojii Uumuu fi Ogummaa",
    "Waajjira Barnoota",
]

# Pre-seeded routing keywords per department (Afaan Oromo, Amharic, English)
ROUTING_KEYWORDS = {
    "Waajjira Bishaan Dhugaatii fi Dhangala'aa": [
        ('om', 'bishaan'), ('om', 'bishaani'), ('om', 'dhangala\'aa'), ('om', 'bishaanfitaa'),
        ('am', 'ውሃ'), ('am', 'ፍሳሽ'), ('en', 'water'), ('en', 'water leak'), ('en', 'pipe burst'),
    ],
    "Waajjira Fayyaa": [
        ('om', 'fayyaa'), ('om', 'dhukkuba'), ('om', 'hospital'), ('om', 'mana yaalaa'),
        ('am', 'ጤና'), ('am', 'ሆስፒታል'), ('en', 'health'), ('en', 'hospital'), ('en', 'sick'),
    ],
    "Qajeelcha Poolisii": [
        ('om', 'poolisii'), ('om', 'saamuu'), ('om', 'hatuu'), ('om', 'miidhaa'),
        ('am', 'ፖሊስ'), ('am', 'ሌብነት'), ('en', 'police'), ('en', 'theft'), ('en', 'crime'), ('en', 'robbery'),
    ],
    "Abbaa Taayitaa Konistiraakshinii": [
        ('om', 'riqicha'), ('om', 'daandii'), ('om', 'manni kufuu'),
        ('am', 'ድልድይ'), ('am', 'ህንፃ'), ('en', 'road'), ('en', 'pothole'), ('en', 'building'), ('en', 'construction'),
    ],
    "Abbaa Taayitaa Eegumsa Naannoo": [
        ('om', 'naannoo'), ('om', 'haxxee'), ('om', 'xurii'),
        ('am', 'አካባቢ'), ('am', 'ቆሻሻ'), ('en', 'environment'), ('en', 'pollution'), ('en', 'waste'),
    ],
    "Ejansii Geejjibaa": [
        ('om', 'geejjiba'), ('om', 'konkolata'), ('om', 'bu\'uraa'),
        ('am', 'ትራፊክ'), ('am', 'ትራንስፖርት'), ('en', 'transport'), ('en', 'traffic'), ('en', 'bus'),
    ],
}


class Command(BaseCommand):
    help = 'Seed the 33 Adama City departments and initial routing keywords'

    def handle(self, *args, **options):
        from core.models import RoutingRule, RoutingKeyword, ReportCategory

        created_count = 0
        for name in DEPARTMENTS:
            _, created = Department.objects.get_or_create(name=name, defaults={'is_active': True})
            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f'Seeded {created_count} new departments (total: {len(DEPARTMENTS)})'))

        # Seed routing keywords
        kw_count = 0
        for dept_name, keywords in ROUTING_KEYWORDS.items():
            dept = Department.objects.filter(name=dept_name).first()
            if not dept:
                continue
            rule, _ = RoutingRule.objects.get_or_create(department=dept, defaults={'priority': 1, 'is_active': True})
            for lang, kw in keywords:
                _, created = RoutingKeyword.objects.get_or_create(rule=rule, keyword=kw, language=lang)
                if created:
                    kw_count += 1

        self.stdout.write(self.style.SUCCESS(f'Seeded {kw_count} new routing keywords'))

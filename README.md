# Adama Smart Citizen Reporting System

Production-ready Smart Citizen Reporting and Service Management System for Adama City Administration, Ethiopia.

## Architecture Overview

```
/
├── backend/          # Django REST Framework API (Python)
├── web/              # React + Vite + Tailwind CSS Dashboard (TypeScript)
├── mobile/           # Flutter App (Android & iOS)
├── infrastructure/   # Nginx config
├── docker-compose.yml
├── .env.example
└── .gitignore
```

## Technology Stack

| Layer | Technology |
|---|---|
| Mobile | Flutter, Dart |
| Web Dashboard | React, Vite, TypeScript, Tailwind CSS |
| Backend API | Python, Django, Django REST Framework |
| Database | PostgreSQL + PostGIS |
| Auth | JWT (phone number + password + OTP architecture) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Maps | OpenStreetMap (provider-swappable) |
| Deployment | Docker, Docker Compose, Nginx |

## Quick Start

### Prerequisites
- Docker Desktop installed and running

### 1. Clone and configure
```bash
# Copy environment variables
cp .env.example .env
# Edit .env — at minimum set DB_PASSWORD and DJANGO_SECRET_KEY
```

### 2. Start the full stack
```bash
docker-compose up --build
```

This will automatically:
- Start PostgreSQL + PostGIS
- Run Django migrations
- **Seed all 33 Adama City departments**
- Seed initial routing keywords (Afaan Oromo, Amharic, English)
- Start the Django API on port 8000
- Start the React web dashboard on port 3000
- Start Nginx reverse proxy on port 80

### 3. Access the applications
| Service | URL |
|---|---|
| Web Dashboard | http://localhost or http://localhost:3000 |
| Backend API | http://localhost/api/v1/ |
| Django Admin | http://localhost/admin/ |
| API Root | http://localhost:8000/api/v1/ |

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/auth/register/` | POST | Register new user |
| `/api/v1/auth/login/` | POST | Login (phone + password) → JWT |
| `/api/v1/auth/otp/request/` | POST | Request OTP |
| `/api/v1/auth/otp/verify/` | POST | Verify OTP → JWT |
| `/api/v1/auth/me/` | GET | Current user profile |
| `/api/v1/reports/` | GET / POST | List / create reports |
| `/api/v1/reports/{id}/change_status/` | POST | Change report status |
| `/api/v1/reports/{id}/upload_media/` | POST | Upload media |
| `/api/v1/reports/recommend_department/` | POST | Rule-based dept recommendation |
| `/api/v1/departments/` | GET | List all 33 departments |
| `/api/v1/categories/` | GET | List report categories |
| `/api/v1/notifications/` | GET | List user notifications |
| `/api/v1/notifications/unread_count/` | GET | Unread notification count |
| `/api/v1/notifications/{id}/mark_read/` | POST | Mark notification as read |
| `/api/v1/device-tokens/` | POST | Register FCM device token |
| `/api/v1/analytics/summary/` | GET | Dashboard analytics summary |
| `/api/v1/analytics/by-department/` | GET | Reports by department |
| `/api/v1/analytics/by-status/` | GET | Reports by status |
| `/api/v1/analytics/geojson/` | GET | GeoJSON for map rendering |

## Rule-Based Department Recommendation

The system uses a keyword scoring engine (`core/services.py`) — **no Generative AI**.

- Matches report description against `RoutingKeyword` table (Afaan Oromo, Amharic, English)
- Weights: Category match (10pts) + Keyword match (5pts each) + Rule priority
- Returns: Primary department + up to 2 supporting departments
- Emergency override routes to `Qajeelcha Poolisii` by default
- All routing rules are configurable by Super Administrator via API

## The 33 Adama City Departments

All seeded automatically on first `docker-compose up`:

1. Galmeessa Siivilii, 2. Waajjira Invastimantii, 3. Bulchiinsaa fi Nageenya, 4. Waajjira Hojjataa fi Hawaasummaa, 5. Waajjira Aadaa fi Turiizimii, 6. Waajjira Milishaa, 7. Waajjira Dargaggoo fi Ispoortii, 8. Waajjira Karoora/Pilaanii fi Misoomaa, 9. Qajeelcha Poolisii, 10. Buusaa Gonofaa, 11. Abbaa Taayitaa Eegumsa Naannoo, 12. Abbaa Taayitaa Konistiraakshinii, 13. Koomishinii Turizimii, 14. Waajjira Lafaa, 15. Waajjira Fayyaa, 16. Waajjira Abbaa Alangaa, 17. Waajjira Saayinsii fi Teeknoloojii, 18. Waajjira Bishaan Dhugaatii fi Dhangala'aa, 19. Giddu-gala Tajaajilaa, 20. Waldaa Hojii Gamtaa, 21. Waajjira Albuuda, 22. Waajjira Dhimma Dubartootaa fi Daa'immanii, 23. Mana Qopheessaa, 24. Waajjira Galii, 25. Ejansii Geejjibaa, 26. Waajjira Kantiibaa, 27. Waajjira PSMQN, 28. Waajjira Kominikeeshinii, 29. Waajjira Daldala, 30. Waajjira Qonnaa, 31. Waajjira Maallaqaa, 32. Waajjira Carraa Hojii Uumuu fi Ogummaa, 33. Waajjira Barnoota

## Report Workflow

```
Submitted → Received → Assigned → Under Investigation → In Progress → Resolved → Citizen Confirmation → Closed
                                                                                    ↓
                                                                                Reopened
```

## Escalation Engine

Run manually or via cron:
```bash
docker-compose exec api python manage.py run_escalation
```

Escalation levels:
- **Level 1** (4h): Unassigned → notify department manager
- **Level 2** (24h): Not investigated → escalate priority to HIGH
- **Level 3** (72h): Unresolved → escalate to CRITICAL, notify city admins

## Running Tests

```bash
docker-compose exec api python manage.py test core
```

## Languages Supported
- 🟢 **Afaan Oromo** (default)
- 🟡 Amharic
- 🔵 English

## Security

- JWT authentication on all protected endpoints
- Role-based access: Citizen, Officer, Department Manager, City Administrator, Super Admin
- Phone number as primary identifier
- Passwords hashed via Django's PBKDF2 + SHA256
- National ID stored but never exposed via API
- No secrets in source code — all via `.env`
- `DEBUG=0` enforced in production via env var
- Audit log records all major actions

## Deployment (Production)

When the official domain is assigned:
1. Update `.env` with your domain
2. Add SSL certificates to `infrastructure/nginx/`
3. Configure `api.[domain]` and `admin.[domain]` in `nginx.conf`
4. Run: `docker-compose up -d`

## Backup

```bash
# Database backup
docker-compose exec db pg_dump -U postgres adama_reports_db > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker-compose exec -T db psql -U postgres adama_reports_db
```

Recommended: Daily automated backups with 30-day retention.

---

*Built for Adama City Administration, Ethiopia.*
*No Generative AI is used. All intelligence is rule-based.*

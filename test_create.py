import urllib.request
import json
import time

base_url = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

# Login first
req = urllib.request.Request(f"{base_url}/auth/login/", data=json.dumps({
    "phone_number": "+251999888111",
    "password": "password123"
}).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')

try:
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode('utf-8'))
    token = data['access']
    print("Logged in")
except Exception as e:
    print(f"Login failed: {e}")
    exit(1)

print("Waiting for deploy...")
time.sleep(120)

# Run fix_db
print("Running fix_db...")
req = urllib.request.Request(f"{base_url}/reports/fix_db/", headers={'Authorization': f'Bearer {token}'})
try:
    res = urllib.request.urlopen(req)
    print("fix_db done")
except Exception as e:
    print(f"fix_db failed: {e}")

# Try to submit a report
print("Submitting report...")
req = urllib.request.Request(f"{base_url}/reports/", data=json.dumps({
    "description": "Test report after fixing location column",
    "latitude": 8.54,
    "longitude": 39.27,
    "category": 1,
    "priority": "MEDIUM",
    "address": "Adama",
    "aanaa": "Adama",
    "kuta_magaalaa": "Adama",
    "kebele": "Adama",
    "iddoo_addaa": "Adama"
}).encode('utf-8'), headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}, method='POST')

try:
    res = urllib.request.urlopen(req)
    print("Report created successfully!")
except urllib.error.HTTPError as e:
    print(f"Report create ERROR: {e.read().decode('utf-8')[:500]}")

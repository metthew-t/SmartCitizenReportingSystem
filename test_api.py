import urllib.request
import json

base_url = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

# 1. Register
req = urllib.request.Request(f"{base_url}/auth/register/", data=json.dumps({
    "phone_number": "+251999888777",
    "password": "password123",
    "full_name": "Test User",
    "national_id": "1122334455667788"
}).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')

try:
    res = urllib.request.urlopen(req)
    print("Registered successfully")
except Exception as e:
    print(f"Register failed: {e}")

# 2. Login
req = urllib.request.Request(f"{base_url}/auth/login/", data=json.dumps({
    "phone_number": "+251999888777",
    "password": "password123"
}).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')

try:
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode('utf-8'))
    token = data['access']
    print("Logged in successfully")
except urllib.error.HTTPError as e:
    print(f"Login 500 error body: {e.read().decode('utf-8')[:500]}")
    exit(1)

# 3. Fetch reports
req = urllib.request.Request(f"{base_url}/reports/", headers={'Authorization': f'Bearer {token}'}, method='GET')
try:
    res = urllib.request.urlopen(req)
    print("Fetched reports successfully")
except urllib.error.HTTPError as e:
    print(f"Reports 500 error body: {e.read().decode('utf-8')[:500]}")


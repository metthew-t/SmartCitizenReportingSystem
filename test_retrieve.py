import urllib.request
import json

base_url = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

# Login as admin
req = urllib.request.Request(
    f"{base_url}/auth/login/",
    data=json.dumps({"phone_number": "admin@adama.gov.et", "password": "Admin@123"}).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='POST'
)
res = urllib.request.urlopen(req)
token = json.loads(res.read().decode('utf-8'))['access']
print("Logged in OK")

# First get list of reports to find an ID
req2 = urllib.request.Request(
    f"{base_url}/reports/",
    headers={'Authorization': f'Bearer {token}'},
    method='GET'
)
try:
    res2 = urllib.request.urlopen(req2)
    data = json.loads(res2.read().decode('utf-8'))
    reports = data if isinstance(data, list) else data.get('results', [])
    print(f"Reports list: {len(reports)} reports")
    if reports:
        rid = reports[0]['id']
        print(f"Testing retrieve for report ID={rid}...")
        
        req3 = urllib.request.Request(
            f"{base_url}/reports/{rid}/",
            headers={'Authorization': f'Bearer {token}'},
            method='GET'
        )
        try:
            res3 = urllib.request.urlopen(req3)
            detail = json.loads(res3.read().decode('utf-8'))
            print(f"Retrieve SUCCESS: case={detail.get('case_number')}, status={detail.get('status')}")
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8')[:500]
            print(f"Retrieve FAILED: {e.code} - {body}")
    else:
        print("No reports found to test retrieve")
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8')[:500]
    print(f"List FAILED: {e.code} - {body}")

import requests
import json

try:
    response = requests.get('http://127.0.0.1:5000/api/chat/history?session_id=default')
    print(f"Status: {response.status_code}")
    print(f"Count: {len(response.json())}")
    print(f"JSON: {json.dumps(response.json()[:2], indent=2)}")
except Exception as e:
    print(f"Error: {e}")

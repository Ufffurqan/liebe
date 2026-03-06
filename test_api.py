import requests
import json

try:
    response = requests.get('http://127.0.0.1:5000/api/chat/sessions')
    print(f"Status: {response.status_code}")
    print(f"JSON: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")

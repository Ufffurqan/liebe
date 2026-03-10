import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
result = urlparse(db_url)

username = result.username
password = result.password
database = result.path[1:]
hostname = result.hostname
port = result.port

print(f"Parsed Hostcode: {hostname}:{port}")

try:
    conn = psycopg2.connect(
        database=database,
        user=username,
        password=password,
        host=hostname,
        port=port
    )
    print("✅ Connection Success!")
    conn.close()
except Exception as e:
    print(f"❌ Connection Failed: {e}")

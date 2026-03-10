import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
# Supabase URI usually looks like postgresql://postgres:[password]@db.abc.supabase.co:5432/postgres
# We need to parse it or just pass it to connect()
try:
    print(f"Connecting to: {db_url.split('@')[-1]}")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT 1")
    print(f"Result: {cur.fetchone()}")
    print("✅ Connection Success!")
    conn.close()
except Exception as e:
    print(f"❌ Connection Failed: {e}")

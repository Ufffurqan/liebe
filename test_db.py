import os
from dotenv import load_dotenv
import sqlalchemy
from sqlalchemy import create_engine, text

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+pg8000://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+pg8000://", 1)

print(f"Testing URL (masked): {db_url.split('@')[-1]}")
try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        print("Executing test query...")
        res = conn.execute(text("SELECT 1"))
        print(f"Result: {res.fetchone()}")
        print("✅ Connection Success!")
except Exception as e:
    print(f"❌ Connection Failed:\n{e}")
    import traceback
    traceback.print_exc()

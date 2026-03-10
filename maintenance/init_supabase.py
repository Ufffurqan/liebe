import sys
import os

# Set absolute path to root directory
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(ROOT_DIR)

from dotenv import load_dotenv

def init_supabase():
    print("--- SUPABASE INITIALIZATION ---")
    
    # Force absolute path to .env
    env_path = os.path.join(ROOT_DIR, ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        print(f"❌ Error: .env file not found at {env_path}")
        return

    # Import app and db AFTER loading dotenv so they get the variables
    from app import app
    from models import db
    
    db_url = os.getenv('DATABASE_URL')
    if not db_url or "[YOUR-PASSWORD]" in db_url:
        print("❌ Error: DATABASE_URL is not fully configured (it still contains [YOUR-PASSWORD]).")
        print(f"URL: {db_url}")
        return
    
    print(f"Connecting to host: {db_url.split('@')[-1]}")
    
    with app.app_context():
        try:
            db.create_all()
            print("✅ Success! All tables have been created in Supabase.")
        except Exception as e:
            print(f"❌ Error during initialization: {e}")

if __name__ == "__main__":
    init_supabase()

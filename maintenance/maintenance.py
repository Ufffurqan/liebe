import sys
import os
from werkzeug.security import generate_password_hash
from app import app
from models import db, FailedAttempt

def show_usage():
    print("\n--- LIEBE AI MAINTENANCE TOOL ---")
    print("Usage:")
    print("  python maintenance.py hash <password>   - Generate a secure hash for .env")
    print("  python maintenance.py reset            - Unlock all IP addresses (reset attempts)")
    print("  python maintenance.py fix <password>     - Automatically update .env with house-cleaned hash and reset locks")
    print("----------------------------------\n")

def gen_hash(password):
    hashed = generate_password_hash(password)
    print(f"\nSECURE HASH:\n{hashed}\n")
    print("Copy this into your .env file as APP_PASSWORD_HASH")

def reset_locks():
    with app.app_context():
        num = db.session.query(FailedAttempt).delete()
        db.session.commit()
        print(f"Successfully cleared {num} lockout records.")

def master_fix(password):
    new_hash = generate_password_hash(password)
    env_path = ".env"
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()
        with open(env_path, "w") as f:
            found = False
            for line in lines:
                if line.startswith("APP_PASSWORD_HASH="):
                    f.write(f"APP_PASSWORD_HASH={new_hash}\n")
                    found = True
                else:
                    f.write(line)
            if not found:
                f.write(f"\nAPP_PASSWORD_HASH={new_hash}\n")
        print("1. Clean hash updated in .env")
        reset_locks()
        print(f"2. Locks reset. Use '{password}' to login.")
    else:
        print(".env not found!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        show_usage()
        sys.exit(1)
    
    cmd = sys.argv[1].lower()
    
    if cmd == "hash" and len(sys.argv) > 2:
        gen_hash(sys.argv[2])
    elif cmd == "reset":
        reset_locks()
    elif cmd == "fix" and len(sys.argv) > 2:
        master_fix(sys.argv[2])
    else:
        show_usage()

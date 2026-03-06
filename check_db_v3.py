import sqlite3
import os

db_path = 'instance/liebe.db'
if not os.path.exists(db_path):
    db_path = 'liebe.db'

print(f"Checking {db_path}...")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT session_id, COUNT(*) FROM chat_message GROUP BY session_id")
    sessions = cursor.fetchall()
    print("Sessions and counts:")
    for s in sessions:
        print(f"  - Session [{s[0]}]: {s[1]} messages")
    
except Exception as e:
    print(f"Error: {e}")

conn.close()

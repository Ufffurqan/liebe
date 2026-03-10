import sqlite3
import os

db_path = 'instance/liebe.db'
if not os.path.exists(db_path):
    db_path = 'liebe.db'

print(f"Checking {db_path}...")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT COUNT(*) FROM chat_message")
    count = cursor.fetchone()[0]
    print(f"Total messages in chat_message table: {count}")
    
    cursor.execute("PRAGMA table_info(chat_message)")
    columns = cursor.fetchall()
    print("Columns in chat_message table:")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")

    cursor.execute("SELECT session_id, role, content[:50] FROM chat_message ORDER BY timestamp DESC LIMIT 5")
    recent = cursor.fetchall()
    print("\nMost recent messages:")
    for r in recent:
        print(f"  [{r[0]}] {r[1]}: {r[2]}...")

except Exception as e:
    print(f"Error: {e}")

conn.close()

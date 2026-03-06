import sqlite3
import os

db_path = 'instance/liebe.db'
if not os.path.exists(db_path):
    db_path = 'liebe.db'

print(f"Checking {db_path}...")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT COUNT(*) FROM chat_message WHERE session_id IS NULL")
    null_count = cursor.fetchone()[0]
    print(f"Messages with NULL session_id: {null_count}")
    
    cursor.execute("SELECT COUNT(*) FROM chat_message WHERE session_id = ''")
    empty_count = cursor.fetchone()[0]
    print(f"Messages with empty session_id: {empty_count}")

    cursor.execute("SELECT session_id, role, content[:30] FROM chat_message ORDER BY timestamp DESC LIMIT 20")
    recent = cursor.fetchall()
    print("\nRecent raw messages (last 20):")
    for r in recent:
        print(f"  [{r[0]}] {r[1]}: {r[2]}...")

except Exception as e:
    print(f"Error: {e}")

conn.close()

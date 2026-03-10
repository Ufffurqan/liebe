import sqlite3
conn = sqlite3.connect('instance/liebe.db')
cursor = conn.cursor()
cursor.execute("SELECT * FROM alarm;")
print("Alarms:", cursor.fetchall())
conn.close()

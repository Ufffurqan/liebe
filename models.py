from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class DailyNote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date_str = db.Column(db.String(50), nullable=False) # e.g., "Sat Feb 21 2026"
    content = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(20), default='regular') # 'regular' or 'briefing'
    timestamp = db.Column(db.Float, default=datetime.utcnow().timestamp)

    def to_dict(self):
        return {
            "id": self.id,
            "date_str": self.date_str,
            "content": self.content,
            "type": self.type,
            "timestamp": self.timestamp
        }

class Alarm(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(20), nullable=False) # 'alarm' or 'timer'
    time_value = db.Column(db.String(50), nullable=False) # "07:30" or target_timestamp
    display = db.Column(db.String(50)) # e.g. "10m"
    prepared = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "time_value": self.time_value,
            "display": self.display,
            "prepared": self.prepared
        }
class ChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(20), nullable=False) # 'user' or 'assistant'
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp.isoformat()
        }

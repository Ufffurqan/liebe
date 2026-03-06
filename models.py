from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class DailyNote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date_str = db.Column(db.String(50), nullable=False)
    content = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(20), default='regular')
    timestamp = db.Column(db.Float, default=datetime.now().timestamp)

    def to_dict(self):
        return {
            'id': self.id,
            'date_str': self.date_str,
            'content': self.content,
            'type': self.type,
            'timestamp': self.timestamp
        }

class Alarm(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(20), nullable=False) # 'alarm' or 'timer'
    time_value = db.Column(db.String(50), nullable=False)
    display = db.Column(db.String(50))
    prepared = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'time_value': self.time_value,
            'display': self.display,
            'prepared': self.prepared
        }

class ChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(50), nullable=False, default='default')
    role = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    file_path = db.Column(db.String(255), nullable=True)
    file_type = db.Column(db.String(50), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'role': self.role,
            'content': self.content,
            'file_path': self.file_path,
            'file_type': self.file_type,
            'timestamp': self.timestamp.isoformat()
        }

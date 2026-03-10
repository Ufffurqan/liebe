import os
import re
import asyncio
import tempfile
import json
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file, Response, session
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
from dotenv import load_dotenv
from liebe.orchestrator import orchestrator
from models import db, DailyNote, Alarm, ChatMessage, FailedAttempt
import edge_tts

# Load environment variables
load_dotenv()

# Vercel-safe absolute path handling
import tempfile
BASE_TMP_PATH = "/tmp" if os.name != 'nt' else tempfile.gettempdir()

# Explicitly define folders for consistent behavior across environments
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    static_folder=os.path.join(BASE_DIR, 'static'),
    template_folder=os.path.join(BASE_DIR, 'templates'),
    instance_path=os.path.abspath(BASE_TMP_PATH)
)
app.secret_key = os.getenv('SESSION_SECRET', 'liebe-ultra-secure-fallback-key-999')

# Use a hashed password from environment or fallback to hashed default
DEFAULT_HASH = generate_password_hash('liebe123')
app.config['USER_PASSWORD_HASH'] = os.getenv('APP_PASSWORD_HASH', DEFAULT_HASH)

# Secure Session Settings
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=timedelta(days=7)
)

# --- DATABASE CONFIGURATION (SUPABASE / POSTGRESQL) ---
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("WARNING: DATABASE_URL not set. Application may fail on Vercel.")
    DATABASE_URL = "sqlite:////tmp/liebe.db" 

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Engine Options for Serverless Environments
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True,
    "pool_recycle": 300
}

db.init_app(app)

with app.app_context():
    try:
        db.create_all()
        print("Database connected and initialized successfully.")
    except Exception as e:
        print(f"❌ Database Error: {str(e)}")

CORS(app) # Enable CORS for all routes

def require_auth(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated'):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    password = data.get('password')
    
    # Secure IP detection (safer split)
    xff = request.headers.get('X-Forwarded-For')
    ip = xff.split(',')[0].strip() if xff else request.remote_addr

    print(f"[DEBUG] Login attempt from {ip} for password length: {len(password) if password else 0}")

    # Check lock
    record = FailedAttempt.query.filter_by(ip_address=ip).first()
    if record and record.is_locked():
        remaining = (record.locked_until - datetime.utcnow()).total_seconds()
        hours = int(remaining // 3600)
        minutes = int((remaining % 3600) // 60)
        return jsonify({'error': f'Too many failed attempts. Locked for {hours}h {minutes}m.'}), 403

    current_hash = app.config.get('USER_PASSWORD_HASH')
    
    if check_password_hash(current_hash, password):
        print(f"[DEBUG] Login SUCCESS for {ip}")
        if record:
            db.session.delete(record)
            db.session.commit()
        session['authenticated'] = True
        session.permanent = True
        return jsonify({'status': 'success'})
    else:
        print(f"[DEBUG] Login FAILED for {ip}")
        if not record:
            record = FailedAttempt(ip_address=ip, attempts=1)
            db.session.add(record)
        else:
            record.attempts += 1
            if record.attempts >= 2:
                record.locked_until = datetime.utcnow() + timedelta(hours=24)
        
        db.session.commit()
        
        remaining_tries = 2 - (record.attempts if record else 0)
        if record.attempts >= 2:
            return jsonify({'error': 'Too many failed attempts. Locked for 24 hours.'}), 403
        return jsonify({'error': f'Incorrect password. {remaining_tries} attempts remaining.'}), 401

@app.route('/api/auth_status', methods=['GET'])
def auth_status():
    return jsonify({'authenticated': session.get('authenticated', False)})

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
@require_auth
def chat():
    data = request.json
    user_message = data.get('message', '')
    session_id = data.get('session_id', 'default')
    
    if not user_message:
        return jsonify({'response': "Please say something."})

    search_enabled = data.get('search_enabled', False)
    deep_thinking_enabled = data.get('deep_thinking_enabled', False)
    chat_history = data.get('history', [])

    def generate():
        with app.app_context():
            full_reply = ""
            try:
                user_msg = ChatMessage(
                    role='user', 
                    content=user_message, 
                    session_id=session_id,
                    file_path=data.get('file_path'),
                    file_type=data.get('file_type')
                )
                db.session.add(user_msg)
                db.session.commit()
            except Exception as e: print(f"DB Error: {e}")

            for update_str in orchestrator.chat_stream(
                user_message, 
                history=chat_history,
                force_search=search_enabled, 
                force_deep_thinking=deep_thinking_enabled
            ):
                update = json.loads(update_str)
                if update.get('status') == 'done':
                    full_reply = update.get('full_text', '')
                yield f"data: {update_str}\n\n"
            
            if full_reply:
                try:
                    ai_msg = ChatMessage(role='assistant', content=full_reply, session_id=session_id)
                    db.session.add(ai_msg)
                    db.session.commit()
                except Exception as e: print(f"DB Error: {e}")

    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/chat/history', methods=['GET'])
@require_auth
def get_chat_history():
    session_id = request.args.get('session_id', 'default')
    messages = ChatMessage.query.filter_by(session_id=session_id).order_by(ChatMessage.timestamp.asc()).all()
    return jsonify([m.to_dict() for m in messages])

UPLOAD_FOLDER = os.path.join(os.path.abspath(BASE_TMP_PATH), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/api/upload', methods=['POST'])
@require_auth
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    filename = f"{datetime.now().timestamp()}_{file.filename}"
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)
    
    file_type = file.content_type
    return jsonify({
        'file_path': f"/api/uploads/{filename}",
        'file_type': file_type
    })

# Helper route to serve uploads from /tmp (or system temp)
@app.route('/api/uploads/<filename>')
def serve_upload(filename):
    return send_file(os.path.join(UPLOAD_FOLDER, filename))

@app.route('/api/chat/sessions', methods=['GET'])
@require_auth
def get_sessions():
    # Group sessions and find last message for each
    from sqlalchemy import func
    subquery = db.session.query(
        ChatMessage.session_id,
        func.max(ChatMessage.timestamp).label('max_ts')
    ).group_by(ChatMessage.session_id).subquery()
    
    # Get the last "user" message for each session to use as title
    sessions = db.session.query(ChatMessage).join(
        subquery,
        (ChatMessage.session_id == subquery.c.session_id) & (ChatMessage.timestamp == subquery.c.max_ts)
    ).order_by(ChatMessage.timestamp.desc()).all()
    
    return jsonify([s.to_dict() for s in sessions])

@app.route('/api/chat/history', methods=['DELETE'])
@require_auth
def clear_chat_history():
    ChatMessage.query.delete()
    db.session.commit()
    return jsonify({"status": "success"})

@app.route('/api/weather', methods=['GET'])
@require_auth
def get_top_weather():
    city = request.args.get('city', 'Mumbai')
    # Use the existing orchestrator method
    result = orchestrator.get_weather(city)
    
    if "WEATHER ERROR" in result:
        return jsonify({'error': result})
    
    # Extract details using regex from the formatted string
    temp_match = re.search(r"\*\*Temperature:\*\* (.*?)°C", result)
    desc_match = re.search(r"\*\*Conditions:\*\* (.*?)\n", result)
    humidity_match = re.search(r"\*\*Humidity:\*\* (.*?)%", result)
    wind_match = re.search(r"\*\*Wind Speed:\*\* (.*?) m/s", result)
    
    if temp_match:
        return jsonify({
            'temp': temp_match.group(1),
            'desc': desc_match.group(1) if desc_match else "Clear",
            'humidity': humidity_match.group(1) if humidity_match else "N/A",
            'wind': wind_match.group(1) if wind_match else "N/A",
            'city': city
        })
    
    return jsonify({'error': 'Failed to parse', 'raw': result})

@app.route('/api/morning_briefing', methods=['POST'])
@require_auth
def get_morning_briefing():
    data = request.json
    city = data.get('city', 'Mumbai')
    notes = data.get('notes', [])
    
    # 1. Fetch Weather
    weather_info = orchestrator.get_weather(city)
    
    # 2. Fetch News about India
    news_info = orchestrator.search_web("top news India today", search_type="news")
    
    now = datetime.now()
    date_time_str = now.strftime("%A, %B %d, %Y at %I:%M %p")
    
    # Determine dynamic greeting
    hour = now.hour
    if 5 <= hour < 12:
        greeting = "Good morning"
    elif 12 <= hour < 17:
        greeting = "Good afternoon"
    elif 17 <= hour < 21:
        greeting = "Good evening"
    else:
        greeting = "Hello"
    
    # 3. Construct prompt for Liebe to create a script
    prompt = f"""
    Create a warm, professional, and helpful wake-up script for the user.
    Context:
    - Today's Date and Time: {date_time_str}
    - Weather: {weather_info}
    - News: {news_info}
    - User's Tasks for Today: {", ".join(notes) if notes else "No tasks listed."}
    
    Structure:
    1. Greeting ({greeting}!)
    2. Tell today's date and the current time.
    3. Summarize the weather and give advice (e.g., carry an umbrella).
    4. Highlight 3 top news stories about India.
    5. Remind them of their tasks from their notes.
    6. Give an inspiring closing sentence.
    
    Keep it conversational and suitable for Text-to-Speech. Use plain text, no markdown.
    """
    
    # Use a faster model for the script
    script, _ = orchestrator.chat(prompt, force_search=False, bypass_intent=True)
    
    return jsonify({
        'script': script,
        'weather': weather_info,
        'news': news_info
    })

@app.route('/api/tts')
@require_auth
def tts():
    text = request.args.get('text', '')
    if not text:
        return "No text provided", 400
    
    # Clean up text for better TTS
    text = re.sub(r'\*+', '', text)
    text = re.sub(r'\[.*?\]', '', text) # Remove any remaining tags
    
    voice = "en-US-AriaNeural"
    
    async def _amain():
        communicate = edge_tts.Communicate(text, voice)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    def generate():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        gen = _amain()
        try:
            while True:
                try:
                    yield loop.run_until_complete(gen.__anext__())
                except StopAsyncIteration:
                    break
        except Exception as e:
            print(f"TTS Generation Error: {e}")
        finally:
            loop.close()

    return Response(generate(), mimetype="audio/mpeg")

@app.route('/api/youtube/suggest', methods=['GET'])
@require_auth
def suggest_youtube_videos():
    query = request.args.get('query', 'trending')
    result = orchestrator.get_youtube_recommendations(query)
    return jsonify(result)


# --- DATABASE API ENDPOINTS ---

@app.route('/api/notes', methods=['GET'])
@require_auth
def get_notes():
    date_str = request.args.get('date')
    if date_str:
        notes = DailyNote.query.filter_by(date_str=date_str).all()
    else:
        notes = DailyNote.query.all()
    return jsonify([n.to_dict() for n in notes])

@app.route('/api/notes', methods=['POST'])
@require_auth
def add_note():
    data = request.json
    new_note = DailyNote(
        date_str=data['date_str'],
        content=data['content'],
        type=data.get('type', 'regular'),
        timestamp=data.get('timestamp', datetime.now().timestamp())
    )
    db.session.add(new_note)
    db.session.commit()
    return jsonify(new_note.to_dict()), 201

@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
@require_auth
def delete_note(note_id):
    note = DailyNote.query.get(note_id)
    if note:
        db.session.delete(note)
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"error": "Not found"}), 404

@app.route('/api/alarms', methods=['GET'])
@require_auth
def get_alarms():
    alarms = Alarm.query.all()
    return jsonify([a.to_dict() for a in alarms])

@app.route('/api/alarms', methods=['POST'])
@require_auth
def add_alarm_db():
    data = request.json
    new_alarm = Alarm(
        type=data['type'],
        time_value=data['time_value'],
        display=data.get('display'),
        prepared=data.get('prepared', False)
    )
    db.session.add(new_alarm)
    db.session.commit()
    return jsonify(new_alarm.to_dict()), 201

@app.route('/api/alarms/<int:alarm_id>', methods=['DELETE'])
@require_auth
def delete_alarm_db(alarm_id):
    alarm = Alarm.query.get(alarm_id)
    if alarm:
        db.session.delete(alarm)
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"error": "Not found"}), 404

@app.route('/api/alarms/<int:alarm_id>', methods=['PATCH'])
@require_auth
def update_alarm_db(alarm_id):
    alarm = Alarm.query.get(alarm_id)
    if not alarm:
        return jsonify({"error": "Not found"}), 404
    
    data = request.json
    if 'prepared' in data:
        alarm.prepared = data['prepared']
    
    db.session.commit()
    return jsonify(alarm.to_dict())

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

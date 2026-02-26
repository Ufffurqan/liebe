import os
import re
import asyncio
import tempfile
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file, Response
from flask_cors import CORS
from dotenv import load_dotenv
from liebe.orchestrator import orchestrator
from models import db, DailyNote, Alarm, ChatMessage
import edge_tts

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///liebe.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

CORS(app) # Enable CORS for all routes

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '')
    
    if not user_message:
        return jsonify({'response': "Please say something."})

    search_enabled = data.get('search_enabled', False)
    deep_thinking_enabled = data.get('deep_thinking_enabled', False)
    chat_history = data.get('history', [])
    user_msg = ChatMessage(role='user', content=user_message)
    db.session.add(user_msg)
    db.session.commit()

    def generate():
        full_reply = ""
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
        
        # Save AI Response
        if full_reply:
            ai_msg = ChatMessage(role='assistant', content=full_reply)
            db.session.add(ai_msg)
            db.session.commit()

    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/chat/history', methods=['GET'])
def get_chat_history():
    messages = ChatMessage.query.order_by(ChatMessage.timestamp.asc()).all()
    return jsonify([m.to_dict() for m in messages])

@app.route('/api/chat/history', methods=['DELETE'])
def clear_chat_history():
    ChatMessage.query.delete()
    db.session.commit()
    return jsonify({"status": "success"})

@app.route('/api/weather', methods=['GET'])
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
def suggest_youtube_videos():
    query = request.args.get('query', 'trending')
    result = orchestrator.get_youtube_recommendations(query)
    return jsonify(result)


# --- DATABASE API ENDPOINTS ---

@app.route('/api/notes', methods=['GET'])
def get_notes():
    date_str = request.args.get('date')
    if date_str:
        notes = DailyNote.query.filter_by(date_str=date_str).all()
    else:
        notes = DailyNote.query.all()
    return jsonify([n.to_dict() for n in notes])

@app.route('/api/notes', methods=['POST'])
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
def delete_note(note_id):
    note = DailyNote.query.get(note_id)
    if note:
        db.session.delete(note)
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"error": "Not found"}), 404

@app.route('/api/alarms', methods=['GET'])
def get_alarms():
    alarms = Alarm.query.all()
    return jsonify([a.to_dict() for a in alarms])

@app.route('/api/alarms', methods=['POST'])
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
def delete_alarm_db(alarm_id):
    alarm = Alarm.query.get(alarm_id)
    if alarm:
        db.session.delete(alarm)
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"error": "Not found"}), 404

if __name__ == '__main__':
    app.run(debug=True)

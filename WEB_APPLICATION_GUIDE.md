# Liebe AI Assistant - Web Application

## 🌐 Your Website is Running!

**URL:** [http://localhost:5000](http://localhost:5000)

---

## ✅ Complete Feature List

Your web application includes:

### **1. 💬 AI Chat**
- Real-time conversations with AI
- Multiple AI models (Gemini, Groq, Ollama)
- Search & deep thinking modes
- Streaming responses
- Session management
- Chat history persistence

### **2. 🌤️ Weather Display**
- Real-time weather from OpenWeatherMap
- Temperature, conditions, humidity, wind speed
- Auto-refresh every few minutes
- Beautiful gradient card design

### **3. 📅 Weekly Calendar & Notes**
- Week view with date selection
- Add/delete notes for specific dates
- Task management
- Event planning
- Persistent storage

### **4. ⏰ Alarm System**
- Set wake-up alarms
- Multiple alarm types
- Prepared/Not prepared status
- Visual indicators
- Auto-save

### **5. 🎙️ Morning Briefing**
- Personalized wake-up scripts
- Weather integration
- Top news summaries
- Today's tasks reminder
- Professional AI generation

### **6. 🎙️ Text-to-Speech**
- Neural voice synthesis (Edge TTS)
- Audio streaming
- Clean text formatting
- Natural intonation

---

## 🚀 How to Use

### Start Your Website:
```bash
cd c:\liebe\clean_web_app
python app.py
```

Then open your browser to: **http://localhost:5000**

---

## 📊 Technology Stack

**Backend:**
- Flask (Python web framework)
- SQLAlchemy (database ORM)
- SQLite (database)
- Liebe Orchestrator (AI routing)

**Frontend:**
- HTML5
- CSS3 (dark theme)
- JavaScript ES6+
- Server-Sent Events (SSE)

**AI Services:**
- Google Gemini API
- Groq LLM API
- DuckDuckGo Search API
- OpenWeatherMap API
- Edge TTS

---

## 📁 Project Structure

```
c:\liebe\clean_web_app\
│
├── app.py                    # Main Flask application
├── liebe/
│   └── orchestrator.py       # AI orchestration engine
├── static/
│   ├── css/
│   │   └── styles.css        # Dark theme styling
│   └── js/
│       └── script.js         # Client-side logic
├── templates/
│   └── index.html            # Main UI template
├── knowledge_base/
│   └── user_info.txt         # User data storage
└── instance/
    └── liebe.db              # SQLite database
```

---

## 🎨 Design Features

- **Dark Theme** - Eye-friendly dark colors
- **Responsive Layout** - Works on all screen sizes
- **Glassmorphism** - Modern glass effects
- **Custom Animations** - Smooth transitions
- **Interactive UI** - Hover states and feedback

---

## 🔧 Configuration

### Environment Variables (.env):
- `GEMINI_API_KEY` - Google Gemini API key
- `GROQ_API_KEY` - Groq inference API key
- `OPENWEATHER_API_KEY` - Weather API key
- Other service credentials

### Database:
- Location: `instance/liebe.db`
- Tables: ChatMessage, DailyNote, Alarm
- Auto-created on first run

---

## ✨ Key Features Detail

### AI Chat
- Type messages in input field
- Toggle "Search" for web results
- Toggle "Deep Thinking" for complex reasoning
- Responses stream in real-time
- Saved to database automatically

### Weather Widget
- Located in top-right corner
- Click to see full details
- Shows temperature, conditions, humidity, wind
- Auto-refreshes periodically

### Calendar & Notes
- Click clock widget to open calendar
- Navigate weeks with arrows
- Select date to view/add notes
- Notes sync with database

### Alarms
- Managed from sidebar
- Shows active alarms
- Visual preparation status
- Integrated with morning briefing

### Morning Briefing
- Available via API endpoint
- Combines weather, news, tasks
- Generates warm, professional script
- Can be spoken via TTS

---

## 📞 Quick Reference

| Feature | Location | Backend Endpoint |
|---------|----------|------------------|
| AI Chat | Main area | `/api/chat` |
| Weather | Top-right | `/api/weather` |
| Notes | Calendar panel | `/api/notes` |
| Alarms | Sidebar | `/api/alarms` |
| Briefing | API only | `/api/morning_briefing` |
| TTS | Integrated | `/api/tts` |

---

## 🎯 What Makes This Special

✅ **Complete AI Assistant** - All features in one place  
✅ **Multi-LLM Support** - Choose best model for task  
✅ **Real-Time Updates** - SSE streaming  
✅ **Data Persistence** - SQLite database  
✅ **Beautiful UI** - Modern dark theme  
✅ **Privacy-First** - Local deployment  
✅ **Customizable** - Easy to extend  

---

## 📖 Additional Files in Root Directory

These files help you manage the project:

- `Liebe.bat` - Windows batch launcher
- `check_alarms.py` - Alarm verification script
- `check_db.py` - Database inspection tool
- `server_logs.txt` - Server log file
- `.env` - Environment configuration
- `requirements.txt` - Python dependencies

---

## 🔒 Security Notes

Current setup:
- ✅ CORS enabled for development
- ✅ Environment variables protected
- ✅ Database file local only
- ✅ Input sanitization implemented

For production:
- 🔒 Enable HTTPS
- 🔒 Add authentication
- 🔒 Implement rate limiting
- 🔒 Use PostgreSQL instead of SQLite

---

## 🎉 You're All Set!

Your Liebe AI Assistant web application is:
- ✅ Running at http://localhost:5000
- ✅ Fully functional with all features
- ✅ Connected to all AI services
- ✅ Styled with beautiful dark theme
- ✅ Ready for daily use

**Just open your browser and start chatting!** 💬✨

---

**No mobile apps, no distractions - just your powerful web-based AI assistant!** 🚀

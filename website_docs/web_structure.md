# Liebe AI Assistant - Web Application Structure

This document describes the web application components of the Liebe AI Assistant.

## Web Application Files

```
├── app.py                    # Flask server (handles web requests)
├── requirements.txt          # Dependencies needed for web app
├── .env                     # Environment variables for web app
├── .gitignore               # Files to exclude from version control
├── static/                  # Static web assets (CSS, JS, images)
│   ├── css/
│   │   └── styles.css       # Web page styling
│   └── js/
│       └── script.js        # Client-side JavaScript for web interface
└── templates/               # HTML templates for web pages
    └── index.html           # Main web application page
```

## Web Application Endpoints

The web application exposes these endpoints:
- `/` - Main web interface
- `/api/chat` - Chat functionality
- `/api/weather` - Weather data
- `/api/morning_briefing` - Morning briefing
- `/api/tts` - Text-to-speech

## Web Interface Features

- Responsive design with dark theme
- Real-time chat interface
- Weather display
- Alarm and calendar functionality
- Text-to-speech controls
- Sidebar navigation

## How the Web App Works

1. Flask server runs on `http://localhost:5000`
2. Web interface served from `templates/index.html`
3. Static assets served from `static/` directory
4. API calls handled by endpoints in `app.py`
5. AI processing handled by orchestrator in `liebe/` directory
6. User data stored in `knowledge_base/` directory

## Running the Web Application

To run the web application:
1. Install dependencies: `pip install -r requirements.txt`
2. Start the server: `python app.py`
3. Visit in browser: `http://localhost:5000`
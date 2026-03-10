# Liebe AI Assistant - Web Application

Welcome to the Liebe AI Assistant web application! This is a full-featured AI assistant accessible through your web browser.

## Features

- **AI Chat Interface**: Interactive conversations with an intelligent assistant
- **Weather Integration**: Real-time weather information display
- **Web Search**: Access to current information from the web
- **Text-to-Speech**: Audio responses for AI replies
- **Calendar & Notes**: Weekly calendar with note-taking capability
- **Alarm System**: Wake-up alarms with personalized briefings
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Theme**: Eye-friendly interface design

## Technology Stack

- **Backend**: Python Flask
- **Frontend**: HTML, CSS, JavaScript
- **AI Models**: Multiple LLMs via OpenRouter
- **APIs**: Weather, Search, and TTS services

## Getting Started

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**:
   - Set up your `.env` file with API keys

3. **Start the Server**:
   ```bash
   python app.py
   ```

4. **Access the Web Application**:
   - Open your browser and go to `http://localhost:5000`

## File Structure

```
├── app.py                    # Flask server
├── static/                   # CSS, JavaScript, images
│   ├── css/
│   │   └── styles.css       # Styling
│   └── js/
│       └── script.js        # Client-side logic
└── templates/                # HTML templates
    └── index.html           # Main page
```

## Usage

- Type your message in the chat input
- Use the "Search" toggle for current information
- Use the "Deep thinking" toggle for complex reasoning
- Check the weather in the top-right corner
- Use the sidebar for navigation and settings
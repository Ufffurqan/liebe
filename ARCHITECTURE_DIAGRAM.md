# Liebe AI Assistant - Architecture Diagram

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    LIEBE AI ASSISTANT                            │
│                  Multi-Platform Ecosystem                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   🌐 WEB APP         │         │   📱 MOBILE APP      │
│   (Flask Templates)  │         │   (React Native)     │
│                      │         │                      │
│  - HTML/CSS/JS       │         │  - TypeScript        │
│  - Full UI           │         │  - Expo Go           │
│  - Calendar/Notes    │         │  - Native Components │
│  - Weather Widget    │◄───────►│  - Chat Interface    │
│  - Alarm Management  │  Sync   │  - Session Mgmt      │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           │ HTTP/REST API                  │ HTTP/REST API
           │ (JSON + SSE Streaming)         │ (JSON + SSE Streaming)
           │                                │
           └────────────┬───────────────────┘
                        │
                        ▼
         ┌──────────────────────────┐
         │  🔧 FLASK BACKEND        │
         │  (app.py - 307 lines)    │
         │                          │
         │  API Endpoints:          │
         │  ├─ /api/chat           │
         │  ├─ /api/weather        │
         │  ├─ /api/notes          │
         │  ├─ /api/alarms         │
         │  ├─ /api/tts            │
         │  └─ /api/morning_briefing│
         └───────────┬──────────────┘
                     │
                     ▼
         ┌──────────────────────────┐
         │  🤖 ORCHESTRATOR         │
         │  (orchestrator.py)       │
         │                          │
         │  Features:               │
         │  ├─ Intent Analysis     │
         │  ├─ Multi-LLM Routing   │
         │  ├─ Context Gathering   │
         │  └─ Response Streaming  │
         └───────────┬──────────────┘
                     │
                     ├──────────────┬──────────────┬──────────────┐
                     ▼              ▼              ▼              ▼
         ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
         │ 💾 DATABASE  │ │ 🌍 EXTERNAL  │ │ 🎥 YOUTUBE   │ │ ☁️ WEATHER   │
         │ (SQLite)     │ │ APIs         │ │ MANAGER      │ │ API          │
         │              │ │              │ │              │ │              │
         │ - ChatMessage│ │ - DuckDuckGo │ │ - Video Sugg │ │ - OpenWeather│
         │ - DailyNote  │ │ - Web Search │ │ - Trending   │ │ - Forecasts  │
         │ - Alarm      │ │ - News API   │ │ - Tutorials  │ │ - Conditions │
         └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 🔄 Data Flow Examples

### Example 1: User Sends Message (Web or Mobile)

```
User Input → Frontend → POST /api/chat → Flask Backend
                                              ↓
                                       Orchestrator
                                              ↓
                                    Intent Analysis
                                              ↓
                              ┌───────────────┴───────────────┐
                              │                               │
                       Needs Search?                   Basic Chat?
                              │                               │
                              ▼                               ▼
                    DuckDuckGo API                    Gemini/Groq LLM
                              │                               │
                              └───────────────┬───────────────┘
                                              ▼
                                      Generate Response
                                              ↓
                                  Stream back via SSE
                                              ↓
                                      Display in Chat
                                              ↓
                                     Save to Database
```

---

### Example 2: Real-Time Sync Between Platforms

```
WEB APP                          DATABASE                      MOBILE APP
  │                                 │                              │
  │ Send message                    │                              │
  ├────────────────────────────────►│                              │
  │                                 │                              │
  │                                 │ Save ChatMessage             │
  │                                 │ to SQLite                    │
  │                                 │                              │
  │◄────────────────────────────────┤                              │
  │ Stream response                 │                              │
  │                                 │                              │
  │                                 │                              │ Fetch sessions
  │                                 ├─────────────────────────────►│
  │                                 │                              │
  │                                 │ Return chat history          │
  │                                 ├─────────────────────────────►│
  │                                 │                              │
  │                                 │                              │ Display messages
  │                                 │                              │
```

---

## 📊 Technology Stack Layers

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
├─────────────────────────┬───────────────────────────────┤
│ Web Interface           │ Mobile Interface              │
│ • HTML5/CSS3            │ • React Native                │
│ • JavaScript ES6+       │ • TypeScript                  │
│ • Responsive Design     │ • Expo SDK 54                 │
│ • Real-time Updates     │ • Native Components           │
└─────────────────────────┴───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    APPLICATION LAYER                     │
├─────────────────────────────────────────────────────────┤
│ Flask Web Framework (Python)                            │
│ • RESTful API Endpoints                                 │
│ • Server-Sent Events (SSE)                              │
│ • Request/Response Handling                             │
│ • CORS Management                                       │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    BUSINESS LOGIC LAYER                  │
├─────────────────────────────────────────────────────────┤
│ Liebe Orchestrator                                      │
│ • Intent Analysis Engine                                │
│ • Multi-LLM Router (Gemini, Groq, Ollama)              │
│ • Context Aggregator                                    │
│ • Knowledge Base Manager                                │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    DATA ACCESS LAYER                     │
├─────────────────────────────────────────────────────────┤
│ SQLAlchemy ORM                                          │
│ • Database Models (ChatMessage, DailyNote, Alarm)      │
│ • Query Optimization                                    │
│ • Transaction Management                                │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    DATA LAYER                            │
├─────────────────────────────────────────────────────────┤
│ SQLite Database (instance/liebe.db)                     │
│ • Persistent Storage                                    │
│ • Session Management                                    │
│ • Historical Data                                       │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    EXTERNAL SERVICES                     │
├──────────────┬──────────────┬──────────────┬────────────┤
│ Google Gemini│ Groq LLM     │ DuckDuckGo   │OpenWeather │
│ API          │ API          │ Search API   │ Map API    │
└──────────────┴──────────────┴──────────────┴────────────┘
```

---

## 🎯 Feature Comparison Matrix

| Feature | Web App | Mobile App | Shared Backend | Sync Status |
|---------|---------|------------|----------------|-------------|
| **AI Chat** | ✅ | ✅ | `/api/chat` | ✅ Real-time |
| **Chat History** | ✅ | ✅ | `/api/chat/history` | ✅ Real-time |
| **Session Mgmt** | ✅ | ✅ | `/api/chat/sessions` | ✅ Real-time |
| **Weather** | ✅ | ⏳ | `/api/weather` | ✅ Ready |
| **Notes** | ✅ | ⏳ | `/api/notes` | ✅ Ready |
| **Alarms** | ✅ | ⏳ | `/api/alarms` | ✅ Ready |
| **Morning Briefing** | ✅ | ❌ | `/api/morning_briefing` | ⏳ Pending |
| **Text-to-Speech** | ✅ | ❌ | `/api/tts` | ⏳ Pending |
| **YouTube Suggestions** | ✅ | ❌ | `/api/youtube/suggest` | ⏳ Pending |
| **Search Toggle** | ✅ | ⏳ | Parameter in `/api/chat` | ⏳ Pending |
| **Deep Thinking** | ✅ | ❌ | Parameter in `/api/chat` | ❌ Not implemented |

✅ = Fully Implemented & Working  
⏳ = API Ready, UI Pending  
❌ = Not Yet Implemented

---

## 🔐 Security Considerations

```
┌─────────────────────────────────────────┐
│ Current Security Measures               │
├─────────────────────────────────────────┤
│ ✅ CORS enabled for all origins         │
│ ✅ Environment variables (.env)         │
│ ✅ SQLite database file protection      │
│ ✅ Input sanitization in orchestrator   │
│ ✅ Error handling & logging             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Recommended Enhancements                │
├─────────────────────────────────────────┤
│ 🔒 API authentication (JWT tokens)      │
│ 🔒 Rate limiting per IP/session         │
│ 🔒 HTTPS/TLS encryption                 │
│ 🔒 Input validation on mobile app       │
│ 🔒 Database encryption at rest          │
│ 🔒 Secure WebSocket for real-time       │
└─────────────────────────────────────────┘
```

---

## 📈 Performance Metrics

### Current Architecture:
- **Response Time:** ~500ms - 2s (depending on LLM)
- **Concurrent Users:** Limited by single-server setup
- **Database Queries:** <10ms (SQLite local)
- **Streaming Latency:** ~100ms chunks

### Scalability Options:
1. **Horizontal Scaling:** Add more Flask instances behind Nginx
2. **Database Upgrade:** Migrate to PostgreSQL for multi-user support
3. **Caching Layer:** Redis for session management
4. **CDN:** Serve static assets from CloudFront/Cloudflare
5. **Load Balancer:** Distribute traffic across multiple servers

---

## 🎨 Design Philosophy

```
LIEBE DESIGN PRINCIPLES
│
├─ Minimalism
│  └─ Clean interfaces, no clutter
│
├─ Consistency
│  └─ Same colors, fonts, spacing across platforms
│
├─ Responsiveness
│  └─ Fast feedback, streaming responses
│
├─ Accessibility
│  └─ High contrast, readable fonts, intuitive navigation
│
└─ Privacy-First
   └─ Local processing, minimal data collection
```

---

This architecture ensures your Liebe AI assistant works seamlessly across web and mobile platforms with full synchronization! 🚀

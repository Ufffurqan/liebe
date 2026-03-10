import os
import json
import glob
import time
import re
import requests
from ddgs import DDGS
from dotenv import load_dotenv
from google import genai
from groq import Groq
import ollama
from liebe.youtube_manager import youtube_manager

# Load environment variables early
load_dotenv()

class LiebeOrchestrator:
    def __init__(self):
        self.kb_cache = None
        self.kb_last_load = 0
        self._initialize_clients()

    def _initialize_clients(self, force=False):
        if hasattr(self, 'gemini_client') and self.gemini_client and not force:
            return
            
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        
        # Models
        self.model_gemini_id = os.getenv("MODEL_GEMINI", "gemini-1.5-flash")
        self.model_groq_id = os.getenv("MODEL_GROQ", "llama-3.3-70b-versatile")
        self.model_ollama_id = os.getenv("MODEL_OLLAMA", "llama3")
        self.model_r1_id = "deepseek-r1-distill-llama-70b" 

        # OpenClaw Settings
        self.openclaw_ip = os.getenv("OPENCLAW_IP")
        self.openclaw_token = os.getenv("OPENCLAW_TOKEN")
        self.openclaw_port = os.getenv("OPENCLAW_PORT", "9876")
        self.openclaw_url = f"http://{self.openclaw_ip}:{self.openclaw_port}" if self.openclaw_ip else None

        # Gemini (Using new google.genai Client)
        try:
            if self.gemini_key:
                self.gemini_client = genai.Client(api_key=self.gemini_key)
        except Exception: self.gemini_client = None

        # Groq
        try:
            if self.groq_key:
                self.groq_client = Groq(api_key=self.groq_key)
        except Exception: self.groq_client = None

        # Ollama
        try:
            self.ollama_client = ollama.Client(host=self.ollama_host)
        except Exception: self.ollama_client = None

    def get_knowledge_base(self):
        if self.kb_cache and time.time() - self.kb_last_load < 300: # Cache for 5 mins
            return self.kb_cache
        kb_content = ""
        for f_path in glob.glob("knowledge_base/*.txt"):
            try:
                with open(f_path, "r", encoding="utf-8") as f:
                    kb_content += f.read() + "\n"
            except Exception: pass
        self.kb_cache = kb_content
        self.kb_last_load = time.time()
        return kb_content
        
    def get_weather(self, query):
        import requests
        api_key = os.getenv("OPENWEATHER_API_KEY")
        if not api_key: return "WEATHER ERROR: Missing key."
        city = re.sub(r"weather|in|at|of|whats|the|today's|todays", "", query.lower()).strip("? .!,\"").strip().title() or "Mumbai"
        try:
            url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric"
            data = requests.get(url, timeout=3).json()
            if data.get("cod") != 200: return f"Weather data not found for {city}."
            temp = data["main"]["temp"]
            desc = data["weather"][0]["description"].capitalize()
            humidity = data["main"]["humidity"]
            wind = data["wind"]["speed"]
            return f"### Weather in {city}\n**Temperature:** {round(temp, 1)}°C\n**Conditions:** {desc}\n**Humidity:** {humidity}%\n**Wind Speed:** {wind} m/s"
        except Exception as e: return f"Weather error: {str(e)}"

    def search_web(self, query, search_type="text"):
        from ddgs import DDGS
        try:
            with DDGS() as ddgs:
                results = ddgs.news(query, max_results=3) if search_type == "news" else ddgs.text(query, max_results=3)
                if not results: return "No results."
                return "### Search Results\n" + "\n".join([f"- {r.get('title')}: {r.get('body')[:100]}..." for r in results])
        except Exception: return "Search failed."

    def get_youtube_recommendations(self, query="trending"):
        try:
            return youtube_manager.get_video_suggestions(query)
        except: return {"error": "Could not fetch videos"}

    def refine_search_query(self, user_message):
        msg = user_message.lower()
        fillers = ["please", "tell me", "what is", "search for", "find", "hey liebe", "liebe", "can you", "show me"]
        query = msg
        for word in fillers:
            query = query.replace(word, "")
        return query.strip("? .!,\"").strip()

    def analyze_intent(self, user_message):
        msg = user_message.lower().strip()
        
        # 1. Fast Path: Basic Greetings & Short Messages
        greetings = ["hi", "hello", "hey", "hola", "yo", "hi liebe", "hello liebe", "hey liebe", "yo liebe"]
        words = msg.split()
        
        # Determine if it's a basic conversation without any need for tools
        conversational_starters = ["how are you", "what's up", "good morning", "good evening", "good night", "thanks", "thank you", "nice to meet you"]
        is_basic = any(g == msg for g in greetings) or any(s in msg for s in conversational_starters) or (len(words) <= 3 and not any(k in msg for k in ["weather", "time", "alarm", "news", "note", "search", "find", "tutorial", "video", "save", "remind"]))
        is_greeting = is_basic and (msg in greetings or any(g in msg for g in ["hi ", "hello ", "hey ", "yo "]))
        
        search_keywords = [
            "search", "find", "latest", "price", "stock", "what is the status", 
            "details about", "cource", "course", "syllabus", "news in", "events", 
            "scenario", "update on"
        ]
        news_keywords = ["news", "headline", "breaking"]
        weather_keywords = ["weather", "temperature", "forecast", "climate"]
        video_keywords = ["tutorial", "learn", "how to", "course video", "suggest youtube", "watch video"]
        
        security_keywords = ["nmap", "scan", "vulnerability", "hack", "penetration", "exploit", "kali", "security tools", "ports"]
        
        info = {
            "needs_search": any(k in msg for k in search_keywords) and not is_basic,
            "is_news_search": any(k in msg for k in news_keywords),
            "is_weather": any(k in msg for k in weather_keywords),
            "is_video": any(k in msg for k in video_keywords),
            "is_alarm": any(k in msg for k in ["alarm", "wake me up", "timer"]),
            "is_note": any(k in msg for k in ["remind", "save", "note", "task", "remember", "write", "assignment", "deadline", "todo", "project", "meeting", "appointment", "submit"]),
            "is_security": any(k in msg for k in security_keywords),
            "is_basic": is_basic,
            "is_greeting": is_greeting,
            "selected_service": "gemini" # Default
        }

        # Stricter search override (only if not basic conversation)
        # Route logic
        if info["is_security"]:
            info["selected_service"] = "openclaw"
        elif "local" in msg or "ollama" in msg:
            info["selected_service"] = "ollama"
        elif any(k in msg for k in ["think", "reason", "math", "logic", "complex", "why"]):
            info["selected_service"] = "groq_r1"
        elif any(k in msg for k in ["code", "program", "python"]):
            info["selected_service"] = "groq"
            
        return info

    def _call_openclaw(self, prompt):
        if not self.openclaw_url or not self.openclaw_token:
            return "### ❌ OpenClaw Connection Error\nOpenClaw details are not configured in your `.env` file."
            
        try:
            # OpenClaw ACP endpoint for prompt execution
            headers = {"Authorization": f"Bearer {self.openclaw_token}", "Content-Type": "application/json"}
            payload = {"prompt": prompt}
            
            response = requests.post(f"{self.openclaw_url}/api/acp/v1/execute", json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                return data.get('result', "No result returned from Kali.")
            else:
                return f"### ❌ Kali OpenClaw Error ({response.status_code})\n{response.text}"
        except Exception as e:
            return f"### ❌ Connection Failed\nCould not reach Kali Linux at {self.openclaw_ip}. Make sure the VM is running and OpenClaw is active."

    def chat_stream(self, user_message, history=None, force_search=False, force_deep_thinking=False):
        yield json.dumps({"status": "progress", "message": "🧿 Analyzing intent..."})
        intent = self.analyze_intent(user_message)
        if force_search: intent["needs_search"] = True
        if force_deep_thinking: intent["selected_service"] = "groq_r1"

        contexts = []
        if intent["is_weather"]:
            yield json.dumps({"status": "progress", "message": "🌦️ Fetching weather..."})
            contexts.append(self.get_weather(user_message))
        
        if intent["needs_search"]:
            yield json.dumps({"status": "progress", "message": "🌐 Searching..."})
            contexts.append(self.search_web(user_message))

        if intent["selected_service"] == "openclaw":
            yield json.dumps({"status": "progress", "message": "🛡️ Querying Kali OpenClaw..."})
            res = self._call_openclaw(user_message)
            yield json.dumps({"status": "done", "full_text": res, "service": "openclaw"})
            return

        if intent["is_video"]:
            yield json.dumps({"status": "progress", "message": "🎥 Searching YouTube..."})
            yt = self.get_youtube_recommendations(user_message)
            if "videos" in yt:
                contexts.append("### VIDEOS\n" + "\n".join([f"- {v['title']}: {v['url']}" for v in yt["videos"]]))

        kb = self.get_knowledge_base()
        now = time.strftime('%a %b %d %Y')
        curr_time = time.strftime('%H:%M')
        
        sys_msg = f"You are Liebe, a personal assistant. Current Date: {now}, Time: {curr_time}. Be brief."
        if kb: sys_msg += f"\nKnowledge: {kb}"
        if contexts: sys_msg += f"\nContext: {' '.join(contexts)}"
        if intent["is_alarm"]: sys_msg += "\nEnd with [ALARM:HH:MM] or [TIMER:MM] if requested."
        if intent["is_note"]: sys_msg += f"\nTo save a note for a specific date (calculate tomorrow/next week if needed based on {now}), end with: [NOTE:Description|DateString]."

        yield json.dumps({"status": "progress", "message": "🧠 Thinking..."})
        
        service = intent["selected_service"]
        try:
            full_prompt = f"SYSTEM: {sys_msg}\n"
            if history:
                for h in history[-3:]: full_prompt += f"{h['role'].upper()}: {h['content']}\n"
            full_prompt += f"USER: {user_message}"

            # Fast Stream (Gemini)
            if service == "gemini" and self.gemini_client:
                full_text = ""
                for chunk in self.gemini_client.models.generate_content_stream(model=self.model_gemini_id, contents=full_prompt):
                    if chunk.text:
                        full_text += chunk.text
                        yield json.dumps({"status": "chunk", "text": chunk.text, "service": "gemini"})
                yield json.dumps({"status": "done", "full_text": full_text, "service": "gemini"})
                return

            # Groq (Reasoning or Default)
            if ("groq" in service or force_deep_thinking) and self.groq_client:
                model = self.model_r1_id if service == "groq_r1" else self.model_groq_id
                response = self.groq_client.chat.completions.create(
                    model=model,
                    messages=[{"role": "system", "content": sys_msg}, {"role": "user", "content": user_message}],
                    stream=True
                )
                full_text = ""
                for chunk in response:
                    content = chunk.choices[0].delta.content or ""
                    if content:
                        full_text += content
                        yield json.dumps({"status": "chunk", "text": content, "service": "groq"})
                yield json.dumps({"status": "done", "full_text": full_text, "service": "groq"})
                return

            yield json.dumps({"status": "error", "message": "AI Service not available."})
        except Exception as e:
            yield json.dumps({"status": "error", "message": f"Generation failed: {str(e)}"})

    def _call_gemini(self, system_prompt, messages):
        full_prompt = f"SYSTEM: {system_prompt}\n\n"
        for m in messages[:-1]:
            full_prompt += f"{m['role'].upper()}: {m['content']}\n"
        full_prompt += f"USER: {messages[-1]['content']}"
        response = self.gemini_client.models.generate_content(model=self.model_gemini_id, contents=full_prompt)
        return response.text

    def _call_groq(self, model, system_prompt, messages, max_tokens=None):
        groq_messages = [{"role": "system", "content": system_prompt}] + messages
        params = {"model": model, "messages": groq_messages}
        if max_tokens:
            params["max_tokens"] = max_tokens
        completion = self.groq_client.chat.completions.create(**params)
        return completion.choices[0].message.content

    def _call_ollama(self, system_prompt, messages, max_tokens=None):
        ollama_messages = [{"role": "system", "content": system_prompt}] + messages
        options = {}
        if max_tokens:
            options["num_predict"] = max_tokens
        response = self.ollama_client.chat(model=self.model_ollama_id, messages=ollama_messages, options=options)
        return response['message']['content']

    def chat(self, user_message, history=None, force_search=False, force_deep_thinking=False, bypass_intent=False):
        # Helper for non-streaming calls (like briefings)
        self._initialize_clients()
        
        contexts = []
        if not bypass_intent:
            intent = self.analyze_intent(user_message)
            if intent["is_weather"]: contexts.append(self.get_weather(user_message))
            if intent["needs_search"]: contexts.append(self.search_web(user_message))
        
        kb = self.get_knowledge_base()
        now_date = time.strftime('%a %b %d %Y')
        curr_time = time.strftime('%H:%M')
        sys_msg = f"You are Liebe. Current Date: {now_date}, Time: {curr_time}. brief."
        if kb: sys_msg += f"\nLocal Knowledge: {kb}"
        if contexts: sys_msg += f"\nOnline Context: {' '.join(contexts)}"

        prompt = f"SYSTEM: {sys_msg}\n"
        if history:
            for h in history[-3:]: prompt += f"{h['role'].upper()}: {h['content']}\n"
        prompt += f"USER: {user_message}"

        try:
            response = self.gemini_client.models.generate_content(model=self.model_gemini_id, contents=prompt)
            return response.text, "gemini"
        except Exception as e:
            return f"Error: {str(e)}", "none"

orchestrator = LiebeOrchestrator()

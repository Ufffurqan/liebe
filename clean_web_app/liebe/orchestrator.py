import os
import json
import glob
import requests
import time
import re
from ddgs import DDGS
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv
from liebe.youtube_manager import youtube_manager

# AI Clients
import google.generativeai as genai
from groq import Groq
import ollama

load_dotenv()

class LiebeOrchestrator:
    def __init__(self):
        self._initialize_clients()

    def _initialize_clients(self, force=False):
        """Initializes AI clients. Only re-runs if forced or keys are missing."""
        if hasattr(self, 'gemini_client') and self.gemini_client and not force:
            return
            
        load_dotenv(override=True)
        
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        
        # Models
        self.model_gemini_id = os.getenv("MODEL_GEMINI", "gemini-3-flash-preview")
        self.model_groq_id = os.getenv("MODEL_GROQ", "llama-3.3-70b-versatile")
        self.model_ollama_id = os.getenv("MODEL_OLLAMA", "llama3")
        self.model_r1_id = "deepseek-r1-distill-llama-70b" 
        
        # Initialize Gemini
        try:
            if self.gemini_key and not self.gemini_key.startswith("your_"):
                genai.configure(api_key=self.gemini_key)
                self.gemini_client = genai.GenerativeModel(self.model_gemini_id)
                print(f"DEBUG: Gemini Initialized with model: {self.model_gemini_id}")
            else:
                self.gemini_client = None
                print("DEBUG: Gemini Key missing or placeholder.")
        except Exception as e:
            self.gemini_client = None
            print(f"DEBUG: Gemini Init Failed: {e}")

        # Initialize Groq
        try:
            if self.groq_key and not self.groq_key.startswith("your_"):
                self.groq_client = Groq(api_key=self.groq_key)
                print(f"DEBUG: Groq Initialized.")
            else:
                self.groq_client = None
                print("DEBUG: Groq Key missing.")
        except Exception as e:
            self.groq_client = None
            print(f"DEBUG: Groq Init Failed: {e}")

        # Initialize Ollama
        try:
            self.ollama_client = ollama.Client(host=self.ollama_host)
        except Exception as e:
            self.ollama_client = None
            print(f"DEBUG: Ollama client could not be created: {e}")

    def is_api_valid(self):
        """Checks if at least one AI service is configured."""
        if not hasattr(self, 'gemini_client') or self.gemini_client is None:
            self._initialize_clients()
        return self.gemini_client is not None or (hasattr(self, 'groq_client') and self.groq_client is not None) or (hasattr(self, 'ollama_client') and self.ollama_client is not None)

    def get_knowledge_base(self):
        kb_content = ""
        files = glob.glob("knowledge_base/*.txt")
        for f_path in files:
            try:
                with open(f_path, "r", encoding="utf-8") as f:
                    kb_content += f.read() + "\n"
            except Exception:
                pass
        return kb_content
        
    def get_weather(self, query):
        load_dotenv(override=True)
        api_key = os.getenv("OPENWEATHER_API_KEY")
        if not api_key or api_key == "your_openweather_key_here":
            return "WEATHER ERROR: API Key is missing."
        
        # Smarter city extraction: remove common phrases and focus on the remainder
        city_query = query.lower()
        remove_patterns = [
            r"weather\s+in\s+", r"weather\s+of\s+", r"weather\s+at\s+",
            r"whats\s+the\s+weather\s+in\s+", r"whats\s+the\s+weather\s+",
            r"what's\s+the\s+weather\s+", r"what\s+is\s+the\s+weather\s+",
            r"how is the weather in ", r"today's weather", r"todays weather", r"weather", 
            r"temperature\s+in\s+", r"forecast\s+in\s+", r"whats\s+", r"today's", r"todays", r"in\s+", r"of\s+"
        ]
        
        for pattern in remove_patterns:
            city_query = re.sub(pattern, "", city_query)
            
        city = city_query.strip("? .!,\"").strip().title()
        
        # If still empty, try to get from IP or default
        if not city:
            city = "Mumbai" # Default for your area or user preference
        
        try:
            url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric"
            response = requests.get(url, timeout=5)
            data = response.json()
            if data.get("cod") != 200:
                return f"WEATHER ERROR: Could not find data for City: '{city}'."
            
            temp = data["main"]["temp"]
            desc = data["weather"][0]["description"]
            return f"### REAL-TIME WEATHER DATA FOR {city.upper()}\n- **Temperature:** {round(temp, 1)}°C\n- **Conditions:** {desc.capitalize()}\n- **Humidity:** {data['main']['humidity']}%\n- **Wind Speed:** {data['wind']['speed']} m/s"
        except Exception as e:
            return f"WEATHER ERROR: {str(e)}"

    def search_web(self, query, search_type="text"):
        try:
            with DDGS() as ddgs:
                results = ddgs.news(query, max_results=8) if search_type == "news" else ddgs.text(query, max_results=8)
                if results:
                    formatted = []
                    for r in results:
                        if search_type == "news":
                            formatted.append(f"[{r.get('source', 'News')} - {r.get('date', 'Today')}] {r['title']}\nSnippet: {r['body']}\nLink: {r['url']}")
                        else:
                            formatted.append(f"Title: {r['title']}\nSnippet: {r['body']}\nLink: {r['href']}")
                    header = "### LATEST NEWS" if search_type == "news" else "### WEB SEARCH RESULTS"
                    return f"{header}\n\n" + "\n\n---\n\n".join(formatted)
            return f"No results found for: {query}"
        except Exception as e:
            return f"Search error: {str(e)}"

    def get_youtube_recommendations(self, query="trending"):
        return youtube_manager.get_video_suggestions(query)

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
        
        info = {
            "needs_search": any(k in msg for k in search_keywords) and not is_basic,
            "is_news_search": any(k in msg for k in news_keywords),
            "is_weather": any(k in msg for k in weather_keywords),
            "is_video": any(k in msg for k in video_keywords),
            "is_alarm": any(k in msg for k in ["alarm", "wake me up", "timer"]),
            "is_note": any(k in msg for k in ["remind", "save", "note", "task", "remember", "write", "assignment", "deadline", "todo", "project", "meeting", "appointment", "submit"]),
            "is_basic": is_basic,
            "is_greeting": is_greeting,
            "selected_service": "gemini" # Default
        }

        # Stricter search override (only if not basic conversation)
        # Route logic
        if "local" in msg or "ollama" in msg:
            info["selected_service"] = "ollama"
        elif any(k in msg for k in ["think", "reason", "math", "logic", "complex", "why"]):
            info["selected_service"] = "groq_r1"
        elif any(k in msg for k in ["code", "program", "python"]):
            info["selected_service"] = "groq"
            
        return info

    def chat(self, user_message, history=None, force_search=False, force_deep_thinking=False, bypass_intent=False):
        if not self.is_api_valid():
            return "AI Configuration Missing. Please setup your `.env` file.", "none"

        intent = {"selected_service": "gemini", "needs_search": force_search}
        if not bypass_intent:
            intent = self.analyze_intent(user_message)
            if force_search: intent["needs_search"] = True
            if force_deep_thinking: intent["selected_service"] = "groq_r1"

        search_contexts = []
        if not bypass_intent:
            if intent["is_weather"]:
                search_contexts.append(self.get_weather(user_message))
            if intent["needs_search"] and not intent["is_weather"]:
                search_contexts.append(self.search_web(self.refine_search_query(user_message), "news" if intent.get("is_news_search") else "text"))

        context = "\n\n".join(search_contexts)
        kb_data = self.get_knowledge_base()
        
        system_prompt = f"You are Liebe, a personal AI assistant. Local Time: {time.strftime('%A, %b %d, %Y %H:%M:%S')}. "
        if kb_data: system_prompt += f"\nLocal Knowledge:\n{kb_data}"
        if context: system_prompt += f"\nOnline Context:\n{context}"
        system_prompt += "\n\nInstructions:\n- Professional tone."

        messages = []
        if history:
            for h in history[-10:]:
                messages.append({"role": "user" if h["role"] == "user" else "assistant", "content": h["content"]})
        messages.append({"role": "user", "content": user_message})

        service = intent["selected_service"]
        try:
            if service == "gemini" and self.gemini_client:
                reply = self._call_gemini(system_prompt, messages)
            elif "groq" in service and self.groq_client:
                model = self.model_r1_id if service == "groq_r1" else self.model_groq_id
                reply = self._call_groq(model, system_prompt, messages)
            elif service == "ollama" and self.ollama_client:
                reply = self._call_ollama(system_prompt, messages)
            else:
                reply = "No AI service available."
            return reply, service
        except Exception as e:
            return f"Error: {str(e)}", "none"

    def chat_stream(self, user_message, history=None, force_search=False, force_deep_thinking=False):
        """A generator that yields progress updates and the final streaming response chunks."""
        if not self.is_api_valid():
            yield json.dumps({"status": "error", "message": "AI Configuration Missing. Setup `.env`."})
            return

        yield json.dumps({"status": "progress", "message": "🧿 Analyzing intent..."})
        
        intent = self.analyze_intent(user_message)
        print(f"DEBUG: intent={intent}")
        if force_search: intent["needs_search"] = True
        if force_deep_thinking: intent["selected_service"] = "groq_r1"

        # --- SUPER FAST TRACK (Instant response for greetings/basics) ---
        if intent.get("is_greeting") and not intent["needs_search"]:
            yield json.dumps({"status": "progress", "message": "🧠 thinking..."})
            try:
                # Use a leaner system prompt for speed
                sys_msg = "You are Liebe, a personal AI assistant. Be brief, friendly, and helpful."
                response = self.gemini_client.generate_content(f"SYSTEM: {sys_msg}\nUSER: {user_message}", stream=True)
                full_reply = ""
                for chunk in response:
                    if chunk.text:
                        full_reply += chunk.text
                        yield json.dumps({"status": "chunk", "text": chunk.text, "service": "gemini"})
                yield json.dumps({"status": "done", "full_text": full_reply, "service": "gemini"})
                return # Terminate stream here
            except Exception as e:
                print(f"DEBUG: Fast track failed, falling back: {e}")

        search_contexts = []
        if intent["is_weather"]:
            yield json.dumps({"status": "progress", "message": "🌦️ liebe is comunicating with openweather..."})
            search_contexts.append(self.get_weather(user_message))
        
        if intent.get("is_video"):
            yield json.dumps({"status": "progress", "message": "🎥 liebe is finding best videos for you..."})
            yt = self.get_youtube_recommendations(self.refine_search_query(user_message))
            if "videos" in yt:
                top_videos = yt["videos"][:2]
                formatted = [f"Title: {v['title']}\nChannel: {v['channel']}\nLink: {v['url']}" for v in top_videos]
                search_contexts.append("### RECOMMENDED YOUTUBE VIDEOS\n\n" + "\n\n---\n\n".join(formatted))
        
        if intent["needs_search"] and not intent["is_weather"]:
            yield json.dumps({"status": "progress", "message": "🌐 Gathering real-time web data..."})
            search_contexts.append(self.search_web(self.refine_search_query(user_message), "news" if intent["is_news_search"] else "text"))

        context = "\n\n".join(search_contexts)
        kb_data = self.get_knowledge_base()
        
        system_prompt = f"You are Liebe, a personal AI assistant. Local Time: {time.strftime('%A, %b %d, %Y %H:%M:%S')}. "
        if kb_data: system_prompt += f"\nLocal Knowledge:\n{kb_data}"
        if context: system_prompt += f"\nOnline Context:\n{context}"
        system_prompt += "\n\nInstructions:\n- Professional tone.\n- Keep track of user commitments and deadlines."
        if intent["is_alarm"]: system_prompt += "\n- Include [ALARM:HH:MM] or [TIMER:MM] at the end if setting one."
        if intent["is_note"] or any(k in user_message.lower() for k in ["submit", "assignment", "deadline", "remind"]): 
            system_prompt += f"\n- CRITICAL: You must save this info. End your response with exactly: [NOTE:Description|{time.strftime('%a %b %d %Y')}]."

        messages = []
        if history:
            for h in history[-10:]:
                messages.append({"role": "user" if h["role"] == "user" else "assistant", "content": h["content"]})
        messages.append({"role": "user", "content": user_message})

        # Ensemble Perspectives (Only for non-basic queries)
        other_perspectives = []
        
        if not intent.get("is_basic", False):
            # Parallel execution with a dictionary mapping futures to labels
            future_to_label = {}
            with ThreadPoolExecutor(max_workers=2) as executor:
                # 1. Get Groq Reasoning (if available)
                if self.groq_client:
                    yield json.dumps({"status": "progress", "message": "🧠 thinking..."})
                    f_groq = executor.submit(self._call_groq, self.model_groq_id, system_prompt, messages, max_tokens=150)
                    future_to_label[f_groq] = "GROQ ANALYSIS"

                # 2. Get Ollama Local Perspective (if available) - Be extra brief to save time
                if self.ollama_client:
                    yield json.dumps({"status": "progress", "message": "🏠 liebe thinking privately..."})
                    f_ollama = executor.submit(self._call_ollama, system_prompt + " (CRITICAL: Be extremely brief, max 2 sentences.)", messages, max_tokens=100)
                    future_to_label[f_ollama] = "OLLAMA PERSPECTIVE"

                # Collect results as they finish (or wait for all)
                from concurrent.futures import as_completed
                for future in as_completed(future_to_label):
                    label = future_to_label[future]
                    try:
                        resp = future.result(timeout=12) # Slightly longer timeout
                        other_perspectives.append(f"{label}: {resp}")
                    except Exception as e:
                        print(f"Parallel model error ({label}): {e}")

        # Final Synthesis (The Master "Liebe")
        yield json.dumps({"status": "progress", "message": "🧠 thinking..."})
        
        try:
            full_reply = ""
            
            # Decision Matrix for Synthesis
            if other_perspectives:
                ensemble_prompt = system_prompt + "\n\n### MULTI-MODEL ENSEMBLE MODE\n"
                ensemble_prompt += "You are now acting as the lead 'Liebe' synthesizer. You have been provided with perspectives from other AI models (Groq and Ollama) and tool data (Weather/YouTube).\n"
                ensemble_prompt += "Your goal is to generate the BEST 100% final answer by:\n"
                ensemble_prompt += "1. Analyzing and merging the AI perspectives (80% weight).\n"
                ensemble_prompt += "2. Incorporating tool data (10% weight).\n"
                ensemble_prompt += "3. Using your own core 'Liebe' logic to polish the final message (10% weight).\n\n"
                ensemble_prompt += "PERSPECTIVES GATHERED:\n" + "\n".join(other_perspectives)
            else:
                ensemble_prompt = system_prompt # Fast route

            # Try Gemini First
            if self.gemini_client:
                try:
                    prompt_parts = [f"SYSTEM: {ensemble_prompt}"]
                    for m in messages:
                        prompt_parts.append(f"{m['role'].upper()}: {m['content']}")
                    
                    response = self.gemini_client.generate_content("\n".join(prompt_parts), stream=True)
                    for chunk in response:
                        if chunk.text:
                            full_reply += chunk.text
                            yield json.dumps({"status": "chunk", "text": chunk.text, "service": "gemini"})
                    yield json.dumps({"status": "done", "full_text": full_reply, "service": "gemini"})
                    return
                except Exception as e:
                    print(f"DEBUG: Gemini Synthesis Failed: {e}. Falling back to Groq.")

            # Fallback to Groq if Gemini fails or is missing
            if self.groq_client:
                try:
                    groq_messages = [{"role": "system", "content": ensemble_prompt}] + messages
                    response = self.groq_client.chat.completions.create(
                        model=self.model_groq_id,
                        messages=groq_messages,
                        stream=True
                    )
                    for chunk in response:
                        if chunk.choices[0].delta.content:
                            content = chunk.choices[0].delta.content
                            full_reply += content
                            yield json.dumps({"status": "chunk", "text": content, "service": "groq"})
                    yield json.dumps({"status": "done", "full_text": full_reply, "service": "groq"})
                    return
                except Exception as e:
                    print(f"DEBUG: Groq Synthesis Failed: {e}")

            # If all fail
            yield json.dumps({"status": "error", "message": "All AI synthesizers failed. Please check your internet or API keys."})

        except Exception as e:
            yield json.dumps({"status": "error", "message": f"Generation Error: {str(e)}"})

    def _call_gemini(self, system_prompt, messages):
        full_prompt = f"SYSTEM: {system_prompt}\n\n"
        for m in messages[:-1]:
            full_prompt += f"{m['role'].upper()}: {m['content']}\n"
        full_prompt += f"USER: {messages[-1]['content']}"
        response = self.gemini_client.generate_content(full_prompt)
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

orchestrator = LiebeOrchestrator()

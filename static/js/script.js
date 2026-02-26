document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.querySelector('.input-field');
    const sendBtn = document.querySelector('.send-btn');
    const container = document.querySelector('.input-container');

    // Clock Logic
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateString = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

        document.getElementById('clock').textContent = timeString;
        document.getElementById('date').textContent = dateString;
    }
    setInterval(updateClock, 1000);
    updateClock(); // Initial call

    // Weekly Calendar Functionality
    const clockWidget = document.getElementById('clockWidget');
    const notesPanel = document.getElementById('notesPanel');
    const prevWeekBtn = document.getElementById('prevWeek');
    const nextWeekBtn = document.getElementById('nextWeek');
    const weekTitle = document.getElementById('weekTitle');
    const weekDays = document.getElementById('weekDays');
    const selectedDateDisplay = document.getElementById('selectedDateDisplay');
    const dateNotesList = document.getElementById('dateNotesList');
    const addDateNoteSection = document.getElementById('addDateNoteSection');
    const dateNoteInput = document.getElementById('dateNoteInput');
    const addDateNoteBtn = document.getElementById('addDateNoteBtn');

    // Data state
    let notes = {};
    let alarms = [];
    let currentWeekStart = getWeekStart(new Date());
    let selectedDate = new Date();
    selectedDate.setHours(0, 0, 0, 0);
    let currentChatHistory = [];

    // --- API SYNC ---
    async function syncData() {
        try {
            const [notesRes, alarmsRes] = await Promise.all([
                fetch('/api/notes'),
                fetch('/api/alarms')
            ]);
            const notesData = await notesRes.json();
            const alarmsData = await alarmsRes.json();

            // Transform notes list into date-keyed object
            notes = {};
            notesData.forEach(n => {
                if (!notes[n.date_str]) notes[n.date_str] = [];
                notes[n.date_str].push(n);
            });

            alarms = alarmsData;

            updateAlarmsUI();
            renderWeeklyCalendar();
            renderDateNotes();
        } catch (e) {
            console.error("Sync failed", e);
        }
    }

    // Helper function to get start of week (Sunday)
    function getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    // Helper function to get end of week (Saturday)
    function getWeekEnd(weekStart) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + 6);
        d.setHours(23, 59, 59, 999);
        return d;
    }

    // Click on clock to open calendar
    clockWidget.addEventListener('click', () => {
        notesPanel.classList.add('active');
        renderWeeklyCalendar();
        updateSelectedDateDisplay();
    });

    // Weather Widget Click
    const topWeather = document.getElementById('topWeather');
    const weatherModal = document.getElementById('weatherDetailsModal');
    const closeWeatherModal = document.getElementById('closeWeatherModal');

    topWeather.style.cursor = 'pointer';
    topWeather.addEventListener('click', () => {
        weatherModal.style.display = 'block';
    });

    closeWeatherModal.addEventListener('click', () => {
        weatherModal.style.display = 'none';
    });

    // Close panel when clicking on chat area
    const mainContent = document.querySelector('.main-content');
    mainContent.addEventListener('click', () => {
        if (notesPanel.classList.contains('active')) {
            notesPanel.classList.remove('active');
        }
    });

    // Week navigation
    prevWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeeklyCalendar();
    });

    nextWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeeklyCalendar();
    });

    // Render weekly calendar
    function renderWeeklyCalendar() {
        const weekStart = new Date(currentWeekStart);
        const weekEnd = getWeekEnd(weekStart);
        const today = new Date();

        // Update week title
        const options = { month: 'short', day: 'numeric' };
        weekTitle.textContent = `Week of ${weekStart.toLocaleDateString('en-US', options)} - ${weekEnd.toLocaleDateString('en-US', options)}, ${weekStart.getFullYear()}`;

        // Clear week days
        weekDays.innerHTML = '';

        // Add days of week
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + i);
            const dayStr = dayDate.toDateString();

            const dayElement = document.createElement('div');
            dayElement.className = 'week-day';

            // Check if today
            if (dayDate.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }

            // Check if selected
            if (selectedDate && dayDate.toDateString() === selectedDate.toDateString()) {
                dayElement.classList.add('selected');
            }

            // Check if has notes
            if (notes[dayStr] && notes[dayStr].length > 0) {
                dayElement.classList.add('has-notes');
            }

            dayElement.innerHTML = `
                <div class="week-day-name">${dayNames[i]}</div>
                <div class="week-day-number">${dayDate.getDate()}</div>
            `;

            // Add click event
            dayElement.addEventListener('click', () => {
                const newDate = new Date(dayDate); // Clone to prevent mutation
                newDate.setHours(0, 0, 0, 0);
                selectDate(newDate);
            });

            weekDays.appendChild(dayElement);
        }
    }

    // Select a date
    function selectDate(date) {
        selectedDate = date;
        renderWeeklyCalendar(); // Re-render to show selection
        updateSelectedDateDisplay();
        renderDateNotes();
    }

    // Update selected date display
    function updateSelectedDateDisplay() {
        if (selectedDate) {
            selectedDateDisplay.textContent = selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            addDateNoteSection.style.display = 'block';
        } else {
            selectedDateDisplay.textContent = 'Select a date';
            addDateNoteSection.style.display = 'none';
        }
    }

    // Render notes for selected date
    function renderDateNotes() {
        if (!selectedDate) {
            dateNotesList.innerHTML = '<div class="no-date-selected">Click on a date above to view or add notes</div>';
            return;
        }

        const dateStr = selectedDate.toDateString();
        const dateNotes = notes[dateStr] || [];

        if (dateNotes.length === 0) {
            dateNotesList.innerHTML = '<div class="no-date-selected">No notes for this date. Add your first note!</div>';
            return;
        }

        dateNotesList.innerHTML = '';
        dateNotes.forEach((note, index) => {
            const noteElement = document.createElement('div');
            noteElement.className = 'date-note-item';
            noteElement.innerHTML = `
                <button class="date-note-delete" data-date="${dateStr}" data-index="${index}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
                <div class="date-note-content" style="${note.type === 'briefing' ? 'color: var(--text-primary); border-left: 2px solid var(--accent-color); padding-left: 12px; background: rgba(77, 107, 254, 0.05); border-radius: 4px; padding: 10px;' : ''}">
                    ${note.type === 'briefing' ? '<div style="color: var(--accent-color); font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 5px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v1M12 21v1M4.22 4.22l.7.7M18.36 18.36l.7.7M1 12h1M22 12h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7"/></svg> Morning Briefing Report</div>' : ''}
                    <div style="${note.type === 'briefing' ? 'font-size: 13px; line-height: 1.5; white-space: pre-wrap;' : ''}">${note.content}</div>
                </div>
                <div class="date-note-time">${note.time}</div>
            `;

            // Add delete event listener
            const deleteBtn = noteElement.querySelector('.date-note-delete');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteDateNote(note.id);
            });

            dateNotesList.appendChild(noteElement);
        });
    }

    // Add note for selected date
    async function addDateNote(customContent = null, customDate = null, type = 'regular') {
        const content = customContent || dateNoteInput.value.trim();
        if (!content) return;

        const dateStr = customDate || selectedDate.toDateString();

        try {
            await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date_str: dateStr,
                    content: content,
                    type: type
                })
            });
            dateNoteInput.value = '';
            syncData();
        } catch (e) {
            console.error("Add note failed", e);
        }
    }

    // Delete note
    async function deleteDateNote(id) {
        try {
            await fetch(`/api/notes/${id}`, { method: 'DELETE' });
            syncData();
        } catch (e) {
            console.error("Delete note failed", e);
        }
    }

    // Add note button click
    addDateNoteBtn.addEventListener('click', addDateNote);

    // Add note on Enter (without Shift)
    dateNoteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addDateNote();
        }
    });

    // Initial render
    syncData();
    updateSelectedDateDisplay();
    textarea.addEventListener('input', function () {
        this.style.height = 'auto'; // Reset height
        this.style.height = (this.scrollHeight) + 'px';

        // Toggle send button active state
        if (this.value.trim().length > 0) {
            sendBtn.classList.add('active');
        } else {
            sendBtn.classList.remove('active');
        }
    });

    // Focus effects
    textarea.addEventListener('focus', () => {
        container.classList.add('focused');
    });

    textarea.addEventListener('blur', () => {
        container.classList.remove('focused');
    });

    // Sidebar Toggle
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    const appContainer = document.querySelector('.app-container');

    toggleSidebarBtn.addEventListener('click', () => {
        appContainer.classList.toggle('sidebar-collapsed');
    });

    // New Chat logic
    const newChatBtn = document.getElementById('newChatBtn');

    function startNewChat() {
        const chatContainer = document.getElementById('chatContainer');
        const logoArea = document.querySelector('.logo-area');
        const mainContent = document.querySelector('.main-content');

        chatContainer.innerHTML = '';
        chatContainer.classList.remove('active');

        logoArea.style.display = 'flex';
        logoArea.style.opacity = '1';

        mainContent.classList.remove('chat-active');
        textarea.style.height = 'auto';
        sendBtn.classList.remove('active');
        currentChatHistory = []; // Reset history for new chat

        // Clear history in DB
        fetch('/api/chat/history', { method: 'DELETE' })
            .catch(e => console.error("History clear error:", e));
    }
    newChatBtn.addEventListener('click', startNewChat);

    // Send Interaction
    async function sendMessage() {
        if (!sendBtn.classList.contains('active')) return;

        const message = textarea.value.trim();
        if (!message) return;

        // Check toggle states
        let useSearch = false;
        let useDeepThinking = false;

        // Show Chat and Hide Logo Area immediately
        const logoArea = document.querySelector('.logo-area');
        const mainContent = document.querySelector('.main-content');
        const chatContainer = document.getElementById('chatContainer');

        if (logoArea) {
            logoArea.style.opacity = '0';
            setTimeout(() => { logoArea.style.display = 'none'; }, 300);
        }
        mainContent.classList.add('chat-active');
        chatContainer.classList.add('active');

        // Add User Message
        addMessage(message, 'user');
        textarea.value = '';
        textarea.style.height = 'auto';
        sendBtn.classList.remove('active');
        sendBtn.innerHTML = '<div class="loader">...</div>';

        // 1. Create Progress Bubble (Thinking/Searching)
        const progressBubble = document.createElement('div');
        progressBubble.className = 'message-bubble ai progress-bubble';
        progressBubble.innerHTML = '<div class="typing-indicator"><span>.</span><span>.</span><span>.</span></div><span class="progress-msg">🧿 Analyzing intent...</span>';
        chatContainer.appendChild(progressBubble);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // 2. Create AI Message Bubble (Initially empty/hidden)
        let aiBubble = null;
        let aiFullText = "";

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    history: currentChatHistory,
                    search_enabled: useSearch,
                    deep_thinking_enabled: useDeepThinking
                })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let service = "none";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep partial line in buffer

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine.startsWith('data: ')) continue;

                    try {
                        const data = JSON.parse(trimmedLine.substring(6));

                        if (data.status === 'progress') {
                            progressBubble.querySelector('.progress-msg').innerText = data.message;
                        } else if (data.status === 'chunk') {
                            if (!aiBubble) {
                                progressBubble.style.display = 'none';
                                aiBubble = document.createElement('div');
                                aiBubble.className = 'message-bubble ai';
                                chatContainer.appendChild(aiBubble);
                            }
                            aiFullText += data.text;
                            aiBubble.innerHTML = formatMessageText(aiFullText);
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        } else if (data.status === 'done') {
                            service = data.service;
                            aiFullText = data.full_text;
                            if (aiBubble) renderFinalAiBubble(aiBubble, aiFullText, service);

                            currentChatHistory.push({ role: 'user', content: message });
                            currentChatHistory.push({ role: 'assistant', content: aiFullText });
                            if (currentChatHistory.length > 20) currentChatHistory = currentChatHistory.slice(-20);

                        } else if (data.status === 'error') {
                            progressBubble.innerHTML = `<span style="color: #ff6b6b;">❌ ${data.message}</span>`;
                        }
                    } catch (e) {
                        console.error("Single line parse error", e, trimmedLine);
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            if (progressBubble) progressBubble.innerHTML = 'Error communicating with server.';
        } finally {
            sendBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
            `;
        }
    }

    // --- ALARM & BRIEFING SYSTEM ---
    const alarmModal = document.getElementById('alarmModal');
    const briefingModal = document.getElementById('briefingModal');
    const alarmSound = document.getElementById('alarmSound');
    const activeAlarmsList = document.getElementById('activeAlarmsList');

    let currentBriefingScript = "";
    let isSpeaking = false;

    function updateAlarmsUI() {
        if (!activeAlarmsList) return;
        if (alarms.length === 0) {
            activeAlarmsList.innerHTML = '<div class="no-alarms" style="font-size: 13px; color: var(--text-secondary); font-style: italic;">No alarms set</div>';
            return;
        }
        activeAlarmsList.innerHTML = alarms.map((a) => `
            <div class="alarm-item">
                <span class="time">${a.type === 'timer' ? a.display : a.time_value}</span>
                <span class="delete" onclick="window.removeAlarm(${a.id})">✕</span>
            </div>
        `).join('');
    }

    async function prepareBriefing(alarm) {
        if (alarm.prepared || alarm.type === 'timer') return;

        console.log("Liebe is preparing morning briefing...");

        // Get today's notes
        const todayStr = new Date().toDateString();
        const notesForToday = notes[todayStr] || [];

        try {
            const response = await fetch('/api/morning_briefing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    city: 'Mumbai',
                    notes: notesForToday.map(n => n.content)
                })
            });
            const data = await response.json();
            currentBriefingScript = data.script;
            alarm.prepared = true;
            document.getElementById('briefingPrepStatus').style.display = 'block';
        } catch (e) {
            console.error("Briefing preparation failed", e);
        }
    }

    window.removeAlarm = async function (id) {
        try {
            await fetch(`/api/alarms/${id}`, { method: 'DELETE' });
            syncData();
        } catch (e) {
            console.error("Remove alarm failed", e);
        }
    };

    async function saveAlarms(type, timeValue, display = null) {
        try {
            await fetch('/api/alarms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: type,
                    time_value: String(timeValue),
                    display: display,
                    prepared: false
                })
            });
            syncData();
        } catch (e) {
            console.error("Save alarm failed", e);
        }
    }

    function showAlarmModal() {
        alarmModal.style.display = 'block';
        try {
            alarmSound.play();
        } catch (e) { console.error("Sound play blocked", e); }
    }

    function checkAlarms() {
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        alarms.forEach((alarm) => {
            let triggered = false;

            // Trigger 5 mins early for preparation
            if (alarm.type === 'alarm' && !alarm.prepared) {
                const alarmDate = new Date();
                const [ah, am] = alarm.time_value.split(':');
                alarmDate.setHours(parseInt(ah), parseInt(am), 0);

                const diffMs = alarmDate - now;
                const diffMins = diffMs / (1000 * 60);

                if (diffMins <= 5 && diffMins > 0) {
                    prepareBriefing(alarm);
                }
            }

            if (alarm.type === 'alarm') {
                if (currentTime === alarm.time_value) triggered = true;
            } else if (alarm.type === 'timer') {
                if (now.getTime() >= parseInt(alarm.time_value)) triggered = true;
            }

            if (triggered) {
                window.removeAlarm(alarm.id);
                showAlarmModal();
            }
        });
    }

    function triggerAlarm(alarm) {
        document.getElementById('alarmTimeText').innerText = alarm.type === 'timer' ? `Timer finished!` : `It's ${alarm.time_value}`;
        alarmModal.style.display = 'block';
        try {
            alarmSound.play();
        } catch (e) { console.error("Sound play blocked", e); }
    }

    async function startBriefing() {
        alarmSound.pause();
        alarmSound.currentTime = 0;
        alarmModal.style.display = 'none';

        briefingModal.style.display = 'block';
        const briefingText = document.getElementById('briefingText');
        const briefingStatus = document.getElementById('briefingStatus');

        if (!currentBriefingScript) {
            briefingText.innerText = "One moment please, Liebe is gathering your morning data...";
            briefingStatus.innerText = "Loading Briefing...";

            // Re-attempting fetch if not ready
            const todayStr = new Date().toDateString();
            const notesForToday = notes[todayStr] || [];

            try {
                const response = await fetch('/api/morning_briefing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        city: 'Mumbai',
                        notes: notesForToday.map(n => n.content)
                    })
                });
                const data = await response.json();
                currentBriefingScript = data.script;
            } catch (e) {
                currentBriefingScript = "Hello! I couldn't reach the weather and news services right now, but I hope you have a wonderful day ahead.";
            }
        }

        briefingText.innerText = currentBriefingScript;
        briefingStatus.innerText = "Liebe is speaking...";
        autoSaveBriefing(currentBriefingScript);
        speak(currentBriefingScript);
    }

    function autoSaveBriefing(script) {
        const dateStr = new Date().toDateString();
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (!notes[dateStr]) {
            notes[dateStr] = [];
        }

        // Check for existing briefing today
        const existingIdx = notes[dateStr].findIndex(n => n.type === 'briefing');

        // Format the script for the note to make it readable (Summarize sections)
        let formattedNote = script;
        // Basic readability improvements for the stored text
        formattedNote = formattedNote.replace(/First, /g, "\n• ")
            .replace(/Second, /g, "\n• ")
            .replace(/Third, /g, "\n• ")
            .replace(/\. /g, ".\n");

        const briefingData = {
            content: formattedNote.trim(),
            time: timeStr,
            timestamp: Date.now(),
            type: 'briefing'
        };

        if (existingIdx > -1) {
            notes[dateStr][existingIdx] = briefingData;
        } else {
            notes[dateStr].push(briefingData);
        }

        localStorage.setItem('liebe-weekly-notes', JSON.stringify(notes));
        renderWeeklyCalendar();
        renderDateNotes();
    }

    function speak(text) {
        // Use the new Premium TTS endpoint
        const briefingStatus = document.getElementById('briefingStatus');
        const voiceBtnIcon = document.getElementById('voiceBtnIcon');
        const voiceBtnText = document.getElementById('voiceBtnText');

        if (window.currentAudio) {
            window.currentAudio.pause();
            window.currentAudio.src = "";
        }

        const audioUrl = `/api/tts?text=${encodeURIComponent(text)}`;
        const audio = new Audio(audioUrl);
        window.currentAudio = audio;

        audio.play().then(() => {
            isSpeaking = true;
            briefingStatus.innerText = "Liebe is speaking...";
            if (voiceBtnIcon) voiceBtnIcon.innerText = "⏸";
            if (voiceBtnText) voiceBtnText.innerText = "Pause";
        }).catch(e => {
            console.error("Speech error:", e);
            briefingStatus.innerText = "Voice Error - falling back...";
            // Fallback to basic browser TTS if backend fails
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        });

        audio.onended = () => {
            isSpeaking = false;
            briefingStatus.innerText = "Briefing Complete";
            if (voiceBtnIcon) voiceBtnIcon.innerText = "▶";
            if (voiceBtnText) voiceBtnText.innerText = "Restart";
        };

        audio.onerror = (e) => {
            console.error("Audio element error:", e);
            isSpeaking = false;
            briefingStatus.innerText = "Speech Error";
        };
    }

    // Toggle Voice Play/Pause
    const toggleVoiceBtn = document.getElementById('toggleVoice');
    if (toggleVoiceBtn) {
        toggleVoiceBtn.onclick = () => {
            const voiceBtnIcon = document.getElementById('voiceBtnIcon');
            const voiceBtnText = document.getElementById('voiceBtnText');
            const briefingStatus = document.getElementById('briefingStatus');

            if (!window.currentAudio) return;

            if (window.currentAudio.ended) {
                // Restart if ended
                speak(currentBriefingScript);
                return;
            }

            if (window.currentAudio.paused) {
                window.currentAudio.play();
                voiceBtnIcon.innerText = "⏸";
                voiceBtnText.innerText = "Resume";
                briefingStatus.innerText = "Liebe is speaking...";
            } else {
                window.currentAudio.pause();
                voiceBtnIcon.innerText = "▶";
                voiceBtnText.innerText = "Resume";
                briefingStatus.innerText = "Briefing Paused";
            }
        };
    }

    document.getElementById('dismissAlarm').onclick = () => {
        startBriefing();
    };

    document.getElementById('closeBriefing').onclick = () => {
        briefingModal.style.display = 'none';
        if (window.currentAudio) {
            window.currentAudio.pause();
            window.currentAudio.src = "";
        }
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    };

    function formatMessageText(text) {
        let formattedText = text.replace(/\n/g, '<br>');
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        const urlRegex = /(https?:\/\/[^\s<]+)/g;
        return formattedText.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" style="color: var(--accent-color); text-decoration: underline;">${url}</a>`;
        });
    }

    function addMessage(text, sender, service = 'none') {
        const chatContainer = document.getElementById('chatContainer');
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${sender}`;

        if (sender === 'user') {
            bubble.innerHTML = formatMessageText(text);
        } else {
            renderFinalAiBubble(bubble, text, service);
        }

        chatContainer.appendChild(bubble);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function renderFinalAiBubble(bubble, text, service) {
        // Log for debug
        console.log("Processing AI response for tags:", text);

        // 1. Process Tags (Alarms, Notes)
        const alarmMatch = text.match(/\[ALARM:(\d{1,2}:\d{2})\]/);
        const timerMatch = text.match(/\[TIMER:(\d+)\]/);
        const noteMatch = text.match(/\[NOTE:(.*?)\|(.*?)\]/);

        if (alarmMatch) {
            const time = alarmMatch[1].padStart(5, '0');
            saveAlarms('alarm', time);

            // Automatic briefing prep if within 5 mins
            const now = new Date();
            const [ah, am] = time.split(':');
            const alarmDate = new Date();
            alarmDate.setHours(parseInt(ah), parseInt(am), 0);
            if ((alarmDate - now) / 60000 <= 5) {
                // For simplicity, we trigger prep on next sync or just pass a temp object
                if (typeof prepareBriefing === 'function') prepareBriefing({ time_value: time, prepared: false });
            }
        }

        if (timerMatch) {
            const mins = parseInt(timerMatch[1]);
            const target = new Date().getTime() + (mins * 60000);
            saveAlarms('timer', target, `${mins}m`);
        }

        if (noteMatch) {
            const content = noteMatch[1];
            let noteDateStr = noteMatch[2].trim();

            // Handle "today" or "now" keywords from AI
            if (noteDateStr.toLowerCase() === 'today' || noteDateStr.toLowerCase() === 'now') {
                noteDateStr = new Date().toDateString();
            } else {
                // Normalize any other date string provided by AI
                const parsedDate = new Date(noteDateStr);
                if (!isNaN(parsedDate.getTime())) {
                    noteDateStr = parsedDate.toDateString();
                }
            }

            addDateNote(content, noteDateStr);

            // Refresh UI if the panel is open
            if (typeof renderWeeklyCalendar === 'function') renderWeeklyCalendar();
            if (typeof renderDateNotes === 'function') renderDateNotes();
        }

        // 2. Clean text and set innerHTML
        const cleanText = text.replace(/\[ALARM:.*?\]/g, '').replace(/\[TIMER:.*?\]/g, '').replace(/\[NOTE:.*?\]/g, '');
        bubble.innerHTML = formatMessageText(cleanText);

        // 3. Add Icons
        const footerIcons = document.createElement('div');
        footerIcons.className = 'message-footer-icons';

        if (service !== 'none') {
            const serviceContainer = document.createElement('div');
            serviceContainer.className = 'service-info-footer';
            serviceContainer.style.display = 'flex';
            serviceContainer.style.alignItems = 'center';

            let serviceIcon = '';
            if (service === 'gemini') serviceIcon = '✨';
            else if (service === 'groq') serviceIcon = '⚡';
            else if (service === 'ollama') serviceIcon = '🏠';

            const logoDiv = document.createElement('div');
            logoDiv.className = `service-logo ${service}`;
            logoDiv.style.fontSize = '14px';
            logoDiv.style.display = 'flex';
            logoDiv.style.alignItems = 'center';
            logoDiv.style.justifyContent = 'center';
            logoDiv.innerHTML = serviceIcon;
            logoDiv.title = `Powered by ${service.toUpperCase()}`;

            serviceContainer.appendChild(logoDiv);
            footerIcons.appendChild(serviceContainer);
        }

        // Feature Icons
        const lowerText = cleanText.toLowerCase();
        const features = [];
        if (lowerText.includes('weather') || lowerText.includes('°c')) features.push({ name: 'weather', icon: '☀️' });
        if (lowerText.includes('searching') || lowerText.includes('found') || lowerText.includes('news')) features.push({ name: 'news', icon: '📰' });

        features.forEach(f => {
            const iconDiv = document.createElement('div');
            iconDiv.className = `feature-icon ${f.name}`;
            iconDiv.innerHTML = f.icon;
            iconDiv.title = `Using ${f.name.charAt(0).toUpperCase() + f.name.slice(1)} tool`;
            footerIcons.appendChild(iconDiv);
        });

        bubble.appendChild(footerIcons);
    }

    // --- TOP WEATHER UPDATE ---
    async function updateTopWeather() {
        const weatherTemp = document.getElementById('weatherTemp');
        const weatherMainTemp = document.getElementById('weatherMainTemp');
        const weatherCity = document.getElementById('weatherCity');
        const weatherDesc = document.getElementById('weatherDesc');
        const weatherHumidity = document.getElementById('weatherHumidity');
        const weatherWind = document.getElementById('weatherWind');

        try {
            const response = await fetch('/api/weather?city=Mumbai');
            const data = await response.json();
            if (data.temp) {
                weatherTemp.innerText = `${data.temp}°C`;

                // Update Modal details too
                if (weatherMainTemp) weatherMainTemp.innerText = `${data.temp}°C`;
                if (weatherCity) weatherCity.innerText = data.city || 'Mumbai';
                if (weatherDesc) weatherDesc.innerText = data.desc || 'Clear';
                if (weatherHumidity) weatherHumidity.innerText = `${data.humidity}%`;
                if (weatherWind) weatherWind.innerText = `${data.wind} m/s`;
            }
        } catch (e) {
            console.error("Top weather update failed", e);
        }
    }

    // Initial setups
    updateAlarmsUI();
    updateTopWeather();
    setInterval(checkAlarms, 1000);
    setInterval(updateTopWeather, 300000); // Every 5 minutes


    sendBtn.addEventListener('click', sendMessage);
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Load History
    async function loadChatHistory() {
        try {
            const response = await fetch('/api/chat/history');
            const data = await response.json();
            if (data && data.length > 0) {
                const logoArea = document.querySelector('.logo-area');
                const mainContent = document.querySelector('.main-content');
                const chatContainer = document.getElementById('chatContainer');

                if (logoArea) logoArea.style.display = 'none';
                if (mainContent) mainContent.classList.add('chat-active');
                if (chatContainer) {
                    chatContainer.classList.add('active');
                    data.forEach(msg => {
                        addMessage(msg.content, msg.role === 'assistant' ? 'ai' : 'user');
                        currentChatHistory.push({ role: msg.role, content: msg.content });
                    });
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }
        } catch (e) { console.error("History load error:", e); }
    }

    loadChatHistory();
});

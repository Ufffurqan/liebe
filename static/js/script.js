document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.querySelector('.input-field');
    const sendBtn = document.querySelector('.send-btn');
    const container = document.querySelector('.input-container');

    // --- AUTHENTICATION LOGIC ---
    const authOverlay = document.getElementById('authOverlay');
    const passwordInput = document.getElementById('adminPassword');
    const loginBtn = document.getElementById('loginBtn');
    const authError = document.getElementById('authError');

    async function checkAuthStatus() {
        try {
            const res = await fetch('/api/auth_status');
            const data = await res.json();
            if (data.authenticated) {
                authOverlay.classList.add('auth-hidden');
            } else {
                authOverlay.classList.remove('auth-hidden');
            }
        } catch (e) {
            // If API returns 401, we know we're not authenticated
            authOverlay.classList.remove('auth-hidden');
        }
    }

    async function handleLogin() {
        const password = passwordInput.value;
        if (!password) return;

        loginBtn.disabled = true;
        loginBtn.style.opacity = '0.5';
        authError.innerText = '';

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();

            if (res.ok) {
                authOverlay.classList.add('auth-hidden');
                // Reload data once authenticated
                if (typeof syncData === 'function') syncData();
                if (typeof renderSessions === 'function') renderSessions();
            } else {
                authError.innerText = data.error || 'Login failed';
                passwordInput.value = '';
                passwordInput.focus();
            }
        } catch (e) {
            authError.innerText = 'Connection error';
        } finally {
            loginBtn.disabled = false;
            loginBtn.style.opacity = '1';
        }
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
        checkAuthStatus();
    }

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
    let currentSessionId = localStorage.getItem('liebe_session_id') || 'default';

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
                <div class="date-note-time">${note.time || (note.timestamp ? new Date(note.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}</div>
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

        // Start a completely new session with unique ID
        currentSessionId = 'session_' + Date.now();
        localStorage.setItem('liebe_session_id', currentSessionId);
        currentChatHistory = [];

        renderSessions();
    }
    newChatBtn.addEventListener('click', startNewChat);

    async function renderSessions() {
        const historyList = document.querySelector('.chat-history');
        const header = historyList.querySelector('.history-header');

        try {
            const res = await fetch('/api/chat/sessions');
            const sessions = await res.json();

            // Clear old items (keep header)
            while (historyList.lastChild && historyList.lastChild !== header) {
                historyList.removeChild(historyList.lastChild);
            }

            if (sessions.length === 0) {
                const item = document.createElement('div');
                item.className = 'history-item active';
                item.innerHTML = '<span style="opacity:0.6; margin-right:8px;">💬</span> New Chat';
                historyList.appendChild(item);
                return;
            }

            const groups = { 'Today': [], 'Yesterday': [], 'Other': {} };
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const yesterday = today - (86400000);

            sessions.forEach(s => {
                // Robust timestamp parsing
                let ts = s.timestamp;
                if (typeof ts === 'string') ts = ts.replace(' ', 'T');
                const sDate = new Date(ts);

                if (isNaN(sDate.getTime())) {
                    if (!groups['Other']['Unknown Date']) groups['Other']['Unknown Date'] = [];
                    groups['Other']['Unknown Date'].push(s);
                    return;
                }

                const sTime = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate()).getTime();

                if (sTime === today) groups['Today'].push(s);
                else if (sTime === yesterday) groups['Yesterday'].push(s);
                else {
                    const dStr = sDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                    if (!groups['Other'][dStr]) groups['Other'][dStr] = [];
                    groups['Other'][dStr].push(s);
                }
            });

            const addGrp = (title, list) => {
                if (!list || !list.length) return;

                const h = document.createElement('div');
                h.style.padding = '18px 12px 8px';
                h.style.fontSize = '11px';
                h.style.color = 'var(--text-secondary)';
                h.style.textTransform = 'uppercase';
                h.style.fontWeight = '700';
                h.style.letterSpacing = '0.05em';
                h.style.opacity = '0.8';
                h.innerText = title;
                historyList.appendChild(h);

                list.forEach(s => {
                    const item = document.createElement('div');
                    item.className = `history-item ${s.session_id === currentSessionId ? 'active' : ''}`;

                    let titleChat = s.content || "Empty Chat";
                    if (titleChat.length > 25) titleChat = titleChat.substring(0, 25) + '...';

                    item.innerHTML = `<span style="opacity:0.6; margin-right:8px;">💬</span> ${titleChat}`;
                    item.onclick = () => switchSession(s.session_id);
                    historyList.appendChild(item);
                });
            };

            addGrp('Today', groups['Today']);
            addGrp('Yesterday', groups['Yesterday']);

            // Sort dates descending
            const sortedDates = Object.keys(groups['Other']).sort((a, b) => new Date(b) - new Date(a));
            sortedDates.forEach(d => addGrp(d, groups['Other'][d]));

        } catch (e) {
            console.error("Session render failed", e);
        }
    }

    async function switchSession(id) {
        currentSessionId = id;
        localStorage.setItem('liebe_session_id', id);
        currentChatHistory = [];
        document.getElementById('chatContainer').innerHTML = '';
        await loadChatHistory(id);
        renderSessions();
    }

    // --- FILE UPLOAD HANDLING ---
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');
    let selectedFile = null;

    attachBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            selectedFile = fileInput.files[0];
            attachBtn.classList.add('has-file');
            attachBtn.title = `File: ${selectedFile.name}`;
            // Optional: change icon or add badge
            if (!textarea.value.trim()) {
                sendBtn.classList.add('active'); // Activate send if file selected
            }
        } else {
            selectedFile = null;
            attachBtn.classList.remove('has-file');
            attachBtn.title = `Attach`;
        }
    });

    async function uploadFile() {
        if (!selectedFile) return null;

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            return await res.json();
        } catch (e) {
            console.error("Upload failed", e);
            return null;
        }
    }

    // Send Interaction
    async function sendMessage() {
        if (!sendBtn.classList.contains('active')) return;

        const message = textarea.value.trim();
        if (!message && !selectedFile) return;

        let fileData = null;
        if (selectedFile) {
            sendBtn.innerHTML = '<div class="loader">...</div>';
            fileData = await uploadFile();
            if (!fileData) {
                alert("File upload failed.");
                sendBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5"></line>
                        <polyline points="5 12 12 5 19 12"></polyline>
                    </svg>
                `;
                return;
            }
        }

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
        addMessage(message, 'user', 'none', fileData);
        textarea.value = '';
        textarea.style.height = 'auto';
        sendBtn.classList.remove('active');
        sendBtn.innerHTML = '<div class="loader">...</div>';

        // Clear file state
        selectedFile = null;
        fileInput.value = '';
        attachBtn.classList.remove('has-file');
        attachBtn.title = 'Attach';

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
                    session_id: currentSessionId,
                    search_enabled: useSearch,
                    deep_thinking_enabled: useDeepThinking,
                    file_path: fileData ? fileData.file_path : null,
                    file_type: fileData ? fileData.file_type : null
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

                            // Refresh sessions list to update titles
                            renderSessions();

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

            // Mark as prepared locally and on server
            alarm.prepared = true;
            await fetch(`/api/alarms/${alarm.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prepared: true })
            });

            const statusEl = document.getElementById('briefingPrepStatus');
            if (statusEl) statusEl.style.display = 'block';
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

    const triggeredIds = new Set();

    function checkAlarms() {
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        alarms.forEach((alarm) => {
            if (triggeredIds.has(alarm.id)) return;

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
                triggeredIds.add(alarm.id);
                window.removeAlarm(alarm.id);
                triggerAlarm(alarm);
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

    async function autoSaveBriefing(script) {
        const dateStr = new Date().toDateString();
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Format the script for the note to make it readable
        let formattedNote = script;
        formattedNote = formattedNote.replace(/First, /g, "\n• ")
            .replace(/Second, /g, "\n• ")
            .replace(/Third, /g, "\n• ")
            .replace(/\. /g, ".\n");

        try {
            await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date_str: dateStr,
                    content: formattedNote.trim(),
                    type: 'briefing',
                    timestamp: Date.now() / 1000
                })
            });
            syncData(); // Refresh UI from server
        } catch (e) {
            console.error("Auto-save briefing failed", e);
            // Fallback to local storage if API fails
            if (!notes[dateStr]) notes[dateStr] = [];
            notes[dateStr].push({
                content: formattedNote.trim(),
                time: timeStr,
                type: 'briefing'
            });
            renderWeeklyCalendar();
            renderDateNotes();
        }
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
        // 1. Extract and format code blocks first
        const codeBlocks = [];
        let formattedText = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const index = codeBlocks.length;
            const language = lang || 'code';
            codeBlocks.push({ language, code: code.trim() });
            return `__CODE_BLOCK_${index}__`;
        });

        // 2. Format common markdown in remaining text
        formattedText = formattedText.replace(/\n/g, '<br>');
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        const urlRegex = /(https?:\/\/[^\s<]+)/g;
        formattedText = formattedText.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" style="color: var(--accent-color); text-decoration: underline;">${url}</a>`;
        });

        // 3. Re-insert formatted code blocks
        codeBlocks.forEach((block, i) => {
            const html = `
                <div class="code-block-container">
                    <div class="code-header">
                        <div class="code-lang">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                            ${block.language}
                        </div>
                        <button class="code-copy-btn" onclick="copyToClipboard(this, \`${btoa(block.code)}\`)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            Copy
                        </button>
                    </div>
                    <div class="code-content">${block.code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                </div>
            `;
            formattedText = formattedText.replace(`__CODE_BLOCK_${i}__`, html);
        });

        return formattedText;
    }

    // Global Copy Helper
    window.copyToClipboard = (btn, base64Code) => {
        try {
            const code = atob(base64Code);
            navigator.clipboard.writeText(code).then(() => {
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<span>✅ Copied!</span>';
                setTimeout(() => { btn.innerHTML = originalHtml; }, 2000);
            });
        } catch (e) {
            console.error("Copy failed", e);
        }
    };

    function addMessage(text, sender, service = 'none', fileData = null) {
        const chatContainer = document.getElementById('chatContainer');
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${sender}`;

        if (fileData && fileData.file_path) {
            const fileContent = document.createElement('div');
            fileContent.className = 'message-file-attachment';
            if (fileData.file_type && fileData.file_type.startsWith('image/')) {
                fileContent.innerHTML = `<img src="${fileData.file_path}" alt="Attached Photo" style="max-width: 100%; border-radius: 12px; margin-bottom: 8px; cursor: pointer;" onclick="window.open('${fileData.file_path}', '_blank')">`;
            } else {
                const fileName = fileData.file_path.split('_').slice(1).join('_');
                fileContent.innerHTML = `
                    <a href="${fileData.file_path}" target="_blank" style="display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; text-decoration: none; color: inherit;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                        <span style="font-size: 13px;">${fileName || 'Attached File'}</span>
                    </a>
                `;
            }
            bubble.appendChild(fileContent);
        }

        const textContent = document.createElement('div');
        if (sender === 'user') {
            textContent.innerHTML = formatMessageText(text);
        } else {
            renderFinalAiBubble(textContent, text, service);
        }
        bubble.appendChild(textContent);

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

            // Handle relative keywords from AI
            if (noteDateStr.toLowerCase() === 'today' || noteDateStr.toLowerCase() === 'now') {
                noteDateStr = new Date().toDateString();
            } else if (noteDateStr.toLowerCase() === 'tomorrow') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                noteDateStr = tomorrow.toDateString();
            } else {
                // Normalize any other date string provided by AI
                const parsedDate = new Date(noteDateStr);
                if (!isNaN(parsedDate.getTime())) {
                    noteDateStr = parsedDate.toDateString();
                }
            }

            addDateNote(content, noteDateStr);
            renderSessions(); // Refresh UI

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
            else if (service === 'openclaw') serviceIcon = '🛡️';

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
        if (alarmMatch) features.push({ name: 'alarm', icon: '⏰' });
        if (timerMatch) features.push({ name: 'timer', icon: '⏱️' });
        if (noteMatch) features.push({ name: 'note', icon: '📝' });

        if (lowerText.includes('weather') || lowerText.includes('°c')) features.push({ name: 'weather', icon: '☀️' });
        if (lowerText.includes('searching') || lowerText.includes('found') || lowerText.includes('news')) features.push({ name: 'news', icon: '📰' });
        if (lowerText.includes('youtube') || lowerText.includes('video')) features.push({ name: 'youtube', icon: '🎥' });
        if (service === 'openclaw' || lowerText.includes('kali') || lowerText.includes('nmap')) features.push({ name: 'kali', icon: '🐉' });

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
    async function loadChatHistory(sessionId = currentSessionId) {
        try {
            const response = await fetch(`/api/chat/history?session_id=${sessionId}`);
            const data = await response.json();

            const logoArea = document.querySelector('.logo-area');
            const mainContent = document.querySelector('.main-content');
            const chatContainer = document.getElementById('chatContainer');

            if (data && data.length > 0) {
                if (logoArea) logoArea.style.display = 'none';
                if (mainContent) mainContent.classList.add('chat-active');
                if (chatContainer) {
                    chatContainer.classList.add('active');
                    data.forEach(msg => {
                        // For historical messages, avoid full re-rendering of effects
                        const bubble = document.createElement('div');
                        bubble.className = `message-bubble ${msg.role === 'assistant' ? 'ai' : 'user'}`;

                        // Render file if exists
                        if (msg.file_path) {
                            const fileContent = document.createElement('div');
                            fileContent.className = 'message-file-attachment';
                            if (msg.file_type && msg.file_type.startsWith('image/')) {
                                fileContent.innerHTML = `<img src="${msg.file_path}" alt="Attached Photo" style="max-width: 100%; border-radius: 12px; margin-bottom: 8px; cursor: pointer;" onclick="window.open('${msg.file_path}', '_blank')">`;
                            } else {
                                const fileName = msg.file_path.split('_').slice(1).join('_');
                                fileContent.innerHTML = `
                                    <a href="${msg.file_path}" target="_blank" style="display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; text-decoration: none; color: inherit;">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                        <span style="font-size: 13px;">${fileName || 'Attached File'}</span>
                                    </a>
                                `;
                            }
                            bubble.appendChild(fileContent);
                        }

                        const textContent = document.createElement('div');
                        if (msg.role === 'user') {
                            textContent.innerHTML = formatMessageText(msg.content);
                        } else {
                            // Strip tags for history view to avoid double-processing
                            const clean = msg.content.replace(/\[ALARM:.*?\]/g, '').replace(/\[TIMER:.*?\]/g, '').replace(/\[NOTE:.*?\]/g, '');
                            textContent.innerHTML = formatMessageText(clean);
                        }
                        bubble.appendChild(textContent);

                        chatContainer.appendChild(bubble);
                        currentChatHistory.push({ role: msg.role, content: msg.content });
                    });
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            } else {
                // If empty session, ensure logo area is visible
                if (logoArea) {
                    logoArea.style.display = 'flex';
                    logoArea.style.opacity = '1';
                }
                if (mainContent) mainContent.classList.remove('chat-active');
                if (chatContainer) chatContainer.classList.remove('active');
            }
        } catch (e) { console.error("History load error:", e); }
    }

    loadChatHistory();
    renderSessions();
});

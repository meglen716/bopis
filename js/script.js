// ==========================================
// BOPIS COMMAND CENTER - MAIN LOGIC
// ==========================================

// --- Typewriter Header Animation ---
const typewriterElement = document.getElementById('typewriter-header');
if (typewriterElement) {
    const textToType = "back opis";
    
    function playTypewriter() {
        typewriterElement.innerHTML = ""; 
        let i = 0;
        
        function typeChar() {
            if (i < textToType.length) {
                typewriterElement.innerHTML += textToType.charAt(i);
                i++;
                setTimeout(typeChar, 150); 
            }
        }
        typeChar();
    }

    playTypewriter(); 
    setInterval(playTypewriter, 60000); 
}

// --- Dark Mode Toggle ---
const themeToggle = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme');

if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if(themeToggle) themeToggle.checked = true;
}

if(themeToggle) {
    themeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    });
}

// --- Hamburger Menu & Tab Switching ---
const hamburgerBtn = document.getElementById('hamburger-btn');
const navTabs = document.getElementById('nav-tabs');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

if(hamburgerBtn) {
    hamburgerBtn.addEventListener('click', () => {
        navTabs.classList.toggle('open');
    });
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        
        tabPanels.forEach(p => {
            if (!p.classList.contains('floating-mode')) {
                p.classList.remove('active');
            }
        });
        
        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.target);
        if (target) target.classList.add('active');

        if (window.innerWidth <= 768 && navTabs) {
            navTabs.classList.remove('open');
        }
    });
});

// --- Stay Awake Toggle ---
let wakeLock = null;
const wakeToggle = document.getElementById('wake-toggle');

async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
        wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {
        if(wakeToggle) wakeToggle.checked = false;
        localStorage.setItem('stay_awake', 'off');
    }
}

if (wakeToggle) {
    if (localStorage.getItem('stay_awake') === 'on') {
        wakeToggle.checked = true;
        requestWakeLock();
    }
    wakeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            localStorage.setItem('stay_awake', 'on');
            requestWakeLock();
        } else {
            localStorage.setItem('stay_awake', 'off');
            if (wakeLock !== null) {
                wakeLock.release();
                wakeLock = null;
            }
        }
    });
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && localStorage.getItem('stay_awake') === 'on') {
        requestWakeLock(); 
    }
});


// --- 1. Alarm Clock ---
const alarmInput = document.getElementById('alarm-time');
const ringtoneSelect = document.getElementById('alarm-ringtone');
const customUrlInput = document.getElementById('custom-url-input');
const loopCheckbox = document.getElementById('alarm-loop');
const setAlarmBtn = document.getElementById('set-alarm-btn');
const cancelAlarmBtn = document.getElementById('cancel-alarm-btn');
const stopAlarmBtn = document.getElementById('stop-alarm-btn');
const alarmStatus = document.getElementById('alarm-status');
const countdownDisplay = document.getElementById('alarm-countdown');

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let isRinging = false;
let toneInterval = null;
let customAudio = new Audio();

function playTone(type) {
    if (type === 'direct-url') {
        const url = customUrlInput.value;
        if (!url) return alert("Please paste a valid web link first.");
        
        customAudio.src = url;
        customAudio.currentTime = 0;
        customAudio.loop = loopCheckbox.checked; 
        customAudio.play().catch(e => {
            alert("Could not play the link. Ensure the link is valid.");
        });
        return;
    }

    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(1.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === 'chime') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.2);
        gainNode.gain.setValueAtTime(1.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1);
        osc.start(now);
        osc.stop(now + 1);
    } else if (type === 'siren') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.4);
        osc.frequency.linearRampToValueAtTime(400, now + 0.8);
        gainNode.gain.setValueAtTime(1.5, now); 
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
    }
}

if(ringtoneSelect) {
    ringtoneSelect.addEventListener('change', (e) => {
        if (e.target.value === 'direct-url') {
            customUrlInput.classList.add('active');
        } else {
            customUrlInput.classList.remove('active');
            if (!audioCtx) audioCtx = new AudioContext();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            playTone(e.target.value);
        }
    });
}

const workerBlob = new Blob([
    "let timer = null;" +
    "self.onmessage = function(e) {" +
    "    if (e.data === 'start') {" +
    "        timer = setInterval(() => self.postMessage('tick'), 1000);" +
    "    } else if (e.data === 'stop') {" +
    "        clearInterval(timer);" +
    "    }" +
    "};"
], { type: 'application/javascript' });
const timerWorker = new Worker(URL.createObjectURL(workerBlob));

let targetAlarmTime = null;

function getNextAlarmDate(timeString) {
    const [hours, minutes] = timeString.split(':');
    const now = new Date();
    let alarmDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    if (alarmDate <= now) {
        alarmDate.setDate(alarmDate.getDate() + 1);
    }
    return alarmDate;
}

function updateCountdownUI() {
    if (!targetAlarmTime || isRinging) return;
    const now = new Date();
    const alarmDate = getNextAlarmDate(targetAlarmTime);
    const diffMs = alarmDate - now;

    if (diffMs > 0 && countdownDisplay) {
        const h = Math.floor(diffMs / (1000 * 60 * 60));
        const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diffMs % (1000 * 60)) / 1000);
        countdownDisplay.innerText = `Rings in: ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    }
}

function initiateAlarm(time, ringtone, customUrl, isLooping, isRestoring = false) {
    if (ringtone === 'direct-url' && !customUrl) {
        alert("Please provide a valid direct link.");
        return;
    }

    targetAlarmTime = time;
    
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if(alarmStatus) alarmStatus.innerText = `Alarm set for ${targetAlarmTime}`;
    if(setAlarmBtn) setAlarmBtn.style.display = 'none';
    if(cancelAlarmBtn) cancelAlarmBtn.style.display = 'inline-block';
    if(countdownDisplay) countdownDisplay.style.display = 'block';
    
    updateCountdownUI();
    timerWorker.postMessage('start');

    if (!isRestoring) {
        localStorage.setItem('saved_alarm', JSON.stringify({ 
            time, ringtone, customUrl, isLooping
        }));
    }
}

if(setAlarmBtn) {
    setAlarmBtn.addEventListener('click', () => {
        if (!alarmInput.value) return alert("Please select a time.");
        initiateAlarm(alarmInput.value, ringtoneSelect.value, customUrlInput.value, loopCheckbox.checked);
    });
}

if(cancelAlarmBtn) {
    cancelAlarmBtn.addEventListener('click', () => {
        targetAlarmTime = null;
        timerWorker.postMessage('stop');
        localStorage.removeItem('saved_alarm');
        
        if(setAlarmBtn) setAlarmBtn.style.display = 'block';
        if(cancelAlarmBtn) cancelAlarmBtn.style.display = 'none';
        if(countdownDisplay) countdownDisplay.style.display = 'none';
        if(alarmStatus) alarmStatus.innerText = "No alarm set.";
    });
}

timerWorker.onmessage = function(e) {
    if (e.data === 'tick' && targetAlarmTime && !isRinging) {
        updateCountdownUI();

        const now = new Date();
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${currentHours}:${currentMinutes}`;
        
        if (currentTime === targetAlarmTime) {
            triggerAlarm();
        }
    }
};

function triggerAlarm() {
    isRinging = true;
    timerWorker.postMessage('stop');
    localStorage.removeItem('saved_alarm'); 
    
    if(alarmStatus) alarmStatus.innerText = "⏰ ALARM RINGING! ⏰";
    if(countdownDisplay) countdownDisplay.style.display = 'none';
    if(cancelAlarmBtn) cancelAlarmBtn.style.display = 'none';
    if(stopAlarmBtn) stopAlarmBtn.style.display = 'block';
    
    const selectedTone = ringtoneSelect.value;
    const isLooping = loopCheckbox.checked;

    if (selectedTone === 'direct-url') {
        playTone('direct-url'); 
    } else {
        playTone(selectedTone); 
        if (isLooping) {
            toneInterval = setInterval(() => playTone(selectedTone), 1000); 
        }
    }
}

if(stopAlarmBtn) {
    stopAlarmBtn.addEventListener('click', () => {
        isRinging = false;
        clearInterval(toneInterval);
        customAudio.pause();
        customAudio.currentTime = 0;
        
        targetAlarmTime = null;
        if(alarmStatus) alarmStatus.innerText = "No alarm set.";
        
        if(stopAlarmBtn) stopAlarmBtn.style.display = 'none';
        if(setAlarmBtn) setAlarmBtn.style.display = 'block';
    });
}

window.addEventListener('DOMContentLoaded', () => {
    const savedAlarm = localStorage.getItem('saved_alarm');
    if (savedAlarm && alarmInput) {
        const data = JSON.parse(savedAlarm);
        
        alarmInput.value = data.time;
        ringtoneSelect.value = data.ringtone;
        if(loopCheckbox) loopCheckbox.checked = data.isLooping !== undefined ? data.isLooping : true;
        
        if (data.ringtone === 'direct-url' && customUrlInput) {
            customUrlInput.value = data.customUrl || '';
            customUrlInput.classList.add('active');
        }

        initiateAlarm(data.time, data.ringtone, data.customUrl, data.isLooping, true);
    }
});


// --- 2. Big Digital Clock & U.S Time Zones ---
const stateTimeElements = [];

function initTimeZonesTable() {
    const tbody = document.getElementById('timezone-tbody');
    if (!tbody || typeof usStates === 'undefined') return;

    usStates.forEach(state => {
        const tr = document.createElement('tr');
        tr.title = state.tzName;

        const tdName = document.createElement('td');
        tdName.className = 'state-name';
        tdName.innerText = state.name;

        const tdAbbr = document.createElement('td');
        tdAbbr.className = 'state-abbr';
        tdAbbr.innerText = state.abbr;

        const tdTime = document.createElement('td');
        tdTime.className = 'state-time';
        tdTime.innerText = "--:--:--";
        
        stateTimeElements.push({ element: tdTime, tz: state.tz });

        tr.appendChild(tdName);
        tr.appendChild(tdAbbr);
        tr.appendChild(tdTime);
        tbody.appendChild(tr);
    });
}
initTimeZonesTable();

function updateClocks() {
    const now = new Date();
    
    const digitalTime = document.getElementById('digital-time');
    const digitalDate = document.getElementById('digital-date');
    if (digitalTime) digitalTime.innerText = now.toLocaleTimeString('en-US', { hour12: true });
    if (digitalDate) digitalDate.innerText = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const options = { timeStyle: 'medium', hour12: true };
    stateTimeElements.forEach(item => {
        item.element.innerText = new Intl.DateTimeFormat('en-US', { ...options, timeZone: item.tz }).format(now);
    });
}
setInterval(updateClocks, 1000);
updateClocks();


// --- 3. Floating Webcam (Picture-in-Picture, Capture, Kill Switch) ---
const video = document.getElementById('webcam-video');
const startWebcamBtn = document.getElementById('start-webcam-btn');
const stopWebcamBtn = document.getElementById('stop-webcam-btn');
const pipBtn = document.getElementById('pip-btn');
const captureBtn = document.getElementById('capture-btn');

if (startWebcamBtn) {
    startWebcamBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            
            pipBtn.disabled = false;
            captureBtn.disabled = false;
            stopWebcamBtn.disabled = false;
            
            startWebcamBtn.disabled = true;
            startWebcamBtn.innerText = "Webcam Active";
        } catch (err) {
            alert("Could not access webcam. Please check permissions.");
        }
    });
}

if (stopWebcamBtn) {
    stopWebcamBtn.addEventListener('click', () => {
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(err => console.log(err));
        }

        if (video && video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }

        pipBtn.disabled = true;
        captureBtn.disabled = true;
        stopWebcamBtn.disabled = true;
        
        startWebcamBtn.disabled = false;
        startWebcamBtn.innerText = "Start Webcam";
    });
}

if (pipBtn) {
    pipBtn.addEventListener('click', async () => {
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
            try {
                await video.requestPictureInPicture();
            } catch(err) {
                alert("Picture-in-Picture failed.");
            }
        }
    });
}

if (captureBtn) {
    captureBtn.addEventListener('click', async () => {
        if (!video.srcObject) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            try {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                
                const originalText = captureBtn.innerText;
                captureBtn.innerText = "✅ Copied!";
                setTimeout(() => { captureBtn.innerText = originalText; }, 2000);
            } catch (err) {
                alert("Failed to copy image. Your browser might block clipboard access without secure HTTPS.");
            }
        }, 'image/png');
    });
}


// --- 4. Calculator (Tricky Split Div, History, Keyboard Fix) ---
const calcDisplay = document.getElementById('calc-display');
const calcNumpad = document.getElementById('calc-numpad');
const toggleNumpadBtn = document.getElementById('toggle-numpad-btn');
const historyList = document.getElementById('calc-history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');
let currentCalc = "";

const numWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
function numToWord(n) {
    return numWords[n] || n.toString();
}

if (toggleNumpadBtn) {
    toggleNumpadBtn.addEventListener('click', () => {
        calcNumpad.classList.toggle('hidden');
        if (calcNumpad.classList.contains('hidden')) {
            toggleNumpadBtn.innerText = "Show On-Screen Numpad";
        } else {
            toggleNumpadBtn.innerText = "Hide On-Screen Numpad";
        }
    });
}

function appendCalc(value) {
    currentCalc += value;
    if (calcDisplay) calcDisplay.value = currentCalc;
}

function clearCalc() {
    currentCalc = "";
    if (calcDisplay) calcDisplay.value = "";
}

function calculateSplit(expression) {
    const parts = expression.split(' Split ');
    if (parts.length !== 2) return "Error";
    
    try {
        const N = parseFloat(eval(parts[0].replace(/[^-()\d/*+.]/g, '')));
        const D = parseFloat(eval(parts[1].replace(/[^-()\d/*+.]/g, '')));
        
        if (isNaN(N) || isNaN(D)) return "Invalid Input";
        if (D === 0) return "Error: Div by 0";
        if (D < 1 || !Number.isInteger(D)) return "Error: D must be a whole number";
        if (N < D) return "Error: Number is too small to split";
        
        const Q = Math.floor(N / D);
        const R = N % D;
        
        if (R === 0) return `${numToWord(D)} ${Q}s`;
        
        const countBase = D - R;
        const countUpper = R;
        const valUpper = Q + 1;
        
        const strBase = countBase === 1 ? `one ${Q}` : `${numToWord(countBase)} ${Q}s`;
        const strUpper = countUpper === 1 ? `one ${valUpper}` : `${numToWord(countUpper)} ${valUpper}s`;
        
        return `${strBase} and ${strUpper}`;
    } catch (e) {
        return "Error";
    }
}

function calculateResult() {
    if (!currentCalc) return;
    try {
        if (currentCalc.includes(' Split ')) {
            const result = calculateSplit(currentCalc);
            addHistoryItem(currentCalc, result);
            currentCalc = ""; 
            if (calcDisplay) calcDisplay.value = result;
            return;
        }

        const sanitizedCalc = currentCalc.replace(/[^-()\d/*+.]/g, ''); 
        const result = eval(sanitizedCalc).toString();
        
        addHistoryItem(currentCalc, result);
        
        currentCalc = result;
        if (calcDisplay) calcDisplay.value = currentCalc;
    } catch (err) {
        if (calcDisplay) calcDisplay.value = "Error";
        currentCalc = "";
    }
}

function addHistoryItem(expression, result) {
    if (!historyList) return;
    const li = document.createElement('li');
    li.innerHTML = `<span>${expression}</span> <strong>= ${result}</strong>`;
    historyList.prepend(li);
}

if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
        historyList.innerHTML = "";
    });
}

document.addEventListener('keydown', (e) => {
    const calcPanel = document.getElementById('calculator');
    if (!calcPanel || !calcPanel.classList.contains('active')) return;

    const activeTag = document.activeElement.tagName;
    const activeType = document.activeElement.type;
    if (activeTag === 'TEXTAREA' || (activeTag === 'INPUT' && (activeType === 'text' || activeType === 'url' || activeType === 'time'))) return;

    const key = e.key;

    if (/[0-9\+\-\*\/\.]/.test(key)) {
        e.preventDefault(); 
        appendCalc(key);
    } 
    else if (key.toLowerCase() === 's' || key === '\\') {
        e.preventDefault();
        appendCalc(' Split ');
    }
    else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculateResult();
    } 
    else if (key === 'Backspace') {
        e.preventDefault();
        if (currentCalc.endsWith(' Split ')) {
            currentCalc = currentCalc.slice(0, -7);
        } else {
            currentCalc = currentCalc.slice(0, -1);
        }
        if (calcDisplay) calcDisplay.value = currentCalc;
    } 
    else if (key === 'Escape' || key.toLowerCase() === 'c') {
        e.preventDefault();
        clearCalc();
    }
});


// --- 5. Quick Notes ---
const noteArea = document.getElementById('note-area');
const noteCounter = document.getElementById('note-counter');
const savedNote = localStorage.getItem('quick_notes');

function updateCounters() {
    if (!noteArea || !noteCounter) return;
    const text = noteArea.value;
    const charCount = text.length;
    const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    noteCounter.innerText = `Words: ${wordCount} | Characters: ${charCount} / 2000`;
}

if (noteArea && savedNote) {
    noteArea.value = savedNote;
    updateCounters();
}

if (noteArea) {
    noteArea.addEventListener('input', (e) => {
        localStorage.setItem('quick_notes', e.target.value);
        updateCounters();
    });
}

// --- Floating Notes Logic ---
const notesPanel = document.getElementById('notes');
const popoutNotesBtn = document.getElementById('popout-notes-btn');
const dockNotesBtn = document.getElementById('dock-notes-btn');
const dragHandle = document.getElementById('notes-drag-handle');

function popOutNotes() {
    if (window.innerWidth <= 768) return; 
    notesPanel.classList.add('floating-mode');
    if(dragHandle) dragHandle.style.display = 'flex';
    localStorage.setItem('notes_floating', 'true');
}

function dockNotes() {
    notesPanel.classList.remove('floating-mode');
    if(dragHandle) dragHandle.style.display = 'none';
    
    notesPanel.style.top = ''; 
    notesPanel.style.left = '';
    notesPanel.style.right = '';
    notesPanel.style.bottom = '';
    notesPanel.style.width = '';
    notesPanel.style.height = '';
    
    const activeTabBtn = document.querySelector('.tab-btn.active');
    if (activeTabBtn && activeTabBtn.dataset.target !== 'notes') {
        notesPanel.classList.remove('active');
    } else {
        notesPanel.classList.add('active');
    }

    localStorage.setItem('notes_floating', 'false');
}

if (popoutNotesBtn) popoutNotesBtn.addEventListener('click', popOutNotes);
if (dockNotesBtn) dockNotesBtn.addEventListener('click', dockNotes);

let isDraggingNotes = false;
let dragOffsetX, dragOffsetY;

if (dragHandle) {
    dragHandle.addEventListener('mousedown', (e) => {
        isDraggingNotes = true;
        const rect = notesPanel.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
    });
}

document.addEventListener('mousemove', (e) => {
    if (!isDraggingNotes) return;
    e.preventDefault(); 
    
    notesPanel.style.right = 'auto';
    notesPanel.style.bottom = 'auto';
    notesPanel.style.left = `${e.clientX - dragOffsetX}px`;
    notesPanel.style.top = `${e.clientY - dragOffsetY}px`;
});

document.addEventListener('mouseup', () => {
    if (isDraggingNotes) {
        isDraggingNotes = false;
        localStorage.setItem('notes_left', notesPanel.style.left);
        localStorage.setItem('notes_top', notesPanel.style.top);
    }
    if (notesPanel && notesPanel.classList.contains('floating-mode')) {
        localStorage.setItem('notes_width', notesPanel.style.width);
        localStorage.setItem('notes_height', notesPanel.style.height);
    }
});

window.addEventListener('resize', () => {
    if (window.innerWidth <= 768 && notesPanel && notesPanel.classList.contains('floating-mode')) {
        dockNotes();
    }
});

if (notesPanel && localStorage.getItem('notes_floating') === 'true' && window.innerWidth > 768) {
    notesPanel.style.left = localStorage.getItem('notes_left') || '';
    notesPanel.style.top = localStorage.getItem('notes_top') || '';
    notesPanel.style.width = localStorage.getItem('notes_width') || '';
    notesPanel.style.height = localStorage.getItem('notes_height') || '';
    popOutNotes();
}


// ==========================================
// 8. FIREBASE ANNOUNCEMENT BOARD
// ==========================================
const announcementBoard = document.getElementById('announcement-board');
const announcementText = document.getElementById('announcement-text');
const announcementTime = document.getElementById('announcement-timestamp');
const secretTrigger = document.getElementById('secret-trigger');
const adminPanel = document.getElementById('admin-panel');
const adminInput = document.getElementById('admin-input');
const adminBroadcastBtn = document.getElementById('admin-broadcast-btn');
const adminCancelBtn = document.getElementById('admin-cancel-btn');

// --- FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyBcWb6Wy-W5DzjL7RVFFLLzOecHbawx1lg",
    authDomain: "bopis-d5300.firebaseapp.com",
    databaseURL: "https://bopis-d5300-default-rtdb.firebaseio.com", 
    projectId: "bopis-d5300",
    storageBucket: "bopis-d5300.firebasestorage.app",
    messagingSenderId: "1045370937906",
    appId: "1:1045370937906:web:26c28ab8587f9d20ed122b"
};

// Initialize Firebase
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // 1. Live Listener (Direct UI update ONLY, no native notifications)
    let isInitialLoad = true;
    let currentMessage = "";

    db.ref('announcement').on('value', (snapshot) => {
        const data = snapshot.val();
        
        let msg = null;
        let timestamp = "";
        
        if (typeof data === 'string') {
            msg = data;
        } else if (data) {
            msg = data.message;
            timestamp = data.timestamp || "";
        }
        
        if (msg) {
            if (announcementText) announcementText.innerHTML = msg;
            if (announcementTime) announcementTime.innerText = timestamp;
            
            if (!isInitialLoad && msg !== currentMessage && announcementBoard) {
                announcementBoard.classList.add('highlight-pulse');
                setTimeout(() => announcementBoard.classList.remove('highlight-pulse'), 5000);
            }
            currentMessage = msg;
        } else {
            if (announcementText) announcementText.innerHTML = "No active announcements.";
            if (announcementTime) announcementTime.innerText = "";
            currentMessage = "";
        }
        
        isInitialLoad = false;
    });

    // --- Secure Authentication Setup ---
    const loginPanel = document.getElementById('login-panel');
    const adminPinInput = document.getElementById('admin-pin-input');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const loginError = document.getElementById('login-error');

    // 2. Secret Admin Trigger (5-Tap)
    let taps = 0;
    let tapTimer;
    if (secretTrigger) {
        secretTrigger.addEventListener('click', () => {
            taps++;
            clearTimeout(tapTimer);
            if (taps >= 5) {
                if (adminPanel && loginPanel) {
                    // If the editor is already open, 5-tapping closes it.
                    if (adminPanel.classList.contains('active')) {
                        adminPanel.classList.remove('active');
                    } else {
                        // Otherwise, open the Login Panel and lock it down
                        loginPanel.classList.toggle('active');
                        if (loginPanel.classList.contains('active')) {
                            adminPinInput.value = '';
                            adminPinInput.focus();
                            loginError.style.display = 'none';
                            adminPinInput.classList.remove('shake-error');
                        }
                    }
                }
                taps = 0;
            } else {
                tapTimer = setTimeout(() => taps = 0, 1500);
            }
        });
    }

    // --- Firebase PIN Validation ---
    function verifyAdminAccess() {
        if (!adminPinInput) return;
        const enteredPin = adminPinInput.value.trim();

        // Securely read the PIN from the Firebase Database
        db.ref('admin/pin').once('value').then((snapshot) => {
            let dbPin = snapshot.val();

            // Authentication Check
            if (enteredPin === dbPin.toString()) {
                // SUCCESS: Hide login, Show editor, Load message
                loginPanel.classList.remove('active');
                adminPanel.classList.add('active');
                if (adminInput) adminInput.innerHTML = currentMessage || "";
            } else {
                // FAILED: Trigger red shake animation
                adminPinInput.classList.add('shake-error');
                loginError.style.display = 'block';
                adminPinInput.value = ''; // Wipe the wrong guess
                
                // Remove the animation class so it can be triggered again
                setTimeout(() => adminPinInput.classList.remove('shake-error'), 300);
            }
        }).catch(err => {
            console.error("Firebase Auth Error: ", err);
        });
    }

    // Trigger verification on Button Click OR pressing the 'Enter' key
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', verifyAdminAccess);
    }
    if (adminPinInput) {
        adminPinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verifyAdminAccess();
        });
    }

    // 3. Admin Actions (Broadcast & Cancel)
    if (adminBroadcastBtn) {
        adminBroadcastBtn.addEventListener('click', () => {
            if (!adminInput) return;
            const val = adminInput.innerHTML.trim();
            if (val) {
                const now = new Date();
                const timeString = now.toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric', 
                    hour: 'numeric', 
                    minute: '2-digit', 
                    hour12: true 
                });
                
                db.ref('announcement').set({
                    message: val,
                    timestamp: timeString
                });
                
                adminInput.innerHTML = '';
                if (adminPanel) adminPanel.classList.remove('active');
            }
        });
    }

    if (adminCancelBtn) {
        adminCancelBtn.addEventListener('click', () => {
            if (adminInput) adminInput.innerHTML = ''; 
            if (adminPanel) adminPanel.classList.remove('active'); 
        });
    }

    // 4. Formatting Toolbar Logic (Real-Time Visuals)
    const formatBtns = document.querySelectorAll('.format-btn');
    if (formatBtns && adminInput) {
        formatBtns.forEach(btn => {
            // We use 'mousedown' and 'preventDefault' so the text box doesn't lose focus when you click a button
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault(); 
                
                const cmd = btn.dataset.cmd;
                let val = btn.dataset.val || null;

                if (cmd === 'createLink') {
                    const url = prompt("Enter the web link (URL):", "https://");
                    if (!url) return; 
                    val = url;
                }

                // Execute the visual formatting command directly on the highlighted text
                if (cmd === 'hiliteColor') {
                    // Fallback for different browsers (Chrome uses hiliteColor, Firefox uses backColor)
                    document.execCommand('hiliteColor', false, val) || document.execCommand('backColor', false, val);
                } else {
                    document.execCommand(cmd, false, val);
                }
                
                // If it's a link, try to force it to open in a new tab
                if (cmd === 'createLink') {
                    const sel = window.getSelection();
                    if(sel.rangeCount > 0) {
                        const linkNode = sel.focusNode.parentNode;
                        if(linkNode && linkNode.tagName === 'A') {
                            linkNode.setAttribute('target', '_blank');
                        }
                    }
                }
            });
        });
    }
}

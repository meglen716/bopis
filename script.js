// --- Dark Mode Toggle ---
const themeToggle = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme');

if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.checked = true;
}

themeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    }
});

// --- Hamburger Menu & Tab Switching ---
const hamburgerBtn = document.getElementById('hamburger-btn');
const navTabs = document.getElementById('nav-tabs');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

hamburgerBtn.addEventListener('click', () => {
    navTabs.classList.toggle('open');
});

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');

        if (window.innerWidth <= 768) {
            navTabs.classList.remove('open');
        }
    });
});

// --- Stay Awake Toggle (Wake Lock API & Persistence) ---
let wakeLock = null;
const wakeToggle = document.getElementById('wake-toggle');

// 1. The function to request the lock safely
async function requestWakeLock() {
    if (!('wakeLock' in navigator)) {
        console.warn('Wake Lock API not supported.');
        return;
    }
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('BOpis Wake Lock: ACTIVE');
    } catch (err) {
        console.error(`Wake Lock error: ${err.message}`);
        // If the browser blocks it, uncheck the toggle
        wakeToggle.checked = false;
        localStorage.setItem('stay_awake', 'off');
    }
}

// 2. Check memory when the page first loads
if (localStorage.getItem('stay_awake') === 'on') {
    wakeToggle.checked = true;
    requestWakeLock();
}

// 3. Handle manual clicks on the toggle
wakeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        localStorage.setItem('stay_awake', 'on');
        requestWakeLock();
    } else {
        localStorage.setItem('stay_awake', 'off');
        if (wakeLock !== null) {
            wakeLock.release();
            wakeLock = null;
            console.log('BOpis Wake Lock: DISABLED');
        }
    }
});

// 4. The Visibility Watcher (Restores lock after switching tabs)
document.addEventListener('visibilitychange', () => {

    if (document.visibilityState === 'visible' && localStorage.getItem('stay_awake') === 'on') {
        requestWakeLock(); // Instantly turn the lock back on!
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
            console.error(e);
        });
        return;
    }

    if (!audioCtx) return;
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

const workerBlob = new Blob([`
    let timer = null;
    self.onmessage = function(e) {
        if (e.data === 'start') {
            timer = setInterval(() => self.postMessage('tick'), 1000);
        } else if (e.data === 'stop') {
            clearInterval(timer);
        }
    };
`], { type: 'application/javascript' });
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

    if (diffMs > 0) {
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

    alarmStatus.innerText = `Alarm set for ${targetAlarmTime}`;
    setAlarmBtn.style.display = 'none';
    cancelAlarmBtn.style.display = 'inline-block';
    countdownDisplay.style.display = 'block';
    
    updateCountdownUI();
    timerWorker.postMessage('start');

    if (!isRestoring) {
        localStorage.setItem('saved_alarm', JSON.stringify({ 
            time, ringtone, customUrl, isLooping
        }));
    }
}

setAlarmBtn.addEventListener('click', () => {
    if (!alarmInput.value) return alert("Please select a time.");
    initiateAlarm(alarmInput.value, ringtoneSelect.value, customUrlInput.value, loopCheckbox.checked);
});

cancelAlarmBtn.addEventListener('click', () => {
    targetAlarmTime = null;
    timerWorker.postMessage('stop');
    localStorage.removeItem('saved_alarm');
    
    setAlarmBtn.style.display = 'block';
    cancelAlarmBtn.style.display = 'none';
    countdownDisplay.style.display = 'none';
    alarmStatus.innerText = "No alarm set.";
});

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
    
    alarmStatus.innerText = "⏰ ALARM RINGING! ⏰";
    countdownDisplay.style.display = 'none';
    cancelAlarmBtn.style.display = 'none';
    stopAlarmBtn.style.display = 'block';
    
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

stopAlarmBtn.addEventListener('click', () => {
    isRinging = false;
    clearInterval(toneInterval);
    customAudio.pause();
    customAudio.currentTime = 0;
    
    targetAlarmTime = null;
    alarmStatus.innerText = "No alarm set.";
    
    stopAlarmBtn.style.display = 'none';
    setAlarmBtn.style.display = 'block';
});

window.addEventListener('DOMContentLoaded', () => {
    const savedAlarm = localStorage.getItem('saved_alarm');
    if (savedAlarm) {
        const data = JSON.parse(savedAlarm);
        
        alarmInput.value = data.time;
        ringtoneSelect.value = data.ringtone;
        loopCheckbox.checked = data.isLooping !== undefined ? data.isLooping : true;
        
        if (data.ringtone === 'direct-url') {
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
    
    document.getElementById('digital-time').innerText = now.toLocaleTimeString('en-US', { hour12: true });
    document.getElementById('digital-date').innerText = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

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

stopWebcamBtn.addEventListener('click', () => {
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(err => console.log(err));
    }

    if (video.srcObject) {
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
            console.error(err);
        }
    }, 'image/png');
});


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

toggleNumpadBtn.addEventListener('click', () => {
    calcNumpad.classList.toggle('hidden');
    if (calcNumpad.classList.contains('hidden')) {
        toggleNumpadBtn.innerText = "Show On-Screen Numpad";
    } else {
        toggleNumpadBtn.innerText = "Hide On-Screen Numpad";
    }
});

function appendCalc(value) {
    currentCalc += value;
    calcDisplay.value = currentCalc;
}

function clearCalc() {
    currentCalc = "";
    calcDisplay.value = "";
}

// EVEN SPLIT LOGIC
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
        
        // perfectly divided
        if (R === 0) return `${numToWord(D)} ${Q}s`;
        
        // distribute remainder
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
            calcDisplay.value = result;
            return;
        }

        const sanitizedCalc = currentCalc.replace(/[^-()\d/*+.]/g, ''); 
        const result = eval(sanitizedCalc).toString();
        
        addHistoryItem(currentCalc, result);
        
        currentCalc = result;
        calcDisplay.value = currentCalc;
    } catch (err) {
        calcDisplay.value = "Error";
        currentCalc = "";
    }
}

function addHistoryItem(expression, result) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${expression}</span> <strong>= ${result}</strong>`;
    historyList.prepend(li);
}

clearHistoryBtn.addEventListener('click', () => {
    historyList.innerHTML = "";
});

document.addEventListener('keydown', (e) => {
    const calcPanel = document.getElementById('calculator');
    if (!calcPanel.classList.contains('active')) return;

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
        calcDisplay.value = currentCalc;
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
    const text = noteArea.value;
    const charCount = text.length;
    
    // Split by spaces/newlines to get word count, ignore empty strings
    const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    
    noteCounter.innerText = `Words: ${wordCount} | Characters: ${charCount} / 2000`;
}

// Load saved note and update the counter immediately
if (savedNote) {
    noteArea.value = savedNote;
    updateCounters();
}

// Listen for typing to save and update counters
noteArea.addEventListener('input', (e) => {
    localStorage.setItem('quick_notes', e.target.value);
    updateCounters();
});

// ==========================================
// 8. FIREBASE ANNOUNCEMENT BOARD
// ==========================================
const announcementText = document.getElementById('announcement-text');
const secretTrigger = document.getElementById('secret-trigger');
const adminPanel = document.getElementById('admin-panel');
const adminInput = document.getElementById('admin-input');
const adminBroadcastBtn = document.getElementById('admin-broadcast-btn');
const adminClearBtn = document.getElementById('admin-clear-btn');

// --- FIREBASE CONFIG (PASTE YOURS BELOW) ---
const firebaseConfig = {
    apiKey: "AIzaSyBcWb6Wy-W5DzjL7RVFFLLzOecHbawx1lg",
    authDomain: "bopis-d5300.firebaseapp.com",
    projectId: "bopis-d5300",
    storageBucket: "bopis-d5300.firebasestorage.app",
    messagingSenderId: "1045370937906",
    appId: "1:1045370937906:web:26c28ab8587f9d20ed122b"
};

// Initialize Firebase
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // 1. Live Listener (Direct UI update)
    db.ref('announcement/message').on('value', (snapshot) => {
        const msg = snapshot.val();
        if (announcementText) {
            announcementText.innerText = msg ? msg : "No active announcements.";
        }
    });

    // 2. Secret Admin Trigger (5-Tap)
    let taps = 0;
    let tapTimer;
    if (secretTrigger) {
        secretTrigger.addEventListener('click', () => {
            taps++;
            clearTimeout(tapTimer);
            if (taps >= 5) {
                if (adminPanel) adminPanel.classList.toggle('active');
                taps = 0;
            } else {
                tapTimer = setTimeout(() => taps = 0, 1500);
            }
        });
    }

    // 3. Admin Actions
    if (adminBroadcastBtn) {
        adminBroadcastBtn.addEventListener('click', () => {
            const val = adminInput.value.trim();
            if (val) {
                db.ref('announcement/message').set(val);
                adminInput.value = '';
                if (adminPanel) adminPanel.classList.remove('active');
            }
        });
    }

    if (adminClearBtn) {
        adminClearBtn.addEventListener('click', () => {
            db.ref('announcement/message').remove();
            if (adminPanel) adminPanel.classList.remove('active');
        });
    }
}
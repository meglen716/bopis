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

// --- Stay Awake Toggle (Wake Lock API) ---
let wakeLock = null;
const wakeToggle = document.getElementById('wake-toggle');

wakeToggle.addEventListener('change', async (e) => {
    if (e.target.checked) {
        if (!('wakeLock' in navigator)) {
            alert('Screen Wake Lock API not supported in this browser.');
            wakeToggle.checked = false;
            return;
        }
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => { wakeToggle.checked = false; });
        } catch (err) {
            alert(`Wake Lock error: ${err.message}`);
            wakeToggle.checked = false;
        }
    } else {
        if (wakeLock !== null) {
            wakeLock.release();
            wakeLock = null;
        }
    }
});

// --- 1. Alarm Clock (Background Throttling Bypass + Web Audio API) ---
const alarmInput = document.getElementById('alarm-time');
const ringtoneSelect = document.getElementById('alarm-ringtone');
const setAlarmBtn = document.getElementById('set-alarm-btn');
const stopAlarmBtn = document.getElementById('stop-alarm-btn');
const alarmStatus = document.getElementById('alarm-status');

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let isRinging = false;
let toneInterval = null;

function playTone(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === 'chime') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.2);
        gainNode.gain.setValueAtTime(1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1);
        osc.start(now);
        osc.stop(now + 1);
    } else if (type === 'siren') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.4);
        osc.frequency.linearRampToValueAtTime(400, now + 0.8);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
    }
}

ringtoneSelect.addEventListener('change', (e) => {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    playTone(e.target.value);
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

setAlarmBtn.addEventListener('click', () => {
    targetAlarmTime = alarmInput.value;
    if (!targetAlarmTime) return alert("Please select a time.");
    
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    alarmStatus.innerText = `Alarm set for ${targetAlarmTime}`;
    timerWorker.postMessage('start');
});

timerWorker.onmessage = function(e) {
    if (e.data === 'tick' && targetAlarmTime && !isRinging) {
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
    targetAlarmTime = null;
    alarmStatus.innerText = "⏰ ALARM RINGING! ⏰";
    
    setAlarmBtn.style.display = 'none';
    stopAlarmBtn.style.display = 'block';
    
    const selectedTone = ringtoneSelect.value;
    playTone(selectedTone);
    toneInterval = setInterval(() => playTone(selectedTone), 1000);
}

stopAlarmBtn.addEventListener('click', () => {
    isRinging = false;
    clearInterval(toneInterval);
    alarmStatus.innerText = "No alarm set.";
    setAlarmBtn.style.display = 'block';
    stopAlarmBtn.style.display = 'none';
});

// --- 2. Big Digital Clock & U.S Time Zones (Excel-Style) ---
const usStates = [
    { name: "Alabama", abbr: "AL", tz: "America/Chicago", tzName: "Central Time" },
    { name: "Alaska", abbr: "AK", tz: "America/Anchorage", tzName: "Alaska Time" },
    { name: "Arizona", abbr: "AZ", tz: "America/Phoenix", tzName: "Mountain Time (No DST)" },
    { name: "Arkansas", abbr: "AR", tz: "America/Chicago", tzName: "Central Time" },
    { name: "California", abbr: "CA", tz: "America/Los_Angeles", tzName: "Pacific Time" },
    { name: "Colorado", abbr: "CO", tz: "America/Denver", tzName: "Mountain Time" },
    { name: "Connecticut", abbr: "CT", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "Delaware", abbr: "DE", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "Florida", abbr: "FL", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "Georgia", abbr: "GA", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "Hawaii", abbr: "HI", tz: "Pacific/Honolulu", tzName: "Hawaii-Aleutian Time" },
    { name: "Idaho", abbr: "ID", tz: "America/Boise", tzName: "Mountain Time" },
    { name: "Illinois", abbr: "IL", tz: "America/Chicago", tzName: "Central Time" },
    { name: "Indiana", abbr: "IN", tz: "America/Indiana/Indianapolis", tzName: "Eastern Time" },
    { name: "Iowa", abbr: "IA", tz: "America/Chicago", tzName: "Central Time" },
    { name: "Kansas", abbr: "KS", tz: "America/Chicago", tzName: "Central Time" },
    { name: "Kentucky", abbr: "KY", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "Louisiana", abbr: "LA", tz: "America/Chicago", tzName: "Central Time" },
    { name: "Maine", abbr: "ME", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "Maryland", abbr: "MD", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "Massachusetts", abbr: "MA", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "Michigan", abbr: "MI", tz: "America/Detroit", tzName: "Eastern Time" },
    { name: "Minnesota", abbr: "MN", tz: "America/Chicago", tzName: "Central Time" },
    { name: "Mississippi", abbr: "MS", tz: "America/Chicago", tzName: "Central Time" },
    { name: "Missouri", abbr: "MO", tz: "America/Chicago", tzName: "Central Time" },
    { name: "Montana", abbr: "MT", tz: "America/Denver", tzName: "Mountain Time" },
    { name: "Nebraska", abbr: "NE", tz: "America/Chicago", tzName: "Central Time" },
    { name: "Nevada", abbr: "NV", tz: "America/Los_Angeles", tzName: "Pacific Time" },
    { name: "New Hampshire", abbr: "NH", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "New Jersey", abbr: "NJ", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "New Mexico", abbr: "NM", tz: "America/Denver", tzName: "Mountain Time" },
    { name: "New York", abbr: "NY", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "North Carolina", abbr: "NC", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "North Dakota", abbr: "ND", tz: "America/Chicago", tzName: "Central Time" },
    { name: "Ohio", abbr: "OH", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "Oklahoma", abbr: "OK", tz: "America/Chicago", tzName: "Central Time" },
    { name: "Oregon", abbr: "OR", tz: "America/Los_Angeles", tzName: "Pacific Time" },
    { name: "Pennsylvania", abbr: "PA", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "Rhode Island", abbr: "RI", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "South Carolina", abbr: "SC", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "South Dakota", abbr: "SD", tz: "America/Chicago", tzName: "Central Time" },
    { name: "Tennessee", abbr: "TN", tz: "America/Chicago", tzName: "Central Time" },
    { name: "Texas", abbr: "TX", tz: "America/Chicago", tzName: "Central Time" },
    { name: "Utah", abbr: "UT", tz: "America/Denver", tzName: "Mountain Time" },
    { name: "Vermont", abbr: "VT", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "Virginia", abbr: "VA", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "Washington", abbr: "WA", tz: "America/Los_Angeles", tzName: "Pacific Time" },
    { name: "West Virginia", abbr: "WV", tz: "America/New_York", tzName: "Eastern Time" },
    { name: "Wisconsin", abbr: "WI", tz: "America/Chicago", tzName: "Central Time" },
    { name: "Wyoming", abbr: "WY", tz: "America/Denver", tzName: "Mountain Time" }
];

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

// --- 3. Floating Webcam (Picture-in-Picture) ---
const video = document.getElementById('webcam-video');
const startWebcamBtn = document.getElementById('start-webcam-btn');
const pipBtn = document.getElementById('pip-btn');

startWebcamBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        pipBtn.disabled = false;
        startWebcamBtn.innerText = "Webcam Active";
    } catch (err) {
        alert("Could not access webcam. Please check permissions.");
    }
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


// --- 4. Calculator (History, Keyboard, Numpad Toggle) ---
const calcDisplay = document.getElementById('calc-display');
const calcNumpad = document.getElementById('calc-numpad');
const toggleNumpadBtn = document.getElementById('toggle-numpad-btn');
const historyList = document.getElementById('calc-history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');
let currentCalc = "";

// Numpad Toggle
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

function calculateResult() {
    if (!currentCalc) return;
    try {
        // Evaluate the string securely by stripping invalid characters just in case
        const sanitizedCalc = currentCalc.replace(/[^-()\d/*+.]/g, ''); 
        const result = eval(sanitizedCalc).toString();
        
        // Add to history
        addHistoryItem(currentCalc, result);
        
        // Update display
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
    // Prepend puts the newest calculations at the top
    historyList.prepend(li);
}

clearHistoryBtn.addEventListener('click', () => {
    historyList.innerHTML = "";
});

// Keyboard Support (Strictly isolated to calculator context)
document.addEventListener('keydown', (e) => {
    // Check if the Calculator tab is currently visible
    const calcPanel = document.getElementById('calculator');
    if (!calcPanel.classList.contains('active')) return;

    // Ignore if typing in an input inside Notes or Alarm
    if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.type === 'time') return;

    const key = e.key;

    // Numbers and Operators
    if (/[0-9\+\-\*\/\.]/.test(key)) {
        e.preventDefault(); 
        appendCalc(key);
    } 
    // Calculate
    else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculateResult();
    } 
    // Backspace (Delete last char)
    else if (key === 'Backspace') {
        e.preventDefault();
        currentCalc = currentCalc.slice(0, -1);
        calcDisplay.value = currentCalc;
    } 
    // Clear All
    else if (key === 'Escape' || key.toLowerCase() === 'c') {
        e.preventDefault();
        clearCalc();
    }
});

// --- 5. Quick Notes ---
const noteArea = document.getElementById('note-area');
const savedNote = localStorage.getItem('quick_notes');

if (savedNote) noteArea.value = savedNote;

noteArea.addEventListener('input', (e) => {
    localStorage.setItem('quick_notes', e.target.value);
});
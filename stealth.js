// ==========================================
// OPERATION: STEALTH MUSIC PLAYER (NODE.JS)
// ==========================================

const commandTerminal = document.getElementById('command-terminal');
const commandInput = document.getElementById('command-input');
const stealthAudio = document.getElementById('stealth-audio');

// IMPORTANT: Paste your daily Ngrok URL here (no trailing slash)
const NGROK_URL = "https://caucus-atrocious-broiler.ngrok-free.dev"; 

// Pressing the Tilde (~) key toggles the terminal
document.addEventListener('keydown', (e) => {
    // Prevent the terminal from opening if you are typing in Quick Notes or Calculator
    const activeTag = document.activeElement.tagName;
    const activeType = document.activeElement.type;
    if (activeTag === 'TEXTAREA' || (activeTag === 'INPUT' && (activeType === 'text' || activeType === 'url' || activeType === 'time'))) return;

    if (e.key === '`' || e.key === '~') {
        e.preventDefault(); 
        commandTerminal.classList.toggle('active');
        if (commandTerminal.classList.contains('active')) {
            commandInput.focus();
        } else {
            commandInput.value = '';
            commandInput.blur();
        }
    }
});

// Hitting Enter runs the command
commandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const command = commandInput.value.trim().toLowerCase();
        
        if (command.startsWith('play ')) {
            const query = command.replace('play ', '');
            // Send the search text to your home server
            stealthAudio.src = `${NGROK_URL}/stream?q=${encodeURIComponent(query)}`;
            stealthAudio.play();
        } 
        else if (command === 'stop' || command === 'pause') {
            stealthAudio.pause();
            stealthAudio.src = ''; 
        } 
        else if (command.startsWith('vol ')) {
            const vol = parseInt(command.replace('vol ', ''));
            if (vol >= 0 && vol <= 100) stealthAudio.volume = vol / 100;
        }

        // Auto-hide the terminal
        commandTerminal.classList.remove('active');
        commandInput.value = '';
        commandInput.blur();
    }
});
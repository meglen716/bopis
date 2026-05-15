# BOpis Dashboard v2.0 

**BOpis** is a sleek, modular, and highly optimized productivity dashboard designed specifically for back-office operations. It combines essential time-management utilities with stealthy, specialized tools—including a secure, backend-driven audio tunnel—all packaged in a fast, vanilla JavaScript interface.

## ✨ Features

*   **☕ Persistent Wake Lock:** Utilizes the Screen Wake Lock API with a custom "Visibility Watcher" to keep your screen active during long shifts, surviving tab-switches and page refreshes.
*   **⏰ Unkillable Alarm Clock:** Powered by a background Web Worker to bypass browser throttling. Supports standard tones and custom direct URLs (Dropbox/Discord).
*   **🌎 U.S. Time Zone Matrix:** A complete 50-state tracking grid synced dynamically to the local system clock.
*   **📸 Floating Spy-Cam:** Leverages the Picture-in-Picture (PiP) API to float a local webcam feed over other applications, featuring a one-click Canvas-to-Clipboard "Capture-to-Paste" tool.
*   **🧮 "Fair-Share" Calculator:** A fully functional numpad calculator featuring a custom `Split` algorithm that distributes items evenly and translates remainders into readable English text (e.g., "two 5s and one 6").
*   **📝 Quick Notes:** Distraction-free, auto-saving text area capped at 2000 characters with live dynamic word and character counters.
*   **🎵 Stealth Music Terminal:** A hidden command-line interface (triggered by `~`) that connects to a private Node.js backend. It bypasses corporate blocks by routing YouTube audio through the Piped proxy network and streaming the raw WebM audio directly to the dashboard via an Ngrok tunnel.

## 🏗️ Project Architecture

The project is built using vanilla HTML5, CSS3, and ES6+ JavaScript, utilizing "Separation of Concerns" for clean, modular code:

*   `index.html` - The core UI shell and layout.
*   `styles.css` - Responsive styling and dynamic Light/Dark mode theming.
*   `data.js` - Static data storage (houses the 50-state U.S. array).
*   `script.js` - Main frontend logic for the dashboard utilities.
*   `stealth.js` - Isolated frontend logic for the hidden command terminal.
*   `server.js` - The external backend Node.js server for audio extraction.

## 🚀 Deployment & Setup

### Part 1: GitHub Pages (Frontend)
The main BOpis dashboard is purely frontend and can be hosted completely free on GitHub Pages.
1. Upload `index.html`, `styles.css`, `script.js`, `data.js`, and `stealth.js` to your GitHub repository.
2. Go to your repository **Settings** > **Pages**.
3. Select the `main` branch and click **Save**.
4. Your BOpis Command Center is now live on the web!

### Part 2: Stealth Audio Server (Backend)
To use the hidden music terminal, you must run the backend server on a home PC.
1. Install [Node.js](https://nodejs.org/).
2. Place `server.js` in a local folder and open a terminal in that directory.
3. Install the required dependencies:
   ```bash
   npm install express cors yt-search axios
Start your secure Ngrok tunnel:

Bash
ngrok http 3000

5. Copy the generated Ngrok URL (e.g., `https://random-word.ngrok-free.dev`) and paste it into your `stealth.js` file on GitHub.
6. Start the Node server:
   ```bash
   node server.js
   
🎮 Usage
Once the frontend is loaded and the backend is listening:

Press the Tilde (~) key anywhere on the dashboard to drop down the hidden terminal.

Type play [song name or artist] and hit Enter.

The server will silently extract the audio and stream it to your dashboard. Type stop to kill the feed.

👨‍💻 Developer
Created by Meglen | May 2026
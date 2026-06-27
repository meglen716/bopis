Here is the updated, professional ReadMe reflecting all of the recent v2.5.0 architecture and feature additions.

---

# BOpis Dashboard v2.5.0

**BOpis** is a sleek, modular, and highly optimized productivity dashboard designed specifically for back-office operations. It combines essential time-management, productivity utilities, and real-time secure communications into a fast, responsive, vanilla JavaScript interface.

## Features

* **Secure Live Communications:** A covert, Firebase-powered real-time chat module featuring session persistence and a "Dead Man's Switch" that automatically terminates sessions after 60 minutes of inactivity.
* **Master Admin Controls:** Granular user access management (approve/deny/revoke/purge), message soft-deletes (voiding), and master server controls for exporting complete text logs or permanently wiping the database.
* **Real-Time Announcements:** A live bulletin board featuring a custom rich-text editor. Includes a dynamic, theme-adaptive highlighting engine that guarantees text readability across both Light and Dark modes.
* **Context-Aware UI:** A terminal-style typewriter header that dynamically greets authenticated users based on the local time of day, alongside seamless Light/Dark mode toggling.
* **Persistent Wake Lock:** Utilizes the Screen Wake Lock API with a custom "Visibility Watcher" to keep your screen active during long shifts, surviving tab-switches and page refreshes.
* **Unkillable Alarm Clock:** Powered by a background Web Worker to bypass browser throttling. Supports standard tones and custom direct URLs.
* **U.S. Time Zone Matrix:** A complete 50-state tracking grid synced dynamically to the local system clock.
* **Floating Camera Overlay:** Leverages the Picture-in-Picture (PiP) API to float a local webcam feed over other applications, featuring a one-click Canvas-to-Clipboard "Capture-to-Paste" tool.
* **"Fair-Share" Calculator:** A fully functional numpad calculator featuring a custom `Split` algorithm that distributes items evenly and translates remainders into readable English text (e.g., "two 5s and one 6").
* **Quick Notes:** Distraction-free, auto-saving text area capped at 2000 characters with live dynamic word and character counters.

## Project Architecture

The project is built using vanilla HTML5, CSS3, and ES6+ JavaScript, utilizing "Separation of Concerns" for clean, modular code:

* `index.html` - The core UI shell and layout.
* `styles.css` - Responsive styling and dynamic Light/Dark mode theming.
* `data.js` - Static data storage (houses the 50-state U.S. array).
* `script.js` - Main frontend logic for the dashboard utilities and UI state.
* `chat.js` - Backend integration for Firebase authentication, real-time database syncing, and session management.

## Developer

Created by Meglen | June 2026
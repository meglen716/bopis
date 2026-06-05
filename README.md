# BOpis Dashboard v2.0

**BOpis** is a sleek, modular, and highly optimized productivity dashboard designed specifically for back-office operations. It combines essential time-management and productivity utilities into a fast, responsive, vanilla JavaScript interface.

## Features

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
* `script.js` - Main frontend logic for the dashboard utilities.

## Deployment & Setup

The BOpis dashboard is purely frontend and can be hosted completely free on GitHub Pages.

1. Upload `index.html`, `styles.css`, `script.js`, and `data.js` to your GitHub repository.
2. Navigate to your repository **Settings** > **Pages**.
3. Select the `main` branch as the source and click **Save**.
4. Your BOpis Command Center is now live on the web.

## Developer

Created by Meglen | May 2026

// ==========================================
// FLOATING WEBCAM ENGINE
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const fab = document.getElementById('webcam-fab');
    const webcamWindow = document.getElementById('webcam-window');
    const webcamVideo = document.getElementById('webcam-video');
    const closeBtn = document.getElementById('webcam-close-btn');
    const header = document.getElementById('webcam-header');

    const captureBtn = document.getElementById('webcam-capture-btn');
    const pipBtn = document.getElementById('webcam-pip-btn');

    let stream = null;

    // --- Camera Toggle Logic ---
    async function toggleWebcam() {
        if (webcamWindow.style.display === 'none') {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                webcamVideo.srcObject = stream;
                
                webcamWindow.style.display = 'flex';
                fab.classList.add('cam-active');
                fab.innerHTML = '<i class="bi bi-camera-video-off"></i>';
                fab.title = "Turn Off Camera";
            } catch (err) {
                console.error("Camera error:", err);
                alert("Camera access denied or unavailable. Please check your browser permissions.");
            }
        } else {
            closeWebcam();
        }
    }

    function closeWebcam() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        webcamVideo.srcObject = null;
        
        webcamWindow.style.display = 'none';
        fab.classList.remove('cam-active');
        fab.innerHTML = '<i class="bi bi-camera-video"></i>';
        fab.title = "Toggle Live Camera";
    }

    fab.addEventListener('click', toggleWebcam);
    closeBtn.addEventListener('click', closeWebcam);

    // --- Drag and Drop Physics ---
    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        // Calculate where the mouse clicked relative to the window's top-left corner
        const rect = webcamWindow.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            // Un-anchor the bottom/right so it responds to top/left coordinates cleanly
            webcamWindow.style.bottom = 'auto';
            webcamWindow.style.right = 'auto';
            
            webcamWindow.style.left = `${e.clientX - offsetX}px`;
            webcamWindow.style.top = `${e.clientY - offsetY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // --- 1. Snapshot to Clipboard Engine ---
    captureBtn.addEventListener('click', async () => {
        if (!stream || !webcamVideo.videoWidth) return;
        
        // Create an invisible canvas to grab the frame
        const canvas = document.createElement('canvas');
        canvas.width = webcamVideo.videoWidth;
        canvas.height = webcamVideo.videoHeight;
        const ctx = canvas.getContext('2d');
        
        // Because our video has CSS transform: scaleX(-1) to act like a mirror,
        // we need to flip the canvas context so the copied image isn't backward!
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        
        // Draw the current video frame onto the canvas
        ctx.drawImage(webcamVideo, 0, 0, canvas.width, canvas.height);
        
        // Convert the canvas to a PNG and copy to clipboard
        canvas.toBlob(async (blob) => {
            try {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                
                // UI Feedback: Flash the camera button green
                const icon = captureBtn.querySelector('i');
                icon.style.color = '#28a745'; 
                setTimeout(() => icon.style.color = '', 800);
            } catch (err) {
                console.error("Clipboard error:", err);
                alert("Could not copy image. Check clipboard permissions in your browser.");
            }
        }, 'image/png');
    });

    // --- 2. Native True PiP Engine ---
    pipBtn.addEventListener('click', async () => {
        if (!stream) return;
        
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (document.pictureInPictureEnabled) {
                await webcamVideo.requestPictureInPicture();
            }
        } catch (err) {
            console.error("PiP error:", err);
            alert("Native Picture-in-Picture failed or is not supported by your browser.");
        }
    });
});
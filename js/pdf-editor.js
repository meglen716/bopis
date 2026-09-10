// ==========================================
// BOPIS PDF EDITOR MODULE (Fonts & Styling)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    if (window.pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // --- DOM Elements ---
    const fileInput = document.getElementById('pdf-file-input');
    const uploadBtn = document.getElementById('pdf-upload-btn');
    const toolsContainer = document.getElementById('pdf-tools');
    const placeholder = document.getElementById('pdf-placeholder');
    const stage = document.getElementById('pdf-stage');
    const sidebar = document.getElementById('pdf-sidebar');
    const scrollArea = document.getElementById('pdf-scroll-area');
    const bottomBar = document.getElementById('pdf-bottom-bar');
    
    const renderCanvas = document.getElementById('pdf-render-canvas');
    const floatingLayer = document.getElementById('pdf-floating-layer');
    const renderCtx = renderCanvas.getContext('2d');

    // Tool Buttons
    const modeDrawBtn = document.getElementById('pdf-mode-draw');
    const modeTextBtn = document.getElementById('pdf-mode-text');
    const clearDrawBtn = document.getElementById('pdf-clear-draw');
    const cancelPdfBtn = document.getElementById('pdf-cancel-btn');
    const prevPageBtn = document.getElementById('pdf-prev-page');
    const nextPageBtn = document.getElementById('pdf-next-page');
    const pageNumSpan = document.getElementById('pdf-page-num');
    const saveBtn = document.getElementById('pdf-save-btn');

    // Zoom & Properties
    const zoomOutBtn = document.getElementById('pdf-zoom-out');
    const zoomInBtn = document.getElementById('pdf-zoom-in');
    const zoomFitBtn = document.getElementById('pdf-zoom-fit');
    const zoomValSpan = document.getElementById('pdf-zoom-val');
    
    // Formatting Elements
    const drawProps = document.getElementById('pdf-draw-props');
    const brushColorSelect = document.getElementById('pdf-brush-color');
    const brushSizeSelect = document.getElementById('pdf-brush-size');
    
    const textProps = document.getElementById('pdf-text-props');
    const textColorSelect = document.getElementById('pdf-text-color');
    const textFontSelect = document.getElementById('pdf-text-font');
    const textSizeSelect = document.getElementById('pdf-text-size');

    // Signature Modal
    const sigModal = document.getElementById('sig-modal-overlay');
    const sigPadCanvas = document.getElementById('sig-pad-canvas');
    const sigPadCtx = sigPadCanvas.getContext('2d');
    const sigBtnCancel = document.getElementById('sig-modal-cancel');
    const sigBtnClear = document.getElementById('sig-modal-clear');
    const sigBtnInsert = document.getElementById('sig-modal-insert');

    // --- State Variables ---
    let originalPdfBytes = null;
    let pdfDoc = null;
    let currentPageNum = 1;
    let activeMode = 'none'; 
    let currentScale = 1.0;
    let isFitToWidth = true; 
    let pageVault = {};

    // --- File Upload ---
    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || file.type !== 'application/pdf') return;

        originalPdfBytes = await file.arrayBuffer();
        
        // THE FIX: Use .slice(0) to pass a COPY of the data to pdf.js so it doesn't empty the original!
        pdfDoc = await pdfjsLib.getDocument({ data: originalPdfBytes.slice(0) }).promise;
        
        currentPageNum = 1;
        isFitToWidth = true; 
        pageVault = {}; 
        
        placeholder.style.display = 'none';
        stage.style.display = 'block';
        toolsContainer.style.display = 'flex';
        sidebar.style.display = 'flex';
        bottomBar.style.display = 'flex';

        await renderPage(currentPageNum);
    });

    // --- Core Rendering & Vault Sync ---
    async function renderPage(num) {
        const page = await pdfDoc.getPage(num);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        
        if (isFitToWidth) {
            const containerWidth = scrollArea.clientWidth - 40; 
            currentScale = containerWidth / unscaledViewport.width;
            zoomValSpan.innerText = "Fit";
            zoomFitBtn.style.color = "var(--primary-color)";
        } else {
            zoomValSpan.innerText = Math.round(currentScale * 100) + "%";
            zoomFitBtn.style.color = "var(--text-color)";
        }

        const viewport = page.getViewport({ scale: currentScale });
        renderCanvas.width = viewport.width;
        renderCanvas.height = viewport.height;

        await page.render({ canvasContext: renderCtx, viewport: viewport }).promise;
        
        pageNumSpan.innerText = `Page ${num} / ${pdfDoc.numPages}`;
        rebuildFloatingLayer(num);
    }

    function rebuildFloatingLayer(pageNum) {
        floatingLayer.innerHTML = ''; 
        if (!pageVault[pageNum]) pageVault[pageNum] = [];

        pageVault[pageNum].forEach(anno => {
            const wrapper = document.createElement('div');
            wrapper.className = 'floating-annotation';
            wrapper.dataset.id = anno.id;
            wrapper.style.left = (anno.x * currentScale) + 'px';
            wrapper.style.top = (anno.y * currentScale) + 'px';

            const delBtn = document.createElement('div');
            delBtn.className = 'delete-anno-btn';
            delBtn.innerHTML = '&times;';
            wrapper.appendChild(delBtn);

            if (anno.type === 'text') {
                const textDiv = document.createElement('div');
                textDiv.className = 'floating-text-content';
                textDiv.contentEditable = "true";
                textDiv.style.color = anno.color;
                textDiv.style.fontFamily = anno.font;
                textDiv.style.fontSize = (anno.size * currentScale) + 'px';
                textDiv.innerText = anno.text;
                
                textDiv.addEventListener('input', () => { anno.text = textDiv.innerText; });
                wrapper.appendChild(textDiv);
            } 
            else if (anno.type === 'signature') {
                const img = document.createElement('img');
                img.src = anno.imgData;
                img.style.width = (anno.width * currentScale) + 'px';
                img.style.height = (anno.height * currentScale) + 'px';
                img.draggable = false;
                wrapper.appendChild(img);
            }

            floatingLayer.appendChild(wrapper);
        });
    }

    // --- Tool Switching ---
    function setMode(mode) {
        activeMode = activeMode === mode ? 'none' : mode;
        modeTextBtn.classList.toggle('active-tool', activeMode === 'text');
        
        // Dynamic UI: Swap property menus based on the active tool
        if (drawProps) drawProps.style.display = activeMode === 'draw' ? 'flex' : 'none';
        if (textProps) textProps.style.display = activeMode === 'text' ? 'flex' : 'none';
    }

    modeTextBtn.addEventListener('click', () => setMode('text'));
    
    clearDrawBtn.addEventListener('click', () => {
        pageVault[currentPageNum] = [];
        rebuildFloatingLayer(currentPageNum);
    });

    // --- Cancel & Discard Document ---
    cancelPdfBtn.addEventListener('click', () => {
        // Extra safeguard since this deletes all unsaved work
        if (!confirm("Are you sure you want to discard this document and all your edits?")) return;

        // 1. Wipe the memory vault and active document
        originalPdfBytes = null;
        pdfDoc = null;
        pageVault = {};
        currentPageNum = 1;
        fileInput.value = ""; // Resets the input so you can re-upload the same file if needed

        // 2. Clear the visual DOM
        renderCtx.clearRect(0, 0, renderCanvas.width, renderCanvas.height);
        floatingLayer.innerHTML = '';
        setMode('none');

        // 3. Hide the workspace and bring back the upload placeholder
        stage.style.display = 'none';
        toolsContainer.style.display = 'none';
        sidebar.style.display = 'none';
        placeholder.style.display = 'block';
        bottomBar.style.display = 'none';
    });

    // --- Text Tool (Spawn on click) ---
    stage.addEventListener('mousedown', (e) => {
        if (activeMode !== 'text') return;
        if (e.target.closest('.floating-annotation')) return; 

        const rect = floatingLayer.getBoundingClientRect();
        const unscaledX = (e.clientX - rect.left) / currentScale;
        const unscaledY = (e.clientY - rect.top) / currentScale;

        const newAnno = {
            id: 'anno_' + Date.now(),
            type: 'text',
            x: unscaledX,
            y: unscaledY,
            color: textColorSelect.value,
            size: parseFloat(textSizeSelect.value),
            font: textFontSelect.value,
            text: 'Type here...'
        };

        if (!pageVault[currentPageNum]) pageVault[currentPageNum] = [];
        pageVault[currentPageNum].push(newAnno);
        
        rebuildFloatingLayer(currentPageNum);
        setMode('none'); 
    });

    // --- Drag and Drop Engine ---
    let activeDragEl = null;
    let dragStartX, dragStartY, initialLeft, initialTop;

    floatingLayer.addEventListener('mousedown', (e) => {
        if (e.target.closest('.delete-anno-btn')) {
            const wrapper = e.target.closest('.floating-annotation');
            const annoId = wrapper.dataset.id;
            pageVault[currentPageNum] = pageVault[currentPageNum].filter(a => a.id !== annoId);
            wrapper.remove();
            return;
        }

        const target = e.target.closest('.floating-annotation');
        if (target && e.target.tagName !== 'DIV' || (e.target.tagName === 'DIV' && !e.target.isContentEditable)) {
            activeDragEl = target;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            initialLeft = parseFloat(target.style.left) || 0;
            initialTop = parseFloat(target.style.top) || 0;
            target.classList.add('dragging');
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (activeDragEl) {
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            activeDragEl.style.left = (initialLeft + dx) + 'px';
            activeDragEl.style.top = (initialTop + dy) + 'px';
        }
    });

    window.addEventListener('mouseup', () => {
        if (activeDragEl) {
            activeDragEl.classList.remove('dragging');
            const annoId = activeDragEl.dataset.id;
            const anno = pageVault[currentPageNum].find(a => a.id === annoId);
            if (anno) {
                anno.x = parseFloat(activeDragEl.style.left) / currentScale;
                anno.y = parseFloat(activeDragEl.style.top) / currentScale;
            }
            activeDragEl = null;
        }
    });

    // --- Signature Pad Engine ---
    let isSigning = false;
    
    modeDrawBtn.addEventListener('click', () => {
        setMode('draw');
        sigModal.style.display = 'flex';
        sigPadCtx.clearRect(0, 0, sigPadCanvas.width, sigPadCanvas.height);
    });

    sigBtnCancel.addEventListener('click', () => { sigModal.style.display = 'none'; setMode('none'); });
    sigBtnClear.addEventListener('click', () => sigPadCtx.clearRect(0, 0, sigPadCanvas.width, sigPadCanvas.height));

    sigPadCanvas.addEventListener('mousedown', (e) => {
        isSigning = true;
        sigPadCtx.beginPath();
        sigPadCtx.moveTo(e.offsetX, e.offsetY);
        sigPadCtx.strokeStyle = brushColorSelect.value;
        sigPadCtx.lineWidth = parseFloat(brushSizeSelect.value) * 1.5;
        sigPadCtx.lineCap = 'round';
        sigPadCtx.lineJoin = 'round';
    });

    sigPadCanvas.addEventListener('mousemove', (e) => {
        if (isSigning) {
            sigPadCtx.lineTo(e.offsetX, e.offsetY);
            sigPadCtx.stroke();
        }
    });

    sigPadCanvas.addEventListener('mouseup', () => isSigning = false);
    sigPadCanvas.addEventListener('mouseleave', () => isSigning = false);

    sigBtnInsert.addEventListener('click', () => {
        const sigData = sigPadCanvas.toDataURL('image/png');
        const rect = floatingLayer.getBoundingClientRect();
        const unscaledX = (rect.width / 2 - 100) / currentScale; 
        const unscaledY = (rect.height / 2 - 50) / currentScale;

        const newAnno = {
            id: 'anno_' + Date.now(),
            type: 'signature',
            x: unscaledX,
            y: unscaledY,
            width: 250, 
            height: 100, 
            imgData: sigData
        };

        if (!pageVault[currentPageNum]) pageVault[currentPageNum] = [];
        pageVault[currentPageNum].push(newAnno);
        
        rebuildFloatingLayer(currentPageNum);
        sigModal.style.display = 'none';
        setMode('none');
    });

    // --- PDF Export Logic ---
    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return PDFLib.rgb(r, g, b);
    }

    saveBtn.addEventListener('click', async () => {
        if (!originalPdfBytes) return;

        // UI Feedback: Turn the download icon into a loading spinner
        const originalIcon = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>';
        saveBtn.style.pointerEvents = 'none';
        saveBtn.style.opacity = '0.7';

        try {
            const pdfDocLib = await PDFLib.PDFDocument.load(originalPdfBytes);
            const pages = pdfDocLib.getPages();
            
            // Load the Standard PDF Fonts
            const helveticaFont = await pdfDocLib.embedFont(PDFLib.StandardFonts.Helvetica);
            const timesFont = await pdfDocLib.embedFont(PDFLib.StandardFonts.TimesRoman);
            const courierFont = await pdfDocLib.embedFont(PDFLib.StandardFonts.Courier);

            const getPdfFont = (fontName) => {
                if (fontName === 'Times New Roman') return timesFont;
                if (fontName === 'Consolas') return courierFont;
                return helveticaFont; 
            };

            for (let i = 1; i <= pages.length; i++) {
                if (pageVault[i] && pageVault[i].length > 0) {
                    const page = pages[i - 1];
                    const { height } = page.getSize();

                    for (const anno of pageVault[i]) {
                        if (anno.type === 'text') {
                            const pdfY = height - anno.y - (anno.size * 0.8) - 8; 
                            
                            page.drawText(anno.text, {
                                x: anno.x + 8,
                                y: pdfY,
                                size: anno.size,
                                font: getPdfFont(anno.font),
                                color: hexToRgb(anno.color),
                            });
                        } 
                        else if (anno.type === 'signature') {
                            const pngImage = await pdfDocLib.embedPng(anno.imgData);
                            const pdfY = height - anno.y - anno.height - 8; 

                            page.drawImage(pngImage, {
                                x: anno.x + 8,
                                y: pdfY,
                                width: anno.width,
                                height: anno.height,
                            });
                        }
                    }
                }
            }

            const modifiedPdfBytes = await pdfDocLib.save();
            const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Signed_BOpis_${Date.now()}.pdf`;
            link.click();
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error("PDF Save Error:", error);
            alert("There was an error saving the document. Please check the console for details.");
        } finally {
            // Revert the button back to the download icon
            saveBtn.innerHTML = originalIcon;
            saveBtn.style.pointerEvents = 'auto';
            saveBtn.style.opacity = '1';
        }
    });
    // --- Navigation & Zoom Logic ---
    zoomInBtn.addEventListener('click', () => { isFitToWidth = false; currentScale += 0.25; if (currentScale > 3.0) currentScale = 3.0; renderPage(currentPageNum); });
    zoomOutBtn.addEventListener('click', () => { isFitToWidth = false; currentScale -= 0.25; if (currentScale < 0.5) currentScale = 0.5; renderPage(currentPageNum); });
    zoomFitBtn.addEventListener('click', () => { isFitToWidth = true; renderPage(currentPageNum); });
    window.addEventListener('resize', () => { if (stage.style.display === 'block' && isFitToWidth) renderPage(currentPageNum); });
    
    prevPageBtn.addEventListener('click', () => { if (currentPageNum > 1) { currentPageNum--; renderPage(currentPageNum); } });
    nextPageBtn.addEventListener('click', () => { if (currentPageNum < pdfDoc.numPages) { currentPageNum++; renderPage(currentPageNum); } });
});
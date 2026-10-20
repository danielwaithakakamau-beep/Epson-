/**
 * Daniel Print Hub
 * Print · Document Scan · QR / Barcode
 */
(() => {
  // ---------- State ----------
  let selectedFile = null;
  let currentMode = 'local';
  let currentSection = 'print';
  let scanStream = null;
  let scannedPages = []; // data URLs
  let html5QrCode = null;
  let lastQrResult = null;

  // ---------- DOM ----------
  const logEl = document.getElementById('log');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const filePreview = document.getElementById('filePreview');
  const fileNameEl = document.getElementById('fileName');
  const fileSizeEl = document.getElementById('fileSize');
  const removeFileBtn = document.getElementById('removeFile');

  const sectionTabs = document.querySelectorAll('.section-tab');
  const sectionPrint = document.getElementById('sectionPrint');
  const sectionScan = document.getElementById('sectionScan');
  const sectionQr = document.getElementById('sectionQr');

  const tabs = document.querySelectorAll('.tab');
  const panels = {
    local: document.getElementById('panelLocal'),
    email: document.getElementById('panelEmail'),
    api: document.getElementById('panelApi'),
  };

  const btnLocalPrint = document.getElementById('btnLocalPrint');
  const btnEmailPrint = document.getElementById('btnEmailPrint');
  const btnApiPrint = document.getElementById('btnApiPrint');
  const btnCopyEmail = document.getElementById('btnCopyEmail');
  const btnSaveConfig = document.getElementById('btnSaveConfig');
  const printerEmailInput = document.getElementById('printerEmail');
  const clientIdInput = document.getElementById('clientId');
  const clientSecretInput = document.getElementById('clientSecret');
  const apiKeyInput = document.getElementById('apiKey');
  const deviceIdInput = document.getElementById('deviceId');

  // Scan
  const scanVideo = document.getElementById('scanVideo');
  const scanCanvas = document.getElementById('scanCanvas');
  const scanPlaceholder = document.getElementById('scanPlaceholder');
  const scanThumbs = document.getElementById('scanThumbs');
  const btnStartScan = document.getElementById('btnStartScan');
  const btnCapture = document.getElementById('btnCapture');
  const btnStopScan = document.getElementById('btnStopScan');
  const btnPrintScans = document.getElementById('btnPrintScans');
  const btnClearScans = document.getElementById('btnClearScans');

  // QR
  const btnStartQr = document.getElementById('btnStartQr');
  const btnStopQr = document.getElementById('btnStopQr');
  const qrResult = document.getElementById('qrResult');
  const qrType = document.getElementById('qrType');
  const qrText = document.getElementById('qrText');
  const btnCopyQr = document.getElementById('btnCopyQr');
  const btnPrintQr = document.getElementById('btnPrintQr');
  const btnOpenQr = document.getElementById('btnOpenQr');

  // ---------- Helpers ----------
  function log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logEl.prepend(entry);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function updatePrintButtons() {
    const hasFile = !!selectedFile;
    btnLocalPrint.disabled = !hasFile;
    btnEmailPrint.disabled = !hasFile || !printerEmailInput.value.trim();
    btnApiPrint.disabled = !hasFile;
  }

  function setFile(file) {
    selectedFile = file;
    if (file) {
      fileNameEl.textContent = file.name;
      fileSizeEl.textContent = formatSize(file.size);
      filePreview.classList.remove('hidden');
      dropzone.style.display = 'none';
      log(`File selected: ${file.name}`, 'success');
    } else {
      filePreview.classList.add('hidden');
      dropzone.style.display = 'block';
    }
    updatePrintButtons();
  }

  // ---------- Section switching ----------
  sectionTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const section = tab.dataset.section;
      currentSection = section;
      sectionTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      sectionPrint.classList.toggle('hidden', section !== 'print');
      sectionScan.classList.toggle('hidden', section !== 'scan');
      sectionQr.classList.toggle('hidden', section !== 'qr');

      // Stop cameras when leaving sections
      if (section !== 'scan') stopScanCamera();
      if (section !== 'qr') stopQrScanner();

      log(`Switched to ${section === 'print' ? 'Print' : section === 'scan' ? 'Document Scan' : 'QR / Barcode'}`);
    });
  });

  // ---------- Print mode tabs ----------
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentMode = tab.dataset.mode;
      Object.keys(panels).forEach((key) => {
        panels[key].classList.toggle('hidden', key !== currentMode);
      });
    });
  });

  // ---------- File handling ----------
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files?.[0]) setFile(fileInput.files[0]);
  });
  removeFileBtn.addEventListener('click', () => {
    fileInput.value = '';
    setFile(null);
  });
  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  });

  // ---------- Local print ----------
  btnLocalPrint.addEventListener('click', () => {
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    const w = window.open(url, '_blank');
    if (w) {
      w.addEventListener('load', () => setTimeout(() => w.print(), 400));
      log('Print dialog opened', 'success');
    } else {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 1000);
      };
      log('Print dialog opened', 'success');
    }
  });

  // ---------- Email print ----------
  printerEmailInput.addEventListener('input', updatePrintButtons);
  btnEmailPrint.addEventListener('click', () => {
    const email = printerEmailInput.value.trim();
    if (!selectedFile || !email) return;
    const subject = encodeURIComponent(`Print: ${selectedFile.name}`);
    const body = encodeURIComponent(`Please print the attached file.\n\nSent from Daniel Print Hub`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    log(`Opened email to ${email}. Attach the file and send.`, 'info');
  });
  btnCopyEmail.addEventListener('click', async () => {
    const email = printerEmailInput.value.trim();
    if (!email) return log('Enter printer email first', 'error');
    try {
      await navigator.clipboard.writeText(email);
      log('Email copied', 'success');
    } catch {
      log('Could not copy', 'error');
    }
  });

  // ---------- API config ----------
  function loadConfig() {
    try {
      const cfg = JSON.parse(localStorage.getItem('danielPrintHubConfig') || '{}');
      if (cfg.clientId) clientIdInput.value = cfg.clientId;
      if (cfg.clientSecret) clientSecretInput.value = cfg.clientSecret;
      if (cfg.apiKey) apiKeyInput.value = cfg.apiKey;
      if (cfg.deviceId) deviceIdInput.value = cfg.deviceId;
      if (cfg.printerEmail) printerEmailInput.value = cfg.printerEmail;
    } catch (_) {}
  }
  btnSaveConfig.addEventListener('click', () => {
    localStorage.setItem(
      'danielPrintHubConfig',
      JSON.stringify({
        clientId: clientIdInput.value.trim(),
        clientSecret: clientSecretInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        deviceId: deviceIdInput.value.trim(),
        printerEmail: printerEmailInput.value.trim(),
      })
    );
    log('Config saved', 'success');
  });
  btnApiPrint.addEventListener('click', () => {
    if (!selectedFile) return;
    if (!clientIdInput.value || !apiKeyInput.value || !deviceIdInput.value) {
      return log('Fill in API credentials and device ID', 'error');
    }
    log('API flow requires a backend proxy (see docs). Config is saved.', 'info');
  });

  // ========== DOCUMENT SCANNER ==========
  async function startScanCamera() {
    try {
      stopScanCamera();
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      scanVideo.srcObject = scanStream;
      scanVideo.setAttribute('playsinline', 'true');
      scanVideo.setAttribute('webkit-playsinline', 'true');
      scanVideo.muted = true;

      await new Promise((resolve) => {
        if (scanVideo.readyState >= 1) resolve();
        else scanVideo.onloadedmetadata = () => resolve();
      });
      try { await scanVideo.play(); } catch (_) {}

      scanVideo.classList.remove('hidden');
      scanPlaceholder.classList.add('hidden');
      btnStartScan.classList.add('hidden');
      btnCapture.classList.remove('hidden');
      btnStopScan.classList.remove('hidden');
      log('Camera started – point at document', 'success');
    } catch (err) {
      log('Camera error: ' + (err.message || 'permission denied'), 'error');
      alert('Camera access is required for scanning. Please allow camera permission.');
    }
  }

  function stopScanCamera() {
    if (scanStream) {
      scanStream.getTracks().forEach((t) => t.stop());
      scanStream = null;
    }
    scanVideo.srcObject = null;
    scanVideo.classList.add('hidden');
    scanPlaceholder.classList.remove('hidden');
    btnStartScan.classList.remove('hidden');
    btnCapture.classList.add('hidden');
    btnStopScan.classList.add('hidden');
  }

  function capturePage() {
    if (!scanStream) return;
    const video = scanVideo;
    const canvas = scanCanvas;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    scannedPages.push(dataUrl);
    renderThumbs();
    log(`Page ${scannedPages.length} captured`, 'success');
    // Open editor for the new page
    openEditor(scannedPages.length - 1);
  }

  function renderThumbs() {
    scanThumbs.innerHTML = '';
    scannedPages.forEach((url, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'thumb-wrap';
      const img = document.createElement('img');
      img.src = url;
      img.alt = `Page ${i + 1}`;
      img.onclick = () => openEditor(i);
      const rm = document.createElement('button');
      rm.className = 'thumb-remove';
      rm.textContent = '×';
      rm.title = 'Remove';
      rm.onclick = (e) => {
        e.stopPropagation();
        scannedPages.splice(i, 1);
        renderThumbs();
      };
      const editLbl = document.createElement('div');
      editLbl.className = 'thumb-edit';
      editLbl.textContent = 'Edit';
      wrap.appendChild(img);
      wrap.appendChild(rm);
      wrap.appendChild(editLbl);
      scanThumbs.appendChild(wrap);
    });
    const has = scannedPages.length > 0;
    btnPrintScans.classList.toggle('hidden', !has);
    btnClearScans.classList.toggle('hidden', !has);
    btnPrintScans.disabled = !has;
  }

  function printScannedPages() {
    if (!scannedPages.length) return;
    const w = window.open('', '_blank');
    if (!w) {
      log('Popup blocked – allow popups to print', 'error');
      return;
    }
    const pages = scannedPages
      .map(
        (url, i) =>
          `<div style="page-break-after:always;text-align:center;margin:0;padding:0;">
            <img src="${url}" style="max-width:100%;max-height:100vh;object-fit:contain;" alt="Page ${i + 1}" />
          </div>`
      )
      .join('');
    w.document.write(`<!DOCTYPE html><html><head><title>Scanned Document</title>
      <style>body{margin:0;background:#fff} @media print { img { max-height: 100vh; } }</style>
      </head><body>${pages}</body></html>`);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 600);
    log(`Printing ${scannedPages.length} page(s)`, 'success');
  }

  btnStartScan.addEventListener('click', startScanCamera);
  btnCapture.addEventListener('click', capturePage);
  btnStopScan.addEventListener('click', () => {
    stopScanCamera();
    log('Camera stopped');
  });
  btnPrintScans.addEventListener('click', printScannedPages);
  btnClearScans.addEventListener('click', () => {
    scannedPages = [];
    renderThumbs();
    log('Scanned pages cleared');
  });

  // ========== QR / BARCODE SCANNER ==========
  async function startQrScanner() {
    if (typeof Html5Qrcode === 'undefined') {
      log('QR library not loaded. Check internet connection.', 'error');
      return;
    }
    try {
      stopQrScanner();
      html5QrCode = new Html5Qrcode('qrReader');
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        onQrSuccess,
        () => {} // ignore continuous "not found" messages
      );
      btnStartQr.classList.add('hidden');
      btnStopQr.classList.remove('hidden');
      log('QR / Barcode scanner started', 'success');
    } catch (err) {
      log('Scanner error: ' + (err.message || err), 'error');
      alert('Camera access is required. Please allow camera permission.');
    }
  }

  function onQrSuccess(decodedText, decodedResult) {
    const format = decodedResult?.result?.format?.formatName || 'Code';
    lastQrResult = { text: decodedText, format };
    qrType.textContent = format;
    qrText.textContent = decodedText;
    qrResult.classList.remove('hidden');

    // If URL, show open button
    if (/^https?:\/\//i.test(decodedText)) {
      btnOpenQr.href = decodedText;
      btnOpenQr.classList.remove('hidden');
    } else {
      btnOpenQr.classList.add('hidden');
    }

    log(`Scanned ${format}: ${decodedText.slice(0, 60)}${decodedText.length > 60 ? '…' : ''}`, 'success');

    // Optional: stop after first successful scan
    // stopQrScanner();
  }

  async function stopQrScanner() {
    if (html5QrCode) {
      try {
        const state = html5QrCode.getState?.();
        if (state === 2 /* SCANNING */) {
          await html5QrCode.stop();
        }
        await html5QrCode.clear();
      } catch (_) {}
      html5QrCode = null;
    }
    btnStartQr.classList.remove('hidden');
    btnStopQr.classList.add('hidden');
  }

  btnStartQr.addEventListener('click', startQrScanner);
  btnStopQr.addEventListener('click', async () => {
    await stopQrScanner();
    log('Scanner stopped');
  });

  btnCopyQr.addEventListener('click', async () => {
    if (!lastQrResult) return;
    try {
      await navigator.clipboard.writeText(lastQrResult.text);
      log('Result copied', 'success');
    } catch {
      log('Could not copy', 'error');
    }
  });

  btnPrintQr.addEventListener('click', () => {
    if (!lastQrResult) return;
    const w = window.open('', '_blank');
    if (!w) return log('Popup blocked', 'error');
    w.document.write(`<!DOCTYPE html><html><head><title>Scan Result</title>
      <style>body{font-family:system-ui;padding:24px;max-width:600px;margin:auto}
      h1{font-size:1.2rem} pre{background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap;word-break:break-all}</style>
      </head><body>
      <h1>${lastQrResult.format}</h1>
      <pre>${lastQrResult.text.replace(/</g, '&lt;')}</pre>
      <p style="color:#666;font-size:0.85rem">Scanned with Daniel Print Hub</p>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
    log('Printing scan result', 'success');
  });


  // ========== PAGE EDITOR ==========
  const pageEditor = document.getElementById('pageEditor');
  const editorCanvas = document.getElementById('editorCanvas');
  const editorCtx = editorCanvas.getContext('2d');
  let editIndex = -1;
  let editTool = 'draw';
  let editColor = '#000000';
  let editFont = 'system-ui, sans-serif';
  let textRotation = 0;
  let brushSize = 6;
  let cropMode = null; // {startX,startY,x,y,w,h}
  let drawing = false;
  let startX = 0, startY = 0;
  let snapshot = null;
  let history = [];
  let historyIdx = -1;
  let filterMode = 0; // 0 normal, 1 gray, 2 contrast
  let baseImage = null; // Image object of current page
  let balloons = []; // {id, x, y, rotation, text, color}
  let selectedBalloonId = null;
  let balloonStyle = 'speech';
  let textObjects = []; // movable text {id,x,y,rotation,text,color,font,size}
  let selectedTextId = null;
  let balloonDrag = null; // {id, mode: 'move'|'rotate', ox, oy, startRot}


  function pushHistory() {
    history = history.slice(0, historyIdx + 1);
    history.push(editorCanvas.toDataURL('image/png'));
    historyIdx = history.length - 1;
    if (history.length > 30) {
      history.shift();
      historyIdx--;
    }
  }

  function restoreHistory(idx) {
    if (idx < 0 || idx >= history.length) return;
    const img = new Image();
    img.onload = () => {
      editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
      editorCtx.drawImage(img, 0, 0);
      historyIdx = idx;
    };
    img.src = history[idx];
  }

  function openEditor(index) {
    editIndex = index;
    filterMode = 0;
    history = [];
    historyIdx = -1;
    balloons = [];
    selectedBalloonId = null;
    textObjects = [];
    selectedTextId = null;
    const layer = document.getElementById('balloonLayer');
    if (layer) layer.innerHTML = '';
    const img = new Image();
    img.onload = () => {
      baseImage = img;
      // Fit to reasonable size for mobile
      const maxW = Math.min(window.innerWidth - 24, 1200);
      const maxH = Math.min(window.innerHeight * 0.55, 1600);
      let w = img.width;
      let h = img.height;
      const scale = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      editorCanvas.width = w;
      editorCanvas.height = h;
      editorCtx.drawImage(img, 0, 0, w, h);
      pushHistory();
      pageEditor.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      log('Editing page ' + (index + 1));
    };
    img.src = scannedPages[index];
  }

  function closeEditor(save) {
    if (save && editIndex >= 0) {
      rasterizeTextObjects();
      rasterizeBalloons();
      scannedPages[editIndex] = editorCanvas.toDataURL('image/jpeg', 0.92);
      renderThumbs();
      log('Page saved', 'success');
    }
    balloons = [];
    selectedBalloonId = null;
    textObjects = [];
    selectedTextId = null;
    const layer = document.getElementById('balloonLayer');
    if (layer) layer.innerHTML = '';
    pageEditor.classList.add('hidden');
    document.body.style.overflow = '';
    editIndex = -1;
  }

  document.getElementById('editorCancel').addEventListener('click', () => closeEditor(false));
  document.getElementById('editorDone').addEventListener('click', () => closeEditor(true));

  // Tools
  document.querySelectorAll('.tool-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const tool = btn.dataset.tool;
      if (action === 'undo') {
        if (historyIdx > 0) restoreHistory(historyIdx - 1);
        return;
      }
      if (action === 'redo') {
        if (historyIdx < history.length - 1) restoreHistory(historyIdx + 1);
        return;
      }
      if (action === 'rotate') {
        rotateCanvas(90);
        return;
      }
      if (action === 'filter') {
        applyFilter();
        return;
      }
      if (action === 'autoCrop') {
        autoCropEdges();
        return;
      }
      if (tool) {
        document.querySelectorAll('.tool-btn[data-tool]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        editTool = tool;
        if (tool === 'text' || tool === 'balloon') {
          const input = document.getElementById('customMessageInput');
          if (input) {
            input.focus();
            input.placeholder = tool === 'balloon'
              ? 'Type balloon message… then tap Add'
              : 'Type text… then tap Add';
          }
        }
        if (tool === 'crop') {
          startCropMode();
        } else {
          clearCropUI();
        }
      }
    });
  });

  document.querySelectorAll('.color-swatch').forEach((sw) => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      editColor = sw.dataset.color;
      const cp = document.getElementById('colorPicker');
      if (cp) cp.value = editColor;
    });
  });

  document.getElementById('brushSize').addEventListener('input', (e) => {
    brushSize = parseInt(e.target.value, 10) || 6;
  });

  const colorPicker = document.getElementById('colorPicker');
  if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
      editColor = e.target.value;
      document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
    });
  }
  const fontSelect = document.getElementById('fontSelect');
  if (fontSelect) {
    fontSelect.addEventListener('change', (e) => {
      editFont = e.target.value;
    });
  }
  const textRotSlider = document.getElementById('textRotation');
  const textRotVal = document.getElementById('textRotationVal');
  if (textRotSlider) {
    textRotSlider.addEventListener('input', (e) => {
      textRotation = parseInt(e.target.value, 10) || 0;
      if (textRotVal) textRotVal.textContent = textRotation + '°';
      if (selectedBalloonId) {
        const bb = balloons.find((x) => x.id === selectedBalloonId);
        if (bb) {
          bb.rotation = textRotation;
          const node = document.querySelector(`.word-balloon[data-id="${bb.id}"]`);
          if (node) applyBalloonTransform(node, bb);
        }
      }
      if (selectedTextId) {
        const to = textObjects.find((x) => x.id === selectedTextId);
        if (to) {
          to.rotation = textRotation;
          const node = document.querySelector(`.text-object[data-id="${to.id}"]`);
          if (node) node.style.transform = `rotate(${to.rotation}deg)`;
        }
      }
    });
  }

  function getPos(e) {
    const rect = editorCanvas.getBoundingClientRect();
    const scaleX = editorCanvas.width / rect.width;
    const scaleY = editorCanvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function takeSnapshot() {
    snapshot = editorCtx.getImageData(0, 0, editorCanvas.width, editorCanvas.height);
  }

  function restoreSnapshot() {
    if (snapshot) editorCtx.putImageData(snapshot, 0, 0);
  }

  function drawArrow(ctx, x1, y1, x2, y2) {
    const headLen = Math.max(16, brushSize * 3.5);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    // shaft stops before head
    const shaftX = x2 - headLen * 0.7 * Math.cos(angle);
    const shaftY = y2 - headLen * 0.7 * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(shaftX, shaftY);
    ctx.stroke();
    // filled triangle head
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLen * Math.cos(angle - Math.PI / 7),
      y2 - headLen * Math.sin(angle - Math.PI / 7)
    );
    ctx.lineTo(
      x2 - headLen * Math.cos(angle + Math.PI / 7),
      y2 - headLen * Math.sin(angle + Math.PI / 7)
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function onPointerDown(e) {
    e.preventDefault();
    if (editTool === 'text' || editTool === 'balloon') return;
    if (editTool === 'crop') return; // handled by crop overlay
    drawing = true;
    const p = getPos(e);
    startX = p.x;
    startY = p.y;
    takeSnapshot();
    editorCtx.lineCap = 'round';
    editorCtx.lineJoin = 'round';
    editorCtx.lineWidth = brushSize;
    if (editTool === 'draw') {
      editorCtx.globalCompositeOperation = 'source-over';
      editorCtx.strokeStyle = editColor;
      editorCtx.globalAlpha = 1;
      editorCtx.beginPath();
      editorCtx.moveTo(p.x, p.y);
    } else if (editTool === 'highlight') {
      editorCtx.globalCompositeOperation = 'source-over';
      editorCtx.strokeStyle = editColor;
      editorCtx.globalAlpha = 0.35;
      editorCtx.lineWidth = brushSize * 3;
      editorCtx.beginPath();
      editorCtx.moveTo(p.x, p.y);
    } else if (editTool === 'eraser') {
      editorCtx.globalCompositeOperation = 'destination-out';
      editorCtx.globalAlpha = 1;
      editorCtx.lineWidth = brushSize * 2;
      editorCtx.beginPath();
      editorCtx.moveTo(p.x, p.y);
    }
  }

  function onPointerMove(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = getPos(e);
    if (editTool === 'draw' || editTool === 'highlight' || editTool === 'eraser') {
      editorCtx.lineTo(p.x, p.y);
      editorCtx.stroke();
    } else if (editTool === 'line' || editTool === 'arrow' || editTool === 'box' || editTool === 'circle') {
      restoreSnapshot();
      editorCtx.globalCompositeOperation = 'source-over';
      editorCtx.globalAlpha = 1;
      editorCtx.strokeStyle = editColor;
      editorCtx.fillStyle = editColor;
      editorCtx.lineWidth = brushSize;
      editorCtx.lineCap = 'round';
      if (editTool === 'line') {
        editorCtx.beginPath();
        editorCtx.moveTo(startX, startY);
        editorCtx.lineTo(p.x, p.y);
        editorCtx.stroke();
      } else if (editTool === 'arrow') {
        drawArrow(editorCtx, startX, startY, p.x, p.y);
      } else if (editTool === 'box') {
        editorCtx.strokeRect(
          Math.min(startX, p.x),
          Math.min(startY, p.y),
          Math.abs(p.x - startX),
          Math.abs(p.y - startY)
        );
      } else if (editTool === 'circle') {
        const rx = Math.abs(p.x - startX) / 2;
        const ry = Math.abs(p.y - startY) / 2;
        const cx = (startX + p.x) / 2;
        const cy = (startY + p.y) / 2;
        editorCtx.beginPath();
        editorCtx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
        editorCtx.stroke();
      }
    }
  }

  function onPointerUp(e) {
    if (!drawing) return;
    drawing = false;
    editorCtx.globalAlpha = 1;
    editorCtx.globalCompositeOperation = 'source-over';
    pushHistory();
  }

  editorCanvas.addEventListener('mousedown', onPointerDown);
  editorCanvas.addEventListener('mousemove', onPointerMove);
  editorCanvas.addEventListener('mouseup', onPointerUp);
  editorCanvas.addEventListener('mouseleave', onPointerUp);
  editorCanvas.addEventListener('touchstart', onPointerDown, { passive: false });
  editorCanvas.addEventListener('touchmove', onPointerMove, { passive: false });
  editorCanvas.addEventListener('touchend', onPointerUp);


  // ----- Word balloons (movable, rotatable, upright text) -----
  function addBalloon(text) {
    const id = 'b' + Date.now();
    const rect = editorCanvas.getBoundingClientRect();
    const balloon = {
      id,
      x: rect.width * 0.3,
      y: rect.height * 0.2,
      rotation: textRotation || 0,
      scale: 1,
      text: text,
      color: editColor || '#000000',
      font: editFont || 'system-ui, sans-serif',
      style: balloonStyle || 'speech',
    };
    balloons.push(balloon);
    selectedBalloonId = id;
    renderBalloons();
    log('Balloon: drag to move · blue ↻ rotate · green ▣ resize', 'success');
  }

  function applyBalloonTransform(node, b) {
    node.style.left = b.x + 'px';
    node.style.top = b.y + 'px';
    // Rotate + scale the balloon shell
    node.style.transform = `rotate(${b.rotation}deg) scale(${b.scale})`;
    const textEl = node.querySelector('.balloon-text');
    if (textEl) {
      // Counter-rotate only — text stays upright; scale follows parent
      textEl.style.transform = `rotate(${-b.rotation}deg)`;
    }
  }

  function renderBalloons() {
    const layer = document.getElementById('balloonLayer');
    if (!layer) return;
    layer.querySelectorAll('.word-balloon').forEach((n) => n.remove());
    const rect = editorCanvas.getBoundingClientRect();
    layer.style.width = rect.width + 'px';
    layer.style.height = rect.height + 'px';

    balloons.forEach((b) => {
      if (b.scale == null) b.scale = 1;
      if (b.rotation == null) b.rotation = 0;

      const el = document.createElement('div');
      el.className = 'word-balloon style-' + (b.style || 'speech') + (b.id === selectedBalloonId ? ' selected' : '');
      el.dataset.id = b.id;

      const body = document.createElement('div');
      body.className = 'balloon-body';
      body.style.borderColor = b.color || '#222';

      const txt = document.createElement('span');
      txt.className = 'balloon-text';
      txt.textContent = b.text;
      txt.style.fontFamily = b.font || editFont || 'system-ui, sans-serif';
      if (b.color) txt.style.color = b.color;

      const tail = document.createElement('div');
      tail.className = 'balloon-tail';
      tail.style.borderTopColor = b.color || '#222';

      const rotHandle = document.createElement('div');
      rotHandle.className = 'rotate-handle';
      rotHandle.innerHTML = '↻';
      rotHandle.title = 'Rotate';

      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'resize-handle';
      resizeHandle.innerHTML = '▣';
      resizeHandle.title = 'Resize';

      const delHandle = document.createElement('div');
      delHandle.className = 'delete-handle';
      delHandle.innerHTML = '×';
      delHandle.title = 'Delete';

      body.appendChild(txt);
      el.appendChild(body);
      if ((b.style || 'speech') === 'thought') {
        const dots = document.createElement('div');
        dots.className = 'thought-dots';
        dots.innerHTML = '<span></span><span style="width:6px;height:6px"></span><span style="width:4px;height:4px"></span>';
        el.appendChild(dots);
      } else {
        el.appendChild(tail);
      }
      el.appendChild(rotHandle);
      el.appendChild(resizeHandle);
      el.appendChild(delHandle);
      layer.appendChild(el);
      applyBalloonTransform(el, b);

      // Double-tap to edit message
      el.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const input = document.getElementById('customMessageInput');
        if (!input) return;
        input.value = b.text;
        input.focus();
        selectedBalloonId = b.id;
        const once = () => {
          const nt = input.value.trim();
          if (nt) {
            b.text = nt;
            renderBalloons();
            log('Balloon text updated', 'success');
          }
          btnAddMessage && btnAddMessage.removeEventListener('click', once);
        };
        // Next Add updates this balloon text if still selected
        const addBtn = document.getElementById('btnAddMessage');
        if (addBtn) {
          const handler = () => {
            const nt = input.value.trim();
            if (nt && selectedBalloonId === b.id) {
              const bb = balloons.find(x => x.id === b.id);
              if (bb) { bb.text = nt; renderBalloons(); input.value = ''; log('Balloon text updated', 'success'); }
            }
            addBtn.removeEventListener('click', handler);
          };
          addBtn.addEventListener('click', handler);
        }
      });

      // MOVE
      el.addEventListener('pointerdown', (e) => {
        if (e.target === rotHandle || e.target === delHandle || e.target === resizeHandle) return;
        e.stopPropagation();
        e.preventDefault();
        selectedBalloonId = b.id;
        document.querySelectorAll('.word-balloon').forEach((n) => {
          n.classList.toggle('selected', n.dataset.id === b.id);
        });
        // Sync rotation slider
        const rot = Math.round(((b.rotation % 360) + 360) % 360);
        textRotation = rot;
        const trs = document.getElementById('textRotation');
        const trv = document.getElementById('textRotationVal');
        if (trs) trs.value = rot;
        if (trv) trv.textContent = rot + '°';
        const startX = e.clientX;
        const startY = e.clientY;
        const origX = b.x;
        const origY = b.y;
        balloonDrag = { id: b.id, mode: 'move', startX, startY, origX, origY };

        const onMove = (ev) => {
          if (!balloonDrag || balloonDrag.mode !== 'move') return;
          const bb = balloons.find((x) => x.id === balloonDrag.id);
          if (!bb) return;
          bb.x = balloonDrag.origX + (ev.clientX - balloonDrag.startX);
          bb.y = balloonDrag.origY + (ev.clientY - balloonDrag.startY);
          const node = layer.querySelector(`[data-id="${bb.id}"]`);
          if (node) applyBalloonTransform(node, bb);
        };
        const onUp = () => {
          balloonDrag = null;
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });

      // ROTATE
      rotHandle.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        selectedBalloonId = b.id;
        const elRect = el.getBoundingClientRect();
        const cx = elRect.left + elRect.width / 2;
        const cy = elRect.top + elRect.height / 2;
        const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
        balloonDrag = { id: b.id, mode: 'rotate', startAngle, startRot: b.rotation, cx, cy };

        const onMove = (ev) => {
          if (!balloonDrag || balloonDrag.mode !== 'rotate') return;
          const ang = Math.atan2(ev.clientY - balloonDrag.cy, ev.clientX - balloonDrag.cx) * (180 / Math.PI);
          const bb = balloons.find((x) => x.id === balloonDrag.id);
          if (!bb) return;
          bb.rotation = balloonDrag.startRot + (ang - balloonDrag.startAngle);
          const node = layer.querySelector(`[data-id="${bb.id}"]`);
          if (node) applyBalloonTransform(node, bb);
        };
        const onUp = () => {
          balloonDrag = null;
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });

      // RESIZE
      resizeHandle.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        selectedBalloonId = b.id;
        const elRect = el.getBoundingClientRect();
        const cx = elRect.left + elRect.width / 2;
        const cy = elRect.top + elRect.height / 2;
        const startDist = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
        balloonDrag = { id: b.id, mode: 'resize', startDist, startScale: b.scale || 1, cx, cy };

        const onMove = (ev) => {
          if (!balloonDrag || balloonDrag.mode !== 'resize') return;
          const dist = Math.hypot(ev.clientX - balloonDrag.cx, ev.clientY - balloonDrag.cy);
          const bb = balloons.find((x) => x.id === balloonDrag.id);
          if (!bb) return;
          let s = balloonDrag.startScale * (dist / balloonDrag.startDist);
          s = Math.max(0.45, Math.min(3.5, s));
          bb.scale = s;
          const node = layer.querySelector(`[data-id="${bb.id}"]`);
          if (node) applyBalloonTransform(node, bb);
        };
        const onUp = () => {
          balloonDrag = null;
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });

      delHandle.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        balloons = balloons.filter((x) => x.id !== b.id);
        if (selectedBalloonId === b.id) selectedBalloonId = null;
        renderBalloons();
      });
    });
  }

  function rasterizeBalloons() {
    if (!balloons.length) return;
    const canvasRect = editorCanvas.getBoundingClientRect();
    const scaleX = editorCanvas.width / canvasRect.width;
    const scaleY = editorCanvas.height / canvasRect.height;

    balloons.forEach((b) => {
      const el = document.querySelector(`.word-balloon[data-id="${b.id}"]`);
      if (!el) return;
      const body = el.querySelector('.balloon-body');
      if (!body) return;

      const s = b.scale || 1;
      const bw = body.offsetWidth * scaleX;  // already includes CSS scale visually; use unscaled layout size
      // offsetWidth is layout size before transform in most browsers for the element box;
      // we apply s manually for canvas drawing
      const baseW = (body.offsetWidth / s) * scaleX * s;
      const baseH = (body.offsetHeight / s) * scaleY * s;
      const rw = baseW + 4 * scaleX * s;
      const rh = baseH + 4 * scaleY * s;
      const cx = (b.x + (body.offsetWidth / s) / 2) * scaleX;
      const cy = (b.y + (body.offsetHeight / s) / 2) * scaleY;
      // Better: use getBoundingClientRect relative to canvas
      const bodyRect = body.getBoundingClientRect();
      const canvasRect2 = editorCanvas.getBoundingClientRect();
      const cx2 = ((bodyRect.left + bodyRect.right) / 2 - canvasRect2.left) * scaleX;
      const cy2 = ((bodyRect.top + bodyRect.bottom) / 2 - canvasRect2.top) * scaleY;
      const rw2 = bodyRect.width * scaleX;
      const rh2 = bodyRect.height * scaleY;
      const rot = ((b.rotation || 0) * Math.PI) / 180;
      const color = b.color || '#222';

      editorCtx.save();
      editorCtx.translate(cx2, cy2);
      editorCtx.rotate(rot);

      roundRect(editorCtx, -rw2 / 2, -rh2 / 2, rw2, rh2, 12 * scaleX * s);
      editorCtx.fillStyle = '#ffffff';
      editorCtx.fill();
      editorCtx.strokeStyle = color;
      editorCtx.lineWidth = Math.max(2, 2.5 * scaleX * s);
      editorCtx.stroke();

      // Tail
      editorCtx.beginPath();
      editorCtx.moveTo(-8 * scaleX * s, rh2 / 2 - 2);
      editorCtx.lineTo(0, rh2 / 2 + 14 * scaleY * s);
      editorCtx.lineTo(8 * scaleX * s, rh2 / 2 - 2);
      editorCtx.closePath();
      editorCtx.fillStyle = '#ffffff';
      editorCtx.fill();
      editorCtx.stroke();
      editorCtx.restore();

      // Text upright (no rotation), scaled
      editorCtx.save();
      editorCtx.translate(cx2, cy2);
      editorCtx.fillStyle = '#111';
      const fontSize = Math.max(11, 14 * scaleX * s);
      editorCtx.font = `bold ${fontSize}px ${b.font || editFont || 'system-ui, sans-serif'}`;
      editorCtx.textAlign = 'center';
      editorCtx.textBaseline = 'middle';
      const lines = String(b.text).split('\n');
      const lineH = fontSize * 1.25;
      const startY = -((lines.length - 1) * lineH) / 2;
      lines.forEach((line, i) => {
        editorCtx.fillText(line, 0, startY + i * lineH);
      });
      editorCtx.restore();
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }



  // ----- Crop (manual) + Auto edge detect -----
  function clearCropUI() {
    const stage = document.getElementById('editorStage');
    if (!stage) return;
    stage.querySelectorAll('.crop-overlay, .crop-actions').forEach((n) => n.remove());
    cropMode = null;
  }

  function startCropMode() {
    clearCropUI();
    const stage = document.getElementById('editorStage');
    if (!stage) return;

    const overlay = document.createElement('div');
    overlay.className = 'crop-overlay';
    overlay.style.cssText = 'position:absolute;inset:0;z-index:20;touch-action:none;';

    const rectEl = document.createElement('div');
    rectEl.className = 'crop-rect';
    rectEl.style.display = 'none';
    overlay.appendChild(rectEl);

    const actions = document.createElement('div');
    actions.className = 'crop-actions';
    actions.innerHTML = `
      <button type="button" class="crop-apply">Apply Crop</button>
      <button type="button" class="crop-cancel">Cancel</button>`;
    // Append actions AFTER overlay so they paint on top, and give high z-index
    stage.appendChild(overlay);
    stage.appendChild(actions);
    // Prevent the overlay from stealing clicks on the buttons
    actions.addEventListener('pointerdown', (e) => e.stopPropagation());
    actions.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });

    let dragging = false;
    let x0 = 0, y0 = 0;

    const getLocal = (e) => {
      const r = overlay.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: Math.max(0, Math.min(r.width,  clientX - r.left)),
        y: Math.max(0, Math.min(r.height, clientY - r.top)),
      };
    };

    const onDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const p = getLocal(e);
      x0 = p.x; y0 = p.y;
      dragging = true;
      rectEl.style.display = 'block';
      rectEl.style.left = x0 + 'px';
      rectEl.style.top  = y0 + 'px';
      rectEl.style.width = '0px';
      rectEl.style.height = '0px';
      cropMode = { x: x0, y: y0, w: 0, h: 0 };
    };

    const onMove = (e) => {
      if (!dragging) return;
      e.preventDefault();
      const p = getLocal(e);
      const x = Math.min(x0, p.x);
      const y = Math.min(y0, p.y);
      const w = Math.abs(p.x - x0);
      const h = Math.abs(p.y - y0);
      rectEl.style.left   = x + 'px';
      rectEl.style.top    = y + 'px';
      rectEl.style.width  = w + 'px';
      rectEl.style.height = h + 'px';
      cropMode = { x, y, w, h };
    };

    const onUp = () => { dragging = false; };

    overlay.addEventListener('pointerdown', onDown);
    overlay.addEventListener('pointermove', onMove);
    overlay.addEventListener('pointerup', onUp);
    overlay.addEventListener('pointercancel', onUp);
    // Extra safety for older Android browsers
    overlay.addEventListener('touchstart', onDown, { passive: false });
    overlay.addEventListener('touchmove', onMove, { passive: false });
    overlay.addEventListener('touchend', onUp);

    actions.querySelector('.crop-apply').onclick = () => {
      if (!cropMode || cropMode.w < 12 || cropMode.h < 12) {
        log('Drag a larger area to crop', 'error');
        return;
      }
      applyCropRect(cropMode);
      clearCropUI();
      editTool = 'draw';
      document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
      const drawBtn = document.querySelector('.tool-btn[data-tool="draw"]');
      if (drawBtn) drawBtn.classList.add('active');
    };

    actions.querySelector('.crop-cancel').onclick = () => {
      clearCropUI();
      editTool = 'draw';
      document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
      const drawBtn = document.querySelector('.tool-btn[data-tool="draw"]');
      if (drawBtn) drawBtn.classList.add('active');
    };

    log('Drag on the image to select crop area, then tap Apply Crop', 'info');
  }

  function applyCropRect(box) {
    const displayW = editorCanvas.getBoundingClientRect().width;
    const displayH = editorCanvas.getBoundingClientRect().height;
    if (displayW < 1 || displayH < 1) return;

    const sx = editorCanvas.width  / displayW;
    const sy = editorCanvas.height / displayH;

    let x = Math.max(0, Math.round(box.x * sx));
    let y = Math.max(0, Math.round(box.y * sy));
    let w = Math.min(editorCanvas.width  - x, Math.round(box.w * sx));
    let h = Math.min(editorCanvas.height - y, Math.round(box.h * sy));

    if (w < 8 || h < 8) {
      log('Crop area too small', 'error');
      return;
    }

    const data = editorCtx.getImageData(x, y, w, h);
    editorCanvas.width  = w;
    editorCanvas.height = h;
    editorCtx.putImageData(data, 0, 0);
    pushHistory();
    log('Crop applied', 'success');

    // Resize balloon layer to match new canvas display size
    requestAnimationFrame(() => {
      const layer = document.getElementById('balloonLayer');
      if (layer) {
        const r = editorCanvas.getBoundingClientRect();
        layer.style.width  = r.width  + 'px';
        layer.style.height = r.height + 'px';
      }
    });
  }

  /** Auto-detect document edges by finding non-background content bounds */
  function autoCropEdges() {
    const w = editorCanvas.width;
    const h = editorCanvas.height;
    if (w < 20 || h < 20) return;

    const img = editorCtx.getImageData(0, 0, w, h);
    const d = img.data;

    function pix(x, y) {
      const i = (y * w + x) * 4;
      return [d[i], d[i + 1], d[i + 2]];
    }

    // Sample more points for a better background estimate
    const samples = [
      pix(2, 2), pix(w - 3, 2), pix(2, h - 3), pix(w - 3, h - 3),
      pix(Math.floor(w / 2), 2), pix(Math.floor(w / 2), h - 3),
      pix(2, Math.floor(h / 2)), pix(w - 3, Math.floor(h / 2))
    ];
    const bg = [0, 0, 0];
    samples.forEach((c) => {
      bg[0] += c[0]; bg[1] += c[1]; bg[2] += c[2];
    });
    bg[0] /= samples.length; bg[1] /= samples.length; bg[2] /= samples.length;

    const threshold = 28; // slightly more tolerant
    function isContent(x, y) {
      const [r, g, b] = pix(x, y);
      return (Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2])) > threshold;
    }

    let minX = w, minY = h, maxX = 0, maxY = 0;
    const step = Math.max(1, Math.floor(Math.min(w, h) / 350));
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (isContent(x, y)) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Pad slightly
    const pad = Math.round(Math.min(w, h) * 0.015);
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad);
    maxY = Math.min(h - 1, maxY + pad);

    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;

    if (cw < 16 || ch < 16 || (cw >= w * 0.97 && ch >= h * 0.97)) {
      log('Could not detect tighter edges – try manual Crop', 'error');
      return;
    }

    const data = editorCtx.getImageData(minX, minY, cw, ch);
    editorCanvas.width = cw;
    editorCanvas.height = ch;
    editorCtx.putImageData(data, 0, 0);
    pushHistory();
    log(`Auto-cropped to ${cw}×${ch}`, 'success');
  }



  // ----- Balloon style picker -----
  document.querySelectorAll('.style-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.style-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      balloonStyle = btn.dataset.style || 'speech';
      log('Balloon style: ' + balloonStyle);
    });
  });

  // ----- Movable text objects -----
  function addTextObject(text) {
    const id = 't' + Date.now();
    const rect = editorCanvas.getBoundingClientRect();
    const obj = {
      id,
      x: rect.width * 0.3,
      y: rect.height * 0.15,
      rotation: textRotation || 0,
      text,
      color: editColor || '#000000',
      font: editFont || 'system-ui, sans-serif',
      size: Math.max(16, brushSize * 3),
    };
    textObjects.push(obj);
    selectedTextId = id;
    renderTextObjects();
    log('Text added – drag to move, slider to rotate', 'success');
  }

  function renderTextObjects() {
    const layer = document.getElementById('balloonLayer');
    if (!layer) return;
    // Remove old text objects only
    layer.querySelectorAll('.text-object').forEach((n) => n.remove());
    const rect = editorCanvas.getBoundingClientRect();
    layer.style.width = rect.width + 'px';
    layer.style.height = rect.height + 'px';

    textObjects.forEach((obj) => {
      const el = document.createElement('div');
      el.className = 'text-object' + (obj.id === selectedTextId ? ' selected' : '');
      el.dataset.id = obj.id;
      el.style.left = obj.x + 'px';
      el.style.top = obj.y + 'px';
      el.style.color = obj.color;
      el.style.fontFamily = obj.font;
      el.style.fontSize = obj.size + 'px';
      el.style.transform = `rotate(${obj.rotation}deg)`;
      el.textContent = obj.text;

      const del = document.createElement('div');
      del.className = 'text-delete';
      del.textContent = '×';
      el.appendChild(del);
      layer.appendChild(el);

      del.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        textObjects = textObjects.filter((x) => x.id !== obj.id);
        renderTextObjects();
      });

      el.addEventListener('pointerdown', (e) => {
        if (e.target === del) return;
        e.stopPropagation();
        e.preventDefault();
        selectedTextId = obj.id;
        selectedBalloonId = null;
        renderTextObjects();
        renderBalloons();
        // Sync rotation slider
        const rot = Math.round(((obj.rotation % 360) + 360) % 360);
        textRotation = rot;
        const trs = document.getElementById('textRotation');
        const trv = document.getElementById('textRotationVal');
        if (trs) trs.value = rot;
        if (trv) trv.textContent = rot + '°';

        const startX = e.clientX, startY = e.clientY;
        const origX = obj.x, origY = obj.y;
        const onMove = (ev) => {
          obj.x = origX + (ev.clientX - startX);
          obj.y = origY + (ev.clientY - startY);
          el.style.left = obj.x + 'px';
          el.style.top = obj.y + 'px';
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });
    });
  }

  function rasterizeTextObjects() {
    if (!textObjects.length) return;
    const canvasRect = editorCanvas.getBoundingClientRect();
    const scaleX = editorCanvas.width / canvasRect.width;
    const scaleY = editorCanvas.height / canvasRect.height;
    textObjects.forEach((obj) => {
      const el = document.querySelector(`.text-object[data-id="${obj.id}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = ((r.left + r.right) / 2 - canvasRect.left) * scaleX;
      const cy = ((r.top + r.bottom) / 2 - canvasRect.top) * scaleY;
      editorCtx.save();
      editorCtx.translate(cx, cy);
      editorCtx.rotate(((obj.rotation || 0) * Math.PI) / 180);
      editorCtx.fillStyle = obj.color || '#000';
      editorCtx.font = `bold ${Math.max(12, (obj.size || 16) * scaleX)}px ${obj.font || 'system-ui'}`;
      editorCtx.textAlign = 'center';
      editorCtx.textBaseline = 'middle';
      const lines = String(obj.text).split('\n');
      const lineH = Math.max(14, (obj.size || 16) * scaleX * 1.25);
      lines.forEach((line, i) => {
        editorCtx.fillText(line, 0, (i - (lines.length - 1) / 2) * lineH);
      });
      editorCtx.restore();
    });
  }


  function rotateCanvas(deg) {
    const rad = (deg * Math.PI) / 180;
    const w = editorCanvas.width;
    const h = editorCanvas.height;
    const tmp = document.createElement('canvas');
    tmp.width = h;
    tmp.height = w;
    const tctx = tmp.getContext('2d');
    tctx.translate(h / 2, w / 2);
    tctx.rotate(rad);
    tctx.drawImage(editorCanvas, -w / 2, -h / 2);
    editorCanvas.width = h;
    editorCanvas.height = w;
    editorCtx.drawImage(tmp, 0, 0);
    pushHistory();
    log('Rotated 90°');
  }

  function applyFilter() {
    filterMode = (filterMode + 1) % 3;
    const imgData = editorCtx.getImageData(0, 0, editorCanvas.width, editorCanvas.height);
    const d = imgData.data;
    if (filterMode === 1) {
      // grayscale
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = d[i + 1] = d[i + 2] = g;
      }
      log('Filter: Grayscale');
    } else if (filterMode === 2) {
      // high contrast B&W
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const v = g > 140 ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      log('Filter: High contrast');
    } else {
      // reload original base + re-apply is hard; just notify
      log('Filter: cycle again for grayscale / contrast', 'info');
      return;
    }
    editorCtx.putImageData(imgData, 0, 0);
    pushHistory();
  }



  // Custom message input (Text + Balloon)
  function addCustomMessage() {
    const input = document.getElementById('customMessageInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) {
      input.focus();
      log('Type a message first', 'error');
      return;
    }
    if (editTool === 'balloon') {
      addBalloon(text);
      input.value = '';
      log('Balloon added with your message', 'success');
    } else if (editTool === 'text') {
      addTextObject(text);
      input.value = '';
    } else {
      // Default to balloon if no tool selected
      document.querySelectorAll('.tool-btn[data-tool]').forEach((b) => b.classList.remove('active'));
      const balloonBtn = document.querySelector('.tool-btn[data-tool="balloon"]');
      if (balloonBtn) balloonBtn.classList.add('active');
      editTool = 'balloon';
      addBalloon(text);
      input.value = '';
      log('Balloon added with your message', 'success');
    }
  }

  const btnAddMessage = document.getElementById('btnAddMessage');
  const customMessageInput = document.getElementById('customMessageInput');
  if (btnAddMessage) btnAddMessage.addEventListener('click', addCustomMessage);
  if (customMessageInput) {
    customMessageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomMessage();
      }
    });
  }

  // ---------- Init ----------
  loadConfig();
  updatePrintButtons();
  log('Daniel Print Hub ready – Print · Scan · QR', 'success');
})();

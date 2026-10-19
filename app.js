/**
 * Epson Print Hub
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
    const body = encodeURIComponent(`Please print the attached file.\n\nSent from Epson Print Hub`);
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
      const cfg = JSON.parse(localStorage.getItem('epsonPrintHubConfig') || '{}');
      if (cfg.clientId) clientIdInput.value = cfg.clientId;
      if (cfg.clientSecret) clientSecretInput.value = cfg.clientSecret;
      if (cfg.apiKey) apiKeyInput.value = cfg.apiKey;
      if (cfg.deviceId) deviceIdInput.value = cfg.deviceId;
      if (cfg.printerEmail) printerEmailInput.value = cfg.printerEmail;
    } catch (_) {}
  }
  btnSaveConfig.addEventListener('click', () => {
    localStorage.setItem(
      'epsonPrintHubConfig',
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
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    scannedPages.push(dataUrl);
    renderThumbs();
    log(`Page ${scannedPages.length} captured`, 'success');
  }

  function renderThumbs() {
    scanThumbs.innerHTML = '';
    scannedPages.forEach((url, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'thumb-wrap';
      const img = document.createElement('img');
      img.src = url;
      img.alt = `Page ${i + 1}`;
      const rm = document.createElement('button');
      rm.className = 'thumb-remove';
      rm.textContent = '×';
      rm.title = 'Remove';
      rm.onclick = () => {
        scannedPages.splice(i, 1);
        renderThumbs();
      };
      wrap.appendChild(img);
      wrap.appendChild(rm);
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
      <p style="color:#666;font-size:0.85rem">Scanned with Epson Print Hub</p>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
    log('Printing scan result', 'success');
  });

  // ---------- Init ----------
  loadConfig();
  updatePrintButtons();
  log('Epson Print Hub ready – Print · Scan · QR', 'success');
})();

// Razzo Mail — Client Logic (Mobile-First, Realtime WebSockets)

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tabDepositBtn = document.getElementById('tabDepositBtn');
  const tabPickupBtn = document.getElementById('tabPickupBtn');
  const depositSection = document.getElementById('depositSection');
  const pickupSection = document.getElementById('pickupSection');

  // Deposit Elements
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const cameraInput = document.getElementById('cameraInput');
  const quickCameraBtn = document.getElementById('quickCameraBtn');
  const quickGalleryBtn = document.getElementById('quickGalleryBtn');
  const dropPrompt = document.getElementById('dropPrompt');
  const filePreviewCard = document.getElementById('filePreviewCard');
  const fileExtensionBadge = document.getElementById('fileExtensionBadge');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  const fileSizeDisplay = document.getElementById('fileSizeDisplay');
  const removeFileBtn = document.getElementById('removeFileBtn');

  const toggleNoteModeBtn = document.getElementById('toggleNoteModeBtn');
  const textNoteArea = document.getElementById('textNoteArea');
  const textNoteInput = document.getElementById('textNoteInput');

  const regenCodeBtn = document.getElementById('regenCodeBtn');
  const depositCodePart1 = document.getElementById('depositCodePart1');
  const depositCodePart2 = document.getElementById('depositCodePart2');

  const accordionToggleBtn = document.getElementById('accordionToggleBtn');
  const optionsAccordion = accordionToggleBtn.closest('.options-accordion');
  const depositPinInput = document.getElementById('depositPinInput');
  const togglePinVisibilityBtn = document.getElementById('togglePinVisibilityBtn');
  const burnAfterReadingCheck = document.getElementById('burnAfterReadingCheck');

  const sendDepositBtn = document.getElementById('sendDepositBtn');
  const uploadProgressBar = document.getElementById('uploadProgressBar');
  const depositForm = document.getElementById('depositForm');
  const depositSuccessCard = document.getElementById('depositSuccessCard');
  const successCodeDisplay = document.getElementById('successCodeDisplay');
  const copyCodeBtn = document.getElementById('copyCodeBtn');
  const copyDepositCodeBtn = document.getElementById('copyDepositCodeBtn');
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  const shareNativeBtn = document.getElementById('shareNativeBtn');
  const resetDepositBtn = document.getElementById('resetDepositBtn');
  const senderRadarBox = document.getElementById('senderRadarBox');
  const radarStatusTitle = document.getElementById('radarStatusTitle');
  const radarStatusDesc = document.getElementById('radarStatusDesc');
  const availableFromInput = document.getElementById('availableFromInput');

  // Pickup Elements
  const pickupCodePart1 = document.getElementById('pickupCodePart1');
  const pickupCodePart2 = document.getElementById('pickupCodePart2');
  const pickupPinInput = document.getElementById('pickupPinInput');
  const togglePickupPinVisibilityBtn = document.getElementById('togglePickupPinVisibilityBtn');
  const rememberLockerCheck = document.getElementById('rememberLockerCheck');
  const checkAndPickupBtn = document.getElementById('checkAndPickupBtn');
  const waitingReceiverCard = document.getElementById('waitingReceiverCard');
  const waitingLockerCodeSpan = document.getElementById('waitingLockerCodeSpan');
  const downloadReadyCard = document.getElementById('downloadReadyCard');
  const readyFileName = document.getElementById('readyFileName');
  const readyFileSize = document.getElementById('readyFileSize');
  const readyFileExpiry = document.getElementById('readyFileExpiry');
  const readyBurnWarning = document.getElementById('readyBurnWarning');
  const readyNoteContentBox = document.getElementById('readyNoteContentBox');
  const readyNoteText = document.getElementById('readyNoteText');
  const executeDownloadBtn = document.getElementById('executeDownloadBtn');

  const toastContainer = document.getElementById('toastContainer');

  // State
  let selectedFile = null;
  let isNoteMode = false;
  let activeWs = null;
  let currentDepositedCode = '';
  let activeLockerData = null;

  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

  // --- CLIPBOARD HELPER (funziona anche su HTTP locale, senza HTTPS) ---
  function copyToClipboard(text, onSuccess) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
        _fallbackCopy(text, onSuccess);
      });
    } else {
      _fallbackCopy(text, onSuccess);
    }
  }

  function _fallbackCopy(text, onSuccess) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      if (onSuccess) onSuccess();
    } catch (e) {
      showToast('Copia non riuscita — seleziona il testo manualmente', 'error');
    } finally {
      ta.remove();
    }
  }

  // --- INIT & TABS ---
  function switchTab(target) {
    if (target === 'deposit') {
      tabDepositBtn.classList.add('active');
      tabPickupBtn.classList.remove('active');
      depositSection.classList.add('active');
      pickupSection.classList.remove('active');
      tabDepositBtn.setAttribute('aria-selected', 'true');
      tabPickupBtn.setAttribute('aria-selected', 'false');
    } else {
      tabPickupBtn.classList.add('active');
      tabDepositBtn.classList.remove('active');
      pickupSection.classList.add('active');
      depositSection.classList.remove('active');
      tabPickupBtn.setAttribute('aria-selected', 'true');
      tabDepositBtn.setAttribute('aria-selected', 'false');
      pickupCodePart1.focus();
    }
  }

  tabDepositBtn.addEventListener('click', () => switchTab('deposit'));
  tabPickupBtn.addEventListener('click', () => switchTab('pickup'));

  // --- 8-CHARACTER MIXED CODE INPUT JUMP HANDLERS ---
  const CODE_CHARS_REGEX = /[^a-zA-Z0-9!@$*+=_]/g;

  function setupCodeInputs(part1, part2) {
    part1.addEventListener('input', () => {
      part1.value = part1.value.replace(CODE_CHARS_REGEX, '');
      if (part1.value.length >= 4) {
        part1.value = part1.value.slice(0, 4);
        part2.focus();
      }
    });

    part2.addEventListener('input', () => {
      part2.value = part2.value.replace(CODE_CHARS_REGEX, '');
      if (part2.value.length >= 4) {
        part2.value = part2.value.slice(0, 4);
      }
    });

    part2.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && part2.value.length === 0) {
        part1.focus();
      }
    });

    // Paste handler for either chunk (support "K8$m-2!pX" or "K8$m2!pX")
    [part1, part2].forEach(input => {
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData)
          .getData('text')
          .trim()
          .replace(/[^a-zA-Z0-9!@$*+=_-]/g, '');
        if (text.includes('-')) {
          const parts = text.split('-');
          part1.value = (parts[0] || '').slice(0, 4);
          part2.value = (parts[1] || '').slice(0, 4);
          part2.focus();
        } else if (text.length >= 8) {
          part1.value = text.slice(0, 4);
          part2.value = text.slice(4, 8);
          part2.focus();
        } else if (text.length > 0) {
          part1.value = text.slice(0, 4);
          if (text.length > 4) {
            part2.value = text.slice(4, 8);
            part2.focus();
          }
        }
      });
    });
  }

  setupCodeInputs(depositCodePart1, depositCodePart2);
  setupCodeInputs(pickupCodePart1, pickupCodePart2);

  // --- GENERATE RANDOM CODE ---
  async function generateRandomCode() {
    try {
      const res = await fetch('/api/generate-code');
      if (res.ok) {
        const data = await res.json();
        const [p1, p2] = data.code.split('-');
        depositCodePart1.value = p1;
        depositCodePart2.value = p2;
      } else {
        fallbackRandomCode();
      }
    } catch {
      fallbackRandomCode();
    }
  }

  function fallbackRandomCode() {
    const pool = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@$*+=_";
    let p1 = '', p2 = '';
    for (let i = 0; i < 4; i++) p1 += pool[Math.floor(Math.random() * pool.length)];
    for (let i = 0; i < 4; i++) p2 += pool[Math.floor(Math.random() * pool.length)];
    depositCodePart1.value = p1;
    depositCodePart2.value = p2;
  }

  regenCodeBtn.addEventListener('click', generateRandomCode);
  generateRandomCode();

  // --- ACCORDION & PIN VISIBILITY ---
  accordionToggleBtn.addEventListener('click', () => {
    optionsAccordion.classList.toggle('open');
  });

  togglePinVisibilityBtn.addEventListener('click', () => {
    depositPinInput.type = depositPinInput.type === 'password' ? 'text' : 'password';
  });

  togglePickupPinVisibilityBtn.addEventListener('click', () => {
    pickupPinInput.type = pickupPinInput.type === 'password' ? 'text' : 'password';
  });

  // --- FILE HANDLING & DRAG-AND-DROP ---
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function handleFileSelect(file) {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      showToast('Il file supera il limite massimo di 25 MB', 'error');
      return;
    }

    selectedFile = file;
    const ext = file.name.split('.').pop().slice(0, 4) || 'FILE';
    fileExtensionBadge.textContent = ext.toUpperCase();
    fileNameDisplay.textContent = file.name;
    fileSizeDisplay.textContent = formatBytes(file.size);

    dropPrompt.classList.add('hidden');
    filePreviewCard.classList.remove('hidden');

    // If note area was open, close it
    if (isNoteMode) {
      toggleNoteMode();
    }
  }

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  });

  // Mobile 1-click Quick Camera & Gallery Handlers
  if (quickCameraBtn && cameraInput) {
    quickCameraBtn.addEventListener('click', () => {
      cameraInput.click();
    });
    cameraInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });
  }

  if (quickGalleryBtn && fileInput) {
    quickGalleryBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }

  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedFile = null;
    fileInput.value = '';
    if (cameraInput) cameraInput.value = '';
    filePreviewCard.classList.add('hidden');
    dropPrompt.classList.remove('hidden');
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt.files && dt.files[0]) {
      handleFileSelect(dt.files[0]);
    }
  });

  // --- NOTE MODE TOGGLE ---
  function toggleNoteMode() {
    isNoteMode = !isNoteMode;
    if (isNoteMode) {
      textNoteArea.classList.remove('hidden');
      toggleNoteModeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        <span>Annulla nota di testo</span>
      `;
      textNoteInput.focus();
    } else {
      textNoteArea.classList.add('hidden');
      textNoteInput.value = '';
      toggleNoteModeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        <span>Oppure scrivi una cartolina / nota di testo</span>
      `;
    }
  }

  toggleNoteModeBtn.addEventListener('click', toggleNoteMode);

  // --- ONE-CLICK SEND / DEPOSIT ---
  sendDepositBtn.addEventListener('click', async () => {
    const p1 = depositCodePart1.value.trim();
    const p2 = depositCodePart2.value.trim();

    if (p1.length !== 4 || p2.length !== 4) {
      showToast('Inserisci un codice valido di due gruppi da 4 caratteri (es. K8$m-2!pX)', 'error');
      return;
    }

    const lockerCode = `${p1}-${p2}`;
    const pin = depositPinInput.value.trim();
    const burn = burnAfterReadingCheck.checked;
    const ttlHours = document.querySelector('input[name="expiryTtl"]:checked')?.value || '1';
    const availableFrom = availableFromInput ? availableFromInput.value : '';

    // Validate embargo date: must be in the future if set
    if (availableFrom) {
      const embargoDate = new Date(availableFrom);
      if (embargoDate <= new Date()) {
        showToast('La data "Disponibile dal" deve essere nel futuro', 'error');
        return;
      }
    }

    let fileToUpload = selectedFile;

    // Check if sending text note
    if (!fileToUpload && isNoteMode && textNoteInput.value.trim().length > 0) {
      const noteContent = textNoteInput.value.trim();
      const blob = new Blob([noteContent], { type: 'text/plain;charset=utf-8' });
      fileToUpload = new File([blob], `messaggio_${lockerCode}.txt`, { type: 'text/plain' });
    }

    if (!fileToUpload) {
      showToast('Seleziona un file da inviare o scrivi una nota di testo', 'error');
      return;
    }

    // Build FormData
    const formData = new FormData();
    formData.append('code', lockerCode);
    formData.append('file', fileToUpload);
    formData.append('burn', burn ? 'true' : 'false');
    formData.append('ttl_hours', ttlHours);
    if (pin) formData.append('pin', pin);
    if (availableFrom) formData.append('available_from', new Date(availableFrom).toISOString());

    sendDepositBtn.disabled = true;
    uploadProgressBar.style.width = '30%';

    try {
      uploadProgressBar.style.width = '70%';
      const res = await fetch('/api/lockers/deposit', {
        method: 'POST',
        body: formData
      });

      uploadProgressBar.style.width = '100%';
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Errore durante il deposito del file');
      }

      // Success! Show Result Card
      currentDepositedCode = lockerCode;
      depositForm.classList.add('hidden');
      depositSuccessCard.classList.remove('hidden');
      successCodeDisplay.textContent = lockerCode;

      showToast('File depositato nel Locker con successo!', 'success');

      // Start Real-Time WebSocket Listener for Sender
      connectSenderWebSocket(lockerCode);

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      sendDepositBtn.disabled = false;
      setTimeout(() => { uploadProgressBar.style.width = '0%'; }, 400);
    }
  });

  // --- REAL-TIME WEBSOCKET (SENDER) ---
  function connectSenderWebSocket(code) {
    if (activeWs) {
      activeWs.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${encodeURIComponent(code)}`;

    try {
      activeWs = new WebSocket(wsUrl);

      activeWs.onopen = () => {
        console.log(`[WS] Connesso al canale del Locker ${code}`);
      };

      activeWs.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'file_downloaded' || msg.type === 'file_burned') {
            // Recipient just picked up the file!
            radarStatusTitle.textContent = '🎉 File Ritirato con Successo!';
            radarStatusTitle.style.color = 'var(--accent-cyan)';
            radarStatusDesc.textContent = msg.burn
              ? 'Il file è stato scaricato e cancellato irreversibilmente per sempre.'
              : 'Il file è stato scaricato dal destinatario.';
            senderRadarBox.style.background = 'rgba(0, 240, 255, 0.12)';
            senderRadarBox.style.borderColor = 'var(--accent-cyan)';

            showToast('Il destinatario ha appena scaricato il file!', 'info');
          }
        } catch (e) {
          console.error('[WS] Parse error', e);
        }
      };
    } catch (e) {
      console.warn('[WS] Impossibile avviare socket', e);
    }
  }

  // Copy Code & Link
  copyCodeBtn.addEventListener('click', () => {
    copyToClipboard(currentDepositedCode, () => {
      showToast(`Codice ${currentDepositedCode} copiato!`, 'success');
    });
  });

  // Copy code from the deposit form (before sending)
  if (copyDepositCodeBtn) {
    copyDepositCodeBtn.addEventListener('click', () => {
      const p1 = depositCodePart1.value.trim();
      const p2 = depositCodePart2.value.trim();
      if (p1.length === 4 && p2.length === 4) {
        const code = `${p1}-${p2}`;
        copyToClipboard(code, () => {
          showToast(`Codice ${code} copiato!`, 'success');
          copyDepositCodeBtn.classList.add('copied');
          setTimeout(() => copyDepositCodeBtn.classList.remove('copied'), 1500);
        });
      } else {
        showToast('Genera prima un codice valido', 'error');
      }
    });
  }

  copyLinkBtn.addEventListener('click', () => {
    const url = `${window.location.origin}/?code=${encodeURIComponent(currentDepositedCode)}`;
    copyToClipboard(url, () => showToast('Link diretto copiato negli appunti!', 'success'));
  });

  shareNativeBtn.addEventListener('click', () => {
    const url = `${window.location.origin}/?code=${encodeURIComponent(currentDepositedCode)}`;
    if (navigator.share) {
      navigator.share({
        title: 'Razzo Mail — File nel Locker',
        text: `Ti ho lasciato un file nel Locker #${currentDepositedCode} su Razzo Mail:`,
        url: url
      }).catch(() => {});
    } else {
      copyToClipboard(url, () => showToast('Link copiato negli appunti!', 'success'));
    }
  });

  resetDepositBtn.addEventListener('click', () => {
    depositSuccessCard.classList.add('hidden');
    depositForm.classList.remove('hidden');
    selectedFile = null;
    fileInput.value = '';
    textNoteInput.value = '';
    if (isNoteMode) toggleNoteMode();
    filePreviewCard.classList.add('hidden');
    dropPrompt.classList.remove('hidden');
    depositPinInput.value = '';
    if (availableFromInput) availableFromInput.value = '';
    generateRandomCode();
    if (activeWs) activeWs.close();
  });

  // --- PICKUP / RICEZIONE ---
  checkAndPickupBtn.addEventListener('click', async () => {
    const p1 = pickupCodePart1.value.trim();
    const p2 = pickupCodePart2.value.trim();

    if (p1.length !== 4 || p2.length !== 4) {
      showToast('Inserisci il codice di 8 caratteri (es. K8$m-2!pX)', 'error');
      return;
    }

    const code = `${p1}-${p2}`;
    const pin = pickupPinInput.value.trim();

    checkAndPickupBtn.disabled = true;

    try {
      const res = await fetch('/api/lockers/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, pin })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.status === 'waiting') {
          // Locker is waiting for sender to drop! Real-Time listening mode
          waitingReceiverCard.classList.remove('hidden');
          downloadReadyCard.classList.add('hidden');
          waitingLockerCodeSpan.textContent = code;
          listenForSenderRealtime(code, pin);
          return;
        }
        if (data.status === 'embargo') {
          showToast(`⏳ ${data.error}`, 'info');
          return;
        }
        throw new Error(data.error || 'Codice non trovato o scaduto');
      }

      // Locker found and unlocked!
      activeLockerData = { code, pin, ...data };
      displayDownloadReady(activeLockerData);

      // Save locally if checked
      if (rememberLockerCheck.checked) {
        localStorage.setItem('razzo_last_locker', JSON.stringify({ code, pin }));
      }

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      checkAndPickupBtn.disabled = false;
    }
  });

  function listenForSenderRealtime(code, pin) {
    if (activeWs) activeWs.close();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${encodeURIComponent(code)}`;

    try {
      activeWs = new WebSocket(wsUrl);

      activeWs.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'file_deposited') {
          // File has arrived! Fetch details and display
          waitingReceiverCard.classList.add('hidden');
          showToast('🚀 Il mittente ha appena depositato il file!', 'success');

          // Trigger check
          const res = await fetch('/api/lockers/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, pin })
          });
          if (res.ok) {
            const data = await res.json();
            activeLockerData = { code, pin, ...data };
            displayDownloadReady(activeLockerData);
          }
        }
      };
    } catch (e) {
      console.warn('[WS] Errore ascolto receiver', e);
    }
  }

  function displayDownloadReady(data) {
    waitingReceiverCard.classList.add('hidden');
    downloadReadyCard.classList.remove('hidden');

    readyFileName.textContent = data.filename || 'File allegato';
    readyFileSize.textContent = formatBytes(data.size || 0);

    const expMin = Math.max(1, Math.round((new Date(data.expires_at) - new Date()) / 60000));
    readyFileExpiry.textContent = `Scade tra ${expMin} min`;

    if (data.burn) {
      readyBurnWarning.classList.remove('hidden');
    } else {
      readyBurnWarning.classList.add('hidden');
    }

    if (data.note_content) {
      readyNoteContentBox.classList.remove('hidden');
      readyNoteText.textContent = data.note_content;
    } else {
      readyNoteContentBox.classList.add('hidden');
    }

    // Scroll to download card smoothly
    downloadReadyCard.scrollIntoView({ behavior: 'smooth' });
  }

  // Execute Download (One-Click Download)
  executeDownloadBtn.addEventListener('click', async () => {
    if (!activeLockerData) return;

    executeDownloadBtn.disabled = true;

    try {
      const res = await fetch('/api/lockers/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeLockerData.code,
          pin: activeLockerData.pin || ''
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Impossibile scaricare il file');
      }

      // Convert response stream to download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = activeLockerData.filename || 'razzo_file.bin';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      showToast('Download avviato con successo!', 'success');

      if (activeLockerData.burn) {
        showToast('🔥 File autodistrutto dal server!', 'info');
        setTimeout(() => {
          downloadReadyCard.classList.add('hidden');
          pickupCodePart1.value = '';
          pickupCodePart2.value = '';
          pickupPinInput.value = '';
          activeLockerData = null;
        }, 2000);
      }

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      executeDownloadBtn.disabled = false;
    }
  });

  // --- GESTIONE PARAMETRI URL SENZA SWITCH FORZATO ---
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('code') || urlParams.get('pickup');
  if (codeParam) {
    const decoded = decodeURIComponent(codeParam).trim().replace(/[^a-zA-Z0-9!@$*+=_-]/g, '');
    let p1 = '', p2 = '';
    if (decoded.includes('-')) {
      const parts = decoded.split('-');
      p1 = (parts[0] || '').slice(0, 4);
      p2 = (parts[1] || '').slice(0, 4);
    } else if (decoded.length >= 8) {
      p1 = decoded.slice(0, 4);
      p2 = decoded.slice(4, 8);
    }
    if (p1 && p2) {
      pickupCodePart1.value = p1;
      pickupCodePart2.value = p2;
    }
    // Rimuove immediatamente i parametri dall'indirizzo per non causare ricariche o cambi indesiderati
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // --- TOAST UTILITY ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(() => toast.remove(), 200);
    }, 3500);
  }

  // --- SERVICE WORKER (Installazione PWA su smartphone e desktop) ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }
});

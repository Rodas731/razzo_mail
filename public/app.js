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

  const modeFileBtn = document.getElementById('modeFileBtn');
  const modeTextBtn = document.getElementById('modeTextBtn');
  const fileDepositContainer = document.getElementById('fileDepositContainer');
  const textNoteContainer = document.getElementById('textNoteContainer');
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
  const readyBadge = document.getElementById('readyBadge');
  const readyBadgeIcon = document.getElementById('readyBadgeIcon');
  const readyBadgeText = document.getElementById('readyBadgeText');
  const readyFileName = document.getElementById('readyFileName');
  const readyFileSize = document.getElementById('readyFileSize');
  const readyFileExpiry = document.getElementById('readyFileExpiry');
  const readyBurnWarning = document.getElementById('readyBurnWarning');
  const readyNoteContentBox = document.getElementById('readyNoteContentBox');
  const readyNoteText = document.getElementById('readyNoteText');
  const copyNoteBtn = document.getElementById('copyNoteBtn');
  const readyNoteBurnedMsg = document.getElementById('readyNoteBurnedMsg');
  const executeDownloadBtn = document.getElementById('executeDownloadBtn');
  const executeDownloadBtnInner = document.getElementById('executeDownloadBtnInner');
  const executeDownloadBtnText = document.getElementById('executeDownloadBtnText');
  const notePostViewActions = document.getElementById('notePostViewActions');
  const closeNoteViewBtn = document.getElementById('closeNoteViewBtn');
  const downloadNoteAsFileBtn = document.getElementById('downloadNoteAsFileBtn');

  // Chat Window Elements
  const chatWindowCard = document.getElementById('chatWindowCard');
  const chatLockerBadge = document.getElementById('chatLockerBadge');
  const chatStatusText = document.getElementById('chatStatusText');
  const chatBubblesList = document.getElementById('chatBubblesList');
  const chatReplyForm = document.getElementById('chatReplyForm');
  const chatReplyInput = document.getElementById('chatReplyInput');
  const chatReplySendBtn = document.getElementById('chatReplySendBtn');
  const chatTopCloseBtn = document.getElementById('chatTopCloseBtn');
  const chatBottomCloseBtn = document.getElementById('chatBottomCloseBtn');
  const chatCopyBtn = document.getElementById('chatCopyBtn');
  const chatSaveEncryptedBtn = document.getElementById('chatSaveEncryptedBtn');
  const chatDestroyBtn = document.getElementById('chatDestroyBtn');
  const chatLiveEntryBox = document.getElementById('chatLiveEntryBox');
  const enterChatAfterDepositBtn = document.getElementById('enterChatAfterDepositBtn');

  // Stato Chat Live Real-Time
  let activeChatCode = null;
  let myChatRole = 'receiver'; // 'sender' | 'receiver'
  let myChatId = 'user_' + Math.random().toString(36).substring(2, 9);
  let activeChatMessages = [];

  // Modals: Save Encrypted
  const saveEncryptedModal = document.getElementById('saveEncryptedModal');
  const closeSaveEncryptedModalBtn = document.getElementById('closeSaveEncryptedModalBtn');
  const cancelSaveEncryptedBtn = document.getElementById('cancelSaveEncryptedBtn');
  const confirmSaveEncryptedBtn = document.getElementById('confirmSaveEncryptedBtn');
  const savePinInput = document.getElementById('savePinInput');
  const toggleSavePinEyeBtn = document.getElementById('toggleSavePinEyeBtn');

  // Modals: Vault & Decrypt
  const openVaultBtn = document.getElementById('openVaultBtn');
  const vaultModal = document.getElementById('vaultModal');
  const closeVaultModalBtn = document.getElementById('closeVaultModalBtn');
  const vaultTabLocalBtn = document.getElementById('vaultTabLocalBtn');
  const vaultTabFileBtn = document.getElementById('vaultTabFileBtn');
  const vaultSectionLocal = document.getElementById('vaultSectionLocal');
  const vaultSectionFile = document.getElementById('vaultSectionFile');
  const vaultNotesList = document.getElementById('vaultNotesList');
  const vaultEmptyNotice = document.getElementById('vaultEmptyNotice');
  const vaultFileDropZone = document.getElementById('vaultFileDropZone');
  const vaultFileInput = document.getElementById('vaultFileInput');
  const vaultFileChosenBox = document.getElementById('vaultFileChosenBox');
  const vaultChosenFileName = document.getElementById('vaultChosenFileName');
  const vaultDecryptForm = document.getElementById('vaultDecryptForm');
  const vaultUnlockPinInput = document.getElementById('vaultUnlockPinInput');
  const toggleVaultPinEyeBtn = document.getElementById('toggleVaultPinEyeBtn');
  const vaultDecryptBtn = document.getElementById('vaultDecryptBtn');

  // Modals: Legal Disclaimer
  const openLegalModalBtn = document.getElementById('openLegalModalBtn');
  const legalModal = document.getElementById('legalModal');
  const closeLegalModalBtn = document.getElementById('closeLegalModalBtn');
  const agreeLegalModalBtn = document.getElementById('agreeLegalModalBtn');

  const toastContainer = document.getElementById('toastContainer');

  // State
  let selectedFile = null;
  let isNoteMode = false;
  let activeWs = null;
  let currentDepositedCode = '';
  let activeLockerData = null;
  let lastViewedNoteText = '';
  let lastViewedCode = '';
  let lastViewedPin = '';
  let selectedVaultFilePayload = null;
  let selectedVaultNoteItem = null;

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
    // Quando la prima o seconda casella riceve il focus, seleziona tutto il testo
    part1.addEventListener('focus', () => {
      part1.select();
    });
    part2.addEventListener('focus', () => {
      part2.select();
    });

    // Se l'utente preme un tasto per scrivere nella prima casella:
    // svuota immediatamente la seconda casella per garantire la digitazione continua degli 8 simboli senza dover cancellare
    part1.addEventListener('keydown', (e) => {
      if (!['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Control', 'Alt', 'Meta', 'Shift'].includes(e.key)) {
        part2.value = '';
      }
    });

    part1.addEventListener('input', () => {
      part1.value = part1.value.replace(CODE_CHARS_REGEX, '');
      // Svuota sempre la seconda casella se si digita nella prima
      part2.value = '';
      if (part1.value.length >= 4) {
        part1.value = part1.value.slice(0, 4);
        part2.value = '';
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
          } else {
            part2.value = '';
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

  // --- DEPOSIT MODE SWITCH (FILE VS TEXT NOTE) ---
  function setDepositMode(mode) {
    if (mode === 'text') {
      isNoteMode = true;
      if (modeTextBtn) modeTextBtn.classList.add('active');
      if (modeFileBtn) modeFileBtn.classList.remove('active');
      if (fileDepositContainer) fileDepositContainer.classList.add('hidden');
      if (textNoteContainer) textNoteContainer.classList.remove('hidden');
      const innerSpan = sendDepositBtn ? sendDepositBtn.querySelector('.btn-inner span') || sendDepositBtn.querySelector('span:not(.btn-inner)') : null;
      if (innerSpan) innerSpan.textContent = 'INVIA MESSAGGIO IN CHAT';
      if (textNoteInput) textNoteInput.focus();
    } else {
      isNoteMode = false;
      if (modeFileBtn) modeFileBtn.classList.add('active');
      if (modeTextBtn) modeTextBtn.classList.remove('active');
      if (fileDepositContainer) fileDepositContainer.classList.remove('hidden');
      if (textNoteContainer) textNoteContainer.classList.add('hidden');
      const innerSpan = sendDepositBtn ? sendDepositBtn.querySelector('.btn-inner span') || sendDepositBtn.querySelector('span:not(.btn-inner)') : null;
      if (innerSpan) innerSpan.textContent = 'INVIA FILE NEL LOCKER';
    }
  }

  if (modeFileBtn) modeFileBtn.addEventListener('click', () => setDepositMode('file'));
  if (modeTextBtn) modeTextBtn.addEventListener('click', () => setDepositMode('text'));

  // --- ONE-CLICK SEND / DEPOSIT ---
  sendDepositBtn.addEventListener('click', async () => {
    let p1 = depositCodePart1.value.trim();
    let p2 = depositCodePart2.value.trim();

    // Se per qualsiasi motivo il codice è incompleto, autogeneralo subito senza bloccare l'utente!
    if (p1.length !== 4 || p2.length !== 4) {
      fallbackRandomCode();
      p1 = depositCodePart1.value.trim();
      p2 = depositCodePart2.value.trim();
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
    const noteText = textNoteInput ? textNoteInput.value.trim() : '';

    // Invio nota di testo se la modalità testo è attiva oppure se l'utente ha inserito testo
    const isSendingNote = isNoteMode || (!fileToUpload && noteText.length > 0);
    if (isSendingNote) {
      if (!noteText) {
        showToast('Scrivi un messaggio di testo prima di inviare!', 'error');
        if (textNoteInput) textNoteInput.focus();
        return;
      }
      const blob = new Blob([noteText], { type: 'text/plain;charset=utf-8' });
      fileToUpload = new File([blob], `messaggio_${lockerCode}.txt`, { type: 'text/plain' });
    }

    if (!fileToUpload) {
      showToast('Seleziona un file da inviare oppure scrivi un messaggio di testo!', 'error');
      return;
    }

    // Build FormData
    const formData = new FormData();
    formData.append('code', lockerCode);
    formData.append('file', fileToUpload);
    formData.append('burn', burn ? 'true' : 'false');
    formData.append('ttl_hours', ttlHours);
    formData.append('is_note', isSendingNote ? 'true' : 'false');
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
      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { error: 'Risposta del server non valida.' };
      }

      if (!res.ok) {
        throw new Error(data.error || 'Errore durante il deposito del contenuto');
      }

      // Success! Show Result Card
      currentDepositedCode = lockerCode;
      depositForm.classList.add('hidden');
      depositSuccessCard.classList.remove('hidden');
      successCodeDisplay.textContent = lockerCode;

      if (isSendingNote) {
        showToast('Messaggio depositato nel Locker! Puoi entrare nella chat live.', 'success');
        if (chatLiveEntryBox) chatLiveEntryBox.classList.remove('hidden');
        if (senderRadarBox) senderRadarBox.classList.add('hidden');
      } else {
        showToast('File depositato nel Locker con successo!', 'success');
        if (chatLiveEntryBox) chatLiveEntryBox.classList.add('hidden');
        if (senderRadarBox) senderRadarBox.classList.remove('hidden');
        // Start Real-Time WebSocket Listener for Sender file pickup
        connectSenderWebSocket(lockerCode);
      }

    } catch (err) {
      if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        showToast('Impossibile contattare il server. Assicurati che "Avvia Razzo Mail.bat" sia aperto.', 'error');
      } else {
        showToast(err.message, 'error');
      }
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
    setDepositMode('file');
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
      const isNote = Boolean(
        data.is_note === true ||
        data.is_note === 'true' ||
        (data.filename && data.filename.startsWith('messaggio_'))
      );

      // Save locally if checked
      if (rememberLockerCheck.checked) {
        localStorage.setItem('razzo_last_locker', JSON.stringify({ code, pin }));
      }

      if (isNote) {
        // Entra direttamente nella Chat Room bidirezionale in tempo reale!
        await openLiveChat(code, 'receiver', pin);
      } else {
        displayDownloadReady(activeLockerData);
      }

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      checkAndPickupBtn.disabled = false;
    }
  });

  // Listener ingresso rapido nella chat dal mittente
  if (enterChatAfterDepositBtn) {
    enterChatAfterDepositBtn.addEventListener('click', () => {
      if (currentDepositedCode) {
        openLiveChat(currentDepositedCode, 'sender');
      }
    });
  }

  // --- CHAT ROOM LIVE BIDIREZIONALE (CONTINUA & IN TEMPO REALE) ---
  async function openLiveChat(code, role, pin = '') {
    activeChatCode = code;
    myChatRole = role;
    lastViewedCode = code;
    lastViewedPin = pin;
    activeChatMessages = [];

    // Nascondi altre viste
    if (waitingReceiverCard) waitingReceiverCard.classList.add('hidden');
    if (downloadReadyCard) downloadReadyCard.classList.add('hidden');
    if (depositSuccessCard) depositSuccessCard.classList.add('hidden');
    if (depositForm) depositForm.classList.add('hidden');

    if (chatLockerBadge) chatLockerBadge.textContent = `#${code}`;
    if (chatBubblesList) chatBubblesList.innerHTML = '';
    chatWindowCard.classList.remove('hidden');
    chatWindowCard.scrollIntoView({ behavior: 'smooth' });

    // Connetti WebSocket dedicato per la stanza di chat
    connectChatWebSocket(code);

    // Carica messaggi esistenti da /api/chat/:code
    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          data.messages.forEach(msg => appendChatMessage(msg));
        }
      }
    } catch (e) {
      console.warn('Errore recupero messaggi stanza chat', e);
    }

    if (chatReplyInput) {
      setTimeout(() => chatReplyInput.focus(), 150);
    }
  }

  function connectChatWebSocket(code) {
    if (activeWs) {
      try { activeWs.close(); } catch (_) {}
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${encodeURIComponent(code)}`;

    try {
      activeWs = new WebSocket(wsUrl);

      activeWs.onopen = () => {
        if (chatStatusText) chatStatusText.textContent = '🟢 Connesso • Scambio in tempo reale';
      };

      activeWs.onclose = () => {
        if (chatStatusText) chatStatusText.textContent = '⚪ Disconnesso (Riconnessione...)';
      };

      activeWs.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'chat_message' && payload.message) {
            appendChatMessage(payload.message);
          } else if (payload.type === 'chat_destroyed') {
            showToast('🔥 La chat è stata distrutta dall\'interlocutore.', 'info');
            closeChatWindow();
          }
        } catch (e) {
          console.error('[WS] Errore parsing messaggio chat', e);
        }
      };
    } catch (e) {
      console.warn('[WS] Impossibile avviare socket chat', e);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function appendChatMessage(msgItem) {
    if (!msgItem || !msgItem.id) return;
    if (activeChatMessages.some(m => m.id === msgItem.id)) return;
    activeChatMessages.push(msgItem);

    // Calcola se il messaggio appartiene all'utente corrente
    const isMine = (msgItem.sender_id === myChatId) ||
                   (myChatRole === 'sender' && msgItem.sender_role === 'sender' && msgItem.sender_id === 'sender') ||
                   (myChatRole === 'receiver' && msgItem.sender_role === 'receiver');

    const bubble = document.createElement('div');
    bubble.className = isMine ? 'chat-bubble-outbound' : 'chat-bubble-inbound';

    let authorLabel = isMine ? 'Tu' : (msgItem.sender_role === 'sender' ? 'Mittente' : 'Destinatario');
    const timeStr = msgItem.timestamp
      ? new Date(msgItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Adesso';

    const safeText = escapeHtml(msgItem.text);

    bubble.innerHTML = `
      <div class="chat-bubble-author">${authorLabel}</div>
      <div class="chat-bubble-text">${safeText}</div>
      <div class="chat-bubble-meta">
        <span>${timeStr}</span>
        <span class="chat-ticks">✓✓</span>
      </div>
    `;

    if (chatBubblesList) {
      chatBubblesList.appendChild(bubble);
      const area = document.getElementById('chatMessagesArea');
      if (area) {
        area.scrollTop = area.scrollHeight;
      }
    }
  }

  // Invio messaggi continuo dalla chat reply bar
  if (chatReplyForm) {
    chatReplyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeChatCode) return;
      if (chatReplyForm.dataset.submitting === 'true') return;
      const text = chatReplyInput.value.trim();
      if (!text) return;

      chatReplyForm.dataset.submitting = 'true';
      chatReplyInput.value = '';

      // Invia via HTTP POST per persistenza e broadcast automatico a tutti i socket
      try {
        const res = await fetch(`/api/chat/${encodeURIComponent(activeChatCode)}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text,
            sender_role: myChatRole,
            sender_id: myChatId
          })
        });
        if (res.ok) {
          const savedMsg = await res.json();
          appendChatMessage(savedMsg);
        } else {
          showToast('Impossibile inviare il messaggio', 'error');
        }
      } catch (err) {
        console.error('Errore invio messaggio', err);
        showToast('Errore durante l\'invio del messaggio', 'error');
      } finally {
        delete chatReplyForm.dataset.submitting;
      }

      if (chatReplyInput) chatReplyInput.focus();
    });
  }

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
          const isNote = Boolean(msg.is_note);

          if (isNote) {
            showToast('🚀 Il mittente ha inviato il messaggio!', 'success');
            await openLiveChat(code, 'receiver', pin);
          } else {
            showToast('🚀 Il mittente ha appena depositato il file!', 'success');
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
        }
      };
    } catch (e) {
      console.warn('[WS] Errore ascolto receiver', e);
    }
  }

  function displayDownloadReady(data) {
    waitingReceiverCard.classList.add('hidden');
    chatWindowCard.classList.add('hidden');
    downloadReadyCard.classList.remove('hidden');

    if (readyBadgeIcon) {
      readyBadgeIcon.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      `;
    }
    if (readyBadgeText) readyBadgeText.textContent = 'FILE PRONTO AL RITIRO';
    readyFileName.textContent = data.filename || 'File allegato';
    readyFileSize.textContent = formatBytes(data.size || 0);

    if (data.burn) {
      readyBurnWarning.textContent = '🔥 Questo file si autodistruggerà subito dopo il download';
      readyBurnWarning.classList.remove('hidden');
    } else {
      readyBurnWarning.classList.add('hidden');
    }

    executeDownloadBtn.className = 'btn-primary-action btn-download';
    const inner = executeDownloadBtn.querySelector('.btn-inner') || executeDownloadBtn;
    if (inner) {
      inner.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span>SCARICA SUBITO</span>
      `;
    }

    const expMin = Math.max(1, Math.round((new Date(data.expires_at) - new Date()) / 60000));
    readyFileExpiry.textContent = `Scade tra ${expMin} min`;
    downloadReadyCard.scrollIntoView({ behavior: 'smooth' });
  }

  // Execute Download for regular files
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
        throw new Error(err.error || 'Impossibile completare la richiesta');
      }

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

  // --- AZIONI CHAT WINDOW ---
  if (chatCopyBtn) {
    chatCopyBtn.addEventListener('click', () => {
      if (!activeChatMessages || activeChatMessages.length === 0) {
        showToast('Nessun messaggio presente nella chat', 'info');
        return;
      }
      const transcript = activeChatMessages.map(m => {
        const t = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const who = (m.sender_id === myChatId) ? 'Tu' : (m.sender_role === 'sender' ? 'Mittente' : 'Destinatario');
        return `[${t}] ${who}: ${m.text}`;
      }).join('\n');

      copyToClipboard(transcript, () => showToast('Conversazione copiata negli appunti!', 'success'));
    });
  }

  if (chatSaveEncryptedBtn) {
    chatSaveEncryptedBtn.addEventListener('click', () => {
      if (!activeChatMessages || activeChatMessages.length === 0) {
        showToast('Nessun messaggio da salvare', 'error');
        return;
      }
      const transcript = activeChatMessages.map(m => {
        const t = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const who = (m.sender_id === myChatId) ? 'Tu' : (m.sender_role === 'sender' ? 'Mittente' : 'Destinatario');
        return `[${t}] ${who}: ${m.text}`;
      }).join('\n');

      lastViewedNoteText = transcript;
      if (savePinInput) savePinInput.value = lastViewedPin || '';
      saveEncryptedModal.classList.remove('hidden');
      if (savePinInput) savePinInput.focus();
    });
  }

  if (chatDestroyBtn) {
    chatDestroyBtn.addEventListener('click', async () => {
      if (!activeChatCode) return;
      if (!confirm('Vuoi davvero autodistruggere questa chat per entrambi? Tutti i messaggi verranno eliminati istantaneamente per sempre.')) {
        return;
      }
      try {
        await fetch(`/api/chat/${encodeURIComponent(activeChatCode)}/destroy`, { method: 'POST' });
        showToast('💥 Chat autodistrutta con successo!', 'success');
        closeChatWindow();
      } catch (e) {
        showToast('Errore durante la distruzione della chat', 'error');
      }
    });
  }

  function closeChatWindow() {
    chatWindowCard.classList.add('hidden');
    pickupCodePart1.value = '';
    pickupCodePart2.value = '';
    pickupPinInput.value = '';
    activeLockerData = null;
    activeChatCode = null;
    activeChatMessages = [];
    if (activeWs) {
      try { activeWs.close(); } catch (_) {}
    }
  }

  if (chatTopCloseBtn) chatTopCloseBtn.addEventListener('click', closeChatWindow);
  if (chatBottomCloseBtn) chatBottomCloseBtn.addEventListener('click', closeChatWindow);

  // --- CRITTOGRAFIA CON PIN (AES-256-GCM + PBKDF2) ---
  async function deriveKeyFromPin(pin, saltBytes) {
    if (window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder();
      const baseKey = await crypto.subtle.importKey(
        'raw',
        enc.encode(pin),
        'PBKDF2',
        false,
        ['deriveKey']
      );
      return await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations: 100000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    }
    return null;
  }

  async function encryptNoteWithPin(text, pin) {
    if (window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKeyFromPin(pin, salt);
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(text)
      );
      return {
        v: 1,
        app: 'RazzoMail',
        cipher: 'AES-GCM-256',
        code: lastViewedCode || 'NOTE',
        date: new Date().toISOString(),
        salt: btoa(String.fromCharCode(...salt)),
        iv: btoa(String.fromCharCode(...iv)),
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
      };
    } else {
      return fallbackEncrypt(text, pin);
    }
  }

  async function decryptNoteWithPin(payload, pin) {
    if (payload.cipher === 'AES-GCM-256' && window.crypto && window.crypto.subtle) {
      const dec = new TextDecoder();
      const salt = Uint8Array.from(atob(payload.salt), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
      const ciphertext = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0));
      const key = await deriveKeyFromPin(pin, salt);
      try {
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          ciphertext
        );
        return dec.decode(decrypted);
      } catch (e) {
        throw new Error('PIN errato: decifratura non riuscita');
      }
    } else if (payload.cipher === 'FALLBACK-XOR') {
      return fallbackDecrypt(payload, pin);
    } else {
      throw new Error('Formato crittografico o browser non supportato');
    }
  }

  function fallbackEncrypt(text, pin) {
    const salt = String(Date.now()) + Math.random().toString(36);
    const keyStr = pin + salt;
    let cipher = '';
    for (let i = 0; i < text.length; i++) {
      cipher += String.fromCharCode(text.charCodeAt(i) ^ keyStr.charCodeAt(i % keyStr.length));
    }
    return {
      v: 1,
      app: 'RazzoMail',
      cipher: 'FALLBACK-XOR',
      code: lastViewedCode || 'NOTE',
      date: new Date().toISOString(),
      salt: btoa(salt),
      ciphertext: btoa(unescape(encodeURIComponent(cipher)))
    };
  }

  function fallbackDecrypt(payload, pin) {
    const salt = atob(payload.salt);
    const keyStr = pin + salt;
    const cipher = decodeURIComponent(escape(atob(payload.ciphertext)));
    let text = '';
    for (let i = 0; i < cipher.length; i++) {
      text += String.fromCharCode(cipher.charCodeAt(i) ^ keyStr.charCodeAt(i % keyStr.length));
    }
    return text;
  }

  // --- GESTIONE CASSAFORTE LOCALE (LOCALSTORAGE) ---
  const VAULT_STORAGE_KEY = 'razzo_vault_notes';

  function getStoredVaultNotes() {
    try {
      const raw = localStorage.getItem(VAULT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveNoteToVault(payload) {
    const notes = getStoredVaultNotes();
    notes.unshift({
      id: Date.now(),
      code: payload.code || 'NOTE',
      date: payload.date || new Date().toISOString(),
      payload: payload
    });
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(notes));
  }

  function deleteNoteFromVault(id) {
    let notes = getStoredVaultNotes();
    notes = notes.filter(n => n.id !== id);
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(notes));
    renderVaultNotes();
  }

  function downloadEncryptedFile(payload, filename) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }

  function renderVaultNotes() {
    const notes = getStoredVaultNotes();
    vaultNotesList.innerHTML = '';
    selectedVaultNoteItem = null;
    vaultDecryptForm.classList.add('hidden');
    vaultUnlockPinInput.value = '';

    if (notes.length === 0) {
      vaultEmptyNotice.classList.remove('hidden');
      return;
    }

    vaultEmptyNotice.classList.add('hidden');
    notes.forEach(note => {
      const item = document.createElement('div');
      item.className = 'vault-note-item';
      const formattedDate = new Date(note.date).toLocaleString([], {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      item.innerHTML = `
        <div class="vault-note-info">
          <span class="vault-note-title">Nota #${note.code}</span>
          <span class="vault-note-date">${formattedDate} (Cifrata AES-256)</span>
        </div>
        <button type="button" class="btn-vault-delete" title="Elimina nota">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.btn-vault-delete')) {
          e.stopPropagation();
          deleteNoteFromVault(note.id);
          return;
        }
        document.querySelectorAll('.vault-note-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        selectedVaultNoteItem = note.payload;
        selectedVaultFilePayload = null;
        vaultDecryptForm.classList.remove('hidden');
        vaultUnlockPinInput.focus();
      });

      vaultNotesList.appendChild(item);
    });
  }

  // --- EVENTI MODAL: SALVA CIFRATO ---
  if (confirmSaveEncryptedBtn) {
    confirmSaveEncryptedBtn.addEventListener('click', async () => {
      const pin = savePinInput.value.trim();
      if (!pin) {
        showToast('Inserisci un PIN per proteggere la nota', 'error');
        savePinInput.focus();
        return;
      }
      if (!lastViewedNoteText) {
        showToast('Nessun testo da salvare', 'error');
        return;
      }

      confirmSaveEncryptedBtn.disabled = true;
      try {
        const encrypted = await encryptNoteWithPin(lastViewedNoteText, pin);
        const destType = document.querySelector('input[name="saveDestType"]:checked')?.value || 'vault';

        if (destType === 'vault') {
          saveNoteToVault(encrypted);
          showToast('Nota salvata nella Cassaforte protetta da PIN!', 'success');
        } else {
          downloadEncryptedFile(encrypted, `nota_cifrata_${lastViewedCode || 'segreta'}.razzo`);
          showToast('File cifrato .razzo scaricato sul dispositivo!', 'success');
        }
        saveEncryptedModal.classList.add('hidden');
      } catch (e) {
        showToast('Errore durante la cifratura: ' + e.message, 'error');
      } finally {
        confirmSaveEncryptedBtn.disabled = false;
      }
    });
  }

  if (closeSaveEncryptedModalBtn) closeSaveEncryptedModalBtn.addEventListener('click', () => saveEncryptedModal.classList.add('hidden'));
  if (cancelSaveEncryptedBtn) cancelSaveEncryptedBtn.addEventListener('click', () => saveEncryptedModal.classList.add('hidden'));

  if (toggleSavePinEyeBtn) {
    toggleSavePinEyeBtn.addEventListener('click', () => {
      savePinInput.type = savePinInput.type === 'password' ? 'text' : 'password';
    });
  }

  // --- EVENTI MODAL: CASSAFORTE & DECIFRATURA ---
  if (openVaultBtn) {
    openVaultBtn.addEventListener('click', () => {
      renderVaultNotes();
      vaultModal.classList.remove('hidden');
    });
  }

  if (closeVaultModalBtn) {
    closeVaultModalBtn.addEventListener('click', () => {
      vaultModal.classList.add('hidden');
    });
  }

  if (vaultTabLocalBtn && vaultTabFileBtn) {
    vaultTabLocalBtn.addEventListener('click', () => {
      vaultTabLocalBtn.classList.add('active');
      vaultTabFileBtn.classList.remove('active');
      vaultSectionLocal.classList.remove('hidden');
      vaultSectionFile.classList.add('hidden');
      selectedVaultFilePayload = null;
      vaultDecryptForm.classList.add('hidden');
    });

    vaultTabFileBtn.addEventListener('click', () => {
      vaultTabFileBtn.classList.add('active');
      vaultTabLocalBtn.classList.remove('active');
      vaultSectionFile.classList.remove('hidden');
      vaultSectionLocal.classList.add('hidden');
      selectedVaultNoteItem = null;
      vaultDecryptForm.classList.add('hidden');
    });
  }

  // Upload .razzo file
  if (vaultFileDropZone && vaultFileInput) {
    vaultFileDropZone.addEventListener('click', () => vaultFileInput.click());

    vaultFileDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      vaultFileDropZone.style.borderColor = 'var(--accent-cyan)';
    });

    vaultFileDropZone.addEventListener('dragleave', () => {
      vaultFileDropZone.style.borderColor = '';
    });

    vaultFileDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      vaultFileDropZone.style.borderColor = '';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleVaultFileUpload(e.dataTransfer.files[0]);
      }
    });

    vaultFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleVaultFileUpload(e.target.files[0]);
      }
    });
  }

  function handleVaultFileUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.ciphertext || !parsed.salt) {
          throw new Error('File crittografico non valido o non riconosciuto');
        }
        selectedVaultFilePayload = parsed;
        selectedVaultNoteItem = null;
        vaultChosenFileName.textContent = file.name;
        vaultFileChosenBox.classList.remove('hidden');
        vaultDecryptForm.classList.remove('hidden');
        vaultUnlockPinInput.focus();
        showToast('File .razzo caricato. Inserisci il PIN per decifrare.', 'info');
      } catch (err) {
        showToast('Impossibile leggere il file: formato non valido', 'error');
      }
    };
    reader.readAsText(file);
  }

  if (toggleVaultPinEyeBtn) {
    toggleVaultPinEyeBtn.addEventListener('click', () => {
      vaultUnlockPinInput.type = vaultUnlockPinInput.type === 'password' ? 'text' : 'password';
    });
  }

  // Decifra nota da cassaforte o file
  if (vaultDecryptBtn) {
    vaultDecryptBtn.addEventListener('click', async () => {
      const payload = selectedVaultNoteItem || selectedVaultFilePayload;
      if (!payload) {
        showToast('Seleziona una nota salvata o carica un file .razzo', 'error');
        return;
      }
      const pin = vaultUnlockPinInput.value.trim();
      if (!pin) {
        showToast('Inserisci il PIN di sblocco della nota', 'error');
        vaultUnlockPinInput.focus();
        return;
      }

      vaultDecryptBtn.disabled = true;
      try {
        const decryptedText = await decryptNoteWithPin(payload, pin);
        vaultModal.classList.add('hidden');
        switchTab('pickup');
        await openLiveChat(payload.code || 'DECIFRATO', 'receiver', pin);
        appendChatMessage({
          id: 'vault_' + Date.now(),
          sender_role: 'sender',
          sender_id: 'sender',
          text: decryptedText,
          timestamp: new Date().toISOString()
        });
        showToast('Nota decifrata con successo!', 'success');
      } catch (err) {
        showToast(err.message || 'PIN errato: decifratura fallita', 'error');
      } finally {
        vaultDecryptBtn.disabled = false;
      }
    });
  }

  // --- EVENTI MODAL: INFORMATIVA LEGALE & BETA TEST ---
  if (openLegalModalBtn) {
    openLegalModalBtn.addEventListener('click', () => {
      legalModal.classList.remove('hidden');
    });
  }

  if (closeLegalModalBtn) {
    closeLegalModalBtn.addEventListener('click', () => {
      legalModal.classList.add('hidden');
    });
  }

  if (agreeLegalModalBtn) {
    agreeLegalModalBtn.addEventListener('click', () => {
      legalModal.classList.add('hidden');
    });
  }

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
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        registration.update();
      }).catch(err => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }
});

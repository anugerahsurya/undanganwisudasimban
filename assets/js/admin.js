/**
 * ADMIN GUEST MANAGER - JAVASCRIPT
 * Handles: Guest List Management (Manual Add, Search, Delete, Reset),
 * Unique Link Generation, WhatsApp Direct Sharing, Copy Link, and Statistics.
 */

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'wisuda_guest_list_db';

  // Elements
  const btnResetData = document.getElementById('btn-reset-data');
  const searchInput = document.getElementById('search-guest');
  const guestTableBody = document.getElementById('guest-table-body');
  const quickAddForm = document.getElementById('quick-add-form');
  const toastContainer = document.getElementById('toast-container');

  // Stats Elements
  const statTotal = document.getElementById('stat-total');
  const statVip = document.getElementById('stat-vip');
  const statFriends = document.getElementById('stat-friends');
  const statLinks = document.getElementById('stat-links');

  // Excel Import Elements
  const btnDownloadTemplate = document.getElementById('btn-download-template');
  const excelDropzone = document.getElementById('excel-dropzone');
  const excelFileInput = document.getElementById('excel-file-input');

  /* ==========================================================================
     1. STORAGE & BASE URL MANAGEMENT
     ========================================================================== */
  function getBaseUrl() {
    if (window.location.hostname.includes('vercel.app')) {
      return 'https://wisudadyah.vercel.app';
    }
    // Fallback to origin without admin.html / trailing slash
    return window.location.href.split(/[?#]/)[0].replace(/(?:admin(?:\.html)?|index\.html)\/?$/, '').replace(/\/+$/, '');
  }

  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxfns7cgoNA83oYB4Ob-tQJrkjKqSwFJk6VUW1CoqNJ508zdgnFL2nC-tEe8-D0WA1k/exec';
  const BACKUP_KEY = STORAGE_KEY + '_before_sheets';
  let connected = false;
  let busy = false;
  let remoteGuests = [];
  let credentials = null;

  const syncPanel = document.createElement('section');
  syncPanel.className = 'admin-card sheets-panel';
  syncPanel.setAttribute('aria-labelledby', 'sheets-title');
  syncPanel.innerHTML = `
    <h2 id="sheets-title" class="card-title">Penyimpanan Google Sheets</h2>
    <p class="card-subtitle">Hubungkan Google Sheets untuk menyinkronkan data tamu dan mengimpor data lokal.</p>
    <form id="sheets-connect-form" class="sheets-form">
      <input id="sheets-url" type="hidden" value="${APPS_SCRIPT_URL}">
      <input id="sheets-token" type="hidden" value="">
      <button class="btn-nav" type="submit">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        Hubungkan ke Google Sheets
      </button>
    </form>
    <p id="sheets-token-help" class="sheets-help" style="display: none;"></p>
    <p id="sheets-status" class="sheets-status" role="status" aria-live="polite">Mode lokal: belum terhubung ke Spreadsheet.</p>
    <p id="sheets-local-count" class="sheets-help"></p>
    <div class="sheets-actions">
      <button id="sheets-import" class="btn-template" type="button">Impor data lokal ke Spreadsheet</button>
      <button id="sheets-refresh" class="btn-template" type="button">Muat ulang Spreadsheet</button>
      <button id="sheets-backup" class="btn-template" type="button">Unduh cadangan lokal (JSON)</button>
      <button id="sheets-disconnect" class="btn-template" type="button">Putuskan koneksi</button>
    </div>
    <p class="sheets-help">Impor mempertahankan kode undangan dan melewati data identik, bukan menimpa isi Spreadsheet.</p>
  `;
  document.querySelector('.admin-main').prepend(syncPanel);
  const connectionForm = document.getElementById('sheets-connect-form');
  const endpointInput = document.getElementById('sheets-url');
  const tokenInput = document.getElementById('sheets-token');
  const syncStatus = document.getElementById('sheets-status');

  if (endpointInput) {
    endpointInput.value = APPS_SCRIPT_URL;
  }

  function setStatus(message, error = false) {
    syncStatus.textContent = message;
    syncStatus.dataset.error = String(error);
  }

  function readLocalGuests() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    let guests;
    try { guests = JSON.parse(raw); } catch (_) {
      throw new Error('Data lokal tidak dapat dibaca. Unduh cadangan JSON; data asli tidak dihapus.');
    }
    if (!Array.isArray(guests) || guests.some(g => !g || typeof g.name !== 'string' || !g.name.trim())) {
      throw new Error('Format data lokal tidak valid. Unduh cadangan sebelum memperbaikinya.');
    }
    let changed = false;
    const codes = new Set(guests.filter(g => g.code).map(g => String(g.code)));
    guests.forEach(g => {
      if (!g.code) {
        do { g.code = generateGuestCode(); } while (codes.has(g.code));
        codes.add(g.code);
        changed = true;
      }
      if (g.id == null) {
        g.id = createGuestId();
        changed = true;
      }
    });
    if (changed) {
      preserveLocalBackup();
      saveGuests(guests);
    }
    return guests;
  }

  function preserveLocalBackup() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && !localStorage.getItem(BACKUP_KEY)) localStorage.setItem(BACKUP_KEY, raw);
  }

  function getGuests() {
    return connected ? remoteGuests : readLocalGuests();
  }

  function saveGuests(guests) {
    // Let callers report quota/privacy failures instead of claiming a successful save.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(guests));
  }

  function createGuestId() {
    return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() :
      Date.now() + '-' + generateGuestCode(12);
  }

  function updateSyncControls() {
    syncPanel.querySelectorAll('button, input').forEach(element => { element.disabled = busy; });
    document.getElementById('sheets-import').disabled = busy || !connected;
    document.getElementById('sheets-refresh').disabled = busy || !connected;
    document.getElementById('sheets-disconnect').disabled = busy || !connected;
    endpointInput.disabled = busy || connected;
    tokenInput.disabled = busy || connected;
    connectionForm.querySelector('button').disabled = busy || connected;
    if (quickAddForm) quickAddForm.querySelectorAll('button, input').forEach(el => { el.disabled = busy; });
    if (btnResetData) btnResetData.disabled = busy;
    document.querySelectorAll('.btn-delete').forEach(el => { el.disabled = busy; });
    if (excelFileInput) excelFileInput.disabled = busy;
    if (excelDropzone) excelDropzone.setAttribute('aria-disabled', String(busy));
    try {
      document.getElementById('sheets-local-count').textContent =
        `${readLocalGuests().length} tamu di penyimpanan lokal browser ini.`;
    } catch (error) {
      setStatus(error.message, true);
    }
    syncPanel.setAttribute('aria-busy', String(busy));
  }

  async function runOperation(work) {
    if (busy) return;
    busy = true;
    updateSyncControls();
    try {
      await work();
    } catch (error) {
      setStatus(error.message, true);
      showToast(error.message, 'error');
    } finally {
      busy = false;
      try { renderTable(searchInput ? searchInput.value : ''); } catch (error) {
        setStatus(error.message, true);
      }
      updateSyncControls();
    }
  }

  async function requestSheets(action, payload = {}, auth = credentials) {
    if (!auth) throw new Error('Hubungkan Apps Script terlebih dahulu.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      // text/plain avoids the CORS preflight unsupported by Apps Script web apps.
      const response = await fetch(auth.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ ...payload, action, token: auth.token }),
        redirect: 'follow',
        credentials: 'omit',
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Respons HTTP ' + response.status);
      let result;
      try { result = await response.json(); } catch (_) {
        throw new Error('Respons bukan JSON. Periksa URL /exec, izin deployment, dan versi Apps Script.');
      }
      if (!result || result.ok !== true) throw new Error(result && result.error || 'Apps Script menolak permintaan.');
      return result;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) {
        throw new Error('Koneksi gagal atau waktu habis. Hasil penulisan belum dapat dipastikan. Muat ulang Spreadsheet sebelum mencoba lagi; data kiriman tetap tersedia secara lokal.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function refreshSheets() {
    const result = await requestSheets('list');
    if (!Array.isArray(result.guests) || result.guests.some(g =>
      !g || typeof g.name !== 'string' || typeof g.category !== 'string' ||
      typeof g.code !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(g.code))) {
      throw new Error('Format daftar tamu dari Apps Script tidak valid.');
    }
    remoteGuests = result.guests;
  }

  function downloadLocalBackup() {
    const raw = localStorage.getItem(STORAGE_KEY) || '[]';
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cadangan-tamu-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function guestForSheets(guest) {
    const link = getUniqueLink(guest);
    return {
      id: String(guest.id),
      code: String(guest.code),
      name: guest.name,
      category: guest.category || 'Umum',
      phone: String(guest.phone || ''),
      link: /^https?:\/\//.test(link) ? link : ''
    };
  }

  async function importToSheets(guests) {
    let added = 0;
    let skipped = 0;
    for (let start = 0; start < guests.length; start += 500) {
      const batch = guests.slice(start, start + 500);
      setStatus(`Mengirim tamu ${start + 1}–${start + batch.length} dari ${guests.length}…`);
      const result = await requestSheets('import', { guests: batch.map(guestForSheets) });
      if (!Number.isInteger(result.added) || !Number.isInteger(result.skipped) ||
        result.added < 0 || result.skipped < 0 || result.added + result.skipped !== batch.length) {
        throw new Error('Konfirmasi impor tidak valid. Data lokal dipertahankan; muat ulang Spreadsheet.');
      }
      added += result.added;
      skipped += result.skipped;
      // Remove only acknowledged records; failed/unsent batches remain retryable.
      saveGuests(readLocalGuests().filter(local => !batch.some(sent =>
        String(local.code) === String(sent.code) && String(local.id) === String(sent.id) &&
        local.name === sent.name && (local.category || 'Umum') === (sent.category || 'Umum') &&
        String(local.phone || '') === String(sent.phone || ''))));
    }
    await refreshSheets();
    setStatus(`Tersimpan di Spreadsheet: ${added} tamu baru; ${skipped} data identik dilewati.`);
  }

  async function addGuests(guests, onStaged = () => { }) {
    const local = readLocalGuests();
    preserveLocalBackup();
    saveGuests([...guests, ...local]);
    onStaged();
    if (connected) {
      await importToSheets(guests);
    } else {
      setStatus('Tersimpan di browser ini saja. Hubungkan Apps Script lalu impor untuk menyimpan ke Spreadsheet.');
    }
  }

  async function deleteGuests(guests) {
    if (!connected) {
      preserveLocalBackup();
      const codes = new Set(guests.map(g => g.code));
      saveGuests(readLocalGuests().filter(g => !codes.has(g.code)));
      setStatus('Data dihapus dari penyimpanan lokal.');
      return;
    }
    for (let start = 0; start < guests.length; start += 500) {
      await requestSheets('delete', { codes: guests.slice(start, start + 500).map(g => g.code) });
    }
    await refreshSheets();
    setStatus('Penghapusan di Spreadsheet berhasil dikonfirmasi.');
  }

  connectionForm.addEventListener('submit', event => {
    event.preventDefault();
    runOperation(async () => {
      const url = (endpointInput && endpointInput.value ? endpointInput.value : APPS_SCRIPT_URL).trim();
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) {
        throw new Error('Gunakan URL deployment https://script.google.com/macros/s/…/exec.');
      }
      const token = (tokenInput && tokenInput.value ? tokenInput.value : '').trim();
      const auth = { url, token };
      const previous = credentials;
      credentials = auth;
      try { await refreshSheets(); } catch (error) { credentials = previous; throw error; }
      connected = true;
      if (tokenInput) tokenInput.value = '';
      setStatus(`Terhubung. ${remoteGuests.length} tamu dimuat dari Spreadsheet. Data lokal belum diimpor.`);
    });
  });

  document.getElementById('sheets-import').addEventListener('click', () => runOperation(async () => {
    const guests = readLocalGuests();
    if (!guests.length) { setStatus('Tidak ada data lokal yang perlu diimpor.'); return; }
    if (!confirm(`Impor ${guests.length} tamu lokal ke Spreadsheet? Cadangan JSON akan diunduh. Kode undangan tetap sama; data identik dilewati.`)) return;
    preserveLocalBackup();
    downloadLocalBackup();
    await importToSheets(guests);
  }));
  document.getElementById('sheets-refresh').addEventListener('click', () => runOperation(async () => {
    await refreshSheets();
    setStatus(`${remoteGuests.length} tamu dimuat dari Spreadsheet.`);
  }));
  document.getElementById('sheets-backup').addEventListener('click', () => runOperation(async () => {
    downloadLocalBackup();
  }));
  document.getElementById('sheets-disconnect').addEventListener('click', () => {
    credentials = null;
    connected = false;
    remoteGuests = [];
    setStatus('Koneksi diputus. Mode lokal aktif; data Spreadsheet tidak dihapus.');
    try { renderTable(); } catch (error) { setStatus(error.message, true); }
    updateSyncControls();
  });

  /* ==========================================================================
     2. RANDOM CODE & TOKEN GENERATOR (URL-SAFE BASE64)
     ========================================================================== */
  function generateGuestCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function toBase64Url(str) {
    try {
      const utf8Bytes = new TextEncoder().encode(str);
      let binary = '';
      for (let i = 0; i < utf8Bytes.length; i++) {
        binary += String.fromCharCode(utf8Bytes[i]);
      }
      return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    } catch (e) {
      return encodeURIComponent(str);
    }
  }

  function encodeGuestToken(guest) {
    const code = guest.code || generateGuestCode();
    // Compact array payload: [randomCode, guestName, guestCategory]
    const payload = JSON.stringify([code, guest.name, guest.category || 'Umum']);
    return toBase64Url(payload);
  }

  function getUniqueLink(guest) {
    if (typeof guest.link === 'string' && /^https?:\/\/[^\s]+$/.test(guest.link)) return guest.link;
    const base = getBaseUrl();
    const token = encodeGuestToken(guest);
    if (window.location.protocol === 'file:') {
      return `${base}/index.html?u=${token}`;
    }
    const cleanBase = base ? base.replace(/\/+$/, '') : '.';
    return `${cleanBase}/?u=${token}`;
  }

  function sanitize(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML.replace(/"/g, '\x26quot;').replace(/'/g, '\x26#39;');
  }

  function formatInviteMessage(name, link) {
    return `Hii, ${name}! 👋🏻✨

A little invitation from me! ✨

Dengan penuh rasa syukur, aku ingin mengundang kamu untuk hadir dan berbagi momen spesial di hari wisudaku.

It would mean a lot to have you there! 💖

Details & invitation:
🔗 ${link}

See you! 🫶🏻🎓`;
  }

  /* ==========================================================================
     3. TOAST NOTIFICATION
     ========================================================================== */
  function showToast(message, type = 'success') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${type === 'success' ? '#10B981' : '#EF4444'}" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${sanitize(message)}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /* ==========================================================================
     4. RENDER TABLE & UPDATE STATS
     ========================================================================== */
  function renderTable(filterQuery = '') {
    const guests = getGuests();
    const query = filterQuery.toLowerCase().trim();

    const filtered = guests.filter(g => {
      return (g.name && g.name.toLowerCase().includes(query)) ||
        (g.category && g.category.toLowerCase().includes(query));
    });

    // Update Stats
    if (statTotal) statTotal.textContent = guests.length;
    if (statLinks) statLinks.textContent = guests.length;
    if (statVip) {
      const vipCount = guests.filter(g => /dosen|keluarga|vip|pembimbing/i.test(g.category || '')).length;
      statVip.textContent = vipCount;
    }
    if (statFriends) {
      const friendCount = guests.filter(g => /sahabat|teman|rekan|angkatan/i.test(g.category || '')).length;
      statFriends.textContent = friendCount;
    }

    if (!guestTableBody) return;

    if (filtered.length === 0) {
      guestTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 36px 20px; color: var(--text-dim);">
            ${query ? 'Tidak ada tamu yang cocok dengan kata kunci pencarian.' : 'Daftar tamu masih kosong. Silakan gunakan form di atas untuk menambahkan tamu undangan.'}
          </td>
        </tr>
      `;
      return;
    }

    guestTableBody.innerHTML = filtered.map((guest, index) => {
      const rawLink = getUniqueLink(guest);
      const link = sanitize(rawLink);
      const inviteMessage = formatInviteMessage(guest.name, rawLink);
      const guestCode = guest.code || 'DK-' + String(guest.id).slice(-4);

      return `
        <tr data-id="${sanitize(String(guest.id))}">
          <td style="color: var(--text-dim);">${index + 1}</td>
          <td>
            <span class="guest-code-badge">${sanitize(guestCode)}</span>
          </td>
          <td>
            <strong style="color: var(--burgundy-primary); font-weight: 600;">${sanitize(guest.name)}</strong>
          </td>
          <td>
            <span class="category-badge">${sanitize(guest.category || 'Umum')}</span>
          </td>
          <td>
            <div class="link-cell" title="${link}">
              ${link}
            </div>
          </td>
          <td>
            <div class="action-btn-group">
              <button type="button" class="btn-action btn-copy" data-message="${encodeURIComponent(inviteMessage)}" data-name="${sanitize(guest.name)}" title="Salin Pesan Undangan (Siap Kirim)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Salin Pesan</span>
              </button>

              <button type="button" class="btn-action btn-copy-link" data-link="${link}" data-name="${sanitize(guest.name)}" title="Salin Hanya Tautan">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                <span>Link</span>
              </button>

              <a href="${link}" target="_blank" rel="noopener noreferrer" class="btn-action btn-view" title="Pratinjau Undangan">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>Lihat</span>
              </a>

              <button type="button" class="btn-action btn-delete" data-code="${sanitize(String(guest.code))}" title="Hapus Tamu" aria-label="Hapus ${sanitize(guest.name)}" ${busy ? 'disabled' : ''}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    attachTableActions();
  }

  /* ==========================================================================
     5. TABLE ACTIONS (COPY MESSAGE, COPY LINK, DELETE)
     ========================================================================== */
  function attachTableActions() {
    // Copy invite message (ready-to-send template)
    document.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const message = decodeURIComponent(btn.getAttribute('data-message') || '');
        const name = btn.getAttribute('data-name');
        if (navigator.clipboard && message) {
          navigator.clipboard.writeText(message).then(() => {
            showToast(`Pesan undangan untuk ${name} berhasil disalin! Siap dikirim.`);
          }).catch(() => {
            fallbackCopy(message, `Pesan untuk ${name}`);
          });
        } else {
          fallbackCopy(message, `Pesan untuk ${name}`);
        }
      });
    });

    // Copy raw link
    document.querySelectorAll('.btn-copy-link').forEach(btn => {
      btn.addEventListener('click', () => {
        const link = btn.getAttribute('data-link');
        const name = btn.getAttribute('data-name');
        if (navigator.clipboard && link) {
          navigator.clipboard.writeText(link).then(() => {
            showToast(`Tautan untuk ${name} berhasil disalin!`);
          }).catch(() => {
            fallbackCopy(link, `Tautan untuk ${name}`);
          });
        } else {
          fallbackCopy(link, `Tautan untuk ${name}`);
        }
      });
    });

    guestTableBody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => runOperation(async () => {
        const code = btn.getAttribute('data-code');
        const guests = getGuests().filter(g => String(g.code) === code);
        if (confirm(`Hapus tamu ini dari ${connected ? 'Spreadsheet' : 'penyimpanan lokal'}?`)) {
          await deleteGuests(guests);
          showToast('Tamu berhasil dihapus.');
        }
      }));
    });
  }

  function fallbackCopy(text, label = 'Teks') {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast(`${label} berhasil disalin!`);
  }

  /* ==========================================================================
     6. QUICK ADD GUEST FORM
     ========================================================================== */
  if (quickAddForm) {
    quickAddForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('add-name');
      const catInput = document.getElementById('add-category');

      if (!nameInput || !nameInput.value.trim()) return;

      runOperation(async () => {
        const newGuest = {
          id: createGuestId(),
          code: generateGuestCode(12),
          name: nameInput.value.trim(),
          category: (catInput && catInput.value.trim()) || 'Umum'
        };
        if (newGuest.name.length > 300 || newGuest.category.length > 150) {
          throw new Error('Nama maksimal 300 karakter; kategori maksimal 150 karakter.');
        }
        await addGuests([newGuest], () => {
          nameInput.value = '';
          if (catInput) catInput.value = '';
        });
        showToast(connected ? 'Tamu tersimpan di Spreadsheet.' : 'Tamu tersimpan lokal, belum di Spreadsheet.');
      });
    });
  }

  /* ==========================================================================
     7. SEARCH & RESET (KOSONGKAN DATA)
     ========================================================================== */
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      try { renderTable(e.target.value); } catch (error) { setStatus(error.message, true); }
    });
  }

  if (btnResetData) {
    btnResetData.addEventListener('click', () => runOperation(async () => {
      const guests = getGuests();
      if (guests.length === 0) {
        showToast('Daftar tamu sudah kosong.');
        return;
      }
      if (confirm(`Hapus ${guests.length} tamu yang dimuat dari ${connected ? 'Spreadsheet' : 'penyimpanan lokal'}? Tindakan ini tidak dapat dibatalkan dari laman admin.`)) {
        await deleteGuests(guests);
        showToast('Data tamu yang dipilih berhasil dihapus.');
      }
    }));
  }

  /* ==========================================================================
     8. EXCEL TEMPLATE DOWNLOAD & BULK IMPORT
     ========================================================================== */
  if (btnDownloadTemplate) {
    btnDownloadTemplate.addEventListener('click', () => {
      const templateData = [
        { "Nama Tamu": "Prof. Dr. Ir. Ahmad Sudarmono, M.Sc.", "Kategori": "Dosen Pembimbing" },
        { "Nama Tamu": "Siti Rahmawati, S.P.", "Kategori": "Sahabat Kampus" },
        { "Nama Tamu": "Bapak Hendra & Ibu", "Kategori": "Keluarga" },
        { "Nama Tamu": "Rizky Pratama, S.P.", "Kategori": "Sahabat Angkatan" }
      ];

      if (typeof XLSX !== 'undefined') {
        const ws = XLSX.utils.json_to_sheet(templateData);
        ws['!cols'] = [{ wch: 38 }, { wch: 24 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Daftar Tamu");
        XLSX.writeFile(wb, "template_daftar_tamu_wisuda.xlsx");
        showToast("Template Excel berhasil diunduh!");
      } else {
        const csvContent = "Nama Tamu,Kategori\n\"Prof. Dr. Ir. Ahmad Sudarmono, M.Sc.\",\"Dosen Pembimbing\"\n\"Siti Rahmawati, S.P.\",\"Sahabat Kampus\"\n\"Bapak Hendra & Ibu\",\"Keluarga\"\n\"Rizky Pratama, S.P.\",\"Sahabat Angkatan\"";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "template_daftar_tamu_wisuda.csv";
        a.click();
        URL.revokeObjectURL(url);
        showToast("Template CSV berhasil diunduh!");
      }
    });
  }

  function processExcelFile(file) {
    if (!file || busy) return;
    return runOperation(async () => {
      if (!/\.(xlsx|xls|csv)$/i.test(file.name) || file.size > 5 * 1024 * 1024) {
        throw new Error('Gunakan file .xlsx, .xls, atau .csv maksimal 5 MB.');
      }
      if (typeof XLSX === 'undefined') throw new Error('Pembaca Excel belum dimuat. Muat ulang halaman sebelum mengimpor.');
      const data = new Uint8Array(await file.arrayBuffer());
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!worksheet) throw new Error('File tidak memiliki worksheet.');
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
      const importedGuests = rows.map(row => {
        const name = row['Nama Tamu'] || row['Nama'] || row['nama'] || row['Name'] || row['name'] || '';
        const category = row['Kategori'] || row['kategori'] || row['Category'] || row['category'] || row['Hubungan'] || 'Umum';
        return {
          id: createGuestId(),
          code: generateGuestCode(12),
          name: String(name).trim(),
          category: String(category).trim() || 'Umum',
          phone: String(row['No_WhatsApp'] || row['phone'] || '').trim()
        };
      }).filter(g => g.name.length > 0);
      if (!importedGuests.length) throw new Error('Tidak ada nama tamu valid. Gunakan kolom Nama Tamu dan Kategori sesuai template.');
      if (importedGuests.some(g => g.name.length > 300 || g.category.length > 150 || g.phone.length > 80)) {
        throw new Error('Nama maksimal 300 karakter, kategori 150, dan nomor telepon 80.');
      }
      await addGuests(importedGuests);
      showToast(connected ? `${importedGuests.length} tamu tersimpan di Spreadsheet.` :
        `${importedGuests.length} tamu tersimpan lokal, belum di Spreadsheet.`);
    });
  }

  if (excelDropzone && excelFileInput) {
    excelDropzone.addEventListener('click', (event) => {
      if (busy || event.target === excelFileInput) return;
      excelFileInput.click();
    });

    excelDropzone.addEventListener('keydown', (e) => {
      if (!busy && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        excelFileInput.click();
      }
    });

    excelFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        processExcelFile(file);
        excelFileInput.value = '';
      }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      excelDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        excelDropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      excelDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        excelDropzone.classList.remove('dragover');
      });
    });

    excelDropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt && dt.files && dt.files[0];
      if (file) {
        processExcelFile(file);
      }
    });
  }

  try { renderTable(); } catch (error) { setStatus(error.message, true); }
  updateSyncControls();
});

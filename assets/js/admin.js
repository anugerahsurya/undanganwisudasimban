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
    return window.location.href.split('?')[0].replace(/admin\.html\/?$/, '').replace(/index\.html\/?$/, '').replace(/\/+$/, '');
  }

  // Clear previous dummy/demo data if present so admin starts completely empty
  try {
    const rawStored = localStorage.getItem(STORAGE_KEY);
    if (rawStored) {
      const parsed = JSON.parse(rawStored);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.some(g => g.name === 'Budi Santoso' && (!g.id || g.phone === '6281234567890'))) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      }
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }
  } catch (e) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  }

  function getGuests() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const guests = JSON.parse(stored);
      let changed = false;
      guests.forEach(g => {
        if (!g.code) {
          g.code = generateGuestCode();
          changed = true;
        }
      });
      if (changed) {
        saveGuests(guests);
      }
      return guests;
    } catch (e) {
      return [];
    }
  }

  function saveGuests(guests) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(guests));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

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
    return temp.innerHTML;
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
      const link = getUniqueLink(guest);
      const inviteMessage = formatInviteMessage(guest.name, link);
      const guestCode = guest.code || 'DK-' + String(guest.id).slice(-4);

      return `
        <tr data-id="${guest.id}">
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

              <a href="${link}" target="_blank" class="btn-action btn-view" title="Pratinjau Undangan">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>Lihat</span>
              </a>

              <button type="button" class="btn-action btn-delete" data-id="${guest.id}" title="Hapus Tamu">
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

    // Delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'));
        if (confirm('Apakah Anda yakin ingin menghapus tamu ini dari daftar?')) {
          let guests = getGuests();
          guests = guests.filter(g => g.id !== id);
          saveGuests(guests);
          renderTable(searchInput ? searchInput.value : '');
          showToast('Tamu berhasil dihapus dari daftar.');
        }
      });
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

      const guests = getGuests();
      const newGuest = {
        id: Date.now(),
        code: generateGuestCode(),
        name: nameInput.value.trim(),
        category: (catInput && catInput.value.trim()) || 'Umum'
      };

      guests.unshift(newGuest);
      saveGuests(guests);
      renderTable(searchInput ? searchInput.value : '');

      nameInput.value = '';
      if (catInput) catInput.value = '';
      showToast(`Tamu "${newGuest.name}" berhasil ditambahkan!`);
    });
  }

  /* ==========================================================================
     7. SEARCH & RESET (KOSONGKAN DATA)
     ========================================================================== */
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderTable(e.target.value);
    });
  }

  if (btnResetData) {
    btnResetData.addEventListener('click', () => {
      const guests = getGuests();
      if (guests.length === 0) {
        showToast('Daftar tamu sudah kosong.');
        return;
      }
      if (confirm('Apakah Anda yakin ingin mengosongkan seluruh daftar tamu undangan?')) {
        saveGuests([]);
        renderTable();
        showToast('Seluruh data tamu berhasil dikosongkan.');
      }
    });
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
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        let importedGuests = [];
        if (typeof XLSX !== 'undefined') {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          importedGuests = json.map((row, idx) => {
            const name = row['Nama Tamu'] || row['Nama'] || row['nama'] || row['Name'] || row['name'] || Object.values(row)[0] || '';
            const category = row['Kategori'] || row['kategori'] || row['Category'] || row['category'] || row['Hubungan'] || Object.values(row)[1] || 'Umum';
            return {
              id: Date.now() + idx,
              code: generateGuestCode(),
              name: String(name).trim(),
              category: String(category).trim() || 'Umum'
            };
          }).filter(g => g.name.length > 0);
        } else {
          const text = new TextDecoder().decode(e.target.result);
          const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
          const startIdx = lines[0].toLowerCase().includes('nama') ? 1 : 0;
          for (let i = startIdx; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
            if (cols[0]) {
              importedGuests.push({
                id: Date.now() + i,
                code: generateGuestCode(),
                name: cols[0],
                category: cols[1] || 'Umum'
              });
            }
          }
        }

        if (importedGuests.length === 0) {
          showToast('Tidak ada data nama tamu valid yang ditemukan dalam file.', 'error');
          return;
        }

        const currentGuests = getGuests();
        const updated = [...importedGuests, ...currentGuests];
        saveGuests(updated);
        renderTable(searchInput ? searchInput.value : '');
        showToast(`Berhasil mengimpor ${importedGuests.length} tamu dari file Excel!`);
      } catch (err) {
        console.error('Gagal membaca file Excel:', err);
        showToast('Gagal memproses file. Pastikan format kolom sesuai template.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  if (excelDropzone && excelFileInput) {
    excelDropzone.addEventListener('click', () => {
      excelFileInput.click();
    });

    excelDropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
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

  // Initial Render
  renderTable();
});

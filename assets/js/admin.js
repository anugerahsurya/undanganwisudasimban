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
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.some(g => g.name === 'Budi Santoso' && g.phone === '6281234567890')) {
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
      return stored ? JSON.parse(stored) : [];
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
     2. LINK GENERATOR HELPER
     ========================================================================== */
  function getUniqueLink(guest) {
    const base = getBaseUrl();
    const params = new URLSearchParams();
    params.set('to', guest.name);
    if (guest.category) params.set('cat', guest.category);
    return `${base}?${params.toString()}`;
  }

  function sanitize(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  }

  function formatPhone(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }
    return cleaned;
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
             (g.category && g.category.toLowerCase().includes(query)) ||
             (g.phone && g.phone.includes(query));
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
      const cleanPhone = formatPhone(guest.phone);

      return `
        <tr data-id="${guest.id}">
          <td style="color: var(--text-dim);">${index + 1}</td>
          <td>
            <strong style="color: #ffffff;">${sanitize(guest.name)}</strong>
          </td>
          <td>
            <span class="category-badge">${sanitize(guest.category || 'Umum')}</span>
          </td>
          <td style="color: var(--text-muted); font-family: monospace;">
            ${cleanPhone || '<span style="color: var(--text-dim);">-</span>'}
          </td>
          <td>
            <div class="link-cell" title="${link}">
              ${link}
            </div>
          </td>
          <td>
            <div class="action-btn-group">
              <button type="button" class="btn-action btn-copy" data-link="${link}" data-name="${sanitize(guest.name)}" title="Salin Link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Salin</span>
              </button>

              ${cleanPhone ? `
                <button type="button" class="btn-action btn-whatsapp" data-phone="${cleanPhone}" data-name="${sanitize(guest.name)}" data-link="${link}" title="Kirim via WhatsApp">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08s.89 2.41 1.01 2.58c.13.17 1.75 2.67 4.24 3.75.59.26 1.05.41 1.41.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.07-.1-.23-.17-.48-.29z"/>
                  </svg>
                  <span>WA</span>
                </button>
              ` : ''}

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
     5. TABLE ACTIONS (COPY LINK, WHATSAPP, DELETE)
     ========================================================================== */
  function attachTableActions() {
    // Copy link buttons
    document.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const link = btn.getAttribute('data-link');
        const name = btn.getAttribute('data-name');
        if (navigator.clipboard && link) {
          navigator.clipboard.writeText(link).then(() => {
            showToast(`Tautan untuk ${name} berhasil disalin!`);
          }).catch(() => {
            fallbackCopy(link, name);
          });
        } else {
          fallbackCopy(link, name);
        }
      });
    });

    // WhatsApp buttons
    document.querySelectorAll('.btn-whatsapp').forEach(btn => {
      btn.addEventListener('click', () => {
        const phone = btn.getAttribute('data-phone');
        const name = btn.getAttribute('data-name');
        const link = btn.getAttribute('data-link');

        const message = 
`Kepada Yth. Bapak/Ibu/Saudara/i *${name}*,

Dengan penuh rasa syukur dan sukacita, perkenankan kami mengundang Anda untuk menghadiri perayaan Wisuda Sarjana *Dyah Kusumaningrum, S.P.* yang akan diselenggarakan pada:

📅 *Hari/Tanggal:* Sabtu, 19 September 2026
⏰ *Waktu:* Pukul 08.00 WIB s/d Selesai
📍 *Tempat:* Gedung Auditorium Universitas Andalas, Padang

Untuk informasi jadwal lengkap dan petunjuk denah lokasi acara, silakan kunjungi tautan undangan resmi Anda berikut ini:
${link}

Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Anda berkenan hadir dan memberikan doa restu. Terima kasih.`;

        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
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

  function fallbackCopy(text, name) {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast(`Tautan untuk ${name} berhasil disalin!`);
  }

  /* ==========================================================================
     6. QUICK ADD GUEST FORM
     ========================================================================== */
  if (quickAddForm) {
    quickAddForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('add-name');
      const catInput = document.getElementById('add-category');
      const phoneInput = document.getElementById('add-phone');

      if (!nameInput || !nameInput.value.trim()) return;

      const guests = getGuests();
      const newGuest = {
        id: Date.now(),
        name: nameInput.value.trim(),
        category: (catInput && catInput.value.trim()) || 'Umum',
        phone: (phoneInput && phoneInput.value.trim()) || ''
      };

      guests.unshift(newGuest);
      saveGuests(guests);
      renderTable(searchInput ? searchInput.value : '');

      nameInput.value = '';
      if (catInput) catInput.value = '';
      if (phoneInput) phoneInput.value = '';
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

  // Initial Render
  renderTable();
});

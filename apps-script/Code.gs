const GUEST_HEADERS = ['id', 'code', 'name', 'category', 'phone', 'link', 'createdAt', 'updatedAt'];
const MAX_BATCH = 500;

function doGet() {
  return jsonResponse_({ ok: true, service: 'wisuda-admin', version: 1 });
}

function doPost(e) {
  let lock;
  try {
    const properties = PropertiesService.getScriptProperties();
    const secret = properties.getProperty('ADMIN_TOKEN');
    if (!secret || secret.length < 32) throw new Error('Konfigurasi ADMIN_TOKEN minimal 32 karakter belum tersedia.');
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 1500000) throw new Error('Ukuran permintaan tidak valid.');
    const request = JSON.parse(raw);
    if (typeof request.token !== 'string' || request.token !== secret) {
      return jsonResponse_({ ok: false, error: 'Token admin tidak valid.' });
    }
    if (!['list', 'import', 'delete'].includes(request.action)) throw new Error('Aksi tidak dikenal.');

    // Serialize read-modify-write operations from different admin tabs.
    lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) throw new Error('Spreadsheet sedang digunakan. Coba lagi.');
    const sheet = getGuestSheet_(properties);
    const guests = readGuests_(sheet);

    if (request.action === 'list') return jsonResponse_({ ok: true, guests });

    if (request.action === 'import') {
      if (!Array.isArray(request.guests) || !request.guests.length || request.guests.length > MAX_BATCH) {
        throw new Error('Impor harus berisi 1–500 tamu per permintaan.');
      }
      const incoming = request.guests.map(normalizeGuest_);
      const byCode = new Map(guests.map(guest => [guest.code, guest]));
      const additions = [];
      let skipped = 0;
      incoming.forEach(guest => {
        const existing = byCode.get(guest.code);
        if (existing) {
          // Never silently rename an invitation whose link has already been shared.
          if (existing.name !== guest.name || existing.category !== guest.category ||
              existing.phone !== guest.phone) {
            throw new Error('Kode ' + guest.code + ' sudah digunakan oleh data berbeda. Tidak ada data dalam batch ini yang diubah.');
          }
          skipped++;
          return;
        }
        byCode.set(guest.code, guest);
        additions.push(guest);
      });
      if (additions.length) {
        const startRow = sheet.getLastRow() + 1;
        ensureRows_(sheet, startRow + additions.length - 1);
        const range = sheet.getRange(startRow, 1, additions.length, GUEST_HEADERS.length);
        range.setNumberFormat('@');
        range.setValues(additions.map(guest => GUEST_HEADERS.map(key => sheetText_(guest[key]))));
        SpreadsheetApp.flush();
      }
      return jsonResponse_({ ok: true, added: additions.length, skipped });
    }

    if (!Array.isArray(request.codes) || !request.codes.length || request.codes.length > MAX_BATCH ||
        request.codes.some(code => typeof code !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(code))) {
      throw new Error('Daftar kode untuk penghapusan tidak valid (maksimal 500).');
    }
    const codes = new Set(request.codes);
    let deleted = 0;
    // Delete only the requested records, not guests added concurrently by another admin.
    for (let index = guests.length - 1; index >= 0; index--) {
      if (codes.has(guests[index].code)) {
        sheet.deleteRow(index + 2);
        deleted++;
      }
    }
    SpreadsheetApp.flush();
    return jsonResponse_({ ok: true, deleted });
  } catch (error) {
    return jsonResponse_({ ok: false, error: error.message || 'Permintaan gagal diproses.' });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function getGuestSheet_(properties) {
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID belum diatur.');
  const name = properties.getProperty('SHEET_NAME') || 'Tamu';
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, GUEST_HEADERS.length).setValues([GUEST_HEADERS]);
    sheet.setFrozenRows(1);
  }
  const headers = sheet.getRange(1, 1, 1, GUEST_HEADERS.length).getValues()[0];
  if (headers.join('|') !== GUEST_HEADERS.join('|')) {
    throw new Error('Header sheet tidak sesuai. Gunakan sheet kosong khusus untuk aplikasi.');
  }
  return sheet;
}

function readGuests_(sheet) {
  if (sheet.getLastRow() < 2) return [];
  const codes = new Set();
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, GUEST_HEADERS.length).getDisplayValues().map(row => {
    const guest = {};
    GUEST_HEADERS.forEach((key, index) => { guest[key] = row[index]; });
    if (!guest.code || codes.has(guest.code)) {
      throw new Error('Ada baris kosong atau kode ganda di Spreadsheet. Perbaiki sebelum melanjutkan.');
    }
    codes.add(guest.code);
    return guest;
  });
}

function normalizeGuest_(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Data tamu tidak valid.');
  const text = (key, max, fallback) => {
    const result = value[key] == null ? (fallback || '') : String(value[key]);
    if (result.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result)) {
      throw new Error('Kolom ' + key + ' terlalu panjang atau berisi karakter tidak valid.');
    }
    return result;
  };
  const guest = {
    id: text('id', 100),
    code: text('code', 80),
    name: text('name', 300),
    category: text('category', 150, 'Umum') || 'Umum',
    phone: text('phone', 80),
    link: text('link', 4000)
  };
  if (!guest.id || !/^[A-Za-z0-9_-]{1,80}$/.test(guest.code) || !guest.name.trim()) {
    throw new Error('ID, kode, dan nama tamu wajib diisi.');
  }
  if (guest.link && !/^https?:\/\/[^\s]+$/.test(guest.link)) throw new Error('Tautan harus berupa URL HTTP/HTTPS.');
  guest.createdAt = new Date().toISOString();
  guest.updatedAt = guest.createdAt;
  return guest;
}

function sheetText_(value) {
  const text = String(value == null ? '' : value);
  // Google Sheets must store imported input as text, never execute it as a formula.
  return /^[\s]*[=+\-@']/.test(text) ? "'" + text : text;
}

function ensureRows_(sheet, required) {
  if (sheet.getMaxRows() < required) {
    sheet.insertRowsAfter(sheet.getMaxRows(), required - sheet.getMaxRows());
  }
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
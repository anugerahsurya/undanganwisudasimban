const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const ENDPOINT = 'https://script.google.com/macros/s/AKfycbxfns7cgoNA83oYB4Ob-tQJrkjKqSwFJk6VUW1CoqNJ508zdgnFL2nC-tEe8-D0WA1k/exec';
const KEY = 'wisuda_guest_list_db';
const TOKEN = 'local-test-only-'.repeat(4);
const makeGuest = (code = 'ABC123', name = 'Budi Santoso') =>
    ({ id: 123, code, name, category: 'Keluarga', phone: '6281234567890' });

function backend() {
    const rows = [];
    let locked = false;
    const sheet = {
        getLastRow: () => rows.length,
        getMaxRows: () => 10000,
        setFrozenRows() { },
        deleteRow: row => rows.splice(row - 1, 1),
        getRange(row, col, height, width) {
            return {
                setNumberFormat() { },
                setValues(values) {
                    values.forEach((value, i) => {
                        rows[row - 1 + i] ||= [];
                        value.forEach((cell, j) => {
                            // Model Sheets' apostrophe text escape; this does not execute formulas.
                            rows[row - 1 + i][col - 1 + j] = String(cell).replace(/^'/, '');
                        });
                    });
                },
                getValues: () => Array.from({ length: height }, (_, i) =>
                    Array.from({ length: width }, (_, j) => rows[row - 1 + i]?.[col - 1 + j] || '')),
                getDisplayValues() { return this.getValues(); }
            };
        }
    };
    const context = vm.createContext({
        PropertiesService: {
            getScriptProperties: () => ({
                getProperty: key => ({ ADMIN_TOKEN: TOKEN, SPREADSHEET_ID: 'test-sheet' })[key]
            })
        },
        LockService: {
            getScriptLock: () => ({
                tryLock: () => { locked = true; return true; },
                hasLock: () => locked,
                releaseLock: () => { locked = false; }
            })
        },
        SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush() { } },
        ContentService: {
            MimeType: { JSON: 'json' },
            createTextOutput: text => ({ setMimeType: () => text })
        }
    });
    vm.runInContext(fs.readFileSync('apps-script/Code.gs', 'utf8'), context);
    return {
        rows,
        call(request) {
            const result = JSON.parse(context.doPost({
                postData: {
                    contents: JSON.stringify({ token: TOKEN, ...request })
                }
            }));
            assert.equal(locked, false);
            return result;
        }
    };
}

function admin(initial = [], server = backend()) {
    const elements = new Map();
    const storage = new Map([[KEY, typeof initial === 'string' ? initial : JSON.stringify(initial)]]);
    const calls = [];
    const node = () => ({
        value: '', innerHTML: '', textContent: '', dataset: {}, style: {}, disabled: false,
        listeners: {},
        setAttribute() { }, prepend() { }, appendChild() { }, click() { }, remove() { },
        addEventListener(type, fn) { this.listeners[type] = fn; },
        querySelector: () => node(), querySelectorAll: () => [],
        classList: { add() { }, remove() { } }
    });
    const get = id => {
        if (!elements.has(id)) elements.set(id, node());
        return elements.get(id);
    };
    let ready;
    const context = vm.createContext({
        document: {
            addEventListener: (_, fn) => { ready = fn; },
            createElement: node, getElementById: get,
            querySelector: () => get('main'), querySelectorAll: () => []
        },
        console, TextEncoder, TextDecoder, Uint8Array, crypto: webcrypto,
        URL, Blob, AbortController, TypeError,
        btoa: text => Buffer.from(text, 'binary').toString('base64'),
        window: { location: { hostname: 'wisudadyah.vercel.app', href: 'https://wisudadyah.vercel.app/admin', protocol: 'https:' } },
        navigator: {}, confirm: () => true, setTimeout: () => 1, clearTimeout() { },
        localStorage: {
            getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value)
        },
        fetch: async (url, options) => {
            const request = JSON.parse(options.body);
            calls.push(request);
            assert.equal(options.headers['Content-Type'], 'text/plain;charset=utf-8');
            assert.equal(options.credentials, 'omit');
            const result = server.call(request);
            return { ok: true, json: async () => result };
        }
    });
    // Expose closure functions only in the in-memory test copy, not the source file.
    const source = fs.readFileSync('assets/js/admin.js', 'utf8');
    const end = source.lastIndexOf('});');
    vm.runInContext(source.slice(0, end) +
        '\nglobalThis.api = { importToSheets, addGuests, deleteGuests, refreshSheets, getUniqueLink };\n' +
        source.slice(end), context);
    ready();
    return {
        get, context, server, storage, calls, api: context.api,
        local: () => JSON.parse(storage.get(KEY)),
        async connect() {
            get('sheets-token').value = TOKEN;
            get('sheets-connect-form').listeners.submit({ preventDefault() { } });
            await new Promise(resolve => setImmediate(resolve));
            assert.match(get('sheets-status').textContent, /Terhubung/);
        }
    };
}

test('existing data and malformed JSON are never reset at startup', () => {
    const a = admin([makeGuest()]);
    assert.equal(a.local().length, 1);
    assert.equal(a.calls.length, 0);
    const b = admin('{broken');
    assert.equal(b.storage.get(KEY), '{broken');
    assert.match(b.get('sheets-status').textContent, /tidak dapat dibaca/);
});

test('connect then click import: deduplication, stable link, backup, status', async () => {
    const server = backend();
    server.call({ action: 'import', guests: [makeGuest()] });
    const initial = [makeGuest(), makeGuest('NEW123', 'Siti Ayu')];
    const a = admin(initial, server);
    const before = a.api.getUniqueLink(initial[1]);
    await a.connect();
    assert.equal(a.local().length, 2);
    await a.get('sheets-import').listeners.click();
    assert.equal(server.rows.length, 3);
    assert.equal(a.local().length, 0);
    assert.deepEqual(JSON.parse(a.storage.get(KEY + '_before_sheets')), initial);
    assert.match(a.get('sheets-status').textContent, /1 tamu baru; 1 data identik dilewati/);
    assert.equal(a.get('stat-total').textContent, 2);
    const saved = server.call({ action: 'list' }).guests[1];
    assert.equal(a.api.getUniqueLink(saved), before);
    assert.equal([...a.storage.values()].some(value => value.includes(TOKEN)), false);
});

test('no saved status until server acknowledges; controls disabled while waiting', async () => {
    const a = admin([makeGuest()]);
    await a.connect();
    const normal = a.context.fetch;
    let release;
    a.context.fetch = (url, options) => JSON.parse(options.body).action === 'import' ?
        new Promise(resolve => { release = () => normal(url, options).then(resolve); }) : normal(url, options);
    const pending = a.get('sheets-import').listeners.click();
    assert.match(a.get('sheets-status').textContent, /Mengirim/);
    assert.equal(a.get('sheets-import').disabled, true);
    assert.equal(a.local().length, 1);
    release();
    await pending;
    assert.match(a.get('sheets-status').textContent, /Tersimpan di Spreadsheet/);
});

test('lost response retains pending records and retry does not duplicate', async () => {
    const a = admin([makeGuest()]);
    await a.connect();
    const normal = a.context.fetch;
    a.context.fetch = async (url, options) => {
        const response = await normal(url, options);
        if (JSON.parse(options.body).action === 'import') throw new TypeError('offline');
        return response;
    };
    await a.get('sheets-import').listeners.click();
    assert.equal(a.local().length, 1);
    assert.match(a.get('sheets-status').textContent, /belum dapat dipastikan/);
    a.context.fetch = normal;
    await a.get('sheets-import').listeners.click();
    assert.equal(a.server.rows.length, 2);
    assert.match(a.get('sheets-status').textContent, /0 tamu baru; 1 data identik dilewati/);
});

test('partial batch failure leaves unsent data intact', async () => {
    const a = admin(Array.from({ length: 501 }, (_, i) => makeGuest('G' + i, 'Guest ' + i)));
    await a.connect();
    const normal = a.context.fetch;
    let batches = 0;
    a.context.fetch = (url, options) => {
        if (JSON.parse(options.body).action === 'import' && ++batches === 2) throw new TypeError('offline');
        return normal(url, options);
    };
    await a.get('sheets-import').listeners.click();
    assert.equal(a.server.rows.length, 501);
    assert.equal(a.local().length, 1);
    assert.equal(a.local()[0].code, 'G500');
});

test('manual add saves remotely; delete does not erase concurrently added guest', async () => {
    const a = admin();
    await a.connect();
    a.get('add-name').value = 'New Guest';
    a.get('quick-add-form').listeners.submit({ preventDefault() { } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(a.server.rows.length, 2);
    assert.equal(a.get('add-name').value, '');
    a.server.call({ action: 'import', guests: [makeGuest('OTHER')] });
    await a.get('btn-reset-data').listeners.click();
    assert.equal(a.server.rows.length, 2);
    assert.equal(a.server.rows[1][1], 'OTHER');
});

test('backend rejects bad token, conflicting codes and oversized batch', () => {
    const b = backend();
    assert.equal(b.call({ action: 'list', token: 'wrong' }).ok, false);
    assert.equal(b.rows.length, 0);
    b.call({ action: 'import', guests: [makeGuest()] });
    assert.equal(b.call({
        action: 'import', guests: [
            makeGuest('NEW123'), makeGuest('ABC123', 'Changed name')
        ]
    }).ok, false);
    assert.equal(b.rows.length, 2);
    assert.equal(b.call({ action: 'import', guests: Array(501).fill(makeGuest()) }).ok, false);
});

test('storage quota errors keep manual input available', async () => {
    const a = admin();
    a.context.localStorage.setItem = () => { throw new Error('Quota exceeded'); };
    a.get('add-name').value = 'Keep this name';
    a.get('quick-add-form').listeners.submit({ preventDefault() { } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(a.get('add-name').value, 'Keep this name');
    assert.match(a.get('sheets-status').textContent, /Quota exceeded/);
});

test('live deployment status (opt-in, no guest data)', {
    skip: process.env.WISUDA_LIVE_TEST !== '1'
}, async () => {
    const response = await fetch(ENDPOINT, { signal: AbortSignal.timeout(30000) });
    assert.equal(response.ok, true);
    assert.deepEqual(await response.json(), { ok: true, service: 'wisuda-admin', version: 1 });
});

test('live authenticated list (opt-in, no guest data printed or written)', {
    skip: process.env.WISUDA_LIVE_TEST !== '1' || !process.env.WISUDA_ADMIN_TOKEN
}, async () => {
    const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'list', token: process.env.WISUDA_ADMIN_TOKEN }),
        signal: AbortSignal.timeout(60000)
    });
    assert.equal(response.ok, true);
    const result = await response.json();
    assert.equal(result.ok, true, 'Deployment must accept the configured admin token');
    assert.equal(Array.isArray(result.guests), true);
});
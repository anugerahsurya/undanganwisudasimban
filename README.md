# Panduan Penggunaan Website Undangan Wisuda Digital

Website undangan wisuda ini dirancang dengan gaya **Navy, Gold, dan White** yang elegan, mewah, dan responsif, dilengkapi animasi interaktif, pemutar musik otomatis, timeline perjalanan kuliah, serta portal admin untuk mengelola tamu menggunakan database Excel.

---

## 🚀 Cara Menjalankan Website

Website ini dibuat menggunakan HTML, CSS murni, dan Vanilla JavaScript tanpa ketergantungan rumit:

1. **Jalankan Secara Langsung:**
   - Cukup klik dua kali file `index.html` untuk membuka website undangan di browser pilihan Anda (Google Chrome, Edge, Safari, Firefox).
   - Buka `admin.html` untuk mengelola daftar tamu undangan dan Excel.

2. **Atau Menggunakan Local Server (Opsional):**
   Jika ingin menggunakan local server, Anda dapat menjalankan perintah berikut di terminal:
   ```bash
   python -m http.server 8000
   ```
   Lalu buka peramban di `http://localhost:8000`.

---

## 🎵 Pemutar Musik & Lagu Wisuda

- Lagu yang digunakan saat ini adalah lagu yang terdapat di dalam folder: `Yura Yunita - Bandung Official Lyric Video.mp3` (telah disiapkan di `assets/audio/song.mp3`).
- **Autoplay Behavior:** Sesuai dengan kebijakan browser modern, musik akan mulai berputar secara otomatis saat penerima undangan menekan tombol **"Buka Undangan"**.
- Terdapat widget pemutar musik mengambang (floating music controller) di pojok kanan bawah dengan piringan vinyl berputar untuk memutar atau menjeda musik kapan saja.

---

## 📷 Cara Mengganti Foto Dummy

Semua foto disimpan rapi di dalam folder `assets/images/`. Anda cukup menimpa (replace) file gambar tersebut dengan foto asli Anda menggunakan nama file yang sama:

| Nama File | Keterangan Momen | Rekomendasi Rasio |
|---|---|---|
| `profile.jpg` | Foto resmi wisudawan bertoga (tampil di sampul dan kartu utama) | 1:1 (Kotak) |
| `sempro.jpg` | Foto saat Seminar Proposal penelitian | 4:3 atau 16:9 |
| `semhas.jpg` | Foto saat Seminar Hasil penelitian | 4:3 atau 16:9 |
| `wisuda.jpg` | Foto perayaan hari wisuda / lempar toga bersama teman | 4:3 atau 16:9 |
| `gallery-1.jpg` s/d `gallery-4.jpg` | Foto-foto kenangan di seksi Galeri Foto | Bebas (Landscape/Portrait) |

---

## 👥 Penggunaan Laman Admin (`admin.html`) & Database Excel

Laman admin dapat diakses melalui `admin.html` atau tombol **"Laman Admin"** di bagian atas website:

1. **Format Excel (.xlsx / .csv):**
   - Buat file Excel dengan 3 kolom utama:
     - `Nama` (Nama lengkap tamu yang diundang, contoh: `Budi Santoso, S.Kom.`)
     - `Kategori` (Hubungan tamu, contoh: `Sahabat Kampus`, `Dosen`, `Keluarga`)
     - `No_WhatsApp` (Nomor telepon WA aktif, contoh: `081234567890`)
   - Anda juga dapat langsung menekan tombol **"Unduh Template Excel"** di laman admin untuk mendapatkan contoh file Excel yang sudah siap isi.

2. **Generate Link Unik Otomatis:**
   - Tarik dan lepas (drag-and-drop) file Excel ke area dropzone di admin.
   - Sistem secara instan membuatkan tautan unik dengan random string token untuk setiap tamu, contoh:
     `index.html?u=WyJESy04WDlNIiwiQnVkaSBTYW50b3NvLCBTLktvbS4iLCJTYWhhYmF0IEthbXB1cyJd`
     (Nama tamu terenkode rapi dalam random string yang aman dan privasi terjaga).

3. **Kirim Undangan Sekali Klik:**
   - **Tombol Salin Link:** Menyalin link unik tamu ke clipboard.
   - **Tombol WA (WhatsApp):** Membuka aplikasi WhatsApp dengan pesan undangan formal yang sopan dan sudah terisi nama tamu beserta tautan personal mereka.

---

## 🎨 Detail Desain & Tipografi

- **Palet Warna:** Deep Royal Navy (`#060D17`, `#0A192F`), Radiant Gold (`#D4AF37`, `#F5E0A0`), dan Crisp White (`#FFFFFF`).
- **Tipografi:** Google Fonts `Cormorant Garamond` (Gelar, judul, display klasik) dan `Plus Jakarta Sans` (keterbacaan teks yang bersih dan elegan).
- **Aksentuasi:** Partikel debu emas bergerak (canvas particle), efek scroll reveal, dan countdown live menuju hari H wisuda.

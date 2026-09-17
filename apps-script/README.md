# Google Sheets untuk admin undangan

Backend: `apps-script/Code.gs`. Panel koneksi ditambahkan oleh `assets/js/admin.js` di halaman admin yang sudah ada. Tidak perlu paket npm atau perubahan pada halaman undangan publik.

## 1. Siapkan Spreadsheet dan Apps Script

1. Buat Google Spreadsheet khusus daftar tamu. Biarkan akses Spreadsheet **Restricted/Terbatas**.
2. Salin ID dari URL `https://docs.google.com/spreadsheets/d/ID_SPREADSHEET/edit`.
3. Buka **Extensions / Ekstensi → Apps Script**.
4. Ganti isi `Code.gs` di editor Google dengan seluruh isi file `apps-script/Code.gs` dari proyek ini, lalu simpan.
5. Buka **Project Settings / Setelan proyek → Script Properties / Properti skrip**. Tambahkan:

   | Properti | Isi |
   | --- | --- |
   | `SPREADSHEET_ID` | ID Spreadsheet pada langkah 2 |
   | `ADMIN_TOKEN` | Rahasia acak minimal 32 karakter, simpan di password manager |
   | `SHEET_NAME` | `Tamu` (opsional; default `Tamu`) |

   Token dapat dibuat dengan password generator atau perintah lokal:
   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```
   Jangan menyalin token ke kode JavaScript, Git, URL, atau pesan undangan.

6. Pilih **Deploy → New deployment → Web app**:
   - **Execute as:** Me / Saya.
   - **Who has access:** Anyone / Siapa saja.
   - Otorisasi akses Spreadsheet menggunakan akun pemilik.
7. Salin **Web app URL** yang berakhir `/exec`, bukan `/dev`.

Pengaturan “Anyone” diperlukan agar halaman statis dapat mengirim permintaan tanpa layar login Google. Semua operasi membaca dan menulis daftar tamu tetap memerlukan token admin. Membuka URL `/exec` langsung hanya menampilkan status layanan, bukan data tamu. Jika kebijakan akun Workspace melarang akses Anyone, metode koneksi langsung ini tidak dapat digunakan; diperlukan backend dengan login Google.

Saat memperbarui kode backend, pilih **Deploy → Manage deployments → Edit → New version → Deploy**. Menyimpan kode di editor saja tidak memperbarui deployment aktif.

## 2. Amankan data lokal lama

**Gunakan browser, profil, perangkat, dan alamat situs yang sama dengan saat memasukkan data sebelumnya.** localStorage pada domain Vercel, domain lain, localhost, mode privat, dan file lokal tidak saling berbagi.

1. Buka halaman admin pada alamat lama setelah versi website terbaru tersedia.
2. Sebelum menghubungkan, klik **Unduh cadangan lokal (JSON)**. Simpan file di tempat privat.
3. Periksa jumlah tamu lokal yang ditampilkan.
4. Jangan membersihkan data browser atau menghapus localStorage sebelum migrasi terverifikasi.

Kode baru tidak lagi menghapus nama yang dianggap data contoh. JSON rusak juga tidak direset otomatis. Data tanpa kode/ID dilengkapi sekali; kode lama yang sudah ada dipertahankan.

## 3. Hubungkan dan impor ke Spreadsheet

1. Masukkan URL Web App `/exec` serta token admin, lalu klik **Hubungkan**.
2. Setelah berhasil, tabel menampilkan data **Spreadsheet**, bukan gabungan dengan data lokal. Angka tamu lokal tetap terlihat di panel.
3. Klik **Impor data lokal ke Spreadsheet**, lalu konfirmasi.
4. Aplikasi mengunduh cadangan JSON dan mengirim data per kelompok maksimal 500 tamu.
5. Tunggu status jumlah tamu baru dan data identik yang dilewati.
6. Buka tab `Tamu` di Google Sheets untuk memeriksa jumlah, nama, kategori, kode, serta tautan.
7. Muat ulang laman admin, hubungkan kembali, dan pastikan tamu tetap muncul. Uji satu tautan yang sebelumnya telah dibagikan.

Impor menggunakan `code` sebagai identitas undangan:
- Kode baru ditambahkan.
- Kode sama dengan nama, kategori, dan nomor telepon sama dilewati. Mengulang kiriman yang sama tidak menambah baris duplikat.
- Kode sama tetapi data berbeda menyebabkan kelompok tersebut ditolak, tanpa menimpa tamu lama. Periksa data sebelum memperbaiki konflik; jangan mengganti kode yang sudah dibagikan sembarangan.
- Nama sama dengan kode berbeda dianggap dua undangan. Mengunggah ulang Excel menghasilkan kode baru, sehingga **bukan** cara melanjutkan impor gagal. Gunakan tombol impor data lokal untuk mencoba ulang.
- ID lama, kode, nama, kategori, dan telepon dipertahankan. Payload token tautan tetap `[code, name, category]`.

Data lokal yang sudah dikonfirmasi backend dikeluarkan dari daftar lokal aktif agar tidak diimpor ulang setelah tamu dihapus dari Spreadsheet. Kelompok yang gagal atau belum dikirim tetap berada di localStorage. Cadangan awal juga disimpan dengan kunci `wisuda_guest_list_db_before_sheets`; unduhan JSON adalah salinan terpisah yang harus disimpan sendiri.

Jangan mengedit daftar lokal lewat beberapa tab sekaligus selama migrasi. Backend mengunci operasi antarsesi, tetapi localStorage browser bukan database transaksional lintas tab.

## 4. Penggunaan sehari-hari

- **Setelah terhubung:** tambah manual dan unggah Excel/CSV menyimpan ke Spreadsheet. Kiriman terlebih dahulu disimpan lokal agar dapat dicoba ulang bila koneksi gagal.
- **Sebelum terhubung / setelah putus koneksi:** tambah dan hapus hanya berlaku pada data lokal, dengan status yang menjelaskan hal tersebut.
- **Muat ulang Spreadsheet:** mengambil data terbaru dari server, termasuk tamu yang ditambahkan perangkat lain.
- **Hapus tamu:** menghapus kode tamu yang dipilih dari sumber data aktif.
- **Kosongkan Semua Data:** menghapus semua tamu yang telah dimuat dari sumber aktif, setelah konfirmasi. Tamu yang baru ditambahkan perangkat lain dan belum dimuat tidak ikut dihapus.
- **Putuskan koneksi:** membuang token dari memori aplikasi, tidak menghapus Spreadsheet.
- Setelah reload/tutup halaman, token perlu diisi kembali. Hanya URL deployment yang disimpan lokal.
- Excel/CSV menggunakan kolom `Nama Tamu` dan `Kategori`; `No_WhatsApp` opsional. Batas file 5 MB. SheetJS lokal menangani nama dengan koma dan tanda kutip.

Header tab `Tamu` dibuat otomatis:
`id`, `code`, `name`, `category`, `phone`, `link`, `createdAt`, `updatedAt`.

Gunakan sheet kosong khusus aplikasi. Jangan mengganti header, menyisipkan baris kosong di tengah data, atau mengubah kode langsung. Timestamp mencatat waktu penambahan ke Sheets, bukan waktu input lokal yang tidak diketahui. Versi ini mendukung tambah, baca, impor, dan hapus; belum ada form edit tamu.

Kolom tautan menyimpan URL HTTP/HTTPS saat impor. Jika admin dibuka sebagai file lokal, kolom tautan dikosongkan karena alamat file tidak dapat dibuka penerima. Untuk tautan yang siap dibagikan, lakukan migrasi dari situs undangan yang digunakan sebelumnya. Pada domain Vercel, aplikasi tetap menggunakan alamat undangan yang sudah dikonfigurasi sebelumnya: `https://wisudadyah.vercel.app`.

## 5. Jika terjadi kegagalan

- **Token tidak valid:** cocokkan dengan `ADMIN_TOKEN` pada Script Properties.
- **Respons bukan JSON / CORS / halaman login:** periksa URL `/exec`, akses Anyone, otorisasi pemilik, dan versi deployment. Jangan mengganti fetch menjadi `no-cors`; respons opaque tidak dapat membuktikan data tersimpan.
- **Waktu habis / koneksi putus:** penulisan mungkin sudah terjadi di server. Klik **Muat ulang Spreadsheet**, lalu **Impor data lokal ke Spreadsheet** untuk mencoba sisa kiriman dengan kode yang sama.
- **Impor sebagian berhasil:** kelompok sebelumnya tetap tersimpan; aplikasi tidak membatalkan kelompok yang sudah sukses. Kelompok gagal tetap lokal untuk dicoba ulang.
- **Quota/storage browser penuh:** aplikasi melaporkan gagal, bukan mengklaim tersimpan. Unduh cadangan dan pastikan penyimpanan browser diizinkan.
- **Quota Apps Script / kunci sedang digunakan:** tunggu dan coba lagi. Penghapusan ribuan baris dapat memerlukan beberapa permintaan.
- **Jumlah lokal nol:** cek domain, browser, profil, dan perangkat lama. Admin tidak dapat mengambil localStorage dari browser lain.

Untuk pemulihan JSON, tidak ada tombol unggah JSON pada versi ini. Simpan file cadangan asli. Jika perlu memulihkan melalui DevTools pada origin lama, putuskan koneksi terlebih dahulu, cadangkan nilai lokal saat ini, lalu masukkan array JSON yang telah diperiksa ke kunci `wisuda_guest_list_db`. Muat ulang halaman dan impor ulang dengan kode asli. Jangan mengonversi cadangan ke template Excel karena itu membuat kode baru.

## Keamanan dan batasan

Token adalah kunci bersama untuk seluruh data tamu, bukan akun per admin. Berikan hanya kepada pengelola tepercaya, gunakan HTTPS, dan putar token bila bocor. Tampilan admin dapat diakses publik, tetapi daftar tamu server tidak diberikan tanpa token. Ini bukan sistem role-based login atau audit trail.

Data teks ditulis sebagai teks, bukan formula spreadsheet. Token tautan undangan memakai Base64 URL, **bukan enkripsi**; penerima tautan dapat membaca nama/kategori di dalamnya. Menghapus baris Spreadsheet tidak mencabut tautan undangan publik yang bersifat mandiri.

## Pengujian

Jalankan dari root proyek:
```sh
node --check assets/js/admin.js
node --test tests/admin-sheets.test.cjs
```

Tes lokal menggunakan simulasi layanan Apps Script dan DOM, bukan akun Google asli. Uji deployment dan CORS di browser tetap diperlukan sesudah pemasangan. Jangan gunakan daftar produksi untuk uji hapus; gunakan Spreadsheet percobaan dahulu.
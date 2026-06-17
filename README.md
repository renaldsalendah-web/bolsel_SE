# BPS FASIH Scraper & Dashboard Monitoring SE2026

Repositori ini berisi sistem pemantauan terpadu untuk Sensus Ekonomi 2026 BPS Kabupaten Kepulauan Sangihe, yang terdiri dari dua bagian utama:
1. **Scraper Otomatis (Python + Playwright):** Mengumpulkan data prelist secara berkala dari portal BPS FASIH.
2. **Dashboard Monitoring (Next.js + Tailwind CSS):** Visualisasi interaktif, pencarian cepat, dan filter dari data hasil scraping.

---

## 📂 Struktur Proyek

Proyek ini terstruktur sebagai berikut:

```text
scraper-fasih-sm/
├── data/
│   ├── email_mitra.txt          # Daftar lengkap email mitra (untuk scrape produksi)
│   └── email_mitra_test.txt     # Daftar email mitra untuk uji coba (3 email)
├── dashboard/                   # Aplikasi Dashboard Monitoring (Next.js)
│   ├── public/
│   │   └── scraped_data.csv     # Data masukan untuk dashboard (disalin otomatis oleh scraper)
│   ├── src/
│   │   └── app/
│   │       ├── globals.css      # Pengaturan tema Tailwind CSS
│   │       ├── layout.tsx       # Layout dasar Next.js
│   │       └── page.tsx         # Halaman utama dashboard monitoring (warna oranye dominan)
│   ├── package.json
│   └── tsconfig.json
├── legacy/                      # Script lama (login terpisah & scraper manual)
│   ├── login.py
│   └── scraper.py
├── research/                    # File riset, screenshot, dan berkas analisis HTML offline
│   ├── analyze_html.py
│   ├── inspect_pagination.py
│   ├── FASIH_ Flexible Authentic Survey Instrument in Harmony.html
│   └── FASIH_ Flexible Authentic Survey Instrument in Harmony_files/
├── .gitignore                   # Konfigurasi pengabaian file sensitif / sementara
├── README.md                    # Dokumentasi panduan ini
├── requirements.txt             # Dependensi Python untuk scraper
├── run_se2026.py                # Script utama scraper terpadu (menimpa CSV & menyalin hasil ke dashboard)
└── scraped_data.csv             # Backup data lokal hasil scraper terakhir
```

---

## ⚙️ Prasyarat & Instalasi

### 1. Persiapan Scraper (Python)
Pastikan Anda memiliki Python 3.8+ terinstall, lalu jalankan perintah berikut di root folder:
```powershell
pip install -r requirements.txt
playwright install chromium
```

### 2. Persiapan Dashboard (Next.js)
Masuk ke folder `dashboard/` dan pasang dependensi Node.js:
```powershell
cd dashboard
npm install
```

---

## 🚀 Cara Menjalankan

### Langkah 1: Jalankan Scraper (Python)
Jalankan scraper untuk mengambil data terbaru dari BPS FASIH:
* **Mode Uji Coba (3 email):** `python run_se2026.py --test`
* **Mode Produksi (168 email):** `python run_se2026.py`

*Catatan: Setiap kali scraper selesai dijalankan, berkas `scraped_data.csv` lama akan **ditimpa secara otomatis** dengan data status terbaru, kemudian disalin langsung ke folder `dashboard/public/scraped_data.csv`.*

### Langkah 2: Jalankan Dashboard Secara Lokal (Next.js)
Untuk melihat dashboard di browser Anda:
```powershell
cd dashboard
npm run dev
```
Buka browser dan akses [http://localhost:3000](http://localhost:3000). Anda akan melihat visualisasi statistik target prelist, grafik kinerja petugas (pencacah), distribusi skala usaha, serta tabel data dengan pencarian dan filter cepat (warna dominan oranye).

---

## ☁️ Petunjuk Deployment ke Vercel

Aplikasi dashboard ini siap untuk di-deploy ke Vercel secara gratis. Ikuti langkah berikut:

1. Pastikan Anda telah mengunggah (push) seluruh repositori ini ke GitHub.
2. Buka dashboard [Vercel](https://vercel.com) dan klik **Add New > Project**.
3. Hubungkan ke repositori GitHub proyek ini (`fasih-sm-scrapper`).
4. Di bagian konfigurasi project Vercel:
   * **Root Directory:** Ubah / pilih folder `dashboard`.
   * **Framework Preset:** Pilih **Next.js**.
   * **Build Command:** `npm run build` (default).
   * **Output Directory:** `.next` (default).
5. Klik **Deploy**. Vercel akan otomatis mendeteksi aplikasi Next.js Anda di folder `dashboard` dan mempublikasikannya secara statis.

---

## 🔒 Catatan Keamanan

> [!IMPORTANT]
> Berkas `auth_state.json` berisi sesi login aktif Anda ke BPS FASIH. Berkas ini telah diabaikan di `.gitignore` dan **jangan pernah** diunggah ke GitHub demi keamanan kredensial SSO BPS Anda.

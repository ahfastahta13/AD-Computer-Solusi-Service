# IT Service Business System 🛠️⚡

Platform web modern untuk bisnis **Computer Service & Solusi Jasa IT** yang dirancang menggunakan arsitektur fullstack terpadu, bersih (*clean*), *scalable*, dan siap dikembangkan (*production-ready*).

---

## 📌 1. Gambaran Proyek & Tujuan

Aplikasi ini bertujuan untuk mendigitalkan seluruh siklus operasional bisnis perbaikan komputer dan layanan IT:
- **Pelanggan (Customer)** dapat melakukan booking servis secara mandiri, melacak progres diagnosa dan pengerjaan secara real-time, meninjau surat penawaran biaya (*quotation*), melakukan pembayaran digital, serta berkonsultasi dengan asisten AI.
- **Pengelola (Admin / Workshop)** dapat memantau antrean *service orders*, menugaskan teknisi, memperbarui tahapan perbaikan, menerbitkan *quotation*, memverifikasi pembayaran masuk, dan mengonfigurasi kecerdasan buatan (*AI Assistant*).

---

## 🏗️ 2. Arsitektur Sistem & Tech Stack

```
+-------------------------------------------------------------------+
|               Browser Client (Desktop, Tablet, Mobile)            |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                     Next.js 14+ (App Router)                      |
|                                                                   |
|  +---------------------+  +--------------------+  +------------+  |
|  |  (public) Routes    |  |  (customer) Portal |  | (admin)    |  |
|  |  - Landing Page     |  |  - Dashboard       |  |  Console   |  |
|  |  - Services Catalog |  |  - Booking Form    |  |  - KPI     |  |
|  |  - Public Tracker   |  |  - Orders Tracking |  |  - Orders  |  |
|  |  - Auth Login/Reg   |  |  - Quotations      |  |  - Clients |  |
|  |                     |  |  - Payments        |  |  - Quotes  |  |
|  |                     |  |  - AI Troubleshoot |  |  - Pay Ver |  |
|  +---------------------+  +--------------------+  +------------+  |
|                                                                   |
|  +-------------------------------------------------------------+  |
|  |                API Handlers & Business Logic                |  |
|  |       /api/health | /api/db-check | Auth & Role Guards      |  |
|  +-------------------------------------------------------------+  |
|                                 |                                 |
|                                 v                                 |
|  +-------------------------------------------------------------+  |
|  |            Database ORM Layer: Prisma Client (db.ts)        |  |
|  +-------------------------------------------------------------+  |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|               Database: SQLite (Default) / PostgreSQL             |
+-------------------------------------------------------------------+
```

### Komponen Teknologi:
1. **Framework Utama**: **Next.js 14+ (App Router)** dengan **TypeScript**.
2. **Database ORM**: **Prisma ORM** dengan default database **SQLite** (`prisma/dev.db`) untuk *zero-friction setup*, serta siap dialihkan ke **PostgreSQL / MySQL** cukup dengan mengganti `DATABASE_URL` pada file `.env`.
3. **Desain & UI**: **Modern Vanilla CSS Tokens** (Glassmorphism, Dark Tech Theme `#0b0f19`, Cyber Cyan `#38bdf8`, Status Indicators, Responsif Mobile-Friendly).
4. **Ikonografi**: **Lucide Icons**.

---

## 👥 3. Model Role & Hak Akses

| Fitur / Modul | Role Customer | Role Admin |
| :--- | :---: | :---: |
| **Katalog Layanan & Pencarian** | ✅ Akses Penuh | ✅ Akses Penuh |
| **Public Order Tracking (Nomor Resi)** | ✅ Akses Penuh | ✅ Akses Penuh |
| **Booking & Request Servis Baru** | ✅ Buat Booking | ✅ Input Servis Manual |
| **Monitoring Status Pengerjaan** | ✅ Timeline Milik Sendiri | ✅ Kelola Semua Tiket Servis |
| **Pembaruan Status Servis** | ❌ Read Only | ✅ Update (Diagnosa -> Selesai) |
| **Quotation Penawaran Biaya** | ✅ Review, Setujui / Tolak | ✅ Buat & Terbitkan Quote |
| **Pembayaran & Invoice** | ✅ Lihat Invoice & Bayar | ✅ Verifikasi Pelunasan |
| **AI IT Assistant** | ✅ Tanya Diagnosa & Konsultasi | ✅ Konfigurasi Prompt & Model |

---

## 📁 4. Struktur Direktori Proyek

```
tugas web rpl/
├── .env                         # Konfigurasi aktif lingkungan lokal
├── .env.example                 # Template variabel lingkungan
├── .gitignore                   # File pengabaian Git
├── next.config.mjs              # Konfigurasi Next.js
├── package.json                 # Daftar dependensi & script NPM
├── tsconfig.json                # Konfigurasi TypeScript
├── prisma/
│   └── schema.prisma            # Skema database Prisma (User, Order, Quote, Payment)
├── src/
│   ├── app/
│   │   ├── (public)/            # Rute Halaman Publik
│   │   │   ├── layout.tsx       # Layout publik (Navbar + Footer)
│   │   │   ├── page.tsx         # Landing page utama
│   │   │   ├── services/        # Katalog layanan servis
│   │   │   ├── track/           # Pelacakan status nomor servis
│   │   │   └── auth/            # Halaman login & registrasi
│   │   ├── (customer)/          # Rute Customer Portal
│   │   │   └── customer/
│   │   │       ├── layout.tsx   # Layout portal pelanggan (Sidebar + Header)
│   │   │       ├── dashboard/   # Ringkasan akun & servis aktif
│   │   │       ├── services/    # Formulir booking servis
│   │   │       ├── orders/      # Daftar & riwayat order servis
│   │   │       ├── quotations/  # Penawaran harga & approval
│   │   │       ├── payments/    # Invoice & metode pembayaran
│   │   │       └── ai-assistant/# AI IT Diagnostik Chat
│   │   ├── (admin)/             # Rute Admin Console
│   │   │   └── admin/
│   │   │       ├── layout.tsx   # Layout konsol admin (Sidebar + Header)
│   │   │       ├── dashboard/   # KPI pendapatan & ringkasan operasional
│   │   │       ├── orders/      # Manajemen tiket servis & update status
│   │   │       ├── customers/   # Direktori data pelanggan
│   │   │       ├── quotations/  # Pembuatan & approval quotation
│   │   │       ├── payments/    # Verifikasi pembayaran masuk
│   │   │       └── ai-assistant/# Konfigurasi prompt & engine AI
│   │   ├── api/                 # Endpoint REST API
│   │   │   ├── health/          # Health check & arsitektur info
│   │   │   └── db-check/        # Verifikasi koneksi Prisma DB
│   │   ├── globals.css          # Desain sistem CSS & token tema
│   │   └── layout.tsx           # Root layout & Role Switcher
│   ├── components/
│   │   ├── layout/              # Navbar, Sidebars, Header, Footer
│   │   └── ui/                  # Komponen UI & Role Switcher Banner
│   ├── lib/
│   │   ├── auth.ts              # Konsep role, hak akses, demo user
│   │   ├── config.ts            # Konstanta konfigurasi aplikasi
│   │   └── db.ts                # Prisma Client Singleton
│   └── types/
│       └── index.ts             # Definisi tipe data TypeScript
└── README.md                    # Dokumentasi lengkap proyek
```

---

## 🚀 5. Panduan Menjalankan Proyek

### Prasyarat:
- **Node.js** versi 18.x atau lebih baru (tersedia di Laragon: `C:\laragon\bin\nodejs\node-v22`).
- **NPM** atau Package Manager sejenis.

---

### Langkah 1: Clone atau Buka Folder Proyek
Buka terminal pada direktori proyek:
```bash
cd "c:\Users\Ahfas Tahta S\OneDrive\Dokumen\tugas web rpl"
```

---

### Langkah 2: Setup Environment Variable
File `.env` sudah disediakan secara default. Anda dapat meninjau konfigurasinya dari `.env.example`:
```env
# Database Connection
DATABASE_URL="file:./dev.db"

# Nama Aplikasi
NEXT_PUBLIC_APP_NAME="IT Service Business System"
```

---

### Langkah 3: Install Dependensi
Jalankan perintah berikut:
```bash
npm install
```
*(Catatan di Windows PowerShell: Jika script execution dibatasi oleh policy, gunakan `npm.cmd install`)*

---

### Langkah 4: Generate Prisma Client & Inisialisasi Database
Jalankan perintah Prisma untuk membuat tabel database SQLite secara otomatis:
```bash
npx prisma generate
npx prisma db push
```

---

### Langkah 5: Jalankan Development Server
Mulai server lokal:
```bash
npm run dev
```

Aplikasi akan berjalan di:
👉 **`http://localhost:3000`**

---

## 🧭 6. Peta Rute Navigasi Utama

| URL Path | Deskripsi Halaman |
| :--- | :--- |
| **`/`** | Landing Page utama dengan fitur pencarian status resi & preview layanan |
| **`/services`** | Katalog lengkap jasa reparasi hardware & solusi IT |
| **`/track`** | Halaman tracking status pengerjaan servis secara transparan |
| **`/auth/login`** | Halaman login dengan fitur *Demo Role Switcher* (Customer / Admin) |
| **`/customer/dashboard`** | Dashboard utama Customer Portal |
| **`/customer/services`** | Formulir pemesanan / booking perbaikan perangkat |
| **`/customer/orders`** | Tabel pelacakan status pengerjaan seluruh unit servis |
| **`/customer/quotations`** | Tinjauan rincian penawaran biaya suku cadang & approval |
| **`/customer/payments`** | Informasi tagihan invoice & instruksi pembayaran |
| **`/customer/ai-assistant`** | Chat interaktif dengan AI IT Diagnostik |
| **`/admin/dashboard`** | Konsol pengelola dengan KPI pendapatan & ringkasan antrean |
| **`/admin/orders`** | Manajemen servis & pengubah status (Diagnosa -> In Repair -> Selesai) |
| **`/admin/customers`** | Direktori data klien & riwayat perbaikan |
| **`/admin/quotations`** | Manajemen & penerbitan surat penawaran harga |
| **`/admin/payments`** | Verifikasi bukti transfer dan rekonsiliasi keuangan |
| **`/admin/ai-assistant`** | Pengaturan parameter model & instruksi persona AI |
| **`/api/health`** | Endpoint JSON status kesehatan sistem |
| **`/api/db-check`** | Endpoint JSON verifikasi konektivitas Prisma Database |

---

## 💡 7. Fitur Demo Role Switcher
Di bagian atas aplikasi terdapat bilah interaktif **MVP Role Context** yang memungkinkan Anda berpindah seketika antara:
- **Public Landing** (`/`)
- **Customer Portal** (`/customer/dashboard`)
- **Admin Console** (`/admin/dashboard`)

untuk mempermudah peninjauan desain dan arsitektur tanpa perlu proses otentikasi yang rumit pada tahap fondasi ini.

---

## 🛣️ 8. Rencana Pengembangan Tahap Selanjutnya
- [ ] Integrasi otentikasi penuh dengan NextAuth.js / Supabase Auth.
- [ ] Penyambungan API OpenAI / Google Gemini secara live untuk AI Assistant.
- [ ] Integrasi Payment Gateway (Midtrans / Xendit).
- [ ] Integrasi notifikasi status otomatis via WhatsApp Gateway.

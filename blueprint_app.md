# BLUEPRINT APLIKASI: PRE-ORDER & PICK-UP BEKAL SEKOLAH (GRAB & GO)

## 1. Ringkasan Sistem
Aplikasi ini adalah platform agregator berkonsep *Pre-Order H-1* yang menghubungkan orang tua (pembeli) dengan gerai sarapan (UMKM). Fokus utama aplikasi adalah pemrosesan pesanan terjadwal, transaksi *wallet* internal, keranjang *multi-tenant*, dan rekapitulasi data pesanan otomatis pada pukul 21.00.

## 2. Rekomendasi Tech Stack (Fase MVP)
Mengingat target *time-to-market* dan efisiensi biaya awal:
*   **Frontend App (User & Tenant):** Flutter (Satu *codebase* untuk iOS dan Android). Bisa dipisah menjadi 2 aplikasi ringan (App User & App Tenant) atau digabung dengan kontrol otorisasi (*Role-Based Access*).
*   **Backend API:** Node.js dengan framework Express.js atau NestJS. Sangat ringan untuk menangani konkurensi (banyak akses bersamaan di malam hari sebelum jam cut-off).
*   **Database:** PostgreSQL (Relasional). Penting untuk menjaga integritas data keuangan (Wallet) dan transaksi pesanan yang kompleks (*multi-tenant*).
*   **Authentication & OTP:** Firebase Auth (untuk login nomor HP) atau pihak ketiga lokal seperti Qiscus / Twilio (WhatsApp OTP).
*   **Payment Gateway:** Midtrans atau Xendit (Mendukung integrasi QRIS dan e-Wallet untuk Top-Up saldo internal).
*   **Hosting / Cloud:** DigitalOcean atau AWS (EC2 & RDS) skala kecil.

## 3. Fitur Utama (Core Features)

### A. Modul Aplikasi Orang Tua (User)
1.  **Autentikasi:** Login/Daftar via Nomor HP (OTP WhatsApp).
2.  **Beranda (Home):** Menampilkan daftar gerai terdekat / searah rute sekolah, jam operasional, dan promo.
3.  **Dompet (Wallet):** Informasi saldo, riwayat mutasi, dan menu Top-Up (min. Rp50.000). Pembayaran pesanan **wajib** menggunakan dompet ini.
4.  **Keranjang Multi-Tenant:** Kemampuan memasukkan pesanan dari Gerai A dan Gerai B dalam satu sesi *checkout*.
5.  **Checkout & Penjadwalan:** Memilih hari (H+1 atau fitur *Recurring* untuk 1 bulan ke depan) dan estimasi jam pengambilan.
6.  **QR/Nomor Pengambilan:** Tampilan kode pesanan berukuran besar untuk ditunjukkan (jika perlu) saat mengambil di area *Grab & Go*.

### B. Modul Aplikasi Gerai (Tenant)
1.  **Manajemen Menu & Stok:** Mengatur produk, harga, dan kuota pesanan per hari.
2.  **Dashboard Pesanan:** Tampilan rekap pesanan (hanya bisa diakses setelah pukul 21.00). Didesain sederhana agar mudah dicetak (*print-friendly*) atau dibaca sekilas.
3.  **Manajemen Status:** Tombol sederhana untuk menandai "Pesanan Selesai Diambil" (opsional, karena konsepnya *Grab & Go*, ini bisa dibuat otomatis selesai ketika waktu pengambilan terlewati).
4.  **Pencairan Dana (Withdrawal):** Menarik saldo pendapatan H-1 ke rekening bank UMKM.

### C. Modul Admin (Superadmin Web)
1.  Verifikasi dan *Onboarding* Tenant baru.
2.  Manajemen potongan biaya layanan (Service Fee Rp1.000) dan Komisi Tenant (3-5%).
3.  Penyelesaian perselisihan (Refund/Complain).

## 4. Arsitektur Logika Sistem (System Logic)

### A. Logika Keranjang Multi-Tenant
Jika User memesan dari Nasi Uduk A dan Susu B:
1. Sistem membuat 1 `Order` induk (Total Bayar + 1x Biaya Layanan Rp1.000).
2. Sistem memecah menjadi 2 `Sub-Order` (Satu untuk Gerai A, satu untuk Gerai B) agar rekap masing-masing tenant rapi.

### B. Sistem *Cron Job* (Automasi Pukul 21.00)
1.  Pada pukul 21:00:00, server akan menjalankan *script* penutupan (Cron Job).
2.  Status toko di aplikasi otomatis berubah menjadi "Tutup untuk Besok".
3.  Sistem men-*generate* daftar pesanan final (PDF/Tampilan Tabel) untuk masing-masing tenant.
4.  Sistem mengirim notifikasi (Push Notification/WA) ke Tenant: "Rekap pesanan besok sudah tersedia, total X porsi."

### C. Logika Recurring Order (Jadwal Otomatis)
1. User memilih paket berlangganan (misal: Senin-Jumat selama 4 minggu).
2. Sistem akan membuat pesanan bayangan (*Draft Orders*) di *database* untuk 20 hari ke depan.
3. Setiap H-1 sebelum pukul 21.00, sistem secara otomatis mengeksekusi pesanan tersebut dan memotong saldo *Wallet*. (Jika saldo tidak cukup, sistem mengirim notifikasi peringatan H-2).

## 5. Skema Database (High-Level Entity Relationship)
*   **Users:** `id`, `name`, `phone`, `wallet_balance`
*   **Tenants:** `id`, `name`, `location`, `commission_rate`
*   **Products:** `id`, `tenant_id`, `name`, `price`, `is_active`
*   **Orders (Induk):** `id`, `user_id`, `total_price`, `service_fee`, `order_date`
*   **Order_Items (Sub-Order):** `id`, `order_id`, `tenant_id`, `product_id`, `qty`, `pickup_time`, `status`
*   **Wallet_Transactions:** `id`, `user_id`, `amount`, `type (topup/payment)`, `created_at`

## 6. Fase Pengembangan (Roadmap MVP)

*   **Bulan 1: Discovery & UI/UX Design**
    *   Pembuatan *Wireframe* dan *Clickable Prototype*.
    *   Validasi desain ke perwakilan UMKM (pastikan UI rekap pesanan sangat mudah dipahami oleh pedagang).
*   **Bulan 2: Backend, Database & API**
    *   Setup *server*, perancangan *database*, pembuatan API.
    *   Implementasi sistem dompet internal dan *Cron Job* jam 21.00.
*   **Bulan 3: Mobile App Development**
    *   Integrasi API ke aplikasi Flutter.
    *   Integrasi Payment Gateway Midtrans/Xendit untuk Top-up.
*   **Bulan 4: Testing & Launch (UAT)**
    *   *Alpha testing* internal (simulasi transaksi multi-tenant dan penjadwalan).
    *   *Onboarding* 10-20 tenant pertama.
    *   *Soft-launch* ke komunitas sekolah terpilih.
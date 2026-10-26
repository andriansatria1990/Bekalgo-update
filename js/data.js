/**
 * BekalGo - Data Seed & Master Data
 * Berdasarkan Blueprint: Pre-Order & Pick-Up Bekal Sekolah (Grab & Go) Sidoarjo
 */

export const INITIAL_DATA = {
  // Pengaturan Platform
  config: {
    appName: "BekalGo",
    tagline: "Pre-Order & Grab & Go Bekal Sekolah Terjadwal",
    serviceFee: 1000, // Rp 1.000 per transaksi induk
    defaultCommissionRate: 3.5, // 3.5% komisi mitra
    cutoffHour: 21, // 21:00 WIB cut-off order H-1
    pickupStartTime: "06:00",
    pickupEndTime: "08:30",
    minTopup: 50000,
    areaCoverage: "Kabupaten Sidoarjo & Sekitarnya"
  },

  // Pengguna Terdaftar (Role: User / Orang Tua)
  users: [
    {
      id: "usr_01",
      name: "Ibu Rina Wulandari",
      phone: "0812-3456-7890",
      email: "rina.wulandari@gmail.com",
      role: "user",
      childName: "Rayyan Al-Fatih",
      childSchool: "SD Islam Al-Falah Deltasari Sidoarjo",
      childClass: "Kelas 4B",
      defaultPickupTime: "06:45",
      walletBalance: 125000,
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "usr_02",
      name: "Pak Dimas Prasetyo",
      phone: "0813-9876-5432",
      email: "dimas.prasetyo@gmail.com",
      role: "user",
      childName: "Aisyah Putri",
      childSchool: "SD Pucang Sidoarjo",
      childClass: "Kelas 2A",
      defaultPickupTime: "06:30",
      walletBalance: 80000,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
    }
  ],

  // Mitra Gerai UMKM (Role: Mitra Gerai)
  tenants: [
    {
      id: "tnt_01",
      name: "Nasi Kuning & Bento Bu Sri",
      owner: "Ibu Hj. Sri Rahayu",
      phone: "0821-4455-6677",
      email: "mitra.sri@bekalgo.id",
      location: "Jl. Pahlawan No. 42, Sidoarjo (Dekat GOR)",
      route: "Rute Pucang - GOR Sidoarjo",
      routeBadge: "Rute Utama 1",
      pickupPoint: "Rak Grab & Go A - Meja Khusus Depan Kasir",
      commissionRate: 3.5,
      rating: 4.9,
      totalOrdersHandled: 342,
      isActive: true,
      openTime: "05:45 - 09:00 WIB",
      image: "assets/hero-banner.jpg",
      description: "Spesialis sarapan bekal sehat anak, higienis, porsi pas dengan lauk ayam suwir gurih, orek tempe manis, dan telur balado nikmat.",
      isVerified: true
    },
    {
      id: "tnt_02",
      name: "Bento Kids Bunda Anita",
      owner: "Bunda Anita Lestari",
      phone: "0819-8877-6655",
      email: "mitra.anita@bekalgo.id",
      location: "Komplek Deltasari Indah Blok BD-12, Waru Sidoarjo",
      route: "Rute Al-Falah Deltasari - Waru",
      routeBadge: "Rute Sekolah Favorit",
      pickupPoint: "Rak Kayu Grab & Go - Teras Gerai",
      commissionRate: 4.0,
      rating: 4.8,
      totalOrdersHandled: 289,
      isActive: true,
      openTime: "06:00 - 08:30 WIB",
      image: "assets/pickup-shelf.jpg",
      description: "Bento karakter lucu dengan gizi seimbang (karbohidrat, sayur brokoli, wortel, dan protein katsu renyah). Favorit anak-anak TK & SD.",
      isVerified: true
    },
    {
      id: "tnt_03",
      name: "Dapur Roti & Susu Mbak Endang",
      owner: "Mbak Endang Handayani",
      phone: "0857-1122-3344",
      email: "mitra.endang@bekalgo.id",
      location: "Jl. Raya Taman Asri No. 18, Sepanjang, Sidoarjo",
      route: "Rute Sepanjang - Sedati",
      routeBadge: "Rute Cepat",
      pickupPoint: "Cooler Box & Rak B - Booth Pengambilan Mandiri",
      commissionRate: 3.0,
      rating: 4.9,
      totalOrdersHandled: 195,
      isActive: true,
      openTime: "06:00 - 09:00 WIB",
      image: "assets/sandwich-susu.jpg",
      description: "Sandwich gandum isi telur keju bergizi tinggi dipadukan susu sapi murni pasteurisasi aneka rasa untuk asupan energi prima anak.",
      isVerified: true
    },
    {
      id: "tnt_04",
      name: "Bubur Sehat & Lontong Opor Bu Titik",
      owner: "Ibu Titik Nurhaliza",
      phone: "0812-9988-7711",
      email: "mitra.titik@bekalgo.id",
      location: "Jl. Diponegoro No. 88, Lemahputro, Sidoarjo",
      route: "Rute Pucang - Sidokare",
      routeBadge: "Rute Pusat Kota",
      pickupPoint: "Meja Etalase Grab & Go Khusus Antrean Bebas",
      commissionRate: 3.5,
      rating: 4.7,
      totalOrdersHandled: 154,
      isActive: true,
      openTime: "05:30 - 08:30 WIB",
      image: "assets/nasi-kuning.jpg",
      description: "Bubur ayam kuah kuning tanpa MSG berlebihan dan lontong opor suwir ayam kampung yang lembut, aman dan ramah di perut anak sekolah.",
      isVerified: true
    }
  ],

  // Produk / Menu Makanan
  products: [
    // Menu Toko 1 (Bu Sri)
    {
      id: "prd_01",
      tenantId: "tnt_01",
      name: "Nasi Kuning Komplit Juara",
      price: 15000,
      category: "Nasi & Lauk",
      image: "assets/nasi-kuning.jpg",
      description: "Nasi kuning wangi gurih kunyit alami, suwir ayam bumbu manis, orek tempe renyah, irisan telur dadar, mentimun segar dalam box ramah lingkungan.",
      calories: "450 kkal",
      tags: ["Terlaris", "Bergizi", "Halal"],
      quotaDaily: 40,
      isActive: true
    },
    {
      id: "prd_02",
      tenantId: "tnt_01",
      name: "Nasi Uduk Betawi Telur Balado",
      price: 14000,
      category: "Nasi & Lauk",
      image: "assets/nasi-kuning.jpg",
      description: "Nasi uduk santan gurih dengan telur balado manis gurih tidak pedas, bihun goreng, dan kerupuk renyah.",
      calories: "420 kkal",
      tags: ["Anak Favorit", "Halal"],
      quotaDaily: 30,
      isActive: true
    },
    {
      id: "prd_03",
      tenantId: "tnt_01",
      name: "Jus Mangga & Jeruk Murni",
      price: 7000,
      category: "Minuman Sehat",
      image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&auto=format&fit=crop&q=80",
      description: "Jus perasan buah asli kaya vitamin C untuk daya tahan tubuh anak sekolah.",
      calories: "110 kkal",
      tags: ["Tanpa Pengawet", "Segar"],
      quotaDaily: 25,
      isActive: true
    },

    // Menu Toko 2 (Bento Bunda Anita)
    {
      id: "prd_04",
      tenantId: "tnt_02",
      name: "Bento Ceria Katsu & Sayur Sehat",
      price: 18000,
      category: "Bento Anak",
      image: "assets/bento-sehat.jpg",
      description: "Nasi putih bentuk karakter panda senyum, chicken katsu krispi fillet dada ayam asli, brokoli rebus, jagung manis pipil, dan saus bento terpisah.",
      calories: "490 kkal",
      tags: ["Best Seller", "Kaya Serat", "Kids Friendly"],
      quotaDaily: 35,
      isActive: true
    },
    {
      id: "prd_05",
      tenantId: "tnt_02",
      name: "Bento Nugget Ikan Salmon Sayur",
      price: 17000,
      category: "Bento Anak",
      image: "assets/bento-sehat.jpg",
      description: "Nugget salmon homemade tinggi omega-3, nasi pulen, wortel kukus bintang, dan sosis bunga.",
      calories: "460 kkal",
      tags: ["Omega 3", "Homemade"],
      quotaDaily: 30,
      isActive: true
    },

    // Menu Toko 3 (Dapur Roti Mbak Endang)
    {
      id: "prd_06",
      tenantId: "tnt_03",
      name: "Sandwich Telur Keju & Susu Sapi Segar",
      price: 16000,
      category: "Roti & Susu",
      image: "assets/sandwich-susu.jpg",
      description: "Roti tawar gandum lapis telur fluffy lembut, slice keju cheddar, selada renyah, dipadukan 1 botol susu pasteurisasi rasa vanila/cokelat.",
      calories: "380 kkal",
      tags: ["Praktis", "Kalsium Tinggi"],
      quotaDaily: 45,
      isActive: true
    },
    {
      id: "prd_07",
      tenantId: "tnt_03",
      name: "Susu Kedelai Murni Botol 250ml",
      price: 6000,
      category: "Minuman Sehat",
      image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80",
      description: "Susu kedelai tanpa pengawet dengan pemanis gula kelapa alami, cocok bagi anak dengan alergi laktosa.",
      calories: "120 kkal",
      tags: ["Plant Based", "Lactose Free"],
      quotaDaily: 30,
      isActive: true
    },

    // Menu Toko 4 (Bu Titik)
    {
      id: "prd_08",
      tenantId: "tnt_04",
      name: "Bubur Ayam Sehat Kuah Gurih",
      price: 13000,
      category: "Bubur & Tradisional",
      image: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=300&auto=format&fit=crop&q=80",
      description: "Bubur beras organik lembut dengan kuah kaldu ayam kampung, suwiran ayam gurih, cakwe, dan bawang goreng renyah (sambal terpisah aman).",
      calories: "350 kkal",
      tags: ["Mudah Dicerna", "Hangat"],
      quotaDaily: 35,
      isActive: true
    }
  ],

  // Data Pesanan Awal (Untuk mendemonstrasikan status, rekap, cetak label, dan tiket Grab & Go)
  orders: [
    {
      id: "ORD-20261027-001",
      userId: "usr_01",
      userName: "Ibu Rina Wulandari",
      userPhone: "0812-3456-7890",
      childName: "Rayyan Al-Fatih",
      childClass: "Kelas 4B - SD Al-Falah",
      targetDate: "2026-10-27", // Esok Hari
      pickupTimeSlot: "06:30 - 07:00",
      notes: "Sambal dan saus dipisah di cup kecil ya.",
      totalProductPrice: 31000,
      serviceFee: 1000,
      totalPayment: 32000,
      paymentMethod: "BekalPay Internal Wallet",
      status: "ready_pickup", // pending_cutoff, preparing, ready_pickup, completed
      createdAt: "2026-10-26T14:15:00Z",
      // Multi-tenant sub-orders
      subOrders: [
        {
          id: "SUB-001-A",
          tenantId: "tnt_01",
          tenantName: "Nasi Kuning & Bento Bu Sri",
          pickupPoint: "Rak Grab & Go A - Depan Kasir",
          rackNumber: "RAK-A03",
          items: [
            { productId: "prd_01", name: "Nasi Kuning Komplit Juara", price: 15000, qty: 1 }
          ],
          tenantSubtotal: 15000,
          commissionFee: 525,
          status: "ready_pickup" // Siap di rak
        },
        {
          id: "SUB-001-B",
          tenantId: "tnt_03",
          tenantName: "Dapur Roti & Susu Mbak Endang",
          pickupPoint: "Cooler Box & Rak B",
          rackNumber: "RAK-B07",
          items: [
            { productId: "prd_06", name: "Sandwich Telur Keju & Susu Sapi Segar", price: 16000, qty: 1 }
          ],
          tenantSubtotal: 16000,
          commissionFee: 480,
          status: "ready_pickup" // Siap di rak
        }
      ]
    },
    {
      id: "ORD-20261027-002",
      userId: "usr_02",
      userName: "Pak Dimas Prasetyo",
      userPhone: "0813-9876-5432",
      childName: "Aisyah Putri",
      childClass: "Kelas 2A - SD Pucang",
      targetDate: "2026-10-27",
      pickupTimeSlot: "06:15 - 06:45",
      notes: "Jangan pedas sama sekali.",
      totalProductPrice: 18000,
      serviceFee: 1000,
      totalPayment: 19000,
      paymentMethod: "BekalPay Internal Wallet",
      status: "preparing",
      createdAt: "2026-10-26T14:30:00Z",
      subOrders: [
        {
          id: "SUB-002-A",
          tenantId: "tnt_02",
          tenantName: "Bento Kids Bunda Anita",
          pickupPoint: "Rak Kayu Grab & Go - Teras Gerai",
          rackNumber: "RAK-K02",
          items: [
            { productId: "prd_04", name: "Bento Ceria Katsu & Sayur Sehat", price: 18000, qty: 1 }
          ],
          tenantSubtotal: 18000,
          commissionFee: 720,
          status: "preparing"
        }
      ]
    }
  ],

  // Paket Recurring Order (Langganan Otomatis)
  recurringPlans: [
    {
      id: "rcr_01",
      userId: "usr_01",
      title: "Paket Bekal Sekolah Hemat Senin-Jumat",
      childName: "Rayyan Al-Fatih",
      durationWeeks: 4,
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      menuSchedule: [
        { day: "Senin", tenant: "Nasi Kuning Bu Sri", menu: "Nasi Kuning Komplit" },
        { day: "Selasa", tenant: "Bento Bunda Anita", menu: "Bento Ceria Katsu" },
        { day: "Rabu", tenant: "Dapur Roti Mbak Endang", menu: "Sandwich Telur Keju + Susu" },
        { day: "Kamis", tenant: "Nasi Kuning Bu Sri", menu: "Nasi Uduk Telur Balado" },
        { day: "Jumat", tenant: "Bento Bunda Anita", menu: "Bento Nugget Salmon" }
      ],
      weeklyCost: 80000,
      status: "Aktif",
      nextExecution: "2026-10-27 (Besok Pagi)",
      autoDeductWallet: true
    }
  ],

  // Riwayat Mutasi Dompet
  walletTransactions: [
    {
      id: "WTX-901",
      userId: "usr_01",
      type: "topup",
      amount: 150000,
      method: "QRIS Bank Mandiri",
      description: "Top-Up Saldo BekalPay",
      timestamp: "2026-10-25T19:30:00Z",
      status: "Success"
    },
    {
      id: "WTX-902",
      userId: "usr_01",
      type: "payment",
      amount: 32000,
      method: "BekalPay",
      description: "Pembayaran Pre-Order ORD-20261027-001 (Multi-Tenant)",
      timestamp: "2026-10-26T14:15:00Z",
      status: "Success"
    },
    {
      id: "WTX-903",
      userId: "usr_02",
      type: "topup",
      amount: 100000,
      method: "Virtual Account BCA",
      description: "Top-Up Saldo BekalPay",
      timestamp: "2026-10-26T08:00:00Z",
      status: "Success"
    },
    {
      id: "WTX-904",
      userId: "usr_02",
      type: "payment",
      amount: 19000,
      method: "BekalPay",
      description: "Pembayaran Pre-Order ORD-20261027-002",
      timestamp: "2026-10-26T14:30:00Z",
      status: "Success"
    }
  ],

  // Akun Super Admin
  superAdmin: {
    id: "adm_01",
    name: "Satria Adrian (Head of Operations)",
    role: "super_admin",
    email: "admin@bekalgo.id",
    phone: "0811-2233-4455"
  }
};

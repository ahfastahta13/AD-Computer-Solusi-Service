const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding IT Service Business System Database...\n');

  const defaultPasswordHash = bcrypt.hashSync('password123', 10);

  // Clean existing records to allow re-seeding cleanly
  await prisma.knowledgeBase.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.serviceOrder.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();

  // --------------------------------------------------------------------------
  // 1. SEED USERS (Admin & Customer Accounts for Development)
  // --------------------------------------------------------------------------
  console.log('1. Creating Users (Admin & Customer)...');
  const adminUser = await prisma.user.create({
    data: {
      id: 'usr-admin-01',
      name: 'Admin IT Central',
      email: 'admin@itservice-system.com',
      phone: '+62 811-2345-6789',
      password: defaultPasswordHash,
      address: 'Cyber Tech Tower Lt. 5, Jl. Jend. Sudirman Kav. 88, Jakarta Selatan',
      role: 'ADMIN',
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      id: 'usr-customer-01',
      name: 'Budi Pratama',
      email: 'budi.customer@example.com',
      phone: '+62 812-9876-5432',
      password: defaultPasswordHash,
      address: 'Jl. Melati No. 12, Kebayoran Baru, Jakarta Selatan',
      role: 'CUSTOMER',
    },
  });

  const corporateCustomer = await prisma.user.create({
    data: {
      id: 'usr-customer-02',
      name: 'PT Maju Solusindo (Corporate Client)',
      email: 'it.dept@majusolusindo.co.id',
      phone: '+62 811-9988-7766',
      password: defaultPasswordHash,
      address: 'Gedung Cyber 2 Lt. 8, Jl. HR Rasuna Said, Jakarta Selatan',
      role: 'CUSTOMER',
    },
  });

  // --------------------------------------------------------------------------
  // 2. SEED SERVICE CATALOG
  // --------------------------------------------------------------------------
  console.log('2. Creating Service Catalog...');
  const services = await Promise.all([
    prisma.service.create({
      data: {
        id: 'srv-01',
        name: 'Computer & Laptop Repair Service',
        description:
          'Pemeriksaan mendalam motherboard, perbaikan IC power, reballing chipset, pergantian layar LCD, keyboard, engsel, dan baterai laptop/PC original.',
        category: 'Computer/Laptop Service',
        priceFrom: 150000,
        estimatedDuration: '1 - 3 Hari Kerja',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        id: 'srv-02',
        name: 'Upgrade RAM & High-Speed SSD',
        description:
          'Upgrade media penyimpanan ke SSD NVMe ultra-speed dan ekspansi RAM dual-channel. Termasuk kloning sistem operasi tanpa kehilangan data.',
        category: 'Upgrade RAM/SSD',
        priceFrom: 200000,
        estimatedDuration: '1 - 2 Jam (Same-Day)',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        id: 'srv-03',
        name: 'Instalasi & Reinstall Sistem Operasi (OS)',
        description:
          'Instalasi bersih Windows 11 Pro / macOS / Linux, aktivasi lisensi resmi, instalasi driver hardware lengkap, software kantor, dan optimasi startup.',
        category: 'Install/Reinstall OS',
        priceFrom: 100000,
        estimatedDuration: '2 - 3 Jam',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        id: 'srv-04',
        name: 'Deep Cleaning & Thermal Repasting Premium',
        description:
          'Pembersihan debu heatsink dan fan cooler secara menyeluruh, aplikasi thermal compound Honeywell PTM7950 untuk mencegah overheating.',
        category: 'Computer/Laptop Service',
        priceFrom: 150000,
        estimatedDuration: '1 - 2 Jam',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        id: 'srv-05',
        name: 'Setup Jaringan Kantor, Mikrotik & Wi-Fi Mesh',
        description:
          'Instalasi kabel LAN Cat6, konfigurasi RouterBoard Mikrotik (VLAN, Bandwidth Management, Failover ISP), VPN Server, dan access point Wi-Fi Mesh.',
        category: 'Network/WiFi',
        priceFrom: 500000,
        estimatedDuration: '1 - 2 Hari',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        id: 'srv-06',
        name: 'Data Recovery & Storage Restoration',
        description:
          'Penyelamatan data terhapus/terformat dari harddisk, SSD, atau flashdisk yang corrupt atau terkena bad sector dengan garansi privasi data.',
        category: 'Data Recovery',
        priceFrom: 350000,
        estimatedDuration: '2 - 5 Hari Kerja',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        id: 'srv-07',
        name: 'IT Support & Maintenance Contract',
        description:
          'Layanan helpdesk IT on-demand & perawatan komprehensif berkala untuk komputer perkantoran, printer, server, dan penanganan problem IT harian.',
        category: 'IT Support',
        priceFrom: 400000,
        estimatedDuration: 'Layanan Bulanan / On-Call',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        id: 'srv-08',
        name: 'Instalasi & Maintenance Kamera CCTV Security',
        description:
          'Pemasangan IP Camera & Analog HD CCTV, setup NVR/DVR storage, konfigurasi online remote monitoring di smartphone Android/iOS, dan perbaikan kabel.',
        category: 'CCTV',
        priceFrom: 450000,
        estimatedDuration: '1 - 2 Hari',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        id: 'srv-09',
        name: 'Konsultasi IT, Arsitektur Sistem & Cloud',
        description:
          'Konsultasi perencanaan infrastruktur IT perusahaan, migrasi server ke Cloud (AWS/GCP), audit keamanan jaringan, dan pemilihan hardware efisien.',
        category: 'IT Consultation',
        priceFrom: 300000,
        estimatedDuration: '1 - 2 Jam / Sesi',
        isActive: true,
      },
    }),
  ]);

  // --------------------------------------------------------------------------
  // 3. SEED SERVICE ORDER 1 (In Repair with Quotation & Payment)
  // --------------------------------------------------------------------------
  console.log('3. Creating Service Orders with Diagnosis, Quotation, Items & Payments...');
  const order1 = await prisma.serviceOrder.create({
    data: {
      id: 'ord-01',
      ticketNumber: 'SRV-2026-001',
      customerId: customerUser.id,
      serviceId: services[0].id, // Hardware Repair
      problemDescription: 'Overheating ekstrem saat dipakai render video 4K dan kipas pendingin berbunyi bising.',
      deviceType: 'Laptop',
      deviceBrand: 'Asus',
      deviceModel: 'ROG Strix G15 (G513)',
      attachment: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80',
      serviceType: 'workshop',
      address: 'Workshop Counter Central',
      preferredSchedule: new Date('2026-08-28T09:30:00Z'),
      status: 'IN_REPAIR',
    },
  });

  // Diagnosis for Order 1
  await prisma.diagnosis.create({
    data: {
      id: 'diag-01',
      serviceOrderId: order1.id,
      diagnosis:
        'Bearing fan pendingin CPU mengalami keausan mekanis (putaran macet) dan thermal paste bawaan pabrik telah mengering total sehingga terjadi thermal throttling.',
      recommendation:
        'Penggantian modul Dual Fan Cooling Original ASUS dan repasting thermal phase-change Honeywell PTM7950.',
      estimatedCost: 650000,
    },
  });

  // Quotation for Order 1
  const quote1 = await prisma.quotation.create({
    data: {
      id: 'quo-01',
      serviceOrderId: order1.id,
      quotationNumber: 'QUO-2026-088',
      subtotal: 650000,
      discount: 0,
      total: 650000,
      notes: 'Garansi suku cadang modul fan original selama 90 hari.',
      status: 'APPROVED',
      approvedAt: new Date('2026-08-28T13:15:00Z'),
    },
  });

  // Quotation Items for Quote 1
  await prisma.quotationItem.createMany({
    data: [
      {
        id: 'qitem-01',
        quotationId: quote1.id,
        description: 'Replacement Dual Cooling Fan Module (Original ASUS ROG)',
        quantity: 1,
        unitPrice: 350000,
        subtotal: 350000,
      },
      {
        id: 'qitem-02',
        quotationId: quote1.id,
        description: 'Honeywell PTM7950 High Thermal Conductivity Phase-Change Pad',
        quantity: 1,
        unitPrice: 150000,
        subtotal: 150000,
      },
      {
        id: 'qitem-03',
        quotationId: quote1.id,
        description: 'Jasa Pemasangan, Kalibrasi RPM & Deep Motherboard Cleaning',
        quantity: 1,
        unitPrice: 150000,
        subtotal: 150000,
      },
    ],
  });

  // Payment for Order 1
  await prisma.payment.create({
    data: {
      id: 'pay-01',
      serviceOrderId: order1.id,
      amount: 650000,
      paymentMethod: 'BCA_VA',
      paymentStatus: 'UNPAID',
      notes: 'Menunggu transfer Virtual Account BCA',
    },
  });

  // --------------------------------------------------------------------------
  // 4. SEED SERVICE ORDER 2 (On-Site Corporate Service)
  // --------------------------------------------------------------------------
  const order2 = await prisma.serviceOrder.create({
    data: {
      id: 'ord-02',
      ticketNumber: 'SRV-2026-002',
      customerId: corporateCustomer.id,
      serviceId: services[4].id, // Network & Mikrotik
      problemDescription: 'Koneksi internet kantor sering putus mendadak dan bandwidth belum terbagi rata antar divisi.',
      deviceType: 'Server/Network',
      deviceBrand: 'Mikrotik',
      deviceModel: 'CCR1009-7G-1C-1S+',
      serviceType: 'onsite',
      address: 'Gedung Cyber 2 Lt. 8, Jl. HR Rasuna Said, Jakarta Selatan',
      preferredSchedule: new Date('2026-08-29T10:00:00Z'),
      status: 'DIAGNOSING',
    },
  });

  await prisma.diagnosis.create({
    data: {
      id: 'diag-02',
      serviceOrderId: order2.id,
      diagnosis:
        'Terdeteksi broadcast storm pada VLAN switch dan konfigurasi queue bandwidth tree mengalami conflict.',
      recommendation:
        'Rekonfigurasi VLAN isolasi per department, setup Simple Queue with PCQ, dan optimasi firewall filter rules.',
      estimatedCost: 850000,
    },
  });

  // --------------------------------------------------------------------------
  // 5. SEED NOTIFICATIONS
  // --------------------------------------------------------------------------
  console.log('4. Creating Notifications...');
  await prisma.notification.createMany({
    data: [
      {
        id: 'notif-01',
        userId: customerUser.id,
        title: 'Penawaran Biaya Servis Tersedia',
        message: 'Quotation #QUO-2026-088 untuk unit Asus ROG Strix G15 telah diterbitkan. Silakan tinjau dan setujui.',
        type: 'QUOTATION_READY',
        isRead: false,
      },
      {
        id: 'notif-02',
        userId: customerUser.id,
        title: 'Status Servis Diperbarui',
        message: 'Perangkat Anda (SRV-2026-001) saat ini berstatus IN_REPAIR (Sedang Dikerjakan Teknisi).',
        type: 'ORDER_STATUS',
        isRead: true,
      },
      {
        id: 'notif-03',
        userId: adminUser.id,
        title: 'Booking On-Site Baru Diterima',
        message: 'PT Maju Solusindo mengajukan request on-site servis jaringan (Tiket: SRV-2026-002).',
        type: 'ORDER_STATUS',
        isRead: false,
      },
    ],
  });

  // --------------------------------------------------------------------------
  // 6. SEED KNOWLEDGE BASE (AI Assistant Reference Data)
  // --------------------------------------------------------------------------
  console.log('5. Creating Knowledge Base entries...');
  await prisma.knowledgeBase.createMany({
    data: [
      {
        id: 'kb-01',
        category: 'TROUBLESHOOTING',
        title: 'Solusi Laptop Blue Screen (BSOD)',
        content: 'Blue screen UNEXPECTED_STORE_EXCEPTION biasanya disebabkan oleh driver yang corrupt atau kegagalan hardware drive/RAM. Langkah penanganan: boot ke Windows Safe Mode, perbarui driver penyimpanan, dan jalankan Windows Memory Diagnostic.',
        isActive: true,
      },
      {
        id: 'kb-02',
        category: 'POLICY',
        title: 'Kebijakan Garansi Servis Hardware & Software',
        content: 'Garansi servis pengerjaan teknisi berlaku 30 hari kalender. Garansi suku cadang (spare part) baru mengikuti ketentuan garansi distributor resmi (1 - 3 tahun). Garansi batal bila segel rusak, terkena cairan, atau lonjakan arus listrik.',
        isActive: true,
      },
      {
        id: 'kb-03',
        category: 'FAQ',
        title: 'Estimasi Waktu Pengerjaan & Biaya',
        content: 'Pemeriksaan awal dan diagnosa teknis membutuhkan waktu 1x24 jam kerja. Estimasi biaya final akan dikonfirmasikan melalui surat penawaran (Quotation) di sistem dan memerlukan persetujuan klien sebelum proses perbaikan dimulai.',
        isActive: true,
      },
      {
        id: 'kb-04',
        category: 'POLICY',
        title: 'Jam Operasional & Alamat Workshop',
        content: 'Workshop AD Computer buka dari hari Senin hingga Sabtu pukul 08.30 - 18.00 WIB di Jalan Kapten Samadikun 10, RT 02/RW 10, No.022, Kota Cirebon, Jawa Barat. Hari Minggu dan hari libur nasional tutup.',
        isActive: true,
      },
    ],
  });

  console.log('✅ Database Seed Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

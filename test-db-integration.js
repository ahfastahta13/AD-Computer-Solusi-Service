const { SignJWT } = require('jose');

const JWT_SECRET = 'it-service-jwt-token-secret-production';
const BASE_URL = 'http://localhost:3000';

async function makeToken(payload) {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(secret);
}

async function runTests() {
  console.log('===============================================================');
  console.log('PENGUJIAN INTEGRASI DATABASE AI ASSISTANT WEBSITE AD COMPUTER');
  console.log('===============================================================\n');

  // Buat token untuk Customer 1 (Budi) dan Admin
  const tokenCustomer1 = await makeToken({
    userId: 'usr-customer-01',
    email: 'budi.customer@example.com',
    name: 'Budi Pratama',
    role: 'CUSTOMER'
  });

  const tokenAdmin = await makeToken({
    userId: 'usr-admin-01',
    email: 'admin@itservice-system.com',
    name: 'Admin IT Sentral',
    role: 'ADMIN'
  });

  async function postChat(endpoint, messages, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Cookie'] = `auth_token=${token}`;
    }
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages })
    });
    const status = res.status;
    const data = await res.json().catch(() => ({}));
    const reply = data.choices?.[0]?.message?.content || data.reply || data.error || JSON.stringify(data);
    const showWA = data.choices?.[0]?.message?.showWhatsApp ?? data.showWhatsApp ?? false;
    return { status, reply, showWA };
  }

  // 1. Customer bertanya tentang katalog layanan
  console.log('TEST 1: Customer bertanya tentang katalog layanan');
  {
    const res = await postChat('/api/chat', [{ role: 'user', content: 'Layanan apa saja yang tersedia di AD Computer?' }], tokenCustomer1);
    console.log(`[Status: ${res.status}] Respon:`);
    console.log(res.reply.substring(0, 220) + '...\n');
  }

  // 2. Customer bertanya tentang harga layanan
  console.log('TEST 2: Customer bertanya tentang harga layanan');
  {
    const res = await postChat('/api/chat', [{ role: 'user', content: 'Berapa harga service laptop dan ganti thermal paste?' }], tokenCustomer1);
    console.log(`[Status: ${res.status}] Respon:`);
    console.log(res.reply.substring(0, 220) + '...\n');
  }

  // 3. Customer bertanya tentang Service Order miliknya
  console.log('TEST 3: Customer bertanya tentang Service Order miliknya');
  {
    const res = await postChat('/api/chat', [{ role: 'user', content: 'Bagaimana status service laptop saya?' }], tokenCustomer1);
    console.log(`[Status: ${res.status}] Respon:`);
    console.log(res.reply.substring(0, 260) + '...\n');
  }

  // 4. Customer mencoba meminta data Service Order milik Customer lain (SECURITY TEST)
  console.log('TEST 4: Customer mencoba meminta data Service Order milik Customer lain (SRV-2026-002)');
  {
    // SRV-2026-002 adalah milik usr-customer-02, sedangkan Budi adalah usr-customer-01
    const res = await postChat('/api/chat', [{ role: 'user', content: 'Tolong cek status tiket SRV-2026-002' }], tokenCustomer1);
    console.log(`[Status: ${res.status}] Respon Keamanan:`);
    console.log(res.reply + '\n');
  }

  // 5. Customer bertanya tentang riwayat pembayarannya
  console.log('TEST 5: Customer bertanya tentang riwayat pembayarannya');
  {
    const res = await postChat('/api/chat', [{ role: 'user', content: 'Apakah pembayaran servis saya sudah tercatat?' }], tokenCustomer1);
    console.log(`[Status: ${res.status}] Respon:`);
    console.log(res.reply.substring(0, 240) + '...\n');
  }

  // 6. Admin meminta ringkasan Service Order sesuai permission
  console.log('TEST 6: Admin meminta ringkasan Service Order');
  {
    const res = await postChat('/api/admin/chatbot', [{ role: 'user', content: 'Tampilkan ringkasan status service order dan keuangan hari ini' }], tokenAdmin);
    console.log(`[Status: ${res.status}] Respon Admin:`);
    console.log(res.reply.substring(0, 280) + '...\n');
  }

  // 7. Chatbot menangani data yang tidak ditemukan
  console.log('TEST 7: Chatbot menangani nomor tiket yang tidak ditemukan');
  {
    const res = await postChat('/api/chat', [{ role: 'user', content: 'Cek tiket SRV-9999-NOTFOUND' }], tokenCustomer1);
    console.log(`[Status: ${res.status}] Respon:`);
    console.log(res.reply + '\n');
  }

  // 8. Akses Admin oleh non-admin ditolak (Security Authorization)
  console.log('TEST 8: Akses endpoint Admin oleh Customer biasa');
  {
    const res = await postChat('/api/admin/chatbot', [{ role: 'user', content: 'Ringkasan semua order' }], tokenCustomer1);
    console.log(`[Status: ${res.status}] Respon:`);
    console.log(res.reply + '\n');
  }

  // 9. Chatbot tetap dapat menjawab FAQ & Knowledge Base
  console.log('TEST 9: Chatbot menjawab FAQ & Kebijakan Garansi');
  {
    const res = await postChat('/api/chat', [{ role: 'user', content: 'Berapa lama masa garansi servis dan bagaimana kebijakannya?' }], null);
    console.log(`[Status: ${res.status}] Respon:`);
    console.log(res.reply.substring(0, 240) + '...\n');
  }

  // 10. Chatbot tetap dapat mendeteksi kebutuhan menghubungi Admin via WhatsApp
  console.log('TEST 10: Intent CONTACT_ADMIN dengan tombol WhatsApp');
  {
    const res = await postChat('/api/chat', [{ role: 'user', content: 'Saya mau chat WhatsApp admin sekarang' }], tokenCustomer1);
    console.log(`[Status: ${res.status}] showWhatsApp Flag: ${res.showWA}`);
    console.log(`Respon: ${res.reply}\n`);
  }

  console.log('===============================================================');
  console.log('SEMUA 10 SKENARIO PENGUJIAN SELESAI');
  console.log('===============================================================');
}

runTests().catch(console.error);

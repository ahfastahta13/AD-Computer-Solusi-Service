export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'AD Computer',
  tagline:
    process.env.NEXT_PUBLIC_APP_TAGLINE ||
    'Solusi IT Profesional, Service Komputer & Konsultasi Teknologi Terpercaya',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  company: {
    phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '+62 856-2429-9894',
    email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'support@itservice-system.com',
    address:
      process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
      'Jalan Kapten Samadikun 10. RT 02/RW 10, No.022, Kota Cirebon, Jawa Barat',
    hours: 'Senin - Sabtu: 08:30 - 18:00 WIB',
    // WhatsApp: format internasional tanpa +/spasi/-
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '6285624299894',
  },
  roles: {
    CUSTOMER: 'CUSTOMER',
    ADMIN: 'ADMIN',
    TECHNICIAN: 'TECHNICIAN',
  } as const,
};

const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf-8');
let token = '';
let senderNumber = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('WHATSAPP_API_TOKEN=')) {
    token = line.split('=')[1].trim().replace(/['"]/g, '');
  }
  if (line.startsWith('WHATSAPP_NUMBER=')) {
    senderNumber = line.split('=')[1].trim().replace(/['"]/g, '');
  }
}

async function testFonnte() {
  console.log('Testing Fonnte API...');
  console.log('Sender Number in .env:', senderNumber);
  console.log('Token exists:', Boolean(token));

  // Test get-devices
  try {
    const res1 = await fetch('https://api.fonnte.com/get-devices', {
      method: 'POST',
      headers: { Authorization: token },
    });
    console.log('get-devices HTTP:', res1.status);
    const d1 = await res1.json().catch(() => ({}));
    console.log('get-devices data:', JSON.stringify(d1));
  } catch (err) {
    console.error('get-devices error:', err.message);
  }

  // Test device endpoint
  try {
    const res2 = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: { Authorization: token },
    });
    console.log('device HTTP:', res2.status);
    const d2 = await res2.json().catch(() => ({}));
    console.log('device data:', JSON.stringify(d2));
  } catch (err) {
    console.error('device error:', err.message);
  }
}

testFonnte();


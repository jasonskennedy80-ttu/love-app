import twilio from 'twilio';

let client;

function getClient() {
  if (!client) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env');
    }
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

// Carrier quiet hours: no sends between 9pm–8am in recipient's local time.
// For now we enforce UTC-based quiet hours; Phase 4 adds timezone awareness.
function isQuietHours() {
  const hour = new Date().getUTCHours();
  return hour >= 1 || hour < 12; // 9pm–8am EST ≈ 1am–12pm UTC
}

/**
 * Send an SMS message.
 * @param {string} to    - E.164 phone number e.g. +15551234567
 * @param {string} body  - Message text
 * @returns {Promise<string>} Twilio message SID
 */
export async function sendSMS(to, body) {
  if (isQuietHours()) {
    throw Object.assign(
      new Error('Message blocked: quiet hours (9pm–8am). Will retry at next window.'),
      { code: 'QUIET_HOURS' }
    );
  }

  const msg = await getClient().messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
    body,
  });

  return msg.sid;
}

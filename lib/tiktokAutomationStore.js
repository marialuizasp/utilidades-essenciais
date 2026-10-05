import { createSign } from 'node:crypto';

const SHEET_ID = '19xpC1aQRDEhqHK6e1fRR3fDteX6OA6U6MfqiTcPQ7Yk';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets/';
const SESSION_RANGE = "'TikTok Config'!B2:C2";

async function googleAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('Google service account not configured.');

  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'RS256', typ: 'JWT' });
  const claim = encode({
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });
  const input = header + '.' + claim;
  const sign = createSign('RSA-SHA256');
  sign.update(input);
  sign.end();
  const assertion = input + '.' + sign.sign(key).toString('base64url');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Google service account authentication failed.');
  return (await response.json()).access_token;
}

async function sheetsRequest(path, options = {}) {
  const token = await googleAccessToken();
  const response = await fetch(SHEETS + SHEET_ID + path, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    console.error('TikTok automation store:', response.status, await response.text());
    throw new Error('TikTok automation store unavailable.');
  }
  return response.json();
}

export async function saveTikTokAutomationSession(encryptedSession) {
  if (!encryptedSession || encryptedSession.length > 10000) {
    throw new Error('Invalid TikTok automation session.');
  }
  const updatedAt = new Date().toISOString();
  await sheetsRequest(
    '/values/' + encodeURIComponent(SESSION_RANGE) + '?valueInputOption=RAW',
    {
      method: 'PUT',
      body: JSON.stringify({ values: [[encryptedSession, updatedAt]] }),
    }
  );
  return updatedAt;
}

export async function loadTikTokAutomationSession() {
  const data = await sheetsRequest(
    '/values/' + encodeURIComponent(SESSION_RANGE) + '?valueRenderOption=UNFORMATTED_VALUE'
  );
  const row = data.values?.[0] || [];
  return {
    encryptedSession: String(row[0] || ''),
    updatedAt: String(row[1] || ''),
  };
}

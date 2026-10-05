import { createSign } from 'node:crypto';

const SHEET_ID = '19xpC1aQRDEhqHK6e1fRR3fDteX6OA6U6MfqiTcPQ7Yk';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets/';
const RANGE = "'TikTok Creators'!A2:H1000";

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
    console.error('TikTok creator store:', response.status, await response.text());
    throw new Error('TikTok creator store unavailable.');
  }
  return response.json();
}

export async function saveTikTokCreator({
  openId,
  username = '',
  nickname = '',
  encryptedSession,
}) {
  if (!openId || !encryptedSession || encryptedSession.length > 10000) {
    throw new Error('Invalid TikTok creator session.');
  }

  const data = await sheetsRequest(
    '/values/' + encodeURIComponent(RANGE) + '?valueRenderOption=UNFORMATTED_VALUE'
  );
  const rows = data.values || [];
  const index = rows.findIndex(row => String(row[0] || '') === openId);
  const now = new Date().toISOString();

  if (index >= 0) {
    const rowNumber = index + 2;
    const connectedAt = String(rows[index][5] || now);
    await sheetsRequest(
      '/values/' + encodeURIComponent("'TikTok Creators'!A" + rowNumber + ':H' + rowNumber) + '?valueInputOption=RAW',
      {
        method: 'PUT',
        body: JSON.stringify({
          values: [[
            openId,
            username,
            nickname,
            encryptedSession,
            'ATIVO',
            connectedAt,
            now,
            now,
          ]],
        }),
      }
    );
  } else {
    await sheetsRequest(
      '/values/' + encodeURIComponent("'TikTok Creators'!A:H") + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',
      {
        method: 'POST',
        body: JSON.stringify({
          values: [[
            openId,
            username,
            nickname,
            encryptedSession,
            'ATIVO',
            now,
            now,
            now,
          ]],
        }),
      }
    );
  }

  return { openId, username, nickname, updatedAt: now };
}

export async function loadTikTokCreator(openId) {
  if (!openId) return null;
  const data = await sheetsRequest(
    '/values/' + encodeURIComponent(RANGE) + '?valueRenderOption=UNFORMATTED_VALUE'
  );
  const rows = data.values || [];
  const index = rows.findIndex(row => String(row[0] || '') === openId);
  if (index < 0) return null;

  const row = rows[index];
  return {
    openId: String(row[0] || ''),
    username: String(row[1] || ''),
    nickname: String(row[2] || ''),
    encryptedSession: String(row[3] || ''),
    status: String(row[4] || ''),
    connectedAt: String(row[5] || ''),
    updatedAt: String(row[6] || ''),
    lastSeenAt: String(row[7] || ''),
    rowNumber: index + 2,
  };
}

export async function touchTikTokCreator(openId) {
  const creator = await loadTikTokCreator(openId);
  if (!creator) return false;
  const now = new Date().toISOString();
  await sheetsRequest(
    '/values/' + encodeURIComponent("'TikTok Creators'!H" + creator.rowNumber) + '?valueInputOption=RAW',
    { method: 'PUT', body: JSON.stringify({ values: [[now]] }) }
  );
  return true;
}

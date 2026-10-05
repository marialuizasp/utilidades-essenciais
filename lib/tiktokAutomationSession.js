import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import { loadTikTokAutomationSession, saveTikTokAutomationSession } from './tiktokAutomationStore';

export function automationSecretIsValid(request) {
  const expected = process.env.TIKTOK_AUTOMATION_SECRET || '';
  const provided = request.headers.get('x-tiktok-automation-secret') || '';
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sessionKey() {
  const key = process.env.TIKTOK_SESSION_SECRET || '';
  if (!/^([a-f0-9]{64})$/i.test(key)) throw new Error('session_key');
  return Buffer.from(key, 'hex');
}

function unseal(value) {
  const b = Buffer.from(value, 'base64url');
  if (b.length < 29) throw new Error('session_invalid');
  const d = createDecipheriv('aes-256-gcm', sessionKey(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString());
}

function seal(data) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', sessionKey(), iv);
  const encrypted = Buffer.concat([c.update(JSON.stringify(data), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), encrypted]).toString('base64url');
}

export async function getTikTokAutomationSession() {
  const stored = await loadTikTokAutomationSession();
  if (!stored.encryptedSession) throw new Error('not_connected');

  let session = unseal(stored.encryptedSession);

  if (Date.now() > Number(session.expires_at || 0) - 5 * 60 * 1000) {
    const key = process.env.TIKTOK_CLIENT_KEY;
    const secret = process.env.TIKTOK_CLIENT_SECRET;
    if (!key || !secret || !session.refresh_token) throw new Error('refresh_config');

    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: key,
        client_secret: secret,
        grant_type: 'refresh_token',
        refresh_token: session.refresh_token,
      }),
      cache: 'no-store',
    });

    const data = await response.json();
    if (!response.ok || !data.access_token || !data.refresh_token) {
      console.error('TikTok automation refresh failed:', {
        httpStatus: response.status,
        errorCode: String(data.error || data.error_code || data.code || 'unknown').slice(0, 80),
      });
      throw new Error('refresh_failed');
    }

    session = {
      ...session,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      open_id: data.open_id || session.open_id,
      expires_at: Date.now() + Number(data.expires_in || 0) * 1000,
      refresh_expires_at: data.refresh_expires_in
        ? Date.now() + Number(data.refresh_expires_in) * 1000
        : session.refresh_expires_at,
    };

    await saveTikTokAutomationSession(seal(session));
  }

  return session;
}

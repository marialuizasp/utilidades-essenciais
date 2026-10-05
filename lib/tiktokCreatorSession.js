import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { tikTokCreatorFromRequest } from './tiktokCreatorAuth';
import { loadTikTokCreator, saveTikTokCreator } from './tiktokCreatorStore';

function sessionKey() {
  const key = process.env.TIKTOK_SESSION_SECRET || '';
  if (!/^([a-f0-9]{64})$/i.test(key)) throw new Error('session_key');
  return Buffer.from(key, 'hex');
}

function unseal(value) {
  const b = Buffer.from(value, 'base64url');
  if (b.length < 29) throw new Error('session_invalid');
  const decipher = createDecipheriv('aes-256-gcm', sessionKey(), b.subarray(0, 12));
  decipher.setAuthTag(b.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([
      decipher.update(b.subarray(28)),
      decipher.final(),
    ]).toString('utf8')
  );
}

function seal(data) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sessionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([
    iv,
    cipher.getAuthTag(),
    encrypted,
  ]).toString('base64url');
}

async function refreshIfNeeded(creator, session) {
  if (Date.now() <= Number(session.expires_at || 0) - 5 * 60 * 1000) {
    return session;
  }

  const key = process.env.TIKTOK_CLIENT_KEY;
  const secret = process.env.TIKTOK_CLIENT_SECRET;

  if (!key || !secret || !session.refresh_token) {
    throw new Error('refresh_config');
  }

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
    console.error('TikTok creator refresh failed:', {
      httpStatus: response.status,
      errorCode: String(data.error || data.error_code || data.code || 'unknown').slice(0, 80),
    });
    throw new Error('refresh_failed');
  }

  const next = {
    ...session,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    open_id: data.open_id || session.open_id,
    expires_at: Date.now() + Number(data.expires_in || 0) * 1000,
    refresh_expires_at: data.refresh_expires_in
      ? Date.now() + Number(data.refresh_expires_in) * 1000
      : session.refresh_expires_at,
  };

  await saveTikTokCreator({
    openId: creator.openId,
    username: creator.username,
    nickname: creator.nickname,
    encryptedSession: seal(next),
  });

  return next;
}

export async function getTikTokCreatorApiSession(request) {
  const browserSession = tikTokCreatorFromRequest(request);
  if (!browserSession?.open_id) throw new Error('creator_not_connected');

  const creator = await loadTikTokCreator(browserSession.open_id);
  if (!creator || creator.status !== 'ATIVO' || !creator.encryptedSession) {
    throw new Error('creator_not_connected');
  }

  const session = unseal(creator.encryptedSession);
  if (session.open_id !== creator.openId) throw new Error('session_invalid');

  const fresh = await refreshIfNeeded(creator, session);

  return {
    creator,
    session: fresh,
  };
}

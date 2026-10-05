import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = '__Host-ue_tiktok_creator';
const TTL_SECONDS = 60 * 60 * 24 * 30;

function secret() {
  return process.env.TIKTOK_SESSION_SECRET || '';
}

function sign(value) {
  const key = secret();
  if (!key) return '';
  return createHmac('sha256', key).update(value).digest('base64url');
}

export function createTikTokCreatorToken(openId) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    open_id: openId,
    iat: now,
    exp: now + TTL_SECONDS,
  })).toString('base64url');
  return payload + '.' + sign(payload);
}

export function verifyTikTokCreatorToken(token) {
  const [payload, signature, extra] = String(token || '').split('.');
  if (!payload || !signature || extra || !secret()) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (!data.open_id || !Number.isFinite(data.exp) || data.exp <= now) return null;
    return data;
  } catch {
    return null;
  }
}

function cookieValue(request, name) {
  return (request.headers.get('cookie') || '')
    .split(';')
    .map(v => v.trim())
    .find(v => v.startsWith(name + '='))
    ?.slice(name.length + 1) || '';
}

export function tikTokCreatorFromRequest(request) {
  const raw = cookieValue(request, COOKIE);
  let token = raw;
  try { token = decodeURIComponent(raw); } catch {}
  return verifyTikTokCreatorToken(token);
}

export function tikTokCreatorCookie(token) {
  return [
    COOKIE + '=' + encodeURIComponent(token),
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=' + TTL_SECONDS,
  ].join('; ');
}

export function clearTikTokCreatorCookie() {
  return [
    COOKIE + '=',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=0',
  ].join('; ');
}

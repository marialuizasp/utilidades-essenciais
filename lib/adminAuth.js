import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_COOKIE = 'ue_admin_session';
const SESSION_TTL_SECONDS = 60 * 60;
const AUTH_WINDOW_MS = 10 * 60 * 1000;
const AUTH_MAX_FAILURES = 8;
const authFailures = globalThis.__ueAdminAuthFailures || (globalThis.__ueAdminAuthFailures = new Map());

const clean = value => String(value ?? '').trim();

export function passwordMatches(value) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || !value) return false;
  const a = Buffer.from(String(value)), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function clientKey(request) {
  return clean(
    request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]
    || 'unknown'
  ).slice(0, 128);
}

export function authGate(key) {
  const now = Date.now();
  const state = authFailures.get(key);
  if (!state) return { blocked: false };
  if (state.blockedUntil > now) {
    return { blocked: true, retryAfter: Math.max(1, Math.ceil((state.blockedUntil - now) / 1000)) };
  }
  if (now - state.firstAt > AUTH_WINDOW_MS) {
    authFailures.delete(key);
    return { blocked: false };
  }
  return { blocked: false };
}

export function recordAuthFailure(key) {
  const now = Date.now();
  if (authFailures.size > 1000) {
    for (const [entryKey, state] of authFailures) {
      if (now - state.firstAt > AUTH_WINDOW_MS && state.blockedUntil <= now) authFailures.delete(entryKey);
    }
  }
  const current = authFailures.get(key);
  const state = !current || now - current.firstAt > AUTH_WINDOW_MS
    ? { count: 1, firstAt: now, blockedUntil: 0 }
    : { ...current, count: current.count + 1 };
  if (state.count >= AUTH_MAX_FAILURES) state.blockedUntil = now + AUTH_WINDOW_MS;
  authFailures.set(key, state);
  return authGate(key);
}

export function clearAuthFailures(key) {
  authFailures.delete(key);
}

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || '';
}

function sign(value) {
  const secret = sessionSecret();
  if (!secret) return '';
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createAdminSessionToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + SESSION_TTL_SECONDS })).toString('base64url');
  const signature = sign(payload);
  if (!signature) throw new Error('ADMIN_SESSION_SECRET não configurado.');
  return payload + '.' + signature;
}

export function verifyAdminSessionToken(token) {
  if (!token || !sessionSecret()) return false;
  const [payload, signature, extra] = String(token).split('.');
  if (!payload || !signature || extra) return false;
  const expected = sign(payload);
  const a = Buffer.from(signature), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    return Number.isFinite(data.exp) && data.exp > now && Number.isFinite(data.iat) && data.iat <= now + 60;
  } catch {
    return false;
  }
}

export function sessionFromRequest(request) {
  const cookie = request.headers.get('cookie') || '';
  const pair = cookie.split(';').map(x => x.trim()).find(x => x.startsWith(SESSION_COOKIE + '='));
  if (!pair) return '';
  return decodeURIComponent(pair.slice(SESSION_COOKIE.length + 1));
}

export function adminSessionIsValid(request) {
  return verifyAdminSessionToken(sessionFromRequest(request));
}

export function adminSessionCookie(token) {
  return [
    SESSION_COOKIE + '=' + encodeURIComponent(token),
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/api',
    'Max-Age=' + SESSION_TTL_SECONDS,
  ].join('; ');
}

export function clearAdminSessionCookie() {
  return [
    SESSION_COOKIE + '=',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/api',
    'Max-Age=0',
  ].join('; ');
}

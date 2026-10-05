import { createSign } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REPORT_BYTES = 32_000;
const SHEET_ID = '19xpC1aQRDEhqHK6e1fRR3fDteX6OA6U6MfqiTcPQ7Yk';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets/';
const WRITE_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;
const DEDUPE_MS = 60 * 60 * 1000;

const requestWindows =
  globalThis.__ueCspRequestWindows || (globalThis.__ueCspRequestWindows = new Map());
const recentSignatures =
  globalThis.__ueCspRecentSignatures || (globalThis.__ueCspRecentSignatures = new Map());

function safeText(value, max = 160) {
  return String(value ?? '')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .slice(0, max);
}

function safeOrigin(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value));
    return url.protocol + '//' + url.host;
  } catch {
    return safeText(value, 120);
  }
}

function normalizeReports(payload) {
  if (Array.isArray(payload)) {
    return payload.slice(0, 10).map(item => item?.body || item || {});
  }
  if (payload && typeof payload === 'object') {
    return [payload['csp-report'] || payload.body || payload];
  }
  return [];
}

function clientKey(request) {
  return safeText(
    request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]
    || 'unknown',
    128,
  );
}

function rateAllowed(key) {
  const now = Date.now();
  const state = requestWindows.get(key);

  if (!state || now - state.startedAt > WRITE_WINDOW_MS) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }

  if (state.count >= MAX_REQUESTS_PER_WINDOW) return false;
  state.count += 1;
  return true;
}

function documentLooksLikeThisSite(origin) {
  if (!origin) return false;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'https:') return false;
    return (
      hostname === 'utilidades-essenciais-kappa.vercel.app'
      || hostname === 'utilidades-essenciais-ue15.vercel.app'
      || (
        hostname.endsWith('.vercel.app')
        && hostname.startsWith('utilidades-essenciais-')
      )
    );
  } catch {
    return false;
  }
}

function isKnownOrigin(origin) {
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return [
      'utilidades-essenciais-kappa.vercel.app',
      'utilidades-essenciais-ue15.vercel.app',
      'pub-603881db00f042c08f8b4dc6d9731239.r2.dev',
      'bjdcjttjwsmbbytqwvzm.supabase.co',
      'res.cloudinary.com',
    ].includes(host)
      || (host.endsWith('.vercel.app') && host.startsWith('utilidades-essenciais-'));
  } catch {
    return false;
  }
}

function formatBrasiliaDateTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`;
}

async function accessToken() {
  const cached = globalThis.__ueGoogleTokenCache;
  if (cached?.token && cached.expiresAt > Date.now() + 60_000) return cached.token;

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
  const signingInput = header + '.' + claim;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const assertion = signingInput + '.' + signer.sign(key).toString('base64url');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Google token request failed.');
  const data = await response.json();
  globalThis.__ueGoogleTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3000) * 1000,
  };
  return data.access_token;
}

async function appendIncidents(rows) {
  if (!rows.length) return;

  const token = await accessToken();
  const range = encodeURIComponent('Incidentes!A:K');
  const response = await fetch(
    SHEETS + SHEET_ID + '/values/' + range
      + ':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ majorDimension: 'ROWS', values: rows }),
      cache: 'no-store',
    },
  );

  if (!response.ok) throw new Error('Google Sheets append failed.');
}

export async function POST(request) {
  try {
    const fetchSite = (request.headers.get('sec-fetch-site') || '').toLowerCase();
    if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) {
      return new Response(null, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }

    if (!rateAllowed(clientKey(request))) {
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }

    const contentType = (request.headers.get('content-type') || '').toLowerCase();
    if (
      !contentType.includes('application/csp-report')
      && !contentType.includes('application/reports+json')
      && !contentType.includes('application/json')
    ) {
      return new Response(null, { status: 415, headers: { 'Cache-Control': 'no-store' } });
    }

    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_REPORT_BYTES) {
      return new Response(null, { status: 413, headers: { 'Cache-Control': 'no-store' } });
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return new Response(null, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    const now = Date.now();
    const rows = [];

    for (const report of normalizeReports(payload)) {
      const effectiveDirective = safeText(
        report['effective-directive'] || report.effectiveDirective,
      );
      const violatedDirective = safeText(
        report['violated-directive'] || report.violatedDirective,
      );
      const blockedOrigin = safeOrigin(
        report['blocked-uri'] || report.blockedURL || report.blockedUri,
      );
      const sourceOrigin = safeOrigin(
        report['source-file'] || report.sourceFile,
      );
      const documentOrigin = safeOrigin(
        report['document-uri'] || report.documentURL || report.documentUri,
      );
      const statusCode = Number(report['status-code'] || report.statusCode) || 0;
      const disposition = safeText(report.disposition);

      if (!documentLooksLikeThisSite(documentOrigin)) continue;

      const signature = [
        effectiveDirective,
        violatedDirective,
        blockedOrigin,
        sourceOrigin,
        documentOrigin,
      ].join('|');

      const previousAt = recentSignatures.get(signature) || 0;
      if (now - previousAt < DEDUPE_MS) continue;
      recentSignatures.set(signature, now);

      const severity = isKnownOrigin(blockedOrigin) ? 'INFO' : 'AVISO';
      const directive = effectiveDirective || violatedDirective || 'unknown';
      const details = [
        'blocked=' + (blockedOrigin || '(inline/self)'),
        'source=' + (sourceOrigin || '(none)'),
        'document=' + documentOrigin,
        'status=' + statusCode,
        'disposition=' + (disposition || 'report'),
      ].join(' | ');

      console.warn('CSP report-only violation', {
        directive,
        blockedOrigin,
        sourceOrigin,
        documentOrigin,
        statusCode,
        disposition,
      });

      rows.push([
        formatBrasiliaDateTime(),
        'CSP_REPORT_ONLY',
        severity,
        'SITE/CSP',
        '',
        '',
        'REPORT-ONLY',
        'SEM BLOQUEIO',
        1,
        directive,
        details.slice(0, 500),
      ]);
    }

    try {
      await appendIncidents(rows);
    } catch (error) {
      console.error('CSP incident persistence:', safeText(error?.message, 120));
    }

    return new Response(null, {
      status: 204,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('CSP report endpoint:', safeText(error?.message, 120));
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  }
}

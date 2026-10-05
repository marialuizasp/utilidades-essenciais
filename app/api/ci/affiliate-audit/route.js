import {
  createHash,
  createPublicKey,
  createSign,
  verify as verifySignature,
} from 'node:crypto';
import { auditAffiliateCsv } from '../../../../lib/affiliateAudit.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPECTED_ISSUER = 'https://token.actions.githubusercontent.com';
const EXPECTED_AUDIENCE = 'utilidades-essenciais-ci';
const EXPECTED_REPOSITORY = 'marialuizasp/utilidades-essenciais';
const EXPECTED_WORKFLOW_PATH =
  'marialuizasp/utilidades-essenciais/.github/workflows/affiliate-audit.yml';
const ALLOWED_EVENTS = new Set(['schedule', 'deployment_status']);
const JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks';
const SHEET_ID = '19xpC1aQRDEhqHK6e1fRR3fDteX6OA6U6MfqiTcPQ7Yk';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets/';
const MAX_CSV_BYTES = 2_000_000;

function safeText(value, max = 160) {
  return String(value ?? '')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .slice(0, max);
}

function parseJwtPart(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

async function githubJwks() {
  const cached = globalThis.__ueGithubOidcJwks;
  if (cached?.keys?.length && cached.expiresAt > Date.now()) return cached.keys;

  const response = await fetch(JWKS_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error('github_jwks_failed');
  const data = await response.json();
  if (!Array.isArray(data.keys) || !data.keys.length) throw new Error('github_jwks_invalid');

  globalThis.__ueGithubOidcJwks = {
    keys: data.keys,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
  return data.keys;
}

async function verifyGithubOidc(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('invalid_token');

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = parseJwtPart(encodedHeader);
  const payload = parseJwtPart(encodedPayload);

  if (header.alg !== 'RS256' || !header.kid) throw new Error('invalid_alg');

  const keys = await githubJwks();
  const jwk = keys.find(key => key.kid === header.kid);
  if (!jwk) throw new Error('unknown_kid');

  const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
  const valid = verifySignature(
    'RSA-SHA256',
    Buffer.from(encodedHeader + '.' + encodedPayload),
    publicKey,
    Buffer.from(encodedSignature, 'base64url'),
  );
  if (!valid) throw new Error('invalid_signature');

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

  if (payload.iss !== EXPECTED_ISSUER) throw new Error('invalid_issuer');
  if (!audiences.includes(EXPECTED_AUDIENCE)) throw new Error('invalid_audience');
  if (!Number(payload.exp) || Number(payload.exp) < now - 30) throw new Error('expired');
  if (payload.nbf && Number(payload.nbf) > now + 30) throw new Error('not_yet_valid');
  if (payload.repository !== EXPECTED_REPOSITORY) throw new Error('invalid_repository');

  const workflowPath = String(payload.workflow_ref || '').split('@')[0];
  if (workflowPath !== EXPECTED_WORKFLOW_PATH) throw new Error('invalid_workflow');
  if (!ALLOWED_EVENTS.has(payload.event_name)) throw new Error('invalid_event');

  return payload;
}

function brasiliaParts(date = new Date()) {
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
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}

function formatBrasiliaDateTime(date = new Date()) {
  const p = brasiliaParts(date);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`;
}

function brasiliaDayKey(date = new Date()) {
  const p = brasiliaParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

async function accessToken() {
  const cached = globalThis.__ueGoogleTokenCache;
  if (cached?.token && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('google_not_configured');

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

  if (!response.ok) throw new Error('google_token_failed');
  const data = await response.json();
  globalThis.__ueGoogleTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3000) * 1000,
  };
  return data.access_token;
}

async function incidentAlreadyRecorded(token, dedupeKey) {
  const range = encodeURIComponent('Incidentes!A:K');
  const response = await fetch(
    SHEETS + SHEET_ID + '/values/' + range + '?majorDimension=ROWS',
    {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
    },
  );

  if (!response.ok) return false;
  const data = await response.json();
  const values = Array.isArray(data.values) ? data.values : [];

  for (let index = values.length - 1; index >= 1; index--) {
    const row = values[index] || [];
    if (row[1] === 'AFFILIATE_LINK_AUDIT_FAILED' && String(row[10] || '').includes(dedupeKey)) {
      return true;
    }
  }
  return false;
}

async function appendIncident(token, row) {
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
      body: JSON.stringify({ majorDimension: 'ROWS', values: [row] }),
      cache: 'no-store',
    },
  );

  if (!response.ok) throw new Error('google_append_failed');
}

async function runAudit() {
  const csvUrl = process.env.GOOGLE_SHEET_CSV_URL;
  if (!csvUrl) {
    return {
      ok: false,
      activeCount: 0,
      validCount: 0,
      issueCount: 1,
      issues: [{ row: 0, id: '', code: 'csv_source_not_configured', detail: '' }],
    };
  }

  const response = await fetch(csvUrl, { cache: 'no-store' });
  if (!response.ok) {
    return {
      ok: false,
      activeCount: 0,
      validCount: 0,
      issueCount: 1,
      issues: [{
        row: 0,
        id: '',
        code: 'csv_source_http_error',
        detail: String(response.status),
      }],
    };
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_CSV_BYTES) throw new Error('csv_too_large');

  const csv = await response.text();
  if (Buffer.byteLength(csv, 'utf8') > MAX_CSV_BYTES) throw new Error('csv_too_large');
  return auditAffiliateCsv(csv);
}

function incidentSignature(result) {
  const compact = result.issues.map(issue => [
    issue.row,
    issue.id,
    issue.code,
    issue.detail,
  ]);
  return createHash('sha256')
    .update(JSON.stringify(compact))
    .digest('hex')
    .slice(0, 16);
}

export async function POST(request) {
  const noStore = { 'Cache-Control': 'no-store' };

  try {
    const auth = request.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ')) {
      return Response.json({ ok: false, error: 'unauthorized' }, { status: 401, headers: noStore });
    }

    await verifyGithubOidc(auth.slice(7));
    const result = await runAudit();

    if (result.ok) {
      return Response.json({
        ok: true,
        activeCount: result.activeCount,
        validCount: result.validCount,
        issueCount: 0,
      }, { headers: noStore });
    }

    const token = await accessToken();
    const signature = incidentSignature(result);
    const dedupeKey = 'audit_key=' + brasiliaDayKey() + ':' + signature;
    const recorded = await incidentAlreadyRecorded(token, dedupeKey);

    if (!recorded) {
      const preview = result.issues.slice(0, 8).map(issue =>
        [
          'row=' + issue.row,
          'id=' + safeText(issue.id || '-', 50),
          'code=' + safeText(issue.code, 60),
          'detail=' + safeText(issue.detail || '-', 80),
        ].join(',')
      ).join(' ; ');

      const details = [
        dedupeKey,
        'active=' + result.activeCount,
        'valid=' + result.validCount,
        'issues=' + result.issueCount,
        'sample=' + preview,
      ].join(' | ');

      await appendIncident(token, [
        formatBrasiliaDateTime(),
        'AFFILIATE_LINK_AUDIT_FAILED',
        'AVISO',
        'SITE/AFFILIATES',
        '',
        '',
        'FALHA',
        'SEM BLOQUEIO AUTOMATICO',
        result.issueCount,
        'affiliate-audit',
        details.slice(0, 500),
      ]);
    }

    return Response.json({
      ok: false,
      activeCount: result.activeCount,
      validCount: result.validCount,
      issueCount: result.issueCount,
      issues: result.issues.slice(0, 20),
      incidentRecorded: !recorded,
    }, { status: 409, headers: noStore });
  } catch (error) {
    const code = safeText(error?.message, 80);
    console.error('Affiliate audit endpoint:', code);

    const authErrors = new Set([
      'invalid_token',
      'invalid_alg',
      'github_jwks_failed',
      'github_jwks_invalid',
      'unknown_kid',
      'invalid_signature',
      'invalid_issuer',
      'invalid_audience',
      'expired',
      'not_yet_valid',
      'invalid_repository',
      'invalid_workflow',
      'invalid_event',
    ]);

    return Response.json(
      { ok: false, error: authErrors.has(code) ? code : 'affiliate_audit_unavailable' },
      { status: authErrors.has(code) ? 401 : 500, headers: noStore },
    );
  }
}

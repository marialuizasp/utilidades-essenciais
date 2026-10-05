import { createPublicKey, createSign, verify as verifySignature } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPECTED_ISSUER = 'https://token.actions.githubusercontent.com';
const EXPECTED_AUDIENCE = 'utilidades-essenciais-ci';
const EXPECTED_REPOSITORY = 'marialuizasp/utilidades-essenciais';
const EXPECTED_WORKFLOW_REF =
  'marialuizasp/utilidades-essenciais/.github/workflows/production-smoke.yml@refs/heads/main';
const JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks';
const SHEET_ID = '19xpC1aQRDEhqHK6e1fRR3fDteX6OA6U6MfqiTcPQ7Yk';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets/';
const MAX_BODY_BYTES = 8_000;

function safeText(value, max = 180) {
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
  if (payload.workflow_ref !== EXPECTED_WORKFLOW_REF) throw new Error('invalid_workflow');
  if (payload.event_name !== 'deployment_status') throw new Error('invalid_event');

  return payload;
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

async function appendIncident(row) {
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
      body: JSON.stringify({ majorDimension: 'ROWS', values: [row] }),
      cache: 'no-store',
    },
  );
  if (!response.ok) throw new Error('google_append_failed');
}

export async function POST(request) {
  const noStore = { 'Cache-Control': 'no-store' };

  try {
    const auth = request.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ')) {
      return Response.json({ ok: false, error: 'unauthorized' }, { status: 401, headers: noStore });
    }

    const claims = await verifyGithubOidc(auth.slice(7));

    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      return Response.json({ ok: false, error: 'payload_too_large' }, { status: 413, headers: noStore });
    }

    let payload;
    try {
      payload = JSON.parse(raw || '{}');
    } catch {
      return Response.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: noStore });
    }

    const mode = safeText(payload.mode, 20);
    const sha = safeText(payload.sha, 64);
    if (!/^[a-f0-9]{40}$/i.test(sha) || sha !== claims.sha) {
      return Response.json({ ok: false, error: 'sha_mismatch' }, { status: 403, headers: noStore });
    }

    if (mode === 'probe') {
      return Response.json({ ok: true, authenticated: true }, { headers: noStore });
    }

    if (mode !== 'incident') {
      return Response.json({ ok: false, error: 'invalid_mode' }, { status: 400, headers: noStore });
    }

    const runId = safeText(payload.run_id, 40);
    const runAttempt = safeText(payload.run_attempt, 10);
    const failedStep = safeText(payload.failed_step || 'production smoke', 100);
    const details = [
      'sha=' + sha.slice(0, 12),
      'run_id=' + runId,
      'attempt=' + runAttempt,
      'step=' + failedStep,
      'workflow=' + safeText(claims.workflow_ref, 180),
    ].join(' | ');

    await appendIncident([
      formatBrasiliaDateTime(),
      'PRODUCTION_SMOKE_FAILED',
      'ALTO',
      'GITHUB/PRODUCTION',
      '',
      '',
      'FALHA',
      'SEM BLOQUEIO AUTOMATICO',
      1,
      'production-smoke',
      details.slice(0, 500),
    ]);

    return Response.json({ ok: true, recorded: true }, { headers: noStore });
  } catch (error) {
    console.error('CI incident endpoint:', safeText(error?.message, 120));
    return Response.json({ ok: false, error: 'unauthorized_or_unavailable' }, { status: 401, headers: noStore });
  }
}

import {
  createHash,
  createPublicKey,
  createSign,
  verify as verifySignature,
} from 'node:crypto';
import { prepareMediaAudit } from '../../../../lib/mediaAudit.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const EXPECTED_ISSUER = 'https://token.actions.githubusercontent.com';
const EXPECTED_AUDIENCE = 'utilidades-essenciais-ci';
const EXPECTED_REPOSITORY = 'marialuizasp/utilidades-essenciais';
const EXPECTED_WORKFLOW_PATH =
  'marialuizasp/utilidades-essenciais/.github/workflows/media-audit.yml';
const ALLOWED_EVENTS = new Set(['schedule', 'deployment_status']);
const JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks';
const SHEET_ID = '19xpC1aQRDEhqHK6e1fRR3fDteX6OA6U6MfqiTcPQ7Yk';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets/';
const SHARD_COUNT = 4;
const CONCURRENCY = 20;
const REQUEST_TIMEOUT_MS = 7000;

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
  if (!Array.isArray(data.keys) || !data.keys.length) {
    throw new Error('github_jwks_invalid');
  }

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

async function readMediaSheet(token) {
  const range = encodeURIComponent('Controle de Mídias!A:F');
  const response = await fetch(
    SHEETS + SHEET_ID + '/values/' + range + '?majorDimension=ROWS',
    {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
    },
  );
  if (!response.ok) throw new Error('google_media_read_failed');
  const data = await response.json();
  return Array.isArray(data.values) ? data.values : [];
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
  const rows = Array.isArray(data.values) ? data.values : [];
  for (let index = rows.length - 1; index >= 1; index--) {
    const row = rows[index] || [];
    if (
      row[1] === 'MEDIA_HEALTH_AUDIT_FAILED'
      && String(row[10] || '').includes(dedupeKey)
    ) {
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

async function probe(url) {
  let last = { ok: false, status: 0, code: 'network_error', detail: '' };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'manual',
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const status = response.status;
      if (status >= 200 && status < 300) {
        return {
          ok: true,
          status,
          code: '',
          detail: response.headers.get('content-type') || '',
        };
      }

      if (status >= 300 && status < 400) {
        return {
          ok: false,
          status,
          code: 'unexpected_redirect',
          detail: safeText(response.headers.get('location') || '', 100),
        };
      }

      last = {
        ok: false,
        status,
        code: 'http_' + status,
        detail: '',
      };

      if (status !== 429 && status < 500) return last;
    } catch (error) {
      const name = safeText(error?.name, 40);
      last = {
        ok: false,
        status: 0,
        code: name === 'TimeoutError' ? 'timeout' : 'network_error',
        detail: name,
      };
    }
  }

  return last;
}

async function mapConcurrent(items, concurrency, fn) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(1, items.length)) },
      () => worker(),
    ),
  );
  return results;
}

function incidentSignature(issues) {
  const compact = issues.map(issue => [
    issue.row,
    issue.id,
    issue.code,
    issue.status,
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
      return Response.json(
        { ok: false, error: 'unauthorized' },
        { status: 401, headers: noStore },
      );
    }

    await verifyGithubOidc(auth.slice(7));

    const raw = await request.text();
    let body = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return Response.json(
        { ok: false, error: 'invalid_json' },
        { status: 400, headers: noStore },
      );
    }

    const shard = Number(body.shard);
    if (!Number.isInteger(shard) || shard < 0 || shard >= SHARD_COUNT) {
      return Response.json(
        { ok: false, error: 'invalid_shard' },
        { status: 400, headers: noStore },
      );
    }

    const token = await accessToken();
    const values = await readMediaSheet(token);
    const prepared = prepareMediaAudit(values, shard, SHARD_COUNT);

    const inventoryIssues = prepared.warnings.map(warning => ({
      row: Number(warning.row || 0),
      id: safeText(warning.id || '', 60),
      code: safeText(warning.code || 'inventory_warning', 60),
      status: 0,
      detail: safeText(warning.detail || '', 100),
    }));

    const probed = await mapConcurrent(
      prepared.candidates,
      CONCURRENCY,
      async media => {
        const result = await probe(media.url);
        return result.ok ? null : {
          row: media.row,
          id: media.id,
          code: result.code,
          status: result.status,
          detail: result.detail,
        };
      },
    );

    const issues = inventoryIssues.concat(probed.filter(Boolean));
    const checkedCount = prepared.candidates.length;
    const healthyCount = checkedCount - probed.filter(Boolean).length;

    if (!issues.length) {
      return Response.json({
        ok: true,
        totalActive: prepared.totalActive,
        shard,
        shardCount: SHARD_COUNT,
        checkedCount,
        healthyCount,
        issueCount: 0,
      }, { headers: noStore });
    }

    const signature = incidentSignature(issues);
    const dedupeKey =
      'media_audit=' + brasiliaDayKey() + ':s' + shard + ':' + signature;
    const recorded = await incidentAlreadyRecorded(token, dedupeKey);

    if (!recorded) {
      const preview = issues.slice(0, 8).map(issue => [
        'row=' + issue.row,
        'id=' + safeText(issue.id || '-', 50),
        'code=' + safeText(issue.code, 50),
        'status=' + Number(issue.status || 0),
        'detail=' + safeText(issue.detail || '-', 60),
      ].join(',')).join(' ; ');

      const details = [
        dedupeKey,
        'active=' + prepared.totalActive,
        'shard=' + shard + '/' + SHARD_COUNT,
        'checked=' + checkedCount,
        'healthy=' + healthyCount,
        'issues=' + issues.length,
        'sample=' + preview,
      ].join(' | ');

      await appendIncident(token, [
        formatBrasiliaDateTime(),
        'MEDIA_HEALTH_AUDIT_FAILED',
        'AVISO',
        'MEDIA/AVAILABILITY',
        '',
        '',
        'FALHA',
        'SEM BLOQUEIO AUTOMATICO',
        issues.length,
        'media-audit',
        details.slice(0, 500),
      ]);
    }

    return Response.json({
      ok: false,
      totalActive: prepared.totalActive,
      shard,
      shardCount: SHARD_COUNT,
      checkedCount,
      healthyCount,
      issueCount: issues.length,
      issues: issues.slice(0, 20),
      incidentRecorded: !recorded,
    }, { status: 409, headers: noStore });
  } catch (error) {
    const code = safeText(error?.message, 80);
    console.error('Media health audit endpoint:', code);

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
      { ok: false, error: authErrors.has(code) ? code : 'media_audit_unavailable' },
      { status: authErrors.has(code) ? 401 : 500, headers: noStore },
    );
  }
}

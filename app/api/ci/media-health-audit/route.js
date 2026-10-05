import {
  createHash,
  createPublicKey,
  createSign,
  verify as verifySignature,
} from 'node:crypto';
import { prepareMediaAudit, safeMediaUrl } from '../../../../lib/mediaAudit.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPECTED_ISSUER = 'https://token.actions.githubusercontent.com';
const EXPECTED_AUDIENCE = 'utilidades-essenciais-ci';
const EXPECTED_REPOSITORY = 'marialuizasp/utilidades-essenciais';
const EXPECTED_WORKFLOW_PATH =
  'marialuizasp/utilidades-essenciais/.github/workflows/media-health-audit.yml';
const ALLOWED_EVENTS = new Set(['schedule', 'deployment_status']);
const JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks';
const SHEET_ID = '19xpC1aQRDEhqHK6e1fRR3fDteX6OA6U6MfqiTcPQ7Yk';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets/';
const SHARD_COUNT = 4;
const CONCURRENCY = 16;
const PROBE_TIMEOUT_MS = 8_000;

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

  const valid = verifySignature(
    'RSA-SHA256',
    Buffer.from(encodedHeader + '.' + encodedPayload),
    createPublicKey({ key: jwk, format: 'jwk' }),
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

async function sheetValues(token) {
  const range = encodeURIComponent('Controle de Mídias!A:F');
  const response = await fetch(
    SHEETS + SHEET_ID + '/values/' + range + '?majorDimension=ROWS',
    { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' },
  );
  if (!response.ok) throw new Error('google_media_read_failed');
  const data = await response.json();
  return Array.isArray(data.values) ? data.values : [];
}

async function incidentAlreadyRecorded(token, dedupeKey) {
  const range = encodeURIComponent('Incidentes!A:K');
  const response = await fetch(
    SHEETS + SHEET_ID + '/values/' + range + '?majorDimension=ROWS',
    { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' },
  );
  if (!response.ok) return false;
  const data = await response.json();
  const values = Array.isArray(data.values) ? data.values : [];
  return values.slice(1).some(row =>
    row[1] === 'MEDIA_HEALTH_AUDIT_FAILED'
    && String(row[10] || '').includes(dedupeKey)
  );
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

function redirectHost(response) {
  const location = response.headers.get('location') || '';
  try {
    return new URL(location).hostname.toLowerCase();
  } catch {
    return '';
  }
}

async function oneProbe(media) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    let response = await fetch(media.url, {
      method: 'HEAD',
      redirect: 'manual',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (response.status === 405 || response.status === 501) {
      response = await fetch(media.url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        redirect: 'manual',
        cache: 'no-store',
        signal: controller.signal,
      });
    }

    if (response.status >= 300 && response.status < 400) {
      return {
        ok: false,
        code: 'unexpected_redirect',
        detail: redirectHost(response) || String(response.status),
      };
    }

    if (!response.ok) {
      return { ok: false, code: 'http_' + response.status, detail: '' };
    }

    if (!safeMediaUrl(response.url || media.url)) {
      return { ok: false, code: 'unexpected_final_host', detail: '' };
    }

    const contentType = String(response.headers.get('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase();

    if (media.expectedPrefix && contentType && !contentType.startsWith(media.expectedPrefix)) {
      return {
        ok: false,
        code: 'unexpected_content_type',
        detail: contentType,
      };
    }

    return { ok: true, contentType: contentType || 'unknown' };
  } catch (error) {
    return {
      ok: false,
      code: error?.name === 'AbortError' ? 'timeout' : 'network_error',
      detail: safeText(error?.message, 80),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function mapConcurrent(items, limit, fn) {
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
    Array.from({ length: Math.min(limit, items.length || 1) }, () => worker())
  );
  return results;
}

async function probeShard(candidates) {
  const first = await mapConcurrent(candidates, CONCURRENCY, async media => ({
    media,
    result: await oneProbe(media),
  }));

  const failed = first.filter(item => !item.result.ok);
  if (!failed.length) return first;

  await new Promise(resolve => setTimeout(resolve, 750));
  const retry = await mapConcurrent(failed, CONCURRENCY, async item => ({
    media: item.media,
    result: await oneProbe(item.media),
  }));
  const retryById = new Map(retry.map(item => [item.media.id, item]));

  return first.map(item =>
    item.result.ok ? item : (retryById.get(item.media.id) || item)
  );
}

function signature(issues) {
  return createHash('sha256')
    .update(JSON.stringify(issues.map(issue => [
      issue.id,
      issue.code,
      issue.detail,
    ])))
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

    let payload = {};
    try {
      payload = await request.json();
    } catch {}

    const shard = Number(payload.shard);
    if (!Number.isInteger(shard) || shard < 0 || shard >= SHARD_COUNT) {
      return Response.json({ ok: false, error: 'invalid_shard' }, { status: 400, headers: noStore });
    }

    const token = await accessToken();
    const values = await sheetValues(token);
    const plan = prepareMediaAudit(values, shard, SHARD_COUNT);
    const checked = await probeShard(plan.candidates);

    const issues = checked
      .filter(item => !item.result.ok)
      .map(item => ({
        row: item.media.row,
        id: item.media.id,
        type: item.media.type,
        code: item.result.code,
        detail: item.result.detail,
      }));

    if (!issues.length) {
      return Response.json({
        ok: true,
        shard,
        shardCount: SHARD_COUNT,
        totalActive: plan.totalActive,
        checked: checked.length,
        issueCount: 0,
        warningCount: plan.warnings.length,
      }, { headers: noStore });
    }

    const dedupeKey =
      'media_audit_key=' + brasiliaDayKey() + ':s' + shard + ':' + signature(issues);
    const recorded = await incidentAlreadyRecorded(token, dedupeKey);

    if (!recorded) {
      const sample = issues.slice(0, 8).map(issue => [
        'id=' + safeText(issue.id, 60),
        'type=' + safeText(issue.type, 20),
        'code=' + safeText(issue.code, 50),
        'detail=' + safeText(issue.detail || '-', 80),
      ].join(',')).join(' ; ');

      const details = [
        dedupeKey,
        'active=' + plan.totalActive,
        'checked=' + checked.length,
        'failed=' + issues.length,
        'sample=' + sample,
      ].join(' | ');

      await appendIncident(token, [
        formatBrasiliaDateTime(),
        'MEDIA_HEALTH_AUDIT_FAILED',
        'AVISO',
        'MEDIA/R2',
        '',
        '',
        'FALHA',
        'SEM BLOQUEIO AUTOMATICO',
        issues.length,
        'media-health-audit',
        details.slice(0, 500),
      ]);
    }

    return Response.json({
      ok: false,
      shard,
      shardCount: SHARD_COUNT,
      totalActive: plan.totalActive,
      checked: checked.length,
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

const ACTIVE_VALUES = new Set(['sim', 'true', '1', 'yes']);

export const MEDIA_HOSTS = new Set([
  'pub-603881db00f042c08f8b4dc6d9731239.r2.dev',
  'bjdcjttjwsmbbytqwvzm.supabase.co',
  'res.cloudinary.com',
]);

export function safeMediaUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (url.port && url.port !== '443') return null;
    if (!MEDIA_HOSTS.has(host)) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function expectedMediaPrefix(type) {
  const normalized = String(type || '').trim().toUpperCase();
  if (normalized === 'REEL') return 'video/';
  if (normalized === 'STORY' || normalized === 'FEED') return 'image/';
  return '';
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value || '')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function prepareMediaAudit(values, shard = 0, shardCount = 4) {
  const rows = Array.isArray(values) ? values : [];
  if (!rows.length) {
    return { totalActive: 0, candidates: [], warnings: [{ code: 'empty_sheet' }] };
  }

  const headers = rows[0].map(value => String(value || '').trim().toLowerCase());
  const required = ['id mídia', 'tipo', 'url pública', 'ativa?'];
  const missing = required.filter(header => !headers.includes(header));
  if (missing.length) {
    return {
      totalActive: 0,
      candidates: [],
      warnings: missing.map(detail => ({ code: 'missing_header', detail })),
    };
  }

  const idIndex = headers.indexOf('id mídia');
  const typeIndex = headers.indexOf('tipo');
  const urlIndex = headers.indexOf('url pública');
  const activeIndex = headers.indexOf('ativa?');

  const active = rows.slice(1)
    .map((row, index) => ({
      row: index + 2,
      id: String(row[idIndex] || '').trim(),
      type: String(row[typeIndex] || '').trim().toUpperCase(),
      rawUrl: String(row[urlIndex] || '').trim(),
    }))
    .filter((item, index) =>
      ACTIVE_VALUES.has(String(rows[index + 1]?.[activeIndex] || '').trim().toLowerCase())
    );

  const warnings = [];
  const candidates = [];
  const normalizedShard = Number.isInteger(Number(shard))
    ? Math.max(0, Math.min(Number(shard), shardCount - 1))
    : 0;

  for (const item of active) {
    if (!item.id) {
      warnings.push({ row: item.row, id: '', code: 'missing_media_id' });
      continue;
    }
    if (!item.rawUrl) {
      warnings.push({ row: item.row, id: item.id, code: 'missing_media_url' });
      continue;
    }

    const url = safeMediaUrl(item.rawUrl);
    if (!url) {
      warnings.push({ row: item.row, id: item.id, code: 'untrusted_media_url' });
      continue;
    }

    if (stableHash(item.id) % shardCount !== normalizedShard) continue;
    candidates.push({
      row: item.row,
      id: item.id,
      type: item.type,
      url,
      expectedPrefix: expectedMediaPrefix(item.type),
    });
  }

  return {
    totalActive: active.length,
    shard: normalizedShard,
    shardCount,
    candidates,
    warnings,
  };
}

import { safeAffiliateUrl } from './affiliateUrl.js';

const ACTIVE_VALUES = new Set(['sim', 'true', '1', 'yes']);

export function parseProductCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;

  for (let i = 0; i < String(text || '').length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (c === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += c;
    }
  }

  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

function hostOf(value) {
  try {
    return new URL(String(value || '')).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return '';
  }
}

export function auditAffiliateCsv(text) {
  const rows = parseProductCsv(text);
  const headers = rows.shift()?.map(value => value.trim().toLowerCase()) || [];
  const required = ['id', 'title', 'videourl', 'affiliatelink', 'active'];
  const missingHeaders = required.filter(header => !headers.includes(header));

  if (missingHeaders.length) {
    return {
      ok: false,
      activeCount: 0,
      validCount: 0,
      issueCount: missingHeaders.length,
      issues: missingHeaders.map(header => ({
        row: 1,
        id: '',
        code: 'missing_header',
        detail: header,
      })),
    };
  }

  const products = rows.map((row, index) => ({
    row: index + 2,
    ...Object.fromEntries(headers.map((header, column) => [
      header,
      String(row[column] || '').trim(),
    ])),
  }));

  const active = products.filter(product =>
    ACTIVE_VALUES.has(String(product.active || '').toLowerCase())
  );

  const issues = [];
  const warnings = [];
  const ids = new Map();

  for (const product of active) {
    const id = String(product.id || '').trim();
    const title = String(product.title || '').trim();
    const videoUrl = String(product.videourl || '').trim();
    const affiliateLink = String(product.affiliatelink || '').trim();

    if (!id) {
      issues.push({ row: product.row, id: '', code: 'missing_id', detail: '' });
    } else {
      const previous = ids.get(id);
      if (previous) {
        issues.push({
          row: product.row,
          id,
          code: 'duplicate_id',
          detail: 'also_row_' + previous,
        });
      } else {
        ids.set(id, product.row);
      }
    }

    if (!title) {
      warnings.push({ row: product.row, id, code: 'missing_title', detail: '' });
    }

    if (!videoUrl) {
      warnings.push({ row: product.row, id, code: 'missing_video_url', detail: '' });
    }

    if (!affiliateLink) {
      issues.push({ row: product.row, id, code: 'missing_affiliate_link', detail: '' });
      continue;
    }

    const safe = safeAffiliateUrl(affiliateLink);
    if (!safe) {
      issues.push({
        row: product.row,
        id,
        code: 'invalid_or_untrusted_affiliate_link',
        detail: hostOf(affiliateLink) || 'invalid_url',
      });
    }
  }

  const invalidIds = new Set(issues.map(issue => issue.id).filter(Boolean));
  const validCount = active.filter(product => product.id && !invalidIds.has(product.id)).length;

  return {
    ok: issues.length === 0,
    activeCount: active.length,
    validCount,
    issueCount: issues.length,
    warningCount: warnings.length,
    issues: issues.slice(0, 100),
    warnings: warnings.slice(0, 100),
  };
}

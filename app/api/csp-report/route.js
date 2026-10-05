export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REPORT_BYTES = 32_000;

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

export async function POST(request) {
  try {
    const contentType = (request.headers.get('content-type') || '').toLowerCase();
    if (
      !contentType.includes('application/csp-report') &&
      !contentType.includes('application/reports+json') &&
      !contentType.includes('application/json')
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

    for (const report of normalizeReports(payload)) {
      console.warn('CSP report-only violation', {
        effectiveDirective: safeText(report['effective-directive'] || report.effectiveDirective),
        violatedDirective: safeText(report['violated-directive'] || report.violatedDirective),
        blockedOrigin: safeOrigin(report['blocked-uri'] || report.blockedURL || report.blockedUri),
        sourceOrigin: safeOrigin(report['source-file'] || report.sourceFile),
        statusCode: Number(report['status-code'] || report.statusCode) || 0,
        disposition: safeText(report.disposition),
      });
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

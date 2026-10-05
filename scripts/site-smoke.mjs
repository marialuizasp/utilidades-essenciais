const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3100';

async function request(path, options = {}) {
  return fetch(base + path, { redirect: 'manual', ...options });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectPage(path) {
  const response = await request(path);
  const body = await response.text();
  assert(response.status === 200, path + ' retornou ' + response.status);
  assert(body.trim().length > 200, path + ' retornou conteúdo vazio');
  assert(!/Application error|Internal Server Error/i.test(body), path + ' contém erro de aplicação');
  return { response, body };
}

const home = await expectPage('/');
await expectPage('/descobrir');

assert(home.response.headers.get('x-content-type-options') === 'nosniff', 'nosniff ausente');
assert(home.response.headers.get('x-frame-options') === 'DENY', 'X-Frame-Options ausente');
assert((home.response.headers.get('referrer-policy') || '').includes('strict-origin'), 'Referrer-Policy ausente');
assert((home.response.headers.get('content-security-policy') || '').includes("frame-ancestors 'none'"), 'CSP mínima ausente');
assert(Boolean(home.response.headers.get('content-security-policy-report-only')), 'CSP Report-Only ausente');

const admin = await request('/admin/produtos');
assert(admin.status === 200, '/admin/produtos não carregou');
assert((admin.headers.get('x-robots-tag') || '').includes('noindex'), 'admin sem noindex');
assert((admin.headers.get('cache-control') || '').includes('no-store'), 'admin sem no-store');

for (const path of [
  '/api/tiktok/connect',
  '/api/tiktok/creator-info',
  '/api/tiktok/private-test',
]) {
  const response = await request(path);
  assert(response.status === 401, path + ' deveria exigir sessão admin e retornou ' + response.status);
}

for (const path of [
  '/api/tiktok/automation/health',
  '/api/tiktok/automation/publish',
  '/api/tiktok/automation/status',
]) {
  const response = await request(path, { method: 'POST' });
  assert(response.status === 401, path + ' deveria rejeitar chamada sem segredo e retornou ' + response.status);
}

console.log('Security smoke OK — navegação pública íntegra e automações TikTok preservadas.');

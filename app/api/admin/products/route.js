import { createSign, timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const SHEET_ID = '19xpC1aQRDEhqHK6e1fRR3fDteX6OA6U6MfqiTcPQ7Yk';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets/';
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const clean = value => String(value ?? '').trim();
const safeCell = value => /^[=+@\-]/.test(clean(value)) ? "'" + clean(value) : clean(value);
const validUrl = value => { try { const u = new URL(value); return u.protocol === 'https:'; } catch { return false; } };
const productKey = value => {
  try {
    const u = new URL(value);
    const match = u.pathname.match(/(?:-i\.|\/product\/)(\d+)[./](\d+)/);
    if (match) return 'shopee:' + match[1] + ':' + match[2];
    return u.origin.toLowerCase() + u.pathname.replace(/\/$/, '').toLowerCase();
  } catch { return clean(value).toLowerCase(); }
};
function passwordMatches(value) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || !value) return false;
  const a = Buffer.from(String(value)), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
async function accessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('Configure a conta de serviço do Google na Vercel.');
  const now = Math.floor(Date.now() / 1000);
  const encode = x => Buffer.from(JSON.stringify(x)).toString('base64url');
  const claim = encode({ iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const header = encode({ alg: 'RS256', typ: 'JWT' });
  const signingInput = header + '.' + claim;
  const sign = createSign('RSA-SHA256'); sign.update(signingInput); sign.end();
  const assertion = signingInput + '.' + sign.sign(key).toString('base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }), cache: 'no-store' });
  if (!response.ok) throw new Error('Falha na autenticação com Google Sheets. Confira a conta de serviço.');
  return (await response.json()).access_token;
}
async function sheets(token, path, options = {}) {
  const response = await fetch(SHEETS + SHEET_ID + path, { ...options, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...(options.headers || {}) }, cache: 'no-store' });
  if (!response.ok) { console.error('Google Sheets API:', response.status, await response.text()); throw new Error('Não foi possível acessar a planilha. Confira se ela foi compartilhada com a conta de serviço.'); }
  return response.json();
}
export async function POST(request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return json({ error: 'Origem não autorizada.' }, 403);
    const payload = await request.json();
    if (!passwordMatches(payload.password)) return json({ error: 'Senha administrativa inválida ou não configurada.' }, 401);
    const token = await accessToken();
    const data = await sheets(token, '/values/' + encodeURIComponent('Produtos!A2:K') + '?valueRenderOption=FORMATTED_VALUE');
    const existing = data.values || [];
    if (payload.action === 'list') return json({ total: existing.filter(r => r[0] && clean(r[9]).toUpperCase() === 'SIM').length, products: existing.filter(r => r[0]).slice(-15).reverse().map(r => ({ id:r[0], name:r[1], url:r[5] })) });
    if (payload.action !== 'create' || !Array.isArray(payload.products)) return json({ error: 'Operação inválida.' }, 400);
    if (payload.products.length < 1 || payload.products.length > 50) return json({ error: 'Envie entre 1 e 50 produtos por lote.' }, 400);
    const keys = new Set(existing.map(r => r[5]).filter(Boolean).map(productKey));
    const names = new Set(existing.filter(r => r[1] && r[6]).map(r => clean(r[1]).toLowerCase() + '|' + clean(r[6]).toLowerCase()));
    let nextId = Math.max(0, ...existing.map(r => Number((clean(r[0]).match(/^prod_(\d+)$/i) || [])[1]) || 0));
    const rows = [], skipped = [], errors = [];
    payload.products.forEach((p, i) => {
      const name = clean(p.name), url = clean(p.affiliateLink), video = clean(p.videoUrl);
      if (!name || !validUrl(url) || !validUrl(video)) { errors.push({ line:i+1, reason:'Preencha nome, link HTTPS do afiliado e URL HTTPS pública do vídeo.' }); return; }
      const key = productKey(url), pair = name.toLowerCase() + '|' + video.toLowerCase();
      if (keys.has(key) || names.has(pair)) { skipped.push({ line:i+1, name, reason:'Produto ou vídeo já cadastrado.' }); return; }
      const price = clean(p.price).replace(/^R\$\s*/i, '').replace(/\./g, '').replace(',', '.');
      const old = clean(p.originalPrice).replace(/^R\$\s*/i, '').replace(/\./g, '').replace(',', '.');
      if ((price && (!Number.isFinite(Number(price)) || Number(price) < 0)) || (old && (!Number.isFinite(Number(old)) || Number(old) < 0))) { errors.push({ line:i+1, reason:'Preço inválido.' }); return; }
      const id = 'prod_' + String(++nextId).padStart(3, '0');
      rows.push([id,safeCell(name),safeCell(p.category || 'Outros'),price ? Number(price) : '',old ? Number(old) : '',url,video,validUrl(clean(p.imageUrl)) ? clean(p.imageUrl) : '', '', 'SIM',safeCell(p.notes || 'Cadastrado pelo painel administrativo')]);
      keys.add(key); names.add(pair);
    });
    if (rows.length) await sheets(token, '/values/' + encodeURIComponent('Produtos!A:K') + ':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS', { method:'POST', body:JSON.stringify({ majorDimension:'ROWS', values:rows }) });
    return json({ created:rows.map(r => ({ id:r[0], name:r[1] })), skipped, errors });
  } catch (error) { console.error('Admin products:', error); return json({ error:error.message || 'Erro ao cadastrar produtos.' }, 500); }
}

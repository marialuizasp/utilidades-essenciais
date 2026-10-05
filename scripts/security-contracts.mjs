import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL('../' + path, import.meta.url), 'utf8');
}

function mustInclude(label, source, fragment) {
  if (!source.includes(fragment)) {
    throw new Error(label + ' perdeu contrato obrigatório: ' + fragment);
  }
}

function mustNotInclude(label, source, fragment) {
  if (source.includes(fragment)) {
    throw new Error(label + ' recebeu dependência proibida: ' + fragment);
  }
}

const session = read('lib/tiktokAutomationSession.js');
mustInclude('TikTok automation auth', session, "x-tiktok-automation-secret");
mustInclude('TikTok automation auth', session, 'TIKTOK_AUTOMATION_SECRET');
mustInclude('TikTok automation auth', session, 'timingSafeEqual');

const health = read('app/api/tiktok/automation/health/route.js');
const publish = read('app/api/tiktok/automation/publish/route.js');
const status = read('app/api/tiktok/automation/status/route.js');

for (const [name, source] of [
  ['TikTok health', health],
  ['TikTok publish', publish],
  ['TikTok status', status],
]) {
  mustInclude(name, source, 'export async function POST');
  mustNotInclude(name, source, 'adminSessionIsValid');
}

mustInclude('TikTok health', health, "x-tiktok-automation-secret");
mustInclude('TikTok health', health, 'TIKTOK_AUTOMATION_SECRET');
mustInclude('TikTok publish', publish, 'automationSecretIsValid');
mustInclude('TikTok publish', publish, 'video_url');
mustInclude('TikTok publish', publish, 'PULL_FROM_URL');
mustInclude('TikTok status', status, 'automationSecretIsValid');
mustInclude('TikTok status', status, 'publish_id');

const affiliate = read('lib/affiliateUrl.js');
for (const host of ['shopee.com.br','amazon.com.br','mercadolivre.com.br']) {
  mustInclude('Affiliate allowlist', affiliate, host);
}
mustInclude('Affiliate HTTPS', affiliate, "url.protocol !== 'https:'");

const config = read('next.config.mjs');
for (const header of [
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
  'Strict-Transport-Security',
  'Content-Security-Policy-Report-Only',
]) {
  mustInclude('Security headers', config, header);
}

console.log('Security contracts OK — TikTok automation contract preserved.');

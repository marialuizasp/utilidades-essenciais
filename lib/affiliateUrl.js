const EXACT_HOSTS = new Set([
  's.shopee.com.br',
  'amzn.to',
]);

const ROOT_HOSTS = [
  'shopee.com.br',
  'amazon.com.br',
  'mercadolivre.com.br',
  'mercadolivre.com',
];

function hostAllowed(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  if (EXACT_HOSTS.has(host)) return true;
  return ROOT_HOSTS.some(root => host === root || host.endsWith('.' + root));
}

export function safeAffiliateUrl(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw || raw.length > 2048) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (url.port && url.port !== '443') return null;
    if (!hostAllowed(url.hostname)) return null;

    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function isAllowedAffiliateUrl(value) {
  return Boolean(safeAffiliateUrl(value));
}

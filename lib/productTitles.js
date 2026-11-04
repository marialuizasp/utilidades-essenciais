// Títulos de vitrine: concisos, descritivos e sem alegações promocionais inventadas.
// O título original permanece intacto no Google Sheets e nos dados do produto.
const SPELLINGS = [
  [/\btr[eê]s\s+pe[cç]as\b/gi, '3 peças'],
  [/\bduas\s+pe[cç]as\b/gi, '2 peças'],
  [/\bquatro\s+pe[cç]as\b/gi, '4 peças'],
  [/\bcinco\s+pe[cç]as\b/gi, '5 peças'],
  [/\bseis\s+pe[cç]as\b/gi, '6 peças'],
  [/\bconjunto\s+de\s+(\d+)\s+pe[cç]as\b/gi, 'kit $1 peças'],
  [/\b(\d+)\s+unidades\b/gi, '$1 un.'],
];
const NOISE = [
  /\b(?:super oferta|promo[cç][aã]o imperd[ií]vel|pre[cç]o imperd[ií]vel|mais vendido|envio imediato|frete gr[aá]tis|pronta entrega|alta qualidade|qualidade premium|produto original|100% original|original|oficial|novidade|lan[cç]amento|lindo|linda|maravilhoso|maravilhosa)\b/gi,
  /\b(?:para voc[eê]|do momento|imperd[ií]vel)\b/gi,
];
const CORE_TYPES = [
  /pijama(?:\s+(?:feminino|masculino|infantil))?/i,
  /(?:jogo|kit)\s+de\s+panelas/i,
  /(?:aspirador\s+rob[oô]|rob[oô]\s+aspirador)/i,
  /(?:organizador(?:a)?|escorredor|liquidificador|cafeteira|air\s*fryer|fritadeira|micro-ondas|ventilador|umidificador|hidratante|protetor solar|s[eé]rum|shampoo|condicionador|bolsa|mochila|vestido|blusa|camiseta|shorts|bermuda|cal[cç]a|tapete|lumin[aá]ria|kit de toalhas|toalha|sabonete|escova|garrafa|pote|suporte)/i
];
const FEATURE_PATTERN = /\b(?:\d+\s*(?:peças|un\.|litros|l|ml|kg|cm|w|v)|(?:sem fio|port[aá]til|dobr[aá]vel|recarreg[aá]vel|antiaderente|imperme[aá]vel|t[eé]rmic[ao]|el[eé]tric[ao]|de vidro|de inox|de silicone|com tampa|com al[cç]a|para beb[eê]|para pet|de ver[aã]o))\b/gi;
const LIMIT = 54;

function normalizeWords(value) {
  return String(value || '').replace(/\s+/g, ' ').replace(/[•]+/g, ' · ').trim();
}
function compact(value, max = LIMIT) {
  const clean = value.replace(/\s+/g, ' ').replace(/^[\s,;:—–\-·]+|[\s,;:—–\-·]+$/g, '').trim();
  if (clean.length <= max) return clean;
  const words = clean.split(' ');
  let result = '';
  for (const word of words) {
    if ((result ? result.length + 1 : 0) + word.length > max - 1) break;
    result += (result ? ' ' : '') + word;
  }
  return (result || clean.slice(0, max - 1)).replace(/[,:;—–\-·]$/, '') + '…';
}
export function attractiveProductTitle(title) {
  const original = normalizeWords(title);
  if (!original) return 'Achadinho para sua rotina';
  let cleaned = original;
  for (const [pattern, replacement] of SPELLINGS) cleaned = cleaned.replace(pattern, replacement);
  for (const pattern of NOISE) cleaned = cleaned.replace(pattern, ' ');
  cleaned = normalizeWords(cleaned).replace(/\s*[,;|]+\s*/g, ' · ').replace(/\s*[—–]\s*/g, ' · ');
  // Exemplo: "Conjunto de 3 peças de verão · pijama feminino".
  const pajama = cleaned.match(/pijama\s+(?:feminino|masculino|infantil)/i);
  if (pajama) {
    const quantity = cleaned.match(/\b\d+\s*peças\b/i);
    const season = cleaned.match(/\b(?:de ver[aã]o|de inverno)\b/i);
    return compact([pajama[0], quantity?.[0], season?.[0]].filter(Boolean).join(' · '));
  }
  // Remove prefixos comerciais antes do nome do item, sem alterar sua especificação.
  cleaned = cleaned.replace(/^(?:(?:kit|conjunto)\s+de\s+)?(?:produto\s+)?/i, match => match);
  const foundType = CORE_TYPES.map(pattern => cleaned.match(pattern)).find(Boolean);
  if (foundType && foundType.index > 0 && foundType.index < 65) {
    const type = foundType[0];
    const after = cleaned.slice(foundType.index + type.length).replace(/^[\s:·—–-]+/, '');
    const before = cleaned.slice(0, foundType.index);
    const features = [...(before + ' ' + after).matchAll(FEATURE_PATTERN)]
      .map(match => match[0]).filter((value, index, arr) => arr.findIndex(x => x.toLowerCase() === value.toLowerCase()) === index);
    const short = [type, ...features.slice(0, 2)].join(' · ');
    if (short.length >= 15) return compact(short);
  }
  const firstPart = cleaned.split(/\s+·\s+/)[0].trim();
  const candidate = firstPart.length >= 13 ? firstPart : cleaned;
  return compact(candidate || original);
}

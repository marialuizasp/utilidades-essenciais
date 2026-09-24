import fallbackProducts from '@/data/products.json';

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(x => x.trim())) rows.push(row);
      row = []; cell = '';
    } else cell += c;
  }
  row.push(cell); if (row.some(x => x.trim())) rows.push(row);
  return rows;
}

export async function getProducts() {
  const url = process.env.GOOGLE_SHEET_CSV_URL;
  if (!url) return fallbackProducts;
  try {
    const response = await fetch(url, { next: { revalidate: 60 } });
    if (!response.ok) throw new Error('Google Sheets HTTP ' + response.status);
    const rows = parseCSV(await response.text());
    const headers = rows.shift()?.map(x => x.trim().toLowerCase()) || [];
    const required = ['id','title','category','price','videourl','affiliatelink','active'];
    if (!required.every(k => headers.includes(k))) throw new Error('Cabeçalhos da planilha incorretos');
    return rows.map(row => Object.fromEntries(headers.map((h,i) => [h, (row[i] || '').trim()])))
      .filter(p => ['sim','true','1','yes'].includes(p.active.toLowerCase()) && p.title && p.videourl && /^https:\/\//.test(p.affiliatelink))
      .map(p => ({ id:p.id, title:p.title, category:p.category, price:p.price, videoUrl:p.videourl, affiliateLink:p.affiliatelink, tags:(p.tags || '').split(';').map(t => t.trim()).filter(Boolean) }));
  } catch (error) {
    console.error('Erro ao consultar Google Sheets:', error.message);
    return fallbackProducts;
  }
}

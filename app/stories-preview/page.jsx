import { getProducts } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

const themes = [
  { label: 'ACHADINHO DO DIA', note: 'Um achado para facilitar sua rotina', bg: '#f6e9d7', accent: '#254532', warm: '#e17a4f' },
  { label: 'OFERTA EM DESTAQUE', note: 'Confira o preço atual na loja', bg: '#f3e7dc', accent: '#794c36', warm: '#dc7445' },
  { label: 'DICA DO DIA', note: 'Pequenos detalhes, grandes diferenças', bg: '#e9ecdf', accent: '#294b39', warm: '#d8774d' }
];
function money(value) {
  const n = Number(String(value || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n) : null;
}
function Preview({ product, theme, index }) {
  const current = money(product.price);
  const old = money(product.originalPrice);
  const rawCurrent = Number(String(product.price || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
  const rawOld = Number(String(product.originalPrice || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
  const discount = Number.isFinite(rawOld) && Number.isFinite(rawCurrent) && rawOld > rawCurrent && rawCurrent > 0 ? Math.round((1 - rawCurrent / rawOld) * 100) : null;
  return <div className="story" style={{ '--bg': theme.bg, '--accent': theme.accent, '--warm': theme.warm }}>
    <div className="top-safe"></div>
    <div className="story-body">
      <div className="brand"><span className="brand-icon">✦</span><span>utilidades<br/>essenciais</span></div>
      <div className="eyebrow">{theme.label}</div>
      <h2>{product.title}</h2>
      <p className="note">{theme.note}</p>
      <div className="media">{product.videoUrl ? <video src={product.videoUrl} muted loop autoPlay playsInline preload="metadata" aria-label={'Vídeo do produto '+product.title}/> : <div className="missing">Produto sem vídeo</div>}<span className="corner">✦</span></div>
      {current ? <div className="price"><div><small>Preço cadastrado</small><strong>{current}</strong>{discount ? <small className="old">De {old}</small> : null}</div>{discount ? <div className="discount">{discount}%<br/><small>OFF</small></div> : null}</div> : <div className="price"><span>Confira o preço atualizado na loja</span></div>}
      <div className="cta">CONFIRA NA BIO <span>↗</span></div>
    </div>
    <div className="bottom-safe"></div>
  </div>;
}
export default async function StoriesPreview() {
  const products = (await getProducts()).filter(p => p.videoUrl && p.title && p.affiliateLink).slice(0, 3);
  return <main className="page">
    <header><h1>Stories premium · prévia</h1><p>Três modelos com vídeos e preços da planilha. Apenas visualização: nenhuma publicação será feita.</p><p className="warning">A arte agora reserva 220 px no topo e 80 px na base, sem faixas ou rótulos visíveis. Títulos, vídeos e preços não se sobrepõem. A marca em texto é provisória até incorporarmos o arquivo original da sua logo.</p></header>
    <div className="gallery">{products.map((p,i)=><section key={p.id || i}><Preview product={p} theme={themes[i]} index={i}/><p className="caption">Modelo {i+1} · {themes[i].label}</p></section>)}</div>
    {!products.length ? <p>Nenhum produto ativo com vídeo foi encontrado. Confira a planilha e a variável GOOGLE_SHEET_CSV_URL.</p> : null}
    <style>{`
      *{box-sizing:border-box}.page{min-height:100vh;background:#f7f6f2;color:#263b2d;padding:42px 22px;font-family:Arial,Helvetica,sans-serif}
      header{max-width:1050px;margin:0 auto 32px}header h1{font-size:30px;margin:0 0 12px}header p{line-height:1.55;color:#536056}
      .warning{padding:14px 18px;border-radius:12px;background:#fff0db;color:#78532e}
      .gallery{display:flex;flex-wrap:wrap;justify-content:center;gap:28px}.gallery section{width:min(100%,360px)}
      .story{position:relative;width:100%;aspect-ratio:9/16;overflow:hidden;background:var(--bg);color:var(--accent);border-radius:18px;box-shadow:0 12px 40px #1a302320}
      .story:before{content:'';position:absolute;width:45%;aspect-ratio:1;border-radius:50%;background:var(--warm);opacity:.13;top:33%;right:-22%;pointer-events:none}
      .top-safe{position:absolute;top:0;left:0;right:0;height:11.46%;pointer-events:none}
      .bottom-safe{position:absolute;bottom:0;left:0;right:0;height:4.17%;pointer-events:none}
      .story-body{position:absolute;top:11.46%;bottom:4.17%;left:0;right:0;display:grid;grid-template-rows:5% 7% minmax(0,12%) 4% minmax(0,1fr) 12% 9%;gap:1%;justify-items:center;align-items:center;padding:0 7%;min-height:0}
      .brand{display:flex;justify-content:center;align-items:center;gap:6px;font-weight:800;line-height:.92;font-size:13px;letter-spacing:-.6px;min-height:0}
      .brand-icon{color:var(--warm);font-size:22px}
      .eyebrow{white-space:nowrap;background:var(--accent);color:white;border-radius:24px;font-size:10px;font-weight:800;letter-spacing:.6px;padding:6px 13px}
      .story-body h2{align-self:center;width:100%;font-size:clamp(15px,4.4vw,21px);line-height:1.12;text-align:center;margin:0;max-height:100%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}
      .note{font-size:11px;text-align:center;margin:0;line-height:1.1}
      .media{position:relative;min-height:0;height:100%;width:100%;border-radius:15px;overflow:hidden;background:#e5d6c2;box-shadow:0 6px 18px #2d33231a}
      .media video{position:absolute;inset:0;display:block;height:100%;width:100%;object-fit:cover;object-position:center}
      .corner{position:absolute;right:12px;top:6px;color:var(--warm);font-size:28px;pointer-events:none}.missing{display:grid;place-items:center;height:100%}
      .price{width:100%;height:100%;background:#fff9f0;border-radius:13px;padding:6px 12px;display:flex;align-items:center;justify-content:space-between;min-height:0}
      .price small{display:block;font-size:9px}.price strong{font-size:20px;line-height:1.1}.old{text-decoration:line-through;color:#80685e}
      .discount{background:var(--warm);border-radius:10px;color:white;font-size:15px;font-weight:800;text-align:center;padding:4px 8px}
      .cta{width:100%;height:100%;background:var(--accent);border-radius:28px;color:white;text-align:center;font-size:11px;font-weight:800;letter-spacing:.5px;display:flex;align-items:center;justify-content:center;gap:15px}
      .caption{text-align:center;font-weight:700;color:#415646}
      @media(min-width:850px){.story-body h2{font-size:21px}}
    `}</style>
  </main>;
}

'use client';
import { useState } from 'react';
const blank = () => ({ name:'', category:'', price:'', originalPrice:'', affiliateLink:'', videoUrl:'', imageUrl:'' });
const categories = ['Casa e Construção','Beleza','Celulares e Dispositivos','Acessórios para Veículos','Limpeza Veicular','Cozinha','Roupas Femininas','Esportes e Lazer','Mãe e Bebê','Brinquedos','Viagens e Bagagens','Impressoras 3D','Outros'];
export default function AdminProdutos() {
  const [password,setPassword] = useState('');
  const [rows,setRows] = useState([blank()]);
  const [bulk,setBulk] = useState('');
  const [loading,setLoading] = useState(false);
  const [feedback,setFeedback] = useState(null);
  const [summary,setSummary] = useState(null);
  const change = (index,key,value) => setRows(prev => prev.map((row,i) => i === index ? {...row,[key]:value} : row));
  const call = async (action,products) => {
    const response = await fetch('/api/admin/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password,action,products})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a operação.');
    return result;
  };
  const connect = async () => { setLoading(true);setFeedback(null);try {setSummary(await call('list'));} catch(e){setFeedback({error:e.message});}finally{setLoading(false);} };
  const addBulk = () => {
    const parsed = bulk.split(/\r?\n/).filter(x => x.trim()).map(line => {
      const [name,affiliateLink,videoUrl,price='',category='Outros',originalPrice='',imageUrl=''] = line.split('\t').map(x => x.trim());
      return {name,affiliateLink,videoUrl,price,category,originalPrice,imageUrl};
    });
    if (!parsed.length) return;
    setRows(prev => [...prev.filter(x => x.name || x.affiliateLink || x.videoUrl),...parsed].slice(0,50));
    setBulk('');
    setFeedback({info:parsed.length+' produtos adicionados ao formulário. Revise antes de salvar.'});
  };
  const submit = async e => {
    e.preventDefault();setLoading(true);setFeedback(null);
    try {
      const products = rows.filter(r => r.name || r.affiliateLink || r.videoUrl);
      if (!products.length) throw new Error('Adicione pelo menos um produto.');
      const result = await call('create',products);
      setFeedback(result);
      const createdNames = new Set(result.created.map(x=>x.name));
      setRows(prev => { const remaining = prev.filter(x => !createdNames.has(x.name)); return remaining.length ? remaining : [blank()]; });
      setSummary(await call('list'));
    } catch(e){setFeedback({error:e.message});}finally{setLoading(false);}
  };
  return <main className="min-h-screen overflow-y-auto bg-slate-950 px-4 py-8 text-slate-100 sm:px-8" style={{height:'100dvh'}}>
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2"><a href="/" className="text-sm text-lime-300 hover:underline">← Voltar à vitrine</a><p className="text-xs font-bold uppercase tracking-widest text-lime-300">Utilidades Essenciais · Administração</p><h1 className="text-3xl font-bold sm:text-4xl">Cadastro de produtos</h1><p className="text-slate-400">Cadastre até 50 produtos por lote. O painel verifica duplicatas antes de inserir na sua planilha.</p></header>
      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5"><label className="mb-2 block text-sm font-semibold" htmlFor="password">Senha administrativa</label><div className="flex flex-col gap-3 sm:flex-row"><input id="password" type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 p-3 outline-none focus:border-lime-400" placeholder="Senha configurada na Vercel"/><button type="button" disabled={loading || !password} onClick={connect} className="rounded-lg bg-lime-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-40">Conectar</button></div>{summary && <p className="mt-3 text-sm text-lime-300">Conectado à planilha · {summary.total} produtos ativos</p>}</section>
      {summary && <><section className="rounded-2xl border border-slate-700 bg-slate-900 p-5"><h2 className="mb-2 text-xl font-semibold">Importar vários produtos</h2><p className="mb-3 text-sm text-slate-400">Cole uma linha por produto, separando as colunas com TAB: nome, link de afiliado, URL pública do vídeo, preço, categoria, preço anterior e URL da imagem. Você pode copiar várias linhas de uma planilha.</p><textarea value={bulk} onChange={e=>setBulk(e.target.value)} rows={5} placeholder={'Nome do produto\thttps://s.shopee.com.br/...\thttps://.../video.mp4\t39,90\tBeleza'} className="w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-sm outline-none focus:border-lime-400"/><button type="button" onClick={addBulk} disabled={!bulk.trim()} className="mt-3 rounded-lg border border-lime-400 px-4 py-2 font-semibold text-lime-300 disabled:opacity-40">Adicionar ao formulário</button></section>
      <form onSubmit={submit} className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Produtos para cadastrar ({rows.length}/50)</h2><button type="button" disabled={rows.length>=50} onClick={()=>setRows(prev=>[...prev,blank()])} className="rounded-lg border border-slate-500 px-4 py-2 text-sm hover:border-lime-300 disabled:opacity-40">+ Adicionar produto</button></div>
      {rows.map((r,i)=><section key={i} className="rounded-2xl border border-slate-700 bg-slate-900 p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Produto {i+1}</h3><button type="button" onClick={()=>setRows(prev=>prev.length===1?[blank()]:prev.filter((_,j)=>j!==i))} className="text-sm text-rose-300 hover:underline">Remover</button></div><div className="grid gap-4 sm:grid-cols-2">
      {[[ 'name','Nome do produto *','text'],['affiliateLink','Link de afiliado *','url'],['videoUrl','URL pública do vídeo *','url'],['price','Preço atual (R$)','text'],['originalPrice','Preço anterior real (R$)','text'],['imageUrl','URL da imagem','url']].map(([key,label,type])=><label key={key} className="block text-sm"><span className="mb-1 block text-slate-300">{label}</span><input type={type} value={r[key]} onChange={e=>change(i,key,e.target.value)} placeholder={key==='price'?'39,90':undefined} className="w-full rounded-lg border border-slate-600 bg-slate-950 p-3 outline-none focus:border-lime-400" /></label>)}
      <label className="block text-sm"><span className="mb-1 block text-slate-300">Categoria</span><select value={r.category} onChange={e=>change(i,'category',e.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 p-3">{categories.map(c=><option key={c}>{c}</option>)}</select></label>
      </div></section>)}
      <button type="submit" disabled={loading||!password} className="w-full rounded-xl bg-lime-400 px-6 py-4 text-lg font-bold text-slate-950 disabled:opacity-40">{loading?'Salvando...':'Verificar duplicatas e cadastrar produtos'}</button></form></>}
      {feedback && <section role="status" className="rounded-2xl border border-slate-600 bg-slate-900 p-5">{feedback.error?<p className="text-rose-300">{feedback.error}</p>:feedback.info?<p>{feedback.info}</p>:<div className="space-y-2"><p className="font-semibold text-lime-300">{feedback.created.length} produtos cadastrados com sucesso.</p><p>{feedback.skipped.length} duplicatas ignoradas · {feedback.errors.length} registros com erro.</p>{feedback.skipped.map((x,i)=><p key={'s'+i} className="text-sm text-amber-300">Linha {x.line}: {x.name} — {x.reason}</p>)}{feedback.errors.map((x,i)=><p key={'e'+i} className="text-sm text-rose-300">Linha {x.line}: {x.reason}</p>)}</div>}</section>}
      <p className="pb-8 text-xs text-slate-500">Os novos produtos aparecem no site após a atualização do CSV. O cadastro não agenda automaticamente Reels ou Stories.</p>
    </div>
  </main>;
}

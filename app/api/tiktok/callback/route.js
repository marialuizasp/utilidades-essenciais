import { randomBytes, createCipheriv, timingSafeEqual } from 'node:crypto';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const redirectUri='https://utilidades-essenciais-kappa.vercel.app/api/tiktok/callback';
const result=(message,success=false)=>new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conexão TikTok</title><body style="font:18px Arial,sans-serif;max-width:620px;margin:80px auto;padding:20px"><h1>'+ (success?'TikTok conectado para testes':'Não foi possível conectar o TikTok') +'</h1><p>'+message+'</p><p><a href="/admin/produtos">Voltar ao painel de produtos</a></p></body></html>',{status:success?200:400,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
export async function GET(request){
  const url=new URL(request.url);const state=url.searchParams.get('state')||'';const code=url.searchParams.get('code')||'';
  const cookie=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('tt_oauth_state='))?.slice('tt_oauth_state='.length)||'';
  if(!state||!cookie||Buffer.byteLength(state)!==Buffer.byteLength(cookie)||!timingSafeEqual(Buffer.from(state),Buffer.from(cookie)))return result('A autorização expirou ou não foi iniciada neste navegador. Volte ao painel e tente novamente.');
  if(url.searchParams.get('error'))return result('O TikTok não autorizou o acesso. Verifique as permissões e tente novamente.');
  if(!code)return result('O TikTok não retornou o código de autorização.');
  const key=process.env.TIKTOK_CLIENT_KEY,secret=process.env.TIKTOK_CLIENT_SECRET,sessionSecret=process.env.TIKTOK_SESSION_SECRET;
  if(!key||!secret||!sessionSecret||!/^([a-f0-9]{64})$/i.test(sessionSecret))return result('Faltam credenciais ou TIKTOK_SESSION_SECRET (64 caracteres hexadecimais) na Vercel.');
  try{
    const tokenResponse=await fetch('https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Cache-Control':'no-store'},body:new URLSearchParams({client_key:key,client_secret:secret,code,grant_type:'authorization_code',redirect_uri:redirectUri}),cache:'no-store'});
    const data=await tokenResponse.json();
    if(!tokenResponse.ok||!data.access_token||!data.refresh_token){const rawCode=String(data.error||data.error_code||data.code||'unknown');const safeCode=/^[a-zA-Z0-9_.-]{1,80}$/.test(rawCode)?rawCode:'unknown';console.error('TikTok OAuth exchange failed:',{httpStatus:tokenResponse.status,errorCode:safeCode,requestId:typeof data.log_id==='string'?data.log_id.slice(0,100):undefined,missingAccessToken:!data.access_token,missingRefreshToken:!data.refresh_token});return result('O TikTok recusou a troca do código de autorização. Código do erro: '+safeCode+'. HTTP: '+tokenResponse.status+'. Confira se Client Key e Client Secret são do MESMO Sandbox. Não compartilhe suas credenciais.');}
    const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(sessionSecret,'hex'),iv);
    const payload=JSON.stringify({access_token:data.access_token,refresh_token:data.refresh_token,open_id:data.open_id,expires_at:Date.now()+Number(data.expires_in||0)*1000,refresh_expires_at:Date.now()+Number(data.refresh_expires_in||0)*1000});
    const encrypted=Buffer.concat([cipher.update(payload,'utf8'),cipher.final()]);const value=Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');
    if(value.length>3700)return result('A sessão retornada pelo TikTok é muito grande para armazenar com segurança.');
    const response=result('Sua conta foi autorizada no Sandbox. Esta etapa apenas conecta a conta neste navegador; a publicação agendada ainda não está ativada.',true);
    response.headers.append('Set-Cookie','tt_oauth_state=; Path=/api/tiktok; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    response.headers.append('Set-Cookie',`tt_sandbox_session=${value}; Path=/api/tiktok; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
    return response;
  }catch(error){console.error('TikTok OAuth callback:',error.message);return result('Falha temporária na conexão com o TikTok. Tente novamente.');}
}
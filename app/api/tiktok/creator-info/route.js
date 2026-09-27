import {createDecipheriv,createCipheriv,randomBytes} from 'node:crypto';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store'};
function cookie(request,name){return request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);}
function seal(data,key){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);return Buffer.concat([iv,c.getAuthTag(),c.update(JSON.stringify(data),'utf8'),c.final()]).toString('base64url');}
function unseal(value,key){const b=Buffer.from(value,'base64url'),d=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString());}
export async function GET(request){
 const key=process.env.TIKTOK_SESSION_SECRET;
 if(!key||!/^([a-f0-9]{64})$/i.test(key))return Response.json({ok:false,error:'Configuração incompleta.'},{status:503,headers:noStore});
 const value=cookie(request,'tt_sandbox_session');
 if(!value)return Response.json({ok:false,error:'Conecte o TikTok neste navegador primeiro.',connect:'/api/tiktok/connect'},{status:401,headers:noStore});
 try{
  let session=unseal(value,key),renewed=false;
  if(Date.now()>Number(session.expires_at||0)-300000){
   const r=await fetch('https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_key:process.env.TIKTOK_CLIENT_KEY,client_secret:process.env.TIKTOK_CLIENT_SECRET,grant_type:'refresh_token',refresh_token:session.refresh_token}),cache:'no-store'});
   const j=await r.json();if(!r.ok||!j.access_token||!j.refresh_token)return Response.json({ok:false,error:'A sessão expirou. Reconecte o TikTok.'},{status:401,headers:noStore});
   session={...session,access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Date.now()+Number(j.expires_in||0)*1000,refresh_expires_at:Date.now()+Number(j.refresh_expires_in||0)*1000};renewed=true;
  }
  const r=await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json; charset=UTF-8'},body:'{}',cache:'no-store'});
  const j=await r.json();
  const ok=r.ok&&j.error?.code==='ok';
  const result=Response.json(ok?{ok:true,username:j.data?.creator_username,privacy_level_options:j.data?.privacy_level_options,max_video_post_duration_sec:j.data?.max_video_post_duration_sec,can_test_private:j.data?.privacy_level_options?.includes('SELF_ONLY')}:{ok:false,error:j.error?.code||'creator_info_failed',message:j.error?.message||'Não foi possível consultar as permissões.'},{status:ok?200:400,headers:noStore});
  if(renewed)result.headers.append('Set-Cookie','tt_sandbox_session='+seal(session,key)+'; Path=/api/tiktok; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000');
  return result;
 }catch(e){console.error('TikTok creator info:',e.message);return Response.json({ok:false,error:'Sessão inválida ou falha temporária. Reconecte o TikTok.'},{status:401,headers:noStore});}
}

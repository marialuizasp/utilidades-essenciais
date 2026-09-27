import {createDecipheriv} from 'node:crypto';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request){
 const id=new URL(request.url).searchParams.get('publish_id');
 if(!id||!/^v_pub_[A-Za-z0-9_-]{5,150}$/.test(id))return Response.json({ok:false,error:'Informe o publish_id retornado pelo teste.'},{status:400});
 try{
 const raw=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('tt_sandbox_session='))?.split('=')[1];
 const b=Buffer.from(raw,'base64url'),d=createDecipheriv('aes-256-gcm',Buffer.from(process.env.TIKTOK_SESSION_SECRET,'hex'),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));
 const s=JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString());
 const r=await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/',{method:'POST',headers:{Authorization:'Bearer '+s.access_token,'Content-Type':'application/json; charset=UTF-8'},body:JSON.stringify({publish_id:id}),cache:'no-store'});
 const data=await r.json();return Response.json({ok:r.ok&&data.error?.code==='ok',status:data.data?.status,fail_reason:data.data?.fail_reason,publicaly_available_post_id:data.data?.publicaly_available_post_id,error:data.error?.code},{status:r.ok?200:400,headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({ok:false,error:'Sessão indisponível. Reconecte o TikTok.'},{status:401});}
}
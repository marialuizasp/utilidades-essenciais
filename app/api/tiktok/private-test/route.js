import {createDecipheriv} from 'node:crypto';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const video='https://bjdcjttjwsmbbytqwvzm.supabase.co/storage/v1/object/public/videos/lavadora-alta-pressao.mp4.mp4';
function session(request){
 const raw=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('tt_sandbox_session='))?.split('=')[1];
 if(!raw)throw Error('Conecte sua conta TikTok novamente.');
 const bytes=Buffer.from(raw,'base64url');
 const decipher=createDecipheriv('aes-256-gcm',Buffer.from(process.env.TIKTOK_SESSION_SECRET,'hex'),bytes.subarray(0,12));
 decipher.setAuthTag(bytes.subarray(12,28));
 return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString());
}
export async function GET(){return new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Teste privado TikTok</title><body style="font:18px Arial;max-width:650px;margin:60px auto;padding:20px"><h1>Teste privado: lavadora de alta pressão</h1><p>Este teste enviará um vídeo real ao TikTok com privacidade Somente eu. A publicação depende do processamento pelo TikTok.</p><form method="post"><button style="padding:15px" type="submit">Enviar vídeo privado de teste</button></form></body>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
export async function POST(request){
 const origin=request.headers.get('origin');if(origin!==new URL(request.url).origin)return Response.json({ok:false,error:'Origem inválida.'},{status:403});
 let s;try{s=session(request);}catch{return Response.json({ok:false,error:'Reconecte o TikTok.'},{status:401});}
 if(Date.now()>s.expires_at-60000)return Response.json({ok:false,error:'Sessão expirada. Reconecte o TikTok e tente novamente.'},{status:401});
 const auth={Authorization:'Bearer '+s.access_token,'Content-Type':'application/json; charset=UTF-8'};
 const info=await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/',{method:'POST',headers:auth,body:'{}',cache:'no-store'}).then(r=>r.json());
 if(info.error?.code!=='ok'||!info.data?.privacy_level_options?.includes('SELF_ONLY'))return Response.json({ok:false,error:'Publicação privada indisponível.'},{status:400});
 const source=await fetch(video,{cache:'no-store'});if(!source.ok)return Response.json({ok:false,error:'Vídeo não acessível.'},{status:400});
 const bytes=Buffer.from(await source.arrayBuffer());if(bytes.length>20000000||bytes.length<1000)return Response.json({ok:false,error:'Vídeo excede 20 MB ou é inválido.'},{status:400});
 const init=await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/',{method:'POST',headers:auth,body:JSON.stringify({post_info:{title:'Lavadora de alta pressão portátil: confira este achadinho! #Achadinhos #UtilidadesEssenciais',privacy_level:'SELF_ONLY',disable_duet:true,disable_comment:true,disable_stitch:true},source_info:{source:'FILE_UPLOAD',video_size:bytes.length,chunk_size:bytes.length,total_chunk_count:1}}),cache:'no-store'}).then(r=>r.json());
 if(init.error?.code!=='ok'||!init.data?.upload_url)return Response.json({ok:false,stage:'init',error:init.error?.code,message:init.error?.message},{status:400});
 const target=new URL(init.data.upload_url);if(target.protocol!=='https:'||!target.hostname.endsWith('.tiktokapis.com'))return Response.json({ok:false,error:'Host de upload inesperado.',publish_id:init.data.publish_id},{status:400});
 const upload=await fetch(target,{method:'PUT',headers:{'Content-Type':'video/mp4','Content-Length':String(bytes.length),'Content-Range':'bytes 0-'+(bytes.length-1)+'/'+bytes.length},body:bytes});
 return Response.json({ok:upload.ok,stage:upload.ok?'uploaded':'upload_failed',publish_id:init.data.publish_id,message:upload.ok?'Upload recebido; confirme processamento antes de repetir.':'Não repita sem verificar o status.',http_status:upload.status},{status:upload.ok?200:502});
}
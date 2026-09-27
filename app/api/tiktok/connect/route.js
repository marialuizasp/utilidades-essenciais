import { randomBytes } from 'node:crypto';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const redirectUri='https://utilidades-essenciais-kappa.vercel.app/api/tiktok/callback';
export async function GET(request){
  if(!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET || !process.env.TIKTOK_SESSION_SECRET) return Response.json({error:'Configure TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET e TIKTOK_SESSION_SECRET na Vercel antes de conectar.'},{status:503});
  const state=randomBytes(32).toString('base64url');
  const url=new URL('https://www.tiktok.com/v2/auth/authorize/');
  url.searchParams.set('client_key',process.env.TIKTOK_CLIENT_KEY);
  url.searchParams.set('response_type','code');
  url.searchParams.set('scope','user.info.basic,video.publish');
  url.searchParams.set('redirect_uri',redirectUri);
  url.searchParams.set('state',state);
  return new Response(null,{status:302,headers:{Location:url.toString(),'Set-Cookie':`tt_oauth_state=${state}; Path=/api/tiktok; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,'Cache-Control':'no-store'}});
}
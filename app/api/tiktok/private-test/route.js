import { adminSessionIsValid } from '../../../../lib/adminAuth';
import { createDecipheriv } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const video = 'https://pub-603881db00f042c08f8b4dc6d9731239.r2.dev/videos/lavadora-alta-pressao.mp4.mp4';
const noStore = { 'Cache-Control': 'no-store' };

function session(request) {
  const raw = request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith('tt_sandbox_session='))?.slice('tt_sandbox_session='.length);
  if (!raw) throw Error('Conecte sua conta TikTok novamente.');
  const bytes = Buffer.from(raw, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(process.env.TIKTOK_SESSION_SECRET, 'hex'), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
}

export async function GET(request) {
  if (!adminSessionIsValid(request)) {
    return Response.json({ ok: false, error: 'Sessão administrativa necessária.' }, { status: 401, headers: noStore });
  }
  return new Response(
    '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Teste privado TikTok</title><body style="font:18px Arial;max-width:650px;margin:60px auto;padding:20px"><h1>Teste privado: lavadora de alta pressão</h1><p>Este teste enviará um vídeo real ao TikTok com privacidade <strong>Somente eu</strong>. O TikTok buscará o arquivo diretamente no Cloudflare R2 verificado.</p><p><code>'+video+'</code></p><form method="post"><button style="padding:15px" type="submit">Enviar vídeo privado de teste</button></form></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8', ...noStore } }
  );
}

export async function POST(request) {
  if (!adminSessionIsValid(request)) {
    return Response.json({ ok: false, error: 'Sessão administrativa necessária.' }, { status: 401, headers: noStore });
  }

  const origin = request.headers.get('origin');
  if (origin !== new URL(request.url).origin) {
    return Response.json({ ok: false, error: 'Origem inválida.' }, { status: 403, headers: noStore });
  }

  let s;
  try {
    s = session(request);
  } catch {
    return Response.json({ ok: false, error: 'Reconecte o TikTok.' }, { status: 401, headers: noStore });
  }

  if (Date.now() > Number(s.expires_at || 0) - 60000) {
    return Response.json({ ok: false, error: 'Sessão expirada. Reconecte o TikTok e tente novamente.' }, { status: 401, headers: noStore });
  }

  const auth = {
    Authorization: 'Bearer ' + s.access_token,
    'Content-Type': 'application/json; charset=UTF-8',
  };

  const infoResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
    method: 'POST',
    headers: auth,
    body: '{}',
    cache: 'no-store',
  });
  const info = await infoResponse.json();

  if (!infoResponse.ok || info.error?.code !== 'ok' || !info.data?.privacy_level_options?.includes('SELF_ONLY')) {
    return Response.json(
      { ok: false, stage: 'creator_info', error: info.error?.code || 'creator_info_failed', message: info.error?.message || 'Publicação privada indisponível.' },
      { status: 400, headers: noStore }
    );
  }

  const initResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      post_info: {
        title: 'Lavadora de alta pressão portátil: confira este achadinho! #Achadinhos #UtilidadesEssenciais',
        privacy_level: 'SELF_ONLY',
        disable_duet: true,
        disable_comment: true,
        disable_stitch: true,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: video,
      },
    }),
    cache: 'no-store',
  });

  const init = await initResponse.json();
  if (!initResponse.ok || init.error?.code !== 'ok' || !init.data?.publish_id) {
    return Response.json(
      { ok: false, stage: 'init', error: init.error?.code || 'init_failed', message: init.error?.message || 'Não foi possível iniciar a publicação.' },
      { status: 400, headers: noStore }
    );
  }

  return Response.json(
    {
      ok: true,
      stage: 'initialized',
      publish_id: init.data.publish_id,
      source: 'PULL_FROM_URL',
      video_url: video,
      privacy_level: 'SELF_ONLY',
      message: 'TikTok iniciou a importação do vídeo do R2. Verifique o status antes de repetir.',
    },
    { headers: noStore }
  );
}

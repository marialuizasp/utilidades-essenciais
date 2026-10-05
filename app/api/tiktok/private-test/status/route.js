import { adminSessionIsValid } from '../../../../../lib/adminAuth';
import { createDecipheriv } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

function cookieValue(request, name) {
  const pair = (request.headers.get('cookie') || '')
    .split(';')
    .map(x => x.trim())
    .find(x => x.startsWith(name + '='));
  if (!pair) return '';
  return pair.slice(name.length + 1);
}

function openSession(raw) {
  const secret = process.env.TIKTOK_SESSION_SECRET || '';
  if (!/^([a-f0-9]{64})$/i.test(secret)) throw new Error('config');
  const b = Buffer.from(raw, 'base64url');
  if (b.length < 29) throw new Error('invalid_cookie');
  const d = createDecipheriv('aes-256-gcm', Buffer.from(secret, 'hex'), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString());
}

export async function GET(request) {
  if (!adminSessionIsValid(request)) {
    return Response.json({ ok: false, error: 'Sessão administrativa necessária.' }, { status: 401, headers: noStore });
  }

  const id = new URL(request.url).searchParams.get('publish_id');
  if (!id || !/^v_pub_[A-Za-z0-9_~.\-]{5,150}$/.test(id)) {
    return Response.json({ ok: false, error: 'Informe o publish_id retornado pelo teste.' }, { status: 400, headers: noStore });
  }

  const raw = cookieValue(request, 'tt_sandbox_session');
  if (!raw) {
    return Response.json(
      { ok: false, error: 'Sessão TikTok não recebida neste navegador. Reconecte o TikTok e consulte este mesmo publish_id; não reenvie o vídeo.' },
      { status: 401, headers: noStore }
    );
  }

  let s;
  try {
    s = openSession(raw);
  } catch (e) {
    return Response.json(
      { ok: false, error: e.message === 'config' ? 'Configuração da sessão TikTok inválida.' : 'Sessão TikTok inválida. Reconecte a conta e tente novamente.' },
      { status: e.message === 'config' ? 503 : 401, headers: noStore }
    );
  }

  try {
    const response = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + s.access_token,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id: id }),
      cache: 'no-store',
    });
    const data = await response.json();
    return Response.json(
      {
        ok: response.ok && data.error?.code === 'ok',
        status: data.data?.status,
        fail_reason: data.data?.fail_reason,
        publicaly_available_post_id: data.data?.publicaly_available_post_id,
        error: data.error?.code,
        message: data.error?.message,
      },
      { status: response.ok ? 200 : 400, headers: noStore }
    );
  } catch {
    return Response.json({ ok: false, error: 'Falha temporária ao consultar o status no TikTok.' }, { status: 502, headers: noStore });
  }
}

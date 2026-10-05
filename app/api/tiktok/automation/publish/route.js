import { automationSecretIsValid, getTikTokAutomationSession } from '../../../../../lib/tiktokAutomationSession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };
const R2_PREFIX = 'https://pub-603881db00f042c08f8b4dc6d9731239.r2.dev/';

function bool(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const s = String(value ?? '').trim().toLowerCase();
  if (['sim','true','1','yes'].includes(s)) return true;
  if (['nao','não','false','0','no'].includes(s)) return false;
  return fallback;
}

export async function POST(request) {
  if (!automationSecretIsValid(request)) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401, headers: noStore });
  }

  let payload;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > 25000) {
      return Response.json({ ok: false, error: 'payload_too_large' }, { status: 413, headers: noStore });
    }
    payload = JSON.parse(raw || '{}');
  } catch {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: noStore });
  }

  const videoUrl = String(payload.video_url || '').trim();
  const title = String(payload.title || '').trim();
  const privacy = String(payload.privacy_level || 'SELF_ONLY').trim();

  if (!videoUrl.startsWith(R2_PREFIX) || !/^https:\/\//i.test(videoUrl)) {
    return Response.json({ ok: false, error: 'invalid_video_url', message: 'A URL do vídeo deve usar o prefixo R2 verificado.' }, { status: 400, headers: noStore });
  }
  if (title.length > 2200) {
    return Response.json({ ok: false, error: 'caption_too_long', message: 'A legenda excede o limite do TikTok.' }, { status: 400, headers: noStore });
  }

  try {
    const session = await getTikTokAutomationSession();
    const auth = {
      Authorization: 'Bearer ' + session.access_token,
      'Content-Type': 'application/json; charset=UTF-8',
    };

    const infoResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
      method: 'POST',
      headers: auth,
      body: '{}',
      cache: 'no-store',
    });
    const info = await infoResponse.json();

    if (!infoResponse.ok || info.error?.code !== 'ok') {
      return Response.json({
        ok: false,
        error: info.error?.code || 'creator_info_failed',
        message: info.error?.message || 'Não foi possível consultar a conta TikTok.',
      }, { status: 400, headers: noStore });
    }

    const options = info.data?.privacy_level_options || [];
    if (!options.includes(privacy)) {
      return Response.json({
        ok: false,
        error: 'privacy_not_available',
        message: 'A privacidade solicitada não está disponível para esta conta/ambiente.',
        privacy_level_options: options,
      }, { status: 409, headers: noStore });
    }

    const allowComment = bool(payload.allow_comment, true);
    const allowDuet = bool(payload.allow_duet, true);
    const allowStitch = bool(payload.allow_stitch, true);

    const initBody = {
      post_info: {
        title,
        privacy_level: privacy,
        disable_comment: Boolean(info.data?.comment_disabled) || !allowComment,
        disable_duet: Boolean(info.data?.duet_disabled) || !allowDuet,
        disable_stitch: Boolean(info.data?.stitch_disabled) || !allowStitch,
        brand_organic_toggle: bool(payload.brand_organic, false),
        brand_content_toggle: bool(payload.brand_content, false),
        is_aigc: bool(payload.is_aigc, false),
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: videoUrl,
      },
    };

    const initResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify(initBody),
      cache: 'no-store',
    });
    const init = await initResponse.json();

    if (!initResponse.ok || init.error?.code !== 'ok' || !init.data?.publish_id) {
      return Response.json({
        ok: false,
        error: init.error?.code || 'publish_init_failed',
        message: init.error?.message || 'Não foi possível iniciar a publicação.',
      }, { status: 400, headers: noStore });
    }

    return Response.json({
      ok: true,
      publish_id: init.data.publish_id,
      privacy_level: privacy,
      username: info.data?.creator_username,
      source: 'PULL_FROM_URL',
    }, { headers: noStore });
  } catch (error) {
    console.error('TikTok automation publish:', error.message);
    const reconnect = ['not_connected','session_invalid','refresh_failed'].includes(error.message);
    return Response.json({
      ok: false,
      error: reconnect ? 'reconnect_required' : 'automation_publish_failed',
      message: reconnect ? 'Reconecte o TikTok.' : 'Falha temporária ao iniciar a publicação.',
    }, { status: reconnect ? 401 : 500, headers: noStore });
  }
}

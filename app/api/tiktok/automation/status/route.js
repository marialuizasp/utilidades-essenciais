import { automationSecretIsValid, getTikTokAutomationSession } from '../../../../../lib/tiktokAutomationSession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

export async function POST(request) {
  if (!automationSecretIsValid(request)) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401, headers: noStore });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: noStore });
  }

  const publishId = String(payload.publish_id || '').trim();
  if (!/^v_pub_[A-Za-z0-9_~.\-]{5,150}$/.test(publishId)) {
    return Response.json({ ok: false, error: 'invalid_publish_id' }, { status: 400, headers: noStore });
  }

  try {
    const session = await getTikTokAutomationSession();
    const response = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id: publishId }),
      cache: 'no-store',
    });
    const data = await response.json();

    if (!response.ok || data.error?.code !== 'ok') {
      return Response.json({
        ok: false,
        error: data.error?.code || 'status_failed',
        message: data.error?.message || 'Não foi possível consultar o status.',
      }, { status: 400, headers: noStore });
    }

    return Response.json({
      ok: true,
      status: data.data?.status || null,
      fail_reason: data.data?.fail_reason || null,
      publicaly_available_post_id: data.data?.publicaly_available_post_id || null,
    }, { headers: noStore });
  } catch (error) {
    console.error('TikTok automation status:', error.message);
    const reconnect = ['not_connected','session_invalid','refresh_failed'].includes(error.message);
    return Response.json({
      ok: false,
      error: reconnect ? 'reconnect_required' : 'automation_status_failed',
      message: reconnect ? 'Reconecte o TikTok.' : 'Falha temporária ao consultar a publicação.',
    }, { status: reconnect ? 401 : 500, headers: noStore });
  }
}

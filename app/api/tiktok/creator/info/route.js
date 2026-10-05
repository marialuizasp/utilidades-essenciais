import { getTikTokCreatorApiSession } from '../../../../../lib/tiktokCreatorSession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

export async function GET(request) {
  try {
    const { creator, session } = await getTikTokCreatorApiSession(request);

    const response = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + session.access_token,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: '{}',
        cache: 'no-store',
      }
    );

    const data = await response.json();

    if (!response.ok || data.error?.code !== 'ok') {
      const code = data.error?.code || 'creator_info_failed';
      return Response.json(
        {
          ok: false,
          error: code,
          message:
            data.error?.message ||
            'Não foi possível consultar as opções atuais da conta TikTok.',
        },
        { status: response.status || 400, headers: noStore }
      );
    }

    return Response.json(
      {
        ok: true,
        creator: {
          username: data.data?.creator_username || creator.username || '',
          nickname: data.data?.creator_nickname || creator.nickname || '',
          avatar_url: data.data?.creator_avatar_url || '',
          privacy_level_options: data.data?.privacy_level_options || [],
          comment_disabled: Boolean(data.data?.comment_disabled),
          duet_disabled: Boolean(data.data?.duet_disabled),
          stitch_disabled: Boolean(data.data?.stitch_disabled),
          max_video_post_duration_sec: Number(
            data.data?.max_video_post_duration_sec || 0
          ),
        },
      },
      { headers: noStore }
    );
  } catch (error) {
    console.error('TikTok creator info:', error.message);
    const reconnect = [
      'creator_not_connected',
      'session_invalid',
      'refresh_failed',
    ].includes(error.message);

    return Response.json(
      {
        ok: false,
        error: reconnect ? 'reconnect_required' : 'creator_info_failed',
        message: reconnect
          ? 'Reconecte sua conta TikTok para continuar.'
          : 'Não foi possível carregar as opções da conta TikTok.',
      },
      { status: reconnect ? 401 : 500, headers: noStore }
    );
  }
}

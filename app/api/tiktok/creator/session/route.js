import {
  clearTikTokCreatorCookie,
  tikTokCreatorFromRequest,
} from '../../../../../lib/tiktokCreatorAuth';
import {
  loadTikTokCreator,
  touchTikTokCreator,
} from '../../../../../lib/tiktokCreatorStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

export async function GET(request) {
  const session = tikTokCreatorFromRequest(request);

  if (!session?.open_id) {
    return Response.json(
      { connected: false },
      { status: 200, headers: noStore }
    );
  }

  const creator = await loadTikTokCreator(session.open_id);

  if (!creator || creator.status !== 'ATIVO') {
    const response = Response.json(
      { connected: false },
      { status: 200, headers: noStore }
    );
    response.headers.append('Set-Cookie', clearTikTokCreatorCookie());
    return response;
  }

  touchTikTokCreator(session.open_id).catch(error =>
    console.error('TikTok creator touch:', error.message)
  );

  return Response.json(
    {
      connected: true,
      creator: {
        username: creator.username,
        nickname: creator.nickname,
        connectedAt: creator.connectedAt,
        updatedAt: creator.updatedAt,
      },
    },
    { headers: noStore }
  );
}

export async function DELETE() {
  const response = Response.json(
    { ok: true },
    { headers: noStore }
  );
  response.headers.append('Set-Cookie', clearTikTokCreatorCookie());
  return response;
}

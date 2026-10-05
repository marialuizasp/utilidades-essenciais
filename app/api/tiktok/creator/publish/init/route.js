import { getTikTokCreatorApiSession } from '../../../../../../lib/tiktokCreatorSession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };
const ALLOWED_MIME = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const MAX_VIDEO_SIZE = 4_000_000_000;
const MULTIPART_THRESHOLD = 64_000_000;
const MULTIPART_CHUNK = 32_000_000;

function clean(value) {
  return String(value ?? '').trim();
}

function planChunks(size) {
  if (size <= MULTIPART_THRESHOLD) {
    return { chunkSize: size, totalChunkCount: 1 };
  }
  return {
    chunkSize: MULTIPART_CHUNK,
    totalChunkCount: Math.floor(size / MULTIPART_CHUNK),
  };
}

export async function POST(request) {
  let payload;

  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > 25_000) {
      return Response.json(
        { ok: false, error: 'payload_too_large' },
        { status: 413, headers: noStore }
      );
    }
    payload = JSON.parse(raw || '{}');
  } catch {
    return Response.json(
      { ok: false, error: 'invalid_json' },
      { status: 400, headers: noStore }
    );
  }

  if (payload.consent !== true) {
    return Response.json(
      {
        ok: false,
        error: 'consent_required',
        message: 'Confirme o consentimento antes de enviar o vídeo ao TikTok.',
      },
      { status: 400, headers: noStore }
    );
  }

  const title = clean(payload.title);
  const privacy = clean(payload.privacy_level);
  const mimeType = clean(payload.mime_type).toLowerCase();
  const videoSize = Number(payload.video_size);
  const durationSec = Number(payload.duration_sec);

  if (title.length > 2200) {
    return Response.json(
      {
        ok: false,
        error: 'caption_too_long',
        message: 'A legenda excede o limite do TikTok.',
      },
      { status: 400, headers: noStore }
    );
  }

  if (!privacy) {
    return Response.json(
      {
        ok: false,
        error: 'privacy_required',
        message: 'Selecione manualmente a privacidade do post.',
      },
      { status: 400, headers: noStore }
    );
  }

  if (!ALLOWED_MIME.has(mimeType)) {
    return Response.json(
      {
        ok: false,
        error: 'unsupported_video_type',
        message: 'Use um vídeo MP4, MOV ou WebM.',
      },
      { status: 400, headers: noStore }
    );
  }

  if (!Number.isFinite(videoSize) || videoSize < 1 || videoSize > MAX_VIDEO_SIZE) {
    return Response.json(
      {
        ok: false,
        error: 'invalid_video_size',
        message: 'O vídeo precisa ter até 4 GB.',
      },
      { status: 400, headers: noStore }
    );
  }

  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return Response.json(
      {
        ok: false,
        error: 'invalid_duration',
        message: 'Não foi possível validar a duração do vídeo.',
      },
      { status: 400, headers: noStore }
    );
  }

  const commercialDisclosure = payload.commercial_disclosure === true;
  const brandOrganic = commercialDisclosure && payload.brand_organic === true;
  const brandContent = commercialDisclosure && payload.brand_content === true;

  if (commercialDisclosure && !brandOrganic && !brandContent) {
    return Response.json(
      {
        ok: false,
        error: 'commercial_disclosure_incomplete',
        message:
          'Indique se o conteúdo promove sua marca, uma marca de terceiros ou ambos.',
      },
      { status: 400, headers: noStore }
    );
  }

  if (brandContent && privacy === 'SELF_ONLY') {
    return Response.json(
      {
        ok: false,
        error: 'branded_content_private',
        message: 'Conteúdo de marca não pode usar visibilidade “Somente eu”.',
      },
      { status: 400, headers: noStore }
    );
  }

  try {
    const { session } = await getTikTokCreatorApiSession(request);
    const headers = {
      Authorization: 'Bearer ' + session.access_token,
      'Content-Type': 'application/json; charset=UTF-8',
    };

    const infoResponse = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
      {
        method: 'POST',
        headers,
        body: '{}',
        cache: 'no-store',
      }
    );
    const info = await infoResponse.json();

    if (!infoResponse.ok || info.error?.code !== 'ok') {
      const code = info.error?.code || 'creator_info_failed';
      return Response.json(
        {
          ok: false,
          error: code,
          message:
            info.error?.message ||
            'Não foi possível validar a conta TikTok neste momento.',
        },
        { status: infoResponse.status || 400, headers: noStore }
      );
    }

    const options = info.data?.privacy_level_options || [];
    if (!options.includes(privacy)) {
      return Response.json(
        {
          ok: false,
          error: 'privacy_not_available',
          message:
            'A opção de privacidade selecionada não está disponível para esta conta.',
          privacy_level_options: options,
        },
        { status: 409, headers: noStore }
      );
    }

    const maxDuration = Number(info.data?.max_video_post_duration_sec || 0);
    if (maxDuration > 0 && durationSec > maxDuration + 0.25) {
      return Response.json(
        {
          ok: false,
          error: 'duration_too_long',
          message:
            'Este vídeo excede a duração máxima permitida para a conta conectada.',
          max_video_post_duration_sec: maxDuration,
        },
        { status: 400, headers: noStore }
      );
    }

    const { chunkSize, totalChunkCount } = planChunks(videoSize);

    const initBody = {
      post_info: {
        title,
        privacy_level: privacy,
        disable_comment:
          Boolean(info.data?.comment_disabled) || payload.allow_comment !== true,
        disable_duet:
          Boolean(info.data?.duet_disabled) || payload.allow_duet !== true,
        disable_stitch:
          Boolean(info.data?.stitch_disabled) || payload.allow_stitch !== true,
        brand_organic_toggle: brandOrganic,
        brand_content_toggle: brandContent,
        is_aigc: payload.is_aigc === true,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: videoSize,
        chunk_size: chunkSize,
        total_chunk_count: totalChunkCount,
      },
    };

    const initResponse = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(initBody),
        cache: 'no-store',
      }
    );
    const init = await initResponse.json();

    if (
      !initResponse.ok ||
      init.error?.code !== 'ok' ||
      !init.data?.publish_id ||
      !init.data?.upload_url
    ) {
      const code = init.error?.code || 'publish_init_failed';
      return Response.json(
        {
          ok: false,
          error: code,
          message:
            init.error?.message ||
            'O TikTok não conseguiu iniciar o envio deste vídeo.',
        },
        { status: initResponse.status || 400, headers: noStore }
      );
    }

    return Response.json(
      {
        ok: true,
        publish_id: init.data.publish_id,
        upload_url: init.data.upload_url,
        upload: {
          video_size: videoSize,
          chunk_size: chunkSize,
          total_chunk_count: totalChunkCount,
          mime_type: mimeType,
        },
        creator: {
          username: info.data?.creator_username || '',
          nickname: info.data?.creator_nickname || '',
        },
      },
      { headers: noStore }
    );
  } catch (error) {
    console.error('TikTok creator publish init:', error.message);
    const reconnect = [
      'creator_not_connected',
      'session_invalid',
      'refresh_failed',
    ].includes(error.message);

    return Response.json(
      {
        ok: false,
        error: reconnect ? 'reconnect_required' : 'publish_init_failed',
        message: reconnect
          ? 'Reconecte sua conta TikTok para continuar.'
          : 'Não foi possível iniciar o envio ao TikTok.',
      },
      { status: reconnect ? 401 : 500, headers: noStore }
    );
  }
}

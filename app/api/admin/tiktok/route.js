import { createSign, randomBytes } from 'node:crypto';
import { adminSessionIsValid } from '../../../../lib/adminAuth';
import { getTikTokAutomationSession } from '../../../../lib/tiktokAutomationSession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SHEET_ID = '19xpC1aQRDEhqHK6e1fRR3fDteX6OA6U6MfqiTcPQ7Yk';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets/';
const R2_PREFIX = 'https://pub-603881db00f042c08f8b4dc6d9731239.r2.dev/';
const json = (body, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const clean = value => String(value ?? '').trim();

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

async function googleAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('Conta de serviço do Google não configurada.');

  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'RS256', typ: 'JWT' });
  const claim = encode({
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });

  const input = header + '.' + claim;
  const signer = createSign('RSA-SHA256');
  signer.update(input);
  signer.end();
  const assertion = input + '.' + signer.sign(key).toString('base64url');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Falha ao autenticar no Google Sheets.');
  return (await response.json()).access_token;
}

async function sheetsRequest(token, path, options = {}) {
  const response = await fetch(SHEETS + SHEET_ID + path, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    console.error('TikTok admin Sheets:', response.status, await response.text());
    throw new Error('Não foi possível gravar o agendamento na planilha.');
  }

  return response.json();
}

function formatSaoPaulo(date = new Date()) {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.day}/${map.month}/${map.year} ${map.hour}:${map.minute}:${map.second}`;
}

async function creatorInfo() {
  const session = await getTikTokAutomationSession();
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
    const error = new Error(data.error?.message || 'Não foi possível consultar a conta TikTok.');
    error.code = data.error?.code || 'creator_info_failed';
    throw error;
  }
  return data.data || {};
}

function publicCreatorInfo(info) {
  return {
    creator_username: info.creator_username || '',
    creator_nickname: info.creator_nickname || '',
    creator_avatar_url: info.creator_avatar_url || '',
    privacy_level_options: info.privacy_level_options || [],
    comment_disabled: Boolean(info.comment_disabled),
    duet_disabled: Boolean(info.duet_disabled),
    stitch_disabled: Boolean(info.stitch_disabled),
    max_video_post_duration_sec: Number(info.max_video_post_duration_sec || 0),
  };
}

export async function POST(request) {
  try {
    if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
    if (!adminSessionIsValid(request)) return json({ error: 'Sessão administrativa expirada ou inválida.' }, 401);

    const contentType = (request.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('application/json')) {
      return json({ error: 'Content-Type não suportado.' }, 415);
    }

    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > 30_000) {
      return json({ error: 'Requisição muito grande.' }, 413);
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ error: 'JSON inválido.' }, 400);
    }

    if (payload.action === 'creatorInfo') {
      return json({ ok: true, creator: publicCreatorInfo(await creatorInfo()) });
    }

    if (payload.action !== 'schedule') {
      return json({ error: 'Operação inválida.' }, 400);
    }

    if (payload.consent !== true) {
      return json({ error: 'Confirme que revisou o conteúdo antes de agendar.' }, 400);
    }

    const videoUrl = clean(payload.videoUrl);
    const caption = clean(payload.caption);
    const date = clean(payload.date);
    const time = clean(payload.time);
    const privacy = clean(payload.privacy || 'SELF_ONLY');

    if (!videoUrl.startsWith(R2_PREFIX)) {
      return json({ error: 'Use uma URL de vídeo do R2 verificado do Utilidades Essenciais.' }, 400);
    }
    if (!caption || caption.length > 2200) {
      return json({ error: 'A legenda deve ter entre 1 e 2200 caracteres.' }, 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return json({ error: 'Informe data e horário válidos.' }, 400);
    }

    const info = await creatorInfo();
    const privacyOptions = info.privacy_level_options || [];
    if (!privacyOptions.includes(privacy)) {
      return json({
        error: 'A privacidade selecionada não está disponível para esta conta TikTok.',
        privacy_level_options: privacyOptions,
      }, 409);
    }

    const yesNo = value => value === true ? 'Sim' : 'Não';
    const comments = !info.comment_disabled && payload.comments === true;
    const duet = !info.duet_disabled && payload.duet === true;
    const stitch = !info.stitch_disabled && payload.stitch === true;
    const createdAt = formatSaoPaulo();
    const id = 'UE_TT_' + date.replaceAll('-', '') + '_' + time.replace(':', '') + '_' + randomBytes(3).toString('hex').toUpperCase();

    const row = [
      id,
      clean(payload.productId),
      date,
      time,
      caption,
      videoUrl,
      privacy,
      yesNo(comments),
      yesNo(duet),
      yesNo(stitch),
      yesNo(payload.brandOrganic === true),
      yesNo(payload.brandContent === true),
      yesNo(payload.isAigc === true),
      'Pendente',
      '',
      '',
      0,
      '',
      'Agendado pelo painel TikTok com confirmação explícita.',
      createdAt,
    ];

    const token = await googleAccessToken();
    await sheetsRequest(
      token,
      '/values/' + encodeURIComponent('TikTok!A:T') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',
      {
        method: 'POST',
        body: JSON.stringify({ majorDimension: 'ROWS', values: [row] }),
      }
    );

    return json({
      ok: true,
      id,
      status: 'Pendente',
      scheduled_for: date + ' ' + time,
      creator: publicCreatorInfo(info),
    });
  } catch (error) {
    console.error('Admin TikTok:', error.message);
    const reconnect = ['not_connected', 'session_invalid', 'refresh_failed'].includes(error.message);
    return json({
      error: reconnect ? 'Reconecte o TikTok antes de continuar.' : (error.message || 'Falha no painel TikTok.'),
      code: error.code || (reconnect ? 'reconnect_required' : 'admin_tiktok_failed'),
    }, reconnect ? 401 : 500);
  }
}

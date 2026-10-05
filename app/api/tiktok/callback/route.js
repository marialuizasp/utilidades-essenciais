import { saveTikTokAutomationSession } from '../../../../lib/tiktokAutomationStore';
import { saveTikTokCreator } from '../../../../lib/tiktokCreatorStore';
import {
  createTikTokCreatorToken,
  tikTokCreatorCookie,
} from '../../../../lib/tiktokCreatorAuth';
import { randomBytes, createCipheriv, timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const redirectUri = 'https://utilidades-essenciais-kappa.vercel.app/api/tiktok/callback';

function htmlResult(message, success = false, backHref = '/admin/produtos') {
  return new Response(
    '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Conexão TikTok</title><body style="font:18px Arial,sans-serif;max-width:620px;margin:80px auto;padding:20px">' +
      '<h1>' + (success ? 'TikTok conectado' : 'Não foi possível conectar o TikTok') + '</h1>' +
      '<p>' + message + '</p><p><a href="' + backHref + '">Continuar</a></p></body></html>',
    {
      status: success ? 200 : 400,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  );
}

function cookieValue(request, name) {
  return (request.headers.get('cookie') || '')
    .split(';')
    .map(value => value.trim())
    .find(value => value.startsWith(name + '='))
    ?.slice(name.length + 1) || '';
}

function stateMatches(state, cookie) {
  if (!state || !cookie) return false;
  const a = Buffer.from(state);
  const b = Buffer.from(cookie);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function fetchCreatorInfo(accessToken) {
  const response = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: '{}',
      cache: 'no-store',
    }
  );
  const data = await response.json();
  if (!response.ok || data.error?.code !== 'ok') {
    return { username: '', nickname: '' };
  }
  return {
    username: String(data.data?.creator_username || ''),
    nickname: String(data.data?.creator_nickname || ''),
  };
}

export async function GET(request) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code') || '';

  const adminState = cookieValue(request, 'tt_oauth_state');
  const creatorState = cookieValue(request, 'tt_creator_oauth_state');

  const creatorMode = stateMatches(state, creatorState);
  const adminMode = !creatorMode && stateMatches(state, adminState);

  if (!creatorMode && !adminMode) {
    return htmlResult(
      'A autorização expirou ou não foi iniciada neste navegador. Tente novamente.',
      false,
      '/tiktok'
    );
  }

  if (url.searchParams.get('error')) {
    return htmlResult(
      'O TikTok não autorizou o acesso. Verifique as permissões e tente novamente.',
      false,
      creatorMode ? '/tiktok' : '/admin/produtos'
    );
  }

  if (!code) {
    return htmlResult(
      'O TikTok não retornou o código de autorização.',
      false,
      creatorMode ? '/tiktok' : '/admin/produtos'
    );
  }

  const key = process.env.TIKTOK_CLIENT_KEY;
  const secret = process.env.TIKTOK_CLIENT_SECRET;
  const sessionSecret = process.env.TIKTOK_SESSION_SECRET;

  if (!key || !secret || !sessionSecret || !/^([a-f0-9]{64})$/i.test(sessionSecret)) {
    return htmlResult(
      'A integração TikTok está temporariamente indisponível.',
      false,
      creatorMode ? '/tiktok' : '/admin/produtos'
    );
  }

  try {
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-store',
      },
      body: new URLSearchParams({
        client_key: key,
        client_secret: secret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
      cache: 'no-store',
    });

    const data = await tokenResponse.json();

    if (!tokenResponse.ok || !data.access_token || !data.refresh_token || !data.open_id) {
      const rawCode = String(data.error || data.error_code || data.code || 'unknown');
      const safeCode = /^[a-zA-Z0-9_.-]{1,80}$/.test(rawCode) ? rawCode : 'unknown';
      console.error('TikTok OAuth exchange failed:', {
        httpStatus: tokenResponse.status,
        errorCode: safeCode,
        requestId: typeof data.log_id === 'string' ? data.log_id.slice(0, 100) : undefined,
        missingAccessToken: !data.access_token,
        missingRefreshToken: !data.refresh_token,
        missingOpenId: !data.open_id,
      });
      return htmlResult(
        'O TikTok recusou a autorização. Código: ' + safeCode + '.',
        false,
        creatorMode ? '/tiktok' : '/admin/produtos'
      );
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv(
      'aes-256-gcm',
      Buffer.from(sessionSecret, 'hex'),
      iv
    );

    const payload = JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      open_id: data.open_id,
      expires_at: Date.now() + Number(data.expires_in || 0) * 1000,
      refresh_expires_at:
        Date.now() + Number(data.refresh_expires_in || 0) * 1000,
    });

    const encrypted = Buffer.concat([
      cipher.update(payload, 'utf8'),
      cipher.final(),
    ]);
    const value = Buffer.concat([
      iv,
      cipher.getAuthTag(),
      encrypted,
    ]).toString('base64url');

    if (value.length > 3700) {
      return htmlResult(
        'A sessão retornada pelo TikTok é muito grande para armazenar com segurança.',
        false,
        creatorMode ? '/tiktok' : '/admin/produtos'
      );
    }

    if (creatorMode) {
      const profile = await fetchCreatorInfo(data.access_token);

      await saveTikTokCreator({
        openId: data.open_id,
        username: profile.username,
        nickname: profile.nickname,
        encryptedSession: value,
      });

      const creatorToken = createTikTokCreatorToken(data.open_id);
      const response = new Response(null, {
        status: 302,
        headers: {
          Location: '/tiktok?connected=1',
          'Cache-Control': 'no-store',
        },
      });

      response.headers.append(
        'Set-Cookie',
        'tt_creator_oauth_state=; Path=/api/tiktok; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
      );
      response.headers.append(
        'Set-Cookie',
        tikTokCreatorCookie(creatorToken)
      );
      return response;
    }

    await saveTikTokAutomationSession(value);

    const response = htmlResult(
      'Sua conta foi autorizada no Sandbox e a sessão da automação foi salva com segurança.',
      true,
      '/admin/tiktok'
    );

    response.headers.append(
      'Set-Cookie',
      'tt_oauth_state=; Path=/api/tiktok; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
    );
    response.headers.append(
      'Set-Cookie',
      `tt_sandbox_session=${value}; Path=/api/tiktok; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
    );

    return response;
  } catch (error) {
    console.error('TikTok OAuth callback:', error.message);
    return htmlResult(
      'Falha temporária na conexão com o TikTok. Tente novamente.',
      false,
      creatorMode ? '/tiktok' : '/admin/tiktok'
    );
  }
}

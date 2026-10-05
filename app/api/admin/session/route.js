import {
  adminSessionCookie,
  clearAdminSessionCookie,
  clientKey,
  authGate,
  recordAuthFailure,
  clearAuthFailures,
  passwordMatches,
  createAdminSessionToken,
  adminSessionIsValid,
} from '../../../../lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200, headers = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function GET(request) {
  if (!sameOrigin(request)) return json({ authenticated: false }, 403);
  return json({ authenticated: adminSessionIsValid(request) });
}

export async function POST(request) {
  try {
    if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);

    const contentType = (request.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('application/json')) {
      return json({ error: 'Content-Type não suportado.' }, 415);
    }

    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > 10_000) {
      return json({ error: 'Requisição muito grande.' }, 413);
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ error: 'JSON inválido.' }, 400);
    }

    const requester = clientKey(request);
    const gate = authGate(requester);
    if (gate.blocked) {
      return json(
        { error: 'Muitas tentativas de acesso. Tente novamente em alguns minutos.' },
        429,
        { 'Retry-After': String(gate.retryAfter) },
      );
    }

    if (!passwordMatches(payload.password)) {
      const afterFailure = recordAuthFailure(requester);
      if (afterFailure.blocked) {
        return json(
          { error: 'Muitas tentativas de acesso. Tente novamente em alguns minutos.' },
          429,
          { 'Retry-After': String(afterFailure.retryAfter) },
        );
      }
      return json({ error: 'Senha administrativa inválida ou não configurada.' }, 401);
    }

    clearAuthFailures(requester);
    const token = createAdminSessionToken();
    return json(
      { authenticated: true, expiresIn: 3600 },
      200,
      { 'Set-Cookie': adminSessionCookie(token) },
    );
  } catch (error) {
    console.error('Admin session:', error);
    return json({ error: 'Não foi possível iniciar a sessão administrativa.' }, 500);
  }
}

export async function DELETE(request) {
  if (!sameOrigin(request)) return json({ ok: false }, 403);
  return json({ ok: true }, 200, { 'Set-Cookie': clearAdminSessionCookie() });
}

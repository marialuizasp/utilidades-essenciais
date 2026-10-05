'use client';

import { useEffect, useMemo, useState } from 'react';

const R2_PREFIX = 'https://pub-603881db00f042c08f8b4dc6d9731239.r2.dev/';

function defaultDateTime() {
  const now = new Date(Date.now() + 20 * 60 * 1000);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return {
    date: local.toISOString().slice(0, 10),
    time: local.toISOString().slice(11, 16),
  };
}

const initialTime = defaultDateTime();

const blankForm = () => ({
  productId: '',
  videoUrl: '',
  caption: '',
  date: initialTime.date,
  time: initialTime.time,
  privacy: 'SELF_ONLY',
  comments: false,
  duet: false,
  stitch: false,
  brandOrganic: false,
  brandContent: false,
  isAigc: false,
  consent: false,
});

export default function AdminTikTok() {
  const [authenticated, setAuthenticated] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creator, setCreator] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const callTikTok = async payload => {
    const response = await fetch('/api/admin/tiktok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a operação.');
    return result;
  };

  const loadCreator = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const result = await callTikTok({ action: 'creatorInfo' });
      setCreator(result.creator);
      const options = result.creator?.privacy_level_options || [];
      setForm(prev => ({
        ...prev,
        privacy: options.includes(prev.privacy)
          ? prev.privacy
          : (options.includes('SELF_ONLY') ? 'SELF_ONLY' : (options[0] || '')),
        comments: result.creator?.comment_disabled ? false : prev.comments,
        duet: result.creator?.duet_disabled ? false : prev.duet,
        stitch: result.creator?.stitch_disabled ? false : prev.stitch,
      }));
    } catch (error) {
      setFeedback({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/admin/session', { cache: 'no-store' });
        const result = await response.json();
        setAuthenticated(Boolean(result.authenticated));
        if (result.authenticated) {
          setTimeout(loadCreator, 0);
        }
      } catch {
        setAuthenticated(false);
      }
    })();
  }, []);

  const connectAdmin = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível iniciar a sessão.');
      setAuthenticated(true);
      setPassword('');
      await loadCreator();
    } catch (error) {
      setFeedback({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    try { await fetch('/api/admin/session', { method: 'DELETE' }); } catch {}
    setAuthenticated(false);
    setCreator(null);
    setFeedback(null);
    setPassword('');
  };

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const videoValid = useMemo(
    () => form.videoUrl.trim().startsWith(R2_PREFIX),
    [form.videoUrl]
  );

  const submit = async event => {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const result = await callTikTok({ action: 'schedule', ...form });
      setFeedback({
        success:
          'Agendamento criado com sucesso. ID: ' +
          result.id +
          '. A automação verificará a fila a cada 15 minutos.',
      });
      setForm(prev => ({
        ...blankForm(),
        privacy: creator?.privacy_level_options?.includes('SELF_ONLY')
          ? 'SELF_ONLY'
          : (creator?.privacy_level_options?.[0] || prev.privacy),
      }));
    } catch (error) {
      setFeedback({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (authenticated === null) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
        <div className="mx-auto max-w-3xl">Carregando painel TikTok...</div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen overflow-y-auto bg-slate-50 px-4 py-8 text-slate-900 sm:px-8"
      style={{ minHeight: '100dvh', fontFamily: 'Arial, sans-serif' }}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap gap-3 text-sm">
            <a href="/" className="text-emerald-700 hover:underline">← Vitrine</a>
            <a href="/admin/produtos" className="text-emerald-700 hover:underline">Cadastro de produtos</a>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Utilidades Essenciais · Administração
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Agendar no TikTok</h1>
          <p className="text-slate-600">
            Revise o conteúdo, as opções permitidas pela sua conta e confirme o envio antes de adicioná-lo à fila automática.
          </p>
        </header>

        {!authenticated ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-xl font-semibold">Entrar no painel</h2>
            <label className="mb-2 block text-sm font-semibold" htmlFor="password">
              Senha administrativa
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex w-full gap-2">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="off"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-emerald-500"
                  placeholder="Senha configurada na Vercel"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="rounded-lg border border-slate-300 px-3 text-sm"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <button
                type="button"
                onClick={connectAdmin}
                disabled={loading || !password}
                className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-emerald-700">✓ Sessão administrativa ativa</p>
                  <p className="text-sm text-slate-600">
                    O TikTok é consultado em tempo real antes de cada agendamento.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/api/tiktok/connect"
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Reconectar TikTok
                  </a>
                  <button
                    type="button"
                    onClick={disconnect}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Sair
                  </button>
                </div>
              </div>
            </section>

            {creator && (
              <section className="rounded-2xl border border-emerald-200 bg-white p-5">
                <div className="flex flex-wrap items-center gap-4">
                  {creator.creator_avatar_url ? (
                    <img
                      src={creator.creator_avatar_url}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : null}
                  <div>
                    <h2 className="text-xl font-semibold">
                      {creator.creator_nickname || creator.creator_username || 'Conta TikTok'}
                    </h2>
                    {creator.creator_username && (
                      <p className="text-sm text-slate-600">@{creator.creator_username}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <strong>Privacidade disponível</strong>
                    <p className="mt-1 text-slate-600">
                      {(creator.privacy_level_options || []).join(' · ') || 'Nenhuma opção retornada'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <strong>Duração máxima</strong>
                    <p className="mt-1 text-slate-600">
                      {creator.max_video_post_duration_sec
                        ? Math.floor(creator.max_video_post_duration_sec / 60) + ' minutos'
                        : 'Não informada'}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <form onSubmit={submit} className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-xl font-semibold">Conteúdo</h2>
                <div className="space-y-4">
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold">ID do produto (opcional)</span>
                    <input
                      value={form.productId}
                      onChange={event => update('productId', event.target.value)}
                      placeholder="Ex.: prod_001"
                      className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-emerald-500"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold">URL pública do vídeo no R2 *</span>
                    <input
                      type="url"
                      required
                      value={form.videoUrl}
                      onChange={event => update('videoUrl', event.target.value)}
                      placeholder={R2_PREFIX + 'videos/...mp4'}
                      className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-emerald-500"
                    />
                  </label>

                  {form.videoUrl && (
                    <div>
                      {videoValid ? (
                        <video
                          src={form.videoUrl}
                          controls
                          playsInline
                          className="max-h-[520px] w-full rounded-xl bg-black"
                        />
                      ) : (
                        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                          A automação aceita apenas vídeos hospedados no prefixo R2 verificado.
                        </p>
                      )}
                    </div>
                  )}

                  <label className="block text-sm">
                    <span className="mb-1 flex justify-between gap-3 font-semibold">
                      <span>Legenda TikTok *</span>
                      <span className="font-normal text-slate-500">{form.caption.length}/2200</span>
                    </span>
                    <textarea
                      required
                      maxLength={2200}
                      rows={5}
                      value={form.caption}
                      onChange={event => update('caption', event.target.value)}
                      placeholder="Escreva a legenda e as hashtags..."
                      className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-emerald-500"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-xl font-semibold">Publicação</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold">Data *</span>
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={event => update('date', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white p-3"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold">Horário (Brasília) *</span>
                    <input
                      type="time"
                      required
                      value={form.time}
                      onChange={event => update('time', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white p-3"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold">Privacidade *</span>
                    <select
                      required
                      value={form.privacy}
                      onChange={event => update('privacy', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white p-3"
                    >
                      {(creator?.privacy_level_options || []).map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  A fila é verificada a cada 15 minutos; o início efetivo pode ocorrer alguns minutos após o horário escolhido.
                </p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-xl font-semibold">Interações e declarações</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={'flex items-start gap-3 rounded-xl border p-3 ' + (creator?.comment_disabled ? 'opacity-50' : '')}>
                    <input
                      type="checkbox"
                      disabled={creator?.comment_disabled}
                      checked={form.comments}
                      onChange={event => update('comments', event.target.checked)}
                      className="mt-1"
                    />
                    <span><strong>Permitir comentários</strong><small className="block text-slate-500">{creator?.comment_disabled ? 'Desativado na conta TikTok.' : 'Permitir comentários neste post.'}</small></span>
                  </label>

                  <label className={'flex items-start gap-3 rounded-xl border p-3 ' + (creator?.duet_disabled ? 'opacity-50' : '')}>
                    <input
                      type="checkbox"
                      disabled={creator?.duet_disabled}
                      checked={form.duet}
                      onChange={event => update('duet', event.target.checked)}
                      className="mt-1"
                    />
                    <span><strong>Permitir Dueto</strong><small className="block text-slate-500">{creator?.duet_disabled ? 'Desativado na conta TikTok.' : 'Permitir Dueto neste post.'}</small></span>
                  </label>

                  <label className={'flex items-start gap-3 rounded-xl border p-3 ' + (creator?.stitch_disabled ? 'opacity-50' : '')}>
                    <input
                      type="checkbox"
                      disabled={creator?.stitch_disabled}
                      checked={form.stitch}
                      onChange={event => update('stitch', event.target.checked)}
                      className="mt-1"
                    />
                    <span><strong>Permitir Stitch</strong><small className="block text-slate-500">{creator?.stitch_disabled ? 'Desativado na conta TikTok.' : 'Permitir Stitch neste post.'}</small></span>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border p-3">
                    <input
                      type="checkbox"
                      checked={form.isAigc}
                      onChange={event => update('isAigc', event.target.checked)}
                      className="mt-1"
                    />
                    <span><strong>Conteúdo gerado/modificado por IA</strong><small className="block text-slate-500">Marque quando aplicável ao conteúdo.</small></span>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border p-3">
                    <input
                      type="checkbox"
                      checked={form.brandOrganic}
                      onChange={event => update('brandOrganic', event.target.checked)}
                      className="mt-1"
                    />
                    <span><strong>Conteúdo comercial próprio</strong><small className="block text-slate-500">Promoção da própria marca, produto ou serviço.</small></span>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border p-3">
                    <input
                      type="checkbox"
                      checked={form.brandContent}
                      onChange={event => update('brandContent', event.target.checked)}
                      className="mt-1"
                    />
                    <span><strong>Conteúdo comercial de terceiros</strong><small className="block text-slate-500">Parceria, publicidade ou promoção de terceiros.</small></span>
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    required
                    checked={form.consent}
                    onChange={event => update('consent', event.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    <strong>Confirmo que revisei o vídeo, a legenda, a privacidade e as opções acima.</strong>
                    <span className="mt-1 block text-slate-600">
                      Ao agendar, autorizo o Utilidades Essenciais a enviar este conteúdo ao TikTok no horário informado.
                    </span>
                  </span>
                </label>
              </section>

              <button
                type="submit"
                disabled={loading || !creator || !videoValid || !form.consent}
                className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-lg font-bold text-white disabled:opacity-40"
              >
                {loading ? 'Agendando...' : 'Agendar no TikTok'}
              </button>
            </form>
          </>
        )}

        {feedback && (
          <section
            role="status"
            className={'rounded-2xl border p-5 ' + (feedback.error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}
          >
            {feedback.error || feedback.success}
          </section>
        )}

        <p className="pb-8 text-xs text-slate-500">
          No Sandbox, use apenas as opções de privacidade retornadas pelo TikTok. A publicação automática continua isolada do projeto do Instagram.
        </p>
      </div>
    </main>
  );
}

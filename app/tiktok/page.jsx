'use client';

import { useEffect, useState } from 'react';

export default function TikTokCreatorPage() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState({ connected: false });

  const loadSession = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tiktok/creator/session', {
        cache: 'no-store',
      });
      const data = await response.json();
      setSession(data);
    } catch {
      setSession({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const disconnect = async () => {
    await fetch('/api/tiktok/creator/session', { method: 'DELETE' });
    setSession({ connected: false });
  };

  return (
    <main
      className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6"
      style={{ minHeight: '100dvh', fontFamily: 'Arial, sans-serif' }}
    >
      <div className="mx-auto max-w-3xl">
        <a href="/" className="text-sm font-semibold text-emerald-700 hover:underline">
          ← Utilidades Essenciais
        </a>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            TikTok · Criadores
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Publique seus vídeos no TikTok
          </h1>

          <p className="mt-3 text-slate-600">
            Conecte sua própria conta TikTok para revisar vídeos, escolher as opções
            permitidas pela sua conta e, nas próximas etapas, agendar publicações com
            confirmação antes do envio.
          </p>

          {loading ? (
            <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-slate-600">
              Verificando conexão...
            </div>
          ) : session.connected ? (
            <div className="mt-8 space-y-5">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="font-bold text-emerald-800">✓ TikTok conectado</p>
                <p className="mt-1 text-lg font-semibold">
                  {session.creator?.nickname ||
                    session.creator?.username ||
                    'Conta TikTok'}
                </p>
                {session.creator?.username ? (
                  <p className="text-sm text-slate-600">
                    @{session.creator.username}
                  </p>
                ) : null}
                <p className="mt-3 text-sm text-slate-600">
                  Esta conta possui uma sessão própria e separada das demais contas
                  conectadas ao Utilidades Essenciais.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <h2 className="text-xl font-semibold">Próxima etapa</h2>
                <p className="mt-2 text-sm text-slate-600">
                  A conexão multiusuário está ativa. O próximo recurso será o painel
                  individual para revisar e agendar um vídeo usando somente esta conta.
                </p>
              </div>

              <button
                type="button"
                onClick={disconnect}
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
              >
                Desconectar desta sessão
              </button>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              <a
                href="/api/tiktok/creator/connect"
                className="inline-flex w-full items-center justify-center rounded-xl bg-black px-6 py-4 text-lg font-bold text-white"
              >
                Conectar minha conta TikTok
              </a>

              <p className="text-xs leading-5 text-slate-500">
                O TikTok mostrará a tela oficial de autorização. O Utilidades
                Essenciais não recebe sua senha do TikTok. No ambiente Sandbox,
                somente contas de teste autorizadas pelo aplicativo conseguem concluir
                a conexão.
              </p>
            </div>
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          <strong className="text-slate-900">Privacidade e controle</strong>
          <p className="mt-2">
            Cada criador conecta a própria conta e mantém uma sessão independente.
            Nenhuma publicação é iniciada nesta tela sem uma etapa posterior de revisão
            e confirmação do conteúdo.
          </p>
          <div className="mt-3 flex gap-4">
            <a href="/privacidade" className="text-emerald-700 hover:underline">
              Privacidade
            </a>
            <a href="/termos" className="text-emerald-700 hover:underline">
              Termos
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

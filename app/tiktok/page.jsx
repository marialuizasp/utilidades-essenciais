'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const ACCEPTED_MIME = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);
const MAX_FILE_SIZE = 4_000_000_000;

function inferMime(file) {
  const direct = String(file?.type || '').toLowerCase();
  if (ACCEPTED_MIME.has(direct)) return direct;

  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.mp4')) return 'video/mp4';
  if (name.endsWith('.mov')) return 'video/quicktime';
  if (name.endsWith('.webm')) return 'video/webm';
  return '';
}

function statusLabel(status) {
  const map = {
    PROCESSING_UPLOAD: 'Enviando / processando',
    PROCESSING_DOWNLOAD: 'Processando mídia',
    PUBLISH_COMPLETE: 'Publicado',
    FAILED: 'Falhou',
  };
  return map[status] || status || 'Processando';
}

export default function TikTokCreatorPage() {
  const [loadingSession, setLoadingSession] = useState(true);
  const [session, setSession] = useState({ connected: false });
  const [creatorInfo, setCreatorInfo] = useState(null);
  const [loadingCreator, setLoadingCreator] = useState(false);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState('');
  const [privacy, setPrivacy] = useState('');
  const [allowComment, setAllowComment] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  const [commercialDisclosure, setCommercialDisclosure] = useState(false);
  const [brandOrganic, setBrandOrganic] = useState(false);
  const [brandContent, setBrandContent] = useState(false);
  const [isAigc, setIsAigc] = useState(false);
  const [consent, setConsent] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [publishState, setPublishState] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const pollingRef = useRef(false);

  const loadSession = async () => {
    setLoadingSession(true);
    try {
      const response = await fetch('/api/tiktok/creator/session', {
        cache: 'no-store',
      });
      const data = await response.json();
      setSession(data);
      if (data.connected) await loadCreatorInfo();
    } catch {
      setSession({ connected: false });
    } finally {
      setLoadingSession(false);
    }
  };

  const loadCreatorInfo = async () => {
    setLoadingCreator(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/tiktok/creator/info', {
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || 'Não foi possível consultar sua conta TikTok.'
        );
      }

      setCreatorInfo(data.creator);
      setPrivacy('');
      setAllowComment(false);
      setAllowDuet(false);
      setAllowStitch(false);
      return data.creator;
    } catch (error) {
      setFeedback({ error: error.message });
      return null;
    } finally {
      setLoadingCreator(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!session.connected) return;
    const saved = sessionStorage.getItem('ue_tiktok_publish_id');
    if (saved && !pollingRef.current) {
      setPublishState({ publish_id: saved, status: 'PROCESSING_UPLOAD' });
      pollStatus(saved);
    }
  }, [session.connected]);

  const disconnect = async () => {
    await fetch('/api/tiktok/creator/session', { method: 'DELETE' });
    sessionStorage.removeItem('ue_tiktok_publish_id');
    setSession({ connected: false });
    setCreatorInfo(null);
    resetForm();
  };

  const resetForm = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setDuration(0);
    setTitle('');
    setPrivacy('');
    setAllowComment(false);
    setAllowDuet(false);
    setAllowStitch(false);
    setCommercialDisclosure(false);
    setBrandOrganic(false);
    setBrandContent(false);
    setIsAigc(false);
    setConsent(false);
    setUploadProgress(0);
  };

  const selectFile = event => {
    const next = event.target.files?.[0] || null;
    setFeedback(null);
    setPublishState(null);
    setUploadProgress(0);
    setDuration(0);

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!next) {
      setFile(null);
      setPreviewUrl('');
      return;
    }

    const mime = inferMime(next);
    if (!mime) {
      setFile(null);
      setPreviewUrl('');
      setFeedback({ error: 'Escolha um vídeo MP4, MOV ou WebM.' });
      event.target.value = '';
      return;
    }

    if (next.size > MAX_FILE_SIZE) {
      setFile(null);
      setPreviewUrl('');
      setFeedback({ error: 'O TikTok aceita vídeos de até 4 GB neste fluxo.' });
      event.target.value = '';
      return;
    }

    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
  };

  const durationTooLong =
    Boolean(duration) &&
    Boolean(creatorInfo?.max_video_post_duration_sec) &&
    duration > creatorInfo.max_video_post_duration_sec;

  const commercialInvalid =
    commercialDisclosure && !brandOrganic && !brandContent;

  const brandedPrivate = brandContent && privacy === 'SELF_ONLY';

  const publishInProgress =
    Boolean(publishState?.publish_id) &&
    publishState?.status !== 'PUBLISH_COMPLETE' &&
    publishState?.status !== 'FAILED';

  const canPublish =
    Boolean(file) &&
    Boolean(duration) &&
    Boolean(creatorInfo) &&
    Boolean(privacy) &&
    consent &&
    !durationTooLong &&
    !commercialInvalid &&
    !brandedPrivate &&
    !publishing &&
    !publishInProgress;

  const uploadChunks = async (uploadUrl, upload, selectedFile) => {
    const total = Number(upload.total_chunk_count);
    const chunkSize = Number(upload.chunk_size);
    const fileSize = selectedFile.size;
    const mime = upload.mime_type;

    for (let index = 0; index < total; index++) {
      const start = index * chunkSize;
      const endExclusive =
        index === total - 1
          ? fileSize
          : Math.min(fileSize, start + chunkSize);

      const blob = selectedFile.slice(start, endExclusive, mime);
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': mime,
          'Content-Range':
            'bytes ' +
            start +
            '-' +
            (endExclusive - 1) +
            '/' +
            fileSize,
        },
        body: blob,
      });

      if (![200, 201, 206].includes(response.status)) {
        let detail = '';
        try { detail = await response.text(); } catch {}
        console.error('TikTok upload chunk failed:', response.status, detail.slice(0, 300));
        throw new Error(
          'O TikTok recusou uma parte do arquivo durante o upload (HTTP ' +
            response.status +
            ').'
        );
      }

      setUploadProgress(Math.round(((index + 1) / total) * 100));
    }
  };

  const pollStatus = async publishId => {
    if (pollingRef.current) return;
    pollingRef.current = true;

    try {
      for (let attempt = 0; attempt < 60; attempt++) {
        const response = await fetch('/api/tiktok/creator/publish/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publish_id: publishId }),
        });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(
            data.message || 'Não foi possível consultar o status do post.'
          );
        }

        setPublishState({
          publish_id: publishId,
          status: data.status,
          fail_reason: data.fail_reason,
          post_ids: data.post_ids || [],
        });

        if (data.status === 'PUBLISH_COMPLETE') {
          sessionStorage.removeItem('ue_tiktok_publish_id');
          setFeedback({
            success:
              'O TikTok concluiu o processamento. A publicação foi enviada para a conta conectada.',
          });
          resetForm();
          return;
        }

        if (data.status === 'FAILED') {
          sessionStorage.removeItem('ue_tiktok_publish_id');
          setFeedback({
            error:
              'O TikTok não concluiu a publicação: ' +
              (data.fail_reason || 'motivo não informado.'),
          });
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      setFeedback({
        info:
          'O vídeo continua em processamento no TikTok. O publish_id foi preservado nesta sessão para continuar o acompanhamento.',
      });
    } catch (error) {
      setFeedback({ error: error.message });
    } finally {
      pollingRef.current = false;
    }
  };

  const publish = async event => {
    event.preventDefault();
    if (!canPublish) return;

    setPublishing(true);
    setFeedback(null);
    setPublishState(null);
    setUploadProgress(0);

    try {
      const freshCreator = await loadCreatorInfo();
      if (!freshCreator) throw new Error('Não foi possível atualizar as opções da conta.');

      if (!(freshCreator.privacy_level_options || []).includes(privacy)) {
        setPrivacy('');
        throw new Error(
          'As opções de privacidade da conta mudaram. Selecione novamente antes de publicar.'
        );
      }

      if (
        freshCreator.max_video_post_duration_sec &&
        duration > freshCreator.max_video_post_duration_sec
      ) {
        throw new Error(
          'O vídeo excede a duração máxima atual permitida para esta conta.'
        );
      }

      const mime = inferMime(file);

      const initResponse = await fetch('/api/tiktok/creator/publish/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          privacy_level: privacy,
          allow_comment: allowComment,
          allow_duet: allowDuet,
          allow_stitch: allowStitch,
          commercial_disclosure: commercialDisclosure,
          brand_organic: brandOrganic,
          brand_content: brandContent,
          is_aigc: isAigc,
          video_size: file.size,
          mime_type: mime,
          duration_sec: duration,
          consent: true,
        }),
      });

      const init = await initResponse.json();

      if (!initResponse.ok || !init.ok) {
        throw new Error(
          init.message || 'O TikTok não conseguiu iniciar a publicação.'
        );
      }

      sessionStorage.setItem('ue_tiktok_publish_id', init.publish_id);
      setPublishState({
        publish_id: init.publish_id,
        status: 'PROCESSING_UPLOAD',
      });

      await uploadChunks(init.upload_url, init.upload, file);

      setFeedback({
        info:
          'Upload concluído. O TikTok está processando o vídeo; isso pode levar alguns minutos.',
      });

      setPublishing(false);
      await pollStatus(init.publish_id);
      return;
    } catch (error) {
      setFeedback({ error: error.message });
    } finally {
      setPublishing(false);
    }
  };

  const disclosureLabel = brandContent
    ? 'Ao publicar, você concorda com a Política de Conteúdo de Marca e a Confirmação de Uso de Música do TikTok.'
    : 'Ao publicar, você concorda com a Confirmação de Uso de Música do TikTok.';

  if (loadingSession) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
        <div className="mx-auto max-w-4xl">Carregando TikTok...</div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6"
      style={{ minHeight: '100dvh', fontFamily: 'Arial, sans-serif' }}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-2">
          <a href="/" className="text-sm font-semibold text-emerald-700 hover:underline">
            ← Utilidades Essenciais
          </a>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            TikTok · Criadores
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Publicar vídeo no TikTok
          </h1>
          <p className="text-slate-600">
            Você controla qual vídeo será enviado, a legenda, a privacidade e as interações antes do upload.
          </p>
        </header>

        {!session.connected ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold">Conecte sua conta</h2>
            <p className="mt-2 text-slate-600">
              A autorização acontece diretamente no TikTok. O Utilidades Essenciais não recebe sua senha.
            </p>
            <a
              href="/api/tiktok/creator/connect"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-black px-6 py-4 text-lg font-bold text-white"
            >
              Conectar minha conta TikTok
            </a>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              No Sandbox, somente contas adicionadas como usuários de teste conseguem concluir a autorização.
            </p>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-emerald-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-emerald-700">✓ TikTok conectado</p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {creatorInfo?.nickname ||
                      session.creator?.nickname ||
                      creatorInfo?.username ||
                      session.creator?.username ||
                      'Conta TikTok'}
                  </h2>
                  {(creatorInfo?.username || session.creator?.username) && (
                    <p className="text-sm text-slate-600">
                      @{creatorInfo?.username || session.creator?.username}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={loadCreatorInfo}
                    disabled={loadingCreator}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                  >
                    {loadingCreator ? 'Atualizando...' : 'Atualizar opções'}
                  </button>
                  <button
                    type="button"
                    onClick={disconnect}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                  >
                    Desconectar
                  </button>
                </div>
              </div>
            </section>

            {creatorInfo && (
              <form onSubmit={publish} className="space-y-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-xl font-semibold">1. Escolha o vídeo</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    O arquivo será enviado diretamente do seu dispositivo ao TikTok após sua confirmação.
                  </p>

                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                    onChange={selectFile}
                    className="mt-4 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
                  />

                  {previewUrl && (
                    <div className="mt-4">
                      <video
                        src={previewUrl}
                        controls
                        playsInline
                        onLoadedMetadata={event =>
                          setDuration(Number(event.currentTarget.duration || 0))
                        }
                        className="max-h-[560px] w-full rounded-xl bg-black"
                      />
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                        <span>{file?.name}</span>
                        <span>{file ? (file.size / 1024 / 1024).toFixed(1) + ' MB' : ''}</span>
                        {duration > 0 && (
                          <span className={durationTooLong ? 'font-semibold text-rose-700' : ''}>
                            {Math.ceil(duration)} s
                            {creatorInfo.max_video_post_duration_sec
                              ? ' / máximo ' + creatorInfo.max_video_post_duration_sec + ' s'
                              : ''}
                          </span>
                        )}
                      </div>
                      {durationTooLong && (
                        <p className="mt-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
                          Este vídeo é mais longo do que o limite atual retornado para sua conta TikTok.
                        </p>
                      )}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-xl font-semibold">2. Revise os dados do post</h2>

                  <label className="mt-4 block text-sm">
                    <span className="mb-1 flex justify-between font-semibold">
                      <span>Legenda</span>
                      <span className="font-normal text-slate-500">{title.length}/2200</span>
                    </span>
                    <textarea
                      value={title}
                      onChange={event => setTitle(event.target.value)}
                      maxLength={2200}
                      rows={5}
                      placeholder="Escreva sua legenda e hashtags..."
                      className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-emerald-500"
                    />
                  </label>

                  <label className="mt-4 block text-sm">
                    <span className="mb-1 block font-semibold">Privacidade *</span>
                    <select
                      required
                      value={privacy}
                      onChange={event => setPrivacy(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white p-3"
                    >
                      <option value="" disabled>Selecione manualmente</option>
                      {(creatorInfo.privacy_level_options || []).map(option => (
                        <option
                          key={option}
                          value={option}
                          disabled={brandContent && option === 'SELF_ONLY'}
                        >
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <p className="mt-2 text-xs text-slate-500">
                    As opções acima vêm da sua conta TikTok em tempo real; nenhuma privacidade é escolhida automaticamente.
                  </p>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-xl font-semibold">3. Interações</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <label className={'flex items-start gap-3 rounded-xl border p-3 ' + (creatorInfo.comment_disabled ? 'opacity-50' : '')}>
                      <input
                        type="checkbox"
                        disabled={creatorInfo.comment_disabled}
                        checked={allowComment}
                        onChange={event => setAllowComment(event.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        <strong>Comentários</strong>
                        <small className="block text-slate-500">
                          {creatorInfo.comment_disabled ? 'Desativado na sua conta.' : 'Desmarcado por padrão.'}
                        </small>
                      </span>
                    </label>

                    <label className={'flex items-start gap-3 rounded-xl border p-3 ' + (creatorInfo.duet_disabled ? 'opacity-50' : '')}>
                      <input
                        type="checkbox"
                        disabled={creatorInfo.duet_disabled}
                        checked={allowDuet}
                        onChange={event => setAllowDuet(event.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        <strong>Dueto</strong>
                        <small className="block text-slate-500">
                          {creatorInfo.duet_disabled ? 'Desativado na sua conta.' : 'Desmarcado por padrão.'}
                        </small>
                      </span>
                    </label>

                    <label className={'flex items-start gap-3 rounded-xl border p-3 ' + (creatorInfo.stitch_disabled ? 'opacity-50' : '')}>
                      <input
                        type="checkbox"
                        disabled={creatorInfo.stitch_disabled}
                        checked={allowStitch}
                        onChange={event => setAllowStitch(event.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        <strong>Stitch</strong>
                        <small className="block text-slate-500">
                          {creatorInfo.stitch_disabled ? 'Desativado na sua conta.' : 'Desmarcado por padrão.'}
                        </small>
                      </span>
                    </label>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-xl font-semibold">4. Declarações</h2>

                  <div className="mt-4 space-y-3">
                    <label className="flex items-start gap-3 rounded-xl border p-3">
                      <input
                        type="checkbox"
                        checked={isAigc}
                        onChange={event => setIsAigc(event.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        <strong>Conteúdo gerado/modificado por IA</strong>
                        <small className="block text-slate-500">
                          Marque somente quando se aplicar a este vídeo.
                        </small>
                      </span>
                    </label>

                    <label className="flex items-start gap-3 rounded-xl border p-3">
                      <input
                        type="checkbox"
                        checked={commercialDisclosure}
                        onChange={event => {
                          const enabled = event.target.checked;
                          setCommercialDisclosure(enabled);
                          if (!enabled) {
                            setBrandOrganic(false);
                            setBrandContent(false);
                          }
                        }}
                        className="mt-1"
                      />
                      <span>
                        <strong>Este conteúdo promove uma marca, produto ou serviço</strong>
                        <small className="block text-slate-500">
                          A divulgação comercial começa desligada.
                        </small>
                      </span>
                    </label>

                    {commercialDisclosure && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex items-start gap-3 rounded-xl border bg-slate-50 p-3">
                          <input
                            type="checkbox"
                            checked={brandOrganic}
                            onChange={event => setBrandOrganic(event.target.checked)}
                            className="mt-1"
                          />
                          <span>
                            <strong>Sua marca</strong>
                            <small className="block text-slate-500">
                              O vídeo será identificado como conteúdo promocional.
                            </small>
                          </span>
                        </label>

                        <label className={'flex items-start gap-3 rounded-xl border bg-slate-50 p-3 ' + (privacy === 'SELF_ONLY' ? 'opacity-50' : '')}>
                          <input
                            type="checkbox"
                            disabled={privacy === 'SELF_ONLY'}
                            checked={brandContent}
                            onChange={event => {
                              const checked = event.target.checked;
                              setBrandContent(checked);
                              if (checked && privacy === 'SELF_ONLY') setPrivacy('');
                            }}
                            className="mt-1"
                          />
                          <span>
                            <strong>Conteúdo de marca / terceiro</strong>
                            <small className="block text-slate-500">
                              {privacy === 'SELF_ONLY'
                                ? 'Conteúdo de marca não pode ficar privado.'
                                : 'O vídeo será identificado como parceria paga.'}
                            </small>
                          </span>
                        </label>
                      </div>
                    )}

                    {commercialInvalid && (
                      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                        Se a divulgação comercial estiver ativa, selecione “Sua marca”, “Conteúdo de marca / terceiro” ou ambos.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      required
                      checked={consent}
                      onChange={event => setConsent(event.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm">
                      <strong>Confirmo que revisei o vídeo, a legenda, a privacidade e as opções acima.</strong>
                      <span className="mt-1 block text-slate-700">
                        {disclosureLabel}
                      </span>
                      <span className="mt-1 block text-slate-600">
                        O envio ao TikTok só começará depois desta confirmação. Após o upload, o processamento pode levar alguns minutos.
                      </span>
                    </span>
                  </label>
                </section>

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Enviando vídeo ao TikTok</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full bg-emerald-600 transition-all"
                        style={{ width: uploadProgress + '%' }}
                      />
                    </div>
                  </section>
                )}

                {publishState && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="font-semibold">Status da publicação</h2>
                    <p className="mt-2 text-sm text-slate-700">
                      {statusLabel(publishState.status)}
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-500">
                      Publish ID: {publishState.publish_id}
                    </p>
                    {publishState.fail_reason && (
                      <p className="mt-2 text-sm text-rose-700">
                        {publishState.fail_reason}
                      </p>
                    )}
                  </section>
                )}

                <button
                  type="submit"
                  disabled={!canPublish}
                  className="w-full rounded-xl bg-black px-6 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {publishing
                    ? 'Enviando ao TikTok...'
                    : publishInProgress
                      ? 'Aguardando o TikTok...'
                      : 'Publicar no TikTok'}
                </button>
              </form>
            )}
          </>
        )}

        {feedback && (
          <section
            role="status"
            className={
              'rounded-2xl border p-5 ' +
              (feedback.error
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : feedback.success
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-sky-200 bg-sky-50 text-sky-800')
            }
          >
            {feedback.error || feedback.success || feedback.info}
          </section>
        )}

        <footer className="pb-8 text-sm text-slate-500">
          <div className="flex flex-wrap gap-4">
            <a href="/privacidade" className="hover:underline">Privacidade</a>
            <a href="/termos" className="hover:underline">Termos</a>
          </div>
        </footer>
      </div>
    </main>
  );
}

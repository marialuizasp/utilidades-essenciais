'use client';

import { useEffect } from 'react';

export default function RedirectClient({ url, title }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.replace(url);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [url]);

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: '#000',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
        padding: '24px',
        textAlign: 'center'
      }}
    >
      <div>
        <p style={{ margin: 0, opacity: 0.72, fontSize: '14px' }}>Utilidades Essenciais</p>
        <h1 style={{ margin: '10px 0 8px', fontSize: '22px' }}>Abrindo produto…</h1>
        <p style={{ margin: '0 0 18px', opacity: 0.82, maxWidth: '520px' }}>{title}</p>
        <a
          href={url}
          rel="noopener noreferrer sponsored"
          style={{ color: '#fff', textDecoration: 'underline' }}
        >
          Toque aqui se a loja não abrir automaticamente
        </a>
      </div>
    </main>
  );
}

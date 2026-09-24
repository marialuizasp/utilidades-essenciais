
'use client';

import { useState } from 'react';
import './VerticalFeed.css';

// Embaralha os índices usando Fisher-Yates.
function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export default function VerticalFeed({ products = [] }) {
  // Histórico dos vídeos, na ordem em que foram visitados.
  const [history, setHistory] = useState([0]);
  const [position, setPosition] = useState(0);

  // Produtos que ainda não apareceram neste ciclo.
  const [remaining, setRemaining] = useState(() =>
    shuffle(products.map((_, index) => index).slice(1))
  );

  if (products.length === 0) {
    return (
      <main className="empty-page">
        <h1>Nenhum produto disponível</h1>
      </main>
    );
  }

  const currentIndex = history[position];
  const currentProduct = products[currentIndex];

  function handlePrevious() {
    if (position > 0) {
      setPosition(position - 1);
    }
  }

  function handleNext() {
    // Se o visitante voltou, avançamos pelo histórico.
    if (position < history.length - 1) {
      setPosition(position + 1);
      return;
    }

    // Se só existe um produto, não há outro vídeo.
    if (products.length < 2) {
      return;
    }

    let available = remaining;

    // Todos foram vistos: inicia outro ciclo aleatório.
    // Evita repetir imediatamente o vídeo atual.
    if (available.length === 0) {
      available = shuffle(
        products
          .map((_, index) => index)
          .filter((index) => index !== currentIndex)
      );
    }

    const nextIndex = available[0];

    setRemaining(available.slice(1));
    setHistory((prev) => [...prev, nextIndex]);
    setPosition((prev) => prev + 1);
  }

  return (
    <main className="feed-page">
      <article className="feed-card">

        {/* Vídeo */}
        <div className="video-container">
          <video
            key={currentProduct.videoUrl}
            src={currentProduct.videoUrl}
            className="product-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />

          <div className="video-overlay" />
        </div>

        {/* Logo e nome da empresa */}
        <header className="brand">
          <div className="brand-avatar">
            <img
              src="/logo.png"
              alt="Logo Utilidades Essenciais"
              className="brand-logo"
            />
          </div>

          <span className="brand-name">
            Utilidades Essenciais
          </span>
        </header>

        {/* Informações e botões */}
        <section className="product-content">
          <div className="top-info">
            <span className="category">
              {currentProduct.category}
            </span>

            <span className="price">
              {currentProduct.price}
            </span>
          </div>

          <h1 className="product-title">
            {currentProduct.title}
          </h1>

          <p className="description">
            Um achadinho para facilitar sua rotina!
            Confira os detalhes e o preço na loja.
          </p>

          <a
            href={currentProduct.affiliateLink}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="offer-button"
          >
            <span>🛍️ Conferir preço e aproveitar a oferta</span>
            <span aria-hidden="true">↗</span>
          </a>

          {products.length > 1 && (
            <nav
              className="feed-navigation"
              aria-label="Navegação entre produtos"
            >
              <button
                type="button"
                className="previous-button"
                onClick={handlePrevious}
                disabled={position === 0}
              >
                <span aria-hidden="true">←</span>
                Anterior
              </button>

              <button
                type="button"
                className="next-button"
                onClick={handleNext}
              >
                Descobrir outro
                <span aria-hidden="true">→</span>
              </button>
            </nav>
          )}
        </section>

      </article>
    </main>
  );
}

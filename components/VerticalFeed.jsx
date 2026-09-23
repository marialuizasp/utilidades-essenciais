'use client';

import { useState } from 'react';
import './VerticalFeed.css';

export default function VerticalFeed({ products }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!products || products.length === 0) {
    return (
      <main className="empty-page">
        <div>
          <h1>Nenhum produto disponível</h1>
          <p>Adicione produtos ao arquivo data/products.json.</p>
        </div>
      </main>
    );
  }

  const currentProduct = products[currentIndex];

  function handleNext() {
    setCurrentIndex((prev) =>
      prev === products.length - 1 ? 0 : prev + 1
    );
  }

  return (
    <main className="feed-page">

      <div className="feed-card">

        {/* Vídeo */}
        <div className="video-container">
          <video
            key={currentProduct.videoUrl}
            src={currentProduct.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="product-video"
          />

          <div className="video-overlay" />
        </div>

        {/* Marca */}
        <div className="brand">
          <span>UTILIDADES</span>
          <strong>ESSENCIAIS</strong>
        </div>

        {/* Indicador de produto */}
        <div className="product-counter">
          {currentIndex + 1} / {products.length}
        </div>

        {/* Conteúdo */}
        <section className="product-content">

          <div className="top-info">
            <span className="category">
              {currentProduct.category}
            </span>

            <span className="price">
              {currentProduct.price}
            </span>
          </div>

          <h1>{currentProduct.title}</h1>

          <p className="description">
            Encontrei esse achadinho e achei que valia a pena compartilhar.
          </p>

          <a
            href={currentProduct.affiliateLink}
            target="_blank"
            rel="noopener noreferrer"
            className="offer-button"
          >
            <span>🛍️</span>
            Ver oferta
          </a>

          <button
            type="button"
            onClick={handleNext}
            className="next-button"
          >
            Próximo achadinho
            <span>↓</span>
          </button>

        </section>

      </div>

    </main>
  );
}

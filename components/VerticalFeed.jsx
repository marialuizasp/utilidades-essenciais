
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

  const currentProduct = products[currentIndex % products.length];

  function handleNext() {
    setCurrentIndex((prev) => (prev + 1) % products.length);
  }

  return (
    <main className="feed-page">
      <div className="feed-card">

        {/* Vídeo do produto */}
        <div className="video-container">
          <video
            key={currentProduct.videoUrl}
            src={currentProduct.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="product-video"
          />
          <div className="video-overlay" />
        </div>

        {/* Logo e nome da marca */}
        <header className="brand">
          <img
            src="/logo.png"
            alt="Logo Utilidades Essenciais"
            className="brand-logo"
          />
          <span className="brand-name">
            Utilidades Essenciais
          </span>
        </header>

        {/* Informações do produto */}
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
            Confira esse achadinho e aproveite a oferta!
          </p>

          <a
            href={currentProduct.affiliateLink}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="offer-button"
          >
            🛍️ Ver oferta
          </a>

          {products.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="next-button"
            >
              Próximo achadinho ↓
            </button>
          )}
        </section>

      </div>
    </main>
  );
}

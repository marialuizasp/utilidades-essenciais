
'use client';

import { useState } from 'react';
import './VerticalFeed.css';

// Converte preços brasileiros para centavos, sem arredondamentos de ponto flutuante.
function priceInCents(value) {
  const raw = String(value || '').replace(/[^\d,.]/g, '').trim();
  if (!raw) return null;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function discountFor(product) {
  const original = priceInCents(product.originalPrice);
  const current = priceInCents(product.price);
  if (!original || !current || original <= current) return null;
  return Math.round((original - current) / original * 100);
}

// Selos alternados por produto para itens sem desconto comprovado.
const offerBadges = [
  'Achadinho especial',
  'Vale a pena conhecer',
  'Confira essa novidade',
  'Descubra esse achado',
  'Veja os detalhes',
  'Escolha da vitrine',
  'Conheça o produto',
  'Um achado para você'
];

function badgeForProduct(product) {
  const key = String(product.id || product.title || '');
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (Math.imul(31, hash) + key.charCodeAt(i)) | 0;
  }
  return offerBadges[(hash >>> 0) % offerBadges.length];
}

// Frases variadas por produto, sem promessas de desconto ou escassez não verificadas.
const achadinhoPhrases = [
  'Um achadinho para facilitar sua rotina! Confira os detalhes e o preço na loja.',
  'Olha esse achadinho! Descubra como ele pode deixar seu dia a dia mais prático.',
  'Sabe aquele produto que desperta curiosidade? Confira todos os detalhes na loja!',
  'Mais praticidade para a sua rotina? Conheça esse achadinho e veja o preço.',
  'Esse merece entrar na sua lista de achadinhos! Veja os detalhes na loja.',
  'Um achado para quem adora soluções práticas. Toque e conheça!',
  'Já imaginou esse item na sua rotina? Confira as informações e o preço.',
  'Pequenos achados podem fazer diferença no dia a dia. Descubra esse!',
  'Achadinho da vez! Veja as características e descubra se combina com você.',
  'Para quem ama encontrar novidades úteis: vale conhecer esse produto!',
  'Um toque de praticidade que pode fazer sentido para você. Confira na loja.',
  'Gostou do que viu no vídeo? Veja mais detalhes e o preço atual na loja.',
  'Esse achadinho chamou sua atenção? Descubra tudo sobre ele!',
  'Sua próxima descoberta pode estar aqui! Confira esse achado na loja.',
  'Achadinhos que dão vontade de conhecer melhor! Veja preço e detalhes.',
  'Uma ideia prática para o cotidiano. Confira se esse achadinho é para você.',
  'Encontrou algo interessante? Toque para ver as opções disponíveis na loja.',
  'Esse é daqueles achadinhos que vale conferir de perto. Saiba mais!',
  'Adora novidades para casa e rotina? Conheça os detalhes desse achado.',
  'Um achadinho para inspirar novas soluções no seu dia a dia. Confira!',
  'Olha que descoberta interessante! Veja o produto completo na loja.',
  'Praticidade e boas descobertas em um só lugar. Conheça esse achadinho!',
  'Seu próximo achadinho favorito? Confira o produto e decida!',
  'Se esse vídeo chamou sua atenção, aproveite para conferir os detalhes na loja.'
];

function phraseForProduct(product) {
  const key = String(product.id || product.title || '');
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (Math.imul(31, hash) + key.charCodeAt(i)) | 0;
  }
  return achadinhoPhrases[(hash >>> 0) % achadinhoPhrases.length];
}

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
  const [soundOn, setSoundOn] = useState(false);

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
  const discount = discountFor(currentProduct);

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
            muted={!soundOn}
            loop
            playsInline
            preload="metadata"
          />

          <div className="video-overlay" />
        </div>

        {/* Ilha flutuante: identidade da vitrine e controle de áudio no mesmo lugar. */}
        <header className="feed-island" aria-label="Vitrine e áudio">
          <div className="island-brand">
            <span className="island-avatar">
              <img src="/logo.png.png" alt="" className="island-logo" />
            </span>
            <span className="island-brand-text">
              <span className="island-brand-name">Utilidades Essenciais</span>
            </span>
          </div>
          <span className="island-divider" aria-hidden="true" />
          <button
            type="button"
            className="video-sound-button"
            onClick={() => setSoundOn((current) => !current)}
            aria-label={soundOn ? "Desativar som do vídeo" : "Ativar som do vídeo"}
            aria-pressed={soundOn}
            title={soundOn ? "Desativar som" : "Ativar som"}
          >
            <span aria-hidden="true">{soundOn ? "🔊" : "🔇"}</span>
          </button>
        </header>

        {/* Assinatura discreta da plataforma, separada da marca da loja. */}
        <div className="vitra-signature" aria-label="Tecnologia VITRA">
          <svg className="vitra-mark" viewBox="0 0 64 64" aria-hidden="true">
            <path d="M9 12 Q9 3 20 9 L55 29 Q63 34 55 40 L20 59 Q9 65 9 52 Z" fill="#D5F971" />
            <path d="M20 19 Q20 13 27 17 L48 29 Q55 33 48 38 L27 49 Q20 53 20 46 Z" fill="#FF8676" />
            <path d="M28 25 Q28 22 32 24 L43 30 Q48 33 43 36 L32 42 Q28 44 28 40 Z" fill="#243CE6" />
          </svg>
          <span>vitra<span className="vitra-signature-dot">.</span></span>
        </div>

        {/* Informações e botões */}
        <section className="product-content">
          <div className="top-info">
            <span className="category">
              {currentProduct.category}
            </span>

            <div className={`price-group${discount !== null ? " has-discount" : ""}`} aria-label="Informações de preço">
              {discount !== null ? (
                <span className="discount-badge">{discount}% de desconto</span>
              ) : (
                <span className="discount-badge offer-badge">{badgeForProduct(currentProduct)}</span>
              )}
              <span className="price">{currentProduct.price}</span>
              {discount !== null && (
                <span className="original-price">{currentProduct.originalPrice}</span>
              )}
              <small className="price-disclaimer">Preço sujeito a alterações pelo vendedor.</small>
            </div>
          </div>

          <h1 className="product-title">
            {currentProduct.title}
          </h1>

          <p className="description">
            {phraseForProduct(currentProduct)}
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

          <footer className="vyra-credit" aria-label="Créditos da plataforma">
            Desenvolvido com <span className="vyra-wordmark">AYVIO</span>
          </footer>
        </section>

      </article>
    </main>
  );
}

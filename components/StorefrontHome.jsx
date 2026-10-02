'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import './StorefrontHome.css';

const BRAND_ICON = 'data:image/webp;base64,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';

const CATEGORY_FILTERS = [
  { label: 'Todos', keywords: [] },
  { label: 'Casa', keywords: ['casa', 'lar', 'decoração', 'decoracao', 'limpeza', 'organização', 'organizacao'] },
  { label: 'Cozinha', keywords: ['cozinha', 'utensílio', 'utensilio', 'alimento'] },
  { label: 'Beleza', keywords: ['beleza', 'skincare', 'maquiagem', 'cabelo', 'perfume', 'autocuidado'] },
  { label: 'Maternidade', keywords: ['maternidade', 'bebê', 'bebe', 'infantil', 'criança', 'crianca'] },
  { label: 'Pets', keywords: ['pet', 'pets', 'cachorro', 'gato'] },
  { label: 'Organização', keywords: ['organização', 'organizacao', 'organizador', 'armazenamento'] }
];

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function matchesCategory(product, filter) {
  if (!filter.keywords.length) return true;
  const haystack = normalize(
    [product.category, product.title, ...(product.tags || [])].join(' ')
  );
  return filter.keywords.some((keyword) => haystack.includes(normalize(keyword)));
}

function ProductVisual({ product, compact = false }) {
  return (
    <div className={compact ? 'store-product-media compact' : 'store-product-media'}>
      <video
        src={product.videoUrl}
        muted
        loop
        playsInline
        preload="metadata"
        onMouseEnter={(event) => event.currentTarget.play().catch(() => {})}
        onMouseLeave={(event) => {
          event.currentTarget.pause();
          event.currentTarget.currentTime = 0;
        }}
      />
      <span className="store-media-badge">{product.category || 'Achadinho'}</span>
      <span className="store-play-badge" aria-hidden="true">▶</span>
    </div>
  );
}

function ProductCard({ product }) {
  return (
    <article className="store-product-card">
      <ProductVisual product={product} />
      <div className="store-product-copy">
        <p className="store-product-kicker">Achadinho selecionado</p>
        <h3>{product.title}</h3>
        {product.price && <strong className="store-product-price">{product.price}</strong>}
        <a
          href={product.affiliateLink}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="store-card-cta"
        >
          Ver achadinho <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
}

function SmallCard({ product }) {
  return (
    <a
      href={product.affiliateLink}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="store-small-card"
    >
      <ProductVisual product={product} compact />
      <div>
        <span>{product.category || 'Achadinho'}</span>
        <strong>{product.title}</strong>
        {product.price && <small>{product.price}</small>}
      </div>
    </a>
  );
}

export default function StorefrontHome({ products = [] }) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const activeFilter =
    CATEGORY_FILTERS.find((item) => item.label === selectedCategory) ||
    CATEGORY_FILTERS[0];

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalize(query.trim());

    return products.filter((product) => {
      if (!matchesCategory(product, activeFilter)) return false;
      if (!normalizedQuery) return true;

      const haystack = normalize(
        [product.title, product.category, ...(product.tags || [])].join(' ')
      );

      return haystack.includes(normalizedQuery);
    });
  }, [products, query, activeFilter]);

  const visibleProducts =
    filteredProducts.length > 0 ? filteredProducts : products;

  const featured = visibleProducts.slice(0, 4);
  const discovery = visibleProducts.slice(4, 8).length
    ? visibleProducts.slice(4, 8)
    : visibleProducts.slice(0, 4);

  const categoryRows = [
    { title: 'Para sua casa', filter: CATEGORY_FILTERS[1] },
    { title: 'Cozinha prática', filter: CATEGORY_FILTERS[2] },
    { title: 'Beleza & autocuidado', filter: CATEGORY_FILTERS[3] },
    { title: 'Achadinhos para pets', filter: CATEGORY_FILTERS[5] }
  ]
    .map((row) => ({
      ...row,
      products: products.filter((product) => matchesCategory(product, row.filter)).slice(0, 6)
    }))
    .filter((row) => row.products.length > 0);

  return (
    <main className="store-page">
      <header className="store-header">
        <div className="store-header-inner">
          <a className="store-brand" href="/" aria-label="Utilidades Essenciais">
            <img src={BRAND_ICON} alt="" />
            <span>Utilidades<br />Essenciais</span>
          </a>

          <label className="store-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="O que você está procurando?"
              aria-label="Buscar achadinhos"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca">
                ×
              </button>
            )}
          </label>

          <nav className="store-header-actions" aria-label="Atalhos">
            <a href="#achadinhos">♡ <span>Favoritos</span></a>
            <Link href="/descobrir">▶ <span>Descobrir</span></Link>
          </nav>
        </div>

        <div className="store-category-strip" aria-label="Categorias">
          {CATEGORY_FILTERS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={selectedCategory === item.label ? 'active' : ''}
              onClick={() => {
                setSelectedCategory(item.label);
                document.getElementById('achadinhos')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className={selectedCategory === 'Ofertas' ? 'active accent' : 'accent'}
            onClick={() => {
              setSelectedCategory('Todos');
              document.getElementById('achadinhos')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Ofertas
          </button>
        </div>
      </header>

      <section className="store-hero">
        <div className="store-hero-inner">
          <div className="store-hero-copy">
            <span className="store-eyebrow">CURADORIA UTILIDADES ESSENCIAIS</span>
            <h1>Achadinhos que <em>facilitam</em> sua rotina</h1>
            <p>
              Descubra produtos úteis, ideias práticas e novidades para deixar o dia a dia mais leve.
            </p>
            <div className="store-hero-actions">
              <a href="#achadinhos" className="store-primary-button">Explorar achadinhos →</a>
              <Link href="/descobrir" className="store-secondary-button">▶ Descobrir rolando</Link>
            </div>
          </div>

          <div className="store-hero-collage" aria-label="Prévia de achadinhos">
            {products.slice(0, 3).map((product, index) => (
              <div key={product.id || index} className={'store-hero-tile tile-' + (index + 1)}>
                <video src={product.videoUrl} muted autoPlay loop playsInline preload="metadata" />
              </div>
            ))}
            <div className="store-hero-note">
              <strong>Pequenos achados.</strong>
              <span>Grandes facilidades.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="store-benefits" aria-label="Vantagens da vitrine">
        <div><span>✦</span><strong>Seleção especial</strong><small>Achados escolhidos para facilitar sua busca</small></div>
        <div><span>⌕</span><strong>Encontre rápido</strong><small>Busca e categorias para chegar ao que interessa</small></div>
        <div><span>♡</span><strong>Tudo em um só lugar</strong><small>Uma vitrine para descobrir sem complicação</small></div>
      </section>

      <section className="store-section" id="achadinhos">
        <div className="store-section-heading">
          <div>
            <span className="store-section-icon">✦</span>
            <div>
              <h2>Achadinhos do momento</h2>
              <p>
                {query
                  ? 'Resultados para “' + query + '”'
                  : selectedCategory === 'Todos'
                    ? 'Uma seleção para começar a explorar'
                    : 'Seleção em ' + selectedCategory}
              </p>
            </div>
          </div>
          <span className="store-results-count">{visibleProducts.length} itens</span>
        </div>

        {featured.length > 0 ? (
          <div className="store-product-grid">
            {featured.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="store-empty-search">
            <strong>Nenhum achadinho encontrado.</strong>
            <button type="button" onClick={() => { setQuery(''); setSelectedCategory('Todos'); }}>
              Limpar filtros
            </button>
          </div>
        )}
      </section>

      <section className="store-discovery">
        <div className="store-section-heading store-discovery-heading">
          <div>
            <span className="store-section-icon play">▶</span>
            <div>
              <h2>Descubra rolando</h2>
              <p>Produtos em vídeo para você encontrar o próximo achadinho.</p>
            </div>
          </div>
          <div className="store-view-switch">
            <Link href="/descobrir" className="active">Descobrir</Link>
            <a href="#categorias">Ver todos</a>
          </div>
        </div>

        <div className="store-discovery-grid">
          {discovery.map((product) => (
            <article className="store-discovery-card" key={product.id}>
              <div className="store-discovery-video">
                <video src={product.videoUrl} muted autoPlay loop playsInline preload="metadata" />
                <span className="store-discovery-play">▶</span>
                <span className="store-discovery-category">{product.category || 'Achadinho'}</span>
              </div>
              <div className="store-discovery-copy">
                <h3>{product.title}</h3>
                <p>Veja o produto em ação e confira os detalhes na loja.</p>
                <a href={product.affiliateLink} target="_blank" rel="noopener noreferrer sponsored">
                  Ver oferta →
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="store-discovery-mobile-cta">
          <Link href="/descobrir">Abrir modo Descobrir →</Link>
        </div>
      </section>

      <section className="store-category-rows" id="categorias">
        {categoryRows.map((row) => (
          <div className="store-category-row" key={row.title}>
            <div className="store-row-heading">
              <h2>{row.title}</h2>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(row.filter.label);
                  document.getElementById('achadinhos')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Ver todos →
              </button>
            </div>
            <div className="store-small-grid">
              {row.products.map((product) => <SmallCard key={product.id} product={product} />)}
            </div>
          </div>
        ))}
      </section>

      <footer className="store-footer">
        <div className="store-brand footer-brand">
          <img src={BRAND_ICON} alt="" />
          <span>Utilidades<br />Essenciais</span>
        </div>
        <p>Achadinhos, utilidades e boas descobertas para a rotina.</p>
        <div>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos</Link>
          <Link href="/exclusao-de-dados">Exclusão de dados</Link>
        </div>
      </footer>
    </main>
  );
}

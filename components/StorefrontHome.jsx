'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import './StorefrontHome.css';

const BRAND_ICON = 'https://pub-603881db00f042c08f8b4dc6d9731239.r2.dev/UE/Logo%20principal%20(1).png';

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

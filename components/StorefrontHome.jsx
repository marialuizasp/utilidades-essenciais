'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import './StorefrontHome.css';

const BRAND_ICON = 'https://pub-603881db00f042c08f8b4dc6d9731239.r2.dev/UE/Utilidades_Essenciais_Logo_Transparente(5).png';

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

function publicCodeFor(product) {
  const id = String(product?.id || '').trim();
  const match = id.match(/^prod_(\d+)$/i);

  if (!match) return '';

  return 'UE' + String(Number(match[1])).padStart(4, '0');
}

function dailyFeatureScore(product, dayKey) {
  const key = dayKey + '|' + String(product.id || product.title || '');
  let hash = 2166136261;

  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function uniqueProductsByVideo(items, limit = Infinity) {
  const seenVideos = new Set();
  const selected = [];

  for (const product of items) {
    const rawVideoUrl = String(product?.videoUrl || '').trim();
    const videoKey = rawVideoUrl
      ? rawVideoUrl.split(/[?#]/, 1)[0]
      : 'product:' + String(product?.id || product?.title || selected.length);

    if (seenVideos.has(videoKey)) continue;

    seenVideos.add(videoKey);
    selected.push(product);

    if (selected.length >= limit) break;
  }

  return selected;
}

function ProductVisual({ product, compact = false }) {
  return (
    <div className={compact ? 'store-product-media compact' : 'store-product-media'}>
      <video
        src={product.videoUrl}
        muted
        autoPlay
        loop
        playsInline
        preload="auto"
        onLoadedData={(event) => {
          const video = event.currentTarget;
          if (video.currentTime === 0) {
            try { video.currentTime = 0.08; } catch {}
          }
          video.play().catch(() => {});
        }}
      />
      <span className="store-media-badge">{product.category || 'Achadinho'}</span>
      <span className="store-play-badge" aria-hidden="true">▶</span>
    </div>
  );
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!copied) throw new Error('Copy failed');
}

function CopyCode({ code, onCopy, className = '', inline = false }) {
  if (!code) return null;

  const activate = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onCopy(code);
  };

  if (inline) {
    return (
      <span
        className={'store-code-copy ' + className}
        role="button"
        tabIndex={0}
        onClick={activate}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') activate(event);
        }}
        aria-label={`Copiar código ${code}`}
        title="Copiar código"
      >
        {code}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={'store-code-copy ' + className}
      onClick={activate}
      aria-label={`Copiar código ${code}`}
      title="Copiar código"
    >
      {code}
    </button>
  );
}

function ShareButton({ product, onShare, className = '' }) {
  return (
    <button
      type="button"
      className={'store-share-button ' + className}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onShare(product);
      }}
      aria-label={`Compartilhar ${product.title}`}
      title="Compartilhar produto"
    >
      <span aria-hidden="true">↗</span>
    </button>
  );
}

function FavoriteButton({ product, isFavorite, onToggle, className = '' }) {
  return (
    <button
      type="button"
      className={'store-favorite-button ' + (isFavorite ? 'active ' : '') + className}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle(product.id);
      }}
      aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
    >
      <span aria-hidden="true">{isFavorite ? '♥' : '♡'}</span>
    </button>
  );
}

function ProductCard({ product, isFavorite, onToggleFavorite, onCopyCode, onOpenProduct, onShareProduct }) {
  return (
    <article className="store-product-card">
      <ProductVisual product={product} />
      <FavoriteButton product={product} isFavorite={isFavorite} onToggle={onToggleFavorite} />
      <ShareButton product={product} onShare={onShareProduct} className="product" />
      <div className="store-product-copy">
        <div className="store-product-meta">
          <p className="store-product-kicker">Achadinho selecionado</p>
          <CopyCode
            code={publicCodeFor(product)}
            onCopy={onCopyCode}
            className="store-product-code"
          />
        </div>
        <h3>{product.title}</h3>
        {product.price && <strong className="store-product-price">{product.price}</strong>}
        <a
          href={`/go/${encodeURIComponent(product.id)}`}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="store-card-cta"
          onClick={() => onOpenProduct(product.id)}
        >
          Ver achadinho <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
}

function SmallCard({ product, isFavorite, onToggleFavorite, onCopyCode, onOpenProduct, onShareProduct }) {
  return (
    <article className="store-small-card">
      <a
        href={`/go/${encodeURIComponent(product.id)}`}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="store-small-card-link"
        onClick={() => onOpenProduct(product.id)}
      >
        <ProductVisual product={product} compact />
        <div>
          <div className="store-small-meta">
            <span>{product.category || 'Achadinho'}</span>
            <CopyCode
              code={publicCodeFor(product)}
              onCopy={onCopyCode}
              className="store-small-code"
              inline
            />
          </div>
          <strong>{product.title}</strong>
          {product.price && <small>{product.price}</small>}
        </div>
      </a>
      <FavoriteButton
        product={product}
        isFavorite={isFavorite}
        onToggle={onToggleFavorite}
        className="compact"
      />
      <ShareButton product={product} onShare={onShareProduct} className="compact" />
    </article>
  );
}

export default function StorefrontHome({ products = [] }) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [copyNotice, setCopyNotice] = useState('');
  const [recentIds, setRecentIds] = useState([]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const sharedCode = searchParams.get('buscar')?.trim();

    if (!sharedCode) return;

    setSelectedCategory('Todos');
    setQuery(sharedCode);

    window.setTimeout(() => {
      document.getElementById('achadinhos')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 180);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 650);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ue-favorites-v1') || '[]');
      if (Array.isArray(stored)) {
        setFavoriteIds(stored.map(String));
      }
    } catch {}
    setFavoritesReady(true);
  }, []);

  useEffect(() => {
    if (!favoritesReady) return;
    localStorage.setItem('ue-favorites-v1', JSON.stringify(favoriteIds));
  }, [favoriteIds, favoritesReady]);

  useEffect(() => {
    if (!favoritesOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setFavoritesOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [favoritesOpen]);

  useEffect(() => {
    if (!copyNotice) return;

    const timer = window.setTimeout(() => setCopyNotice(''), 1600);
    return () => window.clearTimeout(timer);
  }, [copyNotice]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ue-recent-v1') || '[]');
      if (Array.isArray(stored)) {
        setRecentIds(stored.map(String).slice(0, 6));
      }
    } catch {}
  }, []);

  const recordRecentlyViewed = (productId) => {
    const id = String(productId);

    setRecentIds((current) => {
      const next = [id, ...current.filter((recentId) => recentId !== id)].slice(0, 6);
      try {
        localStorage.setItem('ue-recent-v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleShareProduct = async (product) => {
    const code = publicCodeFor(product);
    const url = new URL(window.location.origin + window.location.pathname);
    if (code) url.searchParams.set('buscar', code);

    const shareData = {
      title: product.title,
      text: code
        ? `Olha esse achadinho: ${product.title} (${code})`
        : `Olha esse achadinho: ${product.title}`,
      url: url.toString()
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await copyTextToClipboard(shareData.url);
      setCopyNotice('Link do produto copiado ✓');
    } catch (error) {
      if (error?.name === 'AbortError') return;

      try {
        await copyTextToClipboard(shareData.url);
        setCopyNotice('Link do produto copiado ✓');
      } catch {
        setCopyNotice('Não foi possível compartilhar o produto');
      }
    }
  };

  const handleCopyCode = async (code) => {
    try {
      await copyTextToClipboard(code);
      setCopyNotice(`Código ${code} copiado ✓`);
    } catch {
      setCopyNotice('Não foi possível copiar o código');
    }
  };

  const toggleFavorite = (productId) => {
    const id = String(productId);
    setFavoriteIds((current) =>
      current.includes(id)
        ? current.filter((favoriteId) => favoriteId !== id)
        : [id, ...current]
    );
  };

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const favoriteProducts = useMemo(
    () =>
      favoriteIds
        .map((id) => products.find((product) => String(product.id) === id))
        .filter(Boolean),
    [favoriteIds, products]
  );

  const recentProducts = useMemo(
    () =>
      uniqueProductsByVideo(
        recentIds
          .map((id) => products.find((product) => String(product.id) === id))
          .filter(Boolean),
        6
      ),
    [recentIds, products]
  );

  const clearRecentlyViewed = () => {
    setRecentIds([]);
    try {
      localStorage.removeItem('ue-recent-v1');
    } catch {}
  };

  const activeFilter =
    CATEGORY_FILTERS.find((item) => item.label === selectedCategory) ||
    CATEGORY_FILTERS[0];

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalize(query.trim());

    return products.filter((product) => {
      if (!matchesCategory(product, activeFilter)) return false;
      if (!normalizedQuery) return true;

      const haystack = normalize(
        [
          product.title,
          product.category,
          publicCodeFor(product),
          ...(product.tags || [])
        ].join(' ')
      );

      return haystack.includes(normalizedQuery);
    });
  }, [products, query, activeFilter]);

  const visibleProducts =
    filteredProducts.length > 0 ? filteredProducts : products;

  const dayKey = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const dailyOrder = useMemo(
    () =>
      [...visibleProducts].sort(
        (a, b) =>
          dailyFeatureScore(a, dayKey + '|home') -
          dailyFeatureScore(b, dayKey + '|home')
      ),
    [visibleProducts, dayKey]
  );

  const usedProductIds = new Set();

  const featured = uniqueProductsByVideo(dailyOrder, 4);
  featured.forEach((product) => usedProductIds.add(product.id));

  const discovery = uniqueProductsByVideo(
    dailyOrder.filter((product) => !usedProductIds.has(product.id)),
    4
  );
  discovery.forEach((product) => usedProductIds.add(product.id));

  const categoryRows = [
    { title: 'Para sua casa', filter: CATEGORY_FILTERS[1] },
    { title: 'Cozinha prática', filter: CATEGORY_FILTERS[2] },
    { title: 'Beleza & autocuidado', filter: CATEGORY_FILTERS[3] },
    { title: 'Achadinhos para pets', filter: CATEGORY_FILTERS[5] }
  ]
    .map((row, rowIndex) => {
      const candidates = products
        .filter((product) => matchesCategory(product, row.filter))
        .sort(
          (a, b) =>
            dailyFeatureScore(a, dayKey + '|row-' + rowIndex) -
            dailyFeatureScore(b, dayKey + '|row-' + rowIndex)
        );

      const selected = uniqueProductsByVideo(
        candidates.filter((product) => !usedProductIds.has(product.id)),
        6
      );

      selected.forEach((product) => usedProductIds.add(product.id));

      return {
        ...row,
        products: selected
      };
    })
    .filter((row) => row.products.length > 0);

  const heroProducts = uniqueProductsByVideo(products, 3);

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
              placeholder="Busque por produto ou código (ex.: UE0001)"
              aria-label="Buscar achadinhos"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca">
                ×
              </button>
            )}
          </label>

          <nav className="store-header-actions" aria-label="Atalhos">
            <button
              type="button"
              className="store-favorites-trigger"
              onClick={() => setFavoritesOpen(true)}
              aria-label={favoriteIds.length ? `Abrir favoritos: ${favoriteIds.length} salvos` : 'Abrir favoritos'}
              aria-expanded={favoritesOpen}
            >
              <span className="store-favorites-icon" aria-hidden="true">♡</span>
              <span>Favoritos</span>
              {favoriteIds.length > 0 && <b>{favoriteIds.length}</b>}
            </button>
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
            {heroProducts.map((product, index) => (
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
                    ? 'Uma seleção diferente todos os dias'
                    : 'Seleção em ' + selectedCategory}
              </p>
            </div>
          </div>
          <span className="store-results-count">{visibleProducts.length} itens</span>
        </div>

        {featured.length > 0 ? (
          <div className="store-product-grid">
            {featured.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={favoriteIdSet.has(String(product.id))}
                onToggleFavorite={toggleFavorite}
                onCopyCode={handleCopyCode}
                onOpenProduct={recordRecentlyViewed}
                onShareProduct={handleShareProduct}
              />
            ))}
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
              <FavoriteButton
                product={product}
                isFavorite={favoriteIdSet.has(String(product.id))}
                onToggle={toggleFavorite}
                className="discovery"
              />
              <ShareButton
                product={product}
                onShare={handleShareProduct}
                className="discovery-share"
              />
              <div className="store-discovery-video">
                <video src={product.videoUrl} muted autoPlay loop playsInline preload="metadata" />
                <span className="store-discovery-play">▶</span>
                <div className="store-discovery-tags">
                  <span className="store-discovery-category">{product.category || 'Achadinho'}</span>
                  <CopyCode
                    code={publicCodeFor(product)}
                    onCopy={handleCopyCode}
                    className="store-discovery-code"
                  />
                </div>
              </div>
              <div className="store-discovery-copy">
                <h3>{product.title}</h3>
                <p>Veja o produto em ação e confira os detalhes na loja.</p>
                <a
                  href={`/go/${encodeURIComponent(product.id)}`}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  onClick={() => recordRecentlyViewed(product.id)}
                >
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
              {row.products.map((product) => (
                <SmallCard
                  key={product.id}
                  product={product}
                  isFavorite={favoriteIdSet.has(String(product.id))}
                  onToggleFavorite={toggleFavorite}
                  onCopyCode={handleCopyCode}
                  onOpenProduct={recordRecentlyViewed}
                  onShareProduct={handleShareProduct}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      {recentProducts.length > 0 && (
        <section className="store-recently-viewed" aria-labelledby="recently-viewed-title">
          <div className="store-row-heading store-recent-heading">
            <div>
              <span className="store-section-icon">↻</span>
              <div>
                <h2 id="recently-viewed-title">Vistos recentemente</h2>
                <p>Continue de onde você parou.</p>
              </div>
            </div>
            <button type="button" onClick={clearRecentlyViewed}>
              Limpar
            </button>
          </div>

          <div className="store-small-grid">
            {recentProducts.map((product) => (
              <SmallCard
                key={product.id}
                product={product}
                isFavorite={favoriteIdSet.has(String(product.id))}
                onToggleFavorite={toggleFavorite}
                onCopyCode={handleCopyCode}
                onOpenProduct={recordRecentlyViewed}
                onShareProduct={handleShareProduct}
              />
            ))}
          </div>
        </section>
      )}

      {copyNotice && (
        <div className="store-copy-toast" role="status" aria-live="polite">
          {copyNotice}
        </div>
      )}

      {favoritesOpen && (
        <>
          <button
            type="button"
            className="store-favorites-backdrop"
            onClick={() => setFavoritesOpen(false)}
            aria-label="Fechar favoritos"
          />
          <aside
            className="store-favorites-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Seus favoritos"
          >
            <div className="store-favorites-header">
              <div>
                <span>SEUS ACHADINHOS</span>
                <h2>Favoritos</h2>
              </div>
              <button
                type="button"
                className="store-favorites-close"
                onClick={() => setFavoritesOpen(false)}
                aria-label="Fechar favoritos"
              >
                ×
              </button>
            </div>

            {favoriteProducts.length > 0 ? (
              <div className="store-favorites-list">
                {favoriteProducts.map((product) => (
                  <article className="store-favorite-item" key={product.id}>
                    <div className="store-favorite-item-copy">
                      {publicCodeFor(product) ? (
                        <CopyCode
                          code={publicCodeFor(product)}
                          onCopy={handleCopyCode}
                          className="store-favorite-drawer-code"
                        />
                      ) : (
                        <small>{product.category || 'Achadinho'}</small>
                      )}
                      <strong>{product.title}</strong>
                      {product.price && <b>{product.price}</b>}
                    </div>
                    <div className="store-favorite-item-actions">
                      <a
                        href={`/go/${encodeURIComponent(product.id)}`}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        onClick={() => recordRecentlyViewed(product.id)}
                      >
                        Ver produto
                      </a>
                      <button
                        type="button"
                        className="store-favorite-share"
                        onClick={() => handleShareProduct(product)}
                        aria-label={`Compartilhar ${product.title}`}
                      >
                        Compartilhar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(product.id)}
                        aria-label={`Remover ${product.title} dos favoritos`}
                      >
                        Remover
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="store-favorites-empty">
                <span aria-hidden="true">♡</span>
                <strong>Você ainda não salvou nenhum achadinho.</strong>
                <p>Toque no coração de um produto para encontrá-lo aqui depois.</p>
                <button type="button" onClick={() => setFavoritesOpen(false)}>
                  Continuar explorando
                </button>
              </div>
            )}
          </aside>
        </>
      )}

      {showBackToTop && (
        <button
          type="button"
          className="store-back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Voltar ao topo"
          title="Voltar ao topo"
        >
          <span aria-hidden="true">↑</span>
        </button>
      )}

      <footer className="store-footer">
        <div className="store-brand footer-brand">
          <img src={BRAND_ICON} alt="" />
          <span>Utilidades<br />Essenciais</span>
        </div>
        <p>Achadinhos, utilidades e boas descobertas para a rotina.</p>
        <div>
          <Link href="/tiktok">Para criadores / TikTok</Link>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos</Link>
          <Link href="/exclusao-de-dados">Exclusão de dados</Link>
        </div>
      </footer>
    </main>
  );
}

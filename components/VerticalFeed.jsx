'use client';
import React from 'react';

export default function VerticalFeed({ products }) {
  const handleAffiliateClick = (product) => {
    // Disparo do Google Analytics 4 (se instalado)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click_affiliate', {
        item_id: product.id,
        item_name: product.title,
        category: product.category,
        value: product.price
      });
    }
  };

  return (
    <main className="h-screen w-screen overflow-y-scroll snap-y snap-mandatory scrollbar-none bg-black">
      {products.map((product) => (
        <section 
          key={product.id} 
          className="h-screen w-full snap-start relative flex items-center justify-center"
        >
          {/* Player de Vídeo em Tela Cheia */}
          <video
            src={product.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
          
          {/* Gradiente Sutil para Legibilidade */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

          {/* Card Flutuante de Conversão (Apple Glassmorphism) */}
          <div className="absolute bottom-8 left-4 right-4 z-20 flex flex-col justify-end p-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/10 text-white/90">
                  {product.category}
                </span>
                <h2 className="text-white text-base font-semibold mt-2 line-clamp-1">{product.title}</h2>
                <p className="text-emerald-400 font-bold text-lg mt-0.5">{product.price}</p>
              </div>
            </div>

            {/* Botão CTA de 1 Toque */}
            <a
              href={product.affiliateLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleAffiliateClick(product)}
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all duration-200 text-black font-bold text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <span>Garantir com Desconto</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </section>
      ))}
    </main>
  );
}

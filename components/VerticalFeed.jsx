'use client';
import { useState } from 'react';

export default function VerticalFeed({ products }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!products || products.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p>Nenhum produto cadastrado no momento.</p>
      </div>
    );
  }

  const currentProduct = products[currentIndex];

  const handleNext = () => {
    if (currentIndex < products.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Volta pro primeiro (loop)
    }
  };

  return (
    <div className="relative w-full h-screen bg-black flex flex-col items-center justify-center overflow-hidden font-sans">
      {/* Container do Card Estilo TikTok / Apple */}
      <div className="relative w-full max-w-md h-full md:h-[85vh] md:rounded-3xl bg-neutral-900 overflow-hidden shadow-2xl flex flex-col justify-end">
        
        {/* Vídeo / Fundo */}
        <div className="absolute inset-0 w-full h-full bg-neutral-950 flex items-center justify-center">
          <video
            src={currentProduct.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />
        </div>

        {/* Informações do Produto & Botão de Afiliada */}
        <div className="relative z-10 p-6 flex flex-col gap-4 text-white">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium uppercase tracking-wider">
              {currentProduct.category || 'Achadinho'}
            </span>
            <span className="text-xl font-bold text-emerald-400">
              {currentProduct.price}
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold leading-tight mb-2">
              {currentProduct.title}
            </h1>
            <p className="text-sm text-neutral-300 line-clamp-2">
              Toque no botão abaixo para garantir o seu com desconto no link oficial!
            </p>
          </div>

          {/* Botão de Ação (Afiliado) */}
          <a
            href={currentProduct.affiliateLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-white text-black font-semibold rounded-2xl text-center shadow-lg hover:bg-neutral-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span>✨ Garantir Oferta</span>
          </a>

          {/* Botão para Próximo Produto */}
          <button
            onClick={handleNext}
            className="w-full py-3 bg-neutral-800/80 backdrop-blur-md text-white font-medium rounded-2xl text-center border border-white/10 hover:bg-neutral-700 transition-all"
          >
            Próximo Achadinho 👇
          </button>
        </div>
      </div>
    </div>
  );
}

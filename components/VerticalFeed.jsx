'use client';
import { useState } from 'react';

// Dados embutidos para garantir que o feed carregue instantaneamente
const defaultProducts = [
  {
    id: 1,
    title: 'Organizador Multifuncional Minimalista',
    category: 'Casa & Decoração',
    price: 'R$ 79,90',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smartphone-with-a-green-screen-41580-large.mp4',
    affiliateLink: 'https://shopee.com.br'
  },
  {
    id: 2,
    title: 'Mini Lanterna LED de Alta Potência',
    category: 'Utilidades',
    price: 'R$ 49,90',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-using-a-mobile-phone-in-the-street-41581-large.mp4',
    affiliateLink: 'https://shopee.com.br'
  }
];

export default function VerticalFeed({ products }) {
  // Usa os produtos passados ou o array padrão se estiver vazio
  const list = (products && products.length > 0) ? products : defaultProducts;
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentProduct = list[currentIndex];

  const handleNext = () => {
    if (currentIndex < list.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Loop para o primeiro
    }
  };

  return (
    <div className="relative w-full h-screen bg-black flex flex-col items-center justify-center overflow-hidden font-sans">
      <div className="relative w-full max-w-md h-full md:h-[85vh] md:rounded-3xl bg-neutral-900 overflow-hidden shadow-2xl flex flex-col justify-end border border-white/10">
        
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
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none" />
        </div>

        {/* Informações do Produto & Botão de Afiliada */}
        <div className="relative z-10 p-6 flex flex-col gap-4 text-white">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium uppercase tracking-wider">
              {currentProduct.category}
            </span>
            <span className="text-xl font-bold text-emerald-400">
              {currentProduct.price}
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold leading-tight mb-2">
              {currentProduct.title}
            </h1>
            <p className="text-sm text-neutral-300">
              Toque no botão abaixo para garantir o seu no link oficial!
            </p>
          </div>

          {/* Botão de Afiliado */}
          <a
            href={currentProduct.affiliateLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-white text-black font-semibold rounded-2xl text-center shadow-lg hover:bg-neutral-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span>✨ Garantir Oferta</span>
          </a>

          {/* Botão Próximo */}
          <button
            onClick={handleNext}
            className="w-full py-3 bg-neutral-800/80 backdrop-blur-md text-white font-medium rounded-2xl text-center border border-white/10 hover:bg-neutral-700 transition-all cursor-pointer"
          >
            Próximo Achadinho 👇
          </button>
        </div>
      </div>
    </div>
  );
}

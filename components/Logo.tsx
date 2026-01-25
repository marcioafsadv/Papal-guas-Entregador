
import React from 'react';

export const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizes = {
    sm: 'scale-75',
    md: 'scale-100',
    lg: 'scale-125'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${sizes[size]}`}>
      {/* Ícone Oficial: Roda com rastro de velocidade */}
      <div className="relative w-24 h-16 flex items-center justify-center">
        <svg viewBox="0 0 120 80" className="w-full h-full drop-shadow-lg">
          <defs>
            <linearGradient id="speed-trail" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF6B00" stopOpacity="0" />
              <stop offset="100%" stopColor="#FF6B00" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="speed-trail-yellow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0" />
              <stop offset="100%" stopColor="#FFD700" stopOpacity="1" />
            </linearGradient>
          </defs>
          
          {/* Rastros de Velocidade (Esquerda) */}
          <path d="M10 40 L55 40" stroke="url(#speed-trail-yellow)" strokeWidth="6" strokeLinecap="round" />
          <path d="M20 55 L50 55" stroke="url(#speed-trail)" strokeWidth="4" strokeLinecap="round" />
          <path d="M25 25 L50 25" stroke="url(#speed-trail)" strokeWidth="4" strokeLinecap="round" />

          {/* Roda Branca */}
          <circle cx="75" cy="40" r="22" stroke="white" strokeWidth="5" fill="none" />
          
          {/* Detalhe interno da roda (Seta/Velocidade) */}
          <path d="M68 30 L85 40 L68 50" fill="white" />
        </svg>
      </div>
      
      {/* Tipografia Oficial */}
      <div className="flex flex-col items-center -mt-1">
        <h1 className="text-3xl font-[900] text-white italic tracking-tighter drop-shadow-md leading-none" style={{ fontFamily: 'Inter, sans-serif' }}>
          Papaléguas
        </h1>
        <span className="text-lg font-bold text-white italic tracking-wide leading-none">
          Delivery
        </span>
      </div>
    </div>
  );
};


import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  // Dimensionamento baseado em largura para manter proporção (Aspect Ratio)
  const sizeClasses = {
    sm: 'w-32',
    md: 'w-48',
    lg: 'w-64'
  };

  return (
    <div className={`flex flex-col items-center justify-center select-none ${sizeClasses[size]} ${className}`}>
      {/* Container SVG com Aspect Ratio travado para evitar distorção */}
      <div className="relative w-full aspect-[4/3] flex items-center justify-center">
        <svg 
          viewBox="0 0 200 150" 
          className="w-full h-full drop-shadow-xl" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
             <linearGradient id="helmetGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#F2F2F2" />
             </linearGradient>
             <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
               <feGaussianBlur stdDeviation="3" result="blur" />
               <feComposite in="SourceGraphic" in2="blur" operator="over" />
             </filter>
          </defs>

          {/* Grupo de Elementos Gráficos */}
          <g transform="translate(10, 10)">
            {/* Rastro de Velocidade (Swooshes) - Amarelo Ouro */}
            {/* Swoosh Superior */}
            <path 
              d="M110 120 C 160 110, 195 60, 160 20" 
              stroke="#FFD700" 
              strokeWidth="10" 
              strokeLinecap="round"
              className="drop-shadow-sm"
              opacity="0.9"
            />
            {/* Swoosh Inferior */}
            <path 
              d="M100 130 C 140 120, 165 80, 140 50" 
              stroke="#FFD700" 
              strokeWidth="7" 
              strokeLinecap="round"
              className="drop-shadow-sm"
            />

            {/* Capacete Branco (Perfil Esquerdo) */}
            <g transform="translate(30, 30) scale(0.9)">
               {/* Casco */}
               <path 
                 d="M15 55 C 15 25, 35 5, 65 5 C 90 5, 105 25, 105 55 V 85 C 105 95, 95 105, 75 105 H 35 L 15 95 V 55 Z" 
                 fill="url(#helmetGrad)"
                 stroke="white"
                 strokeWidth="2"
               />
               
               {/* Visor (Recorte Escuro) */}
               <path 
                 d="M15 45 H 65 C 75 45, 80 50, 80 65 L 70 80 H 30 L 15 55 V 45 Z" 
                 fill="#121212"
               />
               
               {/* Reflexo no Visor */}
               <path 
                 d="M20 48 H 60 L 55 54 H 20 V 48 Z" 
                 fill="white" 
                 fillOpacity="0.2"
               />
               
               {/* Detalhes Mecânicos */}
               <circle cx="75" cy="65" r="4" fill="#D4D4D4" />
               <path d="M45 95 H 65" stroke="#D4D4D4" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>
        </svg>
      </div>
      
      {/* Texto alinhado e proporcional */}
      <div className="flex flex-col items-end -mt-6 mr-4 w-full">
        <h1 
          className="font-[900] text-white italic tracking-tighter drop-shadow-lg leading-none text-right w-full" 
          style={{ fontFamily: 'Inter, sans-serif', fontSize: size === 'lg' ? '2.5rem' : '1.75rem' }}
        >
          Papaléguas
        </h1>
        <span 
          className="font-bold text-white italic tracking-[0.3em] leading-none mt-1 opacity-90 mr-1"
          style={{ fontSize: size === 'lg' ? '0.875rem' : '0.65rem' }}
        >
          Entregador
        </span>
      </div>
    </div>
  );
};

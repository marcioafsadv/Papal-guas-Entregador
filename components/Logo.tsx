
import React from 'react';

export const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  return (
    <div className={`flex flex-col items-center justify-center`}>
      <div className={`${sizes[size]} relative flex items-center justify-center bg-white rounded-full p-2`}>
        <div className="absolute inset-0 border-4 border-[#FFD700] rounded-full opacity-50 animate-ping"></div>
        <svg viewBox="0 0 24 24" className="w-full h-full text-[#FF6B00] fill-current">
          <path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z" />
        </svg>
      </div>
      <span className="mt-2 text-white font-bold italic tracking-tighter">
        PAPALÉGUAS <span className="text-[#FFD700]">DELIVERY</span>
      </span>
    </div>
  );
};

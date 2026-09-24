import React from 'react';

interface AtlasLogoProps {
  variant?: 'full' | 'symbol' | 'with-subtitle';
  theme?: 'dark' | 'light' | 'orange';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AtlasLogo: React.FC<AtlasLogoProps> = ({
  variant = 'with-subtitle',
  theme = 'dark',
  size = 'md',
  className = ''
}) => {
  // Height & scale configuration
  const sizeMap = {
    sm: { symbolH: 22, textH: 'text-lg', subH: 'text-[9px]' },
    md: { symbolH: 30, textH: 'text-2xl', subH: 'text-[11px]' },
    lg: { symbolH: 40, textH: 'text-3xl', subH: 'text-xs' },
    xl: { symbolH: 52, textH: 'text-4xl', subH: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  // Colors based on Atlas Brand Manual
  // Pantone 172 C: #FF5618
  // Pantone 447 C: #333333
  const orangeFill = '#FF5618';
  const textFill = theme === 'light' ? '#333333' : '#FFFFFF';
  const subtitleColor = theme === 'light' ? '#666666' : '#94A3B8';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Official 60-degree geometric Atlas Symbol (Parallelogram + Triangle) */}
      <svg
        height={currentSize.symbolH}
        viewBox="0 0 160 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
      >
        {/* Slanted Parallelogram 60 degrees */}
        <polygon
          points="40,0 85,0 45,120 0,120"
          fill={orangeFill}
        />
        {/* Adjacent Triangle */}
        <polygon
          points="105,48 160,120 70,120"
          fill={orangeFill}
        />
      </svg>

      {variant !== 'symbol' && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight ${currentSize.textH}`}
              style={{ color: textFill, fontFamily: 'Montserrat, sans-serif' }}
            >
              AtlasGR
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-[#FF5618]/20 text-[#FF5618] border border-[#FF5618]/30">
              AI
            </span>
          </div>

          {variant === 'with-subtitle' && (
            <span
              className={`font-medium tracking-wide mt-0.5 ${currentSize.subH}`}
              style={{ color: subtitleColor }}
            >
              Segurança e Inteligência Logística
            </span>
          )}
        </div>
      )}
    </div>
  );
};

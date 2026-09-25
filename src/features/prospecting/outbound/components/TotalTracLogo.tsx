import type React from 'react';

interface TotalTracLogoProps {
  variant?: 'full' | 'symbol' | 'with-subtitle';
  theme?: 'dark' | 'light' | 'blue';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const TotalTracLogo: React.FC<TotalTracLogoProps> = ({
  variant = 'with-subtitle',
  theme = 'dark',
  size = 'md',
  className = ''
}) => {
  const sizeMap = {
    sm: { symbolH: 22, textH: 'text-lg', subH: 'text-[9px]' },
    md: { symbolH: 30, textH: 'text-2xl', subH: 'text-[11px]' },
    lg: { symbolH: 40, textH: 'text-3xl', subH: 'text-xs' },
    xl: { symbolH: 52, textH: 'text-4xl', subH: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  // Colors based on Total Trac Brand Manual
  const primaryBlue = '#374898';
  const _secondaryBlue = '#93DBF2'; // For the map pin icon inside
  const textFill = theme === 'light' ? '#374898' : '#FFFFFF';
  const subtitleColor = theme === 'light' ? '#666666' : '#94A3B8';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Total Trac Symbol: Map Pin with Wifi Arcs */}
      <svg
        height={currentSize.symbolH}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <path
          d="M60 120 C60 120 15 75 15 45 C15 20.147 35.147 0 60 0 C84.853 0 105 20.147 105 45 C105 75 60 120 60 120Z"
          fill={theme === 'dark' ? '#93DBF2' : primaryBlue}
        />
        <circle cx="60" cy="45" r="12" fill={theme === 'dark' ? '#374898' : '#FFFFFF'} />
        <path d="M78 30 A 25 25 0 0 1 78 60" stroke={theme === 'dark' ? '#374898' : '#FFFFFF'} strokeWidth="5" strokeLinecap="round" />
        <path d="M88 20 A 40 40 0 0 1 88 70" stroke={theme === 'dark' ? '#374898' : '#FFFFFF'} strokeWidth="5" strokeLinecap="round" />
      </svg>

      {variant !== 'symbol' && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight ${currentSize.textH}`}
              style={{ color: textFill, fontFamily: 'Fivo Sans, Montserrat, sans-serif' }}
            >
              Total Trac
            </span>
          </div>
          {variant === 'with-subtitle' && (
            <span
              className={`font-medium tracking-wide mt-0.5 ${currentSize.subH}`}
              style={{ color: subtitleColor }}
            >
              Outbound Inteligência
            </span>
          )}
        </div>
      )}
    </div>
  );
};

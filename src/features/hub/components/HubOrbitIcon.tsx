interface HubOrbitIconProps {
  itemKey: string;
  primary?: boolean;
}

const svgProps = {
  viewBox: '0 0 48 48',
  fill: 'none',
  'aria-hidden': true,
} as const;

/** Ilustrações vetoriais equivalentes às usadas nos círculos do HTML de referência. */
export function HubOrbitIcon({ itemKey, primary = false }: HubOrbitIconProps) {
  if (primary) {
    return (
      <svg {...svgProps} viewBox="0 0 60 60" className="h-[52px] w-[52px]">
        <rect x="6" y="8" width="48" height="34" rx="4" stroke="currentColor" strokeWidth="2.4" />
        <path
          d="M11 34 22 22l10 7 17-16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity=".55"
        />
        <path d="M16 25h10l5 2v5H16zM36 15h9l4 2v4H36z" fill="currentColor" opacity=".9" />
        <circle cx="49" cy="13" r="2.6" fill="#fff" />
        <path
          d="M24 46h12M30 42v4"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity=".6"
        />
      </svg>
    );
  }

  switch (itemKey) {
    case 'social-selling':
      return (
        <svg {...svgProps} className="h-[46px] w-[46px]">
          <circle
            cx="24"
            cy="24"
            r="21"
            fill="var(--color-surface)"
            stroke="#0A66C2"
            strokeWidth="2.2"
          />
          <path d="M7 41c0-9 7-14 17-14s17 5 17 14" fill="#FF6B10" />
          <path d="M16 29h16l3 5H13z" fill="#fff" opacity=".92" />
          <circle cx="24" cy="19" r="8" fill="#E4A97C" />
          <circle cx="37" cy="12" r="7" fill="#fff" stroke="#ddd" />
          <path
            d="m34 14 3-5 3 5M34 14h6"
            stroke="#A83810"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'treinamento-atlasgr':
      return (
        <svg {...svgProps} className="h-11 w-11">
          <path
            d="M24 3 8 9v14c0 11 7 20 16 24 9-4 16-13 16-24V9L24 3Z"
            stroke="#A83810"
            strokeWidth="2.5"
            fill="#FF9D70"
            fillOpacity=".28"
          />
          <path d="m24 13 11 5-11 5-11-5 11-5Z" fill="#FF6B10" />
          <path
            d="M17 21v6a7 7 0 0 0 14 0v-6M35 18v8"
            stroke="#0F9D64"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'proposta-comercial':
      return (
        <svg {...svgProps} className="h-[42px] w-[42px]">
          <path
            d="M12 4h18l8 8v30a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
            fill="#94A3B8"
            opacity=".22"
          />
          <path
            d="M30 4v8h8M16 20h16M16 25h11"
            stroke="#64748B"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path d="M14 36v-4h7v4h8v-3.5h3l3 3.5v4H14z" fill="#FF6B10" />
          <circle cx="19" cy="40" r="1.8" fill="var(--color-surface)" />
          <circle cx="30" cy="40" r="1.8" fill="var(--color-surface)" />
        </svg>
      );
    case 'hub-inteligencia-marketing':
      return (
        <svg {...svgProps} className="h-[42px] w-[42px]">
          <path
            d="M6 40h36"
            stroke="#94A3B8"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity=".5"
          />
          <path
            d="m8 34 9-12 8 7 11-13"
            stroke="#FF6B10"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="36" cy="14" r="3.2" fill="#0F9D64" />
          <path
            d="M31 10a7 7 0 0 1 10 0M28 7a12 12 0 0 1 16 0"
            stroke="#0F9D64"
            strokeWidth="2"
            strokeLinecap="round"
            opacity=".55"
          />
        </svg>
      );
    case 'sdr':
      return (
        <svg {...svgProps} className="h-[42px] w-[42px]">
          <circle cx="22" cy="21" r="14" stroke="#3B82F6" strokeWidth="2.6" />
          <path
            d="M22 14v7l5 3M17 4h10M22 4v3"
            stroke="#1E3A8A"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path d="M27 34h10l5 3v5H27z" fill="#FF6B10" />
        </svg>
      );
    case 'meeting-hub':
      return (
        <svg {...svgProps} className="h-[42px] w-[42px]">
          <rect x="4" y="9" width="24" height="24" rx="3" stroke="#4285F4" strokeWidth="2.6" />
          <path
            d="M4 16h24M12 5v7M22 5v7"
            stroke="#4285F4"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path d="m34 18 9-5v19l-9-5Z" fill="#34A853" />
          <path
            d="M15 21a3.6 3.6 0 0 1 3.6 3.6c0 2.8-3.6 6.4-3.6 6.4s-3.6-3.6-3.6-6.4A3.6 3.6 0 0 1 15 21Z"
            fill="#EA4335"
          />
        </svg>
      );
    case 'connect':
      return (
        <svg {...svgProps} className="h-[38px] w-[38px]">
          <path
            d="M15 6h-4a4 4 0 0 0-4 4v28a4 4 0 0 0 4 4h4M19 24h22M33 16l8 8-8 8"
            stroke="#FF6B10"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'new-connect':
      return (
        <svg {...svgProps} className="h-[38px] w-[38px]">
          <circle cx="24" cy="24" r="18" stroke="#3B82F6" strokeWidth="2.6" />
          <path
            d="M6 24h36M24 6c5 5 7 11 7 18s-2 13-7 18c-5-5-7-11-7-18s2-13 7-18Z"
            stroke="#3B82F6"
            strokeWidth="2.2"
            opacity=".75"
          />
        </svg>
      );
    case 'perfil-securitario':
      return (
        <svg {...svgProps} className="h-9 w-9">
          <path
            d="m24 4 15 5v12c0 11-6 18-15 22C15 39 9 32 9 21V9l15-5Z"
            stroke="#1E3A8A"
            strokeWidth="2.6"
            fill="#3B82F6"
            fillOpacity=".14"
          />
          <path
            d="m16 23 5 5 10-12"
            stroke="#0F9D64"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'bitrix24':
      return (
        <svg {...svgProps} className="h-9 w-9">
          <rect x="9" y="11" width="30" height="32" rx="2" stroke="#049DD9" strokeWidth="2.4" />
          <path
            d="M9 11 24 5l15 6M15 19h6m-6 7h6m-6 7h6m6-14h6m-6 7h6m-6 7h6"
            stroke="#02C39A"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'webmail':
      return (
        <svg {...svgProps} className="h-9 w-9">
          <rect x="6" y="11" width="36" height="27" rx="3" stroke="#3B82F6" strokeWidth="2.6" />
          <path
            d="m7 13 17 13 17-13"
            stroke="#1E3A8A"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'gmail':
      return (
        <svg {...svgProps} className="h-9 w-9">
          <path
            d="M6 27h10l3 5h10l3-5h10"
            stroke="#B0281A"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m9 27 2-15a2 2 0 0 1 2-2h22a2 2 0 0 1 2 2l2 15"
            stroke="#EA4335"
            strokeWidth="2.4"
          />
          <rect
            x="6"
            y="27"
            width="36"
            height="11"
            rx="2"
            stroke="#EA4335"
            strokeWidth="2.4"
            fill="#EA4335"
            fillOpacity=".14"
          />
        </svg>
      );
    case 'workspace':
      return (
        <svg {...svgProps} className="h-[34px] w-[34px]">
          <rect x="5" y="5" width="14" height="14" rx="3" fill="#4285F4" />
          <rect x="29" y="5" width="14" height="14" rx="3" fill="#EA4335" />
          <rect x="5" y="29" width="14" height="14" rx="3" fill="#FBBC05" />
          <rect x="29" y="29" width="14" height="14" rx="3" fill="#34A853" />
        </svg>
      );
    default:
      return (
        <svg {...svgProps} className="h-10 w-10">
          <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="2.4" />
          <path
            d="M16 24h16M24 16v16"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

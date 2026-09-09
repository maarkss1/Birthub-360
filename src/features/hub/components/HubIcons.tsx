import React from 'react';


export const HubIcons: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  "central": (props) => (<svg width="52" height="52" viewBox="0 0 60 60" fill="none">
                <rect x="6" y="8" width="48" height="34" rx="4" stroke="currentColor" strokeWidth="2.4" fill="none"/>
                <path d="M11 34 L22 22 L32 29 L49 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".55"/>
                <g transform="translate(16,25)"><rect width="10" height="6" rx="1.2" fill="currentColor"/><rect x="8" y="1.4" width="5" height="4.6" rx="1" fill="currentColor"/><circle cx="2.4" cy="7.2" r="1.5" fill="#FFFFFF"/><circle cx="9.6" cy="7.2" r="1.5" fill="#FFFFFF"/></g>
                <g transform="translate(36,15) scale(.85)"><rect width="10" height="6" rx="1.2" fill="currentColor" opacity=".85"/><rect x="8" y="1.4" width="5" height="4.6" rx="1" fill="currentColor" opacity=".85"/><circle cx="2.4" cy="7.2" r="1.5" fill="#FFFFFF"/><circle cx="9.6" cy="7.2" r="1.5" fill="#FFFFFF"/></g>
                <circle cx="49" cy="13" r="2.6" fill="#FFFFFF"/>
                <path d="M24 46h12M30 42v4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity=".6"/>
              </svg>),
  "social-selling": (props) => (<svg width="46" height="46" viewBox="0 0 56 56" fill="none">
                <defs>
                  <linearGradient id="uniformGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF9D70"/>
                    <stop offset="100%" stopColor="#A83810"/>
                  </linearGradient>
                </defs>
                <circle className="profile-ring" cx="28" cy="28" r="25" fill="var(--surface)" stroke="#0A66C2" strokeWidth="2.2"/>
                <path d="M8 47c0-10.5 8.5-16 20-16s20 5.5 20 16" fill="url(#uniformGrad)"/>
                <path d="M19 33h18l3 5.5H16z" fill="#FFFFFF" opacity=".92"/>
                <circle className="avatar-head" cx="28" cy="21" r="9.5" fill="#E4A97C"/>
                <g className="badge" transform="translate(40,12)">
                  <circle r="8" fill="#FFFFFF" stroke="#E2E2E2" strokeWidth="1.4"/>
                  <circle cx="-3.4" cy="2.6" r="1.6" fill="var(--brand-active)"/>
                  <circle cx="3.4" cy="2.6" r="1.6" fill="var(--brand-active)"/>
                  <circle cx="0" cy="-3.2" r="1.6" fill="var(--brand-active)"/>
                  <path d="M-2.4 1.4l2-3M2.4 1.4l-2-3" stroke="var(--brand-active)" strokeWidth="1" opacity=".7"/>
                </g>
              </svg>),
  "treinamento": (props) => (<svg width="44" height="44" viewBox="0 0 50 50" fill="none">
                <path d="M25 4L9 10v14c0 11.2 6.8 21.8 16 25.5 9.2-3.7 16-14.3 16-25.5V10L25 4z" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity=".12"/>
                <path d="M25 14l11 5-11 5-11-5 11-5z" fill="currentColor"/>
                <path d="M18 22v6c0 3.8 3.2 7 7 7s7-3.2 7-7v-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
                <path d="M36 19v8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>),
  "proposta": (props) => (<svg width="42" height="42" viewBox="0 0 48 48" fill="none">
                <path d="M12 4h18l8 8v30a2 2 0 01-2 2H12a2 2 0 01-2-2V6a2 2 0 012-2Z" fill="currentColor" opacity=".12"/>
                <path d="M30 4v8h8" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M16 20h16M16 25h11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity=".65"/>
                <path d="M14 36v-4h7v4h8v-3.5h3l3 3.5v4h-2a2 2 0 11-4 0h-7a2 2 0 11-4 0h-4z" fill="currentColor" opacity=".9"/>
                <circle cx="19" cy="40" r="1.6" fill="var(--surface)"/>
                <circle cx="30" cy="40" r="1.6" fill="var(--surface)"/>
              </svg>),
  "hub-mkt": (props) => (<svg width="42" height="42" viewBox="0 0 48 48" fill="none">
                <path d="M6 40h36" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity=".4"/>
                <path d="M8 34l9-12 8 7 11-13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="36" cy="14" r="3.2" fill="currentColor"/>
                <path d="M31 10a7 7 0 0110 0M28 7a12 12 0 0116 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".5"/>
                <circle cx="17" cy="22" r="2" fill="var(--brand)"/>
              </svg>),
  "sdr": (props) => (<svg width="42" height="42" viewBox="0 0 48 48" fill="none">
                <path d="M4 40h20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity=".35"/>
                <circle cx="22" cy="21" r="14" stroke="currentColor" strokeWidth="2.6"/>
                <path d="M22 14v7l5 3.2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 4h10M22 4v3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                <g transform="translate(26,33)"><rect width="10" height="6" rx="1.2" fill="currentColor"/><rect x="8" y="1.4" width="5" height="4.6" rx="1" fill="currentColor"/><circle cx="2.4" cy="7.2" r="1.5" fill="var(--surface)"/><circle cx="9.6" cy="7.2" r="1.5" fill="var(--surface)"/></g>
              </svg>),
  "meeting-hub": (props) => (<svg width="42" height="42" viewBox="0 0 48 48" fill="none">
                <rect x="4" y="9" width="24" height="24" rx="3" stroke="currentColor" strokeWidth="2.6"/>
                <path d="M4 16h24M12 5v7M22 5v7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
                <path d="M34 18l9-5v19l-9-5z" fill="currentColor" opacity=".85"/>
                <path d="M15 21a3.6 3.6 0 013.6 3.6c0 2.8-3.6 6.4-3.6 6.4s-3.6-3.6-3.6-6.4A3.6 3.6 0 0115 21z" fill="var(--brand)"/>
              </svg>),
  "revenue-intel": (props) => (<svg width="42" height="42" viewBox="0 0 48 48" fill="none">
                <path d="M6 40h36M10 40V28M18 40V22M26 40V26M34 40V16" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                <path d="M34 16l6.5-6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
                <circle cx="42" cy="8" r="2.6" fill="currentColor"/>
              </svg>),
  "connect": (props) => (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>),
  "new-connect": (props) => (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>),
  "securitario": (props) => (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>),
  "bitrix24": (props) => (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v18"/><path d="M14 9h5a1 1 0 0 1 1 1v12"/><path d="M2 22h20"/><path d="M9 6h1M9 10h1M9 14h1M9 18h1"/><path d="M17 13h1M17 17h1"/></svg>),
  "webmail": (props) => (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>),
  "gmail": (props) => (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>),
  "workspace": (props) => (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>),
};

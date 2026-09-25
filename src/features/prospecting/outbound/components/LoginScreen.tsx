import type React from 'react';
import { useState } from 'react';
import { Lock, Mail, Loader2, ArrowRight, Sun, Moon, Building2, Sparkles, ListChecks } from 'lucide-react';
import type { User, ThemeMode } from '../types.js';
import { AtlasLogo } from './AtlasLogo.js';
import { TotalTracLogo } from './TotalTracLogo.js';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  isDark: boolean;
  setTheme?: (theme: ThemeMode) => void;
}

type Company = 'atlas' | 'totaltrac';

const BRAND = {
  atlas: {
    label: 'AtlasGR',
    title: 'AtlasGR CRM',
    tagline: 'Segurança e Inteligência Logística',
    subtitle: 'Login exclusivo Equipe Atlas',
    placeholder: 'nome@atlasgr.com.br',
    gradientFrom: '#FF5618',
    gradientTo: '#FF8020',
    hoverFrom: '#FF4500',
    hoverTo: '#FF6510',
    accent: '#FF5618',
  },
  totaltrac: {
    label: 'Total Trac',
    title: 'Total Trac CRM',
    tagline: 'Conectar para Cuidar',
    subtitle: 'Login exclusivo Equipe Total Trac',
    placeholder: 'nome@totaltrac.com.br',
    gradientFrom: '#374898',
    gradientTo: '#008FCE',
    hoverFrom: '#2D3B78',
    hoverTo: '#007AB0',
    accent: '#374898',
  },
} as const;

// O que a plataforma realmente faz — usado como prova de valor ao lado do
// formulário, não é marketing genérico: reflete as etapas reais do pipeline
// de prospecção (Places + CNPJ oficial + Apollo) e o funil já implementado.
const FEATURES = [
  { icon: Building2, text: 'Prospecção com CNPJ oficial e decisores mapeados' },
  { icon: Sparkles, text: 'Roteiros de abordagem gerados por IA' },
  { icon: ListChecks, text: 'Funil comercial com tarefa recomendada por lead' },
] as const;

export function LoginScreen({ onLogin, isDark, setTheme }: LoginScreenProps) {
  const [company, setCompany] = useState<Company>('atlas');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const brand = BRAND[company];
  const Logo = company === 'atlas' ? AtlasLogo : TotalTracLogo;

  const handleCompanyChange = (next: Company) => {
    if (next === company) return;
    setCompany(next);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Auth & RBAC (CPI follow-up): o login agora também emite um cookie de sessão
      // httpOnly assinado pelo servidor (ver server/auth.ts). `credentials: 'include'`
      // garante que o navegador aceite/envie esse cookie em toda chamada seguinte à
      // API, mesmo sendo uma requisição same-origin (o padrão do fetch já cobre esse
      // caso, mas ficar explícito evita depender do default se a origem mudar).
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, company })
      });
      const data = await res.json();

      if (data.success) {
        // Para contas 'user', a marca é travada pelo servidor (a conta é exclusiva de uma empresa).
        // Admin gerencia as duas marcas, então nele o tema segue o toggle escolhido aqui no login.
        const effectiveCompany = data.user.role === 'admin' ? company : data.user.company;
        onLogin({ ...data.user, company: effectiveCompany });
      } else {
        setError(data.error || 'Falha ao autenticar.');
      }
    } catch (_err: any) {
      setError('Erro de conexão ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-[#0a0e17]' : 'bg-slate-50'}`}>
      {setTheme && (
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className={`fixed top-5 right-5 z-20 p-2 rounded-xl border shadow-sm transition ${
            isDark
              ? 'bg-slate-900/80 backdrop-blur text-amber-400 border-slate-800 hover:bg-slate-800'
              : 'bg-white/80 backdrop-blur text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
          title={isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      )}

      {/* Painel visual — prova de valor da plataforma, cor e logo seguem a marca escolhida */}
      <div
        className="hidden lg:flex lg:w-[46%] relative overflow-hidden items-center justify-center px-14 py-16 transition-colors duration-500"
        style={{
          // O véu escuro por trás do degradê existe para o selo "AI" do logo Atlas
          // (laranja translúcido) não sumir dentro do próprio fundo laranja.
          background: `linear-gradient(150deg, rgba(0,0,0,0.32), rgba(0,0,0,0.04)), linear-gradient(150deg, ${brand.gradientFrom}, ${brand.gradientTo})`
        }}
      >
        <div className="pointer-events-none absolute -top-32 -left-24 w-[26rem] h-[26rem] rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-16 w-[30rem] h-[30rem] rounded-full bg-black/20 blur-3xl" />
        <svg className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="login-dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.6" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-dot-grid)" />
        </svg>

        <div className="relative z-10 w-full max-w-sm">
          <Logo size="xl" theme="dark" variant="full" />

          <h2 className="mt-10 text-3xl font-black leading-tight text-white text-balance">
            {brand.tagline}
          </h2>
          <p className="mt-3 text-sm text-white/80">
            A central de prospecção e IA comercial da {brand.label}.
          </p>

          <ul className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-0.5 grid place-items-center w-8 h-8 rounded-lg bg-white/15 shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </span>
                <span className="text-sm text-white/90 leading-snug pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Painel do formulário */}
      <div className="flex-1 min-w-0 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full min-w-0 max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500">

          {/* Chave de seleção Atlas / TotalTrac */}
          <div className="flex justify-center mb-8">
            <div className={`relative flex p-1 rounded-full ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100 border border-slate-200'}`}>
              <div
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out"
                style={{
                  background: `linear-gradient(to right, ${brand.gradientFrom}, ${brand.gradientTo})`,
                  transform: company === 'atlas' ? 'translateX(0%)' : 'translateX(calc(100% + 8px))',
                }}
              ></div>
              {(Object.keys(BRAND) as Company[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleCompanyChange(key)}
                  className={`relative z-10 w-28 py-2 text-sm font-medium rounded-full transition-colors ${
                    company === key
                      ? 'text-white'
                      : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {BRAND[key].label}
                </button>
              ))}
            </div>
          </div>

          {/* Cabeçalho compacto — no desktop o painel visual já mostra o logo grande */}
          <div className="flex flex-col items-center lg:items-start mb-8">
            <div className="mb-5 lg:hidden">
              <Logo size="lg" theme={isDark ? 'dark' : 'light'} variant="full" />
            </div>
            <h1 className={`text-2xl font-bold text-center lg:text-left ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Bem-vindo de volta
            </h1>
            <p className={`text-sm mt-1.5 text-center lg:text-left ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {brand.subtitle}
            </p>
          </div>

          <div className={`w-full p-6 sm:p-7 rounded-2xl shadow-xl shadow-black/[0.03] ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-colors border outline-none focus:ring-2 ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                    style={{ '--tw-ring-color': `${brand.accent}33` } as React.CSSProperties}
                    onFocus={e => (e.currentTarget.style.borderColor = brand.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = '')}
                    placeholder={brand.placeholder}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-colors border outline-none focus:ring-2 ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                    style={{ '--tw-ring-color': `${brand.accent}33` } as React.CSSProperties}
                    onFocus={e => (e.currentTarget.style.borderColor = brand.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = '')}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs font-medium text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group w-full mt-2 flex items-center justify-center gap-2 text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-lg"
                style={{
                  background: `linear-gradient(to right, ${brand.gradientFrom}, ${brand.gradientTo})`,
                  boxShadow: `0 8px 20px -8px ${brand.accent}80`
                }}
                onMouseEnter={e => (e.currentTarget.style.background = `linear-gradient(to right, ${brand.hoverFrom}, ${brand.hoverTo})`)}
                onMouseLeave={e => (e.currentTarget.style.background = `linear-gradient(to right, ${brand.gradientFrom}, ${brand.gradientTo})`)}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    Entrar {brand.label}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className={`mt-6 text-center text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            Acesso restrito à equipe {brand.label}. Precisa de uma conta? Fale com o administrador.
          </p>
        </div>
      </div>
    </div>
  );
}

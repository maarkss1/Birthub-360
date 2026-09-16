/* eslint-disable jsx-a11y/no-autofocus -- campo revelado por ação do usuário, ver comentário no local de uso */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  Clock,
  LayoutGrid,
  ListChecks,
  Loader2,
  Lock,
  type LucideIcon,
  Mail,
  Share2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BrandEmblemBadge } from '../../../components/brand/BrandEmblemBadge';
import { isAuthorizedLoginEmail } from '../../../config/access-policy';
import { BRAND } from '../../../config/brand';
import { useAuth } from '../../../contexts/AuthContext';
import { authClient } from '../../../lib/auth-client';
import { EASE_PREMIUM, fadeInUp, SPRING_SOFT, useMagnetic, useTilt } from '../../../lib/motion';

// Cor de cada pilar (brand.ts `pillars`: Inteligência, Conexão, Execução) — os três feixes da
// órbita de 5 cores usados neste fluxo (dourado/azul/íris; vermelho e rosa ficam para o halo
// ambiente e o botão primário, ver mais abaixo). Não é decoração: cada feature carrega a cor do
// pilar que ela representa, mesma ordem em ConnectingCircles logo abaixo.
const FEATURES = [
  {
    icon: Building2,
    accent: 'brand' as const,
    text: 'Inteligência Comercial: prospecção com CNPJ oficial e decisores mapeados',
  },
  {
    icon: ListChecks,
    accent: 'orbit-blue' as const,
    text: 'Conexão & Pipeline: automações, propostas e integrações',
  },
  {
    icon: Sparkles,
    accent: 'iris' as const,
    text: 'Execução em Vendas: Dojo de IA e aceleração de receita',
  },
] as const;

// Ícones da abertura animada (ConnectingCircles) — os 3 primeiros ecoam FEATURES acima (mesma
// cor de pilar); o 4º (LayoutGrid) é o mesmo ícone do botão "Hub Executivo" na Sidebar
// (src/components/layout/Sidebar.tsx), literalmente o destino pra onde os três primeiros
// "círculos" se conectam.
const CONNECT_ICONS: readonly { icon: LucideIcon; accent: 'brand' | 'orbit-blue' | 'iris' }[] = [
  { icon: Building2, accent: 'brand' },
  { icon: ListChecks, accent: 'orbit-blue' },
  { icon: Sparkles, accent: 'iris' },
  { icon: LayoutGrid, accent: 'brand' },
];

interface ConnectingCirclesProps {
  reduceMotion: boolean;
}

// Abertura da tela de entrada do produto: os mesmos "círculos" do Hub Executivo (badges
// circulares, ver DestinationCard em src/features/hub/components/HubScreen.tsx) se conectando —
// pedido explícito do usuário. Não é decoração gratuita (regra #6 da constituição): comunica
// literalmente que este login é a porta de entrada para os destinos do Hub, terminando no mesmo
// ícone (LayoutGrid) usado no atalho real do Hub na Sidebar. Toca uma vez na montagem (sem
// repeat), e com prefers-reduced-motion a versão final já nasce montada, sem desenhar as linhas.
function ConnectingCircles({ reduceMotion }: ConnectingCirclesProps) {
  const nodeCount = CONNECT_ICONS.length;
  const spacing = 96;
  const radius = 22;
  const width = spacing * (nodeCount - 1) + radius * 2 + 8;
  const height = radius * 2 + 8;
  const cy = height / 2;
  const cx = (index: number) => radius + 4 + index * spacing;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="mx-auto h-auto w-full max-w-sm"
      aria-hidden="true"
    >
      {CONNECT_ICONS.slice(0, -1).map((node, index) => (
        <motion.line
          key={`line-${cx(index)}-${cx(index + 1)}`}
          x1={cx(index)}
          y1={cy}
          x2={cx(index + 1)}
          y2={cy}
          style={{ stroke: `var(--${node.accent})` }}
          strokeWidth={2}
          strokeLinecap="round"
          strokeOpacity={0.4}
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.4 }}
          transition={{ duration: 0.5, ease: EASE_PREMIUM, delay: 0.25 + index * 0.28 }}
        />
      ))}
      {CONNECT_ICONS.map(({ icon: Icon, accent }, index) => {
        const isHub = index === nodeCount - 1;
        return (
          <motion.g
            key={`node-${cx(index)}`}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...SPRING_SOFT, delay: index * 0.28 }}
            style={{ transformOrigin: `${cx(index)}px ${cy}px` }}
          >
            <circle
              cx={cx(index)}
              cy={cy}
              r={radius}
              style={{
                fill: isHub ? `var(--${accent})` : 'var(--surface)',
                stroke: `var(--${accent})`,
              }}
              strokeWidth={1.5}
            />
            <foreignObject x={cx(index) - 9} y={cy - 9} width={18} height={18}>
              <div className="flex h-full w-full items-center justify-center">
                <Icon
                  className="h-[18px] w-[18px]"
                  style={{ color: isHub ? 'var(--on-brand)' : `var(--${accent})` }}
                />
              </div>
            </foreignObject>
          </motion.g>
        );
      })}
    </svg>
  );
}

export function LoginScreen() {
  // Esta tela agora é a porta de entrada do produto (rota "/", além de "/login" — ver App.tsx):
  // um usuário já autenticado que cai aqui (aba antiga, link direto) vai direto pro destino real,
  // em vez de ver o formulário de novo.
  const { currentUser, isPending } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Sem CTA visível de auto-registro na tela (contas são provisionadas pelo admin) — mas o
  // formulário de cadastro em si continua existindo e funcional (autorização real de domínio é
  // sempre server-side, ver isAuthorizedLoginEmail/databaseHooks.user.create.before em
  // src/lib/auth.ts), acessível via ?signup=1 para os testes e2e (tests/e2e/helpers.ts::signUp)
  // exercitarem o fluxo real de criação de conta sem depender de um link que não deve mais
  // aparecer para usuários reais.
  const [isSignUp] = useState(
    () => new URLSearchParams(window.location.search).get('signup') === '1',
  );
  const [name, setName] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  // Cadastro (?signup=1) agora exige confirmação de posse do e-mail antes de abrir sessão (ver
  // requireEmailVerification em src/lib/auth.ts — achado do piloto de threat-modeling do Mantis:
  // antes, qualquer "algo@atlasgr.com.br" digitado, mesmo não sendo dono real, virava sessão +
  // ADMIN na hora). O servidor devolve `token: null` nesse caso; este estado mostra o aviso em
  // vez de tentar navegar para /app sem sessão nenhuma.
  const [verificationPending, setVerificationPending] = useState(false);

  const shouldReduceMotion = useReducedMotion();

  // Puxão magnético do botão principal — mesmo hook premium já usado em outras peças "hero" da
  // plataforma (src/lib/motion.ts), desligado automaticamente por prefers-reduced-motion.
  const submitMagnetic = useMagnetic(0.25);

  // Leve inclinação 3D no emblema da marca (painel esquerdo, desktop) ao mover o mouse — mesmo
  // hook premium de src/lib/motion.ts, já com guarda de prefers-reduced-motion embutida.
  const brandTilt = useTilt(6);

  // Relógio e calendário ao vivo do painel do formulário: reforçam a sensação de central
  // operando agora.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const weekday = format(now, 'EEEE', { locale: ptBR });
  const dateLabel = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${format(now, "dd 'de' MMMM", { locale: ptBR })}`;
  const timeLabel = format(now, 'HH:mm:ss');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!isAuthorizedLoginEmail(email)) {
      setError(
        'Acesso restrito. Utilize um e-mail corporativo autorizado do ecossistema Birth Hub 360°.',
      );
      setIsSubmitting(false);
      return;
    }

    // A validação de credenciais é feita inteiramente pelo servidor (better-auth);
    // o cliente nunca decide, por conta própria, se um login é válido.
    const result = isSignUp
      ? await authClient.signUp.email({
          email,
          password,
          name: name || email.split('@')[0],
          callbackURL: '/hub',
        })
      : await authClient.signIn.email({ email, password, rememberMe, callbackURL: '/hub' });

    if (result.error) {
      setError(result.error.message || 'Não foi possível autenticar. Verifique suas credenciais.');
      setIsSubmitting(false);
      return;
    }

    // Cadastro sem sessão de volta = e-mail ainda não confirmado (requireEmailVerification em
    // src/lib/auth.ts) — não há pra onde navegar ainda, então mostra o aviso em vez de tentar ir
    // pro Hub sem sessão (o que só voltaria pro login de qualquer forma).
    if (isSignUp && !result.data?.token) {
      setVerificationPending(true);
      setIsSubmitting(false);
      return;
    }

    window.location.href = '/hub';
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!isAuthorizedLoginEmail(email)) {
      setError(
        'Acesso restrito. Utilize um e-mail corporativo autorizado do ecossistema Birth Hub 360°.',
      );
      setIsSubmitting(false);
      return;
    }

    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(
        result.error.message || 'Não foi possível enviar o e-mail de redefinição. Tente novamente.',
      );
      return;
    }

    // O servidor sempre responde com sucesso, exista ou não o e-mail (evita que alguém descubra
    // quais e-mails têm conta só tentando redefinir a senha deles) — a mensagem abaixo reflete isso.
    setForgotPasswordSent(true);
  };

  const backToSignIn = () => {
    setIsForgotPassword(false);
    setForgotPasswordSent(false);
    setVerificationPending(false);
    setError('');
  };

  // O e-mail não decide mais a marca ativa visualmente, apenas guarda no state.
  const handleEmailChange = (value: string) => {
    setEmail(value);
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-brand w-8 h-8" aria-hidden="true" />
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to="/hub" replace />;
  }

  // Classes de texto/borda do painel direito: literais (slate), não os tokens semânticos
  // (text-ink, border-line...). Motivo real, não estético: este painel fica sempre claro,
  // independente do tema global do app — e WelcomeScreen.tsx já documentou que um wrapper
  // .dark/.light local não resolve corretamente os aliases --color-* do @theme (resolvidos uma
  // vez, relativos a :root). Um layout de dois tons simultâneos (painel sempre escuro ao lado de
  // painel sempre claro) não é possível com tokens que trocam junto com o tema global — por isso
  // as cores fixas dos dois painéis vêm de literais (texto) e de BRAND.colors via style inline
  // (a mesma fonte de verdade de cor do resto do app, nunca hex digitado à mão), em vez dos
  // tokens de tema.
  const inputClass =
    'block w-full border-0 border-b-2 border-slate-300 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 shadow-sm transition-colors focus:border-[var(--login-accent)] focus:outline-none focus:ring-0';

  return (
    <div
      className="relative flex min-h-screen overflow-hidden"
      style={{ ['--login-accent' as string]: BRAND.colors.brand }}
    >
      {/* Painel esquerdo — cosmos escuro fixo com emblema 3D e cabeçalho interativo */}
      <aside
        className="relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-between lg:p-10"
        style={{ backgroundColor: BRAND.colors.obsidian }}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div
            className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full blur-[120px]"
            style={{ backgroundColor: BRAND.colors.brand, opacity: 0.18 }}
          />
          <div
            className="absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full blur-[120px]"
            style={{ backgroundColor: BRAND.colors.iris, opacity: 0.18 }}
          />
        </div>

        {/* Barra Superior do Painel da Marca */}
        <div className="relative z-10 flex w-full items-center justify-between">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-700/60 bg-slate-900/50 text-slate-300 backdrop-blur-md transition-colors hover:border-amber-400/50 hover:text-white"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>

          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-950/30 px-4 py-1.5 text-xs font-black tracking-[0.18em] text-amber-300 shadow-[0_0_15px_rgba(229,184,66,0.25)] backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
            HUB 360 ATIVO
          </div>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-700/60 bg-slate-900/50 text-slate-300 backdrop-blur-md transition-colors hover:border-amber-400/50 hover:text-white"
            aria-label="Compartilhar"
          >
            <Share2 size={18} />
          </button>
        </div>

        {/* Emblema Central e Tipografia da Marca */}
        <motion.div
          ref={brandTilt.ref as React.RefObject<HTMLDivElement>}
          style={brandTilt.style}
          onPointerMove={brandTilt.onPointerMove}
          onPointerLeave={brandTilt.onPointerLeave}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative my-auto flex flex-col items-center px-6 text-center"
        >
          <BrandEmblemBadge className="h-56 w-56 md:h-64 md:w-64" title="Birth Hub 360°" />
          <p className="mt-8 font-serif text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#F7DF94] via-[#E5B842] to-[#B38728] drop-shadow-md sm:text-4xl">
            BIRTH HUB 360°
          </p>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.25em] text-[#E5B842]">
            ECOSSISTEMA DE ALTA PERFORMANCE
          </p>
          <p className="mt-6 max-w-md text-center text-sm leading-relaxed text-slate-300">
            Sua central de comando inteligente:{' '}
            <strong className="font-bold text-white">integrando dados</strong>, potencializando
            decisões e{' '}
            <strong className="font-bold text-[#E5B842]">acelerando a sua execução</strong>.
          </p>
        </motion.div>

        {/* Espaçador inferior para equilíbrio visual */}
        <div className="h-6 w-full" aria-hidden="true" />
      </aside>

      {/* Painel direito — formulário claro fixo (mesma justificativa de cor acima). */}
      <div
        className="relative flex flex-1 flex-col items-center justify-center px-6 py-10"
        style={{ backgroundColor: BRAND.colors.blossom }}
      >
        <div className="w-full max-w-md">
          {/* Emblema mobile-only — desktop já mostra o emblema grande no painel esquerdo. */}
          <div className="mb-6 flex justify-center lg:hidden">
            <BrandEmblemBadge className="h-16 w-16" title="Birth Hub 360°" />
          </div>

          {/* Relógio e calendário ao vivo */}
          <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-bold text-slate-600 lg:justify-start">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} strokeWidth={2.5} aria-hidden="true" />
              {dateLabel}
            </span>
            <span className="h-1 w-1 rounded-full bg-current opacity-40" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5 tabular-nums" aria-live="off">
              <Clock size={14} strokeWidth={2.5} aria-hidden="true" />
              {timeLabel}
            </span>
          </div>

          <div className="mb-6">
            <ConnectingCircles reduceMotion={!!shouldReduceMotion} />
          </div>

          <h1 className="text-center font-display text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl lg:text-left">
            Entrar na Plataforma
          </h1>
          <p className="mt-2 text-center text-sm text-slate-600 lg:text-left">
            Acesse sua conta para gerenciar inteligência, vendas e operações.
          </p>

          <motion.div
            initial={shouldReduceMotion ? false : 'hidden'}
            animate="show"
            variants={fadeInUp}
            className="mt-8"
          >
            {verificationPending ? (
              <div className="space-y-5 text-center">
                <div
                  className="flex items-start gap-2.5 rounded-2xl border p-3.5 text-left text-sm text-slate-700"
                  style={{
                    backgroundColor: `${BRAND.colors.brand}14`,
                    borderColor: `${BRAND.colors.brand}4D`,
                  }}
                  role="status"
                >
                  <Mail size={16} className="mt-0.5 shrink-0" />
                  <p>
                    Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para
                    confirmar que este e-mail é seu e ativar sua conta.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={backToSignIn}
                  className="cursor-pointer text-sm font-bold text-slate-700 transition-colors hover:underline hover:text-slate-900"
                >
                  Voltar para o login
                </button>
              </div>
            ) : isForgotPassword ? (
              forgotPasswordSent ? (
                <div className="space-y-5 text-center">
                  <div
                    className="flex items-start gap-2.5 rounded-2xl border p-3.5 text-left text-sm text-slate-700"
                    style={{
                      backgroundColor: `${BRAND.colors.brand}14`,
                      borderColor: `${BRAND.colors.brand}4D`,
                    }}
                    role="status"
                  >
                    <Mail size={16} className="mt-0.5 shrink-0" />
                    <p>
                      Se <strong>{email}</strong> tiver uma conta cadastrada, enviamos um e-mail com
                      um link para redefinir a senha. O link expira em 1 hora.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={backToSignIn}
                    className="cursor-pointer text-sm font-bold text-slate-700 transition-colors hover:underline hover:text-slate-900"
                  >
                    Voltar para o login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-start gap-2.5 rounded-2xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-700"
                      role="alert"
                    >
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <p>{error}</p>
                    </motion.div>
                  )}

                  <p className="text-sm text-slate-600">
                    Informe seu e-mail corporativo para receber as instruções de recuperação de senha.
                  </p>

                  <div>
                    <label
                      htmlFor="login-forgot-email"
                      className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
                    >
                      E-mail Corporativo
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <Mail className="h-4 w-4 text-slate-600" aria-hidden="true" />
                      </div>
                      <input
                        id="login-forgot-email"
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        className={inputClass}
                        required
                        /* campo revelado por ação do usuário ("Esqueceu a senha?"), não
                         focus automático de carregamento de página; foca o único campo do
                         sub-formulário que acabou de aparecer, mesmo padrão de diálogo do
                         WAI-ARIA Authoring Practices. */
                        // biome-ignore lint/a11y/noAutofocus: ver comentário acima
                        autoFocus
                      />
                    </div>
                  </div>

                  <motion.button
                    ref={submitMagnetic.ref as React.RefObject<HTMLButtonElement>}
                    type="submit"
                    disabled={isSubmitting || !email}
                    onPointerMove={submitMagnetic.onPointerMove}
                    onPointerLeave={submitMagnetic.onPointerLeave}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      ...submitMagnetic.style,
                      backgroundImage: `linear-gradient(to right, ${BRAND.colors.brand}, ${BRAND.colors.brandAccent})`,
                    }}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-4 text-sm font-extrabold uppercase tracking-wide text-slate-950 shadow-md transition-shadow hover:shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      'Enviar Link de Recuperação'
                    )}
                  </motion.button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={backToSignIn}
                      className="cursor-pointer text-sm font-bold text-slate-700 transition-colors hover:underline hover:text-slate-900"
                    >
                      Voltar para o login
                    </button>
                  </div>
                </form>
              )
            ) : (
              <form onSubmit={handleAuth} className="space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-start gap-2.5 rounded-2xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-700"
                    role="alert"
                  >
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </motion.div>
                )}

                {isSignUp && (
                  <div>
                    <label
                      htmlFor="login-name"
                      className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
                    >
                      Seu Nome Completo
                    </label>
                    <input
                      id="login-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full rounded-t-lg border-0 border-b-2 border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder-slate-500 shadow-sm transition-colors focus:border-[var(--login-accent)] focus:outline-none focus:ring-0"
                      placeholder="Ex: Marcelo Nascimento"
                      required={isSignUp}
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
                  >
                    E-mail Corporativo
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Mail className="h-4 w-4 text-slate-600" aria-hidden="true" />
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      className={`${inputClass} rounded-t-lg`}
                      placeholder="seu.email@empresa.com.br"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
                  >
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Lock className="h-4 w-4 text-slate-600" aria-hidden="true" />
                    </div>
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClass} rounded-t-lg`}
                      placeholder="••••••••••••"
                      required
                    />
                  </div>
                </div>

                {!isSignUp && (
                  <div className="flex items-center justify-between pt-1">
                    <label
                      htmlFor="login-remember"
                      className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600"
                    >
                      <input
                        id="login-remember"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300"
                        style={{ accentColor: BRAND.colors.brand }}
                      />
                      Lembrar de mim
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError('');
                      }}
                      className="cursor-pointer text-xs font-bold text-slate-700 transition-colors hover:underline hover:text-slate-900"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                )}

                <motion.button
                  ref={submitMagnetic.ref as React.RefObject<HTMLButtonElement>}
                  type="submit"
                  disabled={isSubmitting || !email || !password}
                  onPointerMove={submitMagnetic.onPointerMove}
                  onPointerLeave={submitMagnetic.onPointerLeave}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    ...submitMagnetic.style,
                    backgroundImage: `linear-gradient(to right, ${BRAND.colors.brand}, ${BRAND.colors.brandAccent})`,
                  }}
                  className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-4 text-sm font-extrabold uppercase tracking-wide text-slate-950 shadow-md transition-shadow hover:shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : isSignUp ? (
                    'Criar nova conta'
                  ) : (
                    'Acessar Plataforma'
                  )}
                </motion.button>
              </form>
            )}
          </motion.div>

          <div className="mt-8 flex items-center justify-center gap-2 border-t border-slate-200 pt-6 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600">
            <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            Ambiente Seguro • Criptografia 256-bit
          </div>

          {/* Prova de valor — os mesmos 3 pilares do painel esquerdo (mesma FEATURES), agora
              sempre visível aqui: o painel esquerdo em desktop é só emblema + nome, então este é
              o único lugar em qualquer breakpoint onde os pilares aparecem como texto lido. */}
          <section className="relative z-10 mt-10" aria-labelledby="login-features-heading">
            <div className="mb-4 flex items-center gap-2">
              <h2
                id="login-features-heading"
                className="font-display text-sm font-black uppercase tracking-[0.14em] text-slate-600"
              >
                O que você vai encontrar
              </h2>
              <span
                className="h-px flex-1 bg-gradient-to-r from-slate-300 to-transparent"
                aria-hidden="true"
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              {FEATURES.map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex flex-col items-start gap-3 rounded-card border border-slate-200 bg-white p-5"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-50">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm leading-relaxed text-slate-600">{text}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

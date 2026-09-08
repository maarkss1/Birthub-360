/* eslint-disable jsx-a11y/no-autofocus -- campo revelado por ação do usuário, ver comentário no local de uso */
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Loader2,
  AlertCircle,
  ArrowRight,
  Mail,
  Building2,
  ListChecks,
  Sparkles,
  LayoutGrid,
  Clock,
  CalendarDays,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../../contexts/AuthContext';
import { useBrand, BRAND_CONFIGS, type Brand } from '../../../contexts/BrandContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useBrandAccent } from '../../../hooks/useBrandAccent';
import { authClient } from '../../../lib/auth-client';
import { isAuthorizedLoginEmail, getBrandFromEmail } from '../../../config/access-policy';
import { Logo } from '../../../components/Logo';
import { TotalTrackLogo } from '../../../components/TotalTrackLogo';
import { SoundFX } from '../../../lib/soundEffects';
import { fadeInUp, SPRING_SOFT, EASE_PREMIUM, useMagnetic } from '../../../lib/motion';

const BRAND_ORDER: Brand[] = ['atlasgr', 'totaltrac'];

// Prova de valor real (não é marketing genérico): reflete os grupos de jornada reais da Sidebar
// (src/components/layout/Sidebar.tsx) — Captar, Fechar, IA & Capacitação.
const FEATURES = [
  {
    icon: Building2,
    text: 'Prospecção com CNPJ oficial e decisores mapeados',
  },
  { icon: ListChecks, text: 'Pipeline comercial com automações, propostas e Bitrix24' },
  { icon: Sparkles, text: 'Dojo de Vendas: treino comercial com IA e capacitação contínua' },
] as const;

// Ícones da abertura animada (ConnectingCircles) — os 3 primeiros ecoam FEATURES acima; o 4º
// (LayoutGrid) é o mesmo ícone do botão "Hub Executivo" na Sidebar (src/components/layout/
// Sidebar.tsx), literalmente o destino pra onde os três primeiros "círculos" se conectam.
const CONNECT_ICONS: readonly LucideIcon[] = [Building2, ListChecks, Sparkles, LayoutGrid];

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
      {CONNECT_ICONS.slice(0, -1).map((_, index) => (
        <motion.line
          key={`line-${cx(index)}-${cx(index + 1)}`}
          x1={cx(index)}
          y1={cy}
          x2={cx(index + 1)}
          y2={cy}
          style={{ stroke: 'var(--brand)' }}
          strokeWidth={2}
          strokeLinecap="round"
          strokeOpacity={0.35}
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.35 }}
          transition={{ duration: 0.5, ease: EASE_PREMIUM, delay: 0.25 + index * 0.28 }}
        />
      ))}
      {CONNECT_ICONS.map((Icon, index) => {
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
                fill: isHub ? 'var(--brand)' : 'var(--surface)',
                stroke: isHub ? 'var(--brand)' : 'var(--line)',
              }}
              strokeWidth={1.5}
            />
            <foreignObject x={cx(index) - 9} y={cy - 9} width={18} height={18}>
              <div className="flex h-full w-full items-center justify-center">
                <Icon
                  className={
                    isHub ? 'h-[18px] w-[18px] text-white' : 'h-[18px] w-[18px] text-brand'
                  }
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
  const { activeBrand, setActiveBrand, brandInfo } = useBrand();
  const { theme, toggleTheme } = useTheme();
  const brandAccent = useBrandAccent();
  const shouldReduceMotion = useReducedMotion();

  // Puxão magnético do botão principal — mesmo hook premium já usado em outras peças "hero" da
  // plataforma (src/lib/motion.ts), desligado automaticamente por prefers-reduced-motion.
  const submitMagnetic = useMagnetic(0.25);

  // Relógio e calendário ao vivo do painel do formulário: reforçam a sensação de central
  // operando agora, na cor da marca ativa no momento.
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
        'Acesso restrito. Utilize um e-mail corporativo autorizado da AtlasGR (@atlasgr.com.br) ou Total Trac (@totaltrac.com.br).',
      );
      setIsSubmitting(false);
      return;
    }

    setActiveBrand(getBrandFromEmail(email));

    // A validação de credenciais é feita inteiramente pelo servidor (better-auth);
    // o cliente nunca decide, por conta própria, se um login é válido.
    const result = isSignUp
      ? await authClient.signUp.email({
          email,
          password,
          name: name || email.split('@')[0],
          callbackURL: '/app',
        })
      : await authClient.signIn.email({ email, password, callbackURL: '/app' });

    if (result.error) {
      setError(result.error.message || 'Não foi possível autenticar. Verifique suas credenciais.');
      setIsSubmitting(false);
      return;
    }

    // Cadastro sem sessão de volta = e-mail ainda não confirmado (requireEmailVerification em
    // src/lib/auth.ts) — não há pra onde navegar ainda, então mostra o aviso em vez de tentar ir
    // pra /app sem sessão (o que só voltaria pro login de qualquer forma).
    if (isSignUp && !result.data?.token) {
      setVerificationPending(true);
      setIsSubmitting(false);
      return;
    }

    window.location.href = '/app';
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!isAuthorizedLoginEmail(email)) {
      setError(
        'Acesso restrito. Utilize um e-mail corporativo autorizado da AtlasGR (@atlasgr.com.br) ou Total Trac (@totaltrac.com.br).',
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

  // Reflete a marca em tempo real conforme o domínio digitado — o toggle abaixo permite escolher a
  // marca antes de digitar o e-mail, mas o e-mail continua sendo a fonte de verdade no submit
  // (handleAuth chama getBrandFromEmail de novo), então os dois mecanismos nunca divergem.
  const handleEmailChange = (value: string) => {
    setEmail(value);
    setActiveBrand(getBrandFromEmail(value));
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-brand w-8 h-8" aria-hidden="true" />
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Cabeçalho — mesmo padrão do Hub Executivo (HubScreen.tsx): logo da marca ativa +
          alternador de tema, para que a primeira tela do produto já seja visualmente contínua com
          a tela que vem logo depois do login. */}
      <header className="border-b border-line bg-surface/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          {activeBrand === 'atlasgr' ? (
            <Logo className="h-7 text-ink" />
          ) : (
            <TotalTrackLogo className="h-7 text-ink" />
          )}
          <button
            type="button"
            onClick={() => {
              SoundFX.play('focus');
              toggleTheme();
            }}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-transparent text-ink-2 transition-[transform,background-color,border-color,color] duration-200 hover:-translate-y-0.5 hover:border-line hover:bg-surface-2 hover:text-ink active:translate-y-0"
            aria-label="Alternar tema"
            title={`Mudar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl overflow-hidden px-6 py-10 md:py-16">
        {/* Glow de canto — mesmo tratamento do card "Central Comercial" do Hub Executivo (ver
            HubScreen.tsx), substituindo a esfera 3D (AtlasOrb/@react-three/fiber) que ocupava este
            espaço antes. Troca deliberada, não corte por "achar desnecessário" (ver CLAUDE.md
            seção 9): esta tela virou a porta de entrada do produto (rota "/", maior tráfego de
            qualquer tela), e o objetivo agora é ela puxar a mesma linguagem visual do Hub que vem
            em seguida — círculos e glow suave, sem 3D. Também remove ~236KB gzip do chunk
            three.js do carregamento crítico desta rota (ver performance/SKILL.md). */}
        <div
          className="pointer-events-none absolute -right-16 -top-20 hidden h-72 w-72 rounded-full bg-brand/10 blur-[90px] sm:block"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex max-w-md flex-col items-center text-center">
          <ConnectingCircles reduceMotion={!!shouldReduceMotion} />

          <motion.div
            initial={shouldReduceMotion ? false : 'hidden'}
            animate="show"
            variants={fadeInUp}
            className="mt-4 w-full"
          >
            {/* Relógio e calendário ao vivo — mesma cor da marca ativa */}
            <div
              className={`mb-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-bold ${brandAccent.text}`}
            >
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={15} strokeWidth={2.5} aria-hidden="true" />
                {dateLabel}
              </span>
              <span className="h-1 w-1 rounded-full bg-current opacity-40" aria-hidden="true" />
              <span className="inline-flex items-center gap-1.5 tabular-nums" aria-live="off">
                <Clock size={15} strokeWidth={2.5} aria-hidden="true" />
                {timeLabel}
              </span>
            </div>

            {/* Chave Atlas / Total Trac — escolha explícita da marca, peso visual igual entre as
                duas, sincronizada com handleEmailChange. */}
            <div className="flex justify-center mb-6">
              <div className="relative flex p-1 rounded-full bg-surface-2 border border-line">
                <div
                  aria-hidden="true"
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-brand to-brand-2 transition-transform duration-300 ease-out"
                  style={{
                    transform:
                      activeBrand === 'atlasgr' ? 'translateX(0%)' : 'translateX(calc(100% + 8px))',
                  }}
                />
                {BRAND_ORDER.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setActiveBrand(brand)}
                    aria-pressed={activeBrand === brand}
                    className={`relative z-10 flex w-28 items-center justify-center gap-1.5 py-2.5 text-sm font-bold rounded-full transition-colors cursor-pointer ${
                      activeBrand === brand ? 'text-white' : `text-ink-2 hover:${brandAccent.text}`
                    }`}
                  >
                    {brand === 'atlasgr' ? (
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${activeBrand === brand ? 'bg-white' : ''}`}
                      >
                        <Logo variant="symbol" className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <TotalTrackLogo
                        variant="symbol"
                        tone={activeBrand === brand ? 'negative' : 'positive'}
                        className="h-4 w-4 shrink-0"
                      />
                    )}
                    {BRAND_CONFIGS[brand].name}
                  </button>
                ))}
              </div>
            </div>

            <h1 className={`text-3xl font-black text-center ${brandAccent.text}`}>Bem-vindo</h1>
            <p className="mt-2 text-sm text-ink-2">
              {brandInfo.slogan} — a central de prospecção e inteligência comercial da{' '}
              {brandInfo.name}.
            </p>

            <div
              className={`mt-8 w-full p-6 sm:p-7 rounded-card-lg border border-brand/25 bg-surface text-left shadow-card transition-shadow duration-300 ${brandAccent.glow}`}
            >
              {verificationPending ? (
                <div className="space-y-5 text-center">
                  <div className="bg-brand/10 border border-brand/30 text-ink p-3.5 rounded-2xl text-sm flex items-start gap-2.5 text-left">
                    <Mail size={16} className="shrink-0 mt-0.5 text-brand" />
                    <p>
                      Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele
                      para confirmar que este e-mail é seu e ativar sua conta.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={backToSignIn}
                    className={`text-sm font-bold hover:underline transition-colors cursor-pointer ${brandAccent.text}`}
                  >
                    Voltar para o login
                  </button>
                </div>
              ) : isForgotPassword ? (
                forgotPasswordSent ? (
                    <div className="space-y-5 text-center">
                      <div className="bg-brand/10 border border-brand/30 text-ink p-3.5 rounded-2xl text-sm flex items-start gap-2.5 text-left">
                        <Mail size={16} className="shrink-0 mt-0.5 text-brand" />
                        <p>
                          Se <strong>{email}</strong> tiver uma conta cadastrada, enviamos um e-mail
                          com um link para redefinir a senha. O link expira em 1 hora.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={backToSignIn}
                        className={`text-sm font-bold hover:underline transition-colors cursor-pointer ${brandAccent.text}`}
                      >
                        Voltar para o login
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-danger/10 border border-danger/30 text-danger-active dark:text-danger p-3.5 rounded-2xl text-xs flex items-start gap-2.5"
                        >
                          <AlertCircle size={16} className="shrink-0 mt-0.5" />
                          <p>{error}</p>
                        </motion.div>
                      )}

                      <p className="text-ink-2 text-sm">
                        Informe o e-mail corporativo da sua conta. Se ele existir, enviaremos um
                        link para redefinir a senha.
                      </p>

                      <div>
                        <label
                          htmlFor="login-forgot-email"
                          className={`block text-xs font-extrabold uppercase tracking-wider mb-2 ml-1 ${brandAccent.text}`}
                        >
                          E-mail:
                        </label>
                        <input
                          id="login-forgot-email"
                          type="email"
                          value={email}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3.5 text-sm text-ink placeholder-ink-2 focus:outline-none focus:ring-2 focus:ring-brand transition-all"
                          required
                          /* campo revelado por ação do usuário ("Esqueci minha senha"), não focus
                           automático de carregamento de página; foca o único campo do
                           sub-formulário que acabou de aparecer, mesmo padrão de diálogo do
                           WAI-ARIA Authoring Practices. */
                          // biome-ignore lint/a11y/noAutofocus: ver comentário acima
                          autoFocus
                        />
                      </div>

                      <motion.button
                        ref={submitMagnetic.ref as React.RefObject<HTMLButtonElement>}
                        type="submit"
                        disabled={isSubmitting || !email}
                        onPointerMove={submitMagnetic.onPointerMove}
                        onPointerLeave={submitMagnetic.onPointerLeave}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={submitMagnetic.style}
                        className="w-full mt-2 bg-gradient-to-r from-brand to-brand-2 text-white py-3.5 rounded-2xl font-extrabold text-sm shadow-lg shadow-brand/30 transition-shadow hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <>
                            Enviar Link de Redefinição <ArrowRight size={16} />
                          </>
                        )}
                      </motion.button>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={backToSignIn}
                          className={`text-sm font-bold hover:underline transition-colors cursor-pointer ${brandAccent.text}`}
                        >
                          Voltar para o login
                        </button>
                      </div>
                    </form>
                  )
              ) : (
                <form onSubmit={handleAuth} className="space-y-4">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-danger/10 border border-danger/30 text-danger-active dark:text-danger p-3.5 rounded-2xl text-xs flex items-start gap-2.5"
                      >
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <p>{error}</p>
                      </motion.div>
                    )}

                    {isSignUp && (
                      <div>
                        <label
                          htmlFor="login-name"
                          className={`block text-xs font-extrabold uppercase tracking-wider mb-2 ml-1 ${brandAccent.text}`}
                        >
                          Seu Nome Completo
                        </label>
                        <input
                          id="login-name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3.5 text-sm text-ink placeholder-ink-2 focus:outline-none focus:ring-2 focus:ring-brand transition-all"
                          placeholder="Ex: Marcelo Nascimento"
                          required={isSignUp}
                        />
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="login-email"
                        className={`block text-xs font-extrabold uppercase tracking-wider mb-2 ml-1 ${brandAccent.text}`}
                      >
                        E-mail:
                      </label>
                      <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3.5 text-sm text-ink placeholder-ink-2 focus:outline-none focus:ring-2 focus:ring-brand transition-all"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2 ml-1 mr-1">
                        <label
                          htmlFor="login-password"
                          className={`block text-xs font-extrabold uppercase tracking-wider ${brandAccent.text}`}
                        >
                          Senha:
                        </label>
                        {!isSignUp && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsForgotPassword(true);
                              setError('');
                            }}
                            className={`text-xs font-bold hover:underline transition-colors cursor-pointer ${brandAccent.text}`}
                          >
                            Esqueci minha senha
                          </button>
                        )}
                      </div>
                      <input
                        id="login-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3.5 text-sm text-ink placeholder-ink-2 focus:outline-none focus:ring-2 focus:ring-brand transition-all"
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    <motion.button
                      ref={submitMagnetic.ref as React.RefObject<HTMLButtonElement>}
                      type="submit"
                      disabled={isSubmitting || !email || !password}
                      onPointerMove={submitMagnetic.onPointerMove}
                      onPointerLeave={submitMagnetic.onPointerLeave}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={submitMagnetic.style}
                      className="w-full mt-2 bg-gradient-to-r from-brand to-brand-2 text-white py-3.5 rounded-2xl font-extrabold text-sm shadow-lg shadow-brand/30 transition-shadow hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <>
                          {isSignUp ? 'Criar Nova Conta' : 'Entrar'} <ArrowRight size={16} />
                        </>
                      )}
                    </motion.button>
                  </form>
              )}
            </div>
          </motion.div>
        </div>

        {/* Prova de valor — mesma seção do Hub Executivo (rótulo + linha degradê, ver
            HubScreen.tsx "Acervo Executivo"/"Ferramentas"), com os mesmos badges circulares. */}
        <section
          className="relative z-10 mx-auto mt-14 max-w-3xl"
          aria-labelledby="login-features-heading"
        >
          <div className="mb-4 flex items-center gap-2">
            <h2
              id="login-features-heading"
              className="font-display text-sm font-black uppercase tracking-[0.14em] text-ink-2"
            >
              O que você vai encontrar
            </h2>
            <span
              className="h-px flex-1 bg-gradient-to-r from-line to-transparent"
              aria-hidden="true"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-5"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-brand">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm leading-relaxed text-ink-2">{text}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

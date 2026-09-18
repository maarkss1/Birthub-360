import { LayoutGrid, type LucideIcon } from 'lucide-react';
/* eslint-disable jsx-a11y/no-autofocus -- campo revelado por ação do usuário, ver comentário no local de uso */

import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  ListChecks,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthorizedLoginEmail } from '../../../config/access-policy';
import { BRAND } from '../../../config/brand';
import { useAuth } from '../../../contexts/AuthContext';
import { authClient } from '../../../lib/auth-client';
import { EASE_PREMIUM, fadeInUp, SPRING_SOFT, useMagnetic } from '../../../lib/motion';

// Ícones da abertura animada (ConnectingCircles) — os 3 primeiros ecoam os pilares da marca;
// o 4º (LayoutGrid) é o mesmo ícone do botão "Hub Executivo" na Sidebar, o destino de entrada.
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
  
  // Relógio e calendário ao vivo do painel do formulário: reforçam a sensação de central
  // operando agora.

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
    'block w-full border-0 border-b-2 border-slate-300 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-[var(--login-accent)] focus:outline-none focus:ring-0';

  return (
<div className="relative min-h-screen overflow-hidden bg-bg">
      {/* Atmosfera — halos suaves nas 5 cores da marca, nunca como fundo sólido com texto em
          cima (regra #3 da constituição): só glow difuso atrás do conteúdo. */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full bg-brand/12 blur-[120px]" />
        <div className="absolute top-1/3 -left-32 h-[380px] w-[380px] rounded-full bg-iris/10 blur-[120px]" />
        <div className="absolute -bottom-40 right-1/4 h-[360px] w-[360px] rounded-full bg-pink/8 blur-[120px]" />
      </div>

<main className="relative mx-auto max-w-6xl px-6 py-4 md:py-6">
        <div className="relative z-10 mx-auto flex max-w-md flex-col items-center text-center">
          <ConnectingCircles reduceMotion={!!shouldReduceMotion} />

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
                    Informe seu e-mail corporativo para receber as instruções de recuperação de
                    senha.
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

          <div className="mt-8 flex items-center justify-center gap-2 border-t border-slate-200 pt-6 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            Ambiente Seguro • Criptografia 256-bit
          </div>
        </div>
      </main>
    </div>
  );
}

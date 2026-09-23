import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Database,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Play,
  Eye,
  EyeOff,
  DatabaseZap,
  Target,
  Rocket,
  BrainCircuit,
  ArrowDown,
  ChevronDown
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BirthHubLogo, BirthHubWordmark } from '../../../components/brand/BirthHubLogo';
import { isAuthorizedLoginEmail } from '../../../config/access-policy';
import { BRAND } from '../../../config/brand';
import { useAuth } from '../../../contexts/AuthContext';
import { authClient } from '../../../lib/auth-client';
import { staggerContainer, staggerItem } from '../../../lib/motion';

export function LandingLoginSplitScreen() {
  const navigate = useNavigate();
  const { currentUser, isPending } = useAuth();
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [isSignUp] = useState(
    () => new URLSearchParams(window.location.search).get('signup') === '1',
  );
  const [name, setName] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  
  // Tabs for login panel
  const [activeTab, setActiveTab] = useState<'email' | 'sso'>('email');

  const shouldReduceMotion = useReducedMotion();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const weekday = format(now, 'EEEE', { locale: ptBR });
  const dateLabel = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${format(now, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
  const timeLabel = format(now, 'HH:mm');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!isAuthorizedLoginEmail(email)) {
      setError('Acesso restrito. Utilize um e-mail corporativo autorizado do ecossistema Birth Hub 360°.');
      setIsSubmitting(false);
      return;
    }

    const result = isSignUp
      ? await authClient.signUp.email({ email, password, name: name || email.split('@')[0], callbackURL: '/app' })
      : await authClient.signIn.email({ email, password, rememberMe, callbackURL: '/app' });

    if (result.error) {
      setError(result.error.message || 'Não foi possível autenticar. Verifique suas credenciais.');
      setIsSubmitting(false);
      return;
    }

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
      setError('Acesso restrito. Utilize um e-mail corporativo autorizado.');
      setIsSubmitting(false);
      return;
    }

    const result = await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' });
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message || 'Não foi possível enviar o e-mail de redefinição.');
      return;
    }
    setForgotPasswordSent(true);
  };

  const backToSignIn = () => {
    setIsForgotPassword(false);
    setForgotPasswordSent(false);
    setVerificationPending(false);
    setError('');
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

  // Split-screen Layout
  return (
    <div className="flex min-h-screen w-full bg-white dark:bg-[#0B132B] text-slate-900 dark:text-white overflow-x-hidden font-sans transition-colors duration-300">
      
      {/* LEFT PANEL: Hero / Institutional */}
      <div className="hidden lg:flex flex-col w-1/2 relative z-10 border-r border-slate-200 dark:border-white/10 pt-6 px-10 pb-10">
        
        {/* Background glow effects */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand/10 dark:bg-brand/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 dark:bg-orbitBlue/20 blur-[120px]" />
          {/* Earth/Globe glow at bottom right of the left panel */}
          <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full border border-brand/20 bg-gradient-to-br from-brand/5 to-transparent blur-3xl opacity-50 dark:opacity-100" />
        </div>

        {/* Navbar */}
        <header className="relative z-20 flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <BirthHubLogo variant="icon" className="w-8 h-8 text-brand" />
            <BirthHubWordmark className="h-4 text-slate-900 dark:text-white" />
          </div>
          <nav className="flex items-center gap-6 text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300">
            <span className="cursor-pointer hover:text-brand transition-colors">Soluções</span>
            <span className="cursor-pointer hover:text-brand transition-colors">Recursos</span>
            <span className="cursor-pointer hover:text-brand transition-colors">Segmentos</span>
            <span className="cursor-pointer hover:text-brand transition-colors">Preços</span>
            <span className="cursor-pointer hover:text-brand transition-colors">Conteúdo</span>
          </nav>
          <div className="flex items-center gap-4">
            <button type="button" className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="w-4 h-4 rounded-full overflow-hidden inline-flex items-center justify-center bg-green-500 text-[8px] text-white">BR</span>
              PT-BR
              <ChevronDown className="w-3 h-3 ml-1" />
            </button>
            <button className="rounded-full border border-slate-300 dark:border-white/20 px-5 py-2 text-xs font-bold tracking-wide hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              Acessar Hub &rarr;
            </button>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-20 flex-1 flex flex-col justify-center max-w-xl">
          <motion.div initial="hidden" animate="show" variants={staggerContainer(0.1)} className="space-y-6">
            <motion.p variants={staggerItem} className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand">
              Intelligent Business Command Center
            </motion.p>
            <motion.h1 variants={staggerItem} className="text-5xl md:text-6xl font-extrabold tracking-tight">
              Birth Hub <span className="text-brand">360&deg;</span>
            </motion.h1>
            <motion.p variants={staggerItem} className="text-2xl font-light leading-snug text-slate-700 dark:text-slate-200">
              Dados que conectam.<br />
              Inteligência que decide.<br />
              Resultados que acontecem.
            </motion.p>
            <motion.p variants={staggerItem} className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              O sistema operacional inteligente para operações de receita.
            </motion.p>
            
            <motion.div variants={staggerItem} className="flex items-center gap-4 pt-4">
              <button onClick={() => navigate('/login')} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E6C65A] px-6 py-3 text-sm font-bold text-slate-900 shadow-[0_4px_14px_rgba(212,175,55,0.4)] transition-transform hover:-translate-y-0.5">
                Explorar o Birth Hub &rarr;
              </button>
              <button className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-brand dark:hover:text-brand transition-colors">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 dark:border-white/20">
                  <Play className="h-4 w-4 ml-0.5" />
                </span>
                Ver em 2 minutos
              </button>
            </motion.div>
          </motion.div>
        </div>

        {/* Stats Row */}
        <div className="relative z-20 mt-12 grid grid-cols-4 gap-4 border-t border-slate-200 dark:border-white/10 pt-8">
          <div>
            <DatabaseZap className="h-5 w-5 text-slate-400 dark:text-slate-500 mb-2" />
            <div className="text-2xl font-bold">50+</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Sistemas<br/>Integrados</div>
          </div>
          <div>
            <BrainCircuit className="h-5 w-5 text-slate-400 dark:text-slate-500 mb-2" />
            <div className="text-2xl font-bold">100+</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Empresas<br/>Que Confiam</div>
          </div>
          <div>
            <Rocket className="h-5 w-5 text-slate-400 dark:text-slate-500 mb-2" />
            <div className="text-2xl font-bold">3x</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Mais Eficiência<br/>Comercial</div>
          </div>
          <div>
            <Target className="h-5 w-5 text-slate-400 dark:text-slate-500 mb-2" />
            <div className="text-2xl font-bold">360&deg;</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Visão Da<br/>Operação</div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-20 mt-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          <ArrowDown className="h-4 w-4 rounded-full border border-current p-0.5" />
          Escrole para explorar
        </div>

        {/* Orbital Graphic (Absolute Positioned on the right side of the left panel) */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-[15%] w-[600px] h-[600px] pointer-events-none">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Outer Rings */}
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute inset-4 rounded-full border border-slate-200/50 dark:border-white/5 border-dashed" />
            <motion.div animate={{ rotate: -360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }} className="absolute inset-16 rounded-full border border-slate-200 dark:border-white/10" />
            
            {/* Core Gradient Ring */}
            <div className="absolute w-[200px] h-[200px] rounded-full border-[8px] border-transparent" style={{ background: `linear-gradient(currentColor, currentColor) padding-box, conic-gradient(from 0deg, ${BRAND.colors.orbitBlue} 0%, ${BRAND.colors.brand} 33%, ${BRAND.colors.pink} 66%, ${BRAND.colors.orbitBlue} 100%) border-box` }} />
            <div className="absolute w-[184px] h-[184px] rounded-full bg-white dark:bg-[#0B132B] flex items-center justify-center shadow-2xl border border-slate-100 dark:border-none">
               <BirthHubLogo variant="symbol" className="w-24 h-24 drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
            </div>

            {/* Satellites */}
            <div className="absolute top-12 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-white/10 flex items-center justify-center mb-2">
                <DatabaseZap className="h-4 w-4 text-brand" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">Dados</span>
              <span className="text-[9px] text-slate-500">Integração sem limites</span>
            </div>
            
            <div className="absolute bottom-12 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-white/10 flex items-center justify-center mb-2">
                <Target className="h-4 w-4 text-brand" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">Decisão</span>
              <span className="text-[9px] text-slate-500">Estratégia baseada em dados</span>
            </div>

            <div className="absolute left-12 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-white/10 flex items-center justify-center mb-2">
                <Rocket className="h-4 w-4 text-brand" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">Execução</span>
              <span className="text-[9px] text-slate-500">Resultados consistentes</span>
            </div>

            <div className="absolute right-12 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-white/10 flex items-center justify-center mb-2">
                <BrainCircuit className="h-4 w-4 text-brand" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">Inteligência</span>
              <span className="text-[9px] text-slate-500">Insights em tempo real</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center relative bg-slate-50/50 dark:bg-[#080d20] px-6 py-10 w-full lg:w-1/2">
        
        {/* Top right header (Date/Status) */}
        <div className="absolute top-8 right-10 flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            {dateLabel} | {timeLabel}
          </div>
          <div className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Sistema Operacional Online
          </div>
        </div>

        <div className="w-full max-w-md z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block relative mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand via-pink to-orbitBlue blur-xl opacity-30 dark:opacity-50" />
              <div className="relative w-20 h-20 rounded-full bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-white/10 flex items-center justify-center">
                <BirthHubLogo variant="symbol" className="w-12 h-12" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
              Birth Hub 360&deg;
            </h2>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">
              Acessar plataforma
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
              Dados &rarr; Inteligência &rarr; Decisão &rarr; Execução
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-white/10 p-1">
            
            {/* Tabs */}
            <div className="flex border-b border-slate-100 dark:border-white/5">
              <button 
                onClick={() => setActiveTab('email')}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors relative ${activeTab === 'email' ? 'text-brand' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                E-mail corporativo
                {activeTab === 'email' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('sso')}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors relative ${activeTab === 'sso' ? 'text-brand' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                SSO Empresarial
                {activeTab === 'sso' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
                )}
              </button>
            </div>

            <div className="p-6 md:p-8">
              {verificationPending ? (
                <div className="space-y-5 text-center">
                  <div className="flex items-start gap-2.5 rounded-2xl border border-brand/30 bg-brand/5 p-3.5 text-left text-sm text-slate-700 dark:text-slate-300">
                    <Mail size={16} className="mt-0.5 shrink-0 text-brand" />
                    <p>Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para confirmar que este e-mail é seu e ativar sua conta.</p>
                  </div>
                  <button onClick={backToSignIn} className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:underline">Voltar para o login</button>
                </div>
              ) : isForgotPassword ? (
                forgotPasswordSent ? (
                  <div className="space-y-5 text-center">
                    <div className="flex items-start gap-2.5 rounded-2xl border border-brand/30 bg-brand/5 p-3.5 text-left text-sm text-slate-700 dark:text-slate-300">
                      <Mail size={16} className="mt-0.5 shrink-0 text-brand" />
                      <p>Se <strong>{email}</strong> tiver uma conta, enviamos um link de redefinição. O link expira em 1 hora.</p>
                    </div>
                    <button onClick={backToSignIn} className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:underline">Voltar para o login</button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    {error && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p>{error}</p>
                      </div>
                    )}
                    <p className="text-sm text-slate-600 dark:text-slate-400">Informe o e-mail corporativo da sua conta. Se ele existir, enviaremos um link para redefinição de senha.</p>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 py-3.5 pl-11 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition-colors" 
                        placeholder="executivo@birthhub360.com.br"
                        required 
                        autoFocus
                      />
                    </div>
                    <button type="submit" disabled={isSubmitting || !email} className="w-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E6C65A] py-3.5 text-sm font-extrabold uppercase tracking-wide text-slate-900 shadow-lg hover:shadow-brand/25 transition-all disabled:opacity-50">
                      {isSubmitting ? <Loader2 className="animate-spin mx-auto h-5 w-5" /> : 'Enviar link de redefinição'}
                    </button>
                    <div className="text-center">
                      <button type="button" onClick={backToSignIn} className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:underline">Voltar para o login</button>
                    </div>
                  </form>
                )
              ) : (
                <form onSubmit={handleAuth} className="space-y-5">
                  {error && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  {isSignUp && (
                    <div className="relative">
                      <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 py-3.5 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition-colors" 
                        placeholder="Seu Nome Completo"
                        required={isSignUp} 
                      />
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 py-3.5 pl-11 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition-colors" 
                        placeholder={activeTab === 'sso' ? "seuemail@seudominio.com.br" : "executivo@birthhub360.com.br"}
                        required 
                      />
                    </div>

                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 py-3.5 pl-11 pr-11 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition-colors" 
                        placeholder="••••••••••••"
                        required 
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {!isSignUp && (
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded border-slate-300 text-brand focus:ring-brand w-4 h-4 bg-slate-50 dark:bg-slate-900" />
                        Manter sessão ativa
                      </label>
                      <button type="button" onClick={() => { setIsForgotPassword(true); setError(''); }} className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-brand dark:hover:text-brand transition-colors">
                        Esqueci minha senha?
                      </button>
                    </div>
                  )}

                  <button type="submit" disabled={isSubmitting || !email || !password} className="w-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E6C65A] py-4 text-sm font-extrabold uppercase tracking-wide text-slate-900 shadow-lg hover:shadow-brand/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : isSignUp ? 'Criar conta' : <>ENTRAR NO BIRTH HUB &rarr;</>}
                  </button>
                </form>
              )}

              {/* SSO/Social Integrations */}
              {!isSignUp && !isForgotPassword && !verificationPending && (
                <div className="mt-8">
                  <div className="relative flex items-center justify-center mb-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-white/10"></div></div>
                    <span className="relative bg-white dark:bg-slate-900 px-3 text-[10px] uppercase tracking-widest font-bold text-slate-400">ou continue com</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <button className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      Google
                    </button>
                    <button className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <svg viewBox="0 0 21 21" className="w-4 h-4"><path fill="#f25022" d="M0 0h10v10H0z"/><path fill="#7fba00" d="M11 0h10v10H11z"/><path fill="#00a4ef" d="M0 11h10v10H0z"/><path fill="#ffb900" d="M11 11h10v10H11z"/></svg>
                      Microsoft
                    </button>
                    <button className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <Lock className="w-3.5 h-3.5 text-brand" />
                      SSO
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Trust Badges */}
          <div className="mt-8">
            <div className="flex flex-wrap justify-center gap-4 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-brand" /> Acesso protegido</span>
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-brand" /> Autenticação empresarial</span>
              <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-brand" /> Controle de permissões</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-brand" /> Conformidade LGPD</span>
            </div>
            <div className="mt-6 text-center text-[9px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">
              BIRTH HUB 360&deg; | CENTRO DE COMANDO PARA OPERAÇÕES DE RECEITA
              <div className="mt-1">v1.0.0</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

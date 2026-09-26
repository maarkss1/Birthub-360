import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Cpu, Network, Shield, Globe, Zap, ArrowRight, ChevronDown,
  Activity, Database, Code2, Layers, Lock, Terminal, Radio, BarChart3,
  Smartphone, Server, Bot, NeuralNetwork, Waves, Command, Orbit
} from 'lucide-react';
import { useTheme } from '../components/design-system/ThemeContext.js';
import { Button, Badge, useToast, ToastContainer, AtlasLogo } from '../components/design-system/index.js';
import { getAccessibleTextOnBrand } from '../components/design-system/tokens.js';
import { useSessionStore } from '../../../store/useSessionStore.js';

// Advanced particle background effect
const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
    }> = [];

    const createParticle = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 1,
      alpha: Math.random() * 0.5 + 0.2
    });

    for (let i = 0; i < 80; i++) {
      particles.push(createParticle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark = theme === 'dark';
      const particleColor = isDark ? 'rgba(212, 175, 55, ' : 'rgba(11, 19, 43, ';
      const lineColor = isDark ? 'rgba(212, 175, 55, ' : 'rgba(11, 19, 43, ';

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = particleColor + p.alpha + ')';
        ctx.fill();

        // Connect nearby particles
        particles.slice(i + 1).forEach(p2 => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = lineColor + (0.15 * (1 - dist / 150)) + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
};

// Sophisticated magnetic button component
const MagneticButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary';
}> = ({ children, onClick, className = '', variant = 'primary' }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setPosition({ x: x * 0.3, y: y * 0.3 });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const baseClasses = "relative px-8 py-4 rounded-xl font-bold text-sm transition-all duration-300 transform-gpu";
  const variantClasses = variant === 'primary'
    ? "bg-brand text-white shadow-lg hover:shadow-2xl"
    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700";

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`${baseClasses} ${variantClasses} ${className}`}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
  );
};

// Advanced holographic card component
const HolographicCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}> = ({ icon, title, description, delay }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setRotateX((y - centerY) / 20);
    setRotateY((centerX - x) / 20);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000
      }}
      className="relative group"
    >
      <motion.div
        animate={{ rotateX, rotateY }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all duration-500"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10" style={{ transform: 'translateZ(20px)' }}>
          <div className="w-14 h-14 rounded-xl bg-brand/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Real-time data stream visualization
const DataStream: React.FC = () => {
  const [dataPoints, setDataPoints] = useState<number[]>([]);
  const { theme } = useTheme();

  useEffect(() => {
    const interval = setInterval(() => {
      setDataPoints(prev => {
        const newPoint = Math.random() * 100;
        const updated = [...prev, newPoint];
        return updated.slice(-20);
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const isDark = theme === 'dark';
  const lineColor = isDark ? '#d4af37' : '#0b132b';

  return (
    <div className="relative h-24 w-full">
      <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M0,${100 - dataPoints[0] || 50} ${dataPoints.map((val, i) => `L${i * 20},${100 - val}`).join(' ')}`}
          fill="url(#gradient)"
          stroke={lineColor}
          strokeWidth="2"
          className="transition-all duration-300"
        />
      </svg>
    </div>
  );
};

// Main landing page component
export default function LandingInnovative() {
  const { theme, setTheme } = useTheme();
  const { toasts, showToast } = useToast();
  const brandColor = useSessionStore((state) => state.brandColor);
  const accessibleBrandText = getAccessibleTextOnBrand(brandColor);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 500], [1, 0.95]);
  const heroY = useTransform(scrollY, [0, 500], [0, 100]);

  const [activeSection, setActiveSection] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typedText, setTypedText] = useState('');

  // Typing effect for hero text
  useEffect(() => {
    const fullText = "INTELIGÊNCIA ARTIFICIAL AUTÔNOMA";
    let index = 0;

    const typeInterval = setInterval(() => {
      if (index < fullText.length) {
        setTypedText(fullText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(typeInterval);
      }
    }, 100);

    return () => clearInterval(typeInterval);
  }, []);

  // Scroll spy for navigation
  useEffect(() => {
    const sections = document.querySelectorAll('section[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            const sectionIndex = Array.from(sections).findIndex(s => s.id === id);
            setActiveSection(sectionIndex);
          }
        });
      },
      { threshold: 0.3 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-brand selection:text-white relative overflow-hidden">
      <ParticleBackground />

      {/* Global ambient lighting */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-brand/10 rounded-full blur-[150px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-iris/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Sticky Navigation */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 transition-all"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div
              className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <AtlasLogo className="h-7 w-7" />
            </motion.div>
            <div className="text-left">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">Birth Hub 360</h1>
              <span className="text-[10px] text-brand font-bold uppercase tracking-widest">Enterprise AI</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {['Plataforma', 'Inteligência', 'Segurança', 'Integrações'].map((item, i) => (
              <button
                key={item}
                onClick={() => scrollToSection(item.toLowerCase().replace(' ', '-'))}
                className={`text-sm font-semibold transition-all relative ${activeSection === i
                    ? 'text-brand'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
              >
                {item}
                {activeSection === i && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-brand"
                    initial={false}
                  />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
              <button
                onClick={() => setTheme('light')}
                className={`p-2 rounded-md transition-all ${theme === 'light' ? 'bg-white shadow-sm text-brand' : 'text-slate-500'}`}
              >
                <Zap className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-2 rounded-md transition-all ${theme === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}
              >
                <Moon className="h-4 w-4" />
              </button>
            </div>

            <Link to="/login">
              <MagneticButton variant="primary">
                Acessar Plataforma
                <ArrowRight className="h-4 w-4 ml-2" />
              </MagneticButton>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Immersive Hero Section */}
      <motion.section
        id="plataforma"
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        className="relative min-h-screen flex items-center justify-center pt-20 z-10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 border border-brand/20"
            >
              <Sparkles className="h-4 w-4 text-brand" />
              <span className="text-xs font-bold text-brand uppercase tracking-widest">
                Próxima Geração de IA
              </span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              <span className="block">BIRTH HUB</span>
              <motion.span
                className="block text-transparent bg-clip-text bg-gradient-to-r from-brand via-iris to-brand bg-300% animate-gradient"
                animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              >
                {typedText}
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed"
            >
              Transforme operações complexas em decisões inteligentes com nossa plataforma
              enterprise de agentes autônomos de última geração.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
            >
              <Link to="/login">
                <MagneticButton variant="primary">
                  Começar Agora
                  <ArrowRight className="h-4 w-4 ml-2" />
                </MagneticButton>
              </Link>
              <MagneticButton variant="secondary">
                <Play className="h-4 w-4 mr-2" />
                Ver Demonstração
              </MagneticButton>
            </motion.div>

            {/* Real-time data visualization */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="pt-12 max-w-4xl mx-auto"
            >
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-brand" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      Sistema Operacional
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-slate-500">Ao vivo</span>
                  </div>
                </div>
                <DataStream />
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brand">99.98%</div>
                    <div className="text-xs text-slate-500">Uptime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-iris">340ms</div>
                    <div className="text-xs text-slate-500">Latência</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">24/7</div>
                    <div className="text-xs text-slate-500">Operação</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-2 text-slate-400"
          >
            <span className="text-xs uppercase tracking-widest">Explore</span>
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Feature Cards Section */}
      <section id="inteligência" className="relative py-32 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-950 dark:text-white mb-6">
              Inteligência que Transforma
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Nossa plataforma combina tecnologias de ponta para criar agentes que
              pensam, aprendem e executam em escala empresarial.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <HolographicCard
              delay={0}
              icon={<Bot className="h-7 w-7 text-brand" />}
              title="Agentes Autônomos"
              description="IA que opera 24/7 sem supervisão humana, qualificando leads, agendando reuniões e executando fluxos comerciais complexos."
            />
            <HolographicCard
              delay={0.1}
              icon={<NeuralNetwork className="h-7 w-7 text-iris" />}
              title="RAG Avançado"
              description="Sistema de recuperação de conhecimento que consulta seus documentos corporativos em milissegundos para respostas precisas e contextualizadas."
            />
            <HolographicCard
              delay={0.2}
              icon={<Radio className="h-7 w-7 text-slate-900 dark:text-white" />}
              title="Voz em Tempo Real"
              description="Latência sub-340ms com transcrição instantânea, síntese adaptativa e detecção de interrupção para conversas naturais."
            />
            <HolographicCard
              delay={0.3}
              icon={<Shield className="h-7 w-7 text-green-500" />}
              title="Segurança Enterprise"
              description="Criptografia AES-256, RBAC avançado, conformidade LGPD e auditorias permanentes para máxima proteção de dados."
            />
            <HolographicCard
              delay={0.4}
              icon={<Network className="h-7 w-7 text-blue-500" />}
              title="Integrações Ilimitadas"
              description="Conecte-se com CRMs, ERPs, bancos de dados e APIs via webhooks bidirecionais e SDKs robustos."
            />
            <HolographicCard
              delay={0.5}
              icon={<Globe className="h-7 w-7 text-purple-500" />}
              title="Multi-tenant White-label"
              description="Suporte a múltiplas organizações com branding customizável, subdomínios e faturamento segmentado por unidade."
            />
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="segurança" className="relative py-32 bg-slate-100 dark:bg-slate-900 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
          >
            <div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-950 dark:text-white mb-6">
                Segurança que Inspira Confiança
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Nossa arquitetura foi construída desde o início com segurança como prioridade
                absoluta, atendendo aos mais rigorosos padrões corporativos.
              </p>

              <div className="space-y-6">
                {[
                  { icon: Lock, title: 'Criptografia End-to-End', desc: 'TLS 1.3 em trânsito, AES-256 em repouso' },
                  { icon: Server, title: 'Infraestrutura Distribuída', desc: 'SLA 99.98% com redundância geográfica' },
                  { icon: Terminal, title: 'Auditoria Completa', desc: 'Logs imutáveis e rastreabilidade total' },
                  { icon: Database, title: 'Soberania de Dados', desc: 'Storage privado ou cloud criptografado' }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="flex items-start gap-4"
                  >
                    <div className="p-3 bg-brand/10 rounded-lg">
                      <item.icon className="h-6 w-6 text-brand" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white mb-1">{item.title}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-iris/20 rounded-3xl blur-3xl" />
              <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-2xl">
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { label: 'Criptografia', value: 'AES-256' },
                    { label: 'Protocolo', value: 'TLS 1.3' },
                    { label: 'Compliance', value: 'LGPD' },
                    { label: 'SLA', value: '99.98%' }
                  ].map((item, i) => (
                    <div key={i} className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                      <div className="text-2xl font-bold text-brand mb-1">{item.value}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-950 dark:text-white">
              Pronto para o Futuro da IA?
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Junte-se às empresas que já estão transformando suas operações com
              inteligência artificial autônoma de última geração.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login">
                <MagneticButton variant="primary">
                  Começar Transformação
                  <ArrowRight className="h-4 w-4 ml-2" />
                </MagneticButton>
              </Link>
              <MagneticButton variant="secondary">
                Falar com Especialista
              </MagneticButton>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 border-t border-slate-200 dark:border-slate-800 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AtlasLogo className="h-6 w-6" />
              <span className="font-bold text-slate-900 dark:text-white">Birth Hub 360</span>
            </div>
            <div className="text-sm text-slate-500">
              © 2026 Birth Hub 360. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

// Import missing icon
const Moon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

const Play: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M8 5v14l11-7z" />
  </svg>
);

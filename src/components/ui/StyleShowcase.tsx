import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, Cpu, Globe, Shield } from 'lucide-react';
import { useState } from 'react';
import { CyberInput } from './CyberInput';
import { DigitalRain, GlitchEffect, ParticleSystem } from './ParticleSystem';
import { HolographicCard } from './HolographicCard';
import { NeonButton } from './NeonButton';
import { ThemeSwitcher, type ThemeStyle } from './ThemeSwitcher';
import { Toggle } from './Toggle';

export function StyleShowcase() {
  const [currentStyle, setCurrentStyle] = useState<ThemeStyle>('classic');
  const [toggles, setToggles] = useState({ classic: true, neon: true, cyber: true });

  return (
    <div className="min-h-screen bg-bg text-ink p-8">
      {/* Partículas de fundo */}
      <ParticleSystem count={30} color="mixed" intensity="medium" />

      {/* Header */}
      <div className="relative z-10 mb-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <GlitchEffect intensity="medium">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-brand via-iris to-orbit-blue bg-clip-text text-transparent">
              Novo Sistema Visual
            </h1>
          </GlitchEffect>
          <p className="text-ink-2 text-lg max-w-2xl">
            Explore os novos componentes futuristas, efeitos holográficos e interfaces cyberpunk
          </p>
        </motion.div>

        <div className="mt-6">
          <ThemeSwitcher currentStyle={currentStyle} onStyleChange={setCurrentStyle} />
        </div>
      </div>

      {/* Grid de componentes */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Holográfico */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <HolographicCard variant="mixed" intensity="medium">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-brand/20">
                <Sparkles className="text-brand" size={20} />
              </div>
              <h3 className="font-bold text-lg">Card Holográfico</h3>
            </div>
            <p className="text-ink-2 text-sm mb-4">
              Efeito de linhas de scan com brilho animado e bordas holográficas
            </p>
            <NeonButton variant="cyan" size="sm">
              Explorar
            </NeonButton>
          </HolographicCard>
        </motion.div>

        {/* Card Neon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <HolographicCard variant="cyan" intensity="high">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-cyan-400/20">
                <Zap className="text-cyan-400" size={20} />
              </div>
              <h3 className="font-bold text-lg">Interface Neon</h3>
            </div>
            <p className="text-ink-2 text-sm mb-4">
              Botões com glow neon intenso e partículas de luz animadas
            </p>
            <div className="flex gap-2">
              <NeonButton variant="purple" size="sm">
                Roxo
              </NeonButton>
              <NeonButton variant="gold" size="sm">
                Dourado
              </NeonButton>
            </div>
          </HolographicCard>
        </motion.div>

        {/* Card Cyber */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <HolographicCard variant="purple" intensity="medium">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-400/20">
                <Cpu className="text-purple-400" size={20} />
              </div>
              <h3 className="font-bold text-lg">Sistema Cyber</h3>
            </div>
            <p className="text-ink-2 text-sm mb-4">
              Inputs com indicadores de canto e efeitos de scan line
            </p>
            <CyberInput
              variant="neon"
              glowColor="cyan"
              placeholder="Digite algo..."
              className="mb-2"
            />
          </HolographicCard>
        </motion.div>

        {/* Seção de controles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="md:col-span-2 lg:col-span-3"
        >
          <HolographicCard variant="gold" intensity="low">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
              <Shield className="text-brand" size={24} />
              Controles Interativos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Toggles */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-ink-2 uppercase tracking-wider">
                  Toggles
                </h4>
                <Toggle
                  checked={toggles.classic}
                  onChange={(v) => setToggles((t) => ({ ...t, classic: v }))}
                  label="Modo Clássico"
                  variant="classic"
                />
                <Toggle
                  checked={toggles.neon}
                  onChange={(v) => setToggles((t) => ({ ...t, neon: v }))}
                  label="Modo Neon"
                  variant="neon"
                  glowColor="cyan"
                />
                <Toggle
                  checked={toggles.cyber}
                  onChange={(v) => setToggles((t) => ({ ...t, cyber: v }))}
                  label="Modo Cyber"
                  variant="cyber"
                  glowColor="purple"
                />
              </div>

              {/* Inputs */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-ink-2 uppercase tracking-wider">
                  Inputs
                </h4>
                <CyberInput variant="neon" glowColor="cyan" placeholder="Input Neon" />
                <CyberInput variant="glass" placeholder="Input Glass" />
                <CyberInput variant="metallic" placeholder="Input Metálico" />
              </div>

              {/* Botões */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-ink-2 uppercase tracking-wider">
                  Botões
                </h4>
                <div className="flex flex-wrap gap-2">
                  <NeonButton variant="cyan" size="sm">
                    Cyan
                  </NeonButton>
                  <NeonButton variant="purple" size="sm">
                    Purple
                  </NeonButton>
                  <NeonButton variant="gold" size="sm">
                    Gold
                  </NeonButton>
                  <NeonButton variant="pink" size="sm">
                    Pink
                  </NeonButton>
                  <NeonButton variant="green" size="sm">
                    Green
                  </NeonButton>
                </div>
              </div>
            </div>
          </HolographicCard>
        </motion.div>

        {/* Efeitos especiais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="md:col-span-2 lg:col-span-3"
        >
          <HolographicCard variant="mixed" intensity="medium">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
              <Globe className="text-iris" size={24} />
              Efeitos Especiais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Digital Rain */}
              <div className="relative h-48 rounded-xl overflow-hidden bg-surface-elevated/50 border border-line/30">
                <DigitalRain color="cyan" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-mono text-cyan-400/80">Digital Rain</span>
                </div>
              </div>

              {/* Glitch Effect */}
              <div className="h-48 rounded-xl bg-surface-elevated/50 border border-line/30 flex items-center justify-center">
                <GlitchEffect intensity="high">
                  <div className="text-center">
                    <span className="text-2xl font-bold">GLITCH</span>
                    <p className="text-sm text-ink-2 mt-2">Efeito RGB</p>
                  </div>
                </GlitchEffect>
              </div>
            </div>
          </HolographicCard>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="md:col-span-2 lg:col-span-3"
        >
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold mb-4">Pronto para transformar sua interface?</h2>
            <p className="text-ink-2 mb-8 max-w-xl mx-auto">
              Escolha um estilo e aplique os novos componentes em toda a plataforma
            </p>
            <NeonButton variant="gold" size="lg" className="inline-flex items-center gap-2">
              Aplicar Estilo Futurista
              <ArrowRight size={20} />
            </NeonButton>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

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

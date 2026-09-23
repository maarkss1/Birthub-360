import { motion, useReducedMotion } from 'framer-motion';
import type React from 'react';
import { useState } from 'react';
import { SoundFX } from '../../lib/soundEffects';
import { cn } from '../../lib/utils';

export interface CyberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'neon' | 'glass' | 'metallic';
  size?: 'sm' | 'md' | 'lg';
  glowColor?: 'cyan' | 'purple' | 'gold' | 'green';
}

export function CyberInput({
  variant = 'neon',
  size = 'md',
  glowColor = 'cyan',
  className,
  onFocus,
  onBlur,
  ...props
}: CyberInputProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isFocused, setIsFocused] = useState(false);

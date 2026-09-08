/**
 * HubBurstCanvas — canvas 2D fixo sobre toda a tela que exibe o efeito de
 * explosão de partículas ao clicar em qualquer card do Hub.
 *
 * Portado de portalatlasprototype.html (função `burstAt`). Expõe uma ref de
 * função `trigger(x, y, colorRgb)` que o HubScreen chama ao clicar num card.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

export interface BurstHandle {
  trigger: (x: number, y: number, colorRgb: string) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  color: string;
}

export const HubBurstCanvas = forwardRef<BurstHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const prefersReduced = useReducedMotion();

  // Expõe trigger para o pai sem causar re-render
  useImperativeHandle(
    ref,
    () => ({
      trigger(x: number, y: number, colorRgb: string) {
        if (prefersReduced) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = devicePixelRatio || 1;
        const count = 26;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
          const speed = 2.5 + Math.random() * 3.5;
          particlesRef.current.push({
            x: x * dpr,
            y: y * dpr,
            vx: Math.cos(angle) * speed * dpr,
            vy: Math.sin(angle) * speed * dpr,
            r: (2 + Math.random() * 3) * dpr,
            life: 1,
            color: colorRgb,
          });
        }
      },
    }),
    [prefersReduced],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      const dpr = devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05 * (devicePixelRatio || 1);
        p.life -= 0.02;
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = `rgb(${p.color})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 30,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
});

HubBurstCanvas.displayName = 'HubBurstCanvas';

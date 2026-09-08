/**
 * HubBurstCanvas — canvas 2D fixo sobre toda a tela que exibe o efeito de
 * explosão de partículas ao clicar em qualquer card do Hub.
 *
 * Portado de portalatlasprototype.html (função `burstAt`). Expõe uma ref de
 * função `trigger(x, y, colorRgb)` que o HubScreen chama ao clicar num card.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
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

  const drawFrame = useCallback(() => {
    rafRef.current = null;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
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
    if (particlesRef.current.length > 0 && document.visibilityState === 'visible') {
      rafRef.current = requestAnimationFrame(drawFrame);
    }
  }, []);

  const startDrawing = useCallback(() => {
    if (rafRef.current === null && document.visibilityState === 'visible') {
      rafRef.current = requestAnimationFrame(drawFrame);
    }
  }, [drawFrame]);

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
        startDrawing();
      },
    }),
    [prefersReduced, startDrawing],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && particlesRef.current.length > 0) startDrawing();
      if (document.visibilityState !== 'visible' && rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [startDrawing]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 30,
        pointerEvents: 'none',
      }}
    />
  );
});

HubBurstCanvas.displayName = 'HubBurstCanvas';

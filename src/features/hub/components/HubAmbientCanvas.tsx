import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface HubAmbientCanvasProps {
  isAtlas: boolean;
}

interface AmbientOrb {
  mesh: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshStandardMaterial>;
  speed: number;
  axis: THREE.Vector3;
  drift: number;
  baseY: number;
}

/**
 * Fundo WebGL do protótipo original. A cena é deliberadamente pequena (nove
 * icosaedros sem sombras) e só anima enquanto a página e a aba estão visíveis.
 */
export function HubAmbientCanvas({ isAtlas }: HubAmbientCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0, 14);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const primaryColor = isAtlas ? 0xff5618 : 0x2563eb;
    const secondaryColor = isAtlas ? 0xff9d70 : 0x60a5fa;
    const point = new THREE.PointLight(primaryColor, 2.4, 40);
    point.position.set(6, 4, 8);
    scene.add(point);
    const point2 = new THREE.PointLight(secondaryColor, 1.2, 40);
    point2.position.set(-8, -3, 6);
    scene.add(point2);

    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const positions = [
      [-8.4, 4.8, -8.2, 1.45],
      [-7.2, -3.8, -6.4, 0.82],
      [-5.2, 3.3, -9.1, 1.18],
      [5.1, -4.5, -7.4, 1.2],
      [6.1, 4.6, -8.8, 0.72],
      [7.3, -2.5, -6.2, 1.12],
      [8.7, 3.1, -9.4, 1.04],
      [-8.8, 0.2, -10.1, 0.64],
      [9.1, 0.8, -7.8, 0.88],
    ] as const;
    const orbs: AmbientOrb[] = positions.map(([x, y, z, scale], index) => {
      const material = new THREE.MeshStandardMaterial({
        color: index % 3 === 0 ? primaryColor : 0xffffff,
        transparent: true,
        opacity: index % 3 === 0 ? 0.5 : 0.14,
        roughness: 0.25,
        metalness: 0.35,
        wireframe: index % 4 === 0,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.setScalar(scale);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return {
        mesh,
        speed: 0.05 + index * 0.008,
        axis: new THREE.Vector3(index % 2 ? 0.7 : 0.25, 1, index % 3 ? 0.4 : 0.8).normalize(),
        drift: index * 0.72,
        baseY: y,
      };
    });

    let frame: number | null = null;
    let isIntersecting = true;

    const render = () => renderer.render(scene, camera);
    const shouldAnimate = () =>
      !reducedMotionQuery.matches && document.visibilityState === 'visible' && isIntersecting;

    const animate = (timestamp: number) => {
      frame = null;
      const time = timestamp * 0.0001;
      orbs.forEach((orb) => {
        orb.mesh.rotateOnAxis(orb.axis, orb.speed * 0.01);
        orb.mesh.position.y = orb.baseY + Math.sin(time * 0.6 + orb.drift) * 0.35;
      });
      render();
      if (shouldAnimate()) frame = window.requestAnimationFrame(animate);
    };

    const syncAnimation = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
      if (shouldAnimate()) frame = window.requestAnimationFrame(animate);
      else render();
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      render();
    };

    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry?.isIntersecting ?? true;
      syncAnimation();
    });
    observer.observe(canvas);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', syncAnimation);
    reducedMotionQuery.addEventListener('change', syncAnimation);
    syncAnimation();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', syncAnimation);
      reducedMotionQuery.removeEventListener('change', syncAnimation);
      if (frame !== null) window.cancelAnimationFrame(frame);
      orbs.forEach(({ mesh }) => {
        mesh.material.dispose();
      });
      geometry.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, [isAtlas]);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}

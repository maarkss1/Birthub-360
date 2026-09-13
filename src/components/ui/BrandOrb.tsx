import { Float, MeshDistortMaterial, Sparkles, Sphere } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import { type ComponentRef, useRef } from 'react';
import { BRAND } from '../../config/brand';

function OrbCore() {
  const materialRef = useRef<ComponentRef<typeof MeshDistortMaterial>>(null);
  // O @media (prefers-reduced-motion) global de globals.css só zera animation/transition CSS —
  // não alcança o loop de render do react-three-fiber (useFrame), que é como Float/Sparkles/
  // MeshDistortMaterial animam. Achado nesta rodada (Onda 8): a esfera girava/distorcia
  // continuamente mesmo com a preferência do SO ativa. Zerando as amplitudes de movimento em vez
  // de desmontar o Canvas — mantém a peça visível e só remove o movimento contínuo não-essencial.
  const reduceMotion = useReducedMotion();

  // Esfera dourada com emissão na rampa metálica do logotipo (Antique Gold ->
  // Gold Soft) e faíscas em Deep Iris: os mesmos três valores da órbita do
  // emblema, que é o que esta peça representa em 3D.
  const color = BRAND.colors.brand;
  const emissive = BRAND.colors.brandAccent;

  return (
    <Float
      speed={reduceMotion ? 0 : 2}
      rotationIntensity={reduceMotion ? 0 : 1.5}
      floatIntensity={reduceMotion ? 0 : 2}
    >
      <Sphere args={[1, 64, 64]} scale={1.2}>
        <MeshDistortMaterial
          ref={materialRef}
          color={color}
          emissive={emissive}
          emissiveIntensity={1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          metalness={0.8}
          roughness={0.2}
          distort={reduceMotion ? 0 : 0.3}
          speed={reduceMotion ? 0 : 3}
        />
      </Sphere>
      <Sparkles
        count={50}
        scale={3}
        size={4}
        speed={reduceMotion ? 0 : 0.4}
        opacity={0.8}
        color={BRAND.colors.iris}
      />
    </Float>
  );
}

export function BrandOrb({ size = 150 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <OrbCore />
      </Canvas>
    </div>
  );
}

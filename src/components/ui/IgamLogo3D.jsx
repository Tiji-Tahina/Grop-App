/* eslint-disable react/no-unknown-property */
import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// ── 3D model loaded + animated ──────────────────────────────────────────────────
function LogoModel({ hovered, autoRotate = true, rotationSpeed = 0.007 }) {
  const { scene }      = useGLTF('/models/igam_logo.glb');
  const groupRef       = useRef();
  const clonedScene    = useMemo(() => scene.clone(true), [scene]);
  const centeredRef    = useRef(false);
  const targetScale    = useRef(1);

  // Center model on its bounding box
  useEffect(() => {
    if (!groupRef.current || centeredRef.current) return;
    const box    = new THREE.Box3().setFromObject(groupRef.current);
    const center = box.getCenter(new THREE.Vector3());
    groupRef.current.position.sub(center);
    centeredRef.current = true;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;

    // Continuous Y rotation
    if (autoRotate) {
      groupRef.current.rotation.y += hovered ? rotationSpeed * 3.5 : rotationSpeed;
    }

    // Gentle float (sin wave)
    groupRef.current.position.y =
      Math.sin(state.clock.elapsedTime * 0.7) * 0.06 +
      (centeredRef.current ? 0 : 0);

    // Slight X oscillation on hover
    if (hovered) {
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.9) * 0.06;
    } else {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.06);
    }

    // Smooth scale on hover
    targetScale.current = hovered ? 1.08 : 1.0;
    groupRef.current.scale.setScalar(
      THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale.current, 0.08)
    );
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

// ── Fallback spinner SVG while loading ────────────────────────────────
function LoadingSpinner({ size }) {
  return (
    <div style={{
      width: size, height: size,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="rgba(34,211,238,0.2)" strokeWidth="2" />
        <path d="M12 2 A10 10 0 0 1 22 12" stroke="#4DFF91" strokeWidth="2" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate"
            from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────
/**
 * @param {number}  size        — canvas width/height in px (default: 120)
 * @param {boolean} shadows     — show ground shadows (disable for sidebar)
 * @param {boolean} interactive — enable hover + click
 * @param {string}  className   — additional CSS classes
 * @param {object}  style       — additional inline styles
 * @param {function} onClick    — click callback
 * @param {number}  cameraZ     — camera distance (auto-calculated if 0)
 * @param {number}  rotationSpeed — rotation speed (default: 0.007)
 */
export default function IgamLogo3D({
  size          = 120,
  shadows       = false,
  interactive   = true,
  className     = '',
  style         = {},
  onClick,
  cameraZ       = 0,
  rotationSpeed = 0.007,
}) {
  const [hovered, setHovered] = useState(false);

  // Calculate camera distance based on size
  const camZ = cameraZ || (size < 60 ? 8 : size < 150 ? 6 : 4.5);

  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => interactive && setHovered(false)}
      style={{
        width: size, height: size,
        cursor: onClick ? 'pointer' : (interactive ? 'default' : 'default'),
        position: 'relative',
        borderRadius: size < 80 ? 10 : 16,
        overflow: 'hidden',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Ring glow on hover */}
      {interactive && (
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: 'inherit',
          boxShadow: hovered
            ? '0 0 24px 4px rgba(34,211,238,0.45), inset 0 0 12px rgba(34,211,238,0.15)'
            : '0 0 12px 2px rgba(16,185,129,0.2)',
          transition: 'box-shadow 0.35s ease',
          pointerEvents: 'none',
          zIndex: 2,
        }} />
      )}

      <Canvas
        camera={{ position: [0, 0, camZ], fov: 40 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
        }}
        style={{ background: 'transparent' }}
        shadows={shadows}
        dpr={[1, 2]}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 3]}  intensity={1.4} color="#ffffff" />
        <directionalLight position={[-2, 2, -2]} intensity={0.5} color="#4DFF91" />
        <pointLight        position={[0, 3, 2]}  intensity={0.6} color="#10b981" />
        <pointLight        position={[0, -2, 2]} intensity={0.3} color="#6366f1" />

        {/* HDR environment for metallic reflections */}
        <Environment preset="city" />

        <Suspense fallback={null}>
          <LogoModel
            hovered={hovered}
            autoRotate
            rotationSpeed={rotationSpeed}
          />

          {/* Ground shadow (only at large sizes) */}
          {shadows && (
            <ContactShadows
              position={[0, -1.5, 0]}
              opacity={0.5}
              scale={4}
              blur={2.5}
              far={3}
              color="#000011"
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload('/models/igam_logo.glb');

/* eslint-disable react/no-unknown-property */
/**
 * Madagascar 3D Map — Hyper-creative web edition
 * ────────────────────────────────────────────────
 *  • Loads the Blender-cleaned GLBs (madagascar_adm1.glb + madagascar_adm2.glb).
 *    Each region/district is a flat plate with a clean GAP between neighbors,
 *    a thin solidified Z extrusion, and beveled edges (no more jagged
 *    triangulation showing through).
 *  • Hover: region's foreground brightens with vivid emerald emissive + lifts
 *    a hair on Y → "ça pop" sans sortir du cadre.
 *  • Selected: warm amber emissive + others dim to 0.25 opacity. Subtle bloom
 *    glow makes the selected region feel like the only thing in the scene.
 *  • Districts appear stacked just above their parent region with HSL-rainbow
 *    colors on entry (springy GSAP fade-in).
 *  • Background: deep night ocean shader (animated wavelets, small scale)
 *    + Bloom + Vignette + film grain.
 *  • Camera: cinematic arc transitions on selection. Dynamic bbox-based init.
 */
import React, { Suspense, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Globe2 } from 'lucide-react';
import { REGION_INFO, ADM2_PARENT, REGION_STATS } from './regionData';
import { RegionStatsPanel } from './RegionStatsPanel';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — small-scale clean Blender units
// ─────────────────────────────────────────────────────────────────────────────
const REGION_ORDER = [
  'Diana', 'Sava', 'Analanjirofo', 'Sofia', 'Boeny', 'Melaky',
  'Betsiboka', 'Bongolava', 'Analamanga', 'Alaotra-Mangoro',
  'Atsinanana', 'Itasy', 'Vakinankaratra', 'Menabe',
  "Amoron'i Mania", 'Matsiatra Ambony', 'Vatovavy-Fitovinany',
  'Atsimo-Atsinanana', 'Ihorombe', 'Atsimo-Andrefana',
  'Anosy', 'Androy',
];

const REGIONS = new Set(REGION_ORDER);

// Hover / selected emissive palette (deliberately punchy)
const COLOR_HOVER    = new THREE.Color('#4DFF91');   // bright emerald
const COLOR_SELECTED = new THREE.Color('#FF9A3C');   // warm amber
const COLOR_OFF      = new THREE.Color('#000000');

// ─────────────────────────────────────────────────────────────────────────────
// BIOME PALETTE — alignée sur le design system "AGRI-NEXUS Nature Edition"
// (cf. src/index.css : --bg-deep, --primary-500, --agri-*, --ai-*)
// ─────────────────────────────────────────────────────────────────────────────
const BIOME_COLORS = {
  rainforest: '#1F4A3D',   // forêt humide profonde
  tropical:   '#3A7A5A',   // tropical médium
  highland:   '#6A9B52',   // hauts plateaux — sage agri-500
  transition: '#8FAF6E',   // transition olive clair
  mangrove:   '#4F8B7B',   // mangrove teal-vert
  savanna:    '#C17F3A',   // savane — amber-earth ai-500
  spiny:      '#A06530',   // forêt épineuse — amber foncé
  dry:        '#D4944A',   // zone sèche — amber clair
};

// Mapping région → biome (extrait de madagascarGraphData.js)
const REGION_BIOME = {
  'Diana':                'tropical',
  'Sava':                 'rainforest',
  'Analanjirofo':         'rainforest',
  'Sofia':                'savanna',
  'Boeny':                'savanna',
  'Betsiboka':            'savanna',
  'Melaky':               'mangrove',
  'Bongolava':            'savanna',
  'Itasy':                'highland',
  'Analamanga':           'highland',
  'Alaotra-Mangoro':      'transition',
  'Atsinanana':           'rainforest',
  'Vakinankaratra':       'highland',
  "Amoron'i Mania":       'highland',
  'Menabe':               'savanna',
  'Matsiatra Ambony':     'highland',
  'Vatovavy-Fitovinany':  'rainforest',
  'Ihorombe':             'transition',
  'Atsimo-Atsinanana':    'transition',
  'Atsimo-Andrefana':     'spiny',
  'Androy':               'spiny',
  'Anosy':                'dry',
};

// Helper : couleur THREE pour une région donnée (avec fallback sage)
const colorForRegion = (regionName) => {
  const biome = REGION_BIOME[regionName] || 'highland';
  return new THREE.Color(BIOME_COLORS[biome] || '#7FB069');
};

// ─────────────────────────────────────────────────────────────────────────────
// OCEAN SHADER (small-scale wavelets)
// ─────────────────────────────────────────────────────────────────────────────
const OCEAN_VERT = `
  uniform float uTime;
  varying float vH;
  void main() {
    vec3 p = position;
    float w = sin(p.x * 0.55 + uTime * 0.42) * 0.06
            + cos(p.y * 0.43 + uTime * 0.31) * 0.04
            + sin((p.x + p.y) * 0.38 + uTime * 0.22) * 0.025;
    p.z += w;
    vH = w / 0.13 * 0.5 + 0.5;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const OCEAN_FRAG = `
  varying float vH;
  void main() {
    vec3 deep  = vec3(0.004, 0.038, 0.120);
    vec3 mid   = vec3(0.009, 0.082, 0.215);
    vec3 shine = vec3(0.105, 0.260, 0.520);
    float hi   = pow(max(vH - 0.62, 0.0) * 3.0, 2.2);
    vec3 col   = mix(deep, mid, vH * 0.85) + shine * hi * 0.45;
    gl_FragColor = vec4(col, 0.94);
  }
`;

function OceanPlane({ size = 60 }) {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((s) => { uniforms.uTime.value = s.clock.elapsedTime; });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
      <planeGeometry args={[size, size, 96, 96]} />
      <shaderMaterial
        vertexShader={OCEAN_VERT}
        fragmentShader={OCEAN_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADM1 — regions plate (clean Blender export, small scale)
// ─────────────────────────────────────────────────────────────────────────────
function ADM1Model({
  onRegionClick, selectedRegion, hoveredRegion, setHoveredRegion,
  onModelReady,
}) {
  const { scene }  = useGLTF('/models/madagascar_adm1.glb');
  const groupRef   = useRef();
  const cloned     = useMemo(() => scene.clone(true), [scene]);
  const matsRef    = useRef({});           // name → material (not rebuilt across renders)
  const baseColorRef = useRef({});         // name → THREE.Color (original from glb)
  const baseYRef   = useRef({});           // name → original Y position (for hover lift)

  // Build mesh list once
  const meshes = useMemo(() => {
    const list = [];
    cloned.traverse((c) => { if (c.isMesh) list.push(c); });
    return list;
  }, [cloned]);

  // 1) Setup: capture original color + ensure standard material on each mesh, center the group
  useEffect(() => {
    if (!groupRef.current) return;

    meshes.forEach((m) => {
      // Read region_id from gltf userData (set in Blender as 'region_id' custom prop)
      const rid = m.userData?.region_id || m.userData?.kind === 'region' ? m.name : null;
      if (!REGIONS.has(m.name)) return;

      // Ensure we own the material (clone so each region has its own emissive state)
      if (!m.userData._owned) {
        const orig = m.material;
        const mat = orig.clone ? orig.clone() : new THREE.MeshStandardMaterial({
          color: '#b5a478', roughness: 0.78, metalness: 0.04,
        });
        // Force StandardMaterial features we need
        if (!mat.emissive) mat.emissive = new THREE.Color(0, 0, 0);
        mat.emissiveIntensity = 0;
        mat.transparent = true;
        mat.opacity = 1.0;
        // ── Override base color from biome palette (design system) ──
        // Le GLB embarque un sage neutre #7FB069 ; on remplace par la
        // couleur du biome pour rester cohérent avec le thème nature.
        mat.color.copy(colorForRegion(m.name));
        mat.roughness = 0.65;
        mat.metalness = 0.0;
        mat.needsUpdate = true;
        m.material = mat;
        m.userData._owned = true;
      }
      matsRef.current[m.name]      = m.material;
      baseColorRef.current[m.name] = m.material.color.clone();
      baseYRef.current[m.name]     = m.position.y;

      m.userData.regionName = m.name;
      m.userData.isRegion   = true;
      m.castShadow    = true;
      m.receiveShadow = true;
    });

    // Center group on bounds
    const box = new THREE.Box3().setFromObject(groupRef.current);
    const c = box.getCenter(new THREE.Vector3());
    groupRef.current.position.x = -c.x;
    groupRef.current.position.z = -c.z;
    groupRef.current.updateMatrixWorld(true);

    onModelReady?.(new THREE.Box3().setFromObject(groupRef.current));
  }, [meshes, onModelReady]);

  // 2) Hover / Selected state — imperative material updates (no re-mount)
  useEffect(() => {
    Object.entries(matsRef.current).forEach(([name, mat]) => {
      const isSel  = selectedRegion === name;
      const isHov  = hoveredRegion  === name;
      const dim    = selectedRegion && !isSel;

      if (isHov) {
        mat.emissive.copy(COLOR_HOVER);
        mat.emissiveIntensity = 0.55;
      } else if (isSel) {
        mat.emissive.copy(COLOR_SELECTED);
        mat.emissiveIntensity = 0.42;
      } else {
        mat.emissive.copy(COLOR_OFF);
        mat.emissiveIntensity = 0;
      }
      mat.opacity = dim ? 0.25 : 1.0;
      mat.transparent = true;
      mat.needsUpdate = true;
    });

    // Lift hovered region a hair on Y → "ça pop" feeling
    Object.entries(baseYRef.current).forEach(([name, y]) => {
      const mesh = meshes.find((m) => m.name === name);
      if (!mesh) return;
      const isHov = hoveredRegion === name;
      const isSel = selectedRegion === name;
      const targetY = y + (isHov ? 0.025 : isSel ? 0.012 : 0);
      gsap.to(mesh.position, { y: targetY, duration: 0.28, ease: 'power2.out', overwrite: true });
    });
  }, [selectedRegion, hoveredRegion, meshes]);

  return (
    <group ref={groupRef}>
      <primitive
        object={cloned}
        onPointerDown={(e) => {
          e.stopPropagation();
          const n = e.object.userData.regionName;
          if (n && REGIONS.has(n)) onRegionClick(n);
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          const n = e.object.userData.regionName;
          if (n && REGIONS.has(n)) {
            if (hoveredRegion !== n) setHoveredRegion(n);
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          setHoveredRegion(null);
          document.body.style.cursor = 'auto';
        }}
      />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADM2 — districts of selected region (HSL-rainbow, springy fade-in)
// ─────────────────────────────────────────────────────────────────────────────
function ADM2Districts({ parentRegion, onDistrictHover, modelOffset }) {
  const { scene } = useGLTF('/models/madagascar_adm2.glb');
  const cloned    = useMemo(() => scene.clone(true), [scene]);
  const matsRef   = useRef({});
  const [hovered, setHovered] = useState(null);

  const districts = useMemo(() => {
    const list = [];
    cloned.traverse((c) => {
      if (c.isMesh && ADM2_PARENT[c.name] === parentRegion) list.push(c);
    });
    return list;
  }, [cloned, parentRegion]);

  useEffect(() => {
    matsRef.current = {};
    // Couleur du biome parent — partagée par tous les districts de la région
    const parentBiomeColor = colorForRegion(parentRegion);
    const hsl = { h: 0, s: 0, l: 0 };
    parentBiomeColor.getHSL(hsl);

    districts.forEach((d, i) => {
      // Subtile variation de luminosité (±10%) pour distinguer les districts
      // adjacents tout en restant dans la teinte du biome parent.
      const lightVar = ((i % 5) - 2) * 0.05;
      const districtColor = new THREE.Color().setHSL(
        hsl.h,
        hsl.s,
        Math.max(0.18, Math.min(0.78, hsl.l + lightVar)),
      );
      const emissiveColor = districtColor.clone().multiplyScalar(0.45);

      const mat = new THREE.MeshStandardMaterial({
        color:    districtColor,
        emissive: emissiveColor,
        emissiveIntensity: 0.12,
        roughness: 0.55,
        metalness: 0.04,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      d.material = mat;
      d.castShadow = true;
      matsRef.current[d.name] = mat;
      gsap.to(mat, {
        opacity: 0.94,
        duration: 0.45,
        delay: 0.10 + i * 0.025,
        ease: 'back.out(1.6)',
      });
    });
    return () => {
      Object.values(matsRef.current).forEach((m) => m.dispose());
    };
  }, [districts, parentRegion]);

  useEffect(() => {
    Object.entries(matsRef.current).forEach(([n, mat]) => {
      mat.emissiveIntensity = hovered === n ? 0.65 : 0.18;
      mat.roughness         = hovered === n ? 0.28 : 0.45;
      mat.needsUpdate       = true;
    });
  }, [hovered]);

  return (
    <group
      position={[modelOffset.x, 0, modelOffset.z]}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => {
        e.stopPropagation();
        const n = e.object.name;
        if (hovered !== n) { setHovered(n); onDistrictHover?.(n); }
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(null);
        onDistrictHover?.(null);
        document.body.style.cursor = 'auto';
      }}
    >
      {districts.map((d) => <primitive key={d.uuid} object={d} />)}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSPECTIVE CAMERA — cinematic arc on selection
// ─────────────────────────────────────────────────────────────────────────────
function CameraController({ targetRegion, modelBounds }) {
  const { camera, scene } = useThree();
  const initialRef = useRef(null);
  const tlRef      = useRef(null);

  useEffect(() => {
    if (!modelBounds || initialRef.current) return;
    const center = modelBounds.getCenter(new THREE.Vector3());
    const size   = modelBounds.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.z);

    const camY = maxDim * 0.95;
    const camZ = center.z + maxDim * 0.85;
    const lookZ = center.z - maxDim * 0.08;

    camera.position.set(center.x, camY, camZ);
    camera.lookAt(center.x, 0, lookZ);
    camera.near = 0.05;
    camera.far  = 200;
    camera.updateProjectionMatrix();

    initialRef.current = {
      pos:  new THREE.Vector3(center.x, camY, camZ),
      look: new THREE.Vector3(center.x, 0, lookZ),
    };
  }, [modelBounds, camera]);

  useEffect(() => {
    if (!initialRef.current) return;
    if (tlRef.current) { tlRef.current.kill(); tlRef.current = null; }

    if (!targetRegion) {
      const init = initialRef.current;
      const midY = Math.max(camera.position.y, init.pos.y) * 1.30;
      const midX = (camera.position.x + init.pos.x) / 2;
      const midZ = (camera.position.z + init.pos.z) / 2;
      const tl = gsap.timeline();
      tl.to(camera.position, {
        x: midX, y: midY, z: midZ, duration: 0.42, ease: 'power2.out',
        onUpdate: () => { camera.lookAt(midX, 0, midZ - 0.5); camera.updateProjectionMatrix(); },
      }).to(camera.position, {
        x: init.pos.x, y: init.pos.y, z: init.pos.z, duration: 0.65, ease: 'power3.inOut',
        onUpdate: () => { camera.lookAt(init.look.x, init.look.y, init.look.z); camera.updateProjectionMatrix(); },
      });
      tlRef.current = tl;
      return;
    }

    let mesh = null;
    scene.traverse((c) => {
      if (c.isMesh && c.userData.regionName === targetRegion && c.userData.isRegion) mesh = c;
    });
    if (!mesh) return;

    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const r = Math.max(size.x, size.z, 0.4);

    const tgtY = r * 1.65;
    const tgtZ = center.z + r * 0.22;
    const tgtX = center.x;
    const lkZ  = center.z - r * 0.05;

    const pkY = Math.max(camera.position.y, tgtY) * 1.45;
    const pkX = (camera.position.x + tgtX) / 2;
    const pkZ = (camera.position.z + tgtZ) / 2;

    const tl = gsap.timeline();
    tl.to(camera.position, {
      x: pkX, y: pkY, z: pkZ, duration: 0.48, ease: 'power3.out',
      onUpdate: () => { camera.lookAt(pkX, 0, pkZ - r * 0.25); camera.updateProjectionMatrix(); },
    }).to(camera.position, {
      x: tgtX, y: tgtY, z: tgtZ, duration: 0.62, ease: 'power3.inOut',
      onUpdate: () => { camera.lookAt(tgtX, 0, lkZ); camera.updateProjectionMatrix(); },
    });
    tlRef.current = tl;
  }, [targetRegion, camera, scene]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST-PROCESSING — bloom on emissive, vignette, subtle grain
// ─────────────────────────────────────────────────────────────────────────────
function PostFX() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        luminanceThreshold={0.18}
        luminanceSmoothing={0.85}
        intensity={1.05}
        radius={0.78}
      />
      <Vignette eskil={false} offset={0.36} darkness={0.72} />
      <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.025} />
    </EffectComposer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE
// ─────────────────────────────────────────────────────────────────────────────
function Scene({ selectedRegion, hoveredRegion, setSelectedRegion, setHoveredRegion }) {
  const [modelBounds,  setModelBounds]   = useState(null);
  const [hoveredDist,  setHoveredDist]   = useState(null);

  // Districts inherit the same model offset that ADM1 group uses (we centered it on bounds)
  const modelOffset = useMemo(() => {
    if (!modelBounds) return { x: 0, z: 0 };
    const c = modelBounds.getCenter(new THREE.Vector3());
    // ADM1 group already moved by (-c.x, -c.z); ADM2 needs same shift
    return { x: 0, z: 0 };
  }, [modelBounds]);

  return (
    <>
      <color attach="background" args={['#030a18']} />
      <fog attach="fog" args={['#060f22', 18, 70]} />

      {/* Lights — moody key + cool fill + emerald rim */}
      <ambientLight intensity={0.42} />
      <directionalLight
        position={[12, 16, 8]}
        intensity={1.85}
        color="#ffe8c0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5} shadow-camera-far={60}
        shadow-camera-left={-15} shadow-camera-right={15}
        shadow-camera-top={15}   shadow-camera-bottom={-15}
      />
      <directionalLight position={[-10, 8, -6]} intensity={0.5} color="#a8c8ff" />
      <hemisphereLight args={['#c8e0ff', '#1a1a08', 0.36]} />
      <pointLight position={[0, 4, -10]} intensity={0.8} color="#4DFF91" distance={30} />

      <Suspense fallback={
        <Html center>
          <div style={{
            color: '#4DFF91', fontSize: 14, fontFamily: 'system-ui',
            background: 'rgba(3,10,24,0.92)', padding: '14px 24px', borderRadius: 10,
            border: '1px solid rgba(34,211,238,0.25)', backdropFilter: 'blur(10px)',
          }}>⏳ Chargement…</div>
        </Html>
      }>
        {/* Sandtable plinth */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color="#0a0f1c" roughness={0.95} metalness={0} />
        </mesh>

        <OceanPlane />

        <ADM1Model
          onRegionClick={setSelectedRegion}
          selectedRegion={selectedRegion}
          hoveredRegion={hoveredRegion}
          setHoveredRegion={setHoveredRegion}
          onModelReady={setModelBounds}
        />

        {selectedRegion && (
          <ADM2Districts
            parentRegion={selectedRegion}
            modelOffset={modelOffset}
            onDistrictHover={setHoveredDist}
          />
        )}
      </Suspense>

      <CameraController targetRegion={selectedRegion} modelBounds={modelBounds} />
      <PostFX />

      {hoveredDist && selectedRegion && (
        <Html center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(3,10,24,0.92)', border: '1px solid rgba(34,211,238,0.3)',
            borderRadius: 8, padding: '5px 12px', color: '#fff', fontSize: 12,
            fontFamily: 'system-ui', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
          }}>{hoveredDist}</div>
        </Html>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_REGION = 'Analamanga';

export default function Madagascar3DMap() {
  const [selectedRegion, setSelectedRegion] = useState(DEFAULT_REGION);
  const [hoveredRegion,  setHoveredRegion]  = useState(null);

  const currentIdx = selectedRegion ? REGION_ORDER.indexOf(selectedRegion) : -1;
  const prevRegion = currentIdx > 0
    ? REGION_ORDER[currentIdx - 1]
    : REGION_ORDER[REGION_ORDER.length - 1];
  const nextRegion = currentIdx >= 0
    ? REGION_ORDER[(currentIdx + 1) % REGION_ORDER.length]
    : REGION_ORDER[0];

  const handleSelect   = useCallback((n) => { setSelectedRegion(n); setHoveredRegion(null); }, []);
  const handlePrev     = useCallback(() => handleSelect(prevRegion), [handleSelect, prevRegion]);
  const handleNext     = useCallback(() => handleSelect(nextRegion), [handleSelect, nextRegion]);
  const handleOverview = useCallback(() => setSelectedRegion(null), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft')       handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'Escape')     handleOverview();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlePrev, handleNext, handleOverview]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#030a18', overflow: 'hidden' }}>
      <Canvas
        shadows
        camera={{ position: [0, 12, 14], fov: 38, near: 0.05, far: 200 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.12,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <Scene
          selectedRegion={selectedRegion}
          hoveredRegion={hoveredRegion}
          setSelectedRegion={handleSelect}
          setHoveredRegion={setHoveredRegion}
        />
      </Canvas>

      {hoveredRegion && !selectedRegion && (
        <div style={{
          position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(3,10,24,0.88)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(34,211,238,0.35)', borderRadius: 12,
          padding: '10px 20px', color: '#fff', fontSize: 13,
          pointerEvents: 'none', fontFamily: 'system-ui', zIndex: 10,
          boxShadow: '0 8px 32px rgba(34,211,238,0.12)',
        }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#4DFF91', letterSpacing: '-0.02em' }}>
            {hoveredRegion}
          </div>
          <div style={{ opacity: 0.65, fontSize: 11, marginTop: 3, letterSpacing: '0.04em' }}>
            {REGION_INFO[hoveredRegion]?.capital?.toUpperCase()} · {REGION_INFO[hoveredRegion]?.area.toLocaleString()} KM²
          </div>
        </div>
      )}

      {selectedRegion && (
        <RegionStatsPanel
          region={selectedRegion}
          info={REGION_INFO[selectedRegion]}
          stats={REGION_STATS[selectedRegion]}
          onClose={handleOverview}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(3,10,24,0.82)',
          backdropFilter: 'blur(16px) saturate(1.4)',
          border: '1px solid rgba(34,211,238,0.2)',
          borderRadius: 14,
          padding: 5,
          boxShadow: '0 12px 48px rgba(0,0,0,0.5), 0 0 30px -10px rgba(34,211,238,0.25)',
          zIndex: 10,
          fontFamily: "'Inter',system-ui",
        }}
      >
        <NavButton onClick={handlePrev} title="Région précédente (←)">
          <ChevronLeft size={16} strokeWidth={2.2} />
          <span style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.06em' }}>{prevRegion}</span>
        </NavButton>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '6px 20px', minWidth: 180,
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}>
          <span style={{
            fontSize: 9, letterSpacing: '0.18em', color: '#4DFF91',
            fontWeight: 700, textTransform: 'uppercase', marginBottom: 2,
          }}>
            {selectedRegion ? `Région ${currentIdx + 1} / 22` : 'Vue Globale'}
          </span>
          <span style={{
            fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em',
          }}>
            {selectedRegion ?? 'Madagascar 🇲🇬'}
          </span>
        </div>

        <NavButton onClick={handleNext} title="Région suivante (→)">
          <span style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.06em' }}>{nextRegion}</span>
          <ChevronRight size={16} strokeWidth={2.2} />
        </NavButton>

        <button
          onClick={handleOverview}
          title="Vue globale (Esc)"
          style={{
            marginLeft: 4,
            background: selectedRegion ? 'rgba(34,211,238,0.12)' : 'rgba(34,211,238,0.25)',
            border: '1px solid rgba(34,211,238,0.35)',
            borderRadius: 10, width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#4DFF91',
            transition: 'all 0.18s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(34,211,238,0.3)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = selectedRegion ? 'rgba(34,211,238,0.12)' : 'rgba(34,211,238,0.25)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Globe2 size={16} strokeWidth={2.2} />
        </button>
      </motion.div>

      <div style={{
        position: 'absolute', top: 22, left: 22,
        background: 'rgba(3,10,24,0.6)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
        padding: '6px 12px', color: 'rgba(255,255,255,0.5)',
        fontSize: 10, fontFamily: "'Inter',system-ui", zIndex: 10,
        letterSpacing: '0.06em',
      }}>
        <kbd style={kbdStyle}>←</kbd> <kbd style={kbdStyle}>→</kbd> naviguer · <kbd style={kbdStyle}>Esc</kbd> vue globale
      </div>
    </div>
  );
}

const kbdStyle = {
  display: 'inline-block',
  padding: '1px 5px',
  margin: '0 1px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 4,
  color: '#4DFF91',
  fontSize: 9,
  fontFamily: 'monospace',
};

function NavButton({ onClick, title, children }) {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'transparent',
        border: 'none', borderRadius: 10,
        padding: '8px 14px',
        color: 'rgba(255,255,255,0.75)',
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
      }}
    >
      {children}
    </motion.button>
  );
}

useGLTF.preload('/models/madagascar_adm1.glb');
useGLTF.preload('/models/madagascar_adm2.glb');

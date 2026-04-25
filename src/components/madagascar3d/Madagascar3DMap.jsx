/* eslint-disable react/no-unknown-property */
/**
 * Madagascar 3D Map — Visual Overhaul
 * Inspired by Chartogne-Taillet / Marseille 2021
 * — Perspective camera ~35° tilt
 * — REAL aerial terrain texture (Poly Haven CDN, CC0)
 * — SINGLE unified warm earth tint across all 22 regions
 * — Animated ocean shader
 * — Post-processing: Bloom + Vignette + Noise grain
 * — Cinematic arc camera transitions
 * — Floating region labels
 * — Atmospheric fog
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
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
// Y_EXAGGERATION augmenté de 8→28 pour révéler les montagnes SRTM réelles (2543m max)
const Y_EXAGGERATION = 28;
const DISTRICT_Y     = 1_500;
const MARKER_Y       = 120_000;
const SPHERE_R       = 8_500;

// Liste ordonnée des régions pour la navigation prev/next
const REGION_ORDER = [
  'Diana', 'Sava', 'Analanjirofo', 'Sofia', 'Boeny', 'Melaky',
  'Betsiboka', 'Bongolava', 'Analamanga', 'Alaotra-Mangoro',
  'Atsinanana', 'Itasy', 'Vakinankaratra', 'Menabe',
  "Amoron'i Mania", 'Matsiatra Ambony', 'Vatovavy-Fitovinany',
  'Atsimo-Atsinanana', 'Ihorombe', 'Atsimo-Andrefana',
  'Anosy', 'Androy',
];

// SINGLE unified tint for all 22 regions (Chartogne-Taillet warm earth)
const BASE_TINT = '#b5a478';

// Region identifier set (for click/hover detection — NOT for coloring)
const REGIONS = new Set([
  'Atsinanana','Analanjirofo','Atsimo-Atsinanana','Vatovavy-Fitovinany',
  'Diana','Sava','Analamanga','Vakinankaratra',"Amoron'i Mania",
  'Itasy','Bongolava','Matsiatra Ambony','Alaotra-Mangoro','Ihorombe',
  'Boeny','Sofia','Melaky','Menabe','Betsiboka',
  'Atsimo-Andrefana','Androy','Anosy',
]);

// Aerial terrain texture (Poly Haven CC0 CDN) — one texture shared by all regions
const TEX_DIFFUSE   = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_grass_rock/aerial_grass_rock_diff_1k.jpg';
const TEX_NORMAL    = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_grass_rock/aerial_grass_rock_nor_gl_1k.jpg';
const TEX_ROUGHNESS = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_grass_rock/aerial_grass_rock_rough_1k.jpg';

// ─────────────────────────────────────────────────────────────────────────────
// PROCEDURAL FALLBACK TEXTURE (si CDN indisponible)
// ─────────────────────────────────────────────────────────────────────────────
function generateFallbackTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#8a7b55';
  ctx.fillRect(0, 0, size, size);

  // Layered noise
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 45;
    d[i]     = Math.max(0, Math.min(255, d[i]     + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * 0.85));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.65));
  }
  ctx.putImageData(img, 0, 0);

  // Darker/lighter blobs for natural variation
  for (let i = 0; i < 80; i++) {
    const r = 20 + Math.random() * 80;
    const alpha = 0.08 + Math.random() * 0.18;
    ctx.fillStyle = `rgba(${70 + Math.random() * 70},${60 + Math.random() * 65},${40 + Math.random() * 45},${alpha})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  return tex;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXTURE LOADER (CDN + fallback procédural)
// ─────────────────────────────────────────────────────────────────────────────
function useTerrainTextures() {
  const [textures, setTextures] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    const loadTex = (url) => new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

    Promise.all([loadTex(TEX_DIFFUSE), loadTex(TEX_NORMAL), loadTex(TEX_ROUGHNESS)])
      .then(([map, normalMap, roughnessMap]) => {
        if (cancelled) return;
        [map, normalMap, roughnessMap].forEach(t => {
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(8, 8);
          t.anisotropy = 16;
        });
        map.colorSpace = THREE.SRGBColorSpace;
        setTextures({ map, normalMap, roughnessMap });
      })
      .catch(err => {
        if (cancelled) return;
        console.warn('[terrain] CDN texture failed, using procedural fallback.', err);
        const fallback = generateFallbackTexture();
        fallback.repeat.set(8, 8);
        fallback.colorSpace = THREE.SRGBColorSpace;
        setTextures({ map: fallback, normalMap: null, roughnessMap: null });
      });

    return () => { cancelled = true; };
  }, []);

  return textures;
}

// Ocean GLSL
const OCEAN_VERT = `
  uniform float uTime;
  varying float vH;
  void main() {
    vec3 p = position;
    float w = sin(p.x*0.0000022+uTime*0.28)*5500.0
            + cos(p.y*0.0000018+uTime*0.20)*3800.0
            + sin((p.x+p.y)*0.0000015+uTime*0.14)*2200.0;
    p.z += w;
    vH = w/11500.0*0.5+0.5;
    gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0);
  }
`;
const OCEAN_FRAG = `
  varying float vH;
  void main() {
    vec3 deep  = vec3(0.004,0.038,0.120);
    vec3 mid   = vec3(0.009,0.072,0.195);
    vec3 shine = vec3(0.035,0.130,0.340);
    float hi   = pow(max(vH-0.68,0.0)*3.1,2.2);
    vec3 col   = mix(deep, mid, vH*0.85) + shine*hi*0.38;
    gl_FragColor = vec4(col, 0.94);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// OCEAN PLANE
// ─────────────────────────────────────────────────────────────────────────────
function OceanPlane() {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame(s => { uniforms.uTime.value = s.clock.elapsedTime; });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6000, 0]}>
      <planeGeometry args={[9_000_000, 9_000_000, 64, 64]} />
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
// ADM1 MODEL — texture aérienne réelle + couleur uniforme
// ─────────────────────────────────────────────────────────────────────────────
function ADM1Model({
  onRegionClick, selectedRegion, hoveredRegion, setHoveredRegion,
  onModelReady, onOffsetReady, onRegionCenters,
}) {
  const { scene }   = useGLTF('/models/madagascar_adm1.glb');
  const groupRef    = useRef();
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const terrainTex  = useTerrainTextures();
  const materialsRef = useRef({});   // ← stockage persistant des matériaux (fix flicker)

  const meshes = useMemo(() => {
    const list = [];
    clonedScene.traverse(c => { if (c.isMesh) list.push(c); });
    return list;
  }, [clonedScene]);

  // Centrage + callbacks offset/centers
  useEffect(() => {
    if (!groupRef.current) return;
    const box    = new THREE.Box3().setFromObject(groupRef.current);
    const center = box.getCenter(new THREE.Vector3());
    groupRef.current.position.x = -center.x;
    groupRef.current.position.z = -center.z;
    groupRef.current.updateMatrixWorld(true);

    onOffsetReady?.({ x: -center.x, z: -center.z });

    const regionCenters = {};
    meshes.forEach(m => {
      if (REGIONS.has(m.name)) {
        const mb = new THREE.Box3().setFromObject(m);
        regionCenters[m.name] = mb.getCenter(new THREE.Vector3());
      }
    });
    onRegionCenters?.(regionCenters);
    onModelReady?.(new THREE.Box3().setFromObject(groupRef.current));
  }, [meshes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECT 1 — Créer les matériaux UNE SEULE FOIS quand les textures chargent
  // (ne dépend PAS de hover/select → pas de flicker sur la texture)
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!terrainTex) return;

    meshes.forEach(mesh => {
      const isRegion  = REGIONS.has(mesh.name);
      const isTerrain = mesh.name === 'madagascar_srtm.001';

      if (isRegion) {
        // ── Matériau régions : texture aerial + teinte unifiée ────────────
        mesh.visible = true;
        const mat = new THREE.MeshStandardMaterial({
          color: BASE_TINT,
          map:          terrainTex.map,
          normalMap:    terrainTex.normalMap,
          roughnessMap: terrainTex.roughnessMap,
          normalScale:  new THREE.Vector2(1.2, 1.2),
          roughness: 0.78,
          metalness: 0.04,
          emissive:  new THREE.Color(0, 0, 0),
          emissiveIntensity: 0,
          transparent: true,
          opacity: 1.0,
          side: THREE.DoubleSide,
        });
        mesh.material = mat;
        materialsRef.current[mesh.name] = mat;
        mesh.userData.regionName = mesh.name;
        mesh.userData.isRegion   = true;
        mesh.castShadow    = true;
        mesh.receiveShadow = true;
        if (mesh.geometry && !mesh.geometry.attributes.normal) {
          mesh.geometry.computeVertexNormals();
        }
      } else if (isTerrain) {
        // ── TERRAIN_MDG → BASE 3D SOMBRE (remplit les gaps au centre) ─────
        //   position.y = -2543 → son pic aligne sur sea-level (y=0 world)
        //   donc il reste sous les régions mais visible entre elles
        mesh.visible = true;
        mesh.position.y = -2543;
        mesh.material = new THREE.MeshStandardMaterial({
          color: '#1a1408',
          map:       terrainTex.map,
          roughness: 0.95,
          metalness: 0,
          transparent: false,
          opacity: 1.0,
          side: THREE.DoubleSide,
        });
        mesh.userData.regionName = null;
        mesh.userData.isRegion   = false;
        mesh.castShadow    = false;
        mesh.receiveShadow = true;
      } else {
        mesh.visible = false;
      }
    });
  }, [meshes, terrainTex]); // ← PAS de selectedRegion/hoveredRegion ici

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECT 2 — Hover / Select : mise à jour IMPÉRATIVE des matériaux existants
  // (pas de recréation → pas de flicker texture)
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    Object.entries(materialsRef.current).forEach(([name, mat]) => {
      const isSelected = selectedRegion === name;
      const isHovered  = hoveredRegion  === name;
      const isDimmed   = selectedRegion && !isSelected;

      mat.emissive.set(
        isHovered ? '#4DFF91' :
        isSelected ? '#ff9155' : '#000000'
      );
      mat.emissiveIntensity = isHovered ? 0.35 : isSelected ? 0.22 : 0;
      mat.opacity = isDimmed ? 0.22 : 1.0;
      mat.transparent = true;
      mat.needsUpdate = true;
    });
  }, [selectedRegion, hoveredRegion]);

  return (
    <group ref={groupRef} scale={[1, Y_EXAGGERATION, 1]}>
      <primitive
        object={clonedScene}
        onPointerDown={e => {
          e.stopPropagation();
          const n = e.object.userData.regionName;
          if (n && REGIONS.has(n)) onRegionClick(n);
        }}
        onPointerMove={e => {
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
// ADM2 DISTRICTS
// ─────────────────────────────────────────────────────────────────────────────
function ADM2Districts({ parentRegion, modelOffset, onDistrictHover }) {
  const { scene }    = useGLTF('/models/madagascar_adm2.glb');
  const clonedScene  = useMemo(() => scene.clone(true), [scene]);
  const materialsRef = useRef({});
  const [hovered, setHovered] = useState(null);

  const districts = useMemo(() => {
    const list = [];
    clonedScene.traverse(c => {
      if (c.isMesh && ADM2_PARENT[c.name] === parentRegion) list.push(c);
    });
    return list;
  }, [clonedScene, parentRegion]);

  useEffect(() => {
    materialsRef.current = {};
    districts.forEach((d, i) => {
      const hue = (i * 137.5) % 360;
      const mat = new THREE.MeshStandardMaterial({
        color:  new THREE.Color(`hsl(${hue},72%,52%)`),
        roughness: 0.5, metalness: 0.08,
        emissive: new THREE.Color(0,0,0),
        emissiveIntensity: 0.12,
        transparent: true, opacity: 0,
        side: THREE.DoubleSide,
      });
      d.material = mat;
      d.castShadow = true;
      d.position.y = DISTRICT_Y;
      materialsRef.current[d.name] = mat;
      gsap.to(mat, { opacity: 0.92, duration: 0.4, delay: 0.15 + i * 0.025, ease: 'power2.out' });
    });
    return () => Object.values(materialsRef.current).forEach(m => m.dispose());
  }, [districts]);

  useEffect(() => {
    Object.entries(materialsRef.current).forEach(([n, mat]) => {
      mat.emissiveIntensity = hovered === n ? 0.6 : 0.12;
      mat.roughness         = hovered === n ? 0.35 : 0.5;
      mat.needsUpdate       = true;
    });
  }, [hovered]);

  const onDown  = useCallback(e => { e.stopPropagation(); }, []);
  const onMove  = useCallback(e => {
    e.stopPropagation();
    const n = e.object.name;
    if (hovered !== n) { setHovered(n); onDistrictHover?.(n); }
    document.body.style.cursor = 'pointer';
  }, [hovered, onDistrictHover]);
  const onOut   = useCallback(() => {
    setHovered(null); onDistrictHover?.(null);
    document.body.style.cursor = 'auto';
  }, [onDistrictHover]);

  return (
    <group
      position={[modelOffset.x, 0, modelOffset.z]}
      scale={[1, Y_EXAGGERATION, 1]}
      onPointerDown={onDown} onPointerMove={onMove} onPointerOut={onOut}
    >
      {districts.map(d => <primitive key={d.uuid} object={d} />)}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSPECTIVE CAMERA CONTROLLER — arc cinématique
// ─────────────────────────────────────────────────────────────────────────────
function PerspectiveCameraController({ targetRegion, modelBounds }) {
  const { camera, scene } = useThree();
  const initial   = useRef(null);
  const activeTL  = useRef(null);

  // Initialisation après chargement modèle
  useEffect(() => {
    if (!modelBounds || initial.current) return;
    const center = modelBounds.getCenter(new THREE.Vector3());
    const size   = modelBounds.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.z);

    const camY = maxDim * 0.62;
    const camZ = center.z + maxDim * 0.92;
    const lookZ = center.z - maxDim * 0.12;

    camera.position.set(center.x, camY, camZ);
    camera.lookAt(center.x, 0, lookZ);
    camera.near = 10_000;
    camera.far  = 12_000_000;
    camera.updateProjectionMatrix();

    initial.current = {
      pos:  new THREE.Vector3(center.x, camY, camZ),
      look: new THREE.Vector3(center.x, 0, lookZ),
    };
  }, [modelBounds, camera]);

  useEffect(() => {
    if (!initial.current) return;
    if (activeTL.current) { activeTL.current.kill(); activeTL.current = null; }

    if (!targetRegion) {
      // Retour vue globale avec arc
      const init  = initial.current;
      const midY  = Math.max(camera.position.y, init.pos.y) * 1.35;
      const midX  = (camera.position.x + init.pos.x) / 2;
      const midZ  = (camera.position.z + init.pos.z) / 2;

      const tl = gsap.timeline();
      tl.to(camera.position, {
        x: midX, y: midY, z: midZ, duration: 0.48, ease: 'power2.out',
        onUpdate: () => { camera.lookAt(midX, 0, midZ - 300_000); camera.updateProjectionMatrix(); },
      }).to(camera.position, {
        x: init.pos.x, y: init.pos.y, z: init.pos.z, duration: 0.70, ease: 'power2.inOut',
        onUpdate: () => { camera.lookAt(init.look.x, init.look.y, init.look.z); camera.updateProjectionMatrix(); },
      });
      activeTL.current = tl;
      return;
    }

    // Trouver le mesh sélectionné
    let mesh = null;
    scene.traverse(c => {
      if (c.isMesh && c.userData.regionName === targetRegion && c.userData.isRegion) mesh = c;
    });
    if (!mesh) return;

    const box    = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    const r      = Math.max(size.x, size.z);

    // Position caméra : au-dessus et derrière la région sélectionnée
    const tgtY  = r * 0.75;
    const tgtZ  = center.z + r * 0.98;
    const tgtX  = center.x;
    const lkZ   = center.z - r * 0.08;

    // Arc peak
    const pkY  = Math.max(camera.position.y, tgtY) * 1.55;
    const pkX  = (camera.position.x + tgtX) / 2;
    const pkZ  = (camera.position.z + tgtZ) / 2;

    const tl = gsap.timeline();
    tl.to(camera.position, {
      x: pkX, y: pkY, z: pkZ, duration: 0.52, ease: 'power3.out',
      onUpdate: () => { camera.lookAt(pkX, 0, pkZ - r * 0.5); camera.updateProjectionMatrix(); },
    }).to(camera.position, {
      x: tgtX, y: tgtY, z: tgtZ, duration: 0.68, ease: 'power3.inOut',
      onUpdate: () => { camera.lookAt(tgtX, 0, lkZ); camera.updateProjectionMatrix(); },
    });
    activeTL.current = tl;

  }, [targetRegion, camera, scene]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST-PROCESSING
// ─────────────────────────────────────────────────────────────────────────────
function PostFX() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        luminanceThreshold={0.12}
        luminanceSmoothing={0.85}
        intensity={1.4}
        radius={0.88}
      />
      <Vignette eskil={false} offset={0.38} darkness={0.82} />
      <Noise
        premultiply
        blendFunction={BlendFunction.ADD}
        opacity={0.028}
      />
    </EffectComposer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCÈNE
// ─────────────────────────────────────────────────────────────────────────────
function Scene({ selectedRegion, hoveredRegion, setSelectedRegion, setHoveredRegion }) {
  const [modelBounds,    setModelBounds]    = useState(null);
  const [modelOffset,    setModelOffset]    = useState({ x: 0, z: 0 });
  const [regionCenters,  setRegionCenters]  = useState({});
  const [hoveredDistrict,setHoveredDistrict]= useState(null);

  const handleOffset  = useCallback(o  => setModelOffset(o),  []);
  const handleCenters = useCallback(cs => setRegionCenters(cs),[]);

  return (
    <>
      {/* Fond bleu nuit profond */}
      <color attach="background" args={['#030a18']} />

      {/* Brouillard atmosphérique */}
      <fog attach="fog" args={['#060f22', 2_200_000, 7_500_000]} />

      {/* ── Éclairage ────────────────────────────────────────────────── */}
      <ambientLight intensity={0.35} />
      {/* ── Soleil principal — ANGLE RASANT pour révéler les montagnes SRTM ── */}
      <directionalLight
        position={[2_500_000, 900_000, 600_000]}
        intensity={2.2}
        color="#ffe8c0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={200_000} shadow-camera-far={7_000_000}
        shadow-camera-left={-1_800_000} shadow-camera-right={1_800_000}
        shadow-camera-top={1_800_000} shadow-camera-bottom={-1_800_000}
      />
      {/* Fill light côté opposé (éclaire les ombres) */}
      <directionalLight position={[-1_500_000, 800_000, -800_000]} intensity={0.5} color="#a8c8ff" />
      {/* Lumière d'ambiance ciel/sol */}
      <hemisphereLight args={['#c8e0ff', '#1a1a08', 0.35]} />
      {/* Rim light cyan (halo sur les côtes) */}
      <pointLight position={[0, 600_000, -1_200_000]} intensity={0.4} color="#4DFF91" />

      <Suspense fallback={
        <Html center>
          <div style={{
            color: '#4DFF91', fontSize: 14, fontFamily: 'system-ui',
            background: 'rgba(3,10,24,0.92)', padding: '14px 24px', borderRadius: 10,
            border: '1px solid rgba(34,211,238,0.25)', backdropFilter: 'blur(10px)',
          }}>
            ⏳ Chargement…
          </div>
        </Html>
      }>
        {/* ═══ BASE "SANDTABLE" — plinthe 3D sombre sous tout le terrain ═══ */}
        {/*   crée l'effet "3D en bloc" + cache le fond derrière les gaps       */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -40_000, 0]}
          receiveShadow
        >
          <planeGeometry args={[4_000_000, 4_000_000]} />
          <meshStandardMaterial
            color="#0a0f1c"
            roughness={0.95}
            metalness={0}
          />
        </mesh>

        {/* Océan animé */}
        <OceanPlane />

        {/* Régions ADM1 */}
        <ADM1Model
          onRegionClick={setSelectedRegion}
          selectedRegion={selectedRegion}
          hoveredRegion={hoveredRegion}
          setHoveredRegion={setHoveredRegion}
          onModelReady={setModelBounds}
          onOffsetReady={handleOffset}
          onRegionCenters={handleCenters}
        />

        {/* Districts ADM2 */}
        {selectedRegion && modelOffset.x !== 0 && (
          <ADM2Districts
            parentRegion={selectedRegion}
            modelOffset={modelOffset}
            onDistrictHover={setHoveredDistrict}
          />
        )}
      </Suspense>

      {/* Caméra perspective */}
      <PerspectiveCameraController
        targetRegion={selectedRegion}
        modelBounds={modelBounds}
      />

      {/* Post-processing */}
      <PostFX />

      {/* Tooltip district */}
      {hoveredDistrict && selectedRegion && (
        <Html center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(3,10,24,0.92)', border: '1px solid rgba(34,211,238,0.3)',
            borderRadius: 8, padding: '5px 12px', color: '#fff', fontSize: 12,
            fontFamily: 'system-ui', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
          }}>
            {hoveredDistrict}
          </div>
        </Html>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL — vue initiale sur une région + navigation prev/next
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_REGION = 'Analamanga'; // Région de départ (style Chartogne-Taillet)

export default function Madagascar3DMap() {
  const [selectedRegion, setSelectedRegion] = useState(DEFAULT_REGION);
  const [hoveredRegion,  setHoveredRegion]  = useState(null);

  // Navigation index
  const currentIdx = selectedRegion ? REGION_ORDER.indexOf(selectedRegion) : -1;
  const prevRegion = currentIdx > 0
    ? REGION_ORDER[currentIdx - 1]
    : (currentIdx === 0 ? REGION_ORDER[REGION_ORDER.length - 1] : REGION_ORDER[REGION_ORDER.length - 1]);
  const nextRegion = currentIdx >= 0
    ? REGION_ORDER[(currentIdx + 1) % REGION_ORDER.length]
    : REGION_ORDER[0];

  const handleSelect    = useCallback(n => { setSelectedRegion(n); setHoveredRegion(null); }, []);
  const handlePrev      = useCallback(() => handleSelect(prevRegion), [handleSelect, prevRegion]);
  const handleNext      = useCallback(() => handleSelect(nextRegion), [handleSelect, nextRegion]);
  const handleOverview  = useCallback(() => setSelectedRegion(null), []);

  // Navigation clavier (← →, Esc = overview)
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
        camera={{ position: [0, 1_600_000, 2_200_000], fov: 42, near: 10_000, far: 12_000_000 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
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

      {/* ── Tooltip hover région (overview seulement) ───────── */}
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

      {/* ── Panel région sélectionnée ────────────────────────── */}
      {selectedRegion && (
        <RegionStatsPanel
          region={selectedRegion}
          info={REGION_INFO[selectedRegion]}
          stats={REGION_STATS[selectedRegion]}
          onClose={handleOverview}
        />
      )}

      {/* ── BARRE DE NAVIGATION RÉGIONS ────────────────────── */}
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
        {/* Bouton précédent */}
        <NavButton onClick={handlePrev} title="Région précédente (←)">
          <ChevronLeft size={16} strokeWidth={2.2} />
          <span style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.06em' }}>
            {prevRegion}
          </span>
        </NavButton>

        {/* Affichage région courante */}
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
            {selectedRegion
              ? `Région ${currentIdx + 1} / 22`
              : 'Vue Globale'}
          </span>
          <span style={{
            fontSize: 14, fontWeight: 800, color: '#fff',
            letterSpacing: '-0.01em',
          }}>
            {selectedRegion ?? 'Madagascar 🇲🇬'}
          </span>
        </div>

        {/* Bouton suivant */}
        <NavButton onClick={handleNext} title="Région suivante (→)">
          <span style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.06em' }}>
            {nextRegion}
          </span>
          <ChevronRight size={16} strokeWidth={2.2} />
        </NavButton>

        {/* Bouton overview */}
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
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(34,211,238,0.3)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = selectedRegion ? 'rgba(34,211,238,0.12)' : 'rgba(34,211,238,0.25)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Globe2 size={16} strokeWidth={2.2} />
        </button>
      </motion.div>

      {/* ── Indication clavier (discret, en haut à gauche) ─── */}
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

// ── Composants UI ─────────────────────────────────────────────────────────────
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
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.color = '#fff';
      }}
      onMouseLeave={e => {
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

import React, { useRef, useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

import imgM1 from '../../assets/marquee/2148761816.webp';
import imgM2 from '../../assets/marquee/2149711095.webp';
import imgM3 from '../../assets/marquee/pexels-safari-consoler-3290243-11196645.webp';
import imgM4 from '../../assets/marquee/pexels-ateeq-photos-2152808415-32409512.webp';
import imgM5 from '../../assets/marquee/644.webp';
import imgM6 from '../../assets/marquee/campagne-litchi-madagascar.webp';
import imgM7 from '../../assets/marquee/BAOBAB-2-1290x540.webp';

const REGION_IMAGES = [imgM1, imgM2, imgM3, imgM4, imgM5, imgM6, imgM7];

useGLTF.preload('/madagascar.glb');

/* ============================================================
   Camera rig — initial top-down + arc-transition GSAP on focus
   Calls invalidate() during tweens so frameloop="demand" still
   redraws while the camera moves.
   ============================================================ */
function CameraRig({ targetMesh, modelBounds }) {
  const { camera, invalidate } = useThree();
  const initial = useRef(null);
  const tl = useRef(null);

  useEffect(() => {
    if (!modelBounds || initial.current) return;
    const c = modelBounds.getCenter(new THREE.Vector3());
    const s = modelBounds.getSize(new THREE.Vector3());
    const maxDim = Math.max(s.x, s.z, s.y);
    const camY = maxDim * 1.45;
    const camZ = c.z + maxDim * 0.15;
    camera.position.set(c.x, camY, camZ);
    camera.lookAt(c.x, 0, c.z);
    camera.near = 0.05;
    camera.far  = 200;
    camera.updateProjectionMatrix();
    initial.current = {
      pos:  new THREE.Vector3(c.x, camY, camZ),
      look: new THREE.Vector3(c.x, 0, c.z),
    };
    invalidate();
  }, [modelBounds, camera, invalidate]);

  useEffect(() => {
    if (!initial.current) return;
    if (tl.current) { tl.current.kill(); tl.current = null; }

    const tick = () => invalidate();

    if (!targetMesh) {
      const i = initial.current;
      const peak = {
        x: (camera.position.x + i.pos.x) / 2,
        y: Math.max(camera.position.y, i.pos.y) * 1.25,
        z: (camera.position.z + i.pos.z) / 2,
      };
      const t = gsap.timeline({ onUpdate: tick });
      t.to(camera.position, {
        ...peak, duration: 0.45, ease: 'power2.out',
        onUpdate: () => { camera.lookAt(i.look.x, i.look.y, i.look.z); camera.updateProjectionMatrix(); tick(); },
      }).to(camera.position, {
        x: i.pos.x, y: i.pos.y, z: i.pos.z, duration: 0.65, ease: 'power3.inOut',
        onUpdate: () => { camera.lookAt(i.look.x, i.look.y, i.look.z); camera.updateProjectionMatrix(); tick(); },
      });
      tl.current = t;
      return;
    }

    const box = new THREE.Box3().setFromObject(targetMesh);
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    const r = Math.max(s.x, s.z, 0.5);
    const tgtY = r * 1.6;
    const tgtX = c.x;
    const tgtZ = c.z + r * 0.18;
    const peak = {
      x: (camera.position.x + tgtX) / 2,
      y: Math.max(camera.position.y, tgtY) * 1.4,
      z: (camera.position.z + tgtZ) / 2,
    };

    const t = gsap.timeline();
    t.to(camera.position, {
      ...peak, duration: 0.42, ease: 'power3.out',
      onUpdate: () => { camera.lookAt(c.x, 0, c.z); camera.updateProjectionMatrix(); tick(); },
    }).to(camera.position, {
      x: tgtX, y: tgtY, z: tgtZ, duration: 0.62, ease: 'power3.inOut',
      onUpdate: () => { camera.lookAt(c.x, 0, c.z); camera.updateProjectionMatrix(); tick(); },
    });
    tl.current = t;
  }, [targetMesh, camera, invalidate]);

  return null;
}

/* ============================================================
   Edge lines — extract polygon boundaries from meshes.
   Geometries memoized so they're not rebuilt on every render.
   ============================================================ */
// thresholdAngle in DEGREES (three.js EdgesGeometry uses degrees, not radians).
// High value (30+) filters internal jagged edges from decimated meshes — keeps only the silhouette.
function EdgeLines({ meshes, color = '#4DFF91', opacity = 0.55, thresholdAngle = 30 }) {
  const segments = useMemo(() => {
    return meshes
      .map(m => m && m.geometry ? {
        uuid: m.uuid,
        geometry: new THREE.EdgesGeometry(m.geometry, thresholdAngle),
        matrixWorld: m.matrixWorld,
      } : null)
      .filter(Boolean);
  }, [meshes, thresholdAngle]);

  return (
    <>
      {segments.map(s => (
        <lineSegments key={s.uuid} geometry={s.geometry} matrixAutoUpdate={false} matrix={s.matrixWorld}>
          <lineBasicMaterial
            color={color}
            transparent
            opacity={opacity}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      ))}
    </>
  );
}

/* ============================================================
   3D dot mesh — replaces drei <Html> for performance.
   - 1 sphere mesh per dot, single GPU draw call each
   - Per-frame opacity pulse driven by a single useFrame in parent
   - Hover state local (no React re-render cascade)
   ============================================================ */
function BiolumDot({ position, regionId, label, isActiveSelection, delay, kind, onPick }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const { invalidate } = useThree();

  const baseRadius = kind === 'region' ? 0.06 : 0.04;
  const isHighlight = hovered || isActiveSelection;

  // Pulse animation: cheap sin wave on opacity, single material per dot
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime + delay;
    // 2.4s period (matches our biolum CSS keyframe)
    const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * (Math.PI / 1.2)));
    meshRef.current.material.opacity = isHighlight ? 1 : pulse;
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={isHighlight ? 1.6 : 1}
      onClick={(e) => { e.stopPropagation(); onPick?.(regionId); invalidate(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; invalidate(); }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; invalidate(); }}
    >
      <sphereGeometry args={[baseRadius, 12, 8]} />
      <meshBasicMaterial
        color={isHighlight ? '#4DFF91' : '#FFFFFF'}
        transparent
        opacity={1}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ============================================================
   Active region label — single drei <Html> instance (lightweight).
   ============================================================ */
function ActiveLabel({ position, text }) {
  return (
    <Html position={position} center distanceFactor={null} zIndexRange={[100, 0]}>
      <div style={{
        transform: 'translate(20px, -10px)',
        whiteSpace: 'nowrap',
        fontSize: 11, fontWeight: 700,
        letterSpacing: '0.16em', textTransform: 'uppercase',
        color: '#FFFFFF',
        fontFamily: 'var(--font-display)',
        textShadow: '0 0 8px rgba(0, 26, 16, 0.8), 0 0 4px rgba(0, 26, 16, 0.8)',
        pointerEvents: 'none', userSelect: 'none',
      }}>
        {text}
      </div>
    </Html>
  );
}

/* ============================================================
   Map model — visibility filtering + click pick on regions.
   Only runs effects on activeId changes; no per-frame work.
   ============================================================ */
function MapModel({ activeId, onPick, onBoundsReady, onTargetChange, onCentroids }) {
  const { scene } = useGLTF('/madagascar.glb');
  const { invalidate } = useThree();

  // Load marquee textures once. Each region picks one deterministically.
  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return REGION_IMAGES.map(url => {
      const t = loader.load(url, () => invalidate());
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    });
  }, [invalidate]);

  // Cached "image hover" materials per region_id
  const hoverMaterialCache = useRef({});
  const getHoverMaterial = useCallback((regionId) => {
    if (!hoverMaterialCache.current[regionId]) {
      // Hash region_id deterministically to pick an image
      let hash = 0;
      for (let i = 0; i < regionId.length; i++) hash = (hash * 31 + regionId.charCodeAt(i)) | 0;
      const idx = Math.abs(hash) % textures.length;
      hoverMaterialCache.current[regionId] = new THREE.MeshBasicMaterial({
        map: textures[idx],
        toneMapped: false,
        transparent: false,
        side: THREE.DoubleSide,
      });
    }
    return hoverMaterialCache.current[regionId];
  }, [textures]);

  useEffect(() => {
    if (!scene) return;
    const box = new THREE.Box3().setFromObject(scene);
    onBoundsReady(box);

    const regions = {};
    const districts = {};
    const regionMeshes = [];
    const districtMeshes = {};

    scene.traverse(o => {
      if (!o.isMesh) return;
      const k = o.userData?.kind;
      const rid = o.userData?.region_id;
      if (!rid) return;

      // Save original material on first traverse so we can revert after hover
      if (!o.userData._origMat) o.userData._origMat = o.material;

      const b = new THREE.Box3().setFromObject(o);
      const c = b.getCenter(new THREE.Vector3());
      c.y = b.max.y + 0.06;

      if (k === 'region') {
        regions[rid] = {
          name: o.userData?.region_label || rid,
          position: c.toArray(),
          mesh: o,
        };
        regionMeshes.push(o);
      } else if (k === 'district') {
        if (!districts[rid]) districts[rid] = [];
        if (!districtMeshes[rid]) districtMeshes[rid] = [];
        districts[rid].push({
          name: o.userData?.district_label || o.name,
          position: c.toArray(),
          mesh: o,
        });
        districtMeshes[rid].push(o);
      }
    });

    onCentroids({ regions, districts, regionMeshes, districtMeshes });
    invalidate();
  }, [scene, onBoundsReady, onCentroids, invalidate]);

  useEffect(() => {
    if (!scene) return;
    let target = null;
    scene.traverse(o => {
      if (!o.isMesh) return;
      const k = o.userData?.kind;
      const rid = o.userData?.region_id;

      // Always restore the original material when activeId changes (cleans up any hover state)
      if (o.userData._origMat && o.material !== o.userData._origMat) {
        o.material = o.userData._origMat;
      }

      if (!activeId) {
        o.visible = (k === 'region' || k === 'ground');
      } else {
        if (k === 'region' && rid === activeId) {
          o.visible = true;
          target = o;
        } else if (k === 'district' && rid === activeId) {
          o.visible = true;
        } else if (k === 'ground') {
          o.visible = true;
        } else {
          o.visible = false;
        }
      }
    });
    onTargetChange(target);
    invalidate();
  }, [scene, activeId, onTargetChange, invalidate]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    const rid = e.object.userData?.region_id;
    const kind = e.object.userData?.kind;
    if (rid && kind === 'region') onPick(rid);
  }, [onPick]);

  // Hover region → swap to image material. Pointer out → revert.
  // Only fires in default mode (no activeId) to avoid weird state when zoomed.
  const handlePointerOver = useCallback((e) => {
    if (activeId) return;
    e.stopPropagation();
    const obj = e.object;
    if (!obj.userData) return;
    const rid = obj.userData.region_id;
    const kind = obj.userData.kind;
    if (!rid || kind !== 'region') return;
    obj.material = getHoverMaterial(rid);
    document.body.style.cursor = 'pointer';
    invalidate();
  }, [activeId, getHoverMaterial, invalidate]);

  const handlePointerOut = useCallback((e) => {
    e.stopPropagation();
    const obj = e.object;
    if (!obj.userData) return;
    if (obj.userData._origMat) {
      obj.material = obj.userData._origMat;
    }
    document.body.style.cursor = '';
    invalidate();
  }, [invalidate]);

  return (
    <primitive
      object={scene}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
}

/* ============================================================
   Picked-district floating label — single drei <Html> instance.
   Only mounted when user clicks a district dot.
   ============================================================ */
function DistrictTooltip({ position, name, onClose }) {
  return (
    <Html position={position} center distanceFactor={null} zIndexRange={[200, 0]}>
      <div
        onClick={(e) => { e.stopPropagation(); onClose?.(); }}
        style={{
          transform: 'translate(-50%, -180%)',
          background: 'rgba(0, 24, 20, 0.92)',
          border: '1px solid rgba(77, 255, 145, 0.30)',
          padding: '8px 12px',
          borderRadius: 4,
          fontSize: 11, fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: '#FFFFFF',
          fontFamily: 'var(--font-display)',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          userSelect: 'none',
          pointerEvents: 'auto',
        }}
      >
        {name}
      </div>
    </Html>
  );
}

/* ============================================================
   Public component — drop-in for the carte 3D page
   ============================================================ */
export default function MadagascarMap3D({ activeId, onPick }) {
  const [bounds, setBounds] = useState(null);
  const [target, setTarget] = useState(null);
  const [centroids, setCentroids] = useState(null);
  const [pickedDistrict, setPickedDistrict] = useState(null);

  useEffect(() => {
    if (!activeId) setPickedDistrict(null);
  }, [activeId]);

  const regionsList = centroids ? Object.entries(centroids.regions) : [];
  const districtsForActive = activeId && centroids?.districts?.[activeId] ? centroids.districts[activeId] : [];
  const activeRegion = activeId && centroids?.regions?.[activeId] ? centroids.regions[activeId] : null;

  return (
    <Canvas
      dpr={1}
      camera={{ position: [0, 12, 4], fov: 28, near: 0.05, far: 200 }}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        alpha: true,
        stencil: false,
        depth: true,
      }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      onPointerMissed={() => { setPickedDistrict(null); onPick(null); }}
    >
      <ambientLight intensity={0.25} />

      <Suspense fallback={null}>
        <MapModel
          activeId={activeId}
          onPick={onPick}
          onBoundsReady={setBounds}
          onTargetChange={setTarget}
          onCentroids={setCentroids}
        />
      </Suspense>

      {/* Region edges — visible in default mode only */}
      {centroids && !activeId && (
        <EdgeLines meshes={centroids.regionMeshes} color="#4DFF91" opacity={0.32} thresholdAngle={1} />
      )}

      {/* District edges — visible only when zoomed */}
      {centroids && activeId && centroids.districtMeshes?.[activeId] && (
        <EdgeLines meshes={centroids.districtMeshes[activeId]} color="#4DFF91" opacity={0.55} thresholdAngle={1} />
      )}
      {centroids && activeId && centroids.regions?.[activeId] && (
        <EdgeLines meshes={[centroids.regions[activeId].mesh]} color="#7FB069" opacity={0.85} thresholdAngle={1} />
      )}

      {/* Region dots — default mode (the 22) */}
      {!activeId && regionsList.map(([rid, info], i) => (
        <BiolumDot
          key={rid}
          position={info.position}
          regionId={rid}
          label={info.name}
          isActiveSelection={false}
          delay={i * 0.087}
          kind="region"
          onPick={onPick}
        />
      ))}

      {/* District dots — zoomed mode */}
      {activeId && districtsForActive.map((d, i) => (
        <BiolumDot
          key={d.name}
          position={d.position}
          regionId={d.name}
          label={d.name}
          isActiveSelection={pickedDistrict === d.name}
          delay={i * 0.087}
          kind="district"
          onPick={() => setPickedDistrict(d.name === pickedDistrict ? null : d.name)}
        />
      ))}

      {/* Active region big label (when zoomed) */}
      {activeRegion && (
        <ActiveLabel position={activeRegion.position} text={activeRegion.name} />
      )}

      {/* Picked-district tooltip */}
      {pickedDistrict && districtsForActive.length > 0 && (() => {
        const d = districtsForActive.find(x => x.name === pickedDistrict);
        return d ? <DistrictTooltip position={d.position} name={d.name} onClose={() => setPickedDistrict(null)} /> : null;
      })()}

      <CameraRig targetMesh={target} modelBounds={bounds} />
    </Canvas>
  );
}

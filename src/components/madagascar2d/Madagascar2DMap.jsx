/**
 * Madagascar 2D SVG map — pure SVG, no three.js, fluid at 60 fps.
 *
 * Paths are pre-projected at build time by scripts/generate-madagascar-paths.mjs
 * from GADM 4.1 (22 regions, 110 districts).
 *
 * Interactions:
 *   - Hover a region   → outline + lift (no zoom)
 *   - Click a region   → smooth zoom into region; districts of that region
 *                        appear; other regions fade out
 *   - Click background → zoom out to overview
 *   - Click same region again → zoom out
 *
 * The zoom is implemented as a transform on a single <g> that wraps all
 * paths. Strokes use vectorEffect="non-scaling-stroke" so they stay 1 px
 * regardless of zoom level. Labels are rendered outside the zoom layer at
 * fixed font sizes; their positions are transformed manually.
 */
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import paths from '../../data/madagascarPaths.json';
import { colorForRegion } from '../../data/madagascarBiomes';

const STROKE_LIGHT = 'rgba(255, 255, 255, 0.55)';
const STROKE_DARK  = 'rgba(0, 36, 31, 0.85)';
const ACCENT       = '#4DFF91';

// How much of the canvas the active region should occupy at full zoom.
const ZOOM_FILL    = 0.78;
const ZOOM_MAX     = 6;
const ZOOM_DURATION = 0.7;   // seconds — statskog-style soft acceleration

export default function Madagascar2DMap({ activeId, hoveredId, onPick, onHover }) {
  const W = paths.width, H = paths.height;
  const regionEntries = useMemo(() => Object.entries(paths.regions), []);

  const districtsForActive = activeId && paths.districts[activeId] ? paths.districts[activeId] : [];
  const activeRegion = activeId ? paths.regions[activeId] : null;

  // ─── Zoom transform ────────────────────────────────────────────────────────
  const zoom = useMemo(() => {
    if (!activeRegion) return { x: 0, y: 0, scale: 1 };
    const [bx, by, bw, bh] = activeRegion.bbox;
    const scale = Math.min(ZOOM_MAX, Math.min((W * ZOOM_FILL) / bw, (H * ZOOM_FILL) / bh));
    const cx = bx + bw / 2;
    const cy = by + bh / 2;
    return {
      x: W / 2 - scale * cx,
      y: H / 2 - scale * cy,
      scale,
    };
  }, [activeRegion, W, H]);

  // Apply zoom transform to a screen coord (used for fixed-size labels).
  const project = (x, y) => [zoom.x + zoom.scale * x, zoom.y + zoom.scale * y];

  return (
    <svg
      viewBox={paths.viewBox}
      preserveAspectRatio="xMidYMid meet"
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        background: 'transparent',
        filter: 'drop-shadow(0 12px 32px rgba(77, 255, 145, 0.08))',
      }}
    >
      {/* Click-catcher: zooms back out when the user clicks empty canvas. */}
      <rect
        x={0} y={0} width={W} height={H}
        fill="transparent"
        onClick={() => activeId && onPick?.(null)}
        style={{ cursor: activeId ? 'zoom-out' : 'default' }}
      />

      {/* ─── Zoomable layer ─────────────────────────────────────────────────
          We use a plain <g> with CSS `transform` + `transition`, NOT
          framer-motion's <motion.g animate={{x,y,scale}}>. The motion variant
          renders correctly in some setups but in others (Firefox, certain
          framer-motion versions) the transform stays unset on the SVG <g>,
          so child paths render at their original location while everything
          else (fixed-size labels we project manually) appears at the zoomed
          position — exactly the bug we hit. Plain CSS works in every modern
          browser. */}
      <g
        style={{
          transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
          transformBox: 'view-box',
          transformOrigin: '0 0',
          transition: `transform ${ZOOM_DURATION}s cubic-bezier(0.32, 0.72, 0, 1)`,
        }}
      >
        {/* Regions — rendered without an SVG filter wrapper. SVG <filter>
            elements have their region computed in user-space and clip the
            output when the parent <g> is heavily transformed (scale > 2),
            which made the active region's polygon disappear during zoom.
            The global drop-shadow on the outer <svg> already provides depth. */}
        {regionEntries.map(([slug, region]) => {
          const isActive = slug === activeId;
          const isHovered = slug === hoveredId;
          const isHidden = activeId && !isActive;

          return (
            <motion.path
              key={slug}
              d={region.d}
              role="button"
              aria-label={region.name}
              tabIndex={0}
              fill={colorForRegion(slug)}
              stroke={isActive ? ACCENT : STROKE_DARK}
              strokeWidth={isActive ? 2 : isHovered ? 1.6 : 0.8}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              animate={{
                opacity: isHidden ? 0 : 1,
                // Hover lift only applies in overview (no active region) —
                // and only via SVG transform attr (avoid mixing CSS transform
                // box with the parent g's transform, which can desync).
              }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              style={{
                cursor: 'pointer',
                outline: 'none',
                pointerEvents: isHidden ? 'none' : 'auto',
                // Hover translate via CSS transform on the path itself.
                // The parent <g> applies the zoom via CSS transform; this
                // hover translate composes with it without conflict.
                transform: !activeId && isHovered ? 'translateY(-3px)' : 'translateY(0)',
                transition: 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onPick?.(isActive ? null : slug);
              }}
              onPointerEnter={() => onHover?.(slug)}
              onPointerLeave={() => onHover?.(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPick?.(isActive ? null : slug);
                }
                if (e.key === 'Escape' && isActive) {
                  e.preventDefault();
                  onPick?.(null);
                }
              }}
            />
          );
        })}

        {/* Districts of the active region */}
        <AnimatePresence>
          {activeId && districtsForActive.length > 0 && (
            <motion.g
              key={`districts-${activeId}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, delay: 0.18 }}
            >
              {districtsForActive.map((d) => (
                <path
                  key={d.slug}
                  d={d.d}
                  fill="rgba(255, 255, 255, 0.06)"
                  stroke={STROKE_LIGHT}
                  strokeWidth={0.6}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: 'none' }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>
      </g>

      {/* ─── Fixed-size overlay (labels) ─ rendered outside zoom layer ─── */}
      <AnimatePresence>
        {activeId && districtsForActive.length > 0 && districtsForActive.length <= 14 &&
          districtsForActive.map((d) => {
            const [px, py] = project(d.centroid[0], d.centroid[1]);
            return (
              <motion.text
                key={`lbl-${d.slug}`}
                x={px}
                y={py}
                textAnchor="middle"
                dominantBaseline="middle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.35 }}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  fill: 'rgba(255, 255, 255, 0.92)',
                  pointerEvents: 'none',
                  paintOrder: 'stroke',
                  stroke: 'rgba(0, 36, 31, 0.85)',
                  strokeWidth: 3,
                  strokeLinejoin: 'round',
                  fontFamily: 'var(--font-display, system-ui)',
                  letterSpacing: '0.02em',
                }}
              >
                {d.name}
              </motion.text>
            );
          })
        }
      </AnimatePresence>

      {/* Active region big label — appears in overview only (when zoomed,
          the right-side stats panel already shows the region name). */}
      {!activeId && hoveredId && paths.regions[hoveredId] && (
        <motion.text
          key={`hover-${hoveredId}`}
          x={paths.regions[hoveredId].centroid[0]}
          y={paths.regions[hoveredId].centroid[1]}
          textAnchor="middle"
          dominantBaseline="middle"
          initial={{ opacity: 0, y: paths.regions[hoveredId].centroid[1] + 4 }}
          animate={{ opacity: 1, y: paths.regions[hoveredId].centroid[1] }}
          transition={{ duration: 0.18 }}
          style={{
            fontSize: 16,
            fontWeight: 700,
            fill: '#FFFFFF',
            pointerEvents: 'none',
            paintOrder: 'stroke',
            stroke: 'rgba(0, 36, 31, 0.85)',
            strokeWidth: 4,
            strokeLinejoin: 'round',
            fontFamily: 'var(--font-display, system-ui)',
            letterSpacing: '-0.01em',
          }}
        >
          {paths.regions[hoveredId].name}
        </motion.text>
      )}
    </svg>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Users, Leaf, BookOpen, TrendingUp, TrendingDown, Activity, Globe } from 'lucide-react';

const sidebarVariants = {
  hidden:  { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 280, damping: 28 } },
  exit:    { x: '100%', opacity: 0, transition: { type: 'spring', stiffness: 380, damping: 38 } },
};

const blockVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, type: 'spring', stiffness: 260, damping: 22 } }),
};

const glass = (extra = {}) => ({
  background: 'rgba(0, 31, 25, 0.88)',
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  border: '1px solid rgba(77, 255, 145, 0.10)',
  borderRadius: 14,
  ...extra,
});

const BIOME_LABELS = {
  tropical: 'Tropical',
  rainforest: 'Forêt pluviale',
  highland: 'Hauts Plateaux',
  savanna: 'Savane',
  spiny: 'Forêt épineuse',
  mangrove: 'Mangrove',
  transition: 'Transition',
  dry: 'Aride',
};

const CLIMATE_LABELS = {
  wet: 'Humide',
  humid: 'Semi-humide',
  highland: 'Altitude',
  dry: 'Sec',
  arid: 'Aride',
};

export function RegionSidebar({ node, onClose }) {
  const accent = node.accent ?? '#4DFF91';
  const cropList = node.crops ? node.crops.split(' · ') : [];
  const sparkMax = Math.max(...(node.sparkline || [1]));
  const sparkLast = node.sparkline ? node.sparkline[node.sparkline.length - 1] : 0;

  return (
    <motion.div
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 380,
        height: '100%',
        zIndex: 20,
        padding: '12px 12px 12px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        overflowY: 'auto',
        pointerEvents: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {/* Header */}
      <motion.div
        custom={0} variants={blockVariants} initial="hidden" animate="visible"
        style={{ ...glass({ borderLeft: `3px solid ${accent}` }), padding: '16px 18px' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
              RÉGION · MADAGASCAR
            </span>
            <h3 style={{ fontSize: 21, fontWeight: 800, color: '#fff', margin: '3px 0 0', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {node.label}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
              <MapPin size={9} style={{ color: accent, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{node.capital}</span>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>·</span>
              <Globe size={9} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{node.surface}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 10, flexShrink: 0,
              background: 'rgba(0, 49, 42, 0.60)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
              marginLeft: 8,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 61, 51, 0.80)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          >
            <X size={12} />
          </button>
        </div>
      </motion.div>

      {/* 2-col stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {/* Population */}
        <motion.div custom={1} variants={blockVariants} initial="hidden" animate="visible"
          style={{ ...glass(), padding: '14px 15px' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 7 }}>
            <Users size={9} /> Population
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{node.pop}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
            {node.positive
              ? <TrendingUp  size={10} style={{ color: '#4DFF91' }} />
              : <TrendingDown size={10} style={{ color: '#ef4444' }} />}
            <span style={{ fontSize: 12, fontWeight: 700, color: node.positive ? '#22c55e' : '#ef4444' }}>
              {node.growth}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>/an</span>
          </div>
        </motion.div>

        {/* PIB */}
        <motion.div custom={2} variants={blockVariants} initial="hidden" animate="visible"
          style={{ ...glass(), padding: '14px 15px' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 7 }}>
            <Activity size={9} /> PIB estimé
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: accent, lineHeight: 1.2 }}>{node.gdp}</div>
          <div style={{ marginTop: 8, height: 3, background: 'rgba(77, 255, 145, 0.08)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: `linear-gradient(90deg,${accent},${accent}55)`,
              width: `${(sparkLast / sparkMax) * 100}%`,
              transition: 'width 0.8s ease',
            }} />
          </div>
        </motion.div>
      </div>

      {/* Sparkline tendance */}
      {node.sparkline && (
        <motion.div custom={3} variants={blockVariants} initial="hidden" animate="visible"
          style={{ ...glass(), padding: '13px 15px' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>
            Tendance économique 7 ans
          </div>
          <svg viewBox="0 0 300 48" style={{ width: '100%', height: 48 }}>
            <defs>
              <linearGradient id={`sg-${node.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
                <stop offset="100%" stopColor={accent} stopOpacity="0" />
              </linearGradient>
            </defs>
            {(() => {
              const W = 300, H = 44, data = node.sparkline;
              const min = Math.min(...data), max = Math.max(...data);
              const range = max - min || 1;
              const pts = data.map((v, i) => {
                const x = (i / (data.length - 1)) * W;
                const y = H - ((v - min) / range) * (H - 6) - 3;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              }).join(' ');
              const [fx] = pts.split(' ')[0].split(',');
              const [lx] = pts.split(' ').slice(-1)[0].split(',');
              return (
                <>
                  <polygon points={`${fx},${H} ${pts} ${lx},${H}`} fill={`url(#sg-${node.id})`} />
                  <polyline points={pts} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  {data.map((v, i) => {
                    const x = (i / (data.length - 1)) * W;
                    const y = H - ((v - min) / range) * (H - 6) - 3;
                    return <circle key={i} cx={x} cy={y} r="2.5" fill={accent} opacity={i === data.length - 1 ? 1 : 0.4} />;
                  })}
                </>
              );
            })()}
          </svg>
        </motion.div>
      )}

      {/* Cultures */}
      <motion.div custom={4} variants={blockVariants} initial="hidden" animate="visible"
        style={{ ...glass(), padding: '13px 15px' }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <Leaf size={9} /> Cultures principales
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {cropList.map(c => (
            <span key={c} style={{
              fontSize: 11, fontWeight: 600, color: accent,
              background: `${accent}15`,
              border: `1px solid ${accent}30`,
              padding: '4px 10px', borderRadius: 99,
            }}>{c}</span>
          ))}
        </div>
      </motion.div>

      {/* Territoire */}
      <motion.div custom={5} variants={blockVariants} initial="hidden" animate="visible"
        style={{ ...glass(), padding: '13px 15px' }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 10 }}>
          Territoire
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { label: 'Superficie', value: node.surface },
            { label: 'Biome',      value: BIOME_LABELS[node.biome]   ?? node.biome   ?? '—' },
            { label: 'Climat',     value: CLIMATE_LABELS[node.climate] ?? node.climate ?? '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>{value}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Obsidian-style note */}
      <motion.div custom={6} variants={blockVariants} initial="hidden" animate="visible"
        style={{ ...glass({ flexShrink: 0 }), padding: '13px 15px', marginBottom: 4 }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <BookOpen size={9} /> Note d'analyse
        </div>
        <div style={{ fontSize: 10, color: '#4DFF91', marginBottom: 6, opacity: 0.65, fontFamily: 'monospace' }}>
          [[{node.label}]] · analyse régionale
        </div>
        <div style={{
          fontSize: 12, color: 'rgba(255,255,255,0.68)', lineHeight: 1.8,
          borderLeft: `2px solid ${accent}40`, paddingLeft: 10,
        }}>
          {node.note}
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['Madagascar', BIOME_LABELS[node.biome] ?? node.biome, '2026'].filter(Boolean).map(t => (
            <span key={t} style={{
              fontSize: 9, color: 'rgba(255,255,255,0.28)',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '2px 8px', borderRadius: 99,
            }}>{t}</span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

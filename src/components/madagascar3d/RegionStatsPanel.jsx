/**
 * RegionStatsPanel — Premium glass card (21st.dev-inspired)
 * — Liquid glass backdrop with SVG distortion filter
 * — Region image hero with parallax zoom on hover
 * — Animated metric cards with shimmer borders
 * — Themed color accent per region
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Users, Sprout, BarChart3, TrendingUp, ArrowUpRight, Leaf, Shield } from 'lucide-react';
import { REGION_IMAGES } from './regionData';

// ─────────────────────────────────────────────────────────────────────────────
// Animated number counter
// ─────────────────────────────────────────────────────────────────────────────
function useCounter(to, duration = 1100) {
  const [val, setVal] = useState(0);
  const raf = useRef();
  useEffect(() => {
    const start = performance.now();
    const step = (t) => {
      const p = Math.min((t - start) / duration, 1);
      // easeOutExpo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setVal(Math.round(to * eased));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [to, duration]);
  return val;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main panel
// ─────────────────────────────────────────────────────────────────────────────
export function RegionStatsPanel({ region, info, stats, onClose }) {
  const imageUrl   = REGION_IMAGES[region] ?? 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80';
  const theme      = THEMES[region] ?? THEMES.default;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={region}
        initial={{ x: 440, opacity: 0, scale: 0.95 }}
        animate={{ x: 0,   opacity: 1, scale: 1 }}
        exit={{ x: 440,    opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 28, stiffness: 220, mass: 0.75 }}
        style={{
          position: 'absolute', top: 22, right: 22,
          width: 360, maxHeight: 'calc(100vh - 44px)',
          borderRadius: 22, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Inter','SF Pro Display',system-ui,sans-serif",
          zIndex: 20,
          boxShadow: `
            0 28px 90px rgba(0,0,0,0.7),
            0 0 60px -18px ${theme.glow},
            inset 0 1px 0 rgba(255,255,255,0.08)
          `,
          border: `1px solid ${theme.border}`,
          background: 'rgba(6,11,24,0.25)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        }}
      >
        {/* ── Gradient glow border (top edge) ──────────────────── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
          zIndex: 3,
        }} />

        {/* ═════ HERO IMAGE ══════════════════════════════════════ */}
        <HeroImage region={region} info={info} imageUrl={imageUrl} theme={theme} onClose={onClose} />

        {/* ═════ BODY STATS ═════════════════════════════════════ */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '18px 18px 22px',
          background: 'linear-gradient(180deg, rgba(6,11,24,0.85) 0%, rgba(3,7,16,0.96) 100%)',
          position: 'relative',
        }}>
          {/* Decorative grid pattern */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              linear-gradient(${theme.accent}08 1px, transparent 1px),
              linear-gradient(90deg, ${theme.accent}08 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
            maskImage: 'linear-gradient(180deg, #000 0%, transparent 70%)',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* ── Section : Géographie ─────────────────────── */}
            {info && (
              <Section title="Géographie" accent={theme.accent} icon={<MapPin size={11} />}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                  <MetricTile
                    label="SUPERFICIE"
                    value={info.area}
                    suffix=" km²"
                    accent={theme.accent}
                    icon={<BarChart3 size={13} />}
                    delay={0.05}
                  />
                  <MetricTile
                    label="POPULATION"
                    value={info.population}
                    format={formatPop}
                    accent="#f97316"
                    icon={<Users size={13} />}
                    delay={0.1}
                  />
                </div>
              </Section>
            )}

            {/* ── Section : Agriculture ────────────────────── */}
            {stats && (
              <Section title="Agriculture" accent="#10b981" icon={<Sprout size={11} />}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                  <MetricTile
                    label="RENDEMENT RIZ"
                    value={stats.rendement_riz}
                    suffix=" q/ha"
                    accent="#10b981"
                    icon={<Sprout size={13} />}
                    delay={0.15}
                  />
                  <MetricTile
                    label="PRODUCTION"
                    value={stats.production / 1000}
                    format={v => v.toFixed(0)}
                    suffix="k T"
                    accent="#facc15"
                    icon={<TrendingUp size={13} />}
                    delay={0.2}
                  />
                  <MetricTile
                    label="SURFACE CULT."
                    value={stats.surface_cultivee / 1000}
                    format={v => v.toFixed(0)}
                    suffix="k ha"
                    accent="#a78bfa"
                    icon={<Leaf size={13} />}
                    delay={0.25}
                  />
                  <SecurityTile score={stats.score_securite} delay={0.3} />
                </div>
              </Section>
            )}

            {/* ── CTA ──────────────────────────────────────── */}
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              style={{
                width: '100%', marginTop: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: `linear-gradient(135deg, ${theme.accent}1a 0%, ${theme.accent}08 100%)`,
                border: `1px solid ${theme.accent}35`,
                borderRadius: 12,
                padding: '13px 16px',
                color: '#fff', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.25s',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `linear-gradient(135deg, ${theme.accent}30 0%, ${theme.accent}15 100%)`;
                e.currentTarget.style.borderColor = theme.accent + '70';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = `linear-gradient(135deg, ${theme.accent}1a 0%, ${theme.accent}08 100%)`;
                e.currentTarget.style.borderColor = theme.accent + '35';
              }}
            >
              <span>Explorer les districts</span>
              <ArrowUpRight size={15} />
              {/* Shimmer effect */}
              <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(90deg, transparent, ${theme.accent}20, transparent)`,
                transform: 'translateX(-100%)',
                animation: 'shimmer 3s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
            </motion.button>
          </div>
        </div>

        {/* Keyframes */}
        <style>{`
          @keyframes shimmer {
            0%, 100% { transform: translateX(-100%); }
            50% { transform: translateX(100%); }
          }
          @keyframes pulseRing {
            0% { transform: scale(0.8); opacity: 0.8; }
            100% { transform: scale(1.8); opacity: 0; }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO IMAGE (parallax zoom sur hover)
// ─────────────────────────────────────────────────────────────────────────────
function HeroImage({ region, info, imageUrl, theme, onClose }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', height: 210, flexShrink: 0, overflow: 'hidden' }}
    >
      {/* Image */}
      <motion.div
        animate={{ scale: hovered ? 1.08 : 1.0 }}
        transition={{ duration: 0.7, ease: [0.175, 0.885, 0.32, 1.15] }}
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}
      />

      {/* Grain overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage:
          'url("data:image/svg+xml;utf8,<svg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\'/></filter><rect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.18\'/></svg>")',
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }} />

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          linear-gradient(180deg,
            ${theme.accent}22 0%,
            rgba(6,11,24,0.25) 30%,
            rgba(3,7,16,0.75) 70%,
            rgba(3,7,16,0.98) 100%)
        `,
      }} />

      {/* Accent corner glow */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 180, height: 180, borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.accent}35 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Close button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={onClose}
        style={{
          position: 'absolute', top: 14, right: 14,
          width: 34, height: 34, borderRadius: '50%',
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.18)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#fff',
          transition: 'background 0.2s',
          zIndex: 2,
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.55)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
      >
        <X size={15} />
      </motion.button>

      {/* Location badge */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        style={{
          position: 'absolute', top: 14, left: 14,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 99,
          background: `${theme.accent}1f`,
          border: `1px solid ${theme.accent}45`,
          backdropFilter: 'blur(8px)',
          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em',
          color: theme.accent,
          textTransform: 'uppercase',
        }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: theme.accent,
          animation: 'pulseRing 1.5s ease-out infinite',
        }} />
        Région {theme.zone}
      </motion.div>

      {/* Title bloc */}
      <div style={{
        position: 'absolute', bottom: 16, left: 18, right: 56,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          style={{
            fontSize: 25, fontWeight: 800, color: '#fff',
            letterSpacing: '-0.025em', lineHeight: 1.05,
            textShadow: '0 2px 14px rgba(0,0,0,0.6)',
          }}>
          {region}
        </motion.div>
        {info && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, color: 'rgba(255,255,255,0.72)',
              marginTop: 5, fontWeight: 500, letterSpacing: '0.03em',
            }}>
            <MapPin size={11} strokeWidth={2.2} />
            {info.capital}
            <span style={{ opacity: 0.4, margin: '0 2px' }}>·</span>
            <span style={{ opacity: 0.7 }}>🇲🇬</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
function Section({ title, accent, icon, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.16em', color: accent,
        marginBottom: 10, opacity: 0.9,
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${accent}18`, border: `1px solid ${accent}30`,
        }}>
          {icon}
        </span>
        {title}
        <div style={{
          flex: 1, height: 1,
          background: `linear-gradient(90deg, ${accent}30, transparent)`,
          marginLeft: 4,
        }} />
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// METRIC TILE
// ─────────────────────────────────────────────────────────────────────────────
function MetricTile({ label, value, suffix = '', format, accent, icon, delay = 0 }) {
  const counted = useCounter(typeof value === 'number' ? value : 0);
  const display = format ? format(counted) : counted.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -2, scale: 1.02 }}
      style={{
        padding: '11px 13px',
        background: `linear-gradient(135deg, ${accent}0c 0%, ${accent}03 100%)`,
        border: `1px solid ${accent}26`,
        borderLeft: `2.5px solid ${accent}`,
        borderRadius: 10,
        cursor: 'default',
        position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        color: accent, marginBottom: 5, opacity: 0.85,
      }}>
        {icon}
        <span style={{ fontSize: 9, letterSpacing: '0.12em', fontWeight: 700 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
        {display}{suffix}
      </div>

      {/* Corner glint */}
      <div style={{
        position: 'absolute', top: -10, right: -10,
        width: 40, height: 40, borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}25 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY TILE (progress bar)
// ─────────────────────────────────────────────────────────────────────────────
function SecurityTile({ score, delay = 0 }) {
  const counted = useCounter(score);
  const color   = score > 70 ? '#22c55e' : score > 50 ? '#f59e0b' : '#ef4444';
  const label   = score > 70 ? 'Bon' : score > 50 ? 'Moyen' : 'Faible';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -2, scale: 1.02 }}
      style={{
        padding: '11px 13px',
        background: `linear-gradient(135deg, ${color}0c 0%, ${color}03 100%)`,
        border: `1px solid ${color}26`,
        borderLeft: `2.5px solid ${color}`,
        borderRadius: 10,
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color, marginBottom: 5, opacity: 0.85 }}>
        <Shield size={13} />
        <span style={{ fontSize: 9, letterSpacing: '0.12em', fontWeight: 700 }}>SÉCURITÉ</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{counted}</span>
        <span style={{ fontSize: 10, color, fontWeight: 600, letterSpacing: '0.04em' }}>{label}</span>
      </div>
      {/* Progress bar */}
      <div style={{ position: 'relative', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ delay: delay + 0.3, duration: 0.9, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            borderRadius: 99,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
function formatPop(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// THEMES per region (zone + accent couleur + glow)
// ─────────────────────────────────────────────────────────────────────────────
const THEMES = {
  // Côte Est — vert tropical
  'Atsinanana':          { accent: '#10b981', glow: 'rgba(16,185,129,0.45)',  border: 'rgba(16,185,129,0.25)',  zone: 'Côte Est' },
  'Analanjirofo':        { accent: '#14b8a6', glow: 'rgba(20,184,166,0.45)',  border: 'rgba(20,184,166,0.25)',  zone: 'Côte Est' },
  'Atsimo-Atsinanana':   { accent: '#059669', glow: 'rgba(5,150,105,0.45)',   border: 'rgba(5,150,105,0.25)',   zone: 'Côte Est' },
  'Vatovavy-Fitovinany': { accent: '#22c55e', glow: 'rgba(34,197,94,0.45)',   border: 'rgba(34,197,94,0.25)',   zone: 'Côte Est' },

  // Nord — bleu tropical
  'Diana':               { accent: '#06b6d4', glow: 'rgba(6,182,212,0.45)',   border: 'rgba(6,182,212,0.25)',   zone: 'Nord' },
  'Sava':                { accent: '#0ea5e9', glow: 'rgba(14,165,233,0.45)',  border: 'rgba(14,165,233,0.25)',  zone: 'Nord' },

  // Hauts Plateaux — vert olive
  'Analamanga':          { accent: '#84cc16', glow: 'rgba(132,204,22,0.45)',  border: 'rgba(132,204,22,0.25)',  zone: 'Hauts Plateaux' },
  'Vakinankaratra':      { accent: '#a3e635', glow: 'rgba(163,230,53,0.45)',  border: 'rgba(163,230,53,0.25)',  zone: 'Hauts Plateaux' },
  "Amoron'i Mania":      { accent: '#65a30d', glow: 'rgba(101,163,13,0.45)',  border: 'rgba(101,163,13,0.25)',  zone: 'Hauts Plateaux' },
  'Itasy':               { accent: '#bef264', glow: 'rgba(190,242,100,0.4)',  border: 'rgba(190,242,100,0.25)', zone: 'Hauts Plateaux' },
  'Bongolava':           { accent: '#4ade80', glow: 'rgba(74,222,128,0.4)',   border: 'rgba(74,222,128,0.25)',  zone: 'Hauts Plateaux' },
  'Matsiatra Ambony':    { accent: '#86efac', glow: 'rgba(134,239,172,0.4)',  border: 'rgba(134,239,172,0.25)', zone: 'Hauts Plateaux' },
  'Alaotra-Mangoro':     { accent: '#34d399', glow: 'rgba(52,211,153,0.4)',   border: 'rgba(52,211,153,0.25)',  zone: 'Hauts Plateaux' },
  'Ihorombe':            { accent: '#d4d4aa', glow: 'rgba(212,212,170,0.35)', border: 'rgba(212,212,170,0.2)',  zone: 'Hauts Plateaux' },

  // Côte Ouest — ochre
  'Boeny':               { accent: '#f59e0b', glow: 'rgba(245,158,11,0.45)',  border: 'rgba(245,158,11,0.25)',  zone: 'Côte Ouest' },
  'Sofia':               { accent: '#d97706', glow: 'rgba(217,119,6,0.45)',   border: 'rgba(217,119,6,0.25)',   zone: 'Côte Ouest' },
  'Melaky':              { accent: '#ea580c', glow: 'rgba(234,88,12,0.45)',   border: 'rgba(234,88,12,0.25)',   zone: 'Côte Ouest' },
  'Menabe':              { accent: '#f97316', glow: 'rgba(249,115,22,0.45)',  border: 'rgba(249,115,22,0.25)',  zone: 'Côte Ouest' },
  'Betsiboka':           { accent: '#eab308', glow: 'rgba(234,179,8,0.45)',   border: 'rgba(234,179,8,0.25)',   zone: 'Côte Ouest' },

  // Sud — désert rouge
  'Atsimo-Andrefana':    { accent: '#ef4444', glow: 'rgba(239,68,68,0.45)',   border: 'rgba(239,68,68,0.25)',   zone: 'Sud Aride' },
  'Androy':              { accent: '#dc2626', glow: 'rgba(220,38,38,0.45)',   border: 'rgba(220,38,38,0.25)',   zone: 'Sud Aride' },
  'Anosy':               { accent: '#e11d48', glow: 'rgba(225,29,72,0.45)',   border: 'rgba(225,29,72,0.25)',   zone: 'Sud Aride' },

  default: { accent: '#4DFF91', glow: 'rgba(34,211,238,0.45)', border: 'rgba(34,211,238,0.25)', zone: 'Madagascar' },
};

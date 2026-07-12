import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sprout, TrendingUp, MapPin, BarChart3, Zap } from 'lucide-react';
import { FluidBackground } from '../ui/FluidBackground';
import { REGION_INFO, REGION_STATS } from '../madagascar3d/regionData';

// ── Types ──────────────────────────────────────────────────────────────────────
type Culture = {
  id: string;
  label: string;
  emoji: string;
  color: string;
};

type Saison = { id: string; label: string };

// ── Data ──────────────────────────────────────────────────────────────────────
const CULTURES: Culture[] = [
  { id: 'riz',         label: 'Riz',           emoji: '🌾', color: '#10b981' },
  { id: 'mais',        label: 'Maïs',          emoji: '🌽', color: '#f59e0b' },
  { id: 'manioc',      label: 'Manioc',        emoji: '🥔', color: '#a78bfa' },
  { id: 'patate',      label: 'Patate douce',  emoji: '🍠', color: '#f97316' },
  { id: 'haricot',     label: 'Haricot',       emoji: '🫘', color: '#4DFF91' },
  { id: 'canne',       label: 'Canne à sucre', emoji: '🎋', color: '#84cc16' },
  { id: 'vanille',     label: 'Vanille',       emoji: '🌿', color: '#ec4899' },
  { id: 'cafe',        label: 'Café',          emoji: '☕', color: '#92400e' },
  { id: 'girofle',     label: 'Girofle',       emoji: '🌺', color: '#be185d' },
  { id: 'litchi',      label: 'Litchi',        emoji: '🍒', color: '#ef4444' },
];

const SAISONS: Saison[] = [
  { id: 'saison_pluie',  label: 'Rainy season (Nov–Apr)' },
  { id: 'saison_seche',  label: 'Dry season (May–Oct)' },
  { id: 'contre_saison', label: 'Off-season' },
];

const REGIONS = Object.keys(REGION_INFO).sort();

// ── Chip spring config ─────────────────────────────────────────────────────────
const spring = { type: 'spring', stiffness: 480, damping: 28, mass: 0.45 };

// ── CultureChip ────────────────────────────────────────────────────────────────
function CultureChip({
  culture,
  selected,
  onToggle,
}: {
  culture: Culture;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      onClick={onToggle}
      layout
      initial={false}
      animate={{ backgroundColor: selected ? `${culture.color}22` : 'rgba(255,255,255,0.04)' }}
      whileHover={{ backgroundColor: selected ? `${culture.color}30` : 'rgba(255,255,255,0.08)' }}
      whileTap={{ scale: 0.96 }}
      transition={{ ...spring, backgroundColor: { duration: 0.1 } }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ring-1 ring-inset"
      style={{
        color: selected ? culture.color : '#94a3b8',
        ringColor: selected ? `${culture.color}40` : 'rgba(255,255,255,0.08)',
        outline: 'none',
        border: `1px solid ${selected ? culture.color + '50' : 'rgba(255,255,255,0.08)'}`,
        fontFamily: 'system-ui',
        cursor: 'pointer',
      }}
    >
      <motion.span
        animate={{ width: selected ? 'auto' : '100%', paddingRight: selected ? '1.25rem' : '0' }}
        transition={{ ease: [0.175, 0.885, 0.32, 1.275], duration: 0.28 }}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <span>{culture.emoji}</span>
        <span>{culture.label}</span>
        <AnimatePresence>
          {selected && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={spring}
              style={{ position: 'absolute', right: 0 }}
            >
              <span style={{
                width: 16, height: 16, borderRadius: '50%',
                background: culture.color,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={10} color="#000" strokeWidth={2.5} />
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </motion.button>
  );
}

// ── RegionChip ─────────────────────────────────────────────────────────────────
function RegionChip({
  region,
  selected,
  onToggle,
}: {
  region: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      onClick={onToggle}
      layout
      initial={false}
      animate={{ backgroundColor: selected ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.04)' }}
      whileHover={{ backgroundColor: selected ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.08)' }}
      whileTap={{ scale: 0.96 }}
      transition={{ ...spring, backgroundColor: { duration: 0.1 } }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 999,
        fontSize: 12, fontWeight: 500,
        color: selected ? '#4DFF91' : 'rgba(255,255,255,0.40)',
        border: `1px solid ${selected ? 'rgba(34,211,238,0.35)' : 'rgba(255,255,255,0.06)'}`,
        cursor: 'pointer', fontFamily: 'system-ui',
        whiteSpace: 'nowrap',
        outline: 'none',
        position: 'relative',
      }}
    >
      <motion.span style={{ display: 'flex', alignItems: 'center', gap: 5, position: 'relative', paddingRight: selected ? '1.2rem' : '0' }}
        animate={{ paddingRight: selected ? '1.2rem' : '0' }}
        transition={{ ease: [0.175, 0.885, 0.32, 1.275], duration: 0.25 }}
      >
        <MapPin size={10} />
        {region}
        <AnimatePresence>
          {selected && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={spring}
              style={{ position: 'absolute', right: 0 }}
            >
              <span style={{
                width: 14, height: 14, borderRadius: '50%',
                background: '#4DFF91',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={9} color="#000" strokeWidth={2.5} />
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </motion.button>
  );
}

// ── Forecast result ─────────────────────────────────────────────────────────
function PrevisionResult({
  cultures,
  regions,
  saison,
}: {
  cultures: string[];
  regions: string[];
  saison: string;
}) {
  // Mock: average yield of selected regions
  const avgRendement = regions.length > 0
    ? Math.round(regions.reduce((sum, r) => sum + (REGION_STATS[r]?.rendement_riz ?? 60), 0) / regions.length)
    : 65;
  const avgScore = regions.length > 0
    ? Math.round(regions.reduce((sum, r) => sum + (REGION_STATS[r]?.score_securite ?? 60), 0) / regions.length)
    : 60;

  const scoreColor = avgScore > 70 ? '#22c55e' : avgScore > 50 ? '#f59e0b' : '#ef4444';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        background: 'rgba(6,11,24,0.85)',
        border: '1px solid rgba(34,211,238,0.25)',
        borderRadius: 16,
        padding: 24,
        backdropFilter: 'blur(16px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Zap size={16} color="#4DFF91" />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#4DFF91' }}>
          Forecast generated
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.40)',
          background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: 99,
        }}>
          {saison === 'saison_pluie' ? '🌧 Rainy season' : saison === 'saison_seche' ? '☀️ Dry season' : '🔄 Off-season'}
        </span>
      </div>

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <MetricBox
          label="Estimated yield"
          value={`${avgRendement} q/ha`}
          color="#10b981"
          icon={<TrendingUp size={14} />}
        />
        <MetricBox
          label="Security score"
          value={`${avgScore}/100`}
          color={scoreColor}
          icon={<BarChart3 size={14} />}
        />
        <MetricBox
          label="Regions analyzed"
          value={regions.length.toString()}
          color="#a78bfa"
          icon={<MapPin size={14} />}
        />
      </div>

      {/* Crop + region tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {cultures.map(c => {
          const cult = CULTURES.find(x => x.id === c);
          return (
            <span key={c} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 99,
              background: `${cult?.color ?? '#4DFF91'}18`,
              border: `1px solid ${cult?.color ?? '#4DFF91'}35`,
              color: cult?.color ?? '#4DFF91',
            }}>
              {cult?.emoji} {cult?.label}
            </span>
          );
        })}
        {regions.slice(0, 4).map(r => (
          <span key={r} style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 99,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8',
          }}>
            📍 {r}
          </span>
        ))}
        {regions.length > 4 && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', alignSelf: 'center' }}>
            +{regions.length - 4} regions
          </span>
        )}
      </div>

      <div style={{
        marginTop: 16, fontSize: 11, color: '#475569', lineHeight: 1.6,
        borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12,
      }}>
        ⚠️ Simulated data. Connect the ML model for real forecasts.
      </div>
    </motion.div>
  );
}

function MetricBox({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div style={{
      padding: '14px 14px',
      background: `${color}10`,
      border: `1px solid ${color}28`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color, opacity: 0.8, marginBottom: 6 }}>
        {icon}
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{value}</div>
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
export function PrevisionPage() {
  const [selectedCultures, setSelectedCultures] = useState<string[]>(['riz']);
  const [selectedRegions, setSelectedRegions]   = useState<string[]>([]);
  const [selectedSaison, setSelectedSaison]     = useState<string>('saison_pluie');
  const [showResult, setShowResult]             = useState(false);

  const toggleCulture = (id: string) => {
    setSelectedCultures(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
    setShowResult(false);
  };

  const toggleRegion = (r: string) => {
    setSelectedRegions(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    );
    setShowResult(false);
  };

  const canPredict = selectedCultures.length > 0 && selectedRegions.length > 0;

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'transparent', position: 'relative' }}>
      <FluidBackground />

      {/* Header */}
      <div style={{ padding: '32px 40px 0', position: 'relative', zIndex: 1 }}>
        <h2 style={{
          fontSize: 28, fontWeight: 700, color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)', letterSpacing: '-0.5px',
        }}>
          Agricultural forecasts
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>
          Select a crop and one or more regions to get a yield forecast.
        </p>
      </div>

      <div style={{ padding: '24px 40px 48px', position: 'relative', zIndex: 1, maxWidth: 860 }}>

        {/* ── Step 1: Crop ─────────────────────────────────────── */}
        <Section step={1} title="What crop are you planning?" icon={<Sprout size={16} />}>
          <motion.div
            layout
            className="flex flex-wrap gap-2"
            transition={spring}
          >
            {CULTURES.map(c => (
              <CultureChip
                key={c.id}
                culture={c}
                selected={selectedCultures.includes(c.id)}
                onToggle={() => toggleCulture(c.id)}
              />
            ))}
          </motion.div>
        </Section>

        {/* ── Step 2: Season ──────────────────────────────────────── */}
        <Section step={2} title="Which season?" icon={<TrendingUp size={16} />}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {SAISONS.map(s => (
              <motion.button
                key={s.id}
                onClick={() => { setSelectedSaison(s.id); setShowResult(false); }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'system-ui', outline: 'none',
                  background: selectedSaison === s.id ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selectedSaison === s.id ? 'rgba(34,211,238,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  color: selectedSaison === s.id ? '#4DFF91' : 'rgba(255,255,255,0.40)',
                  transition: 'all 0.15s',
                }}
              >
                {s.label}
              </motion.button>
            ))}
          </div>
        </Section>

        {/* ── Step 3: Regions ─────────────────────────────────────── */}
        <Section step={3} title="Which region(s)?" icon={<MapPin size={16} />}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)' }}>
              {selectedRegions.length === 0
                ? 'No selection'
                : `${selectedRegions.length} region${selectedRegions.length > 1 ? 's' : ''} selected`}
            </span>
            {selectedRegions.length > 0 && (
              <button
                onClick={() => setSelectedRegions([])}
                style={{
                  fontSize: 11, color: '#ef4444', background: 'none',
                  border: 'none', cursor: 'pointer', textDecoration: 'underline',
                  fontFamily: 'system-ui',
                }}
              >
                Clear all
              </button>
            )}
          </div>
          <motion.div
            layout
            style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}
            transition={spring}
          >
            {REGIONS.map(r => (
              <RegionChip
                key={r}
                region={r}
                selected={selectedRegions.includes(r)}
                onToggle={() => toggleRegion(r)}
              />
            ))}
          </motion.div>
        </Section>

        {/* ── Predict Button ────────────────────────────────────────── */}
        <motion.button
          onClick={() => canPredict && setShowResult(true)}
          whileHover={canPredict ? { scale: 1.02, boxShadow: '0 0 30px rgba(34,211,238,0.3)' } : {}}
          whileTap={canPredict ? { scale: 0.98 } : {}}
          style={{
            width: '100%', padding: '14px 24px',
            borderRadius: 12, fontSize: 15, fontWeight: 700,
            cursor: canPredict ? 'pointer' : 'not-allowed',
            fontFamily: 'system-ui', outline: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: canPredict
              ? 'linear-gradient(135deg, #4DFF91, #0ea5e9)'
              : 'rgba(255,255,255,0.05)',
            border: `1px solid ${canPredict ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
            color: canPredict ? '#000' : '#475569',
            transition: 'all 0.2s',
            marginBottom: 24,
            boxShadow: canPredict ? '0 4px 20px rgba(34,211,238,0.2)' : 'none',
          }}
        >
          <Zap size={16} />
          {canPredict ? 'Generate forecast' : 'Select a crop and a region'}
        </motion.button>

        {/* ── Result ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {showResult && canPredict && (
            <PrevisionResult
              cultures={selectedCultures}
              regions={selectedRegions}
              saison={selectedSaison}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({
  step,
  title,
  icon,
  children,
}: {
  step: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'rgba(34,211,238,0.15)',
          border: '1px solid rgba(34,211,238,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#4DFF91', flexShrink: 0,
        }}>
          {step}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ color: '#4DFF91' }}>{icon}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'system-ui' }}>
            {title}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

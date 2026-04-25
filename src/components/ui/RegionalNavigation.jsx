"use client";
import React, { useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MadagascarMap3D = lazy(() => import('../madagascar3d/MadagascarMap3D'));

/* ============================================================
   22 régions de Madagascar — statistiques + position approximative
   Coordonnées (x, y) sur viewBox 200×360 (carte stylisée)
   ============================================================ */
const REGIONS = [
  { id: 'diana',             name: 'Diana',             capital: 'Ambanja',         population: 890000,  superficie: 19256, densite: 46.2, productionRiz: 41000, productionManioc: 35000, productionMais: 16000, x: 112, y: 32  },
  { id: 'antsiranana',       name: 'Antsiranana',       capital: 'Antsiranana',     population: 720000,  superficie: 25526, densite: 28.2, productionRiz: 32000, productionManioc: 25000, productionMais: 12000, x: 132, y: 26  },
  { id: 'sava',              name: 'Sava',              capital: 'Sambava',         population: 1050000, superficie: 21539, densite: 48.8, productionRiz: 52000, productionManioc: 40000, productionMais: 22000, x: 148, y: 56  },
  { id: 'sofia',             name: 'Sofia',             capital: 'Antsohihy',       population: 1350000, superficie: 52320, densite: 25.8, productionRiz: 45000, productionManioc: 38000, productionMais: 18000, x: 102, y: 78  },
  { id: 'boeny',             name: 'Boeny',             capital: 'Mahajanga',       population: 860000,  superficie: 27899, densite: 30.8, productionRiz: 32000, productionManioc: 24000, productionMais: 13000, x: 76,  y: 92  },
  { id: 'analanjirofo',      name: 'Analanjirofo',      capital: 'Sambava',         population: 940000,  superficie: 21930, densite: 42.9, productionRiz: 45000, productionManioc: 38000, productionMais: 18000, x: 150, y: 100 },
  { id: 'betsiboka',         name: 'Betsiboka',         capital: 'Maevatanana',     population: 290000,  superficie: 31803, densite: 9.1,  productionRiz: 9500,  productionManioc: 7200,  productionMais: 3800,  x: 92,  y: 130 },
  { id: 'melaky',            name: 'Melaky',            capital: 'Maintirano',      population: 240000,  superficie: 37569, densite: 6.4,  productionRiz: 7500,  productionManioc: 5500,  productionMais: 2800,  x: 50,  y: 142 },
  { id: 'bongolava',         name: 'Bongolava',         capital: 'Tsiroanomandidy', population: 670000,  superficie: 16688, densite: 40.1, productionRiz: 28000, productionManioc: 22000, productionMais: 15000, x: 82,  y: 168 },
  { id: 'itasy',             name: 'Itasy',             capital: 'Arivonimamo',     population: 850000,  superficie: 14930, densite: 56.9, productionRiz: 38000, productionManioc: 28000, productionMais: 14000, x: 96,  y: 176 },
  { id: 'analamanga',        name: 'Analamanga',        capital: 'Antananarivo',    population: 3450000, superficie: 37775, densite: 91.3, productionRiz: 125000,productionManioc: 85000, productionMais: 42000, x: 108, y: 188 },
  { id: 'atsinanana',        name: 'Atsinanana',        capital: 'Toamasina',       population: 1480000, superficie: 21927, densite: 67.5, productionRiz: 78000, productionManioc: 52000, productionMais: 31000, x: 148, y: 178 },
  { id: 'menabe',            name: 'Menabe',            capital: 'Morondava',       population: 390000,  superficie: 46071, densite: 8.5,  productionRiz: 12000, productionManioc: 9500,  productionMais: 4500,  x: 60,  y: 220 },
  { id: 'vakinankaratra',    name: 'Vakinankaratra',    capital: 'Antsirabe',       population: 1960000, superficie: 21230, densite: 92.3, productionRiz: 92000, productionManioc: 65000, productionMais: 38000, x: 102, y: 218 },
  { id: 'amoron_i_onilahy',  name: "Amoron'i Onilahy",  capital: 'Ampanihy',        population: 670000,  superficie: 37519, densite: 17.9, productionRiz: 22000, productionManioc: 16500, productionMais: 8500,  x: 108, y: 244 },
  { id: 'matsiatra_ambony',  name: 'Matsiatra Ambony',  capital: 'Fianarantsoa',    population: 1360000, superficie: 35490, densite: 38.3, productionRiz: 58000, productionManioc: 42000, productionMais: 25000, x: 116, y: 264 },
  { id: 'ihorombe',          name: 'Ihorombe',          capital: 'Ihosy',           population: 310000,  superficie: 31380, densite: 9.9,  productionRiz: 12000, productionManioc: 8500,  productionMais: 5500,  x: 96,  y: 282 },
  { id: 'vatoavy',           name: 'Vatovavy-Fitovinany', capital: 'Farafangana',   population: 620000,  superficie: 34580, densite: 17.9, productionRiz: 25000, productionManioc: 18000, productionMais: 9500,  x: 134, y: 286 },
  { id: 'atsimo_andrefana',  name: 'Atsimo-Andrefana',  capital: 'Toliara',         population: 1150000, superficie: 66460, densite: 17.3, productionRiz: 35000, productionManioc: 28000, productionMais: 12000, x: 50,  y: 292 },
  { id: 'atsimo_atsinanana', name: 'Atsimo-Atsinanana', capital: 'Farafangana',     population: 1020000, superficie: 29857, densite: 34.2, productionRiz: 42000, productionManioc: 32000, productionMais: 16000, x: 132, y: 308 },
  { id: 'anosy',             name: 'Anosy',             capital: 'Fort Dauphin',    population: 570000,  superficie: 43591, densite: 13.1, productionRiz: 18000, productionManioc: 14000, productionMais: 7500,  x: 102, y: 336 },
  { id: 'androy',            name: 'Androy',            capital: 'Ambovombe',       population: 480000,  superficie: 30893, densite: 15.5, productionRiz: 15000, productionManioc: 12000, productionMais: 6500,  x: 78,  y: 346 },
];

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n);

/* ============================================================
   Region row — statskog year-selector pattern
   Active = grand & blanc, autres = petits & dim
   ============================================================ */
function RegionRow({ region, active, onClick, onHover, onLeave }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: active ? '10px 0' : '6px 0',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.32)',
        fontFamily: 'var(--font-display)',
        fontSize: active ? 28 : 14,
        fontWeight: active ? 700 : 400,
        letterSpacing: active ? '-0.02em' : '-0.005em',
        lineHeight: active ? 1 : 1.4,
        transition: 'color 0.18s ease, font-size 0.22s ease, padding 0.22s ease',
      }}
      onFocus={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
      onBlur={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.32)'; }}
    >
      {region.name}
    </button>
  );
}

/* ============================================================
   Hero stat — chiffre giant statskog
   ============================================================ */
function HeroStat({ label, value, suffix }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.42)',
        margin: 0, marginBottom: 6,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 'clamp(32px, 2.8vw, 44px)',
        fontWeight: 700, color: '#FFFFFF', margin: 0,
        lineHeight: 0.95, letterSpacing: '-0.04em',
        fontFamily: 'var(--font-display)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
        {suffix && (
          <span style={{
            fontSize: '0.45em', fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.42)',
            marginLeft: 8, letterSpacing: '0',
          }}>{suffix}</span>
        )}
      </p>
    </div>
  );
}

/* ============================================================
   Main layout — 3 colonnes statskog
   ============================================================ */
export default function RegionalNavigation({ onRegionChange }) {
  // selectedId = currently focused region (drives map zoom + right panel)
  // null = vue d'ensemble : carte montre les 22 régions
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  // Right panel falls back to Analamanga as featured when nothing selected
  const panelRegion = useMemo(
    () => REGIONS.find(r => r.id === (selectedId || 'analamanga')) || REGIONS[0],
    [selectedId]
  );

  const handlePick = useCallback((id) => {
    setSelectedId(id);
    onRegionChange?.(id);
  }, [onRegionChange]);

  return (
    <div style={{
      display: 'flex', height: '100%', width: '100%',
      background: 'var(--bg-deep)', overflow: 'hidden',
    }}>

      {/* ──────────── LEFT: region list (statskog year selector) ──────────── */}
      <aside style={{
        width: 220, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        padding: '32px 0 32px 56px',
      }}>
        <p style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.42)',
          margin: 0, marginBottom: 24,
        }}>
          Carte 3D · Régions
        </p>

        <div style={{
          flex: 1, overflowY: 'auto',
          maskImage: 'linear-gradient(to bottom, transparent 0, #000 32px, #000 calc(100% - 48px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 32px, #000 calc(100% - 48px), transparent 100%)',
          paddingRight: 24,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            {REGIONS.map(r => (
              <RegionRow
                key={r.id}
                region={r}
                active={r.id === selectedId}
                onClick={() => handlePick(r.id)}
                onHover={() => setHoveredId(r.id)}
                onLeave={() => setHoveredId(null)}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* ──────────── RIGHT: 3D map fills the entire space, stats overlay as "sky" ──────────── */}
      <main style={{
        flex: 1, position: 'relative', minWidth: 0,
      }}>
        {/* 3D map — full canvas, the "earth" */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <Suspense fallback={
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 600, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)',
            }}>
              Chargement carte 3D…
            </div>
          }>
            <MadagascarMap3D activeId={selectedId} onPick={handlePick} />
          </Suspense>
        </div>

        {/* Title block — top-left overlay */}
        <div style={{
          position: 'absolute', top: 32, left: 32,
          pointerEvents: 'none', zIndex: 2,
          textShadow: '0 0 10px rgba(0,36,31,0.85)',
        }}>
          <p style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.55)',
            margin: 0, marginBottom: 8,
          }}>
            Madagascar
          </p>
          <h1 style={{
            fontSize: 'clamp(36px, 3.8vw, 52px)', fontWeight: 700,
            letterSpacing: '-0.045em', lineHeight: 0.95,
            color: '#FFFFFF', margin: 0,
            fontFamily: 'var(--font-display)',
          }}>
            {selectedId ? panelRegion.name : <>22<span style={{ color: 'rgba(255,255,255,0.30)', fontWeight: 400 }}> régions</span></>}
          </h1>
        </div>

        {/* Stats overlay — top-right, "sky" floating over the map */}
        <AnimatePresence mode="wait">
          <motion.aside
            key={panelRegion.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'absolute', top: 32, right: 32,
              width: 280,
              pointerEvents: 'none',
              zIndex: 2,
              textShadow: '0 0 10px rgba(0,36,31,0.85)',
            }}
          >
            <p style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.55)',
              margin: 0, marginBottom: 6, textAlign: 'right',
            }}>
              {selectedId ? 'Région sélectionnée' : 'Vue d\'ensemble'}
            </p>
            <p style={{
              fontSize: 12, color: 'rgba(255, 255, 255, 0.55)',
              margin: 0, marginBottom: 22, textAlign: 'right',
              letterSpacing: '0.02em',
            }}>
              Capitale · {panelRegion.capital}
            </p>

            <div style={{ textAlign: 'right' }}>
              <HeroStat label="Population" value={fmt(panelRegion.population)} suffix="hab" />
              <HeroStat label="Superficie" value={fmt(panelRegion.superficie)} suffix="km²" />
              <HeroStat label="Densité" value={panelRegion.densite.toFixed(1)} suffix="hab/km²" />
            </div>
          </motion.aside>
        </AnimatePresence>

        {/* Footer hint — bottom overlay */}
        <div style={{
          position: 'absolute', bottom: 28, left: 32, right: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 10, fontWeight: 500, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.45)',
          pointerEvents: 'none', zIndex: 2,
          textShadow: '0 0 10px rgba(0,36,31,0.85)',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#4DFF91', display: 'inline-block',
              animation: 'biolum 2.4s ease-in-out infinite',
            }} />
            {selectedId ? 'Cliquer hors région · revenir' : 'Survoler · cliquer une région'}
          </span>
          <span>{fmt(panelRegion.productionRiz)} t · riz</span>
        </div>
      </main>
    </div>
  );
}

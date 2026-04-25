import { useState, useEffect, useRef, useCallback } from "react";
import GlobeGL from "react-globe.gl";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, BookOpen, Globe2, BarChart3, Zap } from "lucide-react";

/* ─────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────── */
const COUNTRY_DATA = [
  {
    code: "MDG",
    name: "Madagascar",
    lat: -18.9,
    lng: 47.5,
    population: 28915000,
    popGrowth: +2.7,
    gdpSparkline: [9.8, 10.1, 9.6, 10.4, 11.2, 11.0, 11.8],
    innovationScore: 23,
    obsidianNotes: [
      "Vanille #1 mondial (80% prod.)",
      "Capitale : Antananarivo",
      "Superficie : 587 041 km²",
      "Langues : Malgache & Français",
    ],
  },
  {
    code: "FRA",
    name: "France",
    lat: 46.2276,
    lng: 2.2137,
    population: 67800000,
    popGrowth: +0.3,
    gdpSparkline: [2780, 2710, 2940, 2920, 3030, 3010, 3130],
    innovationScore: 79,
    obsidianNotes: [
      "Structure du système éducatif",
      "Analyse de la startup nation 2024",
      "Ressources énergétiques : le nucléaire",
      "5ème économie mondiale",
    ],
  },
  {
    code: "JPN",
    name: "Japan",
    lat: 36.2048,
    lng: 138.2529,
    population: 125700000,
    popGrowth: -0.5,
    gdpSparkline: [4940, 4940, 4230, 4410, 4210, 4380, 4200],
    innovationScore: 90,
    obsidianNotes: [
      "Démographie et robotique sociale",
      "Kyoto : architecture et zen",
      "Stratégie IA du MEXT",
      "3ème économie mondiale",
    ],
  },
  {
    code: "USA",
    name: "United States",
    lat: 37.09,
    lng: -95.71,
    population: 335000000,
    popGrowth: +0.5,
    gdpSparkline: [21000, 23000, 25000, 25500, 27400, 27800, 28800],
    innovationScore: 95,
    obsidianNotes: [
      "1ère économie mondiale",
      "Silicon Valley & Big Tech",
      "Réserve fédérale (Fed)",
      "Dollar : réserve mondiale",
    ],
  },
  {
    code: "DEU",
    name: "Germany",
    lat: 51.1657,
    lng: 10.4515,
    population: 84270625,
    popGrowth: +0.1,
    gdpSparkline: [3840, 3900, 4070, 3960, 4120, 4070, 4200],
    innovationScore: 83,
    obsidianNotes: [
      "1ère économie de l'UE",
      "Industrie automobile (VW, BMW)",
      "Transition énergétique (Energiewende)",
      "Export : machines & chimie",
    ],
  },
];

/* ─────────────────────────────────────────────
   FRAMER MOTION VARIANTS
───────────────────────────────────────────── */
const CONTAINER_VARIANTS = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
  exit: {
    transition: { staggerChildren: 0.04, staggerDirection: -1 },
  },
};

const TILE_VARIANTS = {
  hidden: { opacity: 0, y: 28, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.92,
    transition: { duration: 0.22 },
  },
};

/* ─────────────────────────────────────────────
   HELPER: format population
───────────────────────────────────────────── */
function formatPop(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  return n.toLocaleString();
}

/* ─────────────────────────────────────────────
   TILE A — Population
───────────────────────────────────────────── */
function TilePopulation({ country }) {
  const positive = country.popGrowth >= 0;
  return (
    <div className="flex flex-col justify-between h-full">
      <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium uppercase tracking-widest">
        <Globe2 size={14} />
        Population
      </div>
      <div>
        <p className="text-4xl font-black text-white leading-none mt-3">
          {formatPop(country.population)}
        </p>
        <div
          className={`flex items-center gap-1 mt-2 text-sm font-semibold ${
            positive ? "text-[#00e676]" : "text-[#ff4757]"
          }`}
        >
          {positive ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
          {positive ? "+" : ""}
          {country.popGrowth}% / an
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TILE B — GDP Sparkline
───────────────────────────────────────────── */
function TileSparkline({ country }) {
  const data = country.gdpSparkline.map((v, i) => ({ i, v }));
  const last = country.gdpSparkline[country.gdpSparkline.length - 1];
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium uppercase tracking-widest mb-1">
        <BarChart3 size={14} />
        Évolution du PIB (fictif)
      </div>
      <p className="text-xl font-bold text-white mb-2">
        {last >= 1000 ? (last / 1000).toFixed(1) + "T$" : last.toFixed(1) + "B$"}
      </p>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={64}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <Line
              type="monotone"
              dataKey="v"
              stroke="#007aff"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={true}
              animationDuration={700}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TILE C — Innovation Score (SVG arc)
───────────────────────────────────────────── */
function TileInnovation({ country }) {
  const score = country.innovationScore;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium uppercase tracking-widest self-start">
        <Zap size={14} />
        Score d'Innovation
      </div>
      <div className="relative flex items-center justify-center">
        <svg width={100} height={100} viewBox="0 0 100 100">
          {/* Track */}
          <circle
            cx={50}
            cy={50}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={8}
          />
          {/* Progress */}
          <circle
            cx={50}
            cy={50}
            r={r}
            fill="none"
            stroke="#007aff"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-black text-white leading-none">{score}</span>
          <span className="text-[10px] text-neutral-500">/100</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TILE D — Obsidian Notes
───────────────────────────────────────────── */
function TileNotes({ country }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium uppercase tracking-widest mb-3">
        <BookOpen size={14} />
        Notes Récentes
      </div>
      <ul className="space-y-2 flex-1">
        {country.obsidianNotes.map((note, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
            <span
              className="mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: "#007aff" }}
            />
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const TILE_COMPONENTS = [TilePopulation, TileSparkline, TileInnovation, TileNotes];

export default function GlobeAnalysis() {
  const globeRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_DATA[0]); // MDG default
  const [tileOrder, setTileOrder] = useState([0, 1, 2, 3]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  /* Measure container for globe sizing */
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: Math.floor(width), h: Math.floor(height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  /* Globe ready: auto-rotate + fly to default country */
  const handleGlobeReady = useCallback(() => {
    if (!globeRef.current) return;
    const ctrl = globeRef.current.controls();
    ctrl.autoRotate = true;
    ctrl.autoRotateSpeed = 0.5;
    ctrl.enableZoom = false;
    globeRef.current.pointOfView(
      { lat: COUNTRY_DATA[0].lat, lng: COUNTRY_DATA[0].lng, altitude: 2.0 },
      0
    );
  }, []);

  /* Click on a globe point */
  const handlePointClick = useCallback(
    (point) => {
      if (isTransitioning || point.code === selectedCountry?.code) return;

      // Pause auto-rotate, fly to country
      if (globeRef.current) {
        const ctrl = globeRef.current.controls();
        ctrl.autoRotate = false;
        globeRef.current.pointOfView(
          { lat: point.lat, lng: point.lng, altitude: 1.8 },
          1200
        );
        // Resume rotation after fly-to
        setTimeout(() => {
          if (globeRef.current) {
            globeRef.current.controls().autoRotate = true;
          }
        }, 1400);
      }

      // Animate bento grid out, update data, animate in
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedCountry(point);
        setTileOrder([0, 1, 2, 3].sort(() => Math.random() - 0.5));
        setIsTransitioning(false);
      }, 300);
    },
    [isTransitioning, selectedCountry]
  );

  const tileBaseClass =
    "rounded-3xl border border-neutral-800 bg-neutral-900/90 p-5 h-full";

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: "#0a0a0a", fontFamily: "DM Sans, sans-serif" }}
    >
      {/* ── LEFT: Globe ─────────────────────────── */}
      <div ref={containerRef} className="relative flex-[3] h-full overflow-hidden">
        {dims.w > 0 ? (
          <GlobeGL
            ref={globeRef}
            width={dims.w}
            height={dims.h}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            atmosphereColor="#007aff"
            atmosphereAltitude={0.15}
            pointsData={COUNTRY_DATA}
            pointLat="lat"
            pointLng="lng"
            pointColor={(d) =>
              d.code === selectedCountry?.code ? "#007aff" : "#00e676"
            }
            pointRadius={(d) =>
              d.code === selectedCountry?.code ? 0.65 : 0.4
            }
            pointAltitude={0.015}
            pointLabel={(d) =>
              `<div style="background:rgba(10,10,10,0.95);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:6px 10px;color:#fff;font-size:13px;font-family:DM Sans,sans-serif;">${d.name}</div>`
            }
            onPointClick={handlePointClick}
            onGlobeReady={handleGlobeReady}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 rounded-full border-2 border-[#007aff] border-t-transparent animate-spin" />
          </div>
        )}

        {/* Country selector pills */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 flex-wrap justify-center px-4">
          {COUNTRY_DATA.map((c) => (
            <button
              key={c.code}
              onClick={() => handlePointClick(c)}
              className="px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200"
              style={
                c.code === selectedCountry?.code
                  ? {
                      background: "#007aff",
                      borderColor: "#007aff",
                      color: "#fff",
                    }
                  : {
                      background: "rgba(255,255,255,0.05)",
                      borderColor: "rgba(255,255,255,0.12)",
                      color: "#aaa",
                    }
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Bento Grid ───────────────────── */}
      <div
        className="flex-[2] h-full flex flex-col p-5 gap-4 overflow-hidden border-l border-neutral-800/60"
        style={{ minWidth: 0 }}
      >
        {/* Header */}
        <div>
          <p className="text-[11px] text-neutral-500 uppercase tracking-widest font-medium mb-1">
            Analyse géographique
          </p>
          <AnimatePresence mode="wait">
            <motion.h1
              key={selectedCountry?.code + "-title"}
              className="text-2xl font-black text-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {selectedCountry?.name}
            </motion.h1>
          </AnimatePresence>
        </div>

        {/* Tiles */}
        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
            {!isTransitioning && selectedCountry && (
              <motion.div
                key={selectedCountry.code}
                className="grid grid-cols-2 grid-rows-2 gap-3 h-full"
                variants={CONTAINER_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Reorder.Group
                  axis="y"
                  values={tileOrder}
                  onReorder={setTileOrder}
                  as="div"
                  className="contents"
                >
                  {tileOrder.map((tileIdx) => {
                    const TileComp = TILE_COMPONENTS[tileIdx];
                    return (
                      <Reorder.Item
                        key={tileIdx}
                        value={tileIdx}
                        as="div"
                        className="min-h-0"
                        style={{ listStyle: "none" }}
                        dragListener={false}
                      >
                        <motion.div
                          variants={TILE_VARIANTS}
                          className={tileBaseClass}
                        >
                          <TileComp country={selectedCountry} />
                        </motion.div>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="text-[10px] text-neutral-600 text-center">
          Données fictives — Prototype
        </div>
      </div>
    </div>
  );
}

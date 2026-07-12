/**
 * Build-time generator for Madagascar SVG paths.
 *
 * Reads GADM 4.1 GeoJSON for Madagascar (level 2 = 22 regions, level 3 = 110
 * districts), simplifies + projects via d3-geo, and emits a single JSON file
 * consumed by Madagascar2DMap.jsx at runtime.
 *
 * Output: src/data/madagascarPaths.json
 *   {
 *     viewBox: "0 0 W H",
 *     regions: { [slug]: { name, capital, d, centroid: [x,y] } },
 *     districts: { [regionSlug]: [{ slug, name, d, centroid }, ...] }
 *   }
 *
 * Slug scheme matches the existing REGION_BIOME map in
 * src/components/madagascar3d/MadagascarMap3D.jsx (dash-separated).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoMercator, geoPath, geoCentroid } from 'd3-geo';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const ADM2_PATH = path.join(__dirname, 'data', 'gadm41_MDG_2.json');
const ADM3_PATH = path.join(__dirname, 'data', 'gadm41_MDG_3.json');
const OUT_PATH  = path.join(root, 'src', 'data', 'madagascarPaths.json');

// Target SVG canvas. preserveAspectRatio="xMidYMid meet" will fit this.
const WIDTH  = 600;
const HEIGHT = 1000;

// ─── GADM NAME_2 → slug used elsewhere in the codebase ──────────────────────
// GADM has a few typos / spacing oddities. Map them to the canonical slugs.
const REGION_NAME_TO_SLUG = {
  'Analamanga':         'analamanga',
  'Bongolava':          'bongolava',
  'Itasy':              'itasy',
  'Vakinankaratra':     'vakinankaratra',
  'Diana':              'diana',
  'Sava':               'sava',
  "Amoron'imania":      'amoron-i-mania',
  'Atsimo-Atsinana':    'atsimo-atsinanana',
  'Hautematsiatra':     'matsiatra-ambony',
  'Ihorombe':           'ihorombe',
  'VatovavyFitovinany': 'vatovavy-fitovinany',
  'Betsiboka':          'betsiboka',
  'Boeny':              'boeny',
  'Melaky':             'melaky',
  'Sofia':              'sofia',
  'Alaotra-Mangoro':    'alaotra-mangoro',
  'Analanjirofo':       'analanjirofo',
  'Atsinanana':         'atsinanana',
  'Androy':             'androy',
  'Anosy':              'anosy',
  'Atsimo-Andrefana':   'atsimo-andrefana',
  'Menabe':             'menabe',
};

// District slug helper: lowercase, dash, ASCII-fold.
function districtSlug(name) {
  return String(name)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Round path string to integer pixels. At 600×1000 viewport, sub-pixel detail
// is invisible — and integers are ~30 % shorter than 1-decimal floats.
function roundPath(d) {
  return d
    .replace(/-?\d+\.\d+/g, m => Math.round(parseFloat(m)).toString())
    // Drop "L x,y L x,y" duplicates left after rounding.
    .replace(/L(-?\d+,-?\d+)(L\1)+/g, 'L$1');
}

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// ─── Geometry simplification ────────────────────────────────────────────────
// Quantize source coordinates and dedupe consecutive identical points. At
// Madagascar scale (≈14° lng × 14° lat → 1500 km × 1500 km onto 600×1000 px),
// 2 decimals ≈ 1.1 km ≈ <1 pixel, so this is visually lossless.
function quantizeRing(ring, digits = 2) {
  const f = 10 ** digits;
  const out = [];
  let lastX = NaN, lastY = NaN;
  for (const [x, y] of ring) {
    const rx = Math.round(x * f) / f;
    const ry = Math.round(y * f) / f;
    if (rx !== lastX || ry !== lastY) out.push([rx, ry]);
    lastX = rx; lastY = ry;
  }
  if (out.length > 1) {
    const [fx, fy] = out[0];
    const [lx, ly] = out[out.length - 1];
    if (fx !== lx || fy !== ly) out.push([fx, fy]);
  }
  return out;
}

// Drop rings that are too small to render at our viewport scale, AND degenerate
// rings (<4 unique points after closure). Tiny islets near coastlines bloat the
// path and confuse d3-geo's spherical bounds (which falls back to whole-globe
// when geometry is near-degenerate, breaking fitSize).
const MIN_RING_SPAN_DEG = 0.04;  // ≈ 4 km ≈ ~2 px at 600×1000 fitSize
function ringSpan(ring) {
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const [x, y] of ring) {
    if (x < xMin) xMin = x; if (x > xMax) xMax = x;
    if (y < yMin) yMin = y; if (y > yMax) yMax = y;
  }
  return Math.max(xMax - xMin, yMax - yMin);
}
function isValidRing(ring) {
  return ring.length >= 5 && ringSpan(ring) >= MIN_RING_SPAN_DEG;
}

function simplifyGeometry(geom, digits = 2) {
  if (!geom) return geom;
  if (geom.type === 'Polygon') {
    const coords = geom.coordinates.map(r => quantizeRing(r, digits)).filter(isValidRing);
    if (coords.length === 0) return null;
    return { ...geom, coordinates: coords };
  }
  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates
      .map(poly => poly.map(r => quantizeRing(r, digits)).filter(isValidRing))
      .filter(poly => poly.length > 0);
    if (polys.length === 0) return null;
    return { ...geom, coordinates: polys };
  }
  return geom;
}

function simplifyFeatureCollection(fc, digits = 2) {
  return {
    ...fc,
    features: fc.features
      .map(f => ({ ...f, geometry: simplifyGeometry(f.geometry, digits) }))
      .filter(f => f.geometry),
  };
}

function main() {
  if (!fs.existsSync(ADM2_PATH) || !fs.existsSync(ADM3_PATH)) {
    console.error('[madagascar-paths] GADM source JSON missing in scripts/data/.');
    console.error('  Expected:', ADM2_PATH);
    console.error('  Expected:', ADM3_PATH);
    process.exit(1);
  }

  const adm2Raw = loadJSON(ADM2_PATH);
  const adm3Raw = loadJSON(ADM3_PATH);

  // Pre-simplify source GeoJSON before projecting. Quantizing to 2 decimal
  // degrees is sub-pixel at our screen scale and divides file size by ~10.
  const adm2 = simplifyFeatureCollection(adm2Raw, 2);
  const adm3 = simplifyFeatureCollection(adm3Raw, 2);

  // Single shared projection — fit BOTH levels to the same viewport, otherwise
  // districts won't align with their regions.
  const projection = geoMercator().fitSize([WIDTH, HEIGHT], adm2);
  const pathGen = geoPath(projection);

  // ─── Regions ──────────────────────────────────────────────────────────────
  const regions = {};
  let unknownRegions = 0;
  for (const f of adm2.features) {
    const name = f.properties.NAME_2;
    const slug = REGION_NAME_TO_SLUG[name];
    if (!slug) {
      console.warn('[madagascar-paths] Unmapped region:', name);
      unknownRegions++;
      continue;
    }
    const d = pathGen(f);
    if (!d) {
      console.warn('[madagascar-paths] Empty path for region:', name);
      continue;
    }
    const centroidLngLat = geoCentroid(f);
    const [cx, cy] = projection(centroidLngLat);
    // Bounding box in viewBox coords — used at runtime to zoom into the region.
    const [[x0, y0], [x1, y1]] = pathGen.bounds(f);
    regions[slug] = {
      name,
      gid: f.properties.GID_2,
      d: roundPath(d, 1),
      centroid: [Math.round(cx * 10) / 10, Math.round(cy * 10) / 10],
      bbox: [
        Math.round(x0 * 10) / 10,
        Math.round(y0 * 10) / 10,
        Math.round((x1 - x0) * 10) / 10,
        Math.round((y1 - y0) * 10) / 10,
      ],
    };
  }

  // ─── Districts (grouped by region) ───────────────────────────────────────
  const districts = {};
  let unknownDistrictRegions = 0;
  for (const f of adm3.features) {
    const regionName = f.properties.NAME_2;
    const regionSlug = REGION_NAME_TO_SLUG[regionName];
    if (!regionSlug) { unknownDistrictRegions++; continue; }

    const dName = f.properties.NAME_3;
    const dSlug = districtSlug(dName);
    const d = pathGen(f);
    if (!d) continue;
    const centroidLngLat = geoCentroid(f);
    const [cx, cy] = projection(centroidLngLat);

    if (!districts[regionSlug]) districts[regionSlug] = [];
    districts[regionSlug].push({
      slug: dSlug,
      name: dName,
      gid: f.properties.GID_3,
      d: roundPath(d, 1),
      centroid: [Math.round(cx * 10) / 10, Math.round(cy * 10) / 10],
    });
  }

  // Sort districts alphabetically inside each region
  for (const regionSlug of Object.keys(districts)) {
    districts[regionSlug].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  const out = {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    width: WIDTH,
    height: HEIGHT,
    regions,
    districts,
    meta: {
      source: 'GADM 4.1 (gadm.org)',
      regionCount: Object.keys(regions).length,
      districtCount: Object.values(districts).reduce((n, arr) => n + arr.length, 0),
      generatedAt: new Date().toISOString(),
    },
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out));

  const sizeKB = (fs.statSync(OUT_PATH).size / 1024).toFixed(1);
  console.log(`[madagascar-paths] OK — ${out.meta.regionCount} regions, ${out.meta.districtCount} districts → ${OUT_PATH} (${sizeKB} kB)`);
  if (unknownRegions || unknownDistrictRegions) {
    console.warn(`[madagascar-paths] WARN — ${unknownRegions} regions and ${unknownDistrictRegions} district-parent regions unmapped`);
  }
}

main();

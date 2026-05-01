/**
 * Biome palette + region → biome mapping for the Madagascar map.
 * Aligned on the AGRI-NEXUS Nature Edition tokens (cf. src/index.css).
 *
 * Slugs match those generated in src/data/madagascarPaths.json (GADM 4.1).
 */

export const BIOME_COLORS = {
  rainforest: '#1F4A3D',
  tropical:   '#3A7A5A',
  highland:   '#6A9B52',
  transition: '#8FAF6E',
  mangrove:   '#4F8B7B',
  savanna:    '#C17F3A',
  spiny:      '#A06530',
  dry:        '#D4944A',
};

export const BIOME_FALLBACK = '#7FB069';

export const REGION_BIOME = {
  'diana':                'tropical',
  'sava':                 'rainforest',
  'analanjirofo':         'rainforest',
  'sofia':                'savanna',
  'boeny':                'savanna',
  'betsiboka':            'savanna',
  'melaky':               'mangrove',
  'bongolava':            'savanna',
  'itasy':                'highland',
  'analamanga':           'highland',
  'alaotra-mangoro':      'transition',
  'atsinanana':           'rainforest',
  'vakinankaratra':       'highland',
  'amoron-i-mania':       'highland',
  'menabe':               'savanna',
  'matsiatra-ambony':     'highland',
  'vatovavy-fitovinany':  'rainforest',
  'ihorombe':             'transition',
  'atsimo-atsinanana':    'transition',
  'atsimo-andrefana':     'spiny',
  'androy':               'spiny',
  'anosy':                'dry',
};

/**
 * Hash a string to a stable signed integer in [-1, 1] for HSL variation.
 * Same string → same hue/lightness offset across renders.
 */
function hashSigned(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  // Scale to [-1, 1]
  return (h % 1000) / 1000;
}

/** #RRGGBB → {h, s, l} in degrees / 0-1 */
function hexToHSL(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
}

/**
 * Pick a fill colour for a given region slug:
 *  - base = BIOME_COLORS[biome]
 *  - hue ±8°, lightness ±8% deterministic per slug
 * That keeps biome cohesion while avoiding the "all one shade" look.
 */
export function colorForRegion(slug) {
  const biome = REGION_BIOME[slug] || 'highland';
  const base = BIOME_COLORS[biome] || BIOME_FALLBACK;
  const { h, s, l } = hexToHSL(base);
  const offset = hashSigned(slug);
  const h2 = (h + offset * 8 + 360) % 360;
  const l2 = Math.max(0.18, Math.min(0.62, l + offset * 0.08));
  return `hsl(${h2.toFixed(1)}deg ${(s * 100).toFixed(0)}% ${(l2 * 100).toFixed(0)}%)`;
}

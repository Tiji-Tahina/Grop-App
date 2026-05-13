/**
 * Contrat MapAction (v1) — miroir TypeScript des schemas Pydantic backend.
 *
 * Source de verite : backend/chat/pipeline/schemas.py
 * Production : backend/chat/pipeline/intent.py + data_werehouse/map_facts.py
 * Transport SSE : `data: map_action:BASE64_JSON|elapsed|progress`
 *                  decode via atob() + JSON.parse()
 *
 * Types laisses larges (string unions sur les enums, mais pas de validation
 * runtime) — le backend valide deja avec Pydantic, le front fait confiance.
 */

export type MapActionOp =
  | 'slice'
  | 'dice'
  | 'compare'
  | 'drill_down'
  | 'highlight'
  | 'clear';

export type MapActionMetric = 'yield' | 'production' | 'area' | 'price';

export type ZoomLevel = 'country' | 'region' | 'district' | 'commune';
export type DataLevel = 'country' | 'region';
export type ComparisonAxis = 'crop' | 'year' | 'variety' | 'region';

export interface MapActionFilters {
  crop?: string | null;
  variety?: string | null;
  year?: number | null;
  season?: string | null;
  regions?: string[] | null;
}

export interface MapActionView {
  zoom_level: ZoomLevel;
  scope_region?: string | null;
  highlighted_areas?: string[] | null;
}

export interface AreaData {
  slug: string;
  name: string;
  value: number | null;
  rank?: number | null;
  tooltip?: Record<string, unknown>;
}

export interface DataPayload {
  level: DataLevel;
  metric: MapActionMetric;
  unit: string;
  areas: AreaData[];
}

export interface ComparisonAreaData {
  slug: string;
  value: number | null;
  rank?: number | null;
}

export interface ComparisonSide {
  label: string;
  filters: Record<string, unknown>;
}

export interface ComparisonData {
  metric: MapActionMetric;
  unit: string;
  left: ComparisonAreaData[];
  right: ComparisonAreaData[];
}

export interface Comparison {
  axis: ComparisonAxis;
  left: ComparisonSide;
  right: ComparisonSide;
  data?: ComparisonData | null;
}

export interface Explain {
  title: string;
  subtitle?: string | null;
}

export interface MapAction {
  map_action_version: 1;
  op: MapActionOp;
  filters: MapActionFilters;
  metric?: MapActionMetric | null;
  view: MapActionView;
  data?: DataPayload | null;
  comparison?: Comparison | null;
  explain?: Explain | null;
}

/**
 * Decode la payload base64 d'un event SSE `map_action:BASE64`.
 * Retourne null si JSON invalide (le caller fallback gracieusement).
 */
export function decodeMapActionPayload(b64: string): MapAction | null {
  try {
    const json = atob(b64);
    return JSON.parse(json) as MapAction;
  } catch (e) {
    console.warn('[mapAction] decode KO:', e);
    return null;
  }
}

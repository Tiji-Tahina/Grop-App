/**
 * MapActionContext — bus pub/sub pour propager le dernier MapAction du chat
 * vers la page Carte 3D, qui vivent sur des routes différentes du même layout.
 *
 * Pourquoi un context et pas du prop-drilling :
 *   - `AgriculturalChat` (page chat) et `RegionalNavigation` (page carte) ne sont
 *     jamais montés en même temps (switch via `currentPage` dans App.jsx).
 *   - Le context survit aux changements de page car il vit au niveau MainLayout.
 *
 * Pourquoi pas d'auto-switch sur publish :
 *   - Switcher de page démonte AgriculturalChat → annule la requête SSE en cours.
 *   - À la place, on expose `goToMap()` qu'un bouton appelle après la fin du stream.
 */
import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import type { MapAction } from '@/types/mapAction';

interface MapActionBus {
  /** Dernier MapAction publié par le chat (null tant qu'aucune question géospatiale). */
  lastAction: MapAction | null;
  /** Appelé par useChatStream à chaque event SSE map_action. */
  publish: (a: MapAction) => void;
  /** Bascule l'app sur la page Carte 3D. Implémenté par MainLayout. */
  goToMap: () => void;
}

const NOOP_BUS: MapActionBus = {
  lastAction: null,
  publish: () => {},
  goToMap: () => {},
};

const Ctx = createContext<MapActionBus | null>(null);

export function MapActionProvider({
  children,
  onGoToMap,
}: {
  children: ReactNode;
  onGoToMap: () => void;
}) {
  const [lastAction, setLastAction] = useState<MapAction | null>(null);

  const value = useMemo<MapActionBus>(
    () => ({ lastAction, publish: setLastAction, goToMap: onGoToMap }),
    [lastAction, onGoToMap]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Récupère le bus. Retourne un bus inerte si aucun Provider n'est monté
 * (permet aux composants d'utiliser useMapActionBus sans crasher en isolation).
 */
export function useMapActionBus(): MapActionBus {
  return useContext(Ctx) ?? NOOP_BUS;
}

/**
 * Le warehouse OLAP utilise « haute-matsiatra » (slug agronomique du backend).
 * Le SVG GADM 4.1 du front utilise « matsiatra-ambony ».
 * Normalisation à appliquer avant tout setSelectedId.
 */
const SLUG_BACK_TO_FRONT: Record<string, string> = {
  'haute-matsiatra': 'matsiatra-ambony',
};

export function normalizeSlugForFront(slug: string): string {
  return SLUG_BACK_TO_FRONT[slug] ?? slug;
}

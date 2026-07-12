/**
 * MapActionContext — pub/sub bus to propagate the last chat MapAction
 * to the 3D Map page, which live on different routes of the same layout.
 *
 * Why a context instead of prop-drilling:
 *   - `AgriculturalChat` (chat page) and `RegionalNavigation` (map page) are
 *     never mounted at the same time (switch via `currentPage` in App.jsx).
 *   - The context survives page changes because it lives at the MainLayout level.
 *
 * Why no auto-switch on publish:
 *   - Switching pages unmounts AgriculturalChat → cancels the ongoing SSE request.
 *   - Instead, we expose `goToMap()` which a button calls after the stream ends.
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
  /** Last MapAction published by the chat (null until a geospatial question). */
  lastAction: MapAction | null;
  /** Called by useChatStream on each SSE map_action event. */
  publish: (a: MapAction) => void;
  /** Switches the app to the 3D Map page. Implemented by MainLayout. */
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
 * Gets the bus. Returns an inert bus if no Provider is mounted
 * (allows components to use useMapActionBus without crashing in isolation).
 */
export function useMapActionBus(): MapActionBus {
  return useContext(Ctx) ?? NOOP_BUS;
}

/**
 * The OLAP warehouse uses "haute-matsiatra" (backend agronomic slug).
 * The front-end GADM 4.1 SVG uses "matsiatra-ambony".
 * Normalization to apply before any setSelectedId.
 */
const SLUG_BACK_TO_FRONT: Record<string, string> = {
  'haute-matsiatra': 'matsiatra-ambony',
};

export function normalizeSlugForFront(slug: string): string {
  return SLUG_BACK_TO_FRONT[slug] ?? slug;
}

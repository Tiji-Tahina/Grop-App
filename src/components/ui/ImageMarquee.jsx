import React from 'react';

// ── Images locales (assets/marquee) ──────────────────────────────────────────
import img_2148761816   from '../../assets/marquee/2148761816.webp';
import img_2149711095   from '../../assets/marquee/2149711095.webp';
import img_644          from '../../assets/marquee/644.webp';
import img_baobab       from '../../assets/marquee/BAOBAB-2-1290x540.webp';
import img_litchi       from '../../assets/marquee/campagne-litchi-madagascar.webp';
import img_ateeq        from '../../assets/marquee/pexels-ateeq-photos-2152808415-32409512.webp';
import img_safari       from '../../assets/marquee/pexels-safari-consoler-3290243-11196645.webp';

/**
 * Dual-row image marquee (top row scrolls right→left, bottom row left→right).
 *
 * Place your images in `src/assets/marquee/` and import them here, or pass `imagesTop`/`imagesBottom`
 * as props (arrays of image URLs) to override the defaults.
 */
export function ImageMarquee({
  imagesTop,
  imagesBottom,
  speed = 30,
  tileSize = 256,
  className = '',
}) {
  const top    = imagesTop    && imagesTop.length    ? imagesTop    : DEFAULT_TOP;
  const bottom = imagesBottom && imagesBottom.length ? imagesBottom : DEFAULT_BOTTOM;

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
    >
      <div className="flex flex-col gap-0 w-full">
        <MarqueeRow images={top}    speed={speed} reverse tileSize={tileSize} />
        <MarqueeRow images={bottom} speed={speed}         tileSize={tileSize} />
      </div>

      {/* Vignette edges */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-40 z-10"
        style={{ background: 'linear-gradient(to right, #000 0%, rgba(0,0,0,0.85) 40%, transparent 100%)' }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-40 z-10"
        style={{ background: 'linear-gradient(to left, #000 0%, rgba(0,0,0,0.85) 40%, transparent 100%)' }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 z-10"
        style={{ background: 'linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.7) 40%, transparent 100%)' }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 z-10"
        style={{ background: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.7) 40%, transparent 100%)' }}
      />

      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee-scroll var(--marquee-duration, 30s) linear infinite;
        }
        .marquee-track.reverse {
          animation-direction: reverse;
        }
        .marquee-row:hover .marquee-track {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

function MarqueeRow({ images, speed, reverse = false, tileSize }) {
  const duplicated = [...images, ...images];
  return (
    <div className="marquee-row overflow-hidden">
      <div
        className={`marquee-track ${reverse ? 'reverse' : ''}`}
        style={{ '--marquee-duration': `${speed}s` }}
      >
        {duplicated.map((src, idx) => (
          <div
            key={idx}
            className="relative flex-shrink-0 overflow-hidden"
            style={{ width: tileSize, height: tileSize }}
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Répartition des 7 images locales sur 2 rangées ───────────────────────────
// Rangée du haut (4 images) — défile droite→gauche
const DEFAULT_TOP = [
  img_2148761816,
  img_baobab,
  img_ateeq,
  img_litchi,
];

// Rangée du bas (4 images) — défile gauche→droite
const DEFAULT_BOTTOM = [
  img_safari,
  img_2149711095,
  img_644,
  img_litchi,   // réutilisée pour équilibrer les rangées
];

export default ImageMarquee;

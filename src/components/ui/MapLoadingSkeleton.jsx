import React from 'react';
import { useProgress } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';

export default function MapLoadingSkeleton({ forced = false }) {
  const { active, progress } = useProgress();
  // Show skeleton if forced (e.g., during JS bundle lazy-load)
  // or if useProgress detects a 3D asset loading.
  const show = forced || active;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-deep)', zIndex: 50,
          }}
        >
          {/* Skeleton / Animation */}
          <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 40 }}>
            {/* Rotating outer circle */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
              style={{
                position: 'absolute', inset: 0,
                border: '1px dashed rgba(77, 255, 145, 0.25)',
                borderRadius: '50%',
              }}
            />
            {/* Rotating inner circle (counter-clockwise) */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
              style={{
                position: 'absolute', inset: 12,
                border: '2px solid transparent',
                borderTopColor: 'rgba(77, 255, 145, 0.6)',
                borderRightColor: 'rgba(77, 255, 145, 0.1)',
                borderRadius: '50%',
              }}
            />
            {/* Central pulse */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.35, 0.15] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              style={{
                position: 'absolute', inset: 24,
                background: 'radial-gradient(circle, rgba(77, 255, 145, 0.4) 0%, transparent 70%)',
                borderRadius: '50%',
              }}
            />
            {/* Center percentage */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#4DFF91', fontSize: 20, fontWeight: 700,
              fontFamily: 'var(--font-display)',
              textShadow: '0 0 12px rgba(77, 255, 145, 0.5)'
            }}>
              {forced ? '...' : `${Math.round(progress)}%`}
            </div>
          </div>
          
          <h2 style={{
            fontSize: 14, fontWeight: 600, color: '#FFFFFF',
            letterSpacing: '0.18em', textTransform: 'uppercase',
            margin: 0, marginBottom: 12, fontFamily: 'var(--font-display)'
          }}>
            Loading 3D Map
          </h2>
          <p style={{
            fontSize: 11, color: 'rgba(255, 255, 255, 0.45)',
            letterSpacing: '0.06em', margin: 0,
            maxWidth: 320, textAlign: 'center', lineHeight: 1.6
          }}>
            Initializing topographic environment and agricultural data...
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';

interface WelcomeScreenProps {
  suggestions: Array<{ label: string; subtitle: string; icon?: React.ReactNode }>;
  onSelect: (text: string) => void;
}

const typingText = "How can I help you?";

export function WelcomeScreen({ suggestions, onSelect }: WelcomeScreenProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const counterRef = useRef({ value: 0 });
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplayedText(typingText);
      return;
    }

    const typeIn = () =>
      gsap.to(counterRef.current, {
        value: typingText.length,
        duration: typingText.length * 0.055,
        ease: 'none',
        onUpdate() {
          setDisplayedText(typingText.slice(0, Math.round(counterRef.current.value)));
        },
      });

    const typeOut = () =>
      gsap.to(counterRef.current, {
        value: 0,
        duration: typingText.length * 0.03,
        ease: 'none',
        onUpdate() {
          setDisplayedText(typingText.slice(0, Math.round(counterRef.current.value)));
        },
      });

    const tl = gsap.timeline({ repeat: -1 });
    tlRef.current = tl;

    tl.add(typeIn())
      .to({}, { duration: 30 })   // hold 30 s
      .add(typeOut())
      .to({}, { duration: 1.2 }); // brief pause before restart

    // Cursor blink — independent interval
    const cursorInterval = setInterval(() => setShowCursor(p => !p), 530);

    return () => {
      tl.kill();
      clearInterval(cursorInterval);
    };
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      justifyContent: 'center', padding: '0 56px', maxWidth: 1040, margin: '0 auto',
      width: '100%', minHeight: '100%',
    }}>
      <p style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)',
        margin: 0, marginBottom: 14,
      }}>
        Agricultural assistant · Madagascar
      </p>

      <h1 style={{
        fontSize: 'clamp(36px, 4.5vw, 60px)',
        fontWeight: 700,
        fontFamily: 'var(--font-display)',
        letterSpacing: '-0.04em',
        lineHeight: 1,
        color: '#FFFFFF',
        margin: 0, marginBottom: 18,
        animation: 'fade-in-up 0.6s ease-out',
      }}>
        {displayedText}<span style={{
          color: '#4DFF91',
          opacity: showCursor ? 1 : 0,
          transition: 'opacity 0.1s',
          marginLeft: 4, fontWeight: 300,
        }}>|</span>
      </h1>

      <p style={{
        color: 'rgba(255,255,255,0.55)',
        fontSize: 15,
        lineHeight: 1.5,
        maxWidth: 520,
        margin: 0, marginBottom: 48,
        fontFamily: 'var(--font-body)',
      }}>
        From planting to harvest — let's get started.
      </p>

      {/* Suggestions — horizontal grid, statskog cards */}
      <div style={{ width: '100%' }}>
        <p style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)',
          margin: 0, marginBottom: 16,
        }}>
          Suggestions
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSelect(s.label)}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'flex-start', justifyContent: 'space-between',
                gap: 14,
                textAlign: 'left', cursor: 'pointer',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 4,
                padding: '16px 18px',
                minHeight: 92,
                color: 'rgba(255,255,255,0.78)',
                transition: 'border-color 0.18s ease, color 0.18s ease, transform 0.18s ease',
                animation: `fade-in-up 0.4s ease-out ${i * 0.06}s both`,
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(77, 255, 145, 0.35)';
                e.currentTarget.style.color = 'rgba(255,255,255,1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.78)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{
                fontSize: 14, fontWeight: 500, color: 'inherit',
                lineHeight: 1.35, letterSpacing: '-0.005em',
              }}>
                {s.label}
              </span>
              {s.subtitle && (
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.40)',
                  lineHeight: 1.2,
                }}>
                  {s.subtitle}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

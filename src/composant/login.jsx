import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { authAPI, saveTokens } from '../api/auth';
import { ImageMarquee } from '../components/ui/ImageMarquee';
import img1 from '../assets/marquee/2148761816.webp';
import img2 from '../assets/marquee/2149711095.webp';
import img3 from '../assets/marquee/pexels-safari-consoler-3290243-11196645.webp';
import img4 from '../assets/marquee/pexels-ateeq-photos-2152808415-32409512.webp';
import img5 from '../assets/marquee/644.webp';
import img6 from '../assets/marquee/campagne-litchi-madagascar.webp';
import img7 from '../assets/marquee/BAOBAB-2-1290x540.webp';

const MARQUEE_IMAGES = [img1, img2, img3, img4, img5, img6, img7];

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      saveTokens(res.data.access, res.data.refresh);
      navigate('/');
    } catch (err) {
      if (!err.response) {
        setError("Impossible de contacter le serveur. Vérifiez que le backend est démarré.");
      } else {
        const data = err.response.data;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          const messages = Object.values(data).flat().map(String).join(' ');
          setError(messages || 'Email ou mot de passe incorrect.');
        } else {
          setError('Email ou mot de passe incorrect.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'var(--bg-deep, #00241F)' }}>

      {/* ── Layer 0 : Image Marquee — full-viewport background ── */}
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        <ImageMarquee speed={30} tileSize={280} imagesTop={MARQUEE_IMAGES} imagesBottom={MARQUEE_IMAGES} />
      </div>

      {/* ── Layer 1 : Soft forest tint over the marquee — readability ── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: 'radial-gradient(ellipse at 30% 50%, rgba(0,36,31,0.92) 0%, rgba(0,36,31,0.78) 35%, rgba(0,36,31,0.55) 100%)',
        }}
      />

      {/* ── Main container — same layout as before (left half = card, right = marquee through) ── */}
      <div className="relative flex min-h-screen" style={{ zIndex: 10 }}>

        {/* Left panel — login card */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative">

          {/* Card — same dimensions as before, nature design (no glass) */}
          <div className="relative w-full" style={{ maxWidth: 448 }}>
            <div style={{
              background: 'var(--bg-deep, #00241F)',
              border: '1px solid var(--border-subtle, rgba(77, 255, 145, 0.10))',
              borderRadius: 4,
              padding: 'clamp(40px, 5vw, 56px) clamp(32px, 4vw, 48px)',
            }}>

              {/* Logo + brand */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
                {/* Logo ISPM - Partnership indicator dans un cercle */}
                <div style={{
                  width: 90, height: 90,
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  overflow: 'hidden'
                }}>
                  <img
                    src="/ispm-logo.png"
                    alt="ISPM"
                    style={{ width: 100, height: 100, objectFit: 'contain' }}
                  />
                </div>
                <div style={{ borderLeft: '1px solid rgba(77,255,145,0.2)', paddingLeft: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                      src="/logo.png"
                      alt="CropGPT"
                      style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }}
                    />
                    <p style={{
                      fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em',
                      color: '#FFFFFF', fontFamily: 'var(--font-display)',
                      margin: 0,
                    }}>
                      CropGPT
                    </p>
                  </div>
                  <p style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.18em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)',
                    margin: 0, marginTop: 4,
                  }}>
                    Plateforme agricole IA
                  </p>
                </div>
              </div>

              {/* Hero title */}
              <h1 style={{
                fontSize: 'clamp(32px, 3.5vw, 44px)',
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.04em',
                lineHeight: 1.02,
                color: '#FFFFFF',
                margin: 0, marginBottom: 12,
              }}>
                Bon retour
              </h1>
              <p style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: 'rgba(255,255,255,0.55)',
                margin: 0, marginBottom: 36,
              }}>
                Accédez à votre tableau de bord agricole intelligent.
              </p>

              {/* Error banner */}
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start',
                  padding: '8px 0 8px 12px',
                  marginBottom: 20,
                  borderLeft: '2px solid #EF4444',
                  fontSize: 13, color: '#F87171',
                  lineHeight: 1.5,
                }}>
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit}>

                {/* Email */}
                <div style={{ marginBottom: 22 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.16em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)',
                    marginBottom: 8,
                  }}>
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@domaine.com"
                    required
                    autoComplete="email"
                    style={{
                      width: '100%',
                      padding: '10px 0',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(77,255,145,0.10)',
                      borderRadius: 0,
                      color: '#FFFFFF',
                      fontSize: 15,
                      outline: 'none',
                      fontFamily: 'var(--font-body)',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.18s ease',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderBottomColor = 'rgba(77,255,145,0.45)'}
                    onBlur={(e) => e.currentTarget.style.borderBottomColor = 'rgba(77,255,145,0.10)'}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{
                    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                    marginBottom: 8,
                  }}>
                    <label style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.16em',
                      textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)',
                    }}>
                      Mot de passe
                    </label>
                    <button
                      type="button"
                      style={{
                        background: 'none', border: 'none',
                        color: 'rgba(255,255,255,0.42)',
                        fontSize: 10, fontWeight: 500,
                        letterSpacing: '0.10em', textTransform: 'uppercase',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'color 0.18s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.42)'}
                    >
                      Oublié ?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      style={{
                        width: '100%',
                        padding: '10px 36px 10px 0',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid rgba(77,255,145,0.10)',
                        borderRadius: 0,
                        color: '#FFFFFF',
                        fontSize: 15,
                        outline: 'none',
                        fontFamily: 'var(--font-body)',
                        letterSpacing: showPassword ? '0' : '0.18em',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.18s ease',
                      }}
                      onFocus={(e) => e.currentTarget.style.borderBottomColor = 'rgba(77,255,145,0.45)'}
                      onBlur={(e) => e.currentTarget.style.borderBottomColor = 'rgba(77,255,145,0.10)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: 0, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none',
                        color: 'rgba(255,255,255,0.42)',
                        cursor: 'pointer',
                        transition: 'color 0.18s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.42)'}
                    >
                      {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>

                {/* CTA — solid biolum, no gradient */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '14px 20px',
                    background: loading ? 'rgba(77, 255, 145, 0.30)' : '#4DFF91',
                    color: '#001A10',
                    border: 'none',
                    fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.16em', textTransform: 'uppercase',
                    cursor: loading ? 'wait' : 'pointer',
                    transition: 'transform 0.18s ease, opacity 0.18s ease',
                    fontFamily: 'var(--font-body)',
                  }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    {loading ? (
                      <>
                        <span style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: '#001A10',
                          animation: 'biolum 1s ease-in-out infinite',
                        }} />
                        Connexion
                      </>
                    ) : (
                      'Accéder au dashboard'
                    )}
                  </span>
                  {!loading && <ArrowRight size={14} strokeWidth={2.5} />}
                </button>

              </form>

              {/* Sign up link */}
              <p style={{
                marginTop: 28, marginBottom: 0,
                fontSize: 13,
                color: 'rgba(255,255,255,0.55)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                Nouveau ?
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  style={{
                    background: 'none', border: 'none',
                    color: '#FFFFFF',
                    fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', padding: 0,
                    textDecoration: 'underline',
                    textDecorationColor: 'rgba(77,255,145,0.5)',
                    textUnderlineOffset: 3,
                  }}
                >
                  Créer un compte
                </button>
              </p>

            </div>
          </div>

        </div>

        {/* Right half — marquee shows through (same as before) */}
        <div className="hidden lg:block lg:w-1/2" />
      </div>

      <style>{`
        input::placeholder {
          color: rgba(255,255,255,0.30) !important;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #FFFFFF !important;
          -webkit-box-shadow: 0 0 0 1000px var(--bg-deep, #00241F) inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
}

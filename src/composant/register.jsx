import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
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

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!agreedToTerms) {
      setError("Vous devez accepter les conditions d'utilisation.");
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.register({ name, email, password, confirm_password: confirmPassword });
      saveTokens(res.data.access, res.data.refresh);
      navigate('/');
    } catch (err) {
      if (!err.response) {
        setError("Impossible de contacter le serveur. Vérifiez que le backend est démarré.");
      } else {
        const data = err.response.data;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          const messages = Object.entries(data).map(([field, msgs]) => {
            const list = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
            return `${field} : ${list}`;
          });
          setError(messages.join('\n'));
        } else {
          setError("Erreur lors de l'inscription. Veuillez réessayer.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Shared input style
  const flatInput = {
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
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'var(--bg-deep, #00241F)' }}>

      {/* ── Marquee bg + forest tint ── */}
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        <ImageMarquee speed={30} tileSize={280} imagesTop={MARQUEE_IMAGES} imagesBottom={MARQUEE_IMAGES} />
      </div>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: 'radial-gradient(ellipse at 30% 50%, rgba(0,36,31,0.92) 0%, rgba(0,36,31,0.78) 35%, rgba(0,36,31,0.55) 100%)',
        }}
      />

      {/* ── Main ── */}
      <div className="relative flex min-h-screen" style={{ zIndex: 10 }}>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative">

          {/* Card */}
          <div className="relative w-full" style={{ maxWidth: 448 }}>
            <div style={{
              background: 'var(--bg-deep, #00241F)',
              border: '1px solid var(--border-subtle, rgba(77, 255, 145, 0.10))',
              borderRadius: 4,
              padding: 'clamp(40px, 5vw, 56px) clamp(32px, 4vw, 48px)',
            }}>

              {/* Logo + brand */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
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
                fontSize: 'clamp(28px, 3vw, 38px)',
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.04em',
                lineHeight: 1.05,
                color: '#FFFFFF',
                margin: 0, marginBottom: 8,
              }}>
                Créer un compte
              </h1>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.55)', margin: 0, marginBottom: 28 }}>
                Rejoignez la plateforme agricole intelligente.
              </p>

              {/* Error banner */}
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start',
                  padding: '8px 0 8px 12px',
                  marginBottom: 16,
                  borderLeft: '2px solid #EF4444',
                  fontSize: 13, color: '#F87171',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-line',
                }}>
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit}>

                {/* Name */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{
                    display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.16em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)', marginBottom: 8,
                  }}>
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jean Dupont"
                    required
                    autoComplete="name"
                    style={flatInput}
                    onFocus={(e) => e.currentTarget.style.borderBottomColor = 'rgba(77,255,145,0.45)'}
                    onBlur={(e) => e.currentTarget.style.borderBottomColor = 'rgba(77,255,145,0.10)'}
                  />
                </div>

                {/* Email */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{
                    display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.16em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)', marginBottom: 8,
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
                    style={flatInput}
                    onFocus={(e) => e.currentTarget.style.borderBottomColor = 'rgba(77,255,145,0.45)'}
                    onBlur={(e) => e.currentTarget.style.borderBottomColor = 'rgba(77,255,145,0.10)'}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{
                    display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.16em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)', marginBottom: 8,
                  }}>
                    Mot de passe
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      style={{
                        ...flatInput,
                        padding: '10px 36px 10px 0',
                        letterSpacing: showPassword ? '0' : '0.18em',
                      }}
                      onFocus={(e) => e.currentTarget.style.borderBottomColor = 'rgba(77,255,145,0.45)'}
                      onBlur={(e) => e.currentTarget.style.borderBottomColor = 'rgba(77,255,145,0.10)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'rgba(255,255,255,0.42)', cursor: 'pointer',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div style={{ marginBottom: 22 }}>
                  <label style={{
                    display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.16em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)', marginBottom: 8,
                  }}>
                    Confirmer le mot de passe
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      style={{
                        ...flatInput,
                        padding: '10px 36px 10px 0',
                        letterSpacing: showConfirmPassword ? '0' : '0.18em',
                      }}
                      onFocus={(e) => e.currentTarget.style.borderBottomColor = 'rgba(77,255,145,0.45)'}
                      onBlur={(e) => e.currentTarget.style.borderBottomColor = 'rgba(77,255,145,0.10)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'rgba(255,255,255,0.42)', cursor: 'pointer',
                      }}
                    >
                      {showConfirmPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>

                {/* Terms checkbox — biolum dot style */}
                <label
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 24 }}
                  onClick={(e) => { e.preventDefault(); setAgreedToTerms(!agreedToTerms); }}
                >
                  <span
                    style={{
                      width: 14, height: 14, flexShrink: 0,
                      borderRadius: '50%',
                      background: agreedToTerms ? '#4DFF91' : 'transparent',
                      border: agreedToTerms ? '1px solid #4DFF91' : '1px solid rgba(255,255,255,0.20)',
                      boxShadow: agreedToTerms ? '0 0 10px rgba(77,255,145,0.45)' : 'none',
                      animation: agreedToTerms ? 'biolum 2.4s ease-in-out infinite' : 'none',
                      marginTop: 3,
                      transition: 'all 0.18s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {agreedToTerms && <Check size={9} color="#001A10" strokeWidth={3} />}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5, userSelect: 'none' }}>
                    J'accepte les{' '}
                    <a href="#" style={{ color: '#FFFFFF', textDecoration: 'underline', textDecorationColor: 'rgba(77,255,145,0.5)', textUnderlineOffset: 3 }}>
                      conditions d'utilisation
                    </a>
                    {' '}et la{' '}
                    <a href="#" style={{ color: '#FFFFFF', textDecoration: 'underline', textDecorationColor: 'rgba(77,255,145,0.5)', textUnderlineOffset: 3 }}>
                      politique de confidentialité
                    </a>.
                  </span>
                </label>

                {/* CTA */}
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
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#001A10', animation: 'biolum 1s ease-in-out infinite' }} />
                        Création
                      </>
                    ) : 'Créer mon compte'}
                  </span>
                  {!loading && <ArrowRight size={14} strokeWidth={2.5} />}
                </button>
              </form>

              {/* Sign-in link */}
              <p style={{
                marginTop: 24, marginBottom: 0,
                fontSize: 13, color: 'rgba(255,255,255,0.55)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                Déjà un compte ?
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  style={{
                    background: 'none', border: 'none', color: '#FFFFFF',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0,
                    textDecoration: 'underline',
                    textDecorationColor: 'rgba(77,255,145,0.5)',
                    textUnderlineOffset: 3,
                  }}
                >
                  Se connecter
                </button>
              </p>

            </div>
          </div>

        </div>

        <div className="hidden lg:block lg:w-1/2" />
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.30) !important; }
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

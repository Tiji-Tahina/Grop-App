import React, { useState, useEffect } from 'react';
import { Save, Lock, Eye, EyeOff, CheckCircle, AlertCircle, User } from 'lucide-react';
import { FluidBackground } from '@/components/ui/FluidBackground';
import { getAccessToken, authAPI } from '@/api/auth';

function PwdField({ label, value, onChange, show, setShow }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          required
          style={{
            width: '100%', padding: '12px 44px 12px 16px', borderRadius: 12,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-primary)', outline: 'none',
          }}
        />
        <button type="button" onClick={() => setShow(!show)}
          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function SettingsAlert({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12,
      fontSize: 13, marginBottom: 16,
      background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
      border: msg.type === 'success' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
      color: msg.type === 'success' ? '#34D399' : '#F87171',
    }}>
      {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg.text}
    </div>
  );
}

export function SettingsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState(null);
  const [pwdMsg, setPwdMsg] = useState(null);

  useEffect(() => {
    const token = getAccessToken();
    authAPI.getProfile(token)
      .then(res => { setName(res.data.name); setEmail(res.data.email); })
      .catch(() => {});
  }, []);

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    setNameMsg(null);
    setNameLoading(true);
    try {
      await authAPI.updateProfile({ name }, getAccessToken());
      setNameMsg({ type: 'success', text: 'Nom mis à jour avec succès.' });
    } catch (err) {
      setNameMsg({ type: 'error', text: err.response?.data?.error || 'Erreur lors de la mise à jour.' });
    } finally {
      setNameLoading(false);
    }
  };

  const handlePwdSubmit = async (e) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }
    setPwdLoading(true);
    try {
      await authAPI.updateProfile({ current_password: currentPwd, new_password: newPwd }, getAccessToken());
      setPwdMsg({ type: 'success', text: 'Mot de passe mis à jour avec succès.' });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.response?.data?.error || 'Erreur lors de la mise à jour.' });
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'transparent', position: 'relative' }}>
      <FluidBackground />
      <div style={{ background: 'transparent', padding: '24px 32px', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Paramètres</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 14 }}>Gérez les informations de votre compte</p>
      </div>

      <div style={{ padding: '0 32px 32px', maxWidth: 720, position: 'relative', zIndex: 1 }}>
        {/* Section : Informations du profil - sans card, sans logo */}
        <div style={{ marginBottom: 32, animation: 'fade-in-up 0.4s ease-out' }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Informations du profil</h3>
          
          <form onSubmit={handleNameSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Adresse email</label>
              <input
                type="email"
                value={email}
                disabled
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-muted)', cursor: 'not-allowed', outline: 'none',
                }}
              />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>L'adresse email ne peut pas être modifiée.</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Nom complet</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Votre nom"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-primary)', outline: 'none',
                }}
              />
            </div>

            <SettingsAlert msg={nameMsg} />

            <button
              type="submit"
              disabled={nameLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white',
                fontWeight: 500, borderRadius: 12, border: 'none', cursor: 'pointer',
                opacity: nameLoading ? 0.6 : 1,
              }}
            >
              <Save size={16} />
              {nameLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>
        </div>

        {/* Section : Sécurité - sans card, sans logo */}
        <div style={{ animation: 'fade-in-up 0.4s ease-out', animationDelay: '0.1s', animationFillMode: 'both' }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Changer le mot de passe</h3>

          <form onSubmit={handlePwdSubmit}>
            <PwdField
              label="Mot de passe actuel"
              value={currentPwd}
              onChange={setCurrentPwd}
              show={showCurrentPwd}
              setShow={setShowCurrentPwd}
            />
            <PwdField
              label="Nouveau mot de passe"
              value={newPwd}
              onChange={setNewPwd}
              show={showNewPwd}
              setShow={setShowNewPwd}
            />
            <PwdField
              label="Confirmer le nouveau mot de passe"
              value={confirmPwd}
              onChange={setConfirmPwd}
              show={showConfirmPwd}
              setShow={setShowConfirmPwd}
            />

            <SettingsAlert msg={pwdMsg} />

            <button
              type="submit"
              disabled={pwdLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white',
                fontWeight: 500, borderRadius: 12, border: 'none', cursor: 'pointer',
                opacity: pwdLoading ? 0.6 : 1,
              }}
            >
              <Lock size={16} />
              {pwdLoading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
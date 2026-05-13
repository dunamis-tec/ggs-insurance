import { useState } from 'react'
import { supabase } from '../../lib/supabase'

/* ── Brand panel — left side ─────────────────────────────────────── */
function BrandPanel() {
  return (
    <div className="ggs-brand-panel" style={{
      flex: '0 0 50%',
      background: '#111111',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 40px',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '100vh',
    }}>

      {/* Decorative ghost circles — echo of the GGS logo mark */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
           viewBox="0 0 600 700" preserveAspectRatio="xMidYMid slice">
        <circle cx="160" cy="200" r="180" fill="none" stroke="#C4A96B" strokeWidth="1" opacity="0.08"/>
        <circle cx="310" cy="200" r="180" fill="none" stroke="#C4A96B" strokeWidth="1" opacity="0.08"/>
        <rect x="380" y="60" width="220" height="280" rx="4" fill="none" stroke="#C4A96B" strokeWidth="1" opacity="0.06"/>
        <circle cx="80"  cy="560" r="120" fill="none" stroke="#C4A96B" strokeWidth="0.8" opacity="0.05"/>
        <circle cx="500" cy="580" r="90"  fill="none" stroke="#C4A96B" strokeWidth="0.8" opacity="0.05"/>
      </svg>

      {/* GGS logo mark */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '28px' }}>
        <svg viewBox="0 0 260 160" width="220" height="135">
          <circle cx="68"  cy="80" r="55" fill="none" stroke="#C4A96B" strokeWidth="7"/>
          <circle cx="148" cy="80" r="55" fill="none" stroke="#C4A96B" strokeWidth="7"/>
          <rect   x="183"  y="25" width="72" height="110" rx="2" fill="none" stroke="#C4A96B" strokeWidth="7"/>
          <text x="64"  y="80" textAnchor="middle" dominantBaseline="central"
                fontFamily="Georgia, 'Times New Roman', serif" fontSize="50" fill="#C4A96B">G</text>
          <text x="144" y="80" textAnchor="middle" dominantBaseline="central"
                fontFamily="Georgia, 'Times New Roman', serif" fontSize="50" fill="#C4A96B">G</text>
          <text x="219" y="80" textAnchor="middle" dominantBaseline="central"
                fontFamily="Georgia, 'Times New Roman', serif" fontSize="50" fill="#C4A96B">S</text>
        </svg>
        <p style={{
          textAlign: 'center', color: '#C4A96B',
          fontSize: '10px', fontWeight: 400, letterSpacing: '0.22em',
          textTransform: 'uppercase', marginTop: '6px',
        }}>
          GRUPO GLOBAL EN SEGUROS
        </p>
      </div>

      {/* Tagline */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: '44px' }}>
        <h2 style={{
          color: 'white', fontSize: '22px', fontWeight: 300,
          fontFamily: "'Libre Baskerville', Georgia, serif",
          lineHeight: 1.45, letterSpacing: '0.01em',
          margin: 0,
        }}>
          Protegemos lo que<br />
          <span style={{ fontWeight: 700, fontStyle: 'italic', color: '#C4A96B' }}>más importa</span>
        </h2>
      </div>

      {/* Stats */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center',
        marginBottom: '40px',
      }}>
        {[
          { icon: '🛡️', value: '+15 años', label: 'de experiencia' },
          { icon: '📄', value: '+1,200',   label: 'pólizas activas' },
          { icon: '🤝', value: '100%',     label: 'confianza' },
        ].map(({ icon, value, label }) => (
          <div key={label} style={{
            background: 'rgba(196,169,107,0.08)',
            border: '1px solid rgba(196,169,107,0.2)',
            borderRadius: '12px',
            padding: '12px 16px',
            textAlign: 'center',
            minWidth: '90px',
          }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</div>
            <div style={{ color: '#C4A96B', fontSize: '15px', fontWeight: 700 }}>{value}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p style={{
        position: 'relative', zIndex: 1,
        color: 'rgba(255,255,255,0.2)',
        fontSize: '11px', letterSpacing: '0.05em',
        margin: 0,
      }}>
        ggs-gt.com
      </p>
    </div>
  )
}

/* ── Mobile brand header ─────────────────────────────────────────── */
function MobileBrandHeader() {
  return (
    <div style={{
      background: '#111111',
      padding: '24px 20px 20px',
      textAlign: 'center',
    }}>
      <svg viewBox="0 0 260 160" width="120" height="74" style={{ display: 'block', margin: '0 auto 6px' }}>
        <circle cx="68"  cy="80" r="55" fill="none" stroke="#C4A96B" strokeWidth="7"/>
        <circle cx="148" cy="80" r="55" fill="none" stroke="#C4A96B" strokeWidth="7"/>
        <rect   x="183"  y="25" width="72" height="110" rx="2" fill="none" stroke="#C4A96B" strokeWidth="7"/>
        <text x="64"  y="80" textAnchor="middle" dominantBaseline="central"
              fontFamily="Georgia, 'Times New Roman', serif" fontSize="50" fill="#C4A96B">G</text>
        <text x="144" y="80" textAnchor="middle" dominantBaseline="central"
              fontFamily="Georgia, 'Times New Roman', serif" fontSize="50" fill="#C4A96B">G</text>
        <text x="219" y="80" textAnchor="middle" dominantBaseline="central"
              fontFamily="Georgia, 'Times New Roman', serif" fontSize="50" fill="#C4A96B">S</text>
      </svg>
      <p style={{
        color: '#C4A96B', fontSize: '9px', fontWeight: 400,
        letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0,
      }}>GRUPO GLOBAL EN SEGUROS</p>
    </div>
  )
}

/* ── Shared input / button styles ───────────────────────────────── */
const inputStyle = {
  width: '100%',
  padding: '13px 14px',
  border: '1.5px solid #e2e8f0',
  borderRadius: '10px',
  fontSize: '15px',
  boxSizing: 'border-box',
  color: '#111111',
  background: 'white',
  outline: 'none',
  transition: 'border-color 0.15s',
}

const btnPrimary = (disabled) => ({
  width: '100%', padding: '14px',
  background: disabled ? '#C5C5BE' : '#C4A96B',
  color: 'white', border: 'none', borderRadius: '10px',
  fontSize: '15px', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
  letterSpacing: '0.02em',
  transition: 'background 0.15s',
})

const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: 600,
  color: '#374151', marginBottom: '7px',
}

/* ── Login component ─────────────────────────────────────────────── */
export default function Login() {
  const [mode, setMode]         = useState('login')   // 'login' | 'forgot'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [sent, setSent]         = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message === 'Invalid login credentials'
      ? 'Correo o contraseña incorrectos'
      : error.message)
    setLoading(false)
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  /* Wrapper: full screen split layout */
  const pageWrap = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'row',
    background: '#F7F5F2',
  }

  /* Right / form panel */
  const formPanel = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 32px',
    background: '#FAFAF9',
  }

  const formBox = {
    width: '100%',
    maxWidth: '380px',
  }

  /* ── Sent confirmation ── */
  if (mode === 'forgot' && sent) return (
    <div style={pageWrap}>
      <BrandPanel />
      <div style={formPanel}>
        <div style={{ ...formBox, textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '16px' }}>📧</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111111', marginBottom: '8px' }}>
            Revisá tu correo
          </h2>
          <p style={{ color: '#6B6B62', fontSize: '14px', lineHeight: '1.65' }}>
            Enviamos un enlace a <strong>{email}</strong> para restablecer tu contraseña.
          </p>
          <button onClick={() => { setSent(false); setMode('login') }}
            style={{ marginTop: '24px', color: '#C4A96B', background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>
            ← Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  )

  /* ── Forgot password ── */
  if (mode === 'forgot') return (
    <div style={pageWrap}>
      <BrandPanel />
      <div style={formPanel}>
        <div style={formBox}>
          {/* Header */}
          <div style={{ marginBottom: '36px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111111', marginBottom: '6px' }}>
              Restablecer contraseña
            </h1>
            <p style={{ color: '#6B6B62', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
              Ingresá tu correo y te enviaremos un enlace.
            </p>
          </div>

          <form onSubmit={handleForgot}>
            <label style={labelStyle}>Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@correo.com" required style={{ ...inputStyle, marginBottom: '20px' }} />
            {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '14px', margin: '0 0 14px' }}>{error}</p>}
            <button type="submit" disabled={loading} style={btnPrimary(loading)}>
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>

          <button onClick={() => { setMode('login'); setError('') }}
            style={{
              width: '100%', marginTop: '12px', padding: '13px',
              background: 'white', color: '#64748b',
              border: '1.5px solid #e2e8f0', borderRadius: '10px',
              fontSize: '14px', cursor: 'pointer', fontWeight: 500,
            }}>
            ← Volver
          </button>
        </div>
      </div>
    </div>
  )

  /* ── Login ── */
  return (
    <div style={pageWrap}>

      {/* Left brand panel — hidden on very small screens */}
      <style>{`
        @media (max-width: 700px) {
          .ggs-brand-panel  { display: none !important; }
          .ggs-mobile-brand { display: block !important; }
          .ggs-form-panel   { justify-content: flex-start !important; padding-top: 0 !important; }
        }
        @media (min-width: 701px) {
          .ggs-mobile-brand { display: none !important; }
        }
      `}</style>

      <BrandPanel />

      {/* Right form panel */}
      <div className="ggs-form-panel" style={formPanel}>

        {/* Mobile-only brand header (shown instead of left panel) */}
        <div className="ggs-mobile-brand" style={{ width: '100%', marginBottom: '0', display: 'none' }}>
          <MobileBrandHeader />
        </div>

        <div style={{ ...formBox, paddingTop: '0' }}>

          {/* Heading */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#111111', marginBottom: '6px' }}>
              Bienvenido de vuelta
            </h1>
            <p style={{ color: '#6B6B62', fontSize: '14px', margin: 0 }}>
              Iniciá sesión para continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin}>
            <label style={labelStyle}>Correo electrónico</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@correo.com" required
              style={{ ...inputStyle, marginBottom: '18px' }}
            />

            <label style={labelStyle}>Contraseña</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              style={{ ...inputStyle, marginBottom: '24px' }}
            />

            {error && (
              <div style={{
                background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px',
                padding: '10px 14px', marginBottom: '18px',
                color: '#ef4444', fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={btnPrimary(loading)}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          {/* Forgot link */}
          <div style={{ textAlign: 'center', marginTop: '18px' }}>
            <button onClick={() => { setMode('forgot'); setError('') }}
              style={{ color: '#C4A96B', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
              Olvidé mi contraseña
            </button>
          </div>

          {/* Footer note */}
          <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '11px', color: '#CBD5E1' }}>
            Acceso seguro · Solo usuarios autorizados
          </p>
        </div>
      </div>
    </div>
  )
}

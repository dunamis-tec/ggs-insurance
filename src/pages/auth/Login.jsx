import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0C1E3D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '48px 40px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ background: '#0C1E3D', color: '#C8A84B', fontWeight: 800, fontSize: '18px', padding: '6px 12px', borderRadius: '8px' }}>GGS</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0C1E3D', margin: '12px 0 4px' }}>Grupo Global en Seguros</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Sistema de gestión de pólizas</p>
        </div>

        {!sent ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', transition: 'border 0.2s' }}
                onFocus={e => e.target.style.borderColor = '#1A6BBA'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '13px', background: loading ? '#94a3b8' : '#0C1E3D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
            >
              {loading ? 'Enviando...' : 'Enviar código de acceso'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0C1E3D', marginBottom: '8px' }}>Revisá tu correo</h
git add .
git commit -m "login con magic link"
git push origin main
cat > vercel.json << 'EOF'
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}

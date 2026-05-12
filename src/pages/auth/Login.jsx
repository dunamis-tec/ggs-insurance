import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [mode, setMode]       = useState('login')   // 'login' | 'forgot'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [sent, setSent]       = useState(false)

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
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  const cardStyle = {
    minHeight: '100vh', background: '#111111',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px',
  }
  const boxStyle = {
    background: 'white', borderRadius: '16px', padding: '48px 40px',
    width: '100%', maxWidth: '420px',
  }
  const inputStyle = {
    width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box',
    marginBottom: '14px', color: '#111111',
  }
  const btnStyle = (disabled) => ({
    width: '100%', padding: '13px', background: disabled ? '#C5C5BE' : '#C4A96B',
    color: 'white', border: 'none', borderRadius: '8px',
    fontSize: '15px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
  })

  /* ── Forgot: confirmation ── */
  if (mode === 'forgot' && sent) return (
    <div style={cardStyle}>
      <div style={{...boxStyle, textAlign: 'center'}}>
        <div style={{fontSize:'48px', marginBottom:'16px'}}>📧</div>
        <h2 style={{fontSize:'18px', fontWeight:700, color:'#111111', marginBottom:'8px'}}>Revisá tu correo</h2>
        <p style={{color:'#64748b', fontSize:'14px', lineHeight:'1.6'}}>
          Enviamos un enlace a <strong>{email}</strong> para restablecer tu contraseña.
        </p>
        <button onClick={()=>{ setSent(false); setMode('login') }}
          style={{marginTop:'20px', color:'#C4A96B', background:'none', border:'none', fontSize:'14px', cursor:'pointer', textDecoration:'underline'}}>
          Volver al inicio de sesión
        </button>
      </div>
    </div>
  )

  /* ── Forgot password ── */
  if (mode === 'forgot') return (
    <div style={cardStyle}>
      <div style={boxStyle}>
        <div style={{textAlign:'center', marginBottom:'28px'}}>
          <img src="/ggs-logo.svg" alt="GGS" style={{height:'80px', width:'auto', marginBottom:'8px'}}/>
          <h2 style={{fontSize:'17px', fontWeight:700, color:'#111111', marginTop:'12px'}}>Restablecer contraseña</h2>
          <p style={{color:'#6B6B62', fontSize:'13px', marginTop:'4px'}}>
            Ingresá tu correo y te enviaremos un enlace.
          </p>
        </div>
        <form onSubmit={handleForgot}>
          <label style={{display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px'}}>
            Correo electrónico
          </label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="tu@correo.com" required style={inputStyle}/>
          {error && <p style={{color:'#ef4444', fontSize:'13px', marginBottom:'12px'}}>{error}</p>}
          <button type="submit" disabled={loading} style={btnStyle(loading)}>
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>
        <button onClick={()=>{ setMode('login'); setError('') }}
          style={{width:'100%', marginTop:'12px', padding:'11px', background:'white', color:'#64748b',
            border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', cursor:'pointer'}}>
          ← Volver
        </button>
      </div>
    </div>
  )

  /* ── Login ── */
  return (
    <div style={cardStyle}>
      <div style={boxStyle}>
        <div style={{textAlign:'center', marginBottom:'32px'}}>
          <img src="/ggs-logo.svg" alt="GGS" style={{height:'100px', width:'auto', marginBottom:'8px'}}/>
          <p style={{color:'#6B6B62', fontSize:'13px', marginTop:'6px'}}>Sistema de gestión de pólizas</p>
        </div>
        <form onSubmit={handleLogin}>
          <label style={{display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px'}}>
            Correo electrónico
          </label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="tu@correo.com" required style={inputStyle}/>
          <label style={{display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px'}}>
            Contraseña
          </label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
            placeholder="••••••••" required style={inputStyle}/>
          {error && <p style={{color:'#ef4444', fontSize:'13px', marginBottom:'12px'}}>{error}</p>}
          <button type="submit" disabled={loading} style={btnStyle(loading)}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <div style={{textAlign:'center', marginTop:'16px'}}>
          <button onClick={()=>{ setMode('forgot'); setError('') }}
            style={{color:'#C4A96B', background:'none', border:'none', fontSize:'13px', cursor:'pointer', textDecoration:'underline'}}>
            Olvidé mi contraseña
          </button>
        </div>
        <p style={{textAlign:'center', marginTop:'20px', fontSize:'12px', color:'#94a3b8'}}>
          Acceso seguro · Solo usuarios autorizados
        </p>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function ResetPassword() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)
  const [validSession, setValidSession] = useState(false)
  const navigate = useNavigate()

  // Supabase redirects here with the recovery token in the URL hash.
  // onAuthStateChange fires PASSWORD_RECOVERY when it detects the token.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setValidSession(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6)  { setError('Mínimo 6 caracteres'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setLoading(false)
    setTimeout(() => navigate('/'), 2500)
  }

  const cardStyle = {
    minHeight: '100vh', background: '#111111',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
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

  if (done) return (
    <div style={cardStyle}>
      <div style={{...boxStyle, textAlign:'center'}}>
        <div style={{fontSize:'48px', marginBottom:'16px'}}>✅</div>
        <h2 style={{fontSize:'18px', fontWeight:700, color:'#111111', marginBottom:'8px'}}>
          Contraseña actualizada
        </h2>
        <p style={{color:'#64748b', fontSize:'14px'}}>Redirigiendo al sistema...</p>
      </div>
    </div>
  )

  if (!validSession) return (
    <div style={cardStyle}>
      <div style={{...boxStyle, textAlign:'center'}}>
        <div style={{fontSize:'48px', marginBottom:'16px'}}>🔗</div>
        <h2 style={{fontSize:'17px', fontWeight:700, color:'#111111', marginBottom:'8px'}}>
          Esperando enlace válido…
        </h2>
        <p style={{color:'#64748b', fontSize:'14px', lineHeight:'1.6'}}>
          Hacé clic en el enlace de tu correo para establecer tu contraseña.
          Si llegaste aquí por error, volvé a solicitar el enlace.
        </p>
        <button onClick={()=>navigate('/login')}
          style={{marginTop:'20px', color:'#C4A96B', background:'none', border:'none', fontSize:'14px', cursor:'pointer', textDecoration:'underline'}}>
          Ir al inicio de sesión
        </button>
      </div>
    </div>
  )

  return (
    <div style={cardStyle}>
      <div style={boxStyle}>
        <div style={{textAlign:'center', marginBottom:'28px'}}>
          <img src="/ggs-logo.svg" alt="GGS" style={{height:'80px', width:'auto'}}/>
          <h2 style={{fontSize:'17px', fontWeight:700, color:'#111111', marginTop:'16px'}}>
            Nueva contraseña
          </h2>
          <p style={{color:'#6B6B62', fontSize:'13px', marginTop:'4px'}}>
            Ingresá y confirmá tu nueva contraseña.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px'}}>
            Nueva contraseña
          </label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres" required style={inputStyle}/>
          <label style={{display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px'}}>
            Confirmar contraseña
          </label>
          <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}
            placeholder="Repetí la contraseña" required style={inputStyle}/>
          {error && <p style={{color:'#ef4444', fontSize:'13px', marginBottom:'12px'}}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{width:'100%', padding:'13px', background: loading ? '#C5C5BE' : '#C4A96B',
              color:'white', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:600,
              cursor: loading ? 'not-allowed' : 'pointer'}}>
            {loading ? 'Guardando...' : 'Establecer contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}

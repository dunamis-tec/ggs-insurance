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

  if (sent) return (
    <div style={{minHeight:'100vh',background:'#0C1E3D',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:'16px',padding:'48px 40px',width:'100%',maxWidth:'420px',textAlign:'center'}}>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>📧</div>
        <h2 style={{fontSize:'18px',fontWeight:700,color:'#0C1E3D',marginBottom:'8px'}}>Revisá tu correo</h2>
        <p style={{color:'#64748b',fontSize:'14px',lineHeight:'1.6'}}>Enviamos un enlace a <strong>{email}</strong>. Hacé clic para ingresar.</p>
        <button onClick={()=>setSent(false)} style={{marginTop:'20px',color:'#1A6BBA',background:'none',border:'none',fontSize:'14px',cursor:'pointer',textDecoration:'underline'}}>Usar otro correo</button>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0C1E3D',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:'16px',padding:'48px 40px',width:'100%',maxWidth:'420px'}}>
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <span style={{background:'#0C1E3D',color:'#C8A84B',fontWeight:800,fontSize:'18px',padding:'6px 12px',borderRadius:'8px'}}>GGS</span>
          <h1 style={{fontSize:'22px',fontWeight:700,color:'#0C1E3D',margin:'12px 0 4px'}}>Grupo Global en Seguros</h1>
          <p style={{color:'#64748b',fontSize:'14px'}}>Sistema de gestión de pólizas</p>
        </div>
        <form onSubmit={handleLogin}>
          <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'6px'}}>Correo electrónico</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@correo.com" required
            style={{width:'100%',padding:'12px 14px',border:'1.5px solid #e2e8f0',borderRadius:'8px',fontSize:'15px',boxSizing:'border-box',marginBottom:'16px'}} />
          {error && <p style={{color:'#ef4444',fontSize:'13px',marginBottom:'12px'}}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{width:'100%',padding:'13px',background:loading?'#94a3b8':'#0C1E3D',color:'white',border:'none',borderRadius:'8px',fontSize:'15px',fontWeight:600,cursor:'pointer'}}>
            {loading ? 'Enviando...' : 'Enviar código de acceso'}
          </button>
        </form>
        <p style={{textAlign:'center',marginTop:'24px',fontSize:'12px',color:'#94a3b8'}}>Acceso seguro · Solo usuarios autorizados</p>
      </div>
    </div>
  )
}

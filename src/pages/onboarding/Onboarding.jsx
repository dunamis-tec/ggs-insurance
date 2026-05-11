import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Building2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Onboarding({ session, onComplete }) {
  const [step, setStep] = useState(1) // 1=bienvenida, 2=datos empresa
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: '', nombre_corto: '', nit: '', telefono: '', email: '', direccion: '', website: ''
  })

  const inp = {
    width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px',
    fontSize: '14px', background: 'white', color: '#1e293b', boxSizing: 'border-box'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('El nombre de la empresa es obligatorio'); return }
    setSaving(true)
    try {
      // 1. Create empresa
      const { data: empresa, error: empError } = await supabase
        .from('configuracion_empresa')
        .insert({ ...form, updated_by: session.user.id })
        .select('id')
        .single()
      if (empError) throw empError

      // 2. Upsert user row with empresa_id and admin role
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: session.user.id,
          email: session.user.email,
          empresa_id: empresa.id,
          rol: 'admin',
          role: 'admin',
          activo: true,
        }, { onConflict: 'id' })
      if (userError) throw userError

      toast.success('¡Empresa configurada!')
      onComplete()
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', background: '#111111', borderRadius: '14px', marginBottom: '16px' }}>
            <Building2 size={28} color='white' />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111111', margin: 0 }}>Bienvenido</h1>
          <p style={{ color: '#64748b', marginTop: '6px', fontSize: '15px' }}>Configuremos tu empresa para comenzar</p>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111111', margin: 0 }}>Datos de tu empresa</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
              Esta información aparecerá en documentos y reportes generados
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            {/* Nombre */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Nombre de la empresa <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Grupo Global en Seguros" required style={inp} />
            </div>

            {/* Nombre corto + NIT */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Nombre corto</label>
                <input value={form.nombre_corto} onChange={e => setForm(f => ({ ...f, nombre_corto: e.target.value }))} placeholder="Ej: GGS" style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>NIT</label>
                <input value={form.nit} onChange={e => setForm(f => ({ ...f, nit: e.target.value }))} placeholder="12345678-9" style={inp} />
              </div>
            </div>

            {/* Teléfono + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Teléfono</label>
                <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="2222-3333" style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@empresa.com" style={inp} />
              </div>
            </div>

            {/* Dirección */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Dirección</label>
              <input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} placeholder="Ciudad, País" style={inp} />
            </div>

            <button type="submit" disabled={saving}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', background: saving ? '#94a3b8' : '#111111', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Configurando...' : <><span>Comenzar</span><ArrowRight size={18} /></>}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '16px' }}>
          Iniciado como <strong>{session?.user?.email}</strong>
        </p>
      </div>
    </div>
  )
}

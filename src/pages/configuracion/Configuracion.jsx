import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Settings, Building2, Users, Save, Edit2, Plus, Trash2, Shield, User } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState('empresa')
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
        setCurrentUser(data)
      }
    }
    fetchUser()
  }, [])

  const isAdmin = currentUser?.rol === 'admin'

  return (
    <div>
      <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden', marginBottom:'20px' }}>
        <div style={{ padding:'20px 24px', background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'10px', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Settings size={22} color='white' />
            </div>
            <div style={{ textAlign:'left' }}>
              <h1 style={{ fontSize:'22px', fontWeight:700, color:'white', margin:0 }}>Configuración</h1>
              <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'14px', marginTop:'4px', marginBottom:0 }}>Administración del sistema</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[['empresa', Building2, 'Empresa'], ['usuarios', Users, 'Usuarios'], ['miPerfil', User, 'Mi perfil']].map(([tab, Icon, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', background: activeTab === tab ? '#0C1E3D' : 'white', color: activeTab === tab ? 'white' : '#64748b', border: '1px solid ' + (activeTab === tab ? '#0C1E3D' : '#e2e8f0') }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'empresa' && <TabEmpresa isAdmin={isAdmin} />}
      {activeTab === 'usuarios' && <TabUsuarios isAdmin={isAdmin} currentUser={currentUser} />}
      {activeTab === 'miPerfil' && <TabMiPerfil currentUser={currentUser} onUpdate={setCurrentUser} />}
    </div>
  )
}

function TabEmpresa({ isAdmin }) {
  const [empresa, setEmpresa] = useState(null)
  const [form, setForm] = useState({})
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchEmpresa() }, [])

  const fetchEmpresa = async () => {
    const { data } = await supabase.from('configuracion_empresa').select('*').single()
    setEmpresa(data)
    setForm(data || {})
    setLoading(false)
  }

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('configuracion_empresa').update({ ...form, updated_at: new Date().toISOString(), updated_by: user?.id }).eq('id', empresa.id)
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Información actualizada')
    setEditing(false)
    fetchEmpresa()
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', color: '#1e293b', boxSizing: 'border-box' }
  const readOnly = { ...inp, background: '#f8fafc', color: '#64748b' }

  if (loading) return <p style={{ color: '#64748b' }}>Cargando...</p>

  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', maxWidth: '700px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={20} color='#1A6BBA' />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0C1E3D' }}>Información de la empresa</h2>
            <p style={{ fontSize: '12px', color: '#64748b' }}>Datos que aparecen en documentos y reportes</p>
          </div>
        </div>
        {isAdmin && !editing && (
          <button onClick={() => setEditing(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0C1E3D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            <Edit2 size={13} /> Editar
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[
          ['nombre', 'Nombre de la empresa *', 'text'],
          ['nombre_corto', 'Nombre corto', 'text'],
          ['nit', 'NIT', 'text'],
          ['telefono', 'Teléfono', 'text'],
          ['email', 'Email', 'email'],
          ['website', 'Sitio web', 'text'],
        ].map(([key, label, type]) => (
          <div key={key}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>{label}</label>
            <input type={type} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
              readOnly={!editing} style={editing ? inp : readOnly} />
          </div>
        ))}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Dirección</label>
          <input value={form.direccion || ''} onChange={e => setForm({ ...form, direccion: e.target.value })}
            readOnly={!editing} style={editing ? inp : readOnly} />
        </div>
      </div>

      {editing && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#0C1E3D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            <Save size={14} /> Guardar cambios
          </button>
          <button onClick={() => { setEditing(false); setForm(empresa) }} style={{ padding: '10px 20px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      )}

      {!isAdmin && (
        <div style={{ marginTop: '16px', padding: '10px 14px', background: '#fef9c3', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={14} color='#a16207' />
          <p style={{ fontSize: '12px', color: '#a16207' }}>Solo los administradores pueden editar la información de la empresa</p>
        </div>
      )}
    </div>
  )
}

function TabUsuarios({ isAdmin, currentUser }) {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteNombre, setInviteNombre] = useState('')
  const [inviteRol, setInviteRol] = useState('agente')
  const [inviting, setInviting] = useState(false)

  useEffect(() => { fetchUsuarios() }, [])

  const fetchUsuarios = async () => {
    setLoading(true)
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    setUsuarios(data || [])
    setLoading(false)
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviting(true)
    const { error } = await supabase.auth.admin?.inviteUserByEmail?.(inviteEmail) || {}
    // Como no tenemos admin API en el frontend, insertamos en users y enviamos magic link
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: inviteEmail,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin }
    })
    if (authError) { toast.error('Error al invitar: ' + authError.message); setInviting(false); return }
    // Guardar datos del usuario pendiente
    await supabase.from('users').upsert({ email: inviteEmail, nombre: inviteNombre, rol: inviteRol }, { onConflict: 'email' })
    toast.success('Invitación enviada a ' + inviteEmail)
    setInviteEmail('')
    setInviteNombre('')
    setInviteRol('agente')
    setShowInvite(false)
    setInviting(false)
    fetchUsuarios()
  }

  const cambiarRol = async (userId, nuevoRol) => {
    if (userId === currentUser?.id) { toast.error('No podés cambiar tu propio rol'); return }
    await supabase.from('users').update({ rol: nuevoRol }).eq('id', userId)
    toast.success('Rol actualizado')
    fetchUsuarios()
  }

  const toggleActivo = async (userId, activo) => {
    if (userId === currentUser?.id) { toast.error('No podés desactivarte a vos mismo'); return }
    await supabase.from('users').update({ activo: !activo }).eq('id', userId)
    toast.success(!activo ? 'Usuario activado' : 'Usuario desactivado')
    fetchUsuarios()
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', color: '#1e293b', boxSizing: 'border-box' }

  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0C1E3D' }}>Usuarios del sistema</h2>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{usuarios.length} usuarios registrados</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowInvite(!showInvite)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0C1E3D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} /> Invitar usuario
          </button>
        )}
      </div>

      {showInvite && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>Invitar nuevo usuario</p>
          <form onSubmit={handleInvite}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Nombre</label>
                <input value={inviteNombre} onChange={e => setInviteNombre(e.target.value)} placeholder='Nombre completo' style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Email *</label>
                <input type='email' value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required placeholder='correo@ejemplo.com' style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Rol</label>
                <select value={inviteRol} onChange={e => setInviteRol(e.target.value)} style={inp}>
                  <option value='agente'>Agente</option>
                  <option value='admin'>Administrador</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type='submit' disabled={inviting} style={{ padding: '8px 18px', background: '#0C1E3D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {inviting ? 'Enviando...' : 'Enviar invitación'}
              </button>
              <button type='button' onClick={() => setShowInvite(false)} style={{ padding: '8px 14px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <p style={{ padding: '20px', color: '#64748b' }}>Cargando...</p> :
        usuarios.map((u, i) => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < usuarios.length - 1 ? '1px solid #f1f5f9' : 'none', opacity: u.activo === false ? 0.5 : 1 }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: u.rol === 'admin' ? '#fef3c7' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0 }}>
              <User size={16} color={u.rol === 'admin' ? '#d97706' : '#1A6BBA'} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, color: '#0C1E3D', fontSize: '14px' }}>{u.nombre || 'Sin nombre'} {u.id === currentUser?.id ? <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>(vos)</span> : ''}</p>
              <p style={{ fontSize: '12px', color: '#64748b' }}>{u.email}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {isAdmin && u.id !== currentUser?.id ? (
                <select value={u.rol || 'agente'} onChange={e => cambiarRol(u.id, e.target.value)}
                  style={{ padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', background: 'white', color: '#374151', cursor: 'pointer' }}>
                  <option value='agente'>Agente</option>
                  <option value='admin'>Admin</option>
                </select>
              ) : (
                <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: u.rol === 'admin' ? '#fef3c7' : '#dbeafe', color: u.rol === 'admin' ? '#d97706' : '#1d4ed8', fontWeight: 500 }}>
                  {u.rol === 'admin' ? 'Admin' : 'Agente'}
                </span>
              )}
              {isAdmin && u.id !== currentUser?.id && (
                <button onClick={() => toggleActivo(u.id, u.activo !== false)}
                  style={{ padding: '5px 10px', background: u.activo === false ? '#dcfce7' : '#fef2f2', color: u.activo === false ? '#15803d' : '#ef4444', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}>
                  {u.activo === false ? 'Activar' : 'Desactivar'}
                </button>
              )}
            </div>
          </div>
        ))}

      {!isAdmin && (
        <div style={{ padding: '12px 20px', background: '#fef9c3', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={14} color='#a16207' />
          <p style={{ fontSize: '12px', color: '#a16207' }}>Solo los administradores pueden gestionar usuarios</p>
        </div>
      )}
    </div>
  )
}

function TabMiPerfil({ currentUser, onUpdate }) {
  const [form, setForm] = useState({ nombre: '', telefono: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (currentUser) setForm({ nombre: currentUser.nombre || '', telefono: currentUser.telefono || '' })
  }, [currentUser])

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('users').update({ nombre: form.nombre, telefono: form.telefono }).eq('id', currentUser.id)
    if (error) { toast.error('Error al guardar'); setSaving(false); return }
    toast.success('Perfil actualizado')
    onUpdate({ ...currentUser, ...form })
    setSaving(false)
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', color: '#1e293b', boxSizing: 'border-box' }

  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', maxWidth: '500px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={24} color='#1A6BBA' />
        </div>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0C1E3D' }}>{currentUser?.nombre || 'Mi perfil'}</h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>{currentUser?.email}</p>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: currentUser?.rol === 'admin' ? '#fef3c7' : '#dbeafe', color: currentUser?.rol === 'admin' ? '#d97706' : '#1d4ed8', fontWeight: 500 }}>
            {currentUser?.rol === 'admin' ? 'Administrador' : 'Agente'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Nombre completo</label>
          <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder='Tu nombre' style={inp} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Teléfono</label>
          <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder='Tu teléfono' style={inp} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Email</label>
          <input value={currentUser?.email || ''} readOnly style={{ ...inp, background: '#f8fafc', color: '#64748b' }} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#0C1E3D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
        <Save size={14} /> {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}
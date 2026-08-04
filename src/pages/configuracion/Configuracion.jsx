import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getMyEmpresaId } from '../../lib/getMyEmpresaId'
import { Settings, Building2, Users, Save, Edit2, Plus, Shield, User, Upload, X, Car, Trash2 } from 'lucide-react'
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
      <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', marginBottom:'20px' }}>
        <div style={{ padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:'22px', fontWeight:700, color:'#111111', margin:0 }}>Configuración</h1>
            <p style={{ color:'#6B6B62', fontSize:'14px', marginTop:'4px', marginBottom:0 }}>Administración del sistema</p>
          </div>
          <Settings size={22} color='#C4A96B' />
        </div>
      </div>

      <div style={{ display:'flex', gap:'8px', marginBottom:'20px', flexWrap:'wrap' }}>
        {[
          ['empresa', Building2, 'Empresa'],
          ['usuarios', Users, 'Usuarios'],
          ['miPerfil', User, 'Mi perfil'],
          ...(isAdmin ? [['vehiculos', Car, 'Vehículos']] : []),
        ].map(([tab, Icon, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ display:'flex', alignItems:'center', gap:'7px', padding:'8px 18px', borderRadius:'8px', fontSize:'14px', fontWeight:500, cursor:'pointer', background:activeTab===tab?'#111111':'white', color:activeTab===tab?'white':'#64748b', border:'1px solid '+(activeTab===tab?'#111111':'#e2e8f0') }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'empresa'   && <TabEmpresa isAdmin={isAdmin} />}
      {activeTab === 'usuarios'  && <TabUsuarios isAdmin={isAdmin} currentUser={currentUser} />}
      {activeTab === 'miPerfil'  && <TabMiPerfil currentUser={currentUser} onUpdate={setCurrentUser} />}
      {activeTab === 'vehiculos' && isAdmin && <TabVehiculos />}
    </div>
  )
}

/* ─── TAB EMPRESA ──────────────────────────────────────────────── */
function TabEmpresa({ isAdmin }) {
  const [empresa, setEmpresa]   = useState(null)
  const [form, setForm]         = useState({})
  const [editing, setEditing]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { fetchEmpresa() }, [])

  const fetchEmpresa = async () => {
    const { data } = await supabase.from('configuracion_empresa').select('*').single()
    setEmpresa(data)
    setForm(data || {})
    setLoading(false)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('El logo debe ser menor a 2MB'); return }
    setUploading(true)
    const ext = file.name.split('.').pop()
    const eid = await getMyEmpresaId()
    const fileName = `${eid}/empresa_logo_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true })
    if (error) { toast.error('Error al subir logo'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName)
    setForm(f => ({ ...f, logo_url: publicUrl }))
    setUploading(false)
    toast.success('Logo cargado — guarda los cambios para aplicar')
  }

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('configuracion_empresa')
      .update({ ...form, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq('id', empresa.id)
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Información actualizada')
    setEditing(false)
    fetchEmpresa()
    // Notifica al sidebar para que actualice el logo
    window.dispatchEvent(new CustomEvent('companyLogoUpdated', { detail: form.logo_url }))
  }

  const inp = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', background:'white', color:'#1e293b', boxSizing:'border-box' }
  const readOnly = { ...inp, background:'#f8fafc', color:'#64748b' }

  if (loading) return <p style={{ color:'#64748b' }}>Cargando...</p>

  return (
    <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', padding:'24px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'44px', height:'44px', borderRadius:'10px', background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Building2 size={20} color='#C4A96B' />
          </div>
          <div>
            <h2 style={{ fontSize:'16px', fontWeight:700, color:'#111111' }}>Información de la empresa</h2>
            <p style={{ fontSize:'12px', color:'#64748b' }}>Datos que aparecen en documentos y reportes</p>
          </div>
        </div>
        {isAdmin && !editing && (
          <button onClick={() => setEditing(true)}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'#111111', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
            <Edit2 size={13} /> Editar
          </button>
        )}
      </div>

      {/* Logo de la empresa */}
      <div style={{ marginBottom:'24px', paddingBottom:'24px', borderBottom:'1px solid #f1f5f9' }}>
        <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'12px' }}>Logo de la empresa</label>
        <div style={{ display:'flex', alignItems:'center', gap:'20px', flexWrap:'wrap' }}>
          {/* Preview */}
          <div style={{ width:'80px', height:'80px', borderRadius:'12px', border:'2px solid #e2e8f0', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
            {form.logo_url
              ? <img src={form.logo_url} alt='Logo' style={{ width:'100%', height:'100%', objectFit:'contain' }} />
              : <span style={{ background:'#C8A84B', color:'#111111', fontWeight:800, fontSize:'18px', padding:'6px 10px', borderRadius:'8px' }}>GGS</span>
            }
          </div>
          {/* Upload */}
          <div>
            <p style={{ fontSize:'12px', color:'#64748b', marginBottom:'8px' }}>Se muestra en el menú lateral y documentos. PNG o SVG recomendado.</p>
            {editing ? (
              <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                <label style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'#111111', color:'white', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
                  <Upload size={13} />
                  {uploading ? 'Subiendo...' : 'Subir logo'}
                  <input type='file' accept='image/*' onChange={handleLogoUpload} disabled={uploading} style={{ display:'none' }} />
                </label>
                {form.logo_url && (
                  <button type='button' onClick={() => setForm(f => ({ ...f, logo_url: null }))}
                    style={{ display:'flex', alignItems:'center', gap:'4px', padding:'8px 12px', background:'#fef2f2', color:'#ef4444', border:'1px solid #fecaca', borderRadius:'8px', fontSize:'12px', cursor:'pointer' }}>
                    <X size={12} /> Quitar
                  </button>
                )}
              </div>
            ) : (
              <p style={{ fontSize:'12px', color:'#94a3b8' }}>{form.logo_url ? 'Logo configurado ✓' : 'Sin logo — se muestra "GGS"'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Campos */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px' }}>
        {[
          ['nombre',       'Nombre de la empresa *', 'text'],
          ['nombre_corto', 'Nombre corto',           'text'],
          ['nit',          'NIT',                    'text'],
          ['telefono',     'Teléfono',               'text'],
          ['email',        'Email',                  'email'],
          ['website',      'Sitio web',              'text'],
        ].map(([key, label, type]) => (
          <div key={key}>
            <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'4px' }}>{label}</label>
            <input type={type} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: ['nombre','nombre_corto'].includes(key) ? e.target.value.toUpperCase() : e.target.value })}
              readOnly={!editing} style={editing ? {...inp, textTransform:['nombre','nombre_corto'].includes(key)?'uppercase':'none'} : {...readOnly, textTransform:['nombre','nombre_corto'].includes(key)?'uppercase':'none'}} />
          </div>
        ))}
        <div style={{ gridColumn:'1/-1' }}>
          <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'4px' }}>Dirección</label>
          <input value={form.direccion || ''} onChange={e => setForm({ ...form, direccion: e.target.value.toUpperCase() })}
            readOnly={!editing} style={editing ? {...inp, textTransform:'uppercase'} : {...readOnly, textTransform:'uppercase'}} />
        </div>
      </div>

      {editing && (
        <div style={{ display:'flex', gap:'8px', marginTop:'20px', paddingTop:'16px', borderTop:'1px solid #f1f5f9' }}>
          <button onClick={handleSave}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 20px', background:'#111111', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
            <Save size={14} /> Guardar cambios
          </button>
          <button onClick={() => { setEditing(false); setForm(empresa) }}
            style={{ padding:'10px 20px', background:'white', color:'#64748b', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', cursor:'pointer' }}>
            Cancelar
          </button>
        </div>
      )}

      {!isAdmin && (
        <div style={{ marginTop:'16px', padding:'10px 14px', background:'#fef9c3', borderRadius:'8px', display:'flex', alignItems:'center', gap:'8px' }}>
          <Shield size={14} color='#a16207' />
          <p style={{ fontSize:'12px', color:'#a16207' }}>Solo los administradores pueden editar la información de la empresa</p>
        </div>
      )}
    </div>
  )
}

/* ─── MODAL BASE ───────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
      zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'white', borderRadius:'16px', width:'100%', maxWidth:'460px',
        boxShadow:'0 20px 60px rgba(0,0,0,0.25)', overflow:'hidden',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px', borderBottom:'1px solid #f1f5f9' }}>
          <h3 style={{ fontSize:'16px', fontWeight:700, color:'#111111', margin:0 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'#f1f5f9', border:'none', borderRadius:'8px', width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <X size={14} color='#64748b' />
          </button>
        </div>
        <div style={{ padding:'20px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── TAB USUARIOS ─────────────────────────────────────────────── */
function TabUsuarios({ isAdmin, currentUser }) {
  const [usuarios, setUsuarios]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [editUser, setEditUser]     = useState(null)   // user object being edited

  useEffect(() => { fetchUsuarios() }, [])

  const fetchUsuarios = async () => {
    setLoading(true)
    // Use RPC to also get last_sign_in_at from auth.users
    const { data } = await supabase.rpc('list_users_with_auth_status')
    setUsuarios(data || [])
    setLoading(false)
  }

  const rolLabel = (rol) => rol === 'admin' ? 'Admin' : 'Agente'
  const rolColors = (rol) => rol === 'admin'
    ? { background:'#FDF8EE', color:'#C4A96B' }
    : { background:'#f1f5f9', color:'#64748b' }

  return (
    <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #f1f5f9', flexWrap:'wrap', gap:'10px' }}>
        <div>
          <h2 style={{ fontSize:'16px', fontWeight:700, color:'#111111' }}>Usuarios del sistema</h2>
          <p style={{ fontSize:'12px', color:'#64748b', marginTop:'2px' }}>{usuarios.length} usuarios registrados</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowInvite(true)}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'#111111', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
            <Plus size={14} /> Invitar usuario
          </button>
        )}
      </div>

      {/* User list */}
      {loading ? <p style={{ padding:'20px', color:'#64748b' }}>Cargando...</p> :
        usuarios.map((u, i) => {
          const isMe = u.id === currentUser?.id
          const inactivo = u.activo === false
          return (
            <div key={u.id}
              onClick={() => isAdmin && !isMe && setEditUser(u)}
              style={{
                display:'flex', alignItems:'center', padding:'14px 20px',
                borderBottom: i < usuarios.length - 1 ? '1px solid #f1f5f9' : 'none',
                opacity: inactivo ? 0.5 : 1,
                cursor: isAdmin && !isMe ? 'pointer' : 'default',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (isAdmin && !isMe) e.currentTarget.style.background = '#f8fafc' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {/* Avatar */}
              <div style={{ width:'38px', height:'38px', borderRadius:'50%', background: rolColors(u.rol).background, display:'flex', alignItems:'center', justifyContent:'center', marginRight:'12px', flexShrink:0 }}>
                <User size={16} color={rolColors(u.rol).color} />
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:600, color:'#111111', fontSize:'14px', margin:0 }}>
                  {u.nombre || 'Sin nombre'}
                  {isMe && <span style={{ fontSize:'11px', color:'#94a3b8', fontWeight:400, marginLeft:'6px' }}>(vos)</span>}
                  {inactivo && <span style={{ fontSize:'11px', color:'#ef4444', fontWeight:500, marginLeft:'6px' }}>· Desactivado</span>}
                </p>
                <p style={{ fontSize:'12px', color:'#64748b', margin:0 }}>{u.email}</p>
              </div>

              {/* Role badge + edit hint */}
              <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
                <span style={{ fontSize:'12px', padding:'4px 10px', borderRadius:'20px', fontWeight:600, ...rolColors(u.rol) }}>
                  {rolLabel(u.rol)}
                </span>
                {isAdmin && !isMe && (
                  <div style={{ width:'28px', height:'28px', borderRadius:'6px', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Edit2 size={12} color='#94a3b8' />
                  </div>
                )}
              </div>
            </div>
          )
        })
      }

      {!isAdmin && (
        <div style={{ padding:'12px 20px', background:'#fef9c3', display:'flex', alignItems:'center', gap:'8px' }}>
          <Shield size={14} color='#a16207' />
          <p style={{ fontSize:'12px', color:'#a16207' }}>Solo los administradores pueden gestionar usuarios</p>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onSuccess={() => { setShowInvite(false); fetchUsuarios() }} />
      )}

      {/* Edit modal */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={() => { setEditUser(null); fetchUsuarios() }}
        />
      )}
    </div>
  )
}

/* ─── INVITE MODAL ─────────────────────────────────────────────── */
function InviteModal({ onClose, onSuccess }) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail]   = useState('')
  const [rol, setRol]       = useState('agente')
  const [loading, setLoading] = useState(false)

  const inp = { width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', background:'white', color:'#1e293b', boxSizing:'border-box', outline:'none' }
  const lbl = { display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'5px' }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const empresa_id = await getMyEmpresaId()
    if (!empresa_id) { toast.error('No se pudo obtener empresa'); setLoading(false); return }
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, nombre, rol, empresa_id }),
      }
    )
    const json = await res.json()
    if (!res.ok || json.error) { toast.error('Error: ' + (json.error || 'Error desconocido')); setLoading(false); return }
    toast.success('Invitación enviada a ' + email)
    onSuccess()
  }

  return (
    <Modal title='Invitar usuario' onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ display:'flex', flexDirection:'column', gap:'14px', marginBottom:'20px' }}>
          <div>
            <label style={lbl}>Nombre completo</label>
            <input value={nombre} onChange={e => setNombre(e.target.value.toUpperCase())} placeholder='Ej. María García' style={{...inp, textTransform:'uppercase'}} />
          </div>
          <div>
            <label style={lbl}>Correo electrónico *</label>
            <input type='email' value={email} onChange={e => setEmail(e.target.value)} required placeholder='correo@ejemplo.com' style={inp} />
          </div>
          <div>
            <label style={lbl}>Rol</label>
            <select value={rol} onChange={e => setRol(e.target.value)} style={inp}>
              <option value='agente'>Agente</option>
              <option value='admin'>Administrador</option>
            </select>
          </div>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button type='submit' disabled={loading}
            style={{ flex:1, padding:'11px', background:'#111111', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
            {loading ? 'Enviando...' : 'Enviar invitación'}
          </button>
          <button type='button' onClick={onClose}
            style={{ padding:'11px 18px', background:'white', color:'#64748b', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', cursor:'pointer' }}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ─── EDIT USER MODAL ──────────────────────────────────────────── */
function EditUserModal({ user, onClose, onSuccess }) {
  const [nombre, setNombre]         = useState(user.nombre || '')
  const [email, setEmail]           = useState(user.email || '')
  const [rol, setRol]               = useState(user.rol || 'agente')
  const [activo, setActivo]         = useState(user.activo !== false)
  const [loading, setLoading]       = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const inp = { width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', background:'white', color:'#1e293b', boxSizing:'border-box', outline:'none' }
  const lbl = { display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'5px' }

  // If last_sign_in_at is null the user has never logged in → "re-invite"
  // If they have logged in at least once → "reset password"
  const hasLoggedIn = !!user.last_sign_in_at
  const emailAction  = hasLoggedIn ? 'reset_password' : 'invite'
  const emailLabel   = hasLoggedIn ? 'Restablecer contraseña' : 'Reenviar invitación'

  const handleSave = async () => {
    setLoading(true)
    const { error } = await supabase.from('users')
      .update({ nombre, email, rol, activo })
      .eq('id', user.id)
    if (error) { toast.error('Error al guardar'); setLoading(false); return }
    toast.success('Usuario actualizado')
    onSuccess()
  }

  const handleSendEmail = async () => {
    setEmailLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-send-user-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: user.email, action: emailAction }),
      }
    )
    const json = await res.json()
    if (!res.ok || json.error) {
      toast.error('Error: ' + (json.error || 'Error desconocido'))
    } else {
      toast.success(hasLoggedIn ? 'Correo de restablecimiento enviado' : 'Invitación reenviada')
    }
    setEmailLoading(false)
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    const { error } = await supabase.rpc('admin_delete_user', { target_uid: user.id })
    if (error) {
      toast.error('Error al eliminar: ' + error.message)
      setDeleteLoading(false)
      setConfirmDelete(false)
      return
    }
    toast.success(`Usuario ${user.nombre || user.email} eliminado`)
    onSuccess()
  }

  return (
    <Modal title='Editar usuario' onClose={onClose}>
      {/* ── Confirm delete overlay ── */}
      {confirmDelete ? (
        <div style={{ textAlign:'center', padding:'8px 0' }}>
          <div style={{ fontSize:'36px', marginBottom:'12px' }}>⚠️</div>
          <p style={{ fontWeight:700, fontSize:'15px', color:'#111111', margin:'0 0 6px' }}>
            ¿Eliminar a {user.nombre || user.email}?
          </p>
          <p style={{ fontSize:'13px', color:'#64748b', marginBottom:'20px', lineHeight:1.5 }}>
            Esta acción es permanente. El usuario perderá acceso al sistema
            y no podrá ser recuperado.
          </p>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={handleDelete} disabled={deleteLoading}
              style={{ flex:1, padding:'11px', background:'#ef4444', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
              {deleteLoading ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
            <button onClick={() => setConfirmDelete(false)}
              style={{ flex:1, padding:'11px', background:'white', color:'#374151', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', cursor:'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display:'flex', flexDirection:'column', gap:'14px', marginBottom:'20px' }}>
            <div>
              <label style={lbl}>Nombre completo</label>
              <input value={nombre} onChange={e => setNombre(e.target.value.toUpperCase())} placeholder='Nombre completo' style={{...inp, textTransform:'uppercase'}} />
            </div>
            <div>
              <label style={lbl}>Correo electrónico</label>
              <input type='email' value={email} onChange={e => setEmail(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Rol</label>
              <select value={rol} onChange={e => setRol(e.target.value)} style={inp}>
                <option value='agente'>Agente</option>
                <option value='admin'>Administrador</option>
              </select>
            </div>

            {/* Active toggle */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:'#f8fafc', borderRadius:'10px', border:'1.5px solid #e2e8f0' }}>
              <div>
                <p style={{ fontSize:'14px', fontWeight:600, color:'#111111', margin:0 }}>Estado de la cuenta</p>
                <p style={{ fontSize:'12px', color:'#64748b', margin:'2px 0 0' }}>{activo ? 'Puede iniciar sesión' : 'No puede iniciar sesión'}</p>
              </div>
              <button type='button' onClick={() => setActivo(a => !a)}
                style={{ width:'44px', height:'24px', borderRadius:'12px', border:'none', cursor:'pointer', flexShrink:0, background: activo ? '#C4A96B' : '#e2e8f0', position:'relative', transition:'background 0.2s' }}>
                <span style={{ position:'absolute', top:'2px', width:'20px', height:'20px', background:'white', borderRadius:'50%', transition:'left 0.2s', left: activo ? '22px' : '2px', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>

            {/* Email action: re-invite or reset password */}
            <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:'14px', display:'flex', flexDirection:'column', gap:'8px' }}>
              <p style={{ fontSize:'12px', color:'#94a3b8', margin:0 }}>
                {hasLoggedIn
                  ? `Último acceso: ${new Date(user.last_sign_in_at).toLocaleDateString('es-GT', { day:'2-digit', month:'short', year:'numeric' })}`
                  : 'El usuario aún no ha iniciado sesión'}
              </p>
              <button type='button' onClick={handleSendEmail} disabled={emailLoading}
                style={{ width:'100%', padding:'10px', background:'#FBF5E6', color:'#7A5A1E', border:'1.5px solid #E8D9B0', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer', textAlign:'center' }}>
                {emailLoading ? 'Enviando...' : `✉️  ${emailLabel}`}
              </button>
            </div>
          </div>

          {/* Footer actions */}
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={handleSave} disabled={loading}
              style={{ flex:1, padding:'11px', background:'#111111', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button onClick={onClose}
              style={{ padding:'11px 18px', background:'white', color:'#64748b', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', cursor:'pointer' }}>
              Cancelar
            </button>
          </div>

          {/* Delete — separated visually */}
          <div style={{ marginTop:'12px', borderTop:'1px solid #fef2f2', paddingTop:'12px' }}>
            <button type='button' onClick={() => setConfirmDelete(true)}
              style={{ width:'100%', padding:'10px', background:'white', color:'#ef4444', border:'1.5px solid #fecaca', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
              🗑  Eliminar usuario
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

/* ─── TAB MI PERFIL ────────────────────────────────────────────── */
function TabMiPerfil({ currentUser, onUpdate }) {
  const [form, setForm]     = useState({ nombre:'', telefono:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (currentUser) setForm({ nombre: currentUser.nombre||'', telefono: currentUser.telefono||'' })
  }, [currentUser])

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('users').update({ nombre: form.nombre, telefono: form.telefono }).eq('id', currentUser.id)
    if (error) { toast.error('Error al guardar'); setSaving(false); return }
    toast.success('Perfil actualizado')
    onUpdate({ ...currentUser, ...form })
    setSaving(false)
  }

  const inp = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', background:'white', color:'#1e293b', boxSizing:'border-box' }

  return (
    <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', padding:'24px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'24px', paddingBottom:'20px', borderBottom:'1px solid #f1f5f9' }}>
        <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <User size={26} color='#C4A96B' />
        </div>
        <div>
          <h2 style={{ fontSize:'17px', fontWeight:700, color:'#111111' }}>{currentUser?.nombre || 'Mi perfil'}</h2>
          <p style={{ fontSize:'13px', color:'#64748b', margin:'2px 0 6px' }}>{currentUser?.email}</p>
          <span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'20px', background:currentUser?.rol==='admin'?'#fef3c7':'#dbeafe', color:currentUser?.rol==='admin'?'#d97706':'#1d4ed8', fontWeight:500 }}>
            {currentUser?.rol==='admin'?'Administrador':'Agente'}
          </span>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px', marginBottom:'20px' }}>
        <div>
          <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'4px' }}>Nombre completo</label>
          <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value.toUpperCase() })} placeholder='Tu nombre' style={{...inp, textTransform:'uppercase'}} />
        </div>
        <div>
          <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'4px' }}>Teléfono</label>
          <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder='Tu teléfono' style={inp} />
        </div>
        <div>
          <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'4px' }}>Email</label>
          <input value={currentUser?.email || ''} readOnly style={{ ...inp, background:'#f8fafc', color:'#64748b' }} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 20px', background:'#111111', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
        <Save size={14} /> {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}

/* ─── TAB VEHÍCULOS ─────────────────────────────────────────────── */
const DEFAULT_TIPOS = ['Sedan', 'Pickup', 'SUV', 'Van', 'Moto', 'Camion', 'Otro']

function TabVehiculos() {
  const [tipos, setTipos]     = useState([])
  const [loading, setLoading] = useState(true)
  const [newNombre, setNewNombre] = useState('')
  const [saving, setSaving]   = useState(false)
  const [empresaId, setEmpresaId] = useState(null)

  useEffect(() => { init() }, [])

  const init = async () => {
    const eid = await getMyEmpresaId()
    setEmpresaId(eid)
    const { data } = await supabase.from('tipos_vehiculo').select('*').eq('empresa_id', eid).order('orden')
    if (!data || data.length === 0) {
      // Seed defaults on first load
      const inserts = DEFAULT_TIPOS.map((nombre, i) => ({ empresa_id: eid, nombre, orden: i + 1 }))
      const { data: seeded } = await supabase.from('tipos_vehiculo').insert(inserts).select().order('orden')
      setTipos(seeded || [])
    } else {
      setTipos(data)
    }
    setLoading(false)
  }

  const handleAdd = async () => {
    const nombre = newNombre.trim().toUpperCase()
    if (!nombre) return
    if (tipos.some(t => t.nombre.toUpperCase() === nombre)) { toast.error('Ya existe ese tipo'); return }
    setSaving(true)
    const orden = tipos.length > 0 ? Math.max(...tipos.map(t => t.orden)) + 1 : 1
    const { data, error } = await supabase.from('tipos_vehiculo').insert({ empresa_id: empresaId, nombre, orden }).select().single()
    if (error) { toast.error('Error: ' + error.message) }
    else { setTipos(prev => [...prev, data]); setNewNombre(''); toast.success('Tipo agregado') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este tipo de vehículo?')) return
    const { error } = await supabase.from('tipos_vehiculo').delete().eq('id', id)
    if (error) { toast.error('Error: ' + error.message) }
    else { setTipos(prev => prev.filter(t => t.id !== id)); toast.success('Tipo eliminado') }
  }

  const inp = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', outline:'none', boxSizing:'border-box', background:'white' }

  if (loading) return <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',padding:'32px',textAlign:'center',color:'#94a3b8'}}>Cargando...</div>

  return (
    <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden' }}>
      <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:'8px' }}>
        <Car size={16} color='#C4A96B'/>
        <div>
          <h2 style={{ fontSize:'16px', fontWeight:700, color:'#111111', margin:0 }}>Tipos de vehículo</h2>
          <p style={{ fontSize:'13px', color:'#64748b', margin:'2px 0 0' }}>Catálogo de tipos disponibles al registrar un vehículo</p>
        </div>
      </div>

      <div style={{ padding:'20px 24px' }}>
        {/* Add new */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
          <input value={newNombre} onChange={e => setNewNombre(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder='Nuevo tipo (ej. CAMIONETA)'
            style={{ ...inp, textTransform:'uppercase', flex:1 }} />
          <button onClick={handleAdd} disabled={saving || !newNombre.trim()}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 18px', background:'#111111', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer', flexShrink:0, opacity: !newNombre.trim()?0.5:1 }}>
            <Plus size={14}/> Agregar
          </button>
        </div>

        {/* List */}
        {tipos.length === 0 ? (
          <p style={{ color:'#94a3b8', textAlign:'center', padding:'20px 0' }}>Sin tipos configurados</p>
        ) : (
          <div style={{ border:'1px solid #f1f5f9', borderRadius:'8px', overflow:'hidden' }}>
            {tipos.map((t, i) => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', padding:'12px 16px', borderBottom: i<tipos.length-1?'1px solid #f1f5f9':'none', background:'white' }}>
                <Car size={14} color='#C4A96B' style={{ marginRight:'10px', flexShrink:0 }}/>
                <span style={{ flex:1, fontSize:'14px', color:'#111111', fontWeight:500 }}>{t.nombre}</span>
                <button onClick={() => handleDelete(t.id)}
                  style={{ display:'flex', alignItems:'center', gap:'4px', padding:'5px 10px', background:'#fef2f2', color:'#ef4444', border:'1px solid #fecaca', borderRadius:'6px', fontSize:'12px', cursor:'pointer', fontWeight:500 }}>
                  <Trash2 size={12}/> Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

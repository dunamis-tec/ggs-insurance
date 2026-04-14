import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Users, Plus, Search, ArrowLeft, Edit2, Trash2, FileText, CreditCard, UserPlus, X, Building2, User, Phone, Mail, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const tiposCliente = ['prospecto', 'individual', 'empresa']
const emptyCliente = { nombre:'', apellido:'', tipo:'individual', email:'', telefono:'', nit:'', direccion:'', conglomerado_id:'', razon_social:'', nombre_empresa:'', contacto_nombre:'', contacto_apellido:'', contacto_telefono:'', contacto_email:'', contacto_cargo:'' }
const emptyPF = { nombre:'', apellido:'', nit:'', email:'', telefono:'', direccion:'' }

const tipoColors = { prospecto:{ bg:'#fef9c3', color:'#a16207' }, individual:{ bg:'#dbeafe', color:'#1d4ed8' }, empresa:{ bg:'#fef3c7', color:'#d97706' } }
const tipoIcons = { prospecto: User, individual: User, empresa: Building2 }

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [conglomerados, setConglomerados] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyCliente)
  const [editing, setEditing] = useState(null)
  const [conglomeradoSearch, setConglomeradoSearch] = useState('')
  const [showConglomeradoDropdown, setShowConglomeradoDropdown] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: cData }, { data: congData }] = await Promise.all([
      supabase.from('clientes').select('*, conglomerados(id, nombre), personas_facturables(nombre, apellido, nit)').eq('activo', true).order('nombre'),
      supabase.from('conglomerados').select('id, nombre').eq('activo', true).order('nombre')
    ])
    setClientes(cData || [])
    setConglomerados(congData || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Validar regla: no puede volver a prospecto
    if (editing) {
      const original = clientes.find(c => c.id === editing)
      if (original) {
        if (original.tipo === 'empresa' && form.tipo !== 'empresa') {
          toast.error('Una empresa no puede cambiar a otro tipo de cliente')
          return
        }
        if (original.tipo === 'individual' && form.tipo !== 'individual') {
          toast.error('Un cliente individual no puede cambiar de tipo')
          return
        }
      }
    }
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      nombre: form.nombre,
      apellido: form.apellido || null,
      tipo: form.tipo,
      email: form.email || null,
      telefono: form.telefono || null,
      nit: form.nit || null,
      direccion: form.direccion || null,
      conglomerado_id: form.conglomerado_id || null,
      razon_social: form.razon_social || null,
      nombre_empresa: form.nombre_empresa || null,
      contacto_nombre: form.contacto_nombre || null,
      contacto_apellido: form.contacto_apellido || null,
      contacto_telefono: form.contacto_telefono || null,
      contacto_email: form.contacto_email || null,
      contacto_cargo: form.contacto_cargo || null,
    }
    if (editing) {
      const { error } = await supabase.from('clientes').update(payload).eq('id', editing)
      if (error) { toast.error('Error: ' + error.message); return }
      toast.success('Cliente actualizado')
    } else {
      const { error } = await supabase.from('clientes').insert({ ...payload, created_by: user?.id })
      if (error) { toast.error('Error: ' + error.message); return }
      toast.success('Cliente creado')
    }
    setForm(emptyCliente)
    setEditing(null)
    setView('list')
    fetchAll()
  }

  const handleEdit = (c) => {
    setForm({
      nombre: c.nombre || '', apellido: c.apellido || '', tipo: c.tipo,
      email: c.email || '', telefono: c.telefono || '', nit: c.nit || '',
      direccion: c.direccion || '', conglomerado_id: c.conglomerado_id || '',
      razon_social: c.razon_social || '', nombre_empresa: c.nombre_empresa || '',
      contacto_nombre: c.contacto_nombre || '', contacto_apellido: c.contacto_apellido || '',
      contacto_telefono: c.contacto_telefono || '', contacto_email: c.contacto_email || '',
      contacto_cargo: c.contacto_cargo || ''
    })
    const cong = conglomerados.find(x => x.id === c.conglomerado_id)
    setConglomeradoSearch(cong?.nombre || '')
    setEditing(c.id)
    setView('form')
    window.scrollTo(0, 0)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar cliente?')) return
    await supabase.from('clientes').update({ activo: false }).eq('id', id)
    toast.success('Cliente eliminado')
    fetchAll()
  }

  const filtered = clientes.filter(c => {
    const pfTexto = (c.personas_facturables || []).map(p => `${p.nombre} ${p.apellido||''} ${p.nit||''}`).join(' ')
    const matchSearch = ((c.nombre||'') + ' ' + (c.apellido||'') + ' ' + (c.email||'') + ' ' + (c.nit||'') + ' ' + (c.telefono||'') + ' ' + (c.razon_social||'') + ' ' + (c.nombre_empresa||'') + ' ' + (c.conglomerados?.nombre||'') + ' ' + pfTexto).toLowerCase().includes(search.toLowerCase())
    const matchTipo = filtroTipo === 'todos' || c.tipo === filtroTipo
    return matchSearch && matchTipo
  })

  const congFiltered = conglomerados.filter(c => c.nombre.toLowerCase().includes(conglomeradoSearch.toLowerCase()))
  const selectedCong = conglomerados.find(c => c.id === form.conglomerado_id)

  const inp = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', background:'white', color:'#1e293b', boxSizing:'border-box' }
  const labelStyle = { display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'4px' }

  const getNombreDisplay = (c) => c.tipo === 'empresa' ? (c.razon_social || c.nombre_empresa || c.nombre) : `${c.nombre} ${c.apellido||''}`.trim()

  if (view === 'detalle' && selected) return (
    <ClienteDetalle cliente={selected} conglomerados={conglomerados} onBack={() => { setSelected(null); setView('list'); fetchAll() }} onEdit={handleEdit} />
  )

  if (view === 'form') return (
    <div>
      <button onClick={() => { setView('list'); setEditing(null); setForm(emptyCliente); setConglomeradoSearch('') }}
        style={{ display:'flex', alignItems:'center', gap:'6px', color:'#64748b', background:'none', border:'none', cursor:'pointer', fontSize:'14px', marginBottom:'20px', padding:'0' }}>
        <ArrowLeft size={16} /> Volver a clientes
      </button>

      <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden', maxWidth:'800px' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9', background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)' }}>
          <h2 style={{ fontSize:'18px', fontWeight:700, color:'white', margin:0 }}>{editing ? 'Editar cliente' : 'Nuevo cliente'}</h2>
          <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.7)', marginTop:'4px', marginBottom:0 }}>Completá la información del cliente</p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding:'24px' }}>
          {(!editing || clientes.find(c => c.id === editing)?.tipo === 'prospecto') && (
          <div style={{ marginBottom:'20px' }}>
            <label style={labelStyle}>Tipo de cliente *</label>
            <div style={{ display:'flex', gap:'8px' }}>
              {tiposCliente.map(t => {
                const original = editing ? clientes.find(c => c.id === editing) : null
                const disabled = original?.tipo === 'prospecto' && t === 'prospecto'
                return (
                  <button key={t} type='button' onClick={() => setForm({ ...form, tipo: t })}
                    style={{ flex:1, padding:'10px', borderRadius:'8px', fontSize:'13px', fontWeight:500, cursor:'pointer',
                      background: form.tipo === t ? '#0C1E3D' : 'white',
                      color: form.tipo === t ? 'white' : '#64748b',
                      border: `1px solid ${form.tipo === t ? '#0C1E3D' : '#e2e8f0'}` }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>
          )}
          {form.tipo === 'empresa' ? (
            <>
              <p style={{ fontSize:'13px', fontWeight:600, color:'#0C1E3D', marginBottom:'12px', paddingBottom:'8px', borderBottom:'1px solid #f1f5f9' }}>📋 Datos de la empresa</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'20px' }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={labelStyle}>Razón social *</label>
                  <input value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} required style={inp} placeholder='Ej: Empresa S.A.' />
                </div>
                <div>
                  <label style={labelStyle}>Nombre comercial</label>
                  <input value={form.nombre_empresa} onChange={e => setForm({ ...form, nombre_empresa: e.target.value })} style={inp} placeholder='Nombre que usa comercialmente' />
                </div>
                <div>
                  <label style={labelStyle}>NIT *</label>
                  <input value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} required style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type='email' value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={labelStyle}>Dirección</label>
                  <input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} style={inp} />
                </div>
              </div>
              <p style={{ fontSize:'13px', fontWeight:600, color:'#0C1E3D', marginBottom:'12px', paddingBottom:'8px', borderBottom:'1px solid #f1f5f9' }}>👤 Persona de contacto</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'20px' }}>
                <div>
                  <label style={labelStyle}>Nombre *</label>
                  <input value={form.contacto_nombre} onChange={e => setForm({ ...form, contacto_nombre: e.target.value })} required style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>Apellido</label>
                  <input value={form.contacto_apellido} onChange={e => setForm({ ...form, contacto_apellido: e.target.value })} style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>Cargo</label>
                  <input value={form.contacto_cargo} onChange={e => setForm({ ...form, contacto_cargo: e.target.value })} style={inp} placeholder='Ej: Gerente, Administrador' />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono directo</label>
                  <input value={form.contacto_telefono} onChange={e => setForm({ ...form, contacto_telefono: e.target.value })} style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>Email directo</label>
                  <input type='email' value={form.contacto_email} onChange={e => setForm({ ...form, contacto_email: e.target.value })} style={inp} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'20px' }}>
                <div>
                  <label style={labelStyle}>Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>Apellido</label>
                  <input value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>NIT</label>
                  <input value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type='email' value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>Dirección</label>
                  <input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} style={inp} />
                </div>
              </div>
            </>
          )}

          <div style={{ marginBottom:'20px' }}>
            <label style={labelStyle}>Conglomerado <span style={{ color:'#94a3b8', fontWeight:400 }}>(opcional)</span></label>
            <div style={{ position:'relative' }}>
              <input value={selectedCong ? selectedCong.nombre : conglomeradoSearch}
                onChange={e => { setConglomeradoSearch(e.target.value); setForm({ ...form, conglomerado_id:'' }); setShowConglomeradoDropdown(true) }}
                onFocus={() => setShowConglomeradoDropdown(true)}
                placeholder='Buscar conglomerado...' style={inp} />
              {form.conglomerado_id && (
                <button type='button' onClick={() => { setForm({ ...form, conglomerado_id:'' }); setConglomeradoSearch('') }}
                  style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer' }}>
                  <X size={14} color='#94a3b8' />
                </button>
              )}
              {showConglomeradoDropdown && congFiltered.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #e2e8f0', borderRadius:'8px', zIndex:100, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', maxHeight:'180px', overflowY:'auto' }}>
                  {congFiltered.map(c => (
                    <div key={c.id} onClick={() => { setForm({ ...form, conglomerado_id:c.id }); setConglomeradoSearch(c.nombre); setShowConglomeradoDropdown(false) }}
                      style={{ padding:'10px 14px', cursor:'pointer', fontSize:'13px', color:'#1e293b' }}
                      onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background='white'}>
                      {c.nombre}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display:'flex', gap:'8px', paddingTop:'16px', borderTop:'1px solid #f1f5f9' }}>
            <button type='submit' style={{ padding:'11px 24px', background:'#0C1E3D', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
              {editing ? 'Actualizar cliente' : 'Crear cliente'}
            </button>
            <button type='button' onClick={() => { setView('list'); setEditing(null); setForm(emptyCliente); setConglomeradoSearch('') }}
              style={{ padding:'11px 24px', background:'white', color:'#64748b', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', cursor:'pointer' }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden', marginBottom:'20px' }}>
  <div style={{ padding:'20px 24px', background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
    <div style={{ textAlign:'left' }}>
      <h1 style={{ fontSize:'22px', fontWeight:700, color:'white', margin:0 }}>Clientes</h1>
      <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'14px', marginTop:'4px', marginBottom:0 }}>{clientes.length} clientes · {clientes.filter(c=>c.tipo==='empresa').length} empresas · {clientes.filter(c=>c.tipo==='prospecto').length} prospectos</p>
    </div>
    <button onClick={() => { setView('form'); setEditing(null); setForm(emptyCliente); setConglomeradoSearch('') }}
      style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 20px', background:'rgba(255,255,255,0.2)', color:'white', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
      <Plus size={16} /> Nuevo cliente
    </button>
  </div>
</div>

      <div style={{ background:'white', borderRadius:'12px', padding:'14px 16px', border:'1px solid #e2e8f0', marginBottom:'16px', display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:1, minWidth:'200px', position:'relative' }}>
          <Search size={16} color='#94a3b8' style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Buscar por nombre, NIT, teléfono, conglomerado...'
            style={{ width:'100%', padding:'9px 12px 9px 36px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', background:'white', color:'#1e293b', boxSizing:'border-box' }} />
        </div>
        <div style={{ display:'flex', gap:'6px' }}>
          {['todos', ...tiposCliente].map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)}
              style={{ padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', fontWeight:500,
                background: filtroTipo === t ? '#0C1E3D' : 'white',
                color: filtroTipo === t ? 'white' : '#64748b',
                border: `1px solid ${filtroTipo === t ? '#0C1E3D' : '#e2e8f0'}` }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden' }}>
        {loading ? <p style={{ padding:'24px', color:'#64748b' }}>Cargando...</p> :
          filtered.length === 0 ? (
            <div style={{ padding:'48px', textAlign:'center' }}>
              <Users size={32} color='#cbd5e1' style={{ marginBottom:'12px' }} />
              <p style={{ color:'#94a3b8' }}>No hay clientes registrados</p>
            </div>
          ) : filtered.map((c, i) => {
            const Icon = tipoIcons[c.tipo] || User
            const colors = tipoColors[c.tipo] || tipoColors.individual
            return (
              <div key={c.id} style={{ display:'flex', alignItems:'center', padding:'14px 20px', borderBottom: i < filtered.length-1 ? '1px solid #f1f5f9' : 'none', cursor:'pointer' }}
                onClick={() => { setSelected(c); setView('detalle') }}
                onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background='white'}>
                <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:colors.bg, display:'flex', alignItems:'center', justifyContent:'center', marginRight:'12px', flexShrink:0 }}>
                  <Icon size={18} color={colors.color} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:700, color:'#0C1E3D', fontSize:'14px', margin:0 }}>{getNombreDisplay(c)}</p>
                  <p style={{ fontSize:'12px', color:'#64748b', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {c.tipo === 'empresa' && c.contacto_nombre ? `Contacto: ${c.contacto_nombre} ${c.contacto_apellido||''} · ` : ''}
                    {c.email || 'Sin email'}{c.telefono ? ` · ${c.telefono}` : ''}{c.conglomerados ? ` · ${c.conglomerados.nombre}` : ''}
                  </p>
                </div>
                <span style={{ fontSize:'11px', padding:'3px 10px', borderRadius:'20px', marginRight:'12px', background:colors.bg, color:colors.color, fontWeight:500, flexShrink:0 }}>
                  {c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1)}
                </span>
                <div style={{ display:'flex', gap:'6px', flexShrink:0 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleEdit(c)} style={{ padding:'6px', background:'#f1f5f9', border:'none', borderRadius:'6px', cursor:'pointer' }}><Edit2 size={14} color='#64748b' /></button>
                  <button onClick={() => handleDelete(c.id)} style={{ padding:'6px', background:'#fef2f2', border:'none', borderRadius:'6px', cursor:'pointer' }}><Trash2 size={14} color='#ef4444' /></button>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

function ClienteDetalle({ cliente, conglomerados, onBack, onEdit }) {
  const navigate = useNavigate()
  const [polizas, setPolizas] = useState([])
  const [personas, setPersonas] = useState([])
  const [reqs, setReqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('polizas')
  const [showPFForm, setShowPFForm] = useState(false)
  const [pfForm, setPfForm] = useState(emptyPF)
  const [editingPF, setEditingPF] = useState(null)
  const [filtroReqEstado, setFiltroReqEstado] = useState('todos')

  useEffect(() => { fetchData() }, [cliente.id])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: pData }, { data: pfData }] = await Promise.all([
      supabase.from('polizas').select('*, aseguradoras(nombre, logo_url), productos(nombre)').eq('cliente_id', cliente.id).eq('activa', true).order('created_at', { ascending: false }),
      supabase.from('personas_facturables').select('*').eq('cliente_id', cliente.id).eq('activa', true).order('nombre'),
    ])
    setPolizas(pData || [])
    setPersonas(pfData || [])
    const polizaIds = (pData || []).map(p => p.id)
    if (polizaIds.length > 0) {
      const { data: reqData } = await supabase.from('requerimientos_pago')
        .select('*, polizas(numero_poliza)')
        .in('poliza_id', polizaIds)
        .order('fecha_vencimiento', { ascending: true })
      setReqs(reqData || [])
    } else {
      setReqs([])
    }
    setLoading(false)
  }

  const handlePFSubmit = async (e) => {
    e.preventDefault()
    if (editingPF) {
      const { error } = await supabase.from('personas_facturables').update({ ...pfForm }).eq('id', editingPF)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Persona facturable actualizada')
    } else {
      const { error } = await supabase.from('personas_facturables').insert({ ...pfForm, cliente_id: cliente.id })
      if (error) { toast.error('Error al crear'); return }
      toast.success('Persona facturable creada')
    }
    setPfForm(emptyPF)
    setEditingPF(null)
    setShowPFForm(false)
    fetchData()
  }

  const handlePFEdit = (pf) => {
    setPfForm({ nombre: pf.nombre, apellido: pf.apellido||'', nit: pf.nit||'', email: pf.email||'', telefono: pf.telefono||'', direccion: pf.direccion||'' })
    setEditingPF(pf.id)
    setShowPFForm(true)
  }

  const handlePFDelete = async (id) => {
    if (!confirm('¿Eliminar persona facturable?')) return
    await supabase.from('personas_facturables').update({ activa: false }).eq('id', id)
    toast.success('Eliminada')
    fetchData()
  }

  const marcarPagado = async (id) => {
    await supabase.from('requerimientos_pago').update({ estado:'pagado', fecha_pago: new Date().toISOString().split('T')[0] }).eq('id', id)
    toast.success('Marcado como pagado')
    fetchData()
  }

  const getNombreDisplay = () => cliente.tipo === 'empresa'
    ? (cliente.razon_social || cliente.nombre_empresa || cliente.nombre)
    : `${cliente.nombre} ${cliente.apellido||''}`.trim()

  const reqsFiltrados = reqs.filter(r => filtroReqEstado === 'todos' || r.estado === filtroReqEstado)
  const totalPagado = reqs.filter(r=>r.estado==='pagado').reduce((s,r)=>s+parseFloat(r.monto||0),0)
  const totalPendiente = reqs.filter(r=>r.estado!=='pagado').reduce((s,r)=>s+parseFloat(r.monto||0),0)

  const inp = { width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', background:'white', color:'#1e293b', boxSizing:'border-box' }
  const Icon = tipoIcons[cliente.tipo] || User
  const colors = tipoColors[cliente.tipo] || tipoColors.individual

  return (
    <div>
      <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:'6px', color:'#64748b', background:'none', border:'none', cursor:'pointer', fontSize:'14px', marginBottom:'20px', padding:'0' }}>
        <ArrowLeft size={16} /> Volver a clientes
      </button>

      {/* Header */}
      <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden', marginBottom:'16px' }}>
        <div style={{ padding:'20px 24px', background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{ width:'52px', height:'52px', borderRadius:'12px', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon size={24} color='white' />
            </div>
            <div>
              <h1 style={{ fontSize:'20px', fontWeight:700, color:'white', margin:0 }}>{getNombreDisplay()}</h1>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'4px' }}>
                <span style={{ fontSize:'12px', padding:'2px 8px', borderRadius:'20px', background:'rgba(255,255,255,0.2)', color:'white', fontWeight:500 }}>
                  {cliente.tipo.charAt(0).toUpperCase() + cliente.tipo.slice(1)}
                </span>
                {cliente.conglomerados && <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.7)' }}>· {cliente.conglomerados.nombre}</span>}
              </div>
            </div>
          </div>
          <button onClick={() => onEdit(cliente)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'rgba(255,255,255,0.2)', color:'white', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer', flexShrink:0 }}>
            <Edit2 size={13} /> Editar
          </button>
        </div>

        <div style={{ padding:'16px 24px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'12px' }}>
          {cliente.tipo === 'empresa' ? (
            <>
              {cliente.nit && <InfoCard icon={<CreditCard size={14} color='#1A6BBA'/>} label='NIT' value={cliente.nit} />}
              {cliente.telefono && <InfoCard icon={<Phone size={14} color='#1A6BBA'/>} label='Teléfono' value={cliente.telefono} />}
              {cliente.email && <InfoCard icon={<Mail size={14} color='#1A6BBA'/>} label='Email' value={cliente.email} />}
              {cliente.contacto_nombre && <InfoCard icon={<User size={14} color='#1A6BBA'/>} label='Contacto' value={`${cliente.contacto_nombre} ${cliente.contacto_apellido||''}`} sub={cliente.contacto_cargo} />}
              {cliente.contacto_telefono && <InfoCard icon={<Phone size={14} color='#1A6BBA'/>} label='Tel. contacto' value={cliente.contacto_telefono} />}
            </>
          ) : (
            <>
              {cliente.nit && <InfoCard icon={<CreditCard size={14} color='#1A6BBA'/>} label='NIT' value={cliente.nit} />}
              {cliente.telefono && <InfoCard icon={<Phone size={14} color='#1A6BBA'/>} label='Teléfono' value={cliente.telefono} />}
              {cliente.email && <InfoCard icon={<Mail size={14} color='#1A6BBA'/>} label='Email' value={cliente.email} />}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
        {[['polizas',`Pólizas (${polizas.length})`],['estado_cuenta',`Estado de cuenta (${reqs.length})`],['personas',`Personas facturables (${personas.length})`]].map(([tab,label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding:'8px 18px', borderRadius:'8px', fontSize:'13px', fontWeight:500, cursor:'pointer',
              background: activeTab===tab ? '#0C1E3D' : 'white',
              color: activeTab===tab ? 'white' : '#64748b',
              border: `1px solid ${activeTab===tab ? '#0C1E3D' : '#e2e8f0'}` }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Pólizas */}
      {activeTab === 'polizas' && (
        <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', background:'#f8fafc' }}>
            <p style={{ fontSize:'14px', fontWeight:600, color:'#374151', margin:0 }}>Pólizas activas</p>
          </div>
          {loading ? <p style={{ padding:'20px', color:'#64748b' }}>Cargando...</p> :
            polizas.length === 0 ? <div style={{ padding:'32px', textAlign:'center' }}><FileText size={28} color='#cbd5e1' style={{ marginBottom:'10px' }} /><p style={{ color:'#94a3b8', margin:0 }}>Sin pólizas activas</p></div> :
              polizas.map((p, i) => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', padding:'14px 20px', borderBottom: i<polizas.length-1 ? '1px solid #f1f5f9' : 'none', cursor:'pointer' }}
                onClick={() => navigate('/polizas', { state: { openPolizaId: p.id } })}
                  onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background='white'}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'8px', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', marginRight:'12px', overflow:'hidden', background:'#f8fafc', flexShrink:0 }}>
                    {p.aseguradoras?.logo_url ? <img src={p.aseguradoras.logo_url} style={{ width:'100%', height:'100%', objectFit:'contain' }} /> : <FileText size={14} color='#1A6BBA' />}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:600, color:'#0C1E3D', fontSize:'13px', margin:0 }}>{p.numero_poliza || 'Sin número'}</p>
                    <p style={{ fontSize:'12px', color:'#64748b', margin:0 }}>{p.aseguradoras?.nombre} · {p.productos?.nombre}</p>
                  </div>
                  <div style={{ textAlign:'right', marginRight:'12px' }}>
                    <p style={{ fontSize:'14px', fontWeight:700, color:'#1A6BBA', margin:0 }}>Q {parseFloat(p.prima_total||0).toLocaleString()}</p>
                    <p style={{ fontSize:'11px', color: new Date(p.fecha_vencimiento)<new Date() ? '#ef4444' : '#64748b', margin:0 }}>
                      Vence: {new Date(p.fecha_vencimiento).toLocaleDateString('es-GT')}
                    </p>
                  </div>
                  <ChevronRight size={16} color='#94a3b8' />
                </div>
              ))}
        </div>
      )}

      {/* Tab: Estado de cuenta */}
      {activeTab === 'estado_cuenta' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'16px' }}>
            {[['Pagado','Q '+totalPagado.toLocaleString(),'#22c55e'],['Pendiente','Q '+totalPendiente.toLocaleString(),'#f59e0b'],['Total',reqs.length,'#1A6BBA']].map(([l,v,c])=>(
              <div key={l} style={{ background:'white', borderRadius:'10px', padding:'14px', border:'1px solid #e2e8f0', borderLeft:`4px solid ${c}` }}>
                <p style={{ fontSize:'12px', color:'#64748b', margin:0 }}>{l}</p>
                <p style={{ fontSize:'16px', fontWeight:700, color:c, margin:'4px 0 0' }}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
              <p style={{ fontSize:'14px', fontWeight:600, color:'#374151', margin:0, flex:1 }}>Requerimientos de pago</p>
              <div style={{ display:'flex', gap:'6px' }}>
                {['todos','pendiente','pagado','vencido'].map(e => (
                  <button key={e} onClick={() => setFiltroReqEstado(e)}
                    style={{ padding:'5px 12px', borderRadius:'6px', fontSize:'12px', cursor:'pointer', fontWeight:500,
                      background: filtroReqEstado===e ? '#0C1E3D' : 'white',
                      color: filtroReqEstado===e ? 'white' : '#64748b',
                      border: `1px solid ${filtroReqEstado===e ? '#0C1E3D' : '#e2e8f0'}` }}>
                    {e.charAt(0).toUpperCase()+e.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {reqsFiltrados.length === 0 ? <div style={{ padding:'32px', textAlign:'center' }}><p style={{ color:'#94a3b8', margin:0 }}>Sin requerimientos</p></div> :
              reqsFiltrados.map((r, i) => (
                <div key={r.id} style={{ display:'flex', alignItems:'center', padding:'12px 20px', borderBottom: i<reqsFiltrados.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:600, color:'#0C1E3D', fontSize:'13px', margin:0 }}>{r.codigo} <span style={{ fontWeight:400, color:'#64748b' }}>· {r.numero_cuota}/{r.total_cuotas}</span></p>
                    <p style={{ fontSize:'12px', color:'#64748b', margin:0 }}>{r.polizas?.numero_poliza || 'Sin póliza'}</p>
                  </div>
                  <p style={{ fontSize:'14px', fontWeight:700, color:'#1e293b', marginRight:'12px' }}>Q {parseFloat(r.monto||0).toLocaleString()}</p>
                  <span style={{ fontSize:'11px', padding:'3px 10px', borderRadius:'20px', marginRight:'8px',
                    background: r.estado==='pagado'?'#dcfce7':r.estado==='vencido'?'#fef2f2':'#fef9c3',
                    color: r.estado==='pagado'?'#15803d':r.estado==='vencido'?'#ef4444':'#a16207', fontWeight:500 }}>
                    {r.estado}
                  </span>
                  {r.estado !== 'pagado' && (
                    <button onClick={() => marcarPagado(r.id)} style={{ padding:'5px 10px', background:'#dcfce7', color:'#15803d', border:'none', borderRadius:'6px', fontSize:'12px', cursor:'pointer' }}>
                      Pagar
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab: Personas facturables */}
      {activeTab === 'personas' && (
        <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #f1f5f9' }}>
            <div>
              <p style={{ fontSize:'14px', fontWeight:600, color:'#0C1E3D', margin:0 }}>Personas facturables</p>
              <p style={{ fontSize:'12px', color:'#64748b', marginTop:'2px', marginBottom:0 }}>Personas a quienes se puede facturar</p>
            </div>
            <button onClick={() => { setShowPFForm(!showPFForm); setPfForm(emptyPF); setEditingPF(null) }}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', background:'#0C1E3D', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
              <UserPlus size={14} /> Nueva persona
            </button>
          </div>

          {showPFForm && (
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', background:'#f8fafc' }}>
              <form onSubmit={handlePFSubmit}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                  {[['nombre','Nombre *',true],['apellido','Apellido',false],['nit','NIT *',true],['email','Email',false],['telefono','Teléfono',false],['direccion','Dirección',false]].map(([key,label,req])=>(
                    <div key={key}>
                      <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'4px' }}>{label}</label>
                      <input value={pfForm[key]} onChange={e => setPfForm({ ...pfForm, [key]: e.target.value })} required={req} style={inp} />
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button type='submit' style={{ padding:'8px 18px', background:'#0C1E3D', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>{editingPF ? 'Actualizar' : 'Crear'}</button>
                  <button type='button' onClick={() => { setShowPFForm(false); setPfForm(emptyPF); setEditingPF(null) }} style={{ padding:'8px 14px', background:'white', color:'#64748b', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', cursor:'pointer' }}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {loading ? <p style={{ padding:'20px', color:'#64748b' }}>Cargando...</p> :
            personas.length === 0 ? (
              <div style={{ padding:'32px', textAlign:'center' }}>
                <UserPlus size={28} color='#cbd5e1' style={{ marginBottom:'10px' }} />
                <p style={{ color:'#94a3b8', margin:0 }}>Sin personas facturables</p>
              </div>
            ) : personas.map((pf, i) => (
              <div key={pf.id} style={{ display:'flex', alignItems:'center', padding:'14px 20px', borderBottom: i<personas.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', marginRight:'12px', flexShrink:0 }}>
                  <CreditCard size={16} color='#15803d' />
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:600, color:'#0C1E3D', fontSize:'14px', margin:0 }}>{pf.nombre} {pf.apellido||''}</p>
                  <p style={{ fontSize:'12px', color:'#64748b', margin:0 }}>NIT: {pf.nit||'N/A'}{pf.email ? ` · ${pf.email}` : ''}</p>
                </div>
                <div style={{ display:'flex', gap:'6px' }}>
                  <button onClick={() => handlePFEdit(pf)} style={{ padding:'6px', background:'#f1f5f9', border:'none', borderRadius:'6px', cursor:'pointer' }}><Edit2 size={14} color='#64748b' /></button>
                  <button onClick={() => handlePFDelete(pf.id)} style={{ padding:'6px', background:'#fef2f2', border:'none', borderRadius:'6px', cursor:'pointer' }}><Trash2 size={14} color='#ef4444' /></button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

function InfoCard({ icon, label, value, sub }) {
  return (
    <div style={{ background:'#f8fafc', borderRadius:'8px', padding:'10px 14px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'3px' }}>
        {icon}
        <p style={{ fontSize:'11px', color:'#64748b', margin:0 }}>{label}</p>
      </div>
      <p style={{ fontSize:'13px', fontWeight:600, color:'#1e293b', margin:0 }}>{value}</p>
      {sub && <p style={{ fontSize:'11px', color:'#94a3b8', margin:0 }}>{sub}</p>}
    </div>
  )
}
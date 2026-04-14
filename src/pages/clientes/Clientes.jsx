import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Users, Plus, Search, ArrowLeft, Edit2, Trash2, FileText, CreditCard, UserPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'

const tiposCliente = ['prospecto', 'individual', 'empresa']
const emptyCliente = { nombre:'', apellido:'', tipo:'individual', email:'', telefono:'', nit:'', direccion:'', conglomerado_id:'' }
const emptyPF = { nombre:'', apellido:'', nit:'', email:'', telefono:'', direccion:'' }

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
      supabase.from('clientes').select('*, conglomerados(id, nombre)').eq('activo', true).order('nombre'),
      supabase.from('conglomerados').select('id, nombre').eq('activo', true).order('nombre')
    ])
    setClientes(cData || [])
    setConglomerados(congData || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { ...form, conglomerado_id: form.conglomerado_id || null, created_by: user?.id }
    if (editing) {
      const { error } = await supabase.from('clientes').update(payload).eq('id', editing)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Cliente actualizado')
    } else {
      const { error } = await supabase.from('clientes').insert(payload)
      if (error) { toast.error('Error al crear'); return }
      toast.success('Cliente creado')
    }
    setForm(emptyCliente)
    setEditing(null)
    setView('list')
    fetchAll()
  }

  const handleEdit = (c) => {
    setForm({ nombre: c.nombre, apellido: c.apellido || '', tipo: c.tipo, email: c.email || '', telefono: c.telefono || '', nit: c.nit || '', direccion: c.direccion || '', conglomerado_id: c.conglomerado_id || '' })
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
    const matchSearch = ((c.nombre || '') + ' ' + (c.apellido || '') + ' ' + (c.email || '') + ' ' + (c.nit || '')).toLowerCase().includes(search.toLowerCase())
    const matchTipo = filtroTipo === 'todos' || c.tipo === filtroTipo
    return matchSearch && matchTipo
  })

  const congFiltered = conglomerados.filter(c => c.nombre.toLowerCase().includes(conglomeradoSearch.toLowerCase()))
  const selectedCong = conglomerados.find(c => c.id === form.conglomerado_id)
  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', color: '#1e293b', boxSizing: 'border-box' }

  if (view === 'detalle' && selected) return (
    <ClienteDetalle cliente={selected} onBack={() => { setSelected(null); setView('list'); fetchAll() }} onEdit={handleEdit} />
  )

  if (view === 'form') return (
    <div>
      <button onClick={() => { setView('list'); setEditing(null); setForm(emptyCliente); setConglomeradoSearch('') }}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '20px', padding: '0' }}>
        <ArrowLeft size={16} /> Volver a clientes
      </button>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', border: '1px solid #e2e8f0', maxWidth: '800px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0C1E3D', marginBottom: '20px' }}>{editing ? 'Editar cliente' : 'Nuevo cliente'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Nombre *</label>
              <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Apellido</label>
              <input value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Tipo *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {tiposCliente.map(t => (
                  <button key={t} type='button' onClick={() => setForm({ ...form, tipo: t })}
                    style={{ flex: 1, padding: '9px 4px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: form.tipo === t ? '#0C1E3D' : 'white', color: form.tipo === t ? 'white' : '#64748b', border: '1px solid ' + (form.tipo === t ? '#0C1E3D' : '#e2e8f0') }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>NIT</label>
              <input value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Email</label>
              <input type='email' value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Teléfono</label>
              <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} style={inp} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Dirección</label>
              <input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} style={inp} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Conglomerado <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
              <div style={{ position: 'relative' }}>
                <input value={selectedCong ? selectedCong.nombre : conglomeradoSearch}
                  onChange={e => { setConglomeradoSearch(e.target.value); setForm({ ...form, conglomerado_id: '' }); setShowConglomeradoDropdown(true) }}
                  onFocus={() => setShowConglomeradoDropdown(true)}
                  placeholder='Buscar conglomerado...' style={inp} />
                {form.conglomerado_id && (
                  <button type='button' onClick={() => { setForm({ ...form, conglomerado_id: '' }); setConglomeradoSearch('') }}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={14} color='#94a3b8' />
                  </button>
                )}
                {showConglomeradoDropdown && congFiltered.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '180px', overflowY: 'auto' }}>
                    {congFiltered.map(c => (
                      <div key={c.id} onClick={() => { setForm({ ...form, conglomerado_id: c.id }); setConglomeradoSearch(c.nombre); setShowConglomeradoDropdown(false) }}
                        style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: '#1e293b' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        {c.nombre}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
            <button type='submit' style={{ padding: '11px 24px', background: '#0C1E3D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              {editing ? 'Actualizar' : 'Crear cliente'}
            </button>
            <button type='button' onClick={() => { setView('list'); setEditing(null); setForm(emptyCliente); setConglomeradoSearch('') }}
              style={{ padding: '11px 24px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0C1E3D' }}>Clientes</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>{clientes.length} clientes registrados</p>
        </div>
        <button onClick={() => { setView('form'); setEditing(null); setForm(emptyCliente); setConglomeradoSearch('') }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#0C1E3D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '14px 16px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={16} color='#94a3b8' style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Buscar por nombre, email, NIT...'
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', color: '#1e293b', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['todos', ...tiposCliente].map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)}
              style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 500, background: filtroTipo === t ? '#0C1E3D' : 'white', color: filtroTipo === t ? 'white' : '#64748b', border: '1px solid ' + (filtroTipo === t ? '#0C1E3D' : '#e2e8f0') }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? <p style={{ padding: '24px', color: '#64748b' }}>Cargando...</p> :
          filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Users size={32} color='#cbd5e1' style={{ marginBottom: '12px' }} />
              <p style={{ color: '#94a3b8' }}>No hay clientes registrados</p>
            </div>
          ) : filtered.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}
              onClick={() => { setSelected(c); setView('detalle') }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: c.tipo === 'empresa' ? '#fef3c7' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0 }}>
                <Users size={18} color={c.tipo === 'empresa' ? '#d97706' : '#1A6BBA'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, color: '#0C1E3D', fontSize: '14px' }}>{c.nombre} {c.apellido || ''}</p>
                <p style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.email || 'Sin email'}{c.telefono ? ' · ' + c.telefono : ''}{c.conglomerados ? ' · ' + c.conglomerados.nombre : ''}
                </p>
              </div>
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', marginRight: '12px', background: c.tipo === 'prospecto' ? '#fef9c3' : c.tipo === 'empresa' ? '#fef3c7' : '#dbeafe', color: c.tipo === 'prospecto' ? '#a16207' : c.tipo === 'empresa' ? '#d97706' : '#1d4ed8', fontWeight: 500 }}>
                {c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1)}
              </span>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => handleEdit(c)} style={{ padding: '6px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Edit2 size={14} color='#64748b' /></button>
                <button onClick={() => handleDelete(c.id)} style={{ padding: '6px', background: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={14} color='#ef4444' /></button>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

function ClienteDetalle({ cliente, onBack, onEdit }) {
  const [polizas, setPolizas] = useState([])
  const [personas, setPersonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('polizas')
  const [showPFForm, setShowPFForm] = useState(false)
  const [pfForm, setPfForm] = useState(emptyPF)
  const [editingPF, setEditingPF] = useState(null)

  useEffect(() => { fetchData() }, [cliente.id])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: pData }, { data: pfData }] = await Promise.all([
      supabase.from('polizas').select('*, aseguradoras(nombre, logo_url), productos(nombre)').eq('cliente_id', cliente.id).eq('activa', true).order('created_at', { ascending: false }),
      supabase.from('personas_facturables').select('*').eq('cliente_id', cliente.id).eq('activa', true).order('nombre')
    ])
    setPolizas(pData || [])
    setPersonas(pfData || [])
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
    setPfForm({ nombre: pf.nombre, apellido: pf.apellido || '', nit: pf.nit || '', email: pf.email || '', telefono: pf.telefono || '', direccion: pf.direccion || '' })
    setEditingPF(pf.id)
    setShowPFForm(true)
  }

  const handlePFDelete = async (id) => {
    if (!confirm('¿Eliminar persona facturable?')) return
    await supabase.from('personas_facturables').update({ activa: false }).eq('id', id)
    toast.success('Eliminada')
    fetchData()
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', background: 'white', color: '#1e293b', boxSizing: 'border-box' }

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '20px', padding: '0' }}>
        <ArrowLeft size={16} /> Volver a clientes
      </button>

      <div style={{ background: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: cliente.tipo === 'empresa' ? '#fef3c7' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={22} color={cliente.tipo === 'empresa' ? '#d97706' : '#1A6BBA'} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0C1E3D' }}>{cliente.nombre} {cliente.apellido || ''}</h1>
              <p style={{ fontSize: '13px', color: '#64748b' }}>{cliente.tipo.charAt(0).toUpperCase() + cliente.tipo.slice(1)}{cliente.conglomerados ? ' · ' + cliente.conglomerados.nombre : ''}</p>
            </div>
          </div>
          <button onClick={() => onEdit(cliente)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0C1E3D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            <Edit2 size={13} /> Editar
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginTop: '16px' }}>
          {[['NIT', cliente.nit || 'N/A'], ['Email', cliente.email || 'N/A'], ['Teléfono', cliente.telefono || 'N/A']].map(([label, val]) => (
            <div key={label} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 14px' }}>
              <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>{label}</p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{val}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[['polizas', `Pólizas (${polizas.length})`], ['personas', `Personas facturables (${personas.length})`]].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', background: activeTab === tab ? '#0C1E3D' : 'white', color: activeTab === tab ? 'white' : '#64748b', border: '1px solid ' + (activeTab === tab ? '#0C1E3D' : '#e2e8f0') }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'polizas' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Pólizas activas</p>
          </div>
          {loading ? <p style={{ padding: '20px', color: '#64748b' }}>Cargando...</p> :
            polizas.length === 0 ? <div style={{ padding: '32px', textAlign: 'center' }}><FileText size={28} color='#cbd5e1' style={{ marginBottom: '10px' }} /><p style={{ color: '#94a3b8' }}>Sin pólizas activas</p></div> :
              polizas.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < polizas.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', overflow: 'hidden', background: '#f8fafc', flexShrink: 0 }}>
                    {p.aseguradoras?.logo_url ? <img src={p.aseguradoras.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <FileText size={14} color='#1A6BBA' />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: '#0C1E3D', fontSize: '13px' }}>{p.numero_poliza || 'Sin número'}</p>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>{p.aseguradoras?.nombre} · {p.productos?.nombre}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#1A6BBA' }}>Q {parseFloat(p.prima_total || 0).toLocaleString()}</p>
                    <p style={{ fontSize: '11px', color: new Date(p.fecha_vencimiento) < new Date() ? '#ef4444' : '#64748b' }}>
                      Vence: {new Date(p.fecha_vencimiento).toLocaleDateString('es-GT')}
                    </p>
                  </div>
                </div>
              ))}
        </div>
      )}

      {activeTab === 'personas' && (
        <div>
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0C1E3D' }}>Personas facturables</p>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Personas a quienes se puede facturar en lugar del cliente principal</p>
              </div>
              <button onClick={() => { setShowPFForm(!showPFForm); setPfForm(emptyPF); setEditingPF(null) }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#0C1E3D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                <UserPlus size={14} /> Nueva persona
              </button>
            </div>

            {showPFForm && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>{editingPF ? 'Editar persona facturable' : 'Nueva persona facturable'}</p>
                <form onSubmit={handlePFSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Nombre *</label>
                      <input value={pfForm.nombre} onChange={e => setPfForm({ ...pfForm, nombre: e.target.value })} required style={inp} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Apellido</label>
                      <input value={pfForm.apellido} onChange={e => setPfForm({ ...pfForm, apellido: e.target.value })} style={inp} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>NIT *</label>
                      <input value={pfForm.nit} onChange={e => setPfForm({ ...pfForm, nit: e.target.value })} required style={inp} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Email</label>
                      <input type='email' value={pfForm.email} onChange={e => setPfForm({ ...pfForm, email: e.target.value })} style={inp} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Teléfono</label>
                      <input value={pfForm.telefono} onChange={e => setPfForm({ ...pfForm, telefono: e.target.value })} style={inp} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Dirección</label>
                      <input value={pfForm.direccion} onChange={e => setPfForm({ ...pfForm, direccion: e.target.value })} style={inp} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type='submit' style={{ padding: '8px 18px', background: '#0C1E3D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{editingPF ? 'Actualizar' : 'Crear'}</button>
                    <button type='button' onClick={() => { setShowPFForm(false); setPfForm(emptyPF); setEditingPF(null) }} style={{ padding: '8px 14px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
                  </div>
                </form>
              </div>
            )}

            {loading ? <p style={{ padding: '20px', color: '#64748b' }}>Cargando...</p> :
              personas.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center' }}>
                  <UserPlus size={28} color='#cbd5e1' style={{ marginBottom: '10px' }} />
                  <p style={{ color: '#94a3b8', fontWeight: 500 }}>Sin personas facturables</p>
                  <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>Agregá personas a las que se puede facturar en nombre de este cliente</p>
                </div>
              ) : personas.map((pf, i) => (
                <div key={pf.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < personas.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0 }}>
                    <CreditCard size={16} color='#15803d' />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: '#0C1E3D', fontSize: '14px' }}>{pf.nombre} {pf.apellido || ''}</p>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>NIT: {pf.nit || 'N/A'}{pf.email ? ' · ' + pf.email : ''}{pf.telefono ? ' · ' + pf.telefono : ''}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => handlePFEdit(pf)} style={{ padding: '6px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Edit2 size={14} color='#64748b' /></button>
                    <button onClick={() => handlePFDelete(pf.id)} style={{ padding: '6px', background: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={14} color='#ef4444' /></button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
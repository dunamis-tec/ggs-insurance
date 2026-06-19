import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  ShieldAlert, Plus, Search, ArrowLeft, Edit2, X,
  Paperclip, Download, Trash2, FileText, MessageSquare,
  CheckCircle, Clock, Send, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'

const estadoConfig = {
  en_proceso: { label: 'En proceso', bg: '#fef9c3', color: '#854d0e' },
  cerrado:    { label: 'Cerrado',    bg: '#f0fdf4', color: '#15803d' },
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('es-GT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const genNumero = () => `REC-${new Date().getFullYear()}${String(Math.floor(Math.random() * 9000) + 1000)}`
const fpV = (v) => v ? `${v.marca} ${v.modelo} ${v.anio} (${v.tipo_placa||''}${v.placa||''})` : '—'

/* ─── Main page ─── */
export default function Reclamos() {
  const navigate = useNavigate()
  const location = useLocation()
  const [reclamos, setReclamos]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [view, setView]             = useState('list')
  const [selected, setSelected]     = useState(null)
  const [showModal, setShowModal]   = useState(false)
  const [createCtx, setCreateCtx]   = useState(null)

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (location.state?.openReclamoId && reclamos.length > 0) {
      const r = reclamos.find(x => x.id === location.state.openReclamoId)
      if (r) { setSelected(r); setView('detalle') }
    }
    if (location.state?.createContext) {
      setCreateCtx(location.state.createContext)
      setShowModal(true)
      window.history.replaceState({}, '')
    }
  }, [location.state, reclamos])

  useEffect(() => {
    if (location.pathname === '/reclamos' && !location.state?.openReclamoId && view !== 'list') {
      setView('list'); setSelected(null)
    }
  }, [location.pathname])

  const fetchAll = async () => {
    setLoading(true)
    const { data } = await supabase.from('reclamos')
      .select('*, polizas(id, numero_poliza), vehiculos(id, marca, modelo, anio, placa, tipo_placa), clientes(id, nombre, apellido)')
      .order('created_at', { ascending: false })
    setReclamos(data || [])
    setLoading(false)
  }

  const filtered = reclamos.filter(r => {
    const txt = `${r.numero_reclamo||''} ${r.clientes?.nombre||''} ${r.clientes?.apellido||''} ${r.vehiculos?.marca||''} ${r.vehiculos?.modelo||''} ${r.vehiculos?.placa||''} ${r.polizas?.numero_poliza||''}`.toLowerCase()
    return txt.includes(search.toLowerCase())
  })

  if (view === 'detalle' && selected) {
    return (
      <ReclamoDetalle
        reclamo={selected}
        onBack={() => { setSelected(null); setView('list'); fetchAll() }}
        onUpdate={(updated) => setSelected(updated)}
      />
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111111', margin: 0 }}>Reclamos</h1>
            <p style={{ color: '#6B6B62', fontSize: '14px', marginTop: '4px', marginBottom: 0 }}>
              {reclamos.filter(r => r.estado === 'en_proceso').length} en proceso · {reclamos.filter(r => r.estado === 'cerrado').length} cerrados
            </p>
          </div>
          <button
            onClick={() => { setCreateCtx(null); setShowModal(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: '#111111', color: 'white', border: 'none', borderRadius: '9px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={15} /> Nuevo reclamo
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '14px 16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} color='#94a3b8' style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder='Buscar por # reclamo, cliente, vehículo o póliza...'
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', color: '#1e293b', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? <p style={{ padding: '24px', color: '#64748b' }}>Cargando...</p> :
          filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <ShieldAlert size={32} color='#cbd5e1' style={{ marginBottom: '12px' }} />
              <p style={{ color: '#94a3b8', margin: 0 }}>{search ? 'Sin resultados' : 'No hay reclamos registrados'}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['# Reclamo', 'Cliente', 'Vehículo', 'Póliza', 'Estado', 'Fecha'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b', textAlign: 'left', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const est = estadoConfig[r.estado] || estadoConfig.en_proceso
                    return (
                      <tr key={r.id}
                        onClick={() => { setSelected(r); setView('detalle') }}
                        style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#111111', fontSize: '13px' }}>{r.numero_reclamo}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{r.clientes?.nombre} {r.clientes?.apellido || ''}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{r.vehiculos ? `${r.vehiculos.marca} ${r.vehiculos.modelo} (${r.vehiculos.tipo_placa||''}${r.vehiculos.placa||''})` : '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#C4A96B', fontWeight: 600 }}>{r.polizas?.numero_poliza || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: est.bg, color: est.color }}>{est.label}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>{fmtDate(r.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {showModal && (
        <ReclamoModal
          context={createCtx}
          onClose={() => { setShowModal(false); setCreateCtx(null) }}
          onSaved={(r) => { setShowModal(false); setCreateCtx(null); fetchAll(); setSelected(r); setView('detalle') }}
        />
      )}
    </div>
  )
}

/* ─── Detalle de reclamo ─── */
function ReclamoDetalle({ reclamo: reclamoInit, onBack, onUpdate }) {
  const [reclamo, setReclamo]               = useState(reclamoInit)
  const [bitacora, setBitacora]             = useState([])
  const [documentos, setDocumentos]         = useState([])
  const [loadingBit, setLoadingBit]         = useState(true)
  const [loadingDocs, setLoadingDocs]       = useState(true)
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [savingComentario, setSavingComentario] = useState(false)
  const [uploadingDoc, setUploadingDoc]     = useState(false)
  const [editingNumero, setEditingNumero]   = useState(false)
  const [numeroEdit, setNumeroEdit]         = useState(reclamo.numero_reclamo)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchBitacora()
    fetchDocumentos()
  }, [reclamo.id])

  const fetchBitacora = async () => {
    setLoadingBit(true)
    const { data } = await supabase.from('reclamos_bitacora')
      .select('*')
      .eq('reclamo_id', reclamo.id)
      .order('created_at', { ascending: true })
    setBitacora(data || [])
    setLoadingBit(false)
  }

  const fetchDocumentos = async () => {
    setLoadingDocs(true)
    const { data } = await supabase.from('reclamos_documentos')
      .select('*')
      .eq('reclamo_id', reclamo.id)
      .order('created_at', { ascending: false })
    setDocumentos(data || [])
    setLoadingDocs(false)
  }

  const refreshReclamo = async () => {
    const { data } = await supabase.from('reclamos')
      .select('*, polizas(id, numero_poliza), vehiculos(id, marca, modelo, anio, placa, tipo_placa), clientes(id, nombre, apellido)')
      .eq('id', reclamo.id).single()
    if (data) { setReclamo(data); onUpdate(data) }
  }

  const handleAgregarComentario = async (e) => {
    e.preventDefault()
    if (!nuevoComentario.trim()) return
    setSavingComentario(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: myRow } = await supabase.from('users').select('empresa_id, nombre').eq('id', user.id).single()
    const { error } = await supabase.from('reclamos_bitacora').insert({
      reclamo_id: reclamo.id,
      comentario: nuevoComentario.trim(),
      created_by: user.id,
      created_by_nombre: myRow?.nombre || user.email || 'Usuario',
      empresa_id: myRow?.empresa_id,
    })
    if (error) { toast.error('Error al guardar comentario'); setSavingComentario(false); return }
    setNuevoComentario('')
    setSavingComentario(false)
    await fetchBitacora()
  }

  const handleCambiarEstado = async (nuevoEstado) => {
    const now = new Date().toISOString()
    const { error } = await supabase.from('reclamos')
      .update({
        estado: nuevoEstado,
        updated_at: now,
        fecha_cierre: nuevoEstado === 'cerrado' ? now : null,
      })
      .eq('id', reclamo.id)
    if (error) { toast.error('Error al actualizar'); return }
    toast.success(nuevoEstado === 'cerrado' ? 'Reclamo cerrado' : 'Reclamo reabierto')
    refreshReclamo()
  }

  const handleGuardarNumero = async () => {
    if (!numeroEdit.trim()) return
    const { error } = await supabase.from('reclamos')
      .update({ numero_reclamo: numeroEdit.trim() })
      .eq('id', reclamo.id)
    if (error) { toast.error('Error'); return }
    toast.success('Número actualizado')
    setEditingNumero(false)
    refreshReclamo()
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingDoc(true)
    const toastId = toast.loading('Subiendo documento...')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase.from('users').select('empresa_id').eq('id', user.id).single()
      const empresaId = userData?.empresa_id
      const path = `${empresaId}/${reclamo.id}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage.from('reclamos-docs').upload(path, file)
      if (uploadError) throw uploadError
      await supabase.from('reclamos_documentos').insert({
        reclamo_id: reclamo.id,
        empresa_id: empresaId,
        nombre: file.name,
        url: path,
        created_by: user.id,
      })
      toast.success('Documento adjuntado', { id: toastId })
      fetchDocumentos()
    } catch (err) {
      toast.error('Error al subir documento', { id: toastId })
    }
    setUploadingDoc(false)
    e.target.value = ''
  }

  const handleDownload = async (doc) => {
    const { data, error } = await supabase.storage.from('reclamos-docs').createSignedUrl(doc.url, 3600)
    if (error || !data?.signedUrl) { toast.error('Error al obtener el archivo'); return }
    window.open(data.signedUrl, '_blank')
  }

  const handleDeleteDoc = async (doc) => {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return
    await supabase.storage.from('reclamos-docs').remove([doc.url])
    await supabase.from('reclamos_documentos').delete().eq('id', doc.id)
    toast.success('Documento eliminado')
    setDocumentos(prev => prev.filter(d => d.id !== doc.id))
  }

  const est = estadoConfig[reclamo.estado] || estadoConfig.en_proceso

  return (
    <div>
      <button onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '20px', padding: '0' }}>
        <ArrowLeft size={16} /> Volver a reclamos
      </button>

      {/* Header */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #111111 0%, #2d2d2d 100%)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              {editingNumero ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input value={numeroEdit} onChange={e => setNumeroEdit(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1.5px solid #C4A96B', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '18px', fontWeight: 700, width: '200px', outline: 'none' }}
                    autoFocus onKeyDown={e => { if (e.key === 'Enter') handleGuardarNumero(); if (e.key === 'Escape') { setEditingNumero(false); setNumeroEdit(reclamo.numero_reclamo) } }} />
                  <button onClick={handleGuardarNumero}
                    style={{ padding: '6px 12px', background: '#C4A96B', color: '#111', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
                  <button onClick={() => { setEditingNumero(false); setNumeroEdit(reclamo.numero_reclamo) }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}><X size={15} color='rgba(255,255,255,0.6)' /></button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white', margin: 0 }}>{reclamo.numero_reclamo}</h1>
                  <button onClick={() => setEditingNumero(true)}
                    style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', display: 'flex' }}>
                    <Edit2 size={13} color='rgba(255,255,255,0.6)' />
                  </button>
                </div>
              )}
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '4px 0 0' }}>Creado el {fmtDate(reclamo.created_at)}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 14px', borderRadius: '20px', background: est.bg, color: est.color }}>{est.label}</span>
              {reclamo.estado === 'en_proceso' ? (
                <button onClick={() => handleCambiarEstado('cerrado')}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  <CheckCircle size={13} /> Cerrar reclamo
                </button>
              ) : (
                <button onClick={() => handleCambiarEstado('en_proceso')}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  <Clock size={13} /> Reabrir
                </button>
              )}
            </div>
          </div>
        </div>

        {(() => {
          const apertura = new Date(reclamo.created_at)
          const ahora = new Date()
          const cierre = reclamo.fecha_cierre ? new Date(reclamo.fecha_cierre) : null
          const diasEnProceso = Math.floor((ahora - apertura) / 864e5)
          const diasResolucion = cierre ? Math.floor((cierre - apertura) / 864e5) : null
          return (
            <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 14px' }}>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Cliente</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '3px 0 0' }}>{reclamo.clientes?.nombre} {reclamo.clientes?.apellido || ''}</p>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 14px' }}>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Póliza</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#C4A96B', margin: '3px 0 0' }}>{reclamo.polizas?.numero_poliza || '—'}</p>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 14px' }}>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Vehículo</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '3px 0 0' }}>{reclamo.vehiculos ? `${reclamo.vehiculos.marca} ${reclamo.vehiculos.modelo} ${reclamo.vehiculos.anio}` : '—'}</p>
                {reclamo.vehiculos && <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{reclamo.vehiculos.tipo_placa}{reclamo.vehiculos.placa}</p>}
              </div>
              <div style={{ background: '#dbeafe', borderRadius: '8px', padding: '10px 14px' }}>
                <p style={{ fontSize: '11px', color: '#1d4ed8', margin: 0 }}>Fecha de apertura</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#1d4ed8', margin: '3px 0 0' }}>{fmtDate(reclamo.created_at)}</p>
              </div>
              {reclamo.estado === 'cerrado' && cierre && (
                <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '10px 14px' }}>
                  <p style={{ fontSize: '11px', color: '#15803d', margin: 0 }}>Fecha de cierre</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#15803d', margin: '3px 0 0' }}>{fmtDate(reclamo.fecha_cierre)}</p>
                </div>
              )}
              {reclamo.estado === 'en_proceso' && (
                <div style={{ background: '#fef9c3', borderRadius: '8px', padding: '10px 14px' }}>
                  <p style={{ fontSize: '11px', color: '#854d0e', margin: 0 }}>Días en proceso</p>
                  <p style={{ fontSize: '22px', fontWeight: 700, color: '#854d0e', margin: '3px 0 0', lineHeight: 1 }}>{diasEnProceso}</p>
                  <p style={{ fontSize: '11px', color: '#a16207', margin: '2px 0 0' }}>{diasEnProceso === 1 ? 'día' : 'días'} desde apertura</p>
                </div>
              )}
              {reclamo.estado === 'cerrado' && diasResolucion !== null && (
                <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '10px 14px' }}>
                  <p style={{ fontSize: '11px', color: '#15803d', margin: 0 }}>Días de resolución</p>
                  <p style={{ fontSize: '22px', fontWeight: 700, color: '#15803d', margin: '3px 0 0', lineHeight: 1 }}>{diasResolucion}</p>
                  <p style={{ fontSize: '11px', color: '#16a34a', margin: '2px 0 0' }}>{diasResolucion === 1 ? 'día' : 'días'} hasta cierre</p>
                </div>
              )}
              {reclamo.descripcion && (
                <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 14px', gridColumn: '1/-1' }}>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Descripción</p>
                  <p style={{ fontSize: '13px', color: '#374151', margin: '3px 0 0', lineHeight: '1.5' }}>{reclamo.descripcion}</p>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Bitácora */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} color='#C4A96B' />
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111111', margin: 0 }}>Bitácora</h3>
          <span style={{ marginLeft: 'auto', background: '#f1f5f9', color: '#64748b', fontSize: '12px', padding: '2px 8px', borderRadius: '20px' }}>{bitacora.length}</span>
        </div>
        <div style={{ padding: '16px 20px' }}>
          {loadingBit ? (
            <p style={{ color: '#64748b', fontSize: '13px' }}>Cargando...</p>
          ) : bitacora.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>Sin comentarios aún</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {bitacora.map(b => (
                <div key={b.id} style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{b.created_by_nombre || 'Usuario'}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>{fmtDateTime(b.created_at)}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#1e293b', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.55' }}>{b.comentario}</p>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleAgregarComentario} style={{ display: 'flex', gap: '8px' }}>
            <textarea
              value={nuevoComentario}
              onChange={e => setNuevoComentario(e.target.value)}
              placeholder='Agregar comentario o nota...'
              rows={2}
              style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', background: 'white', color: '#1e293b', resize: 'vertical', minHeight: '60px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
            <button type='submit' disabled={savingComentario || !nuevoComentario.trim()}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 14px', background: nuevoComentario.trim() ? '#111111' : '#e2e8f0', border: 'none', borderRadius: '8px', cursor: nuevoComentario.trim() ? 'pointer' : 'not-allowed', flexShrink: 0, minWidth: '44px' }}>
              <Send size={16} color={nuevoComentario.trim() ? 'white' : '#94a3b8'} />
            </button>
          </form>
        </div>
      </div>

      {/* Documentos */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Paperclip size={16} color='#C4A96B' />
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111111', margin: 0 }}>Documentos</h3>
          <span style={{ marginLeft: 'auto', background: '#f1f5f9', color: '#64748b', fontSize: '12px', padding: '2px 8px', borderRadius: '20px' }}>{documentos.length}</span>
          <input ref={fileInputRef} type='file' style={{ display: 'none' }} onChange={handleUpload} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploadingDoc}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#111111', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: uploadingDoc ? 'not-allowed' : 'pointer', opacity: uploadingDoc ? 0.6 : 1 }}>
            <Paperclip size={13} /> {uploadingDoc ? 'Subiendo...' : 'Adjuntar'}
          </button>
        </div>
        {loadingDocs ? (
          <p style={{ padding: '20px', color: '#64748b', fontSize: '13px' }}>Cargando...</p>
        ) : documentos.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center' }}>
            <Paperclip size={26} color='#cbd5e1' style={{ marginBottom: '8px' }} />
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '13px' }}>Sin documentos adjuntos</p>
          </div>
        ) : documentos.map((doc, i) => {
          const ext = doc.nombre.split('.').pop().toLowerCase()
          const isPdf = ext === 'pdf'
          const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
          return (
            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: i < documentos.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: isPdf ? '#fef2f2' : isImg ? '#f0fdf4' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: '12px' }}>
                <FileText size={16} color={isPdf ? '#ef4444' : isImg ? '#22c55e' : '#64748b'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, color: '#111111', fontSize: '13px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre}</p>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{ext.toUpperCase()} · {new Date(doc.created_at).toLocaleDateString('es-GT')}</p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button onClick={() => handleDownload(doc)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                  <Download size={13} /> Ver
                </button>
                <button onClick={() => handleDeleteDoc(doc)}
                  style={{ padding: '6px', background: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  <Trash2 size={13} color='#ef4444' />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Modal crear reclamo ─── */
export function ReclamoModal({ context, onClose, onSaved }) {
  const [clientes, setClientes]         = useState([])
  const [polizas, setPolizas]           = useState([])
  const [vehiculos, setVehiculos]       = useState([])
  const [clienteId, setClienteId]       = useState(context?.clienteId || '')
  const [polizaId, setPolizaId]         = useState(context?.polizaId || '')
  const [vehiculoId, setVehiculoId]     = useState(context?.vehiculoId || '')
  const [descripcion, setDescripcion]   = useState('')
  const [numero, setNumero]             = useState(genNumero())
  const [saving, setSaving]             = useState(false)
  const [loadingPolizas, setLoadingPolizas]   = useState(false)
  const [loadingVehiculos, setLoadingVehiculos] = useState(false)
  const [sinPolizas, setSinPolizas]     = useState(false)

  useEffect(() => {
    if (!context) {
      supabase.from('clientes').select('id, nombre, apellido').eq('activo', true).order('nombre')
        .then(({ data }) => setClientes(data || []))
    }
    if (context?.clienteId && !context.polizaId) fetchPolizasForCliente(context.clienteId)
    if (context?.polizaId && !context.vehiculoId) fetchVehiculosForPoliza(context.polizaId)
  }, [])

  const fetchPolizasForCliente = async (cid) => {
    setLoadingPolizas(true)
    setSinPolizas(false)
    const hoy = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('polizas')
      .select('id, numero_poliza')
      .eq('cliente_id', cid).eq('estado', 'emitida').eq('activa', true)
      .gte('fecha_vencimiento', hoy)
      .order('created_at', { ascending: false })
    setPolizas(data || [])
    setSinPolizas((data || []).length === 0)
    setLoadingPolizas(false)
  }

  const fetchVehiculosForPoliza = async (pid) => {
    setLoadingVehiculos(true)
    const { data: evData } = await supabase.from('emision_vehiculos')
      .select('vehiculos(*), emisiones!inner(poliza_id, estado)')
      .eq('emisiones.poliza_id', pid)
      .neq('emisiones.estado', 'cancelada')
    const seen = new Set()
    const vList = []
    for (const ev of (evData || [])) {
      if (ev.vehiculos && !seen.has(ev.vehiculos.id)) {
        seen.add(ev.vehiculos.id)
        vList.push(ev.vehiculos)
      }
    }
    setVehiculos(vList)
    setLoadingVehiculos(false)
  }

  const handleClienteChange = async (cid) => {
    setClienteId(cid); setPolizaId(''); setVehiculoId('')
    setPolizas([]); setVehiculos([])
    if (cid) await fetchPolizasForCliente(cid)
  }

  const handlePolizaChange = async (pid) => {
    setPolizaId(pid); setVehiculoId(''); setVehiculos([])
    if (pid) await fetchVehiculosForPoliza(pid)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const finalPolizaId   = polizaId   || context?.polizaId
    const finalVehiculoId = vehiculoId || context?.vehiculoId
    const finalClienteId  = clienteId  || context?.clienteId
    if (!finalPolizaId)   { toast.error('Selecciona una póliza'); return }
    if (!finalVehiculoId) { toast.error('Selecciona un vehículo'); return }
    if (!finalClienteId)  { toast.error('Selecciona un cliente'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: myRow } = await supabase.from('users').select('empresa_id').eq('id', user.id).single()
    const { data, error } = await supabase.from('reclamos').insert({
      numero_reclamo: numero,
      poliza_id:   finalPolizaId,
      vehiculo_id: finalVehiculoId,
      cliente_id:  finalClienteId,
      descripcion: descripcion || null,
      estado: 'en_proceso',
      created_by: user.id,
      empresa_id: myRow?.empresa_id,
    }).select('*, polizas(id, numero_poliza), vehiculos(id, marca, modelo, anio, placa, tipo_placa), clientes(id, nombre, apellido)').single()
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }
    toast.success('Reclamo creado')
    onSaved(data)
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', color: '#1e293b', boxSizing: 'border-box', outline: 'none' }
  const lbl = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }

  const lockVehiculo = !!context?.vehiculoId
  const lockPoliza   = !!context?.polizaId
  const lockCliente  = !!context?.clienteId

  const showPolizaSection  = lockCliente || !!clienteId
  const showVehiculoSection = lockPoliza || !!polizaId

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111111', margin: 0 }}>Nuevo reclamo</h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} color='#64748b' />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Número */}
            <div>
              <label style={lbl}># Reclamo</label>
              <input value={numero} onChange={e => setNumero(e.target.value)} required style={inp} />
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0' }}>Auto-generado. Reemplázalo con el # de la aseguradora si lo tienes.</p>
            </div>

            {/* Cliente */}
            {lockCliente ? (
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Cliente</p>
                <p style={{ fontWeight: 600, color: '#1e293b', margin: '3px 0 0', fontSize: '14px' }}>{context?.clienteData?.nombre} {context?.clienteData?.apellido || ''}</p>
              </div>
            ) : (
              <div>
                <label style={lbl}>Cliente *</label>
                <select value={clienteId} onChange={e => handleClienteChange(e.target.value)} required style={inp}>
                  <option value=''>Selecciona un cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido || ''}</option>)}
                </select>
              </div>
            )}

            {/* Póliza */}
            {lockPoliza ? (
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Póliza</p>
                <p style={{ fontWeight: 600, color: '#C4A96B', margin: '3px 0 0', fontSize: '14px' }}>{context?.polizaData?.numero_poliza}</p>
              </div>
            ) : showPolizaSection ? (
              <div>
                <label style={lbl}>Póliza vigente *</label>
                {loadingPolizas ? (
                  <p style={{ fontSize: '13px', color: '#64748b' }}>Cargando pólizas...</p>
                ) : sinPolizas ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                    <AlertTriangle size={14} color='#ef4444' />
                    <p style={{ fontSize: '13px', color: '#ef4444', margin: 0 }}>Este cliente no tiene pólizas vigentes activas</p>
                  </div>
                ) : (
                  <select value={polizaId} onChange={e => handlePolizaChange(e.target.value)} required style={inp}>
                    <option value=''>Selecciona una póliza...</option>
                    {polizas.map(p => <option key={p.id} value={p.id}>{p.numero_poliza}</option>)}
                  </select>
                )}
              </div>
            ) : null}

            {/* Vehículo */}
            {lockVehiculo ? (
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Vehículo</p>
                <p style={{ fontWeight: 600, color: '#1e293b', margin: '3px 0 0', fontSize: '14px' }}>{context?.vehiculoData ? `${context.vehiculoData.marca} ${context.vehiculoData.modelo} ${context.vehiculoData.anio}` : '—'}</p>
                {context?.vehiculoData && <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{context.vehiculoData.tipo_placa}{context.vehiculoData.placa}</p>}
              </div>
            ) : showVehiculoSection ? (
              <div>
                <label style={lbl}>Vehículo *</label>
                {loadingVehiculos ? (
                  <p style={{ fontSize: '13px', color: '#64748b' }}>Cargando vehículos...</p>
                ) : vehiculos.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#94a3b8', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', margin: 0 }}>No hay vehículos en esta póliza</p>
                ) : (
                  <select value={vehiculoId} onChange={e => setVehiculoId(e.target.value)} required style={inp}>
                    <option value=''>Selecciona un vehículo...</option>
                    {vehiculos.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.anio} — {v.tipo_placa}{v.placa}</option>)}
                  </select>
                )}
              </div>
            ) : null}

            {/* Descripción */}
            <div>
              <label style={lbl}>Descripción (opcional)</label>
              <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3}
                placeholder='Describe brevemente el reclamo...'
                style={{ ...inp, resize: 'vertical', minHeight: '72px', fontFamily: 'inherit' }} />
            </div>
          </div>

          <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px', position: 'sticky', bottom: 0, background: 'white' }}>
            <button type='submit' disabled={saving || sinPolizas}
              style={{ flex: 1, padding: '11px', background: sinPolizas ? '#e2e8f0' : '#111111', color: sinPolizas ? '#94a3b8' : 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: saving || sinPolizas ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Creando...' : 'Crear reclamo'}
            </button>
            <button type='button' onClick={onClose}
              style={{ padding: '11px 18px', background: 'white', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Mini-lista de reclamos (para tabs en poliza/cliente/vehiculo) ─── */
export function ReclamosMiniList({ reclamos, loading, onOpen, onNuevo, sinPolizaVigente }) {
  const navigate = useNavigate()
  if (loading) return <p style={{ padding: '20px', color: '#64748b', fontSize: '13px' }}>Cargando...</p>
  return (
    <div>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldAlert size={15} color='#C4A96B' />
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#111111' }}>Reclamos ({reclamos.length})</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {sinPolizaVigente ? (
            <span style={{ fontSize: '11px', color: '#94a3b8', padding: '6px 12px', background: '#f8fafc', borderRadius: '7px' }}>Sin póliza vigente para crear reclamo</span>
          ) : onNuevo && (
            <button onClick={onNuevo}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', background: '#111111', color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={12} /> Nuevo reclamo
            </button>
          )}
        </div>
      </div>
      {reclamos.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <ShieldAlert size={26} color='#cbd5e1' style={{ marginBottom: '8px' }} />
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '13px' }}>Sin reclamos registrados</p>
        </div>
      ) : reclamos.map((r, i) => {
        const est = estadoConfig[r.estado] || estadoConfig.en_proceso
        return (
          <div key={r.id}
            onClick={() => navigate('/reclamos', { state: { openReclamoId: r.id } })}
            style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: i < reclamos.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#111111', margin: 0 }}>{r.numero_reclamo}</p>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: est.bg, color: est.color, flexShrink: 0 }}>{est.label}</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.vehiculos ? `${r.vehiculos.marca} ${r.vehiculos.modelo}` : ''}{r.polizas ? ` · ${r.polizas.numero_poliza}` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{fmtDate(r.created_at)}</span>
              <span style={{ fontSize: '12px', color: '#C4A96B' }}>Ver →</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

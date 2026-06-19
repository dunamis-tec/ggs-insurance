import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { notifyTaskAssigned } from '../../lib/notifyTaskAssigned'
import { CheckSquare, Plus, Check, Trash2, Clock, AlertCircle, FileText, Users, User, X } from 'lucide-react'
import toast from 'react-hot-toast'

/* ── Avatar initials helper ── */
function Avatar({ nombre, size = 28 }) {
  const initials = (nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#FDF8EE', border: '1px solid rgba(196,169,107,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#C4A96B', flexShrink: 0,
    }}>{initials}</div>
  )
}

export default function Tareas() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [currentUser, setCurrentUser] = useState(null)
  const [usuarios, setUsuarios]       = useState([])
  const [tareas, setTareas]           = useState([])
  const [loading, setLoading]         = useState(true)

  // Filters
  const [estado, setEstado]   = useState('pendiente')   // pendiente | completada | todas
  const [scope, setScope]     = useState('mias')        // mias | todas (solo admins)

  // New task form
  const [showForm, setShowForm]   = useState(false)
  const [titulo, setTitulo]       = useState('')
  const [descripcion, setDesc]    = useState('')
  const [fechaVenc, setFechaVenc] = useState('')
  const [asignadoA, setAsignadoA] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Detail modal
  const [tareaModal, setTareaModal] = useState(null)

  // Poliza selector
  const [polizaId, setPolizaId]           = useState(null)
  const [polizaSelected, setPolizaSelected] = useState(null)   // { id, numero_poliza, cliente }
  const [polizaSearch, setPolizaSearch]   = useState('')
  const [polizaResults, setPolizaResults] = useState([])
  const [polizaLoading, setPolizaLoading] = useState(false)
  const [showPolizaDrop, setShowPolizaDrop] = useState(false)

  const isAdmin = currentUser?.rol === 'admin'

  /* ── Load current user + team ── */
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: row } = await supabase.from('users').select('id, nombre, email, rol').eq('id', user.id).single()
      setCurrentUser(row)
      setAsignadoA('')

      const { data: team } = await supabase.from('users')
        .select('id, nombre, email, rol, activo')
        .eq('activo', true)
        .order('nombre')
      setUsuarios(team || [])
    }
    init()
  }, [])

  /* ── Fetch tareas ── */
  useEffect(() => {
    if (!currentUser) return
    fetchTareas()
  }, [currentUser, estado, scope])

  /* ── Deep-link: ?id=xxx opens that task's modal ── */
  useEffect(() => {
    const tareaId = searchParams.get('id')
    if (!tareaId || loading || tareas.length === 0) return
    const found = tareas.find(t => t.id === tareaId)
    if (found) {
      setTareaModal(found)
      setSearchParams({}, { replace: true })  // clean URL
    }
  }, [searchParams, tareas, loading])

  const fetchTareas = async () => {
    setLoading(true)
    let query = supabase.from('tareas')
      .select(`
        *,
        polizas(numero_poliza),
        clientes(nombre, apellido),
        asignado_user:users!asignado_a(id, nombre, email),
        creador:users!created_by(id, nombre)
      `)
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false })

    if (estado !== 'todas') query = query.eq('estado', estado)

    // Scope: "mias" shows tasks assigned to me + unassigned general tasks
    if (!isAdmin || scope === 'mias') {
      query = query.or(`asignado_a.eq.${currentUser.id},asignado_a.is.null`)
    }

    const { data } = await query
    setTareas(data || [])
    setLoading(false)
  }

  /* ── Actions ── */
  const completar = async (id) => {
    await supabase.from('tareas').update({ estado: 'completada', fecha_completada: new Date().toISOString() }).eq('id', id)
    toast.success('Tarea completada ✓')
    fetchTareas()
  }

  const reabrir = async (id) => {
    await supabase.from('tareas').update({ estado: 'pendiente', fecha_completada: null }).eq('id', id)
    toast.success('Tarea reabierta')
    fetchTareas()
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    await supabase.from('tareas').delete().eq('id', id)
    toast.success('Eliminada')
    fetchTareas()
  }

  const searchPolizas = async (q) => {
    setPolizaSearch(q)
    if (!q.trim()) { setPolizaResults([]); setShowPolizaDrop(false); return }
    setPolizaLoading(true)
    setShowPolizaDrop(true)
    const { data } = await supabase
      .from('polizas')
      .select('id, numero_poliza, clientes(nombre, apellido)')
      .ilike('numero_poliza', `%${q}%`)
      .limit(8)
    setPolizaResults(data || [])
    setPolizaLoading(false)
  }

  const selectPoliza = (p) => {
    setPolizaId(p.id)
    setPolizaSelected(p)
    setPolizaSearch('')
    setPolizaResults([])
    setShowPolizaDrop(false)
  }

  const clearPoliza = () => {
    setPolizaId(null)
    setPolizaSelected(null)
    setPolizaSearch('')
    setPolizaResults([])
    setShowPolizaDrop(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Get empresa_id from session user's row
    const { data: myRow } = await supabase.from('users').select('empresa_id').eq('id', user.id).single()

    const { data: inserted } = await supabase.from('tareas').insert({
      titulo,
      descripcion: descripcion || null,
      tipo: 'manual',
      estado: 'pendiente',
      fecha_vencimiento: fechaVenc || null,
      asignado_a: asignadoA || null,
      created_by: user.id,
      empresa_id: myRow?.empresa_id || null,
      poliza_id: polizaId || null,
    }).select().single()

    if (inserted && asignadoA && asignadoA !== user.id) {
      notifyTaskAssigned({ taskId: inserted.id, titulo, descripcion, fechaVencimiento: fechaVenc || null, asignadoAId: asignadoA, creadoPorId: user.id })
    }

    toast.success('Tarea creada')
    setTitulo(''); setDesc(''); setFechaVenc(''); setAsignadoA('')
    clearPoliza()
    setShowForm(false)
    fetchTareas()
    setSubmitting(false)
  }

  /* ── Computed ── */
  const pendientes = tareas.filter(t => t.estado === 'pendiente')
  const vencidas   = pendientes.filter(t => t.fecha_vencimiento && new Date(t.fecha_vencimiento) < new Date())

  const inp = { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', color: '#1e293b', boxSizing: 'border-box', outline: 'none' }
  const lbl = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' }

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111111', margin: 0 }}>Tareas</h1>
            <p style={{ color: '#6B6B62', fontSize: '14px', marginTop: '4px', marginBottom: 0 }}>
              {pendientes.length} pendientes · {vencidas.length} vencidas
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#111111', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={16} /> Nueva tarea
          </button>
        </div>
      </div>

      {/* ── New task modal ── */}
      {showForm && (
        <div onClick={() => setShowForm(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111111', margin: 0 }}>Nueva tarea</h3>
              <button onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} color='#64748b' />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={lbl}>Título *</label>
                  <input value={titulo} onChange={e => setTitulo(e.target.value)} required placeholder='Ej: Llamar al cliente para renovación' style={inp} />
                </div>
                <div>
                  <label style={lbl}>Descripción</label>
                  <textarea value={descripcion} onChange={e => setDesc(e.target.value)} placeholder='Detalles adicionales...' rows={3}
                    style={{ ...inp, resize: 'vertical', minHeight: '72px', fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Asignado a</label>
                    <select value={asignadoA} onChange={e => setAsignadoA(e.target.value)} style={inp}>
                      <option value=''>Sin asignar</option>
                      {usuarios.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nombre || u.email}{u.id === currentUser?.id ? ' (vos)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Fecha límite</label>
                    <input type='date' value={fechaVenc} onChange={e => setFechaVenc(e.target.value)} style={inp} />
                  </div>
                </div>

                {/* Poliza selector */}
                <div style={{ position: 'relative' }}>
                  <label style={lbl}>Póliza asociada <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>

                  {polizaSelected ? (
                    /* Selected state */
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: '1.5px solid #C4A96B', borderRadius: '8px', background: '#FDF8EE' }}>
                      <FileText size={14} color='#C4A96B' style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#111111', margin: 0 }}>
                          Póliza {polizaSelected.numero_poliza}
                        </p>
                        {polizaSelected.clientes && (
                          <p style={{ fontSize: '11px', color: '#6B6B62', margin: 0 }}>
                            {polizaSelected.clientes.nombre} {polizaSelected.clientes.apellido || ''}
                          </p>
                        )}
                      </div>
                      <button type='button' onClick={clearPoliza}
                        style={{ background: 'rgba(196,169,107,0.15)', border: 'none', borderRadius: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        <X size={12} color='#C4A96B' />
                      </button>
                    </div>
                  ) : (
                    /* Search input */
                    <>
                      <input
                        value={polizaSearch}
                        onChange={e => searchPolizas(e.target.value)}
                        onFocus={() => polizaSearch && setShowPolizaDrop(true)}
                        placeholder='Buscar por número de póliza...'
                        style={inp}
                        autoComplete='off'
                      />
                      {showPolizaDrop && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
                          {polizaLoading ? (
                            <p style={{ padding: '12px 14px', fontSize: '13px', color: '#94a3b8', margin: 0 }}>Buscando...</p>
                          ) : polizaResults.length === 0 ? (
                            <p style={{ padding: '12px 14px', fontSize: '13px', color: '#94a3b8', margin: 0 }}>Sin resultados</p>
                          ) : polizaResults.map(p => (
                            <button key={p.id} type='button' onClick={() => selectPoliza(p)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', textAlign: 'left' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                              <FileText size={13} color='#C4A96B' style={{ flexShrink: 0 }} />
                              <div>
                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#111111', margin: 0 }}>Póliza {p.numero_poliza}</p>
                                {p.clientes && (
                                  <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                                    {p.clientes.nombre} {p.clientes.apellido || ''}
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Modal footer */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
                <button type='submit' disabled={submitting}
                  style={{ flex: 1, padding: '11px', background: '#111111', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Creando...' : 'Crear tarea'}
                </button>
                <button type='button' onClick={() => setShowForm(false)}
                  style={{ padding: '11px 18px', background: 'white', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>

        {/* Estado filter */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[['pendiente', 'Pendientes'], ['completada', 'Completadas'], ['todas', 'Todas']].map(([val, label]) => (
            <button key={val} onClick={() => setEstado(val)}
              style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', background: estado === val ? '#111111' : 'white', color: estado === val ? 'white' : '#64748b', border: '1px solid ' + (estado === val ? '#111111' : '#e2e8f0') }}>
              {label}{val === 'pendiente' && pendientes.length > 0 ? ` (${pendientes.length})` : ''}
            </button>
          ))}
        </div>

        {/* Scope filter — solo admins */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
            {[['mias', '👤 Mis tareas'], ['todas', '👥 Todas']].map(([val, label]) => (
              <button key={val} onClick={() => setScope(val)}
                style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: scope === val ? 'white' : 'transparent', color: scope === val ? '#111111' : '#64748b', boxShadow: scope === val ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Overdue alert ── */}
      {vencidas.length > 0 && estado === 'pendiente' && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} color='#ef4444' />
          <p style={{ fontSize: '13px', color: '#dc2626', fontWeight: 500, margin: 0 }}>{vencidas.length} tarea{vencidas.length > 1 ? 's' : ''} vencida{vencidas.length > 1 ? 's' : ''} — requieren atención</p>
        </div>
      )}

      {/* ── Task list ── */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: '24px', color: '#64748b' }}>Cargando...</p>
        ) : tareas.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <CheckSquare size={32} color='#cbd5e1' style={{ marginBottom: '12px' }} />
            <p style={{ color: '#94a3b8', fontWeight: 500 }}>
              {estado === 'pendiente' ? 'No hay tareas pendientes' : estado === 'completada' ? 'No hay tareas completadas' : 'No hay tareas'}
            </p>
          </div>
        ) : tareas.map((t, i) => {
          const vencida = t.estado === 'pendiente' && t.fecha_vencimiento && new Date(t.fecha_vencimiento) < new Date()
          const asignado = t.asignado_user
          const creador  = t.creador
          const esPropia = asignado?.id === currentUser?.id
          const esCreador = creador?.id === currentUser?.id

          return (
            <div key={t.id}
              onClick={() => setTareaModal(t)}
              style={{
                display: 'flex', alignItems: 'flex-start', padding: '14px 20px',
                borderBottom: i < tareas.length - 1 ? '1px solid #f1f5f9' : 'none',
                background: vencida ? '#fff8f8' : 'white',
                opacity: t.estado === 'completada' ? 0.65 : 1,
                cursor: 'pointer', transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = vencida ? '#fff0f0' : '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = vencida ? '#fff8f8' : 'white'}
            >

              {/* Checkbox — stopPropagation so it doesn't open the modal */}
              <button
                onClick={e => { e.stopPropagation(); t.estado === 'pendiente' ? completar(t.id) : reabrir(t.id) }}
                style={{ width: '22px', height: '22px', borderRadius: '6px', border: '2px solid ' + (t.estado === 'completada' ? '#22c55e' : '#e2e8f0'), background: t.estado === 'completada' ? '#22c55e' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginRight: '12px', marginTop: '2px' }}>
                {t.estado === 'completada' && <Check size={13} color='white' />}
              </button>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, color: '#111111', fontSize: '14px', margin: '0 0 2px', textDecoration: t.estado === 'completada' ? 'line-through' : 'none' }}>
                  {t.titulo}
                </p>
                {t.descripcion && (
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 6px' }}>{t.descripcion}</p>
                )}

                {/* Meta chips */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Assigned user */}
                  {asignado && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: esPropia ? '#FDF8EE' : '#f1f5f9', color: esPropia ? '#C4A96B' : '#64748b', fontWeight: esPropia ? 600 : 400 }}>
                      <User size={10} />
                      {esPropia ? 'Yo' : (asignado.nombre || asignado.email)}
                    </span>
                  )}

                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: t.tipo === 'automatica' ? '#dbeafe' : '#f0fdf4', color: t.tipo === 'automatica' ? '#1d4ed8' : '#15803d' }}>
                    {t.tipo === 'automatica' ? 'Automática' : 'Manual'}
                  </span>

                  {t.polizas && (
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <FileText size={10} />{t.polizas.numero_poliza || 'Sin número'}
                    </span>
                  )}
                  {t.clientes && (
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Users size={10} />{t.clientes.nombre} {t.clientes.apellido || ''}
                    </span>
                  )}
                  {t.fecha_vencimiento && (
                    <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px', color: vencida ? '#ef4444' : '#64748b', fontWeight: vencida ? 600 : 400 }}>
                      <Clock size={10} />{vencida ? 'Venció' : 'Vence'}: {new Date(t.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {creador && (
                    <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px', color: '#94a3b8' }}>
                      Creada por {esCreador ? 'vos' : (creador.nombre || creador.email)}
                    </span>
                  )}
                </div>
              </div>

              {/* Assigned avatar (right side) */}
              {asignado && (
                <div title={asignado.nombre || asignado.email} style={{ marginLeft: '10px', marginTop: '2px', flexShrink: 0 }}>
                  <Avatar nombre={asignado.nombre || asignado.email} size={28} />
                </div>
              )}

              {/* Delete — stopPropagation so it doesn't open the modal */}
              <button onClick={e => { e.stopPropagation(); eliminar(t.id) }}
                style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, marginLeft: '4px', opacity: 0.35 }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.35'}>
                <Trash2 size={14} color='#ef4444' />
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Task detail / edit modal ── */}
      {tareaModal && (
        <TareaDetailModal
          tarea={tareaModal}
          usuarios={usuarios}
          onClose={() => setTareaModal(null)}
          onSaved={() => { setTareaModal(null); fetchTareas() }}
        />
      )}
    </div>
  )
}

/* ─── Tarea detail / edit modal ──────────────────────────────────── */
function TareaDetailModal({ tarea, usuarios, onClose, onSaved }) {
  const [titulo, setTitulo]       = useState(tarea.titulo || '')
  const [descripcion, setDesc]    = useState(tarea.descripcion || '')
  const [fechaVenc, setFechaVenc] = useState(tarea.fecha_vencimiento || '')
  const [asignadoA, setAsignadoA] = useState(tarea.asignado_a || '')
  const [saving, setSaving]       = useState(false)

  // Poliza link
  const [polizaSelected, setPolizaSelected] = useState(
    tarea.polizas ? { id: tarea.poliza_id, numero_poliza: tarea.polizas.numero_poliza, clientes: tarea.clientes } : null
  )
  const [polizaSearch, setPolizaSearch]   = useState('')
  const [polizaResults, setPolizaResults] = useState([])
  const [polizaLoading, setPolizaLoading] = useState(false)
  const [showPolizaDrop, setShowPolizaDrop] = useState(false)

  const inp = { width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', background:'white', color:'#1e293b', boxSizing:'border-box', outline:'none' }
  const lbl = { display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'5px' }

  const searchPolizas = async (q) => {
    setPolizaSearch(q)
    if (!q.trim()) { setPolizaResults([]); setShowPolizaDrop(false); return }
    setPolizaLoading(true); setShowPolizaDrop(true)
    const { data } = await supabase.from('polizas').select('id, numero_poliza, clientes(nombre, apellido)').ilike('numero_poliza', `%${q}%`).limit(8)
    setPolizaResults(data || []); setPolizaLoading(false)
  }

  const vencida = tarea.estado === 'pendiente' && tarea.fecha_vencimiento && new Date(tarea.fecha_vencimiento + 'T12:00:00') < new Date()

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('tareas').update({
      titulo,
      descripcion: descripcion || null,
      fecha_vencimiento: fechaVenc || null,
      asignado_a: asignadoA || null,
      poliza_id: polizaSelected?.id || null,
    }).eq('id', tarea.id)
    toast.success('Tarea actualizada')
    onSaved()
  }

  const handleToggleEstado = async () => {
    const nuevo = tarea.estado === 'pendiente' ? 'completada' : 'pendiente'
    await supabase.from('tareas').update({ estado: nuevo, fecha_completada: nuevo === 'completada' ? new Date().toISOString() : null }).eq('id', tarea.id)
    toast.success(nuevo === 'completada' ? 'Tarea completada ✓' : 'Tarea reabierta')
    onSaved()
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta tarea?')) return
    await supabase.from('tareas').delete().eq('id', tarea.id)
    toast.success('Tarea eliminada')
    onSaved()
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'16px', width:'100%', maxWidth:'480px', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'22px', height:'22px', borderRadius:'6px', border:'2px solid '+(tarea.estado==='completada'?'#22c55e':vencida?'#ef4444':'#e2e8f0'), background:tarea.estado==='completada'?'#22c55e':'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {tarea.estado==='completada' && <Check size={12} color='white' />}
            </div>
            <h3 style={{ fontSize:'16px', fontWeight:700, color:'#111111', margin:0 }}>
              {tarea.estado==='completada' ? 'Tarea completada' : vencida ? '⚠️ Tarea vencida' : 'Detalle de tarea'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background:'#f1f5f9', border:'none', borderRadius:'8px', width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <X size={14} color='#64748b' />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:'14px' }}>
          <div>
            <label style={lbl}>Título</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Descripción</label>
            <textarea value={descripcion} onChange={e => setDesc(e.target.value)} rows={3} placeholder='Sin descripción...'
              style={{ ...inp, resize:'vertical', minHeight:'72px', fontFamily:'inherit' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div>
              <label style={lbl}>Asignado a</label>
              <select value={asignadoA} onChange={e => setAsignadoA(e.target.value)} style={inp}>
                <option value=''>Sin asignar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre || u.email}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Fecha límite</label>
              <input type='date' value={fechaVenc} onChange={e => setFechaVenc(e.target.value)} style={inp} />
            </div>
          </div>

          {/* Poliza */}
          <div style={{ position:'relative' }}>
            <label style={lbl}>Póliza asociada <span style={{ color:'#94a3b8', fontWeight:400 }}>(opcional)</span></label>
            {polizaSelected ? (
              <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', border:'1.5px solid #C4A96B', borderRadius:'8px', background:'#FDF8EE' }}>
                <FileText size={14} color='#C4A96B' style={{ flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:'13px', fontWeight:700, color:'#111111', margin:0 }}>Póliza {polizaSelected.numero_poliza}</p>
                  {polizaSelected.clientes && <p style={{ fontSize:'11px', color:'#6B6B62', margin:0 }}>{polizaSelected.clientes.nombre} {polizaSelected.clientes.apellido||''}</p>}
                </div>
                <button type='button' onClick={() => setPolizaSelected(null)}
                  style={{ background:'rgba(196,169,107,0.15)', border:'none', borderRadius:'6px', width:'24px', height:'24px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                  <X size={12} color='#C4A96B' />
                </button>
              </div>
            ) : (
              <>
                <input value={polizaSearch} onChange={e => searchPolizas(e.target.value)} onFocus={() => polizaSearch && setShowPolizaDrop(true)}
                  placeholder='Buscar por número de póliza...' style={inp} autoComplete='off' />
                {showPolizaDrop && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:'4px', background:'white', border:'1.5px solid #e2e8f0', borderRadius:'10px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:50, overflow:'hidden', maxHeight:'180px', overflowY:'auto' }}>
                    {polizaLoading ? <p style={{ padding:'12px 14px', fontSize:'13px', color:'#94a3b8', margin:0 }}>Buscando...</p>
                      : polizaResults.length === 0 ? <p style={{ padding:'12px 14px', fontSize:'13px', color:'#94a3b8', margin:0 }}>Sin resultados</p>
                      : polizaResults.map(p => (
                        <button key={p.id} type='button'
                          onClick={() => { setPolizaSelected(p); setPolizaSearch(''); setPolizaResults([]); setShowPolizaDrop(false) }}
                          style={{ width:'100%', display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', background:'none', border:'none', borderBottom:'1px solid #f1f5f9', cursor:'pointer', textAlign:'left' }}
                          onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background='none'}>
                          <FileText size={13} color='#C4A96B' style={{ flexShrink:0 }} />
                          <div>
                            <p style={{ fontSize:'13px', fontWeight:600, color:'#111111', margin:0 }}>Póliza {p.numero_poliza}</p>
                            {p.clientes && <p style={{ fontSize:'11px', color:'#64748b', margin:0 }}>{p.clientes.nombre} {p.clientes.apellido||''}</p>}
                          </div>
                        </button>
                      ))
                    }
                  </div>
                )}
              </>
            )}
          </div>

          {/* Metadata chips */}
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontSize:'11px', padding:'3px 9px', borderRadius:'20px', background:tarea.tipo==='automatica'?'#dbeafe':'#f0fdf4', color:tarea.tipo==='automatica'?'#1d4ed8':'#15803d' }}>
              {tarea.tipo==='automatica'?'Automática':'Manual'}
            </span>
            <span style={{ fontSize:'11px', padding:'3px 9px', borderRadius:'20px', background:tarea.estado==='completada'?'#dcfce7':vencida?'#fef2f2':'#f1f5f9', color:tarea.estado==='completada'?'#15803d':vencida?'#ef4444':'#64748b' }}>
              {tarea.estado==='completada'?'Completada':vencida?'Vencida':'Pendiente'}
            </span>
            {tarea.creador && (
              <span style={{ fontSize:'11px', color:'#94a3b8' }}>
                Creada por <strong style={{ color:'#64748b' }}>{tarea.creador.nombre || tarea.creador.email}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid #f1f5f9', display:'flex', gap:'8px', justifyContent:'space-between' }}>
          <button onClick={handleDelete}
            style={{ padding:'9px 14px', background:'#fef2f2', color:'#ef4444', border:'1px solid #fecaca', borderRadius:'8px', fontSize:'13px', cursor:'pointer', fontWeight:500 }}>
            Eliminar
          </button>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={handleToggleEstado}
              style={{ padding:'9px 14px', background:tarea.estado==='completada'?'#f1f5f9':'#dcfce7', color:tarea.estado==='completada'?'#64748b':'#15803d', border:'none', borderRadius:'8px', fontSize:'13px', cursor:'pointer', fontWeight:600 }}>
              {tarea.estado==='completada'?'Reabrir':'✓ Completar'}
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:'9px 18px', background:'#111111', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
              {saving?'Guardando...':'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

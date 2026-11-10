import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CheckSquare, Plus, Check, Trash2, Clock, AlertCircle, FileText, Users } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Tareas() {
  const [tareas, setTareas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendiente')
  const [showForm, setShowForm] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaVenc, setFechaVenc] = useState('')

  useEffect(() => { fetchTareas() }, [filtro])

  const fetchTareas = async () => {
    setLoading(true)
    let query = supabase.from('tareas')
      .select('*, polizas(numero_poliza), clientes(nombre, apellido)')
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
    if (filtro !== 'todas') query = query.eq('estado', filtro)
    const { data } = await query
    setTareas(data || [])
    setLoading(false)
  }

  const completar = async (id) => {
    await supabase.from('tareas').update({ estado: 'completada', fecha_completada: new Date().toISOString() }).eq('id', id)
    toast.success('Tarea completada')
    fetchTareas()
  }

  const reabrir = async (id) => {
    await supabase.from('tareas').update({ estado: 'pendiente', fecha_completada: null }).eq('id', id)
    toast.success('Tarea reabierta')
    fetchTareas()
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar tarea?')) return
    await supabase.from('tareas').delete().eq('id', id)
    toast.success('Eliminada')
    fetchTareas()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tareas').insert({ titulo, descripcion, tipo: 'manual', estado: 'pendiente', fecha_vencimiento: fechaVenc || null, created_by: user?.id })
    toast.success('Tarea creada')
    setTitulo('')
    setDescripcion('')
    setFechaVenc('')
    setShowForm(false)
    fetchTareas()
  }

  const pendientes = tareas.filter(t => t.estado === 'pendiente')
  const vencidas = pendientes.filter(t => t.fecha_vencimiento && new Date(t.fecha_vencimiento) < new Date())
  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', color: '#1e293b', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden', marginBottom:'20px' }}>
        <div style={{ padding:'20px 24px', background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:'22px', fontWeight:700, color:'white', margin:0 }}>Tareas</h1>
            <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'14px', marginTop:'4px', marginBottom:0 }}>
              {pendientes.length} pendientes · {vencidas.length} vencidas
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 20px', background:'rgba(255,255,255,0.2)', color:'white', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
            <Plus size={16} /> Nueva tarea
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0C1E3D', marginBottom: '14px' }}>Nueva tarea manual</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '14px', marginBottom: '14px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Título *</label>
                <input value={titulo} onChange={e => setTitulo(e.target.value)} required placeholder="Ej: Llamar al cliente para renovación" style={inp} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Descripción</label>
                <input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Detalles adicionales..." style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Fecha límite</label>
                <input type='date' value={fechaVenc} onChange={e => setFechaVenc(e.target.value)} style={inp} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type='submit' style={{ padding: '9px 20px', background: '#0C1E3D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Crear tarea</button>
              <button type='button' onClick={() => setShowForm(false)} style={{ padding: '9px 20px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[['pendiente', 'Pendientes'], ['completada', 'Completadas'], ['todas', 'Todas']].map(([val, label]) => (
          <button key={val} onClick={() => setFiltro(val)}
            style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', background: filtro === val ? '#0C1E3D' : 'white', color: filtro === val ? 'white' : '#64748b', border: '1px solid ' + (filtro === val ? '#0C1E3D' : '#e2e8f0') }}>
            {label}{val === 'pendiente' ? ' (' + pendientes.length + ')' : ''}
          </button>
        ))}
      </div>

      {vencidas.length > 0 && filtro === 'pendiente' && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} color='#ef4444' />
          <p style={{ fontSize: '13px', color: '#dc2626', fontWeight: 500 }}>{vencidas.length} tarea(s) vencida(s) — requieren atención</p>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? <p style={{ padding: '24px', color: '#64748b' }}>Cargando...</p> :
          tareas.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <CheckSquare size={32} color='#cbd5e1' style={{ marginBottom: '12px' }} />
              <p style={{ color: '#94a3b8', fontWeight: 500 }}>
                {filtro === 'pendiente' ? 'No hay tareas pendientes' : filtro === 'completada' ? 'No hay tareas completadas' : 'No hay tareas'}
              </p>
            </div>
          ) : tareas.map((t, i) => {
            const vencida = t.estado === 'pendiente' && t.fecha_vencimiento && new Date(t.fecha_vencimiento) < new Date()
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', padding: '14px 20px', borderBottom: i < tareas.length - 1 ? '1px solid #f1f5f9' : 'none', background: vencida ? '#fff8f8' : 'white', opacity: t.estado === 'completada' ? 0.7 : 1 }}>
                <button onClick={() => t.estado === 'pendiente' ? completar(t.id) : reabrir(t.id)}
                  style={{ width: '22px', height: '22px', borderRadius: '6px', border: '2px solid ' + (t.estado === 'completada' ? '#22c55e' : '#e2e8f0'), background: t.estado === 'completada' ? '#22c55e' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginRight: '12px', marginTop: '1px' }}>
                  {t.estado === 'completada' && <Check size={13} color='white' />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: '#0C1E3D', fontSize: '14px', textDecoration: t.estado === 'completada' ? 'line-through' : 'none' }}>{t.titulo}</p>
                  {t.descripcion && <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{t.descripcion}</p>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: t.tipo === 'automatica' ? '#dbeafe' : '#f0fdf4', color: t.tipo === 'automatica' ? '#1d4ed8' : '#15803d' }}>
                      {t.tipo === 'automatica' ? 'Automática' : 'Manual'}
                    </span>
                    {t.polizas && <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}><FileText size={11} />{t.polizas.numero_poliza || 'Sin número'}</span>}
                    {t.clientes && <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}><Users size={11} />{t.clientes.nombre} {t.clientes.apellido || ''}</span>}
                    {t.fecha_vencimiento && (
                      <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px', color: vencida ? '#ef4444' : '#64748b', fontWeight: vencida ? 600 : 400 }}>
                        <Clock size={11} />{vencida ? 'Venció' : 'Vence'}: {new Date(t.fecha_vencimiento).toLocaleDateString('es-GT')}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => eliminar(t.id)} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, marginLeft: '8px', opacity: 0.4 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
                  <Trash2 size={14} color='#ef4444' />
                </button>
              </div>
            )
          })}
      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CheckSquare, Plus, Check, Trash2, Clock, AlertCircle, FileText, Users } from 'lucide-react'
import toast from 'react-hot-toast'

const tipoColors = { automatica:'#1A6BBA', manual:'#22c55e' }
const emptyForm = { titulo:'', descripcion:'', fecha_vencimiento:'' }

export default function Tareas() {
  const [tareas, setTareas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendiente')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchTareas() }, [filtro])

  const fetchTareas = async () => {
    setLoading(true)
    let query = supabase.from('tareas')
      .select('*, polizas(numero_poliza), clientes(nombre, apellido), requerimientos_pago(codigo)')
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false })

    if (filtro !== 'todas') query = query.eq('estado', filtro)

    const { data } = await query
    setTareas(data || [])
    setLoading(false)
  }

  const completarTarea = async (id) => {
    await supabase.from('tareas').update({ estado: 'completada', fecha_completada: new Date().toISOString() }).eq('id', id)
    toast.success('Tarea completada')
    fetchTareas()
  }

  const reabrirTarea = async (id) => {
    await supabase.from('tareas').update({ estado: 'pendiente', fecha_completada: null }).eq('id', id)
    toast.success('Tarea reabierta')
    fetchTareas()
  }

  const eliminarTarea = async (id) => {
    if (!confirm('¿Eliminar tarea?')) return
    await supabase.from('tareas').delete().eq('id', id)
    toast.success('Tarea eliminada')
    fetchTareas()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('tareas').insert({
      ...form,
      tipo: 'manual',
      estado: 'pendiente',
      fecha_vencimiento: form.fecha_vencimiento || null,
      created_by: user?.id
    })
    if (error) { toast.error('Error al crear tarea'); return }
    toast.success('Tarea creada')
    setForm(emptyForm)
    setShowForm(false)
    fetchTareas()
  }

  const pendientes = tareas.filter(t=>t.estado==='pendiente')
  const vencidas = pendientes.filter(t=>t.fecha_vencimiento && new Date(t.fecha_vencimiento)<new Date())
  const inputStyle = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', background:'white', color:'#1e293b', boxSizing:'border-box' }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
        <div>
          <h1 style={{fontSize:'24px',fontWeight:700,color:'#0C1E3D'}}>Tareas</h1>
          <p style={{color:'#64748b',fontSize:'14px',marginTop:'4px'}}>{pendientes.length} pendientes · {vencidas.length} vencidas</p>
        </div>
        <button onClick={()=>setShowForm(!showForm)}
          style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 20px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
          <Plus size={16}/> Nueva tarea
        </button>
      </div>

      {showForm && (
        <div style={{background:'white',borderRadius:'12px',padding:'20px 24px',border:'1px solid #e2e8f0',marginBottom:'20px'}}>
          <h3 style={{fontSize:'15px',fontWeight:600,color:'#0C1E3D',marginBottom:'14px'}}>Nueva tarea manual</h3>
          <form onSubmit={handleSubmit}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
              <div style={{gridColumn:'1/-1'}}>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Título *</label>
                <input value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} required placeholder="Ej: Llamar al cliente para renovación" style={inputStyle}/>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Descripción</label>
                <input value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} placeholder="Detalles adicionales..." style={inputStyle}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Fecha límite</label>
                <input type="date" value={form.fecha_vencimiento} onChange={e=>setForm({...form,fecha_vencimiento:e.target.value})} style={inputStyle}/>
              </div>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button type="submit" style={{padding:'9px 20px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>Crear tarea</button>
              <button type="button" onClick={()=>{setShowForm(false);setForm(emptyForm)}} style={{padding:'9px 20px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
        {[['pendiente','Pendientes'],['completada','Completadas'],['todas','Todas']].map(([val,label])=>(
          <button key={val} onClick={()=>setFiltro(val)}
            style={{padding:'8px 18px',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',
              background:filtro===val?'#0C1E3D':'white',color:filtro===val?'white':'#64748b',
              border:`1px solid ${filtro===val?'#0C1E3D':'#e2e8f0'}`}}>
            {label}{val==='pendiente'?` (${pendientes.length})`:''}
          </button>
        ))}
      </div>

      {vencidas.length > 0 && filtro==='pendiente' && (
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'12px',padding:'12px 16px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'8px'}}>
          <AlertCircle size={16} color="#ef4444"/>
          <p style={{fontSize:'13px',color:'#dc2626',fontWeight:500}}>{vencidas.length} tarea(s) vencida(s) — requieren atención inmediata</p>
        </div>
      )}

      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
        {loading ? <p style={{padding:'24px',color:'#64748b'}}>Cargando...</p> :
         tareas.length===0 ? (
          <div style={{padding:'48px',textAlign:'center'}}>
            <CheckSquare size={32} color="#cbd5e1" style={{marginBottom:'12px'}}/>
            <p style={{color:'#94a3b8',fontWeight:500}}>
              {filtro==='pendiente'?'No hay tareas pendientes 🎉':filtro==='completada'?'No hay tareas completadas':'No hay tareas'}
            </p>
          </div>
        ) : tareas.map((t,i)=>{
          const vencida = t.estado==='pendiente' && t.fecha_vencimiento && new Date(t.fecha_vencimiento)<new Date()
          return (
            <div key={t.id} style={{display:'flex',alignItems:'flex-start',padding:'14px 20px',borderBottom:i<tareas.length-1?'1px solid #f1f5f9':'none',
              background:vencida?'#fff8f8':'white',opacity:t.estado==='completada'?0.7:1}}>
              <button onClick={()=>t.estado==='pendiente'?completarTarea(t.id):reabrirTarea(t.id)}
                style={{width:'22px',height:'22px',borderRadius:'6px',border:`2px solid ${t.estado==='completada'?'#22c55e':'#e2e8f0'}`,
                  background:t.estado==='completada'?'#22c55e':'white',display:'flex',alignItems:'center',justifyContent:'center',
                  cursor:'pointer',flexShrink:0,marginRight:'12px',marginTop:'1px'}}>
                {t.estado==='completada'&&<Check size={13} color="white"/>}
              </button>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontWeight:600,color:'#0C1E3D',fontSize:'14px',textDecoration:t.estado==='completada'?'line-through':'none'}}>{t.titulo}</p>
                {t.descripcion && <p style={{fontSize:'12px',color:'#64748b',marginTop:'2px'}}>{t.descripcion}</p>}
                <div style={{display:'flex',gap:'8px',marginTop:'6px',flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:tipoColors[t.tipo]+'20',color:tipoColors[t.tipo],fontWeight:500}}>
                    {t.tipo==='automatica'?'Automática':'Manual'}
                  </span>
                  {t.polizas && (
                    <span style={{fontSize:'11px',color:'#64748b',display:'flex',alignItems:'center',gap:'3px'}}>
                      <FileText size={11}/> {t.polizas.numero_poliza||'Sin número'}
                    </span>
                  )}
                  {t.clientes && (
                    <span style={{fontSize:'11px',color:'#64748b',display:'flex',alignItems:'center',gap:'3px'}}>
                      <Users size={11}/> {t.clientes.nombre} {t.clientes.apellido||''}
                    </span>
                  )}
                  {t.fecha_vencimiento && (
                    <span style={{fontSize:'11px',display:'flex',alignItems:'center',gap:'3px',
                      color:vencida?'#ef4444':t.estado==='completada'?'#94a3b8':'#64748b',fontWeight:vencida?600:400}}>
                      <Clock size={11}/> {vencida?'Venció':'Vence'}: {new Date(t.fecha_vencimiento).toLocaleDateString('es-GT')}
                    </span>
                  )}
                  {t.estado==='completada' && t.fecha_completada && (
                    <span style={{fontSize:'11px',color:'#22c55e',display:'flex',alignItems:'center',gap:'3px'}}>
                      <Check size={11}/> Completada: {new Date(t.fecha_completada).toLocaleDateString('es-GT')}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={()=>eliminarTarea(t.id)}
                style={{padding:'5px',background:'none',border:'none',cursor:'pointer',flexShrink:0,marginLeft:'8px',opacity:0.5}}
                onMouseEnter={e=>e.currentTarget.style.opacity='1'}
                onMouseLeave={e=>e.currentTarget.style.opacity='0.5'}>
                <Trash2 size={14} color="#ef4444"/>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

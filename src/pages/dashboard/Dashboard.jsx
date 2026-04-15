import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { FileText, Users, CreditCard, AlertCircle, TrendingUp, Clock } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{background:'white',borderRadius:'12px',padding:'14px 16px',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:'12px'}}>
      <div style={{width:'48px',height:'48px',borderRadius:'10px',background:color+'20',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <p style={{fontSize:'13px',color:'#64748b',marginBottom:'4px'}}>{label}</p>
        <p style={{fontSize:'24px',fontWeight:700,color:'#0C1E3D'}}>{value}</p>
      </div>
    </div>
  )
}

function TareaItem({ tarea, onComplete }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 0',borderBottom:'1px solid #f1f5f9'}}>
      <input type="checkbox" onChange={()=>onComplete(tarea.id)}
        style={{width:'16px',height:'16px',cursor:'pointer',accentColor:'#1A6BBA'}} />
      <div style={{flex:1}}>
        <p style={{fontSize:'14px',color:'#1e293b',fontWeight:500}}>{tarea.titulo}</p>
        {tarea.fecha_vencimiento && (
          <p style={{fontSize:'12px',color: new Date(tarea.fecha_vencimiento) < new Date() ? '#ef4444' : '#64748b',marginTop:'2px'}}>
            Vence: {new Date(tarea.fecha_vencimiento).toLocaleDateString('es-GT')}
          </p>
        )}
      </div>
      <span style={{fontSize:'11px',padding:'3px 8px',borderRadius:'20px',
        background: tarea.tipo==='automatica' ? '#dbeafe' : '#f0fdf4',
        color: tarea.tipo==='automatica' ? '#1d4ed8' : '#15803d'}}>
        {tarea.tipo==='automatica' ? 'Auto' : 'Manual'}
      </span>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState({ polizas:0, clientes:0, reqs_pendientes:0, reqs_vencidos:0 })
  const [tareas, setTareas] = useState([])
  const [nuevaTarea, setNuevaTarea] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [{ count: polizas }, { count: clientes }, { count: reqs_pendientes }, { count: reqs_vencidos }, { data: tareasData }] = await Promise.all([
      supabase.from('polizas').select('*', { count: 'exact', head: true }).eq('activa', true),
      supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('activo', true).neq('tipo', 'prospecto'),
      supabase.from('requerimientos_pago').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
      supabase.from('requerimientos_pago').select('*', { count: 'exact', head: true }).eq('estado', 'vencido'),
      supabase.from('tareas').select('*').eq('estado', 'pendiente').order('fecha_vencimiento', { ascending: true }).limit(10)
    ])
    setStats({ polizas: polizas||0, clientes: clientes||0, reqs_pendientes: reqs_pendientes||0, reqs_vencidos: reqs_vencidos||0 })
    setTareas(tareasData || [])
    setLoading(false)
  }

  const completarTarea = async (id) => {
    await supabase.from('tareas').update({ estado: 'completada', fecha_completada: new Date().toISOString() }).eq('id', id)
    setTareas(tareas.filter(t => t.id !== id))
  }

  const agregarTarea = async (e) => {
    e.preventDefault()
    if (!nuevaTarea.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('tareas').insert({ titulo: nuevaTarea, tipo: 'manual', estado: 'pendiente', created_by: user?.id }).select().single()
    if (data) setTareas([...tareas, data])
    setNuevaTarea('')
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}><p style={{color:'#64748b'}}>Cargando...</p></div>

  return (
    <div>
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'20px'}}>
        <div style={{padding:'20px 24px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <h1 style={{fontSize:'22px',fontWeight:700,color:'white',margin:0}}>Dashboard</h1>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:'14px',marginTop:'4px',marginBottom:0}}>
              {stats.polizas} pólizas · {stats.clientes} clientes · {stats.reqs_pendientes} reqs pendientes
            </p>
          </div>
          <div style={{width:'44px',height:'44px',borderRadius:'10px',background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <TrendingUp size={20} color='white'/>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'12px',marginBottom:'20px'}}>
        <StatCard icon={FileText} label="Pólizas activas" value={stats.polizas} color="#1A6BBA" />
        <StatCard icon={Users} label="Clientes activos" value={stats.clientes} color="#0C1E3D" />
        <StatCard icon={CreditCard} label="Reqs. pendientes" value={stats.reqs_pendientes} color="#C8A84B" />
        <StatCard icon={AlertCircle} label="Reqs. vencidos" value={stats.reqs_vencidos} color="#ef4444" />
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:'24px'}}>
        <div style={{background:'white',borderRadius:'12px',padding:'24px',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'20px'}}>
            <Clock size={18} color="#1A6BBA" />
            <h2 style={{fontSize:'16px',fontWeight:600,color:'#0C1E3D'}}>Tareas pendientes</h2>
            <span style={{marginLeft:'auto',background:'#dbeafe',color:'#1d4ed8',fontSize:'12px',padding:'2px 8px',borderRadius:'20px'}}>{tareas.length}</span>
          </div>
          {tareas.length === 0 ? (
            <p style={{color:'#94a3b8',fontSize:'14px',textAlign:'center',padding:'24px 0'}}>No hay tareas pendientes 🎉</p>
          ) : (
            tareas.map(t => <TareaItem key={t.id} tarea={t} onComplete={completarTarea} />)
          )}
          <form onSubmit={agregarTarea} style={{display:'flex',gap:'8px',marginTop:'16px'}}>
            <input value={nuevaTarea} onChange={e=>setNuevaTarea(e.target.value)} placeholder="Nueva tarea..."
              style={{flex:1,padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',outline:'none'}} />
            <button type="submit" style={{padding:'8px 16px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>
              + Agregar
            </button>
          </form>
        </div>

        <div style={{background:'white',borderRadius:'12px',padding:'24px',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'20px'}}>
            <TrendingUp size={18} color="#1A6BBA" />
            <h2 style={{fontSize:'16px',fontWeight:600,color:'#0C1E3D'}}>Resumen del sistema</h2>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            {[
              { label: 'Pólizas activas', value: stats.polizas, color: '#1A6BBA' },
              { label: 'Clientes activos', value: stats.clientes, color: '#0C1E3D' },
              { label: 'Reqs. pendientes de pago', value: stats.reqs_pendientes, color: '#C8A84B' },
              { label: 'Reqs. vencidos', value: stats.reqs_vencidos, color: '#ef4444' },
            ].map(item => (
              <div key={item.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #f1f5f9'}}>
                <span style={{fontSize:'14px',color:'#475569'}}>{item.label}</span>
                <span style={{fontSize:'16px',fontWeight:700,color:item.color}}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

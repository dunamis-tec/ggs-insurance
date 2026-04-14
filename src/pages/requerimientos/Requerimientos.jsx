import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CreditCard, Search, Filter, CheckCircle, Clock, AlertCircle, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

const estadoColors = { pendiente:'#f59e0b', pagado:'#22c55e', vencido:'#ef4444' }
const estadoIcons = { pendiente: Clock, pagado: CheckCircle, vencido: AlertCircle }

export default function Requerimientos() {
  const [reqs, setReqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [uploading, setUploading] = useState(null)
  const [selectedReq, setSelectedReq] = useState(null)

  useEffect(() => { fetchReqs() }, [])

  const fetchReqs = async () => {
    setLoading(true)
    const { data } = await supabase.from('requerimientos_pago')
      .select('*, polizas(numero_poliza, clientes(nombre, apellido), aseguradoras(nombre, logo_url))')
      .order('fecha_vencimiento', { ascending: true })
    setReqs(data || [])
    setLoading(false)
  }

  const marcarPagado = async (id) => {
    await supabase.from('requerimientos_pago').update({ estado: 'pagado', fecha_pago: new Date().toISOString().split('T')[0] }).eq('id', id)
    toast.success('Marcado como pagado')
    fetchReqs()
  }

  const marcarPendiente = async (id) => {
    await supabase.from('requerimientos_pago').update({ estado: 'pendiente', fecha_pago: null }).eq('id', id)
    toast.success('Marcado como pendiente')
    fetchReqs()
  }

  const handleComprobante = async (e, reqId) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(reqId)
    const fileName = `comprobantes/${reqId}_${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true })
    if (error) { toast.error('Error al subir comprobante'); setUploading(null); return }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName)
    await supabase.from('requerimientos_pago').update({ comprobante_url: publicUrl }).eq('id', reqId)
    toast.success('Comprobante subido')
    setUploading(null)
    fetchReqs()
  }

  const filtered = reqs.filter(r => {
    const matchSearch = ((r.codigo||'')+' '+(r.polizas?.numero_poliza||'')+' '+(r.polizas?.clientes?.nombre||'')+' '+(r.polizas?.aseguradoras?.nombre||'')).toLowerCase().includes(search.toLowerCase())
    const matchEstado = filtroEstado === 'todos' || r.estado === filtroEstado
    return matchSearch && matchEstado
  })

  const totalPendiente = reqs.filter(r=>r.estado==='pendiente').reduce((s,r)=>s+parseFloat(r.monto||0),0)
  const totalPagado = reqs.filter(r=>r.estado==='pagado').reduce((s,r)=>s+parseFloat(r.monto||0),0)
  const totalVencido = reqs.filter(r=>r.estado==='vencido').reduce((s,r)=>s+parseFloat(r.monto||0),0)

  return (
    <div>
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'20px'}}>
        <div style={{padding:'20px 24px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
            <div style={{width:'44px',height:'44px',borderRadius:'10px',background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <CreditCard size={22} color='white'/>
            </div>
            <div style={{textAlign:'left'}}>
              <h1 style={{fontSize:'22px',fontWeight:700,color:'white',margin:0}}>Requerimientos de pago</h1>
              <p style={{color:'rgba(255,255,255,0.7)',fontSize:'14px',marginTop:'4px',marginBottom:0}}>
                {reqs.length} total · {reqs.filter(r=>r.estado==='pendiente').length} pendientes · {reqs.filter(r=>r.estado==='vencido').length} vencidos
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'20px'}}>
        {[['Pendientes','pendiente',reqs.filter(r=>r.estado==='pendiente').length,'Q '+totalPendiente.toLocaleString(),'#f59e0b'],
          ['Pagados','pagado',reqs.filter(r=>r.estado==='pagado').length,'Q '+totalPagado.toLocaleString(),'#22c55e'],
          ['Vencidos','vencido',reqs.filter(r=>r.estado==='vencido').length,'Q '+totalVencido.toLocaleString(),'#ef4444']
        ].map(([label,estado,count,monto,color])=>(
          <div key={label} style={{background:'white',borderRadius:'12px',padding:'16px 20px',border:'1px solid #e2e8f0',cursor:'pointer',borderLeft:`4px solid ${color}`}}
            onClick={()=>setFiltroEstado(estado)}>
            <p style={{fontSize:'13px',color:'#64748b',marginBottom:'4px'}}>{label}</p>
            <p style={{fontSize:'22px',fontWeight:700,color}}>{count}</p>
            <p style={{fontSize:'12px',color:'#94a3b8',marginTop:'2px'}}>{monto}</p>
          </div>
        ))}
      </div>

      <div style={{background:'white',borderRadius:'12px',padding:'14px 16px',border:'1px solid #e2e8f0',marginBottom:'16px',display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:'200px',position:'relative'}}>
          <Search size={16} color="#94a3b8" style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por código, póliza, cliente..."
            style={{width:'100%',padding:'9px 12px 9px 36px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',background:'white',color:'#1e293b',boxSizing:'border-box'}}/>
        </div>
        <div style={{display:'flex',gap:'6px'}}>
          {['todos','pendiente','pagado','vencido'].map(e=>(
            <button key={e} onClick={()=>setFiltroEstado(e)}
              style={{padding:'7px 14px',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontWeight:500,
                background:filtroEstado===e?'#0C1E3D':'white',
                color:filtroEstado===e?'white':'#64748b',
                border:`1px solid ${filtroEstado===e?'#0C1E3D':'#e2e8f0'}`}}>
              {e.charAt(0).toUpperCase()+e.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
        {loading ? <p style={{padding:'24px',color:'#64748b'}}>Cargando...</p> :
         filtered.length===0 ? (
          <div style={{padding:'48px',textAlign:'center'}}>
            <CreditCard size={32} color="#cbd5e1" style={{marginBottom:'12px'}}/>
            <p style={{color:'#94a3b8'}}>No hay requerimientos</p>
          </div>
        ) : filtered.map((r,i)=>{
          const Icon = estadoIcons[r.estado]||Clock
          return (
            <div key={r.id} style={{display:'flex',alignItems:'center',padding:'14px 20px',borderBottom:i<filtered.length-1?'1px solid #f1f5f9':'none'}}
              onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
              onMouseLeave={e=>e.currentTarget.style.background='white'}>
              <div style={{width:'36px',height:'36px',borderRadius:'8px',background:estadoColors[r.estado]+'20',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px',flexShrink:0}}>
                <Icon size={16} color={estadoColors[r.estado]}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontWeight:700,color:'#0C1E3D',fontSize:'13px'}}>{r.codigo} <span style={{fontWeight:400,color:'#64748b'}}>· Cuota {r.numero_cuota}/{r.total_cuotas}</span></p>
                <p style={{fontSize:'12px',color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {r.polizas?.numero_poliza||'Sin póliza'} · {r.polizas?.clientes?.nombre} · {r.polizas?.aseguradoras?.nombre}
                </p>
              </div>
              <div style={{textAlign:'right',marginRight:'16px',flexShrink:0}}>
                <p style={{fontSize:'15px',fontWeight:700,color:'#1e293b'}}>Q {parseFloat(r.monto||0).toLocaleString()}</p>
                <p style={{fontSize:'11px',color:new Date(r.fecha_vencimiento)<new Date()&&r.estado==='pendiente'?'#ef4444':'#64748b'}}>
                  {r.estado==='pagado'?'Pagado: '+new Date(r.fecha_pago).toLocaleDateString('es-GT'):'Vence: '+new Date(r.fecha_vencimiento).toLocaleDateString('es-GT')}
                </p>
              </div>
              <div style={{display:'flex',gap:'6px',alignItems:'center',flexShrink:0}}>
                {r.comprobante_url && (
                  <a href={r.comprobante_url} target="_blank" rel="noreferrer"
                    style={{padding:'5px 10px',background:'#dbeafe',color:'#1d4ed8',border:'none',borderRadius:'6px',fontSize:'12px',fontWeight:500,cursor:'pointer',textDecoration:'none'}}>
                    Ver comprobante
                  </a>
                )}
                <label style={{padding:'5px 10px',background:'#f1f5f9',color:'#374151',borderRadius:'6px',fontSize:'12px',fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}}>
                  <Upload size={12}/> {uploading===r.id?'Subiendo...':'Comprobante'}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>handleComprobante(e,r.id)} style={{display:'none'}} disabled={uploading===r.id}/>
                </label>
                {r.estado!=='pagado'
                  ? <button onClick={()=>marcarPagado(r.id)} style={{padding:'5px 10px',background:'#dcfce7',color:'#15803d',border:'none',borderRadius:'6px',fontSize:'12px',fontWeight:500,cursor:'pointer'}}>Marcar pagado</button>
                  : <button onClick={()=>marcarPendiente(r.id)} style={{padding:'5px 10px',background:'#fef9c3',color:'#a16207',border:'none',borderRadius:'6px',fontSize:'12px',fontWeight:500,cursor:'pointer'}}>Revertir</button>
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

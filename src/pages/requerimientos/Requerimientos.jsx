import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CreditCard, Search, CheckCircle, Clock, AlertCircle, Upload, ArrowLeft, ExternalLink, FileText, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'

const estadoColors  = { pendiente:'#64748b', por_cobrar:'#f59e0b', vencido:'#ef4444', pagado:'#22c55e' }
const estadoBg      = { pendiente:'#f1f5f9', por_cobrar:'#fef9c3', vencido:'#fef2f2', pagado:'#dcfce7' }
const estadoIcons   = { pendiente: Clock, por_cobrar: AlertCircle, vencido: AlertCircle, pagado: CheckCircle }
const estadoLabel   = { pendiente:'Pendiente', por_cobrar:'Por cobrar', vencido:'Vencido', pagado:'Pagado' }

const getDisplayEstado = (r) => {
  if (r.estado === 'pagado') return 'pagado'
  if (r.estado === 'vencido') return 'vencido'
  if (r.estado === 'pendiente') {
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const venc = new Date(r.fecha_vencimiento + 'T12:00:00')
    const diff = (venc - hoy) / (1000 * 60 * 60 * 24)
    if (diff < 0) return 'vencido'
    if (diff <= 15) return 'por_cobrar'
    return 'pendiente'
  }
  return 'pendiente'
}

export default function Requerimientos() {
  const [reqs, setReqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [uploading, setUploading] = useState(null)
  const [selected, setSelected] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => { fetchReqs() }, [])

  useEffect(() => {
    if (location.state?.openReqId && reqs.length > 0) {
      const r = reqs.find(r => r.id === location.state.openReqId)
      if (r) setSelected(r)
    }
  }, [location.state, reqs])

  const fetchReqs = async () => {
    setLoading(true)
    const { data } = await supabase.from('requerimientos_pago')
      .select('*, polizas(id, numero_poliza, clientes(id, nombre, apellido), aseguradoras(nombre, logo_url))')
      .order('fecha_vencimiento', { ascending: true })
    setReqs(data || [])
    setLoading(false)
  }

  const marcarPagado = async (id) => {
    await supabase.from('requerimientos_pago').update({ estado: 'pagado', fecha_pago: new Date().toISOString().split('T')[0] }).eq('id', id)
    toast.success('Marcado como pagado')
    fetchReqs()
    if (selected?.id === id) setSelected(r => ({ ...r, estado:'pagado', fecha_pago: new Date().toISOString().split('T')[0] }))
  }

  const marcarPendiente = async (id) => {
    await supabase.from('requerimientos_pago').update({ estado: 'pendiente', fecha_pago: null }).eq('id', id)
    toast.success('Marcado como pendiente')
    fetchReqs()
    if (selected?.id === id) setSelected(r => ({ ...r, estado:'pendiente', fecha_pago: null }))
  }

  const handleComprobante = async (e, req) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(req.id)
    const fileName = `comprobantes/${req.id}_${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true })
    if (error) { toast.error('Error al subir comprobante'); setUploading(null); return }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName)
    await supabase.from('requerimientos_pago').update({ comprobante_url: publicUrl }).eq('id', req.id)
    toast.success('Comprobante subido')
    setUploading(null)
    fetchReqs()
    if (selected?.id === req.id) setSelected(r => ({ ...r, comprobante_url: publicUrl }))
  }

  const filtered = reqs.filter(r => {
    const matchSearch = ((r.codigo||'')+' '+(r.polizas?.numero_poliza||'')+' '+(r.polizas?.clientes?.nombre||'')+' '+(r.polizas?.aseguradoras?.nombre||'')).toLowerCase().includes(search.toLowerCase())
    const displayEstado = getDisplayEstado(r)
    const matchEstado = filtroEstado === 'todos' || displayEstado === filtroEstado
    return matchSearch && matchEstado
  })

  const countBy = (estado) => reqs.filter(r => getDisplayEstado(r) === estado).length
  const montoBy = (estado) => reqs.filter(r => getDisplayEstado(r) === estado).reduce((s,r)=>s+parseFloat(r.monto||0),0)

  // --- DETALLE ---
  if (selected) {
    const displayEstado = getDisplayEstado(selected)
    const Icon = estadoIcons[displayEstado] || Clock
    return (
      <div>
        <button onClick={()=>setSelected(null)} style={{display:'flex',alignItems:'center',gap:'6px',color:'#64748b',background:'none',border:'none',cursor:'pointer',fontSize:'14px',marginBottom:'20px',padding:'0'}}>
          <ArrowLeft size={16}/> Volver a requerimientos
        </button>

        <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:'16px',alignItems:'start'}}>
          {/* Columna izquierda */}
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            {/* Header */}
            <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <div style={{padding:'20px 24px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <div style={{width:'48px',height:'48px',borderRadius:'10px',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <CreditCard size={22} color='white'/>
                  </div>
                  <div>
                    <h2 style={{fontSize:'18px',fontWeight:700,color:'white',margin:0}}>{selected.codigo}</h2>
                    <p style={{fontSize:'13px',color:'rgba(255,255,255,0.7)',margin:'3px 0 0'}}>Cuota {selected.numero_cuota} de {selected.total_cuotas}</p>
                  </div>
                </div>
              </div>
              <div style={{padding:'20px 24px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px'}}>
                <div style={{background:'#f8fafc',borderRadius:'8px',padding:'12px 14px'}}>
                  <p style={{fontSize:'11px',color:'#64748b',margin:0,textAlign:'left'}}>Monto</p>
                  <p style={{fontSize:'18px',fontWeight:700,color:'#0C1E3D',margin:'3px 0 0',textAlign:'left'}}>Q {parseFloat(selected.monto||0).toLocaleString()}</p>
                </div>
                <div style={{background:'#f8fafc',borderRadius:'8px',padding:'12px 14px'}}>
                  <p style={{fontSize:'11px',color:'#64748b',margin:0,textAlign:'left'}}>Vencimiento</p>
                  <p style={{fontSize:'14px',fontWeight:600,color:'#1e293b',margin:'3px 0 0',textAlign:'left'}}>{selected.fecha_vencimiento ? new Date(selected.fecha_vencimiento+'T12:00:00').toLocaleDateString('es-GT') : 'N/A'}</p>
                </div>
                {selected.estado === 'pagado' && (
                  <div style={{background:'#dcfce7',borderRadius:'8px',padding:'12px 14px'}}>
                    <p style={{fontSize:'11px',color:'#15803d',margin:0,textAlign:'left'}}>Fecha de pago</p>
                    <p style={{fontSize:'14px',fontWeight:600,color:'#15803d',margin:'3px 0 0',textAlign:'left'}}>{selected.fecha_pago ? new Date(selected.fecha_pago+'T12:00:00').toLocaleDateString('es-GT') : 'N/A'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Links póliza y cliente */}
            <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',padding:'20px 24px',display:'flex',flexDirection:'column',gap:'10px'}}>
              <p style={{fontSize:'13px',fontWeight:600,color:'#374151',margin:'0 0 4px',textAlign:'left'}}>Vínculos</p>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'#f8fafc',borderRadius:'8px',cursor:'pointer'}}
                onClick={()=>navigate('/polizas',{state:{openPolizaId:selected.polizas?.id, fromReqId:selected.id}})}>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <FileText size={16} color='#1A6BBA'/>
                  <div>
                    <p style={{fontSize:'12px',color:'#64748b',margin:0,textAlign:'left'}}>Póliza</p>
                    <p style={{fontSize:'14px',fontWeight:600,color:'#0C1E3D',margin:0,textAlign:'left'}}>{selected.polizas?.numero_poliza||'Sin número'}</p>
                  </div>
                </div>
                <ExternalLink size={14} color='#94a3b8'/>
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'#f8fafc',borderRadius:'8px',cursor:'pointer'}}
                onClick={()=>navigate('/clientes',{state:{openClienteId:selected.polizas?.clientes?.id, fromReqId:selected.id}})}>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <User size={16} color='#1A6BBA'/>
                  <div>
                    <p style={{fontSize:'12px',color:'#64748b',margin:0,textAlign:'left'}}>Cliente</p>
                    <p style={{fontSize:'14px',fontWeight:600,color:'#0C1E3D',margin:0,textAlign:'left'}}>{selected.polizas?.clientes?.nombre} {selected.polizas?.clientes?.apellido||''}</p>
                  </div>
                </div>
                <ExternalLink size={14} color='#94a3b8'/>
              </div>
            </div>
          </div>

          {/* Columna derecha */}
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            {/* Estado */}
            <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',padding:'20px 24px'}}>
              <p style={{fontSize:'13px',fontWeight:600,color:'#374151',margin:'0 0 12px',textAlign:'left'}}>Estado</p>
              <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 14px',background:estadoBg[displayEstado],borderRadius:'8px',marginBottom:'14px'}}>
                <Icon size={16} color={estadoColors[displayEstado]}/>
                <span style={{fontSize:'14px',fontWeight:600,color:estadoColors[displayEstado]}}>{estadoLabel[displayEstado]}</span>
              </div>
              {selected.estado !== 'pagado'
                ? <button onClick={()=>marcarPagado(selected.id)} style={{width:'100%',padding:'10px',background:'#dcfce7',color:'#15803d',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
                    <CheckCircle size={14} style={{marginRight:'6px',verticalAlign:'middle'}}/>Marcar como pagado
                  </button>
                : <button onClick={()=>marcarPendiente(selected.id)} style={{width:'100%',padding:'10px',background:'#fef9c3',color:'#a16207',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
                    Revertir a pendiente
                  </button>
              }
            </div>

            {/* Comprobante */}
            <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',padding:'20px 24px'}}>
              <p style={{fontSize:'13px',fontWeight:600,color:'#374151',margin:'0 0 12px',textAlign:'left'}}>Comprobante</p>
              {selected.comprobante_url ? (
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  <a href={selected.comprobante_url} target="_blank" rel="noreferrer"
                    style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',padding:'10px',background:'#dbeafe',color:'#1d4ed8',borderRadius:'8px',fontSize:'13px',fontWeight:600,textDecoration:'none'}}>
                    <ExternalLink size={14}/> Ver comprobante
                  </a>
                  <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',padding:'9px',background:'#f1f5f9',color:'#374151',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer'}}>
                    <Upload size={13}/> {uploading===selected.id?'Subiendo...':'Cambiar comprobante'}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>handleComprobante(e,selected)} style={{display:'none'}} disabled={uploading===selected.id}/>
                  </label>
                </div>
              ) : (
                <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',padding:'10px',background:'#f1f5f9',color:'#374151',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',border:'2px dashed #e2e8f0'}}>
                  <Upload size={14}/> {uploading===selected.id?'Subiendo...':'Subir comprobante'}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>handleComprobante(e,selected)} style={{display:'none'}} disabled={uploading===selected.id}/>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- LISTA ---
  return (
    <div>
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'20px'}}>
        <div style={{padding:'20px 24px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{textAlign:'left'}}>
            <h1 style={{fontSize:'22px',fontWeight:700,color:'white',margin:0}}>Requerimientos de pago</h1>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:'14px',marginTop:'4px',marginBottom:0}}>
              {reqs.length} total · {countBy('pendiente')+countBy('por_cobrar')} pendientes · {countBy('vencido')} vencidos
            </p>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}}>
        {[
          ['Pendientes',  'pendiente', countBy('pendiente'),  montoBy('pendiente'),  estadoColors.pendiente],
          ['Por cobrar',  'por_cobrar',countBy('por_cobrar'), montoBy('por_cobrar'), estadoColors.por_cobrar],
          ['Vencidos',    'vencido',   countBy('vencido'),    montoBy('vencido'),    estadoColors.vencido],
          ['Pagados',     'pagado',    countBy('pagado'),     montoBy('pagado'),     estadoColors.pagado],
        ].map(([label,estado,count,monto,color])=>(
          <div key={label} style={{background:'white',borderRadius:'12px',padding:'16px 20px',border:'1px solid #e2e8f0',cursor:'pointer',borderLeft:`4px solid ${color}`}}
            onClick={()=>setFiltroEstado(estado)}>
            <p style={{fontSize:'15px',fontWeight:700,color:'#374151',marginBottom:'4px',textAlign:'left'}}>{label}</p>
            <p style={{fontSize:'26px',fontWeight:700,color,margin:0,textAlign:'left'}}>{count}</p>
            <p style={{fontSize:'12px',color:'#94a3b8',marginTop:'4px',marginBottom:0,textAlign:'left'}}>Q {monto.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div style={{background:'white',borderRadius:'12px',padding:'14px 16px',border:'1px solid #e2e8f0',marginBottom:'16px',display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:'200px',position:'relative'}}>
          <Search size={16} color="#94a3b8" style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por código, póliza, cliente..."
            style={{width:'100%',padding:'9px 12px 9px 36px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',background:'white',color:'#1e293b',boxSizing:'border-box'}}/>
        </div>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
          {[['todos','Todos'],['pendiente','Pendiente'],['por_cobrar','Por cobrar'],['vencido','Vencido'],['pagado','Pagado']].map(([e,l])=>(
            <button key={e} onClick={()=>setFiltroEstado(e)}
              style={{padding:'7px 14px',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontWeight:500,
                background:filtroEstado===e?'#0C1E3D':'white',
                color:filtroEstado===e?'white':'#64748b',
                border:`1px solid ${filtroEstado===e?'#0C1E3D':'#e2e8f0'}`}}>
              {l}
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
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
                {['Nº Req.','Cuota','Póliza','Vencimiento','Monto','Estado'].map(h=>(
                  <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:'12px',fontWeight:600,color:'#64748b',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r,i)=>{
                const displayEstado = getDisplayEstado(r)
                const Icon = estadoIcons[displayEstado]||Clock
                return (
                  <tr key={r.id} style={{borderBottom:i<filtered.length-1?'1px solid #f1f5f9':'none',cursor:'pointer'}}
                    onClick={()=>setSelected(r)}
                    onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e=>e.currentTarget.style.background='white'}>
                    <td style={{padding:'12px 16px',fontSize:'13px',fontWeight:700,color:'#0C1E3D'}}>{r.codigo}</td>
                    <td style={{padding:'12px 16px',fontSize:'13px',color:'#64748b',whiteSpace:'nowrap'}}>{r.numero_cuota} / {r.total_cuotas}</td>
                    <td style={{padding:'12px 16px',fontSize:'13px',color:'#374151',maxWidth:'180px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {r.polizas?.numero_poliza||'—'}
                      <span style={{color:'#94a3b8',fontSize:'12px',display:'block'}}>{r.polizas?.clientes?.nombre} {r.polizas?.clientes?.apellido||''}</span>
                    </td>
                    <td style={{padding:'12px 16px',fontSize:'13px',color: displayEstado==='vencido'||displayEstado==='por_cobrar'?estadoColors[displayEstado]:'#374151',whiteSpace:'nowrap'}}>
                      {r.fecha_vencimiento ? new Date(r.fecha_vencimiento+'T12:00:00').toLocaleDateString('es-GT') : '—'}
                    </td>
                    <td style={{padding:'12px 16px',fontSize:'13px',fontWeight:600,color:'#1e293b',whiteSpace:'nowrap'}}>Q {parseFloat(r.monto||0).toLocaleString()}</td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{display:'inline-flex',alignItems:'center',gap:'5px',padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:500,background:estadoBg[displayEstado],color:estadoColors[displayEstado]}}>
                        <Icon size={11}/>{estadoLabel[displayEstado]}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

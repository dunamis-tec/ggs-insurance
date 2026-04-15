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
      .select('*, polizas(id, numero_poliza, clientes(id, nombre, apellido), aseguradoras(nombre, logo_url)), informe_liquidacion_enviado, fecha_informe_liquidacion, informe_comision_enviado, fecha_informe_comision')
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
        <button onClick={()=>{
          if (location.state?.fromInforme) navigate('/liquidaciones',{state:{activeTab:'historial'}})
          else if (location.state?.fromInformeComision) navigate('/comisiones',{state:{activeTab:'historial'}})
          else setSelected(null)
        }} style={{display:'flex',alignItems:'center',gap:'6px',color:'#64748b',background:'none',border:'none',cursor:'pointer',fontSize:'14px',marginBottom:'20px',padding:'0'}}>
          <ArrowLeft size={16}/> {location.state?.fromInforme || location.state?.fromInformeComision ? 'Volver a informes' : 'Volver a requerimientos'}
        </button>

        {/* ── Header full-width ── */}
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'16px'}}>
          <div style={{padding:'24px 28px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
              <div style={{width:'52px',height:'52px',borderRadius:'12px',background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <CreditCard size={24} color='white'/>
              </div>
              <div>
                <h2 style={{fontSize:'22px',fontWeight:700,color:'white',margin:0,letterSpacing:'-0.3px'}}>{selected.codigo}</h2>
                <p style={{fontSize:'13px',color:'rgba(255,255,255,0.65)',margin:'4px 0 0'}}>
                  Cuota {selected.numero_cuota} de {selected.total_cuotas}
                  {selected.polizas?.aseguradoras?.nombre && <span style={{marginLeft:'10px',opacity:0.8}}>· {selected.polizas.aseguradoras.nombre}</span>}
                </p>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'12px',flexShrink:0}}>
              <div style={{textAlign:'right'}}>
                <p style={{fontSize:'11px',color:'rgba(255,255,255,0.55)',margin:0}}>Monto</p>
                <p style={{fontSize:'26px',fontWeight:800,color:'white',margin:'2px 0 0',letterSpacing:'-0.5px'}}>Q {parseFloat(selected.monto||0).toLocaleString()}</p>
              </div>
              <div style={{width:'1px',height:'40px',background:'rgba(255,255,255,0.2)'}}/>
              <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 14px',borderRadius:'20px',background:selected.estado==='pagado'?'rgba(34,197,94,0.25)':displayEstado==='vencido'?'rgba(239,68,68,0.25)':displayEstado==='por_cobrar'?'rgba(245,158,11,0.25)':'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.2)'}}>
                <Icon size={13} color='white'/>
                <span style={{fontSize:'13px',fontWeight:600,color:'white'}}>{estadoLabel[displayEstado]}</span>
              </div>
            </div>
          </div>
          {/* Stats strip */}
          <div style={{display:'flex',borderTop:'1px solid #f1f5f9'}}>
            {[
              ['Vencimiento', selected.fecha_vencimiento ? new Date(selected.fecha_vencimiento+'T12:00:00').toLocaleDateString('es-GT') : '—', displayEstado==='vencido'?'#ef4444':displayEstado==='por_cobrar'?'#f59e0b':'#1e293b'],
              ['Fecha de pago', selected.fecha_pago ? new Date(selected.fecha_pago+'T12:00:00').toLocaleDateString('es-GT') : '—', '#22c55e'],
              ['Póliza', selected.polizas?.numero_poliza || '—', '#1A6BBA'],
              ['Cliente', `${selected.polizas?.clientes?.nombre||''} ${selected.polizas?.clientes?.apellido||''}`.trim() || '—', '#0C1E3D'],
            ].map(([label, value, color], idx, arr) => (
              <div key={label} style={{flex:1,padding:'14px 20px',borderRight:idx<arr.length-1?'1px solid #f1f5f9':'none'}}>
                <p style={{fontSize:'11px',color:'#94a3b8',margin:0,textTransform:'uppercase',letterSpacing:'0.5px'}}>{label}</p>
                <p style={{fontSize:'14px',fontWeight:600,color,margin:'4px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Body 2-col ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:'16px',alignItems:'start'}}>

          {/* Columna izquierda */}
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>

            {/* Vínculos */}
            <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>
                <p style={{fontSize:'13px',fontWeight:600,color:'#374151',margin:0}}>Vínculos</p>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderRight:'1px solid #f1f5f9',cursor:'pointer'}}
                  onClick={()=>navigate('/polizas',{state:{openPolizaId:selected.polizas?.id, fromReqId:selected.id}})}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='white'}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{width:'38px',height:'38px',borderRadius:'8px',background:'#eff6ff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <FileText size={16} color='#1A6BBA'/>
                    </div>
                    <div>
                      <p style={{fontSize:'11px',color:'#94a3b8',margin:0,textTransform:'uppercase',letterSpacing:'0.4px'}}>Póliza</p>
                      <p style={{fontSize:'15px',fontWeight:700,color:'#0C1E3D',margin:'2px 0 0'}}>{selected.polizas?.numero_poliza||'Sin número'}</p>
                    </div>
                  </div>
                  <ExternalLink size={14} color='#94a3b8'/>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',cursor:'pointer'}}
                  onClick={()=>navigate('/clientes',{state:{openClienteId:selected.polizas?.clientes?.id, fromReqId:selected.id}})}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='white'}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{width:'38px',height:'38px',borderRadius:'8px',background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <User size={16} color='#15803d'/>
                    </div>
                    <div>
                      <p style={{fontSize:'11px',color:'#94a3b8',margin:0,textTransform:'uppercase',letterSpacing:'0.4px'}}>Cliente</p>
                      <p style={{fontSize:'15px',fontWeight:700,color:'#0C1E3D',margin:'2px 0 0'}}>{selected.polizas?.clientes?.nombre} {selected.polizas?.clientes?.apellido||''}</p>
                    </div>
                  </div>
                  <ExternalLink size={14} color='#94a3b8'/>
                </div>
              </div>
            </div>

            {/* Comprobante */}
            <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <p style={{fontSize:'13px',fontWeight:600,color:'#374151',margin:0}}>Comprobante de pago</p>
                {selected.comprobante_url && (
                  <a href={selected.comprobante_url} target="_blank" rel="noreferrer"
                    style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'12px',color:'#1d4ed8',fontWeight:500,textDecoration:'none'}}>
                    <ExternalLink size={12}/> Ver archivo
                  </a>
                )}
              </div>
              <div style={{padding:'16px 20px'}}>
                {selected.comprobante_url ? (
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'8px',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <FileText size={18} color='#1d4ed8'/>
                    </div>
                    <div style={{flex:1}}>
                      <p style={{fontSize:'13px',fontWeight:600,color:'#0C1E3D',margin:0}}>Comprobante subido</p>
                      <p style={{fontSize:'12px',color:'#64748b',margin:'2px 0 0'}}>Archivo adjunto disponible</p>
                    </div>
                    <label style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 12px',background:'#f1f5f9',color:'#374151',borderRadius:'7px',fontSize:'12px',fontWeight:500,cursor:'pointer',whiteSpace:'nowrap'}}>
                      <Upload size={12}/> {uploading===selected.id?'Subiendo...':'Cambiar'}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>handleComprobante(e,selected)} style={{display:'none'}} disabled={uploading===selected.id}/>
                    </label>
                  </div>
                ) : (
                  <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',padding:'20px',background:'#f8fafc',color:'#64748b',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',border:'2px dashed #e2e8f0',transition:'all 0.15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background='#eff6ff';e.currentTarget.style.borderColor='#93c5fd';e.currentTarget.style.color='#1d4ed8'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#64748b'}}>
                    <Upload size={16}/> {uploading===selected.id?'Subiendo...':'Subir comprobante'}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>handleComprobante(e,selected)} style={{display:'none'}} disabled={uploading===selected.id}/>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Columna derecha */}
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>

            {/* Estado + acción */}
            <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>
                <p style={{fontSize:'13px',fontWeight:600,color:'#374151',margin:0}}>Estado</p>
              </div>
              <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:'10px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 16px',background:estadoBg[displayEstado],borderRadius:'10px',border:`1px solid ${estadoColors[displayEstado]}22`}}>
                  <Icon size={18} color={estadoColors[displayEstado]}/>
                  <span style={{fontSize:'15px',fontWeight:700,color:estadoColors[displayEstado]}}>{estadoLabel[displayEstado]}</span>
                </div>
                {selected.estado !== 'pagado'
                  ? <button onClick={()=>marcarPagado(selected.id)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',width:'100%',padding:'11px',background:'#16a34a',color:'white',border:'none',borderRadius:'9px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
                      <CheckCircle size={15}/> Marcar como pagado
                    </button>
                  : <button onClick={()=>marcarPendiente(selected.id)} style={{width:'100%',padding:'11px',background:'#fef9c3',color:'#a16207',border:'1px solid #fde68a',borderRadius:'9px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
                      Revertir a pendiente
                    </button>
                }
              </div>
            </div>

            {/* Informes (Liquidación + Comisión) */}
            <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>
                <p style={{fontSize:'13px',fontWeight:600,color:'#374151',margin:0}}>Informes</p>
              </div>
              {/* Fila Liquidación */}
              <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:'12px'}}>
                <div style={{width:'34px',height:'34px',borderRadius:'8px',background:selected.informe_liquidacion_enviado?'#dcfce7':'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {selected.informe_liquidacion_enviado ? <CheckCircle size={16} color='#15803d'/> : <Clock size={16} color='#94a3b8'/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:'12px',color:'#94a3b8',margin:0,textTransform:'uppercase',letterSpacing:'0.4px'}}>Liquidación</p>
                  <p style={{fontSize:'13px',fontWeight:600,color:selected.informe_liquidacion_enviado?'#15803d':'#64748b',margin:'2px 0 0'}}>
                    {selected.informe_liquidacion_enviado ? 'Liquidado' : 'Pendiente'}
                  </p>
                  {selected.informe_liquidacion_enviado && selected.fecha_informe_liquidacion && (
                    <p style={{fontSize:'11px',color:'#94a3b8',margin:'1px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {new Date(selected.fecha_informe_liquidacion).toLocaleDateString('es-GT',{day:'2-digit',month:'short',year:'numeric'})}
                    </p>
                  )}
                </div>
              </div>
              {/* Fila Comisión */}
              <div style={{padding:'14px 20px',display:'flex',alignItems:'center',gap:'12px'}}>
                <div style={{width:'34px',height:'34px',borderRadius:'8px',background:selected.informe_comision_enviado?'#dcfce7':'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {selected.informe_comision_enviado ? <CheckCircle size={16} color='#15803d'/> : <Clock size={16} color='#94a3b8'/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:'12px',color:'#94a3b8',margin:0,textTransform:'uppercase',letterSpacing:'0.4px'}}>Comisión</p>
                  <p style={{fontSize:'13px',fontWeight:600,color:selected.informe_comision_enviado?'#15803d':'#64748b',margin:'2px 0 0'}}>
                    {selected.informe_comision_enviado ? 'Enviado' : 'Pendiente'}
                  </p>
                  {selected.informe_comision_enviado && selected.fecha_informe_comision && (
                    <p style={{fontSize:'11px',color:'#94a3b8',margin:'1px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {new Date(selected.fecha_informe_comision).toLocaleDateString('es-GT',{day:'2-digit',month:'short',year:'numeric'})}
                    </p>
                  )}
                </div>
              </div>
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

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'20px'}}>
        {[
          ['Por cobrar',           'por_cobrar', countBy('por_cobrar'), montoBy('por_cobrar'), estadoColors.por_cobrar],
          ['Vencidos',             'vencido',    countBy('vencido'),    montoBy('vencido'),    estadoColors.vencido],
          ['Pendiente de liquidar','pagado',     reqs.filter(r=>r.estado==='pagado'&&!r.informe_liquidacion_enviado).length, reqs.filter(r=>r.estado==='pagado'&&!r.informe_liquidacion_enviado).reduce((s,r)=>s+parseFloat(r.monto||0),0), '#a16207'],
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
                {['Nº Req.','Cuota','Póliza','Vencimiento','Monto','Estado','Liquidación'].map(h=>(
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
                    <td style={{padding:'12px 16px'}}>
                      {r.estado === 'pagado' ? (
                        r.informe_liquidacion_enviado
                          ? <span style={{display:'inline-flex',alignItems:'center',gap:'4px',padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:500,background:'#dcfce7',color:'#15803d'}}><CheckCircle size={11}/>Liquidado</span>
                          : <span style={{display:'inline-flex',alignItems:'center',gap:'4px',padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:500,background:'#fef9c3',color:'#a16207'}}><Clock size={11}/>Pendiente</span>
                      ) : <span style={{fontSize:'12px',color:'#cbd5e1'}}>—</span>}
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

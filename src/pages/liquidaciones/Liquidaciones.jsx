import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { BookOpen, Search, Copy, CheckCircle, Send, Filter, ChevronDown, ChevronUp, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'

const toDateStr = (d) => d.toISOString().split('T')[0]
const addDays = (dateStr, n) => { const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() + n); return toDateStr(d) }
const fmtDate = (dateStr) => new Date(dateStr + 'T12:00:00').toLocaleDateString('es-GT', { day:'2-digit', month:'long', year:'numeric' })

export default function Liquidaciones() {
  const [reqs, setReqs] = useState([])
  const [aseguradoras, setAseguradoras] = useState([])
  const [informes, setInformes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroAseguradora, setFiltroAseguradora] = useState('')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(toDateStr(new Date()))
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(toDateStr(new Date()))
  const [selectedIds, setSelectedIds] = useState([])
  const [activeTab, setActiveTab] = useState('pendientes')
  const [searchHistorial, setSearchHistorial] = useState('')
  const [filtroFechaHistorial, setFiltroFechaHistorial] = useState(null) // null = todas las fechas
  const [expandedInforme, setExpandedInforme] = useState(null)
  const [informeReqs, setInformeReqs] = useState({})
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    fetchAll()
    if (location.state?.activeTab) setActiveTab(location.state.activeTab)
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: reqsData }, { data: asegData }, { data: informesData }, { data: allInformeReqsData }] = await Promise.all([
      supabase.from('requerimientos_pago')
        .select('*, polizas(numero_poliza, aseguradoras(id, nombre, logo_url), clientes(nombre, apellido))')
        .eq('estado', 'pagado').eq('informe_liquidacion_enviado', false)
        .order('fecha_pago', { ascending: false }),
      supabase.from('aseguradoras').select('id, nombre, logo_url').eq('activa', true).order('nombre'),
      supabase.from('informes_enviados').select('*, aseguradoras(nombre, logo_url)').eq('tipo', 'liquidacion').order('created_at', { ascending: false }).limit(200),
      supabase.from('requerimientos_pago')
        .select('*, polizas(id, numero_poliza, clientes(id, nombre, apellido))')
        .not('informe_id', 'is', null)
        .order('fecha_pago', { ascending: true })
    ])
    setReqs(reqsData || [])
    setAseguradoras(asegData || [])
    setInformes(informesData || [])
    // Agrupar reqs por informe_id
    const grouped = {}
    ;(allInformeReqsData || []).forEach(r => {
      if (!grouped[r.informe_id]) grouped[r.informe_id] = []
      grouped[r.informe_id].push(r)
    })
    setInformeReqs(grouped)
    setLoading(false)
  }

  const toggleExpandInforme = (id) => setExpandedInforme(prev => prev === id ? null : id)

  // Filtro de historial
  const filteredInformes = informes.filter(inf => {
    // Filtro por fecha
    if (filtroFechaHistorial) {
      const infDate = toDateStr(new Date(inf.created_at))
      if (infDate !== filtroFechaHistorial) return false
    }
    // Filtro por texto
    if (!searchHistorial) return true
    const q = searchHistorial.toLowerCase()
    const matchInforme = (inf.aseguradoras?.nombre||'').toLowerCase().includes(q)
    const reqsDelInforme = informeReqs[inf.id] || []
    const matchReqs = reqsDelInforme.some(r =>
      (r.codigo||'').toLowerCase().includes(q) ||
      (r.polizas?.numero_poliza||'').toLowerCase().includes(q) ||
      ((r.polizas?.clientes?.nombre||'')+' '+(r.polizas?.clientes?.apellido||'')).toLowerCase().includes(q)
    )
    return matchInforme || matchReqs
  })

  // Pendientes
  const filtered = reqs.filter(r => {
    const matchAseg = !filtroAseguradora || r.polizas?.aseguradoras?.id === filtroAseguradora
    const matchDesde = !filtroFechaDesde || r.fecha_pago >= filtroFechaDesde
    const matchHasta = !filtroFechaHasta || r.fecha_pago <= filtroFechaHasta
    return matchAseg && matchDesde && matchHasta
  })

  const selectedAsegId = selectedIds.length > 0 ? filtered.find(r=>r.id===selectedIds[0])?.polizas?.aseguradoras?.id : null

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) { setSelectedIds(prev => prev.filter(i=>i!==id)); return }
    if (selectedIds.length > 0) {
      const thisAsegId = filtered.find(r=>r.id===id)?.polizas?.aseguradoras?.id
      if (selectedAsegId !== thisAsegId) {
        toast.error('Solo puedes seleccionar requerimientos de la misma aseguradora')
        return
      }
    }
    setSelectedIds(prev => [...prev, id])
  }

  const selectableIds = selectedAsegId
    ? filtered.filter(r=>r.polizas?.aseguradoras?.id===selectedAsegId).map(r=>r.id)
    : filtered.map(r=>r.id)
  const selectAll = () => {
    if (selectedIds.length === selectableIds.length) setSelectedIds([])
    else setSelectedIds(selectableIds)
  }
  const totalSeleccionado = filtered.filter(r=>selectedIds.includes(r.id)).reduce((s,r)=>s+parseFloat(r.monto||0),0)

  const generarResumenTexto = () => {
    const sel = filtered.filter(r=>selectedIds.includes(r.id))
    if (sel.length === 0) { toast.error('Seleccioná al menos un requerimiento'); return '' }
    const asegNombre = sel[0]?.polizas?.aseguradoras?.nombre || 'Aseguradora'
    let texto = `LIQUIDACIÓN - ${asegNombre}\nFecha: ${new Date().toLocaleDateString('es-GT')}\n\n`
    texto += `${'Código'.padEnd(20)} ${'Póliza'.padEnd(15)} ${'Cliente'.padEnd(25)} ${'Monto'.padStart(12)}\n` + '─'.repeat(75) + '\n'
    sel.forEach(r => { texto += `${(r.codigo||'').padEnd(20)} ${(r.polizas?.numero_poliza||'').padEnd(15)} ${((r.polizas?.clientes?.nombre||'')+' '+(r.polizas?.clientes?.apellido||'')).slice(0,24).padEnd(25)} ${'Q '+parseFloat(r.monto||0).toLocaleString()}\n` })
    texto += '─'.repeat(75) + '\n' + `${'TOTAL'.padEnd(62)} Q ${totalSeleccionado.toLocaleString()}\n\nTotal requerimientos: ${sel.length}`
    return texto
  }

  const copiarPortapapeles = () => { const t = generarResumenTexto(); if (t) { navigator.clipboard.writeText(t); toast.success('Resumen copiado') } }

  const marcarComoEnviado = async () => {
    if (selectedIds.length === 0) { toast.error('Seleccioná al menos un requerimiento'); return }
    const sel = filtered.filter(r=>selectedIds.includes(r.id))
    const asegId = sel[0]?.polizas?.aseguradoras?.id
    if (!asegId) { toast.error('No se pudo determinar la aseguradora'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: informeData, error } = await supabase.from('informes_enviados').insert({
      tipo: 'liquidacion', aseguradora_id: asegId,
      fecha_desde: filtroFechaDesde || sel[sel.length-1]?.fecha_pago,
      fecha_hasta: filtroFechaHasta || sel[0]?.fecha_pago,
      total_requerimientos: selectedIds.length, total_monto: totalSeleccionado, created_by: user?.id
    }).select().single()
    if (error) { toast.error('Error al crear informe'); return }
    await supabase.from('requerimientos_pago')
      .update({ informe_liquidacion_enviado: true, fecha_informe_liquidacion: new Date().toISOString(), informe_id: informeData.id })
      .in('id', selectedIds)
    toast.success(`${selectedIds.length} requerimiento(s) marcados como enviados`)
    setSelectedIds([])
    fetchAll()
  }

  const inp = { padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', background:'white', color:'#1e293b', boxSizing:'border-box' }

  return (
    <div>
      {/* Header */}
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'20px'}}>
        <div style={{padding:'20px 24px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{textAlign:'left'}}>
            <h1 style={{fontSize:'22px',fontWeight:700,color:'white',margin:0}}>Liquidaciones</h1>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:'14px',marginTop:'4px',marginBottom:0}}>
              {reqs.length} pendientes de envío · {informes.length} informes enviados
            </p>
          </div>
          <div style={{width:'44px',height:'44px',borderRadius:'10px',background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <BookOpen size={20} color='white'/>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
        {[['pendientes','Pendientes de envío'],['historial','Historial de informes']].map(([tab,label])=>(
          <button key={tab} onClick={()=>setActiveTab(tab)}
            style={{padding:'8px 20px',borderRadius:'8px',fontSize:'14px',fontWeight:500,cursor:'pointer',
              background:activeTab===tab?'#0C1E3D':'white',color:activeTab===tab?'white':'#64748b',
              border:`1px solid ${activeTab===tab?'#0C1E3D':'#e2e8f0'}`}}>
            {label}{tab==='pendientes'?` (${reqs.length})`:''}
          </button>
        ))}
      </div>

      {/* ─── TAB PENDIENTES ─── */}
      {activeTab==='pendientes' && (
        <>
          <div style={{background:'white',borderRadius:'12px',padding:'16px 20px',border:'1px solid #e2e8f0',marginBottom:'16px'}}>
            <p style={{fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'12px',display:'flex',alignItems:'center',gap:'6px'}}><Filter size={14}/> Filtros</p>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap',alignItems:'flex-end'}}>
              <div>
                <label style={{display:'block',fontSize:'12px',color:'#64748b',marginBottom:'4px'}}>Aseguradora</label>
                <select value={filtroAseguradora} onChange={e=>setFiltroAseguradora(e.target.value)} style={{...inp,minWidth:'180px'}}>
                  <option value=''>Todas</option>
                  {aseguradoras.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:'block',fontSize:'12px',color:'#64748b',marginBottom:'4px'}}>Fecha pago desde</label>
                <input type="date" value={filtroFechaDesde} onChange={e=>setFiltroFechaDesde(e.target.value)} style={inp}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'12px',color:'#64748b',marginBottom:'4px'}}>Fecha pago hasta</label>
                <input type="date" value={filtroFechaHasta} onChange={e=>setFiltroFechaHasta(e.target.value)} style={inp}/>
              </div>
              <button onClick={()=>{setFiltroAseguradora('');setFiltroFechaDesde(toDateStr(new Date()));setFiltroFechaHasta(toDateStr(new Date()))}}
                style={{...inp,cursor:'pointer',color:'#64748b'}}>Limpiar</button>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div style={{background:'#0C1E3D',borderRadius:'12px',padding:'14px 20px',marginBottom:'16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
              <div>
                <p style={{color:'white',fontWeight:600,fontSize:'14px'}}>{selectedIds.length} seleccionados · Q {totalSeleccionado.toLocaleString()}</p>
                <p style={{color:'rgba(255,255,255,0.6)',fontSize:'12px'}}>Listos para generar informe</p>
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={copiarPortapapeles} style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 16px',background:'rgba(255,255,255,0.15)',color:'white',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontWeight:500}}>
                  <Copy size={14}/> Copiar resumen
                </button>
                <button onClick={marcarComoEnviado} style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 16px',background:'#C8A84B',color:'#0C1E3D',border:'none',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontWeight:600}}>
                  <Send size={14}/> Marcar como enviado
                </button>
              </div>
            </div>
          )}

          <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',padding:'12px 20px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>
              <input type="checkbox" checked={selectedIds.length===selectableIds.length&&selectableIds.length>0} onChange={selectAll}
                style={{width:'16px',height:'16px',cursor:'pointer',accentColor:'#1A6BBA',marginRight:'12px'}}/>
              <span style={{fontSize:'13px',fontWeight:600,color:'#374151',flex:1}}>Requerimiento</span>
              <span style={{fontSize:'13px',fontWeight:600,color:'#374151',width:'140px'}}>Aseguradora</span>
              <span style={{fontSize:'13px',fontWeight:600,color:'#374151',width:'100px'}}>Fecha pago</span>
              <span style={{fontSize:'13px',fontWeight:600,color:'#374151',width:'100px',textAlign:'right'}}>Monto</span>
            </div>
            {loading ? <p style={{padding:'24px',color:'#64748b'}}>Cargando...</p> :
             filtered.length===0 ? (
              <div style={{padding:'48px',textAlign:'center'}}>
                <CheckCircle size={32} color="#22c55e" style={{marginBottom:'12px'}}/>
                <p style={{color:'#94a3b8',fontWeight:500}}>No hay requerimientos pendientes de liquidar</p>
              </div>
            ) : filtered.map((r,i)=>{
              const isDimmed = selectedAsegId && r.polizas?.aseguradoras?.id !== selectedAsegId
              const isSelected = selectedIds.includes(r.id)
              return (
              <div key={r.id} style={{display:'flex',alignItems:'center',padding:'12px 20px',borderBottom:i<filtered.length-1?'1px solid #f1f5f9':'none',background:isSelected?'#eff6ff':isDimmed?'#fafafa':'white',cursor:isDimmed?'not-allowed':'pointer',opacity:isDimmed?0.45:1,transition:'opacity 0.15s'}}
                onClick={()=>!isDimmed&&toggleSelect(r.id)}
                onMouseEnter={e=>{if(!isSelected&&!isDimmed)e.currentTarget.style.background='#f8fafc'}}
                onMouseLeave={e=>{if(!isSelected&&!isDimmed)e.currentTarget.style.background='white'}}>
                <input type="checkbox" checked={isSelected} disabled={isDimmed} onChange={()=>toggleSelect(r.id)}
                  style={{width:'16px',height:'16px',cursor:isDimmed?'not-allowed':'pointer',accentColor:'#1A6BBA',marginRight:'12px'}} onClick={e=>e.stopPropagation()}/>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontWeight:600,color:'#0C1E3D',fontSize:'13px',textAlign:'left',margin:0}}>{r.codigo}</p>
                  <p style={{fontSize:'12px',color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'left',margin:0}}>
                    {r.polizas?.numero_poliza||'Sin póliza'} · {r.polizas?.clientes?.nombre} {r.polizas?.clientes?.apellido||''}
                  </p>
                </div>
                <div style={{width:'140px',display:'flex',alignItems:'center',gap:'6px'}}>
                  {r.polizas?.aseguradoras?.logo_url && <img src={r.polizas.aseguradoras.logo_url} style={{width:'20px',height:'20px',objectFit:'contain',borderRadius:'3px'}}/>}
                  <span style={{fontSize:'12px',color:'#374151',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.polizas?.aseguradoras?.nombre}</span>
                </div>
                <p style={{width:'100px',fontSize:'12px',color:'#64748b',margin:0}}>{r.fecha_pago?new Date(r.fecha_pago+'T12:00:00').toLocaleDateString('es-GT'):'-'}</p>
                <p style={{width:'100px',fontSize:'14px',fontWeight:700,color:'#1e293b',textAlign:'right',margin:0}}>Q {parseFloat(r.monto||0).toLocaleString()}</p>
              </div>
              )
            })}
            {filtered.length > 0 && (
              <div style={{padding:'12px 20px',background:'#f8fafc',borderTop:'1px solid #e2e8f0',display:'flex',justifyContent:'flex-end',gap:'24px'}}>
                <span style={{fontSize:'13px',color:'#64748b'}}>{filtered.length} requerimientos</span>
                <span style={{fontSize:'14px',fontWeight:700,color:'#0C1E3D'}}>Total: Q {filtered.reduce((s,r)=>s+parseFloat(r.monto||0),0).toLocaleString()}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── TAB HISTORIAL ─── */}
      {activeTab==='historial' && (
        <>
          {/* Buscador + filtro de fecha */}
          <div style={{background:'white',borderRadius:'12px',padding:'14px 16px',border:'1px solid #e2e8f0',marginBottom:'16px',display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap'}}>
            {/* Buscador texto */}
            <div style={{flex:1,minWidth:'220px',position:'relative'}}>
              <Search size={16} color='#94a3b8' style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)'}}/>
              <input value={searchHistorial} onChange={e=>setSearchHistorial(e.target.value)}
                placeholder='Buscar por aseguradora, cliente, póliza, Nº req...'
                style={{width:'100%',padding:'9px 12px 9px 36px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',background:'white',color:'#1e293b',boxSizing:'border-box'}}/>
            </div>

            {/* Filtro fecha con flechas */}
            <div style={{display:'flex',alignItems:'center',gap:'6px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'4px 6px'}}>
              <button onClick={()=>setFiltroFechaHistorial(prev=>prev?addDays(prev,-1):addDays(toDateStr(new Date()),-1))}
                style={{width:'30px',height:'30px',display:'flex',alignItems:'center',justifyContent:'center',background:'white',border:'1px solid #e2e8f0',borderRadius:'6px',cursor:'pointer',flexShrink:0}}>
                <ChevronLeft size={16} color='#374151'/>
              </button>
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <input type="date" value={filtroFechaHistorial||''} onChange={e=>setFiltroFechaHistorial(e.target.value||null)}
                  style={{padding:'5px 8px',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'13px',background:'white',color:'#1e293b',width:'140px'}}/>
                {filtroFechaHistorial && (
                  <button onClick={()=>setFiltroFechaHistorial(null)}
                    style={{fontSize:'11px',color:'#94a3b8',background:'none',border:'none',cursor:'pointer',padding:'0',whiteSpace:'nowrap'}}>
                    Todas
                  </button>
                )}
              </div>
              <button onClick={()=>setFiltroFechaHistorial(prev=>prev?addDays(prev,1):addDays(toDateStr(new Date()),1))}
                style={{width:'30px',height:'30px',display:'flex',alignItems:'center',justifyContent:'center',background:'white',border:'1px solid #e2e8f0',borderRadius:'6px',cursor:'pointer',flexShrink:0}}>
                <ChevronRight size={16} color='#374151'/>
              </button>
            </div>
          </div>

          <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <p style={{fontSize:'14px',fontWeight:600,color:'#374151',margin:0,textAlign:'left'}}>
                Historial de informes enviados
              </p>
              <span style={{fontSize:'12px',color:'#94a3b8'}}>
                {filtroFechaHistorial ? fmtDate(filtroFechaHistorial) : `${filteredInformes.length} informes`}
              </span>
            </div>

            {loading ? <p style={{padding:'24px',color:'#64748b'}}>Cargando...</p> :
             filteredInformes.length===0 ? (
              <div style={{padding:'48px',textAlign:'center'}}>
                <BookOpen size={32} color="#cbd5e1" style={{marginBottom:'12px'}}/>
                <p style={{color:'#94a3b8'}}>{searchHistorial||filtroFechaHistorial ? 'No se encontraron informes' : 'No hay informes enviados aún'}</p>
              </div>
            ) : filteredInformes.map((inf,i)=>{
              const reqsInforme = informeReqs[inf.id] || []
              // Si hay búsqueda activa, filtrar reqs que coincidan
              const reqsAMostrar = searchHistorial
                ? reqsInforme.filter(r => {
                    const q = searchHistorial.toLowerCase()
                    return (r.codigo||'').toLowerCase().includes(q)
                      || (r.polizas?.numero_poliza||'').toLowerCase().includes(q)
                      || ((r.polizas?.clientes?.nombre||'')+' '+(r.polizas?.clientes?.apellido||'')).toLowerCase().includes(q)
                  })
                : reqsInforme
              const isExpanded = expandedInforme === inf.id
              return (
                <div key={inf.id} style={{borderBottom:i<filteredInformes.length-1?'1px solid #f1f5f9':'none'}}>
                  <div style={{display:'flex',alignItems:'center',padding:'14px 20px',cursor:'pointer',background:'white'}}
                    onClick={()=>toggleExpandInforme(inf.id)}
                    onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e=>e.currentTarget.style.background='white'}>
                    <div style={{width:'36px',height:'36px',borderRadius:'8px',background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px',flexShrink:0}}>
                      <Send size={15} color="#15803d"/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontWeight:600,color:'#0C1E3D',fontSize:'14px',margin:0,textAlign:'left'}}>{inf.aseguradoras?.nombre}</p>
                      <p style={{fontSize:'12px',color:'#64748b',margin:0,textAlign:'left'}}>
                        {inf.fecha_desde?new Date(inf.fecha_desde+'T12:00:00').toLocaleDateString('es-GT'):'—'} → {inf.fecha_hasta?new Date(inf.fecha_hasta+'T12:00:00').toLocaleDateString('es-GT'):'—'} · {inf.total_requerimientos} reqs
                      </p>
                    </div>
                    <div style={{textAlign:'right',marginRight:'16px'}}>
                      <p style={{fontSize:'14px',fontWeight:700,color:'#1A6BBA',margin:0}}>Q {parseFloat(inf.total_monto||0).toLocaleString()}</p>
                      <p style={{fontSize:'11px',color:'#94a3b8',margin:0}}>{new Date(inf.created_at).toLocaleDateString('es-GT')}</p>
                    </div>
                    {isExpanded ? <ChevronUp size={16} color='#64748b'/> : <ChevronDown size={16} color='#64748b'/>}
                  </div>

                  {isExpanded && (
                    <div style={{background:'#f8fafc',borderTop:'1px solid #f1f5f9',padding:'0 0 8px'}}>
                      {reqsInforme.length === 0 ? (
                        <p style={{padding:'16px 20px',fontSize:'13px',color:'#94a3b8'}}>No se encontraron requerimientos asociados</p>
                      ) : reqsAMostrar.length === 0 ? (
                        <p style={{padding:'16px 20px',fontSize:'13px',color:'#94a3b8'}}>Ningún req. coincide con la búsqueda</p>
                      ) : (
                        <div style={{overflowX:'auto'}}>
                        <table style={{width:'100%',borderCollapse:'collapse',minWidth:'500px'}}>
                          <thead>
                            <tr style={{borderBottom:'1px solid #e2e8f0'}}>
                              {['Nº Req.','Cuota','Póliza','Cliente','Fecha pago','Monto'].map(h=>(
                                <th key={h} style={{padding:'8px 20px',textAlign:'left',fontSize:'11px',fontWeight:600,color:'#94a3b8',whiteSpace:'nowrap'}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {reqsAMostrar.map((r,ri)=>(
                              <tr key={r.id} style={{borderBottom:ri<reqsAMostrar.length-1?'1px solid #f1f5f9':'none',cursor:'pointer'}}
                                onClick={()=>navigate('/requerimientos',{state:{openReqId:r.id,fromInforme:true}})}
                                onMouseEnter={e=>e.currentTarget.style.background='#eff6ff'}
                                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                <td style={{padding:'10px 20px',fontSize:'13px',fontWeight:700,color:'#0C1E3D'}}>{r.codigo}</td>
                                <td style={{padding:'10px 20px',fontSize:'13px',color:'#64748b'}}>{r.numero_cuota}/{r.total_cuotas}</td>
                                <td style={{padding:'10px 20px',fontSize:'13px',color:'#374151'}}>{r.polizas?.numero_poliza||'—'}</td>
                                <td style={{padding:'10px 20px',fontSize:'13px',color:'#374151'}}>{r.polizas?.clientes?.nombre} {r.polizas?.clientes?.apellido||''}</td>
                                <td style={{padding:'10px 20px',fontSize:'13px',color:'#64748b',whiteSpace:'nowrap'}}>{r.fecha_pago?new Date(r.fecha_pago+'T12:00:00').toLocaleDateString('es-GT'):'—'}</td>
                                <td style={{padding:'10px 20px',fontSize:'13px',fontWeight:600,color:'#1e293b',whiteSpace:'nowrap'}}>
                                  Q {parseFloat(r.monto||0).toLocaleString()}
                                  <ExternalLink size={11} color='#94a3b8' style={{marginLeft:'6px',verticalAlign:'middle'}}/>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{borderTop:'2px solid #e2e8f0',background:'#f1f5f9'}}>
                              <td colSpan={5} style={{padding:'8px 20px',fontSize:'12px',fontWeight:600,color:'#374151',textAlign:'right'}}>Total</td>
                              <td style={{padding:'8px 20px',fontSize:'13px',fontWeight:700,color:'#0C1E3D'}}>
                                Q {reqsInforme.reduce((s,r)=>s+parseFloat(r.monto||0),0).toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

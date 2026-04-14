import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { BookOpen, Search, Download, Copy, CheckCircle, Send, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Liquidaciones() {
  const [reqs, setReqs] = useState([])
  const [aseguradoras, setAseguradoras] = useState([])
  const [informes, setInformes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroAseguradora, setFiltroAseguradora] = useState('')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(new Date().toISOString().split('T')[0])
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(new Date().toISOString().split('T')[0])
  const [selectedIds, setSelectedIds] = useState([])
  const [activeTab, setActiveTab] = useState('pendientes')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: reqsData }, { data: asegData }, { data: informesData }] = await Promise.all([
      supabase.from('requerimientos_pago')
        .select('*, polizas(numero_poliza, aseguradoras(id, nombre, logo_url), clientes(nombre, apellido))')
        .eq('estado', 'pagado')
        .eq('informe_liquidacion_enviado', false)
        .order('fecha_pago', { ascending: false }),
      supabase.from('aseguradoras').select('id, nombre, logo_url').eq('activa', true).order('nombre'),
      supabase.from('informes_enviados').select('*, aseguradoras(nombre)').eq('tipo', 'liquidacion').order('created_at', { ascending: false }).limit(50)
    ])
    setReqs(reqsData || [])
    setAseguradoras(asegData || [])
    setInformes(informesData || [])
    setLoading(false)
  }

  const filtered = reqs.filter(r => {
    const matchAseg = !filtroAseguradora || r.polizas?.aseguradoras?.id === filtroAseguradora
    const fechaPago = r.fecha_pago
    const matchDesde = !filtroFechaDesde || fechaPago >= filtroFechaDesde
    const matchHasta = !filtroFechaHasta || fechaPago <= filtroFechaHasta
    return matchAseg && matchDesde && matchHasta
  })

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i=>i!==id) : [...prev, id])
  }

  const selectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([])
    else setSelectedIds(filtered.map(r=>r.id))
  }

  const totalSeleccionado = filtered.filter(r=>selectedIds.includes(r.id)).reduce((s,r)=>s+parseFloat(r.monto||0),0)

  const generarResumenTexto = () => {
    const reqsSeleccionados = filtered.filter(r=>selectedIds.includes(r.id))
    if (reqsSeleccionados.length === 0) { toast.error('Seleccioná al menos un requerimiento'); return '' }
    const asegNombre = reqsSeleccionados[0]?.polizas?.aseguradoras?.nombre || 'Aseguradora'
    const fecha = new Date().toLocaleDateString('es-GT')
    let texto = `LIQUIDACIÓN - ${asegNombre}\nFecha: ${fecha}\n\n`
    texto += `${'Código'.padEnd(20)} ${'Póliza'.padEnd(15)} ${'Cliente'.padEnd(25)} ${'Monto'.padStart(12)}\n`
    texto += '─'.repeat(75) + '\n'
    reqsSeleccionados.forEach(r => {
      texto += `${(r.codigo||'').padEnd(20)} ${(r.polizas?.numero_poliza||'').padEnd(15)} ${((r.polizas?.clientes?.nombre||'')+' '+(r.polizas?.clientes?.apellido||'')).slice(0,24).padEnd(25)} ${'Q '+parseFloat(r.monto||0).toLocaleString()}\n`
    })
    texto += '─'.repeat(75) + '\n'
    texto += `${'TOTAL'.padEnd(62)} Q ${totalSeleccionado.toLocaleString()}\n`
    texto += `\nTotal requerimientos: ${reqsSeleccionados.length}`
    return texto
  }

  const copiarPortapapeles = () => {
    const texto = generarResumenTexto()
    if (!texto) return
    navigator.clipboard.writeText(texto)
    toast.success('Resumen copiado al portapapeles')
  }

  const marcarComoEnviado = async () => {
    if (selectedIds.length === 0) { toast.error('Seleccioná al menos un requerimiento'); return }
    const reqsSeleccionados = filtered.filter(r=>selectedIds.includes(r.id))
    const asegId = reqsSeleccionados[0]?.polizas?.aseguradoras?.id
    if (!asegId) { toast.error('No se pudo determinar la aseguradora'); return }

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('requerimientos_pago')
      .update({ informe_liquidacion_enviado: true, fecha_informe_liquidacion: new Date().toISOString() })
      .in('id', selectedIds)

    await supabase.from('informes_enviados').insert({
      tipo: 'liquidacion',
      aseguradora_id: asegId,
      fecha_desde: filtroFechaDesde || reqsSeleccionados[reqsSeleccionados.length-1]?.fecha_pago,
      fecha_hasta: filtroFechaHasta || reqsSeleccionados[0]?.fecha_pago,
      total_requerimientos: selectedIds.length,
      total_monto: totalSeleccionado,
      created_by: user?.id
    })

    toast.success(`${selectedIds.length} requerimiento(s) marcados como enviados`)
    setSelectedIds([])
    fetchAll()
  }

  const inputStyle = { padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', background:'white', color:'#1e293b', boxSizing:'border-box' }

  return (
    <div>
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'20px'}}>
        <div style={{padding:'20px 24px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
            <div style={{width:'44px',height:'44px',borderRadius:'10px',background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <BookOpen size={22} color='white'/>
            </div>
            <div>
              <h1 style={{fontSize:'22px',fontWeight:700,color:'white',margin:0}}>Liquidaciones</h1>
              <p style={{color:'rgba(255,255,255,0.7)',fontSize:'14px',marginTop:'4px',marginBottom:0}}>
                {reqs.length} pendientes de envío · {informes.length} informes enviados
              </p>
            </div>
          </div>
        </div>
      </div>

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

      {activeTab==='pendientes' && (
        <>
          <div style={{background:'white',borderRadius:'12px',padding:'16px 20px',border:'1px solid #e2e8f0',marginBottom:'16px'}}>
            <p style={{fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'12px',display:'flex',alignItems:'center',gap:'6px'}}><Filter size={14}/> Filtros</p>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap',alignItems:'flex-end'}}>
              <div>
                <label style={{display:'block',fontSize:'12px',color:'#64748b',marginBottom:'4px'}}>Aseguradora</label>
                <select value={filtroAseguradora} onChange={e=>setFiltroAseguradora(e.target.value)} style={{...inputStyle,minWidth:'180px'}}>
                  <option value=''>Todas</option>
                  {aseguradoras.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:'block',fontSize:'12px',color:'#64748b',marginBottom:'4px'}}>Fecha pago desde</label>
                <input type="date" value={filtroFechaDesde} onChange={e=>setFiltroFechaDesde(e.target.value)} style={inputStyle}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'12px',color:'#64748b',marginBottom:'4px'}}>Fecha pago hasta</label>
                <input type="date" value={filtroFechaHasta} onChange={e=>setFiltroFechaHasta(e.target.value)} style={inputStyle}/>
              </div>
              <button onClick={()=>{setFiltroAseguradora('');setFiltroFechaDesde(new Date().toISOString().split('T')[0]);setFiltroFechaHasta(new Date().toISOString().split('T')[0])}}
                style={{...inputStyle,cursor:'pointer',color:'#64748b'}}>
                Limpiar
              </button>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div style={{background:'#0C1E3D',borderRadius:'12px',padding:'14px 20px',marginBottom:'16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
              <div>
                <p style={{color:'white',fontWeight:600,fontSize:'14px'}}>{selectedIds.length} seleccionados · Q {totalSeleccionado.toLocaleString()}</p>
                <p style={{color:'rgba(255,255,255,0.6)',fontSize:'12px'}}>Listos para generar informe</p>
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={copiarPortapapeles}
                  style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 16px',background:'rgba(255,255,255,0.15)',color:'white',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontWeight:500}}>
                  <Copy size={14}/> Copiar resumen
                </button>
                <button onClick={marcarComoEnviado}
                  style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 16px',background:'#C8A84B',color:'#0C1E3D',border:'none',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontWeight:600}}>
                  <Send size={14}/> Marcar como enviado
                </button>
              </div>
            </div>
          )}

          <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',padding:'12px 20px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>
              <input type="checkbox" checked={selectedIds.length===filtered.length&&filtered.length>0} onChange={selectAll}
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
                <p style={{color:'#94a3b8',fontSize:'13px',marginTop:'4px'}}>Todos los pagos han sido informados a las aseguradoras</p>
              </div>
            ) : filtered.map((r,i)=>(
              <div key={r.id} style={{display:'flex',alignItems:'center',padding:'12px 20px',borderBottom:i<filtered.length-1?'1px solid #f1f5f9':'none',background:selectedIds.includes(r.id)?'#eff6ff':'white',cursor:'pointer'}}
                onClick={()=>toggleSelect(r.id)}
                onMouseEnter={e=>{if(!selectedIds.includes(r.id))e.currentTarget.style.background='#f8fafc'}}
                onMouseLeave={e=>{if(!selectedIds.includes(r.id))e.currentTarget.style.background='white'}}>
                <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={()=>toggleSelect(r.id)}
                  style={{width:'16px',height:'16px',cursor:'pointer',accentColor:'#1A6BBA',marginRight:'12px'}}
                  onClick={e=>e.stopPropagation()}/>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontWeight:600,color:'#0C1E3D',fontSize:'13px'}}>{r.codigo}</p>
                  <p style={{fontSize:'12px',color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {r.polizas?.numero_poliza||'Sin póliza'} · {r.polizas?.clientes?.nombre} {r.polizas?.clientes?.apellido||''}
                  </p>
                </div>
                <div style={{width:'140px',display:'flex',alignItems:'center',gap:'6px'}}>
                  {r.polizas?.aseguradoras?.logo_url && <img src={r.polizas.aseguradoras.logo_url} style={{width:'20px',height:'20px',objectFit:'contain',borderRadius:'3px'}}/>}
                  <span style={{fontSize:'12px',color:'#374151',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.polizas?.aseguradoras?.nombre}</span>
                </div>
                <p style={{width:'100px',fontSize:'12px',color:'#64748b'}}>{r.fecha_pago?new Date(r.fecha_pago).toLocaleDateString('es-GT'):'-'}</p>
                <p style={{width:'100px',fontSize:'14px',fontWeight:700,color:'#1e293b',textAlign:'right'}}>Q {parseFloat(r.monto||0).toLocaleString()}</p>
              </div>
            ))}

            {filtered.length > 0 && (
              <div style={{padding:'12px 20px',background:'#f8fafc',borderTop:'1px solid #e2e8f0',display:'flex',justifyContent:'flex-end',gap:'24px'}}>
                <span style={{fontSize:'13px',color:'#64748b'}}>{filtered.length} requerimientos</span>
                <span style={{fontSize:'14px',fontWeight:700,color:'#0C1E3D'}}>Total: Q {filtered.reduce((s,r)=>s+parseFloat(r.monto||0),0).toLocaleString()}</span>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab==='historial' && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>
            <p style={{fontSize:'14px',fontWeight:600,color:'#374151'}}>Historial de informes enviados</p>
          </div>
          {informes.length===0 ? (
            <div style={{padding:'48px',textAlign:'center'}}>
              <BookOpen size={32} color="#cbd5e1" style={{marginBottom:'12px'}}/>
              <p style={{color:'#94a3b8'}}>No hay informes enviados aún</p>
            </div>
          ) : informes.map((inf,i)=>(
            <div key={inf.id} style={{display:'flex',alignItems:'center',padding:'14px 20px',borderBottom:i<informes.length-1?'1px solid #f1f5f9':'none'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'8px',background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px',flexShrink:0}}>
                <Send size={15} color="#15803d"/>
              </div>
              <div style={{flex:1}}>
                <p style={{fontWeight:600,color:'#0C1E3D',fontSize:'13px'}}>{inf.aseguradoras?.nombre}</p>
                <p style={{fontSize:'12px',color:'#64748b'}}>
                  {new Date(inf.fecha_desde).toLocaleDateString('es-GT')} → {new Date(inf.fecha_hasta).toLocaleDateString('es-GT')} · {inf.total_requerimientos} reqs
                </p>
              </div>
              <div style={{textAlign:'right'}}>
                <p style={{fontSize:'14px',fontWeight:700,color:'#1A6BBA'}}>Q {parseFloat(inf.total_monto||0).toLocaleString()}</p>
                <p style={{fontSize:'11px',color:'#94a3b8'}}>{new Date(inf.created_at).toLocaleDateString('es-GT')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

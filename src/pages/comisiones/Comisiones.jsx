import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { DollarSign, Search, Copy, Send, Filter, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Comisiones() {
  const [reqs, setReqs] = useState([])
  const [aseguradoras, setAseguradoras] = useState([])
  const [productos, setProductos] = useState([])
  const [informes, setInformes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroAseguradora, setFiltroAseguradora] = useState('')
  const [filtroProducto, setFiltroProducto] = useState('')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(new Date().toISOString().split('T')[0])
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(new Date().toISOString().split('T')[0])
  const [selectedIds, setSelectedIds] = useState([])
  const [activeTab, setActiveTab] = useState('pendientes')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: reqsData }, { data: asegData }, { data: informesData }] = await Promise.all([
      supabase.from('requerimientos_pago')
        .select('*, polizas(numero_poliza, producto_id, aseguradoras(id, nombre, logo_url), productos(id, nombre), clientes(nombre, apellido))')
        .eq('estado', 'pagado')
        .eq('informe_comision_enviado', false)
        .order('fecha_pago', { ascending: false }),
      supabase.from('aseguradoras').select('id, nombre, productos(id, nombre)').eq('activa', true).order('nombre'),
      supabase.from('informes_enviados').select('*, aseguradoras(nombre)').eq('tipo', 'comision').order('created_at', { ascending: false }).limit(50)
    ])
    setReqs(reqsData || [])
    setAseguradoras(asegData || [])
    setInformes(informesData || [])
    setLoading(false)
  }

  const handleAseguradoraFilter = (id) => {
    setFiltroAseguradora(id)
    setFiltroProducto('')
    const aseg = aseguradoras.find(a => a.id === id)
    setProductos(aseg?.productos || [])
  }

  const filtered = reqs.filter(r => {
    const matchAseg = !filtroAseguradora || r.polizas?.aseguradoras?.id === filtroAseguradora
    const matchProd = !filtroProducto || r.polizas?.producto_id === filtroProducto
    const fechaPago = r.fecha_pago
    const matchDesde = !filtroFechaDesde || fechaPago >= filtroFechaDesde
    const matchHasta = !filtroFechaHasta || fechaPago <= filtroFechaHasta
    return matchAseg && matchProd && matchDesde && matchHasta
  })

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i=>i!==id) : [...prev, id])
  const selectAll = () => selectedIds.length === filtered.length ? setSelectedIds([]) : setSelectedIds(filtered.map(r=>r.id))
  const totalSeleccionado = filtered.filter(r=>selectedIds.includes(r.id)).reduce((s,r)=>s+parseFloat(r.monto||0),0)

  const generarResumenTexto = () => {
    const sel = filtered.filter(r=>selectedIds.includes(r.id))
    if (sel.length === 0) { toast.error('Seleccioná al menos un requerimiento'); return '' }
    const asegNombre = sel[0]?.polizas?.aseguradoras?.nombre || 'Aseguradora'
    const fecha = new Date().toLocaleDateString('es-GT')
    let texto = `COBRO DE COMISIONES - ${asegNombre}\nFecha: ${fecha}\n\n`
    texto += `${'Código'.padEnd(20)} ${'Póliza'.padEnd(15)} ${'Producto'.padEnd(20)} ${'Monto'.padStart(12)}\n`
    texto += '─'.repeat(75) + '\n'
    sel.forEach(r => {
      texto += `${(r.codigo||'').padEnd(20)} ${(r.polizas?.numero_poliza||'').padEnd(15)} ${(r.polizas?.productos?.nombre||'').slice(0,19).padEnd(20)} ${'Q '+parseFloat(r.monto||0).toLocaleString()}\n`
    })
    texto += '─'.repeat(75) + '\n'
    texto += `${'TOTAL'.padEnd(57)} Q ${totalSeleccionado.toLocaleString()}\n`
    texto += `\nTotal requerimientos: ${sel.length}`
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
    const sel = filtered.filter(r=>selectedIds.includes(r.id))
    const asegId = sel[0]?.polizas?.aseguradoras?.id
    if (!asegId) { toast.error('No se pudo determinar la aseguradora'); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('requerimientos_pago')
      .update({ informe_comision_enviado: true, fecha_informe_comision: new Date().toISOString() })
      .in('id', selectedIds)
    await supabase.from('informes_enviados').insert({
      tipo: 'comision',
      aseguradora_id: asegId,
      fecha_desde: filtroFechaDesde || sel[sel.length-1]?.fecha_pago,
      fecha_hasta: filtroFechaHasta || sel[0]?.fecha_pago,
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
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'24px',fontWeight:700,color:'#0C1E3D'}}>Comisiones</h1>
        <p style={{color:'#64748b',fontSize:'14px',marginTop:'4px'}}>Requerimientos pagados para cobro de comisiones a aseguradoras</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'20px'}}>
        {[
          ['Pendientes de cobro', reqs.length, 'Q '+reqs.reduce((s,r)=>s+parseFloat(r.monto||0),0).toLocaleString(), '#f59e0b'],
          ['Seleccionados', selectedIds.length, 'Q '+totalSeleccionado.toLocaleString(), '#1A6BBA'],
          ['Informes enviados', informes.length, 'histórico', '#22c55e'],
        ].map(([label,count,sub,color])=>(
          <div key={label} style={{background:'white',borderRadius:'12px',padding:'16px 20px',border:'1px solid #e2e8f0',borderLeft:`4px solid ${color}`}}>
            <p style={{fontSize:'13px',color:'#64748b',marginBottom:'4px'}}>{label}</p>
            <p style={{fontSize:'22px',fontWeight:700,color}}>{count}</p>
            <p style={{fontSize:'12px',color:'#94a3b8',marginTop:'2px'}}>{sub}</p>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
        {[['pendientes','Pendientes de cobro'],['historial','Historial']].map(([tab,label])=>(
          <button key={tab} onClick={()=>setActiveTab(tab)}
            style={{padding:'8px 20px',borderRadius:'8px',fontSize:'14px',fontWeight:500,cursor:'pointer',
              background:activeTab===tab?'#0C1E3D':'white',color:activeTab===tab?'white':'#64748b',
              border:`1px solid ${activeTab===tab?'#0C1E3D':'#e2e8f0'}`}}>
            {label}
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
                <select value={filtroAseguradora} onChange={e=>handleAseguradoraFilter(e.target.value)} style={{...inputStyle,minWidth:'180px'}}>
                  <option value=''>Todas</option>
                  {aseguradoras.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:'block',fontSize:'12px',color:'#64748b',marginBottom:'4px'}}>Producto</label>
                <select value={filtroProducto} onChange={e=>setFiltroProducto(e.target.value)} style={{...inputStyle,minWidth:'160px'}} disabled={!filtroAseguradora}>
                  <option value=''>Todos</option>
                  {productos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:'block',fontSize:'12px',color:'#64748b',marginBottom:'4px'}}>Fecha desde</label>
                <input type="date" value={filtroFechaDesde} onChange={e=>setFiltroFechaDesde(e.target.value)} style={inputStyle}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'12px',color:'#64748b',marginBottom:'4px'}}>Fecha hasta</label>
                <input type="date" value={filtroFechaHasta} onChange={e=>setFiltroFechaHasta(e.target.value)} style={inputStyle}/>
              </div>
              <button onClick={()=>{setFiltroAseguradora('');setFiltroProducto('');setProductos([]);setFiltroFechaDesde(new Date().toISOString().split('T')[0]);setFiltroFechaHasta(new Date().toISOString().split('T')[0])}}
                style={{...inputStyle,cursor:'pointer',color:'#64748b'}}>
                Limpiar
              </button>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div style={{background:'#0C1E3D',borderRadius:'12px',padding:'14px 20px',marginBottom:'16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
              <div>
                <p style={{color:'white',fontWeight:600,fontSize:'14px'}}>{selectedIds.length} seleccionados · Q {totalSeleccionado.toLocaleString()}</p>
                <p style={{color:'rgba(255,255,255,0.6)',fontSize:'12px'}}>Listos para generar informe de comisión</p>
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
              <span style={{fontSize:'13px',fontWeight:600,color:'#374151',width:'160px'}}>Aseguradora / Producto</span>
              <span style={{fontSize:'13px',fontWeight:600,color:'#374151',width:'100px'}}>Fecha pago</span>
              <span style={{fontSize:'13px',fontWeight:600,color:'#374151',width:'100px',textAlign:'right'}}>Monto</span>
            </div>

            {loading ? <p style={{padding:'24px',color:'#64748b'}}>Cargando...</p> :
             filtered.length===0 ? (
              <div style={{padding:'48px',textAlign:'center'}}>
                <DollarSign size={32} color="#cbd5e1" style={{marginBottom:'12px'}}/>

}
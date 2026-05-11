import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { generateSolicitudPdf } from '../../lib/generateSolicitudPdf'
import { generateInclusionPdf } from '../../lib/generateInclusionPdf'
import { FileText, Plus, Minus, Search, ArrowLeft, Edit2, Trash2, ChevronDown, ChevronUp, ChevronRight,
  CheckCircle, Clock, AlertCircle, Car, X, RefreshCw, SendHorizonal, GitMerge,
  AlertTriangle, Download, History, CheckSquare, Square, Upload, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'

/* ─── Constants ─────────────────────────────────────────────────────────── */
const fraccionamientoOpciones = [
  { value:'semestral',  label:'Semestral',  sub:'2 pagos/año' },
  { value:'trimestral', label:'Trimestral', sub:'4 pagos/año' },
  { value:'mensual',    label:'Mensual',    sub:'12 pagos/año' },
]
const fraccionamientoLabels = { anual:'Contado', semestral:'Semestral', trimestral:'Trimestral', mensual:'Mensual' }

const polizaEstados = {
  solicitud:    { bg:'#eff6ff', color:'#1d4ed8', label:'Solicitud' },
  enviada:      { bg:'#fef9c3', color:'#a16207', label:'Enviada' },
  en_reproceso: { bg:'#fef2f2', color:'#ef4444', label:'En reproceso' },
  emitida:      { bg:'#dcfce7', color:'#15803d', label:'Emitida' },
  completado:   { bg:'#f0fdfa', color:'#0891b2', label:'Completado' },
  cancelada:    { bg:'#f1f5f9', color:'#64748b', label:'Cancelada' },
}
// Flujo lineal simple (un solo siguiente): solicitud→enviada, en_reproceso→enviada (regresa)
const estadoFlujo  = { solicitud:'enviada', en_reproceso:'enviada' }
const estadoFlujoLabel = { solicitud:'Enviada a la aseguradora', en_reproceso:'Re-enviada a la aseguradora' }

const camposClienteReq = [
  { key:'nombre',   label:'Nombre' },
  { key:'nit',      label:'NIT' },
  { key:'email',    label:'Correo' },
  { key:'telefono', label:'Teléfono' },
  { key:'dpi',      label:'DPI' },
]

const fp = (v) => v?.tipo_placa ? `${v.tipo_placa}${v?.placa||''}` : (v?.placa || 'N/A')
const emisionTipos = { emision:'Emision', inclusion:'Inclusion', exclusion:'Exclusion', renovacion:'Renovacion' }
const emisionEstadoColors = { solicitada:'#f59e0b', reproceso:'#ef4444', emitida:'#22c55e' }
const emisionEstadoIcons  = { solicitada: Clock, reproceso: AlertCircle, emitida: CheckCircle }

const emptyPoliza  = { cliente_id:'', aseguradora_id:'', producto_id:'', prima_total:'', tipo_pago:'contado', numero_cuotas:1, fecha_inicio:'', fecha_vencimiento:'', vigencia:'1anio', persona_facturable_id:'' }
const emptyEmision = { tipo:'emision', prima_emision:'', tipo_pago:'contado', numero_cuotas:1, fecha_inicio:'', fecha_fin:'', notas:'', persona_facturable_id:'' }
const emptyReq     = { monto:'', fecha_vencimiento:'', total_cuotas:1, emision_id:'' }

/* ─── SearchSelect ───────────────────────────────────────────────────────── */
function SearchSelect({ value, onChange, options, placeholder, labelKey='nombre', valueKey='id', renderOption }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o[valueKey] === value)
  const filtered = options.filter(o => {
    const label = renderOption ? `${o.nombre||''} ${o.apellido||''}` : (o[labelKey]||'')
    return label.toLowerCase().includes(search.toLowerCase())
  })
  return (
    <div style={{position:'relative'}}>
      <div onClick={()=>setOpen(!open)} style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box',background:'white',color:'#1e293b',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:'42px'}}>
        <span style={{color:selected?'#1e293b':'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {selected ? (renderOption ? renderOption(selected) : selected[labelKey]) : placeholder}
        </span>
        <div style={{display:'flex',gap:'4px',flexShrink:0}}>
          {value && <button type="button" onClick={e=>{e.stopPropagation();onChange('')}} style={{background:'none',border:'none',cursor:'pointer',padding:'0',display:'flex'}}><X size={13} color="#94a3b8"/></button>}
          <ChevronDown size={14} color="#94a3b8"/>
        </div>
      </div>
      {open && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'white',border:'1px solid #e2e8f0',borderRadius:'8px',zIndex:200,boxShadow:'0 8px 24px rgba(0,0,0,0.12)'}}>
          <div style={{padding:'8px'}}>
            <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..."
              style={{width:'100%',padding:'8px 10px',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'13px',boxSizing:'border-box',outline:'none',background:'white',color:'#1e293b'}}
              onClick={e=>e.stopPropagation()}/>
          </div>
          <div style={{maxHeight:'200px',overflowY:'auto'}}>
            {filtered.length===0 ? <p style={{padding:'10px 14px',fontSize:'13px',color:'#94a3b8'}}>Sin resultados</p> :
             filtered.map(o=>(
              <div key={o[valueKey]} onClick={()=>{onChange(o[valueKey]);setOpen(false);setSearch('')}}
                style={{padding:'10px 14px',cursor:'pointer',fontSize:'13px',color:'#1e293b',fontWeight:value===o[valueKey]?600:400,background:value===o[valueKey]?'#dbeafe':'white',display:'flex',alignItems:'center',gap:'8px'}}
                onMouseEnter={e=>{if(value!==o[valueKey])e.currentTarget.style.background='#f8fafc'}}
                onMouseLeave={e=>{if(value!==o[valueKey])e.currentTarget.style.background='white'}}>
                {renderOption ? renderOption(o) : o[labelKey]}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Main Polizas component ─────────────────────────────────────────────── */
export default function Polizas() {
  const [polizas, setPolizas]       = useState([])
  const [clientes, setClientes]     = useState([])
  const [aseguradoras, setAseguradoras] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [view, setView]             = useState('list')
  const [selected, setSelected]     = useState(null)
  const [form, setForm]             = useState(emptyPoliza)
  const [editing, setEditing]       = useState(null)
  const [returnToPolizaId, setReturnToPolizaId] = useState(null)
  const [productosFiltered, setProductosFiltered] = useState([])
  // Client validation & vehicle selection
  const [clienteVehiculos, setClienteVehiculos]     = useState([])
  const [vehiculosSeleccionados, setVehiculosSeleccionados] = useState([])
  const [clienteValidation, setClienteValidation]   = useState([])
  const [personasFacturables, setPersonasFacturables] = useState([])
  const location  = useLocation()
  const navigate  = useNavigate()
  const fromClienteId = location.state?.fromClienteId || null
  const fromReqId     = location.state?.fromReqId     || null
  const prefilledClienteId = location.state?.prefilledClienteId || null

  useEffect(() => { fetchAll() }, [])

  // Sync URL → view: open detail if URL has /polizas/{id}
  useEffect(() => {
    if (polizas.length === 0) return
    // Priority 1: location.state (cross-page navigation)
    if (location.state?.openPolizaId) {
      const p = polizas.find(p => p.id === location.state.openPolizaId)
      if (p) { setSelected(p); setView('detalle'); navigate('/polizas/' + p.id, { replace: true }) }
      return
    }
    // Priority 2: URL path on direct load / refresh
    const urlId = location.pathname.replace(/^\/polizas\/?/, '')
    if (urlId && view === 'list') {
      const p = polizas.find(p => p.id === urlId)
      if (p) { setSelected(p); setView('detalle') }
    }
  }, [location.state, location.pathname, polizas])

  useEffect(() => {
    if (location.state?.newPoliza && prefilledClienteId && clientes.length > 0) {
      handleClienteChange(prefilledClienteId)
      setForm(f => ({ ...f, cliente_id: prefilledClienteId }))
      setEditing(null)
      setView('form')
    }
  }, [location.state, clientes])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: polizasData }, { data: clientesData }, { data: aseguradorasData }] = await Promise.all([
      supabase.from('polizas').select('*, clientes(nombre,apellido,nit,email,telefono,dpi), aseguradoras(nombre,logo_url), productos(nombre), poliza_origen:poliza_origen_id(id,numero_poliza), emisiones(tipo,estado,prima_emision)')
        .eq('activa', true).order('created_at', { ascending: false }),
      supabase.from('clientes').select('id,nombre,apellido,tipo,nit,email,telefono,dpi').eq('activo', true).order('nombre'),
      supabase.from('aseguradoras').select('id,nombre,logo_url,productos(id,nombre,activo)').eq('activa', true).order('nombre')
    ])
    setPolizas(polizasData || [])
    setClientes(clientesData || [])
    setAseguradoras(aseguradorasData || [])
    setLoading(false)
  }

  const handleAseguradoraChange = (id) => {
    const aseg = aseguradoras.find(a => a.id === id)
    setProductosFiltered(aseg?.productos?.filter(p=>p.activo) || [])
    setForm(f => ({ ...f, aseguradora_id: id, producto_id: '' }))
  }

  const handleClienteChange = async (id) => {
    setForm(f => ({ ...f, cliente_id: id, persona_facturable_id: '' }))
    setVehiculosSeleccionados([])
    setClienteVehiculos([])
    setClienteValidation([])
    setPersonasFacturables([])
    if (!id) return
    const { data: c } = await supabase.from('clientes').select('*').eq('id', id).single()
    const missing = camposClienteReq.filter(f => !c?.[f.key])
    setClienteValidation(missing)
    const [{ data: vData }, { data: pfData }] = await Promise.all([
      supabase.from('vehiculos').select('*').eq('cliente_id', id).eq('activo', true).order('marca'),
      supabase.from('personas_facturables').select('*').eq('cliente_id', id).eq('activa', true).order('nombre'),
    ])
    setClienteVehiculos(vData || [])
    setPersonasFacturables(pfData || [])
  }

  const toggleVehiculo = (id) => {
    setVehiculosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleFechaInicioChange = (fecha) => {
    let fechaVenc = ''
    if (fecha && form.vigencia === '1anio') {
      const d = new Date(fecha); d.setFullYear(d.getFullYear() + 1)
      fechaVenc = d.toISOString().split('T')[0]
    }
    setForm(f => ({ ...f, fecha_inicio: fecha, fecha_vencimiento: fechaVenc }))
  }

  const handleVigenciaChange = (vigencia) => {
    let fechaVenc = form.fecha_vencimiento
    if (vigencia === '1anio' && form.fecha_inicio) {
      const d = new Date(form.fecha_inicio); d.setFullYear(d.getFullYear() + 1)
      fechaVenc = d.toISOString().split('T')[0]
    } else if (vigencia === 'manual') { fechaVenc = '' }
    setForm(f => ({ ...f, vigencia, fecha_vencimiento: fechaVenc }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.cliente_id)     { toast.error('Selecciona un cliente'); return }
    if (clienteValidation.length > 0) {
      toast.error(`Faltan datos del cliente: ${clienteValidation.map(f=>f.label).join(', ')}`)
      return
    }
    if (!form.aseguradora_id) { toast.error('Selecciona una aseguradora'); return }
    if (!form.producto_id)    { toast.error('Selecciona un producto'); return }
    if (form.tipo_pago === 'financiado' && (parseInt(form.numero_cuotas) || 0) < 2) { toast.error('El número de cuotas debe ser al menos 2'); return }
    if (!form.fecha_inicio || !form.fecha_vencimiento) { toast.error('Completa las fechas de vigencia'); return }

    const { data: { user } } = await supabase.auth.getUser()

    if (editing) {
      /* ── EDIT mode ── */
      const payload = {
        aseguradora_id: form.aseguradora_id, producto_id: form.producto_id,
        prima_total: parseFloat(form.prima_total) || 0, tipo_pago: form.tipo_pago,
        fraccionamiento: 'mensual',
        numero_cuotas: form.tipo_pago === 'contado' ? 1 : (parseInt(form.numero_cuotas) || 1),
        fecha_inicio: form.fecha_inicio, fecha_vencimiento: form.fecha_vencimiento,
        persona_facturable_id: form.persona_facturable_id || null,
      }
      const { error } = await supabase.from('polizas').update(payload).eq('id', editing)
      if (error) { toast.error('Error: ' + error.message); return }
      // Update solicitud_vehiculos
      await supabase.from('solicitud_vehiculos').delete().eq('poliza_id', editing)
      if (vehiculosSeleccionados.length > 0) {
        await supabase.from('solicitud_vehiculos').insert(
          vehiculosSeleccionados.map(vid => ({ poliza_id: editing, vehiculo_id: vid }))
        )
      }
      toast.success('Solicitud actualizada')
      // Return to detail view if we came from there
      if (returnToPolizaId) {
        const { data: updatedPoliza } = await supabase.from('polizas')
          .select('*, clientes(nombre,apellido,nit,email,telefono,dpi), aseguradoras(nombre,logo_url), productos(nombre), poliza_origen:poliza_origen_id(id,numero_poliza)')
          .eq('id', returnToPolizaId).single()
        if (updatedPoliza) setSelected(updatedPoliza)
        setView('detalle')
        navigate('/polizas/' + returnToPolizaId, { replace: true })
        setEditing(null); setReturnToPolizaId(null)
        setForm(emptyPoliza); setProductosFiltered([]); setClienteVehiculos([])
        setVehiculosSeleccionados([]); setClienteValidation([]); setPersonasFacturables([])
        fetchAll()
        return
      }
    } else {
      /* ── CREATE mode ── */
      const { data: numData } = await supabase.rpc('generate_numero_solicitud')
      const numero_solicitud = numData
      const payload = {
        numero_solicitud, estado: 'solicitud',
        cliente_id: form.cliente_id, aseguradora_id: form.aseguradora_id, producto_id: form.producto_id,
        prima_total: parseFloat(form.prima_total) || 0, tipo_pago: form.tipo_pago,
        fraccionamiento: 'mensual',
        numero_cuotas: form.tipo_pago === 'contado' ? 1 : (parseInt(form.numero_cuotas) || 1),
        fecha_inicio: form.fecha_inicio, fecha_vencimiento: form.fecha_vencimiento,
        persona_facturable_id: form.persona_facturable_id || null,
        agente_id: user?.id
      }
      const { data: polizaData, error } = await supabase.from('polizas').insert(payload).select().single()
      if (error) { toast.error('Error: ' + error.message); return }
      if (vehiculosSeleccionados.length > 0) {
        await supabase.from('solicitud_vehiculos').insert(
          vehiculosSeleccionados.map(vid => ({ poliza_id: polizaData.id, vehiculo_id: vid }))
        )
      }
      await supabase.from('bitacora_polizas').insert({
        poliza_id: polizaData.id, estado_nuevo: 'solicitud',
        descripcion: 'Solicitud de póliza creada', created_by: user?.id
      })
      toast.success(`Solicitud creada · #${numero_solicitud}`)
    }

    resetForm()
    fetchAll()
  }

  const resetForm = () => {
    setForm(emptyPoliza); setEditing(null)
    setProductosFiltered([]); setClienteVehiculos([])
    setVehiculosSeleccionados([]); setClienteValidation([])
    setPersonasFacturables([])
    setView('list')
    navigate('/polizas', { replace: true })
  }

  const handleEdit = async (p, fromDetalle = false) => {
    if (fromDetalle) setReturnToPolizaId(p.id)
    const aseg = aseguradoras.find(a => a.id === p.aseguradora_id)
    setProductosFiltered(aseg?.productos?.filter(pr=>pr.activo) || [])
    await handleClienteChange(p.cliente_id)
    setForm({
      cliente_id: p.cliente_id, aseguradora_id: p.aseguradora_id, producto_id: p.producto_id,
      prima_total: p.prima_total, tipo_pago: p.tipo_pago||'contado',
      numero_cuotas: p.tipo_pago === 'contado' ? 1 : (p.numero_cuotas || 1),
      fecha_inicio: p.fecha_inicio, fecha_vencimiento: p.fecha_vencimiento, vigencia:'manual',
      persona_facturable_id: p.persona_facturable_id || ''
    })
    // Load existing vehiculos
    const { data: svData } = await supabase.from('solicitud_vehiculos').select('vehiculo_id').eq('poliza_id', p.id)
    setVehiculosSeleccionados((svData||[]).map(sv => sv.vehiculo_id))
    setEditing(p.id)
    setView('form')
    window.scrollTo(0, 0)
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminar solicitud/póliza?')) return
    await supabase.from('polizas').update({ activa: false }).eq('id', id)
    toast.success('Eliminado')
    fetchAll()
  }

  const hoy = new Date()
  const en30d = new Date(); en30d.setDate(en30d.getDate() + 30)

  const getVencimientoEstado = (p) => {
    if (!p.fecha_vencimiento) return 'activa'
    const v = new Date(p.fecha_vencimiento)
    return v < hoy ? 'vencida' : v <= en30d ? 'por_vencer' : 'activa'
  }

  const filtered = polizas.filter(p => {
    const matchSearch = ((p.numero_poliza||'')+' '+(p.numero_solicitud||'')+' '+(p.clientes?.nombre||'')+' '+(p.clientes?.apellido||'')+' '+(p.aseguradoras?.nombre||'')).toLowerCase().includes(search.toLowerCase())
    const matchEstado = filtroEstado === 'todas' || p.estado === filtroEstado
    return matchSearch && matchEstado
  })

  const counts = {
    todas:        polizas.length,
    solicitud:    polizas.filter(p => p.estado === 'solicitud').length,
    enviada:      polizas.filter(p => p.estado === 'enviada').length,
    en_reproceso: polizas.filter(p => p.estado === 'en_reproceso').length,
    emitida:      polizas.filter(p => p.estado === 'emitida').length,
  }

  const inp = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', background:'white', color:'#1e293b', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'4px' }

  /* ── VIEW: DETALLE ── */
  if (view === 'detalle' && selected) return (
    <PolizaDetalle poliza={selected} fromCliente={!!fromClienteId} fromReq={!!fromReqId}
      onBack={()=>{ if (fromClienteId) navigate('/clientes',{state:{openClienteId:fromClienteId}}); else if (fromReqId) navigate('/requerimientos',{state:{openReqId:fromReqId}}); else { setView('list'); navigate('/polizas', {replace:true}); fetchAll() } }}
      onEdit={(p) => handleEdit(p, true)} />
  )

  /* ── VIEW: FORM ── */
  if (view === 'form') return (
    <div>
      <button onClick={resetForm} style={{display:'flex',alignItems:'center',gap:'6px',color:'#64748b',background:'none',border:'none',cursor:'pointer',fontSize:'14px',marginBottom:'20px',padding:'0'}}>
        <ArrowLeft size={16}/> Volver a pólizas
      </button>
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
        <div style={{padding:'20px 24px',}}>
          <h2 style={{fontSize:'18px',fontWeight:700,color:'#111111',margin:0}}>{editing ? 'Editar solicitud' : 'Nueva solicitud de póliza'}</h2>
          <p style={{fontSize:'13px',color:'#6B6B62',marginTop:'4px',marginBottom:0}}>
            {editing ? 'Actualiza los datos de la solicitud' : 'Completa el formulario para crear la solicitud'}
          </p>
        </div>

        <div style={{padding:'24px'}}>
          <form onSubmit={handleSubmit}>

            {/* ─ Cliente ─ */}
            <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#111111',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>1 · Cliente</p>
              <div style={{marginBottom:'12px'}}>
                <label style={lbl}>Seleccionar cliente *</label>
                {prefilledClienteId ? (
                  <div style={{padding:'9px 12px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',color:'#374151'}}>
                    {clientes.find(c=>c.id===prefilledClienteId) ? `${clientes.find(c=>c.id===prefilledClienteId).nombre} ${clientes.find(c=>c.id===prefilledClienteId).apellido||''}` : '...'}
                  </div>
                ) : (
                  <SearchSelect value={form.cliente_id} onChange={handleClienteChange} options={clientes}
                    placeholder="Buscar cliente..." renderOption={c=>`${c.nombre} ${c.apellido||''}`} labelKey="nombre"/>
                )}
              </div>
              {/* Validation warning */}
              {form.cliente_id && clienteValidation.length > 0 && (
                <div style={{background:'#fef9c3',border:'1px solid #fde68a',borderRadius:'8px',padding:'12px 16px',display:'flex',gap:'10px',alignItems:'flex-start'}}>
                  <AlertTriangle size={16} color='#a16207' style={{flexShrink:0,marginTop:'1px'}}/>
                  <div>
                    <p style={{fontSize:'13px',fontWeight:600,color:'#a16207',margin:'0 0 4px'}}>El cliente no puede ser seleccionado hasta completar sus datos</p>
                    <p style={{fontSize:'12px',color:'#92400e',margin:0}}>
                      Campos faltantes: <strong>{clienteValidation.map(f=>f.label).join(', ')}</strong>
                    </p>
                    <button type="button"
                      onClick={()=>navigate('/clientes',{state:{openClienteId:form.cliente_id}})}
                      style={{marginTop:'6px',fontSize:'12px',color:'#1d4ed8',background:'none',border:'none',cursor:'pointer',padding:0,textDecoration:'underline'}}>
                      Ir a editar el cliente →
                    </button>
                  </div>
                </div>
              )}
              {form.cliente_id && clienteValidation.length === 0 && (
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'8px',padding:'10px 14px',display:'flex',gap:'8px',alignItems:'center'}}>
                  <CheckCircle size={14} color='#15803d'/>
                  <p style={{fontSize:'12px',color:'#15803d',fontWeight:500,margin:0}}>Cliente con datos completos</p>
                </div>
              )}
            </div>

            {/* ─ Persona facturable ─ */}
            <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#111111',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>2 · Responsable de pago</p>
              {!form.cliente_id ? (
                <p style={{fontSize:'13px',color:'#94a3b8',margin:0}}>Selecciona un cliente para ver sus personas facturables</p>
              ) : personasFacturables.length === 0 ? (
                <div style={{background:'#f8fafc',borderRadius:'8px',padding:'14px 16px',display:'flex',alignItems:'center',gap:'10px'}}>
                  <AlertTriangle size={15} color='#94a3b8'/>
                  <p style={{fontSize:'13px',color:'#94a3b8',margin:0}}>
                    Este cliente no tiene personas facturables registradas.{' '}
                    <button type="button"
                      onClick={()=>navigate('/clientes',{state:{openClienteId:form.cliente_id}})}
                      style={{fontSize:'13px',color:'#1d4ed8',background:'none',border:'none',cursor:'pointer',padding:0,textDecoration:'underline'}}>
                      Agregar persona facturable →
                    </button>
                  </p>
                </div>
              ) : (
                <div>
                  <label style={lbl}>Persona responsable de pago <span style={{fontWeight:400,color:'#94a3b8'}}>(opcional)</span></label>
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    {personasFacturables.map(pf => {
                      const sel = form.persona_facturable_id === pf.id
                      return (
                        <div key={pf.id}
                          onClick={()=>setForm(f=>({...f,persona_facturable_id:sel?'':pf.id}))}
                          style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',background:sel?'#f0fdf4':'#f8fafc',border:`2px solid ${sel?'#16a34a':'#e2e8f0'}`,borderRadius:'10px',cursor:'pointer',transition:'all 0.15s'}}>
                          <div style={{width:'20px',height:'20px',borderRadius:'50%',border:`2px solid ${sel?'#16a34a':'#cbd5e1'}`,background:sel?'#16a34a':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            {sel && <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'white'}}/>}
                          </div>
                          <div style={{flex:1}}>
                            <p style={{fontWeight:600,color:'#111111',fontSize:'13px',margin:0}}>{pf.nombre} {pf.apellido||''}</p>
                            <p style={{fontSize:'12px',color:'#64748b',margin:0}}>NIT: {pf.nit||'N/A'}{pf.email?` · ${pf.email}`:''}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ─ Aseguradora + Producto ─ */}
            <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#111111',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>3 · Aseguradora y producto</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'16px'}}>
                <div>
                  <label style={lbl}>Aseguradora *</label>
                  <SearchSelect value={form.aseguradora_id} onChange={handleAseguradoraChange} options={aseguradoras}
                    placeholder="Buscar aseguradora..."
                    renderOption={a=>(
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        {a.logo_url && <img src={a.logo_url} style={{width:'18px',height:'18px',objectFit:'contain',borderRadius:'2px'}}/>}
                        <span>{a.nombre}</span>
                      </div>
                    )} labelKey="nombre"/>
                </div>
                <div>
                  <label style={lbl}>Producto *</label>
                  <SearchSelect value={form.producto_id} onChange={val=>setForm({...form,producto_id:val})}
                    options={productosFiltered} placeholder={form.aseguradora_id?"Seleccionar producto...":"Primero selecciona aseguradora"} labelKey="nombre"/>
                </div>
              </div>
            </div>

            {/* ─ Vehículos ─ */}
            <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#111111',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>4 · Vehículos</p>
              {!form.cliente_id ? (
                <p style={{fontSize:'13px',color:'#94a3b8',margin:0}}>Selecciona un cliente para ver sus vehículos</p>
              ) : clienteVehiculos.length === 0 ? (
                <div style={{background:'#f8fafc',borderRadius:'8px',padding:'16px',textAlign:'center'}}>
                  <Car size={24} color='#cbd5e1' style={{marginBottom:'8px'}}/>
                  <p style={{fontSize:'13px',color:'#94a3b8',margin:0}}>Este cliente no tiene vehículos registrados</p>
                  <button type="button"
                    onClick={()=>navigate('/vehiculos')}
                    style={{marginTop:'8px',fontSize:'12px',color:'#1d4ed8',background:'none',border:'none',cursor:'pointer',padding:0,textDecoration:'underline'}}>
                    Registrar vehículo →
                  </button>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {clienteVehiculos.map(v => {
                    const sel = vehiculosSeleccionados.includes(v.id)
                    return (
                      <div key={v.id}
                        onClick={()=>toggleVehiculo(v.id)}
                        style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',background:sel?'#eff6ff':'#f8fafc',border:`2px solid ${sel?'#1d4ed8':'#e2e8f0'}`,borderRadius:'10px',cursor:'pointer',transition:'all 0.15s'}}>
                        {sel ? <CheckSquare size={18} color='#1d4ed8'/> : <Square size={18} color='#94a3b8'/>}
                        <div style={{width:'36px',height:'36px',borderRadius:'8px',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <Car size={16} color='#C4A96B'/>
                        </div>
                        <div style={{flex:1}}>
                          <p style={{fontWeight:600,color:'#111111',fontSize:'13px',margin:0}}>{v.marca} {v.modelo} {v.anio}</p>
                          <p style={{fontSize:'12px',color:'#64748b',margin:0}}>Placa: {fp(v)} · {v.tipo}</p>
                        </div>
                        {v.valor_asegurado > 0 && <p style={{fontSize:'12px',fontWeight:600,color:'#C4A96B',margin:0,flexShrink:0}}>Q {parseFloat(v.valor_asegurado).toLocaleString()}</p>}
                      </div>
                    )
                  })}
                  {vehiculosSeleccionados.length > 0 && (
                    <p style={{fontSize:'12px',color:'#1d4ed8',margin:'4px 0 0',fontWeight:500}}>{vehiculosSeleccionados.length} vehículo(s) seleccionado(s)</p>
                  )}
                </div>
              )}
            </div>

            {/* ─ Pago + Prima ─ */}
            <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#111111',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>5 · Pago y prima</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'16px'}}>
                <div>
                  <label style={lbl}>Prima total (Q)</label>
                  <input type="number" step="0.01" value={form.prima_total} onChange={e=>setForm({...form,prima_total:e.target.value})} style={inp} placeholder="0.00"/>
                </div>
                <div>
                  <label style={lbl}>Tipo de pago *</label>
                  <div style={{display:'flex',gap:'8px'}}>
                    {['contado','financiado'].map(t=>(
                      <button key={t} type="button" onClick={()=>setForm({...form,tipo_pago:t,numero_cuotas:t==='contado'?1:form.numero_cuotas})}
                        style={{flex:1,padding:'10px',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',
                          background:form.tipo_pago===t?'#111111':'white', color:form.tipo_pago===t?'white':'#64748b',
                          border:`1px solid ${form.tipo_pago===t?'#111111':'#e2e8f0'}`}}>
                        {t.charAt(0).toUpperCase()+t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {form.tipo_pago === 'financiado' && (
                  <div>
                    <label style={lbl}>Número de cuotas * <span style={{fontWeight:400,color:'#94a3b8'}}>(pagos mensuales)</span></label>
                    <input
                      type="number" min="2" max="60"
                      value={form.numero_cuotas}
                      onChange={e=>setForm({...form,numero_cuotas:parseInt(e.target.value)||2})}
                      style={inp}
                      placeholder="Ej: 12"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ─ Vigencia ─ */}
            <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#111111',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>6 · Vigencia</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'16px'}}>
                <div>
                  <label style={lbl}>Fecha de inicio *</label>
                  <input type="date" value={form.fecha_inicio} onChange={e=>handleFechaInicioChange(e.target.value)} required style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Duración *</label>
                  <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
                    {[['1anio','1 Año'],['manual','Manual']].map(([v,l])=>(
                      <button key={v} type="button" onClick={()=>handleVigenciaChange(v)}
                        style={{flex:1,padding:'9px',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',
                          background:form.vigencia===v?'#111111':'white', color:form.vigencia===v?'white':'#64748b',
                          border:`1px solid ${form.vigencia===v?'#111111':'#e2e8f0'}`}}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {form.vigencia === 'manual' ? (
                    <input type="date" value={form.fecha_vencimiento} onChange={e=>setForm({...form,fecha_vencimiento:e.target.value})} required style={inp}/>
                  ) : (
                    <div style={{padding:'10px 12px',background:'#f8fafc',borderRadius:'8px',border:'1px solid #e2e8f0',fontSize:'14px',color:'#64748b'}}>
                      {form.fecha_vencimiento ? new Date(form.fecha_vencimiento).toLocaleDateString('es-GT') : 'Selecciona fecha inicio'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─ Submit ─ */}
            <div style={{display:'flex',gap:'8px'}}>
              <button type="submit" disabled={clienteValidation.length > 0}
                style={{padding:'11px 28px',background:clienteValidation.length>0?'#94a3b8':'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:clienteValidation.length>0?'not-allowed':'pointer'}}>
                {editing ? 'Actualizar solicitud' : 'Crear solicitud'}
              </button>
              <button type="button" onClick={resetForm}
                style={{padding:'11px 24px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  /* ── VIEW: LIST ── */
  return (
    <div>
      <div style={{marginBottom:'20px'}}>
        <div style={{padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <h1 style={{fontSize:'22px',fontWeight:700,color:'#111111',margin:0}}>Pólizas</h1>
            <p style={{color:'#6B6B62',fontSize:'14px',marginTop:'4px',marginBottom:0}}>
              {counts.todas} total · {counts.solicitud} solicitudes · {counts.enviada} enviadas · {counts.en_reproceso} en reproceso · {counts.emitida} emitidas
            </p>
          </div>
          <button onClick={()=>{setView('form');setEditing(null);setForm(emptyPoliza);setProductosFiltered([]);setClienteVehiculos([]);setVehiculosSeleccionados([]);setClienteValidation([]);setPersonasFacturables([])}}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 20px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
            <Plus size={16}/> Nueva solicitud
          </button>
        </div>
      </div>

      <div style={{background:'white',borderRadius:'12px',padding:'14px 16px',border:'1px solid #e2e8f0',marginBottom:'16px',display:'flex',gap:'12px',flexWrap:'wrap',alignItems:'center'}}>
        <div style={{flex:1,minWidth:'200px',position:'relative'}}>
          <Search size={16} color="#94a3b8" style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por número, cliente o aseguradora..."
            style={{width:'100%',padding:'9px 12px 9px 36px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',background:'white',color:'#1e293b',boxSizing:'border-box'}}/>
        </div>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
          {[['todas','Todas',null],['solicitud','Solicitudes',polizaEstados.solicitud],['enviada','Enviadas',polizaEstados.enviada],['en_reproceso','En reproceso',polizaEstados.en_reproceso],['emitida','Emitidas',polizaEstados.emitida]].map(([key,label,est])=>{
            const isActive = filtroEstado === key
            return (
              <button key={key} onClick={()=>setFiltroEstado(key)}
                style={{padding:'7px 14px',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontWeight:500,
                  background: isActive ? (est?.color||'#111111') : 'white',
                  color: isActive ? 'white' : (est?.color||'#64748b'),
                  border: `1px solid ${est?.color||'#e2e8f0'}`}}>
                {label} ({counts[key]??counts.todas})
              </button>
            )
          })}
        </div>
      </div>

      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
        {loading ? <p style={{padding:'24px',color:'#64748b'}}>Cargando...</p> :
         filtered.length === 0 ? (
          <div style={{padding:'48px',textAlign:'center'}}>
            <FileText size={32} color="#cbd5e1" style={{marginBottom:'12px'}}/>
            <p style={{color:'#94a3b8'}}>No hay solicitudes registradas</p>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
          <div style={{minWidth:'600px'}}>
          {filtered.map((p,i)=>{
            const pEst = polizaEstados[p.estado] || polizaEstados.solicitud
            const vencEst = p.estado === 'emitida' ? getVencimientoEstado(p) : null
            const vencBadge = vencEst === 'vencida' ? { bg:'#fef2f2',color:'#ef4444',label:'Vencida' } : vencEst === 'por_vencer' ? { bg:'#fef9c3',color:'#a16207',label:'Por vencer' } : null
            return (
              <div key={p.id} style={{display:'flex',alignItems:'center',padding:'14px 20px',borderBottom:i<filtered.length-1?'1px solid #f1f5f9':'none',cursor:'pointer'}}
                onClick={()=>{ setSelected(p); setView('detalle'); navigate('/polizas/'+p.id, {replace:true}) }}
                onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e=>e.currentTarget.style.background='white'}>
                <div style={{width:'40px',height:'40px',borderRadius:'8px',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px',overflow:'hidden',background:'#f8fafc',flexShrink:0}}>
                  {p.aseguradoras?.logo_url?<img src={p.aseguradoras.logo_url} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<FileText size={16} color="#C4A96B"/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                    <p style={{fontWeight:700,color:'#111111',fontSize:'14px',margin:0}}>
                      {p.numero_poliza || `SOL-${p.numero_solicitud||'?'}`}
                    </p>
                    {p.poliza_origen && <span style={{fontSize:'11px',color:'#64748b',background:'#f1f5f9',padding:'1px 6px',borderRadius:'10px'}}>Renovación</span>}
                  </div>
                  <p style={{fontSize:'12px',color:'#64748b',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {p.clientes?.nombre} {p.clientes?.apellido||''} · {p.aseguradoras?.nombre}
                  </p>
                </div>
                {(() => {
                  const primaActiva = p.estado === 'emitida'
                    ? (p.emisiones||[])
                        .filter(em => em.estado === 'emitida' || em.estado === 'completado')
                        .reduce((s,em) => { const v=parseFloat(em.prima_emision||0); return em.tipo==='exclusion'?s-v:s+v }, 0)
                    : parseFloat(p.prima_total||0)
                  return (
                    <div style={{textAlign:'right',marginRight:'16px',flexShrink:0}}>
                      <p style={{fontSize:'14px',fontWeight:700,color:'#C4A96B',margin:0}}>Q {primaActiva.toLocaleString('es-GT', {minimumFractionDigits:0})}</p>
                      <p style={{fontSize:'11px',color:'#64748b',margin:0}}>{p.tipo_pago==='financiado'?`${p.numero_cuotas||1} cuotas`:'Contado'}</p>
                    </div>
                  )
                })()}
                {p.fecha_vencimiento && (
                  <div style={{textAlign:'right',marginRight:'12px',flexShrink:0}}>
                    <p style={{fontSize:'12px',color:'#64748b',margin:0,whiteSpace:'nowrap'}}>Vence: {new Date(p.fecha_vencimiento).toLocaleDateString('es-GT')}</p>
                  </div>
                )}
                <div style={{display:'flex',gap:'4px',marginRight:'8px',flexShrink:0}}>
                  <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:pEst.bg,color:pEst.color,fontWeight:600,whiteSpace:'nowrap'}}>{pEst.label}</span>
                  {vencBadge && <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:vencBadge.bg,color:vencBadge.color,fontWeight:500,whiteSpace:'nowrap'}}>{vencBadge.label}</span>}
                </div>
                <div style={{display:'flex',gap:'6px',flexShrink:0}} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>handleEdit(p)} style={{padding:'6px',background:'#f1f5f9',border:'none',borderRadius:'6px',cursor:'pointer'}}><Edit2 size={14} color="#64748b"/></button>
                  <button onClick={()=>handleDelete(p.id)} style={{padding:'6px',background:'#fef2f2',border:'none',borderRadius:'6px',cursor:'pointer'}}><Trash2 size={14} color="#ef4444"/></button>
                </div>
              </div>
            )
          })}
          </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── PolizaDetalle ──────────────────────────────────────────────────────── */
function PolizaDetalle({ poliza: polizaInit, onBack, onEdit, fromCliente, fromReq }) {
  const navigate = useNavigate()
  const [poliza, setPoliza]           = useState(polizaInit)
  const [emisiones, setEmisiones]     = useState([])
  const [reqs, setReqs]               = useState([])
  const [vehiculosDisponibles, setVehiculosDisponibles] = useState([])
  const [tareas, setTareas]           = useState([])
  const [bitacora, setBitacora]       = useState([])
  const [solicitudVehiculos, setSolicitudVehiculos] = useState([])
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState(polizaInit.estado === 'emitida' ? 'emisiones' : 'detalle')
  const [showEmisionForm, setShowEmisionForm] = useState(false)
  const [preselectedTipo, setPreselectedTipo] = useState(null)
  const [showReqModal, setShowReqModal] = useState(false)
  const [editingReq, setEditingReq]     = useState(null)
  const [showAsignarVehiculo, setShowAsignarVehiculo] = useState(null)
  const [emisionForm, setEmisionForm] = useState(emptyEmision)
  const [reqForm, setReqForm]         = useState(emptyReq)
  const [expandedEmision, setExpandedEmision] = useState(null)
  const [vehiculoSearch, setVehiculoSearch]   = useState('')
  const [showCambiarEstadoModal, setShowCambiarEstadoModal] = useState(false)
  const [estadoOpcion, setEstadoOpcion] = useState(null)   // 'enviar' | 'emitir' | 'reproceso' | 'reenviar'
  const [showNuevaGestionModal, setShowNuevaGestionModal] = useState(false)
  const [tipoGestion, setTipoGestion] = useState(null)    // 'renovacion' | 'inclusion' | 'exclusion'
  const [emitirForm, setEmitirForm]   = useState({ numero_poliza:'' })
  const [emitirPdfFile, setEmitirPdfFile] = useState(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [inclusionVehiculos, setInclusionVehiculos] = useState([])
  const [inclusionVehiculosSelected, setInclusionVehiculosSelected] = useState([])
  const [exclusionVehiculosSelected, setExclusionVehiculosSelected] = useState([])
  const [allClientVehiculos, setAllClientVehiculos] = useState([])
  const [personasFacturablesEmision, setPersonasFacturablesEmision] = useState([])
  const [showGestionEstadoModal, setShowGestionEstadoModal] = useState(false)
  const [gestionEstadoOpcion, setGestionEstadoOpcion] = useState(null) // 'enviar'|'emitir'|'completar'|'reproceso'|'reenviar'|'cancelar'
  const [emisionForModal, setEmisionForModal] = useState(null)
  const [showEmisionModal, setShowEmisionModal] = useState(false)
  const [editingEmision, setEditingEmision] = useState(null)
  const [emisionPdfFile, setEmisionPdfFile] = useState(null)

  useEffect(() => { fetchData() }, [poliza.id])

  const reloadPoliza = async () => {
    const { data } = await supabase.from('polizas')
      .select('*, clientes(nombre,apellido,nit,email,telefono,dpi), aseguradoras(nombre,logo_url), productos(nombre), poliza_origen:poliza_origen_id(id,numero_poliza)')
      .eq('id', poliza.id).single()
    if (data) setPoliza(data)
  }

  const fetchData = async () => {
    setLoading(true)
    const [{ data: emisionesData }, { data: reqsData }, { data: tareasData }, { data: vDisp },
           { data: bitacoraData }, { data: svData }, { data: allVData }] = await Promise.all([
      supabase.from('emisiones').select('*, emision_vehiculos(id, vehiculos(*)), personas_facturables:persona_facturable_id(id,nombre,apellido,nit,direccion)').eq('poliza_id', poliza.id).order('created_at'),
      supabase.from('requerimientos_pago').select('*, emisiones(numero_emision,tipo)').eq('poliza_id', poliza.id).order('fecha_vencimiento'),
      supabase.from('tareas').select('*').eq('poliza_id', poliza.id).eq('estado', 'pendiente'),
      supabase.from('vehiculos').select('*').eq('cliente_id', poliza.cliente_id).eq('activo', true).is('poliza_id', null),
      supabase.from('bitacora_polizas').select('*').eq('poliza_id', poliza.id).order('created_at'),
      supabase.from('solicitud_vehiculos').select('*, vehiculos(*)').eq('poliza_id', poliza.id),
      supabase.from('vehiculos').select('*').eq('cliente_id', poliza.cliente_id).eq('activo', true),
    ])
    setEmisiones(emisionesData || [])
    setReqs(reqsData || [])
    setTareas(tareasData || [])
    setVehiculosDisponibles(vDisp || [])
    setBitacora(bitacoraData || [])
    setSolicitudVehiculos(svData || [])
    setAllClientVehiculos(allVData || [])
    setLoading(false)
  }

  const addBitacora = async (estado_anterior, estado_nuevo, descripcion) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('bitacora_polizas').insert({
      poliza_id: poliza.id, estado_anterior, estado_nuevo, descripcion, created_by: user?.id
    })
  }

  const avanzarEstado = async () => {
    const siguiente = estadoFlujo[poliza.estado]
    if (!siguiente) return
    await supabase.from('polizas').update({ estado: siguiente }).eq('id', poliza.id)
    await addBitacora(poliza.estado, siguiente, estadoFlujoLabel[poliza.estado])
    toast.success(`Estado actualizado: ${polizaEstados[siguiente]?.label}`)
    await reloadPoliza(); fetchData()
  }

  const marcarEnReproceso = async () => {
    await supabase.from('polizas').update({ estado: 'en_reproceso' }).eq('id', poliza.id)
    await addBitacora('enviada', 'en_reproceso', 'Marcada en reproceso — requiere correcciones por la aseguradora')
    toast.success('Marcada en reproceso')
    await reloadPoliza(); fetchData()
  }

  const handleEmitir = async (e) => {
    e.preventDefault()
    if (!emitirForm.numero_poliza) { toast.error('Ingresa el número de póliza'); return }
    const { data: { user } } = await supabase.auth.getUser()

    // Upload PDF if provided
    let pdf_url = null
    if (emitirPdfFile) {
      setUploadingPdf(true)
      const ext = emitirPdfFile.name.split('.').pop()
      const path = `${poliza.id}/poliza.${ext}`
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('polizas-pdfs').upload(path, emitirPdfFile, { upsert: true })
      setUploadingPdf(false)
      if (uploadErr) { toast.error('Error subiendo PDF: ' + uploadErr.message); return }
      const { data: urlData } = supabase.storage.from('polizas-pdfs').getPublicUrl(uploadData.path)
      pdf_url = urlData.publicUrl
    }

    // 1. Update poliza
    await supabase.from('polizas').update({
      estado: 'emitida', numero_poliza: emitirForm.numero_poliza,
      poliza_pdf_url: pdf_url
    }).eq('id', poliza.id)

    // 2. Auto-create first emision
    const { data: emisionData } = await supabase.from('emisiones').insert({
      poliza_id: poliza.id, tipo: 'emision',
      numero_emision: `${emitirForm.numero_poliza}-E01`,
      prima_emision: poliza.prima_total,
      fecha_inicio: poliza.fecha_inicio, fecha_fin: poliza.fecha_vencimiento,
      estado: 'emitida', created_by: user?.id
    }).select().single()

    // 3. Assign solicitud_vehiculos → emision_vehiculos
    if (solicitudVehiculos.length > 0 && emisionData) {
      await Promise.all(solicitudVehiculos.map(sv =>
        supabase.from('emision_vehiculos').insert({ emision_id: emisionData.id, vehiculo_id: sv.vehiculo_id })
      ))
      await Promise.all(solicitudVehiculos.map(sv =>
        supabase.from('vehiculos').update({ poliza_id: poliza.id }).eq('id', sv.vehiculo_id)
      ))
    }

    // 4. Bitácora — poliza event + gestión event for E01
    await addBitacora(poliza.estado, 'emitida', `Póliza emitida · Núm: ${emitirForm.numero_poliza}`)
    if (emisionData) {
      await addBitacora(null, 'emitida', `[Gestión] Emisión principal ${emisionData.numero_emision} — Solicitud → Emitida`)
    }

    setEmitirPdfFile(null)
    setEmitirForm({ numero_poliza: '' })
    toast.success('¡Póliza emitida exitosamente!')
    await reloadPoliza(); fetchData()
  }

  const renovarPoliza = async () => {
    if (!confirm('Se creará una nueva solicitud en borrador como renovación. ¿Continuar?')) return
    const { data: { user } } = await supabase.auth.getUser()
    const ni = poliza.fecha_inicio ? new Date(poliza.fecha_inicio) : new Date()
    const nv = poliza.fecha_vencimiento ? new Date(poliza.fecha_vencimiento) : new Date()
    ni.setFullYear(ni.getFullYear() + 1); nv.setFullYear(nv.getFullYear() + 1)
    const { data: numData } = await supabase.rpc('generate_numero_solicitud')
    const { data, error } = await supabase.from('polizas').insert({
      numero_solicitud: numData, estado: 'solicitud',
      cliente_id: poliza.cliente_id, aseguradora_id: poliza.aseguradora_id,
      producto_id: poliza.producto_id, prima_total: poliza.prima_total,
      tipo_pago: poliza.tipo_pago, fraccionamiento: poliza.fraccionamiento,
      fecha_inicio: ni.toISOString().split('T')[0], fecha_vencimiento: nv.toISOString().split('T')[0],
      poliza_origen_id: poliza.id, agente_id: user?.id
    }).select().single()
    if (error) { toast.error('Error: ' + error.message); return }
    await supabase.from('bitacora_polizas').insert({
      poliza_id: data.id, estado_nuevo: 'solicitud',
      descripcion: `Renovación de póliza ${poliza.numero_poliza || poliza.numero_solicitud}`,
      created_by: user?.id
    })
    toast.success('Solicitud de renovación creada · #' + numData)
    navigate('/polizas', { state: { openPolizaId: data.id } })
  }

  const abrirFormEmision = async (tipo) => {
    setEmisionForm({ ...emptyEmision, tipo }); setPreselectedTipo(tipo)
    setInclusionVehiculosSelected([]); setExclusionVehiculosSelected([])
    setEditingEmision(null)
    setActiveTab('emisiones')
    const { data: pfData } = await supabase.from('personas_facturables')
      .select('*').eq('cliente_id', poliza.cliente_id).eq('activa', true).order('nombre')
    setPersonasFacturablesEmision(pfData || [])
    setShowEmisionModal(true)
  }

  const editarEmision = async (em) => {
    setEmisionForm({
      tipo: em.tipo,
      prima_emision: em.prima_emision ?? '',
      tipo_pago: em.tipo_pago || 'contado',
      numero_cuotas: em.numero_cuotas ?? 1,
      fecha_inicio: em.fecha_inicio || '',
      fecha_fin: em.fecha_fin || '',
      notas: em.notas || '',
      persona_facturable_id: em.persona_facturable_id || '',
    })
    setEditingEmision(em)
    setInclusionVehiculosSelected([]); setExclusionVehiculosSelected([])
    const { data: pfData } = await supabase.from('personas_facturables')
      .select('*').eq('cliente_id', poliza.cliente_id).eq('activa', true).order('nombre')
    setPersonasFacturablesEmision(pfData || [])
    setShowEmisionModal(true)
  }

  const handleEmisionSubmit = async (e) => {
    e.preventDefault()
    const isExclusion = emisionForm.tipo === 'exclusion'
    const { data: { user } } = await supabase.auth.getUser()

    // ── EDIT mode ──
    if (editingEmision) {
      const { error } = await supabase.from('emisiones').update({
        prima_emision: parseFloat(emisionForm.prima_emision) || 0,
        fecha_inicio: emisionForm.fecha_inicio,
        fecha_fin: isExclusion ? emisionForm.fecha_inicio : poliza.fecha_vencimiento,
        notas: emisionForm.notas || null,
        persona_facturable_id: emisionForm.persona_facturable_id || null,
        tipo_pago: emisionForm.tipo_pago || 'contado',
        fraccionamiento: 'anual',
        numero_cuotas: emisionForm.tipo_pago === 'contado' ? 1 : (parseInt(emisionForm.numero_cuotas) || 1),
      }).eq('id', editingEmision.id)
      if (error) { toast.error('Error: ' + error.message); return }
      const tipoLabel = isExclusion ? 'Exclusión' : 'Inclusión'
      await addBitacora(editingEmision.estado, editingEmision.estado, `${tipoLabel} ${editingEmision.numero_emision} editada`)
      toast.success(`${tipoLabel} actualizada`)
      setShowEmisionModal(false); setEditingEmision(null); setEmisionForm(emptyEmision)
      fetchData(); return
    }

    // ── CREATE mode ──
    if (isExclusion && exclusionVehiculosSelected.length === 0) {
      toast.error('Selecciona al menos un vehículo para excluir'); return
    }
    if (!isExclusion && inclusionVehiculosSelected.length === 0) {
      toast.error('Selecciona al menos un vehículo para incluir'); return
    }
    const tipoCode = isExclusion ? 'EXC' : 'INC'
    const tipoFilter = isExclusion ? 'exclusion' : 'inclusion'
    const count = emisiones.filter(em=>em.tipo===tipoFilter).length + 1
    const numEmision = `${poliza.numero_poliza||'SOL'}-${tipoCode}${count.toString().padStart(2,'0')}`
    const { data: emData, error } = await supabase.from('emisiones').insert({
      poliza_id: poliza.id, tipo: emisionForm.tipo, estado: 'solicitud',
      numero_emision: numEmision,
      prima_emision: parseFloat(emisionForm.prima_emision) || 0,
      fecha_inicio: emisionForm.fecha_inicio,
      fecha_fin: isExclusion ? emisionForm.fecha_inicio : poliza.fecha_vencimiento,
      notas: emisionForm.notas || null,
      persona_facturable_id: emisionForm.persona_facturable_id || null,
      tipo_pago: emisionForm.tipo_pago || 'contado',
      fraccionamiento: 'anual',
      numero_cuotas: emisionForm.tipo_pago === 'contado' ? 1 : (parseInt(emisionForm.numero_cuotas) || 1),
      created_by: user?.id
    }).select().single()
    if (error) { toast.error('Error: ' + error.message); return }
    const selectedVids = isExclusion ? exclusionVehiculosSelected : inclusionVehiculosSelected
    if (selectedVids.length > 0) {
      await supabase.from('emision_vehiculos').insert(
        selectedVids.map(vid => ({ emision_id: emData.id, vehiculo_id: vid }))
      )
    }
    const tipoLabel = isExclusion ? 'Exclusión' : 'Inclusión'
    await addBitacora(null, 'solicitud', `${tipoLabel} ${numEmision} creada`)
    toast.success(`${tipoLabel} creada · ` + numEmision)
    setShowEmisionModal(false); setEmisionForm(emptyEmision)
    setInclusionVehiculosSelected([]); setExclusionVehiculosSelected([])
    fetchData()
  }

  const asignarVehiculo = async (vehiculoId, emisionId) => {
    const { data: check } = await supabase.from('vehiculos').select('poliza_id').eq('id', vehiculoId).single()
    if (check?.poliza_id) { toast.error('Este vehiculo ya esta asignado a una poliza vigente'); return }
    const { error: evError } = await supabase.from('emision_vehiculos').insert({ emision_id: emisionId, vehiculo_id: vehiculoId })
    if (evError) { toast.error('Error al asignar'); return }
    await supabase.from('vehiculos').update({ poliza_id: poliza.id }).eq('id', vehiculoId)
    toast.success('Vehiculo asignado')
    setShowAsignarVehiculo(null); setVehiculoSearch(''); fetchData()
  }

  const quitarVehiculo = async (vehiculoId, emisionVehiculoId, emisionId) => {
    // Prevent removing the last vehicle from an existing emission
    const em = emisiones.find(e => e.id === emisionId)
    if (em && em.emision_vehiculos?.length <= 1) {
      toast.error('No puedes quitar el único vehículo de esta gestión')
      return
    }
    await supabase.from('emision_vehiculos').delete().eq('id', emisionVehiculoId)
    await supabase.from('vehiculos').update({ poliza_id: null }).eq('id', vehiculoId)
    toast.success('Vehiculo removido'); fetchData()
  }

  const handleReqSubmit = async (e) => {
    e.preventDefault()
    if (editingReq) {
      // Edit mode — update single req
      const { error } = await supabase.from('requerimientos_pago').update({
        monto: parseFloat(reqForm.monto),
        fecha_vencimiento: reqForm.fecha_vencimiento,
      }).eq('id', editingReq.id)
      if (error) { toast.error('Error: ' + error.message); return }
      toast.success('Requerimiento actualizado')
      setReqForm(emptyReq); setEditingReq(null); setShowReqModal(false); fetchData()
      return
    }
    // Create mode — bulk generate
    if (!reqForm.emision_id) { toast.error('Selecciona la emisión'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: codigoData } = await supabase.rpc('generate_codigo_req')
    const codigo = codigoData || 'REQ-' + Date.now()
    const monto = parseFloat(reqForm.monto)
    const totalCuotas = parseInt(reqForm.total_cuotas)
    const requerimientos = Array.from({ length: totalCuotas }, (_, i) => {
      const fecha = new Date(reqForm.fecha_vencimiento + 'T12:00:00')
      fecha.setMonth(fecha.getMonth() + i)
      return {
        emision_id: reqForm.emision_id, poliza_id: poliza.id,
        codigo: i===0 ? codigo : `${codigo}-${i}`, codigo_matriz: i===0 ? null : codigo,
        numero_cuota: i+1, total_cuotas: totalCuotas, monto,
        fecha_vencimiento: fecha.toISOString().split('T')[0], created_by: user?.id,
      }
    })
    const { error } = await supabase.from('requerimientos_pago').insert(requerimientos)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(`${totalCuotas} requerimiento(s) creado(s)`)
    setReqForm(emptyReq); setShowReqModal(false); fetchData()
  }

  const eliminarReq = async (id) => {
    if (!confirm('¿Eliminar este requerimiento de pago?')) return
    const { error } = await supabase.from('requerimientos_pago').delete().eq('id', id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Requerimiento eliminado'); fetchData()
  }

  const marcarPagado = async (id) => {
    await supabase.from('requerimientos_pago').update({ estado:'pagado', fecha_pago: new Date().toISOString().split('T')[0] }).eq('id', id)
    toast.success('Marcado como pagado'); fetchData()
  }

  const handleGenerarPdf = async () => {
    const toastId = toast.loading('Generando PDF…')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase.from('users').select('nombre,apellido').eq('id', user.id).single()
      const usuarioNombre = userData ? `${userData.nombre || ''} ${userData.apellido || ''}`.trim() : (user.email?.split('@')[0] || 'GGS')
      const { data: clienteFull } = await supabase.from('clientes').select('*').eq('id', poliza.cliente_id).single()
      let personaFacturable = null
      if (poliza.persona_facturable_id) {
        const { data: pfData } = await supabase.from('personas_facturables').select('*').eq('id', poliza.persona_facturable_id).single()
        personaFacturable = pfData || null
      }
      await generateSolicitudPdf({
        poliza: { ...poliza, clientes: clienteFull || poliza.clientes },
        vehiculos: solicitudVehiculos,
        personaFacturable,
        usuario: usuarioNombre,
      })
      toast.success('PDF generado', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Error al generar PDF', { id: toastId })
    }
  }

  const handleGestionPdf = async (em) => {
    const toastId = toast.loading('Generando PDF…')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase.from('users').select('nombre,apellido').eq('id', user.id).single()
      const usuarioNombre = userData ? `${userData.nombre||''} ${userData.apellido||''}`.trim() : (user.email?.split('@')[0]||'GGS')
      const { data: clienteFull } = await supabase.from('clientes').select('*').eq('id', poliza.cliente_id).single()
      let personaFacturable = null
      if (em.persona_facturable_id) {
        const { data: pfData } = await supabase.from('personas_facturables').select('*').eq('id', em.persona_facturable_id).single()
        personaFacturable = pfData || null
      }
      const vehiculos = (em.emision_vehiculos || []).map(ev => ev.vehiculos).filter(Boolean)
      await generateInclusionPdf({
        emision: em,
        poliza: { ...poliza, clientes: clienteFull || poliza.clientes },
        vehiculos,
        personaFacturable,
        usuario: usuarioNombre,
      })
      toast.success('PDF generado', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Error al generar PDF', { id: toastId })
    }
  }

  const actualizarEstadoEmision = async (em, nuevoEstado) => {
    const { error } = await supabase.from('emisiones').update({ estado: nuevoEstado }).eq('id', em.id)
    if (error) { toast.error('Error: ' + error.message); return false }
    const tipoLabel = { emision:'Emisión principal', inclusion:'Inclusión', exclusion:'Exclusión' }[em.tipo] || em.tipo
    const estadoLabel = { solicitud:'Solicitud', enviada:'Enviada a aseguradora', en_reproceso:'En reproceso', emitida:'Emitida', completado:'Completada', cancelada:'Cancelada' }
    const desc = `[Gestión] ${tipoLabel} ${em.numero_emision} — ${estadoLabel[em.estado]||em.estado} → ${estadoLabel[nuevoEstado]||nuevoEstado}`
    await addBitacora(em.estado, nuevoEstado, desc)
    // When an exclusion is completado/emitida → release excluded vehicles
    if ((nuevoEstado === 'completado' || nuevoEstado === 'emitida') && em.tipo === 'exclusion') {
      const excVehiculos = em.emision_vehiculos?.map(ev => ev.vehiculos?.id).filter(Boolean) || []
      if (excVehiculos.length > 0) {
        await Promise.all(excVehiculos.map(vid =>
          supabase.from('vehiculos').update({ poliza_id: null }).eq('id', vid)
        ))
      }
    }
    toast.success(`${tipoLabel} → ${estadoLabel[nuevoEstado]||nuevoEstado}`)
    await fetchData()
    return true
  }

  const totalPagado   = reqs.filter(r=>r.estado==='pagado').reduce((s,r)=>s+parseFloat(r.monto||0),0)
  const totalPendiente = reqs.filter(r=>r.estado!=='pagado').reduce((s,r)=>s+parseFloat(r.monto||0),0)
  const totalVehiculos = emisiones.reduce((s,em)=>s+(em.emision_vehiculos?.length||0),0)
  const isEmitida = poliza.estado === 'emitida'
  const primaTotal = isEmitida
    ? emisiones
        .filter(em=>em.estado==='emitida'||em.estado==='completado')
        .reduce((s,em)=>{ const v=parseFloat(em.prima_emision||0); return em.tipo==='exclusion'?s-v:s+v }, 0)
    : parseFloat(poliza.prima_total||0)
  const inputStyle = { width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:'6px', fontSize:'13px', background:'white', color:'#1e293b', boxSizing:'border-box' }

  const hoy = new Date()
  const pEst = polizaEstados[poliza.estado] || polizaEstados.solicitud
  const vencDate = poliza.fecha_vencimiento ? new Date(poliza.fecha_vencimiento) : null
  const diasRestantes = vencDate ? Math.ceil((vencDate - hoy) / (1000*60*60*24)) : null
  const vencEst = vencDate ? (vencDate < hoy ? 'vencida' : diasRestantes <= 30 ? 'por_vencer' : 'activa') : 'activa'

  const estadoBitacora = {
    solicitud:'#1d4ed8', enviada:'#a16207', en_reproceso:'#ef4444', emitida:'#15803d'
  }

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:'6px',color:'#64748b',background:'none',border:'none',cursor:'pointer',fontSize:'14px',marginBottom:'20px',padding:'0'}}>
        <ArrowLeft size={16}/> {fromCliente ? 'Volver al cliente' : fromReq ? 'Volver al requerimiento' : 'Volver a pólizas'}
      </button>

      {/* ── Policy header card ── */}
      <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'14px',marginBottom:'20px',overflow:'hidden'}}>

        {/* Identity row + actions */}
        <div style={{padding:'20px 24px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'16px',flexWrap:'wrap'}}>

          {/* Left: logo + title + subtitle */}
          <div style={{display:'flex',alignItems:'flex-start',gap:'16px',minWidth:0}}>
            {/* Insurer logo */}
            <div style={{width:'56px',height:'56px',borderRadius:'12px',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'white',flexShrink:0,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              {poliza.aseguradoras?.logo_url
                ? <img src={poliza.aseguradoras.logo_url} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
                : <FileText size={22} color="#C4A96B"/>}
            </div>

            {/* Title + badges + subtitle */}
            <div style={{minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                <h1 style={{fontSize:'22px',fontWeight:800,color:'#111111',margin:0,letterSpacing:'-0.3px'}}>
                  {poliza.numero_poliza || `SOL-${poliza.numero_solicitud||'?'}`}
                </h1>
                <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',fontWeight:700,background:pEst.bg,color:pEst.color}}>{pEst.label}</span>
                {isEmitida && vencEst==='vencida' && <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:'#fef2f2',color:'#ef4444',fontWeight:600}}>Vencida</span>}
                {isEmitida && vencEst==='por_vencer' && <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:'#fef9c3',color:'#a16207',fontWeight:600}}>Por vencer ({diasRestantes}d)</span>}
              </div>
              <p style={{fontSize:'13px',color:'#6B6B62',margin:'5px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {poliza.clientes?.nombre} {poliza.clientes?.apellido||''} · {poliza.aseguradoras?.nombre} · {poliza.productos?.nombre}
              </p>
              {poliza.poliza_origen && (
                <div style={{marginTop:'4px',display:'flex',alignItems:'center',gap:'4px'}}>
                  <GitMerge size={11} color="#94a3b8"/>
                  <span style={{fontSize:'12px',color:'#6B6B62'}}>
                    Renovación de&nbsp;
                    <button onClick={()=>navigate('/polizas',{state:{openPolizaId:poliza.poliza_origen.id}})}
                      style={{background:'none',border:'none',color:'#C4A96B',cursor:'pointer',fontSize:'12px',fontWeight:600,padding:0,textDecoration:'underline'}}>
                      {poliza.poliza_origen.numero_poliza||'solicitud anterior'}
                    </button>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: action buttons */}
          <div style={{display:'flex',flexWrap:'wrap',gap:'8px',alignItems:'center',flexShrink:0}}>

            {/* ── Editar: ícono pequeño, siempre visible excepto emitida ── */}
            {!isEmitida && (
              <button onClick={()=>onEdit(poliza)} title="Editar solicitud"
                style={{display:'flex',alignItems:'center',justifyContent:'center',width:'36px',height:'36px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'8px',cursor:'pointer',flexShrink:0}}>
                <Edit2 size={15}/>
              </button>
            )}

            {/* ── PDF solicitud: outline en todos los estados pre-emitida ── */}
            {(poliza.estado === 'solicitud' || poliza.estado === 'enviada' || poliza.estado === 'en_reproceso') && (
              <button onClick={handleGenerarPdf}
                title={poliza.estado === 'en_reproceso' ? 'Re-descargar PDF con cambios' : 'Descargar PDF solicitud'}
                style={{display:'flex',alignItems:'center',gap:'7px',padding:'8px 14px',
                  background:'white',color:'#374151',border:'1px solid #e2e8f0',
                  borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer'}}>
                <Download size={14}/>
                {poliza.estado === 'en_reproceso' ? 'Re-descargar PDF' : 'PDF solicitud'}
              </button>
            )}

            {/* ── Cambiar estado: solicitud / enviada / en_reproceso ── */}
            {(poliza.estado === 'solicitud' || poliza.estado === 'enviada' || poliza.estado === 'en_reproceso') && (
              <button onClick={()=>{ setEstadoOpcion(null); setShowCambiarEstadoModal(true) }}
                style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 18px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
                <RefreshCw size={13}/> Cambiar estado
              </button>
            )}

            {/* ── Estado: emitida ── */}
            {isEmitida && poliza.poliza_pdf_url && (
              <a href={poliza.poliza_pdf_url} target="_blank" rel="noopener noreferrer"
                style={{display:'flex',alignItems:'center',gap:'5px',padding:'8px 14px',background:'white',color:'#374151',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',textDecoration:'none'}}>
                <Download size={13}/> Póliza PDF
              </a>
            )}

          </div>
        </div>

        {/* Divider */}
        <div style={{height:'1px',background:'#f1f5f9',margin:'0 24px'}}/>

        {/* KPI strip — integrated into card */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)'}}>
          {[
            ['Prima total',   'Q '+primaTotal.toLocaleString(),  '#C4A96B'],
            ['Tipo de pago',  poliza.tipo_pago==='financiado'?`Financiado · ${poliza.numero_cuotas||1} cuotas`:'Contado', '#111111'],
            ['Inicio',        poliza.fecha_inicio ? new Date(poliza.fecha_inicio).toLocaleDateString('es-GT') : '—', '#374151'],
            ['Vencimiento',   vencDate ? new Date(poliza.fecha_vencimiento).toLocaleDateString('es-GT') : '—', vencEst==='vencida'?'#ef4444':vencEst==='por_vencer'?'#a16207':'#374151'],
          ].map(([label,val,color],i)=>(
            <div key={label} style={{padding:'16px 24px',borderRight:i<3?'1px solid #f1f5f9':'none'}}>
              <p style={{fontSize:'11px',color:'#94a3b8',margin:0,textTransform:'uppercase',letterSpacing:'0.05em',fontWeight:500}}>{label}</p>
              <p style={{fontSize:'15px',fontWeight:700,color,margin:'4px 0 0'}}>{val}</p>
            </div>
          ))}
        </div>

      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
        {[
          ['detalle','Detalle'],
          ['bitacora',`Bitácora (${bitacora.length})`],
          ['vehiculos_sol', isEmitida ? `Vehículos (${totalVehiculos})` : `Vehículos (${solicitudVehiculos.length})`],
          ...(isEmitida ? [
            ['emisiones',`Gestiones (${emisiones.length})`],
            ['pagos',`Pagos (${reqs.length})`],
          ] : []),
          ['tareas',`Tareas (${tareas.length})`],
        ].map(([tab,label])=>(
          <button key={tab} onClick={()=>setActiveTab(tab)}
            style={{padding:'8px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',
              background:activeTab===tab?'#111111':'white',color:activeTab===tab?'white':'#64748b',
              border:`1px solid ${activeTab===tab?'#111111':'#e2e8f0'}`}}>
            {label}
          </button>
        ))}
        {!isEmitida && (
          <p style={{fontSize:'13px',color:'#94a3b8',margin:'auto 0',paddingLeft:'4px'}}>
            Emisiones y pagos disponibles al emitir la póliza.
          </p>
        )}
      </div>

      {/* ─ TAB: Detalle ─ */}
      {activeTab === 'detalle' && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',padding:'20px 24px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
            <h3 style={{fontSize:'15px',fontWeight:600,color:'#111111',margin:0}}>Datos del cliente</h3>
            <button onClick={()=>navigate('/clientes',{state:{openClienteId:poliza.cliente_id}})}
              style={{display:'flex',alignItems:'center',gap:'5px',padding:'6px 12px',background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe',borderRadius:'8px',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>
              Ver perfil del cliente →
            </button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'12px'}}>
            {[
              ['Nombre', `${poliza.clientes?.nombre||''} ${poliza.clientes?.apellido||''}`],
              ['NIT', poliza.clientes?.nit||'—'],
              ['Correo', poliza.clientes?.email||'—'],
              ['Teléfono', poliza.clientes?.telefono||'—'],
              ['DPI', poliza.clientes?.dpi||'—'],
            ].map(([label,val])=>(
              <div key={label} style={{background:'white',borderRadius:'10px',padding:'14px 16px',border:'1px solid #e2e8f0'}}>
                <p style={{fontSize:'11px',color:'#64748b',margin:0}}>{label}</p>
                <p style={{fontSize:'14px',fontWeight:600,color:'#1e293b',margin:'4px 0 0'}}>{val}</p>
              </div>
            ))}
          </div>
          {poliza.poliza_pdf_url && (
            <div style={{marginTop:'16px',paddingTop:'16px',borderTop:'1px solid #f1f5f9'}}>
              <a href={poliza.poliza_pdf_url} target="_blank" rel="noopener noreferrer"
                style={{display:'inline-flex',alignItems:'center',gap:'6px',padding:'8px 16px',background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe',borderRadius:'8px',fontSize:'13px',fontWeight:600,textDecoration:'none'}}>
                <Download size={14}/> Ver PDF de la póliza
              </a>
            </div>
          )}
        </div>
      )}

      {/* ─ TAB: Bitácora ─ */}
      {activeTab === 'bitacora' && (() => {
        const polizaEntries = bitacora.filter(e => !e.descripcion?.startsWith('[Gestión]'))
        const gestionEntries = bitacora.filter(e => e.descripcion?.startsWith('[Gestión]'))
        // Group gestion entries by emission number
        const gestionGroups = {}
        gestionEntries.forEach(e => {
          const cleanDesc = e.descripcion.replace('[Gestión] ','')
          const matchedEm = emisiones.find(em => cleanDesc.includes(em.numero_emision))
          const key = matchedEm ? matchedEm.numero_emision : 'otras'
          if (!gestionGroups[key]) {
            gestionGroups[key] = { em: matchedEm, entries: [], key }
          }
          gestionGroups[key].entries.push(e)
        })
        const groupKeys = Object.keys(gestionGroups)
        const thStyle = { padding:'8px 12px', fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', textAlign:'left', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }
        const tdStyle = { padding:'9px 12px', fontSize:'13px', color:'#374151', borderBottom:'1px solid #f8fafc', verticalAlign:'middle' }
        const renderTable = (entries) => (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Evento</th>
                <th style={thStyle}>Estado anterior</th>
                <th style={thStyle}>Estado nuevo</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const cleanDesc = entry.descripcion?.startsWith('[Gestión]') ? entry.descripcion.replace('[Gestión] ','') : (entry.descripcion||'')
                // Strip the "X — prev → next" part from gestion descriptions if we have columns
                const displayDesc = cleanDesc.replace(/ — .+→.+$/,'').trim() || cleanDesc
                const eAnterior = polizaEstados[entry.estado_anterior]
                const eNuevo    = polizaEstados[entry.estado_nuevo]
                return (
                  <tr key={entry.id} onMouseEnter={e=>e.currentTarget.style.background='#fafbff'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
                    <td style={{...tdStyle, whiteSpace:'nowrap', color:'#64748b', fontSize:'12px'}}>
                      {new Date(entry.created_at).toLocaleDateString('es-GT')}<br/>
                      <span style={{color:'#94a3b8'}}>{new Date(entry.created_at).toLocaleTimeString('es-GT',{hour:'2-digit',minute:'2-digit'})}</span>
                    </td>
                    <td style={tdStyle}>{displayDesc}</td>
                    <td style={tdStyle}>
                      {entry.estado_anterior ? (
                        <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:eAnterior?.bg||'#f1f5f9',color:eAnterior?.color||'#64748b',fontWeight:600,whiteSpace:'nowrap'}}>
                          {eAnterior?.label||entry.estado_anterior}
                        </span>
                      ) : <span style={{color:'#94a3b8',fontSize:'12px'}}>—</span>}
                    </td>
                    <td style={tdStyle}>
                      {entry.estado_nuevo ? (
                        <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:eNuevo?.bg||'#f1f5f9',color:eNuevo?.color||'#64748b',fontWeight:600,whiteSpace:'nowrap'}}>
                          {eNuevo?.label||entry.estado_nuevo}
                        </span>
                      ) : <span style={{color:'#94a3b8',fontSize:'12px'}}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )
        return (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            {loading ? <p style={{padding:'20px',color:'#64748b'}}>Cargando...</p> :
             bitacora.length === 0 ? (
              <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',padding:'32px',textAlign:'center'}}>
                <History size={28} color='#cbd5e1' style={{marginBottom:'10px'}}/>
                <p style={{color:'#94a3b8',margin:0}}>Sin registros en la bitácora</p>
              </div>
             ) : (
              <>
                {/* Póliza events */}
                {polizaEntries.length > 0 && (() => {
                  const isPolizaExpanded = expandedEmision === 'bit-poliza'
                  return (
                    <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
                      <div style={{padding:'12px 16px',borderBottom:isPolizaExpanded?'1px solid #f1f5f9':'none',display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'}}
                        onClick={()=>setExpandedEmision(isPolizaExpanded?null:'bit-poliza')}>
                        <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',fontWeight:700,background:'#f1f5f9',color:'#475569'}}>PÓLIZA</span>
                        <span style={{fontSize:'13px',fontWeight:600,color:'#111111'}}>Bitácora completa</span>
                        <span style={{marginLeft:'auto',fontSize:'12px',color:'#94a3b8'}}>{polizaEntries.length} evento(s)</span>
                        {isPolizaExpanded ? <ChevronUp size={14} color="#94a3b8"/> : <ChevronDown size={14} color="#94a3b8"/>}
                      </div>
                      {isPolizaExpanded && <div style={{overflowX:'auto'}}>{renderTable(polizaEntries)}</div>}
                    </div>
                  )
                })()}
                {/* Gestión events grouped by emission */}
                {groupKeys.map(key => {
                  const grp = gestionGroups[key]
                  const tipoLabel = grp.em ? ({ emision:'Emisión principal', inclusion:'Inclusión', exclusion:'Exclusión', renovacion:'Renovación' }[grp.em.tipo] || grp.em.tipo) : 'Gestión'
                  const eEst = grp.em ? (polizaEstados[grp.em.estado] || { bg:'#f1f5f9', color:'#64748b', label:grp.em.estado }) : null
                  const isExpanded = expandedEmision === ('bit-'+key)
                  return (
                    <div key={key} style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
                      <div style={{padding:'12px 16px',borderBottom: isExpanded?'1px solid #f1f5f9':'none',display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'}}
                        onClick={()=>setExpandedEmision(isExpanded?null:'bit-'+key)}>
                        <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',fontWeight:700,background:'#ede9fe',color:'#7c3aed'}}>GESTIÓN</span>
                        <span style={{fontSize:'13px',fontWeight:600,color:'#111111'}}>{key}</span>
                        <span style={{fontSize:'12px',color:'#64748b'}}>{tipoLabel}</span>
                        {eEst && <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:eEst.bg,color:eEst.color,fontWeight:600}}>{eEst.label}</span>}
                        <span style={{marginLeft:'auto',fontSize:'12px',color:'#94a3b8'}}>{grp.entries.length} evento(s)</span>
                        {isExpanded ? <ChevronUp size={14} color="#94a3b8"/> : <ChevronDown size={14} color="#94a3b8"/>}
                      </div>
                      {isExpanded && <div style={{overflowX:'auto'}}>{renderTable(grp.entries)}</div>}
                    </div>
                  )
                })}
              </>
             )}
          </div>
        )
      })()}

      {/* ─ TAB: Vehículos ─ */}
      {activeTab === 'vehiculos_sol' && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:'8px'}}>
            <Car size={16} color='#C4A96B'/>
            <h3 style={{fontSize:'15px',fontWeight:600,color:'#111111',margin:0}}>
              {isEmitida ? 'Vehículos de la póliza' : 'Vehículos de la solicitud'}
            </h3>
            <span style={{marginLeft:'auto',background:'#dbeafe',color:'#1d4ed8',fontSize:'12px',padding:'2px 8px',borderRadius:'20px'}}>
              {isEmitida ? totalVehiculos : solicitudVehiculos.length}
            </span>
          </div>
          {loading ? <p style={{padding:'20px',color:'#64748b'}}>Cargando...</p> :
           !isEmitida ? (
            solicitudVehiculos.length === 0 ? (
              <div style={{padding:'32px',textAlign:'center'}}>
                <Car size={28} color='#cbd5e1' style={{marginBottom:'10px'}}/>
                <p style={{color:'#94a3b8',margin:0}}>Sin vehículos asignados a esta solicitud</p>
              </div>
            ) : solicitudVehiculos.map((sv, i) => (
              <div key={sv.id}
                style={{display:'flex',alignItems:'center',padding:'14px 20px',borderBottom:i<solicitudVehiculos.length-1?'1px solid #f1f5f9':'none',cursor:'pointer'}}
                onClick={() => navigate('/vehiculos', { state: { openVehiculoId: sv.vehiculos?.id, fromPolizaId: poliza.id } })}
                onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e=>e.currentTarget.style.background='white'}>
                <div style={{width:'40px',height:'40px',borderRadius:'8px',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px',flexShrink:0}}>
                  <Car size={18} color='#C4A96B'/>
                </div>
                <div style={{flex:1}}>
                  <p style={{fontWeight:700,color:'#111111',fontSize:'14px',margin:0}}>{sv.vehiculos?.marca} {sv.vehiculos?.modelo} {sv.vehiculos?.anio}</p>
                  <p style={{fontSize:'12px',color:'#64748b',margin:0}}>Placa: {fp(sv.vehiculos)} · {sv.vehiculos?.tipo}{sv.vehiculos?.color?` · ${sv.vehiculos.color}`:''}</p>
                </div>
                {sv.vehiculos?.valor_asegurado > 0 && (
                  <p style={{fontSize:'14px',fontWeight:700,color:'#C4A96B',margin:'0 8px 0 0',flexShrink:0}}>Q {parseFloat(sv.vehiculos.valor_asegurado).toLocaleString()}</p>
                )}
                <ChevronRight size={16} color='#94a3b8'/>
              </div>
            ))
           ) : (
            // Emitida: show all vehicles from all emissions
            totalVehiculos === 0 ? (
              <div style={{padding:'32px',textAlign:'center'}}>
                <Car size={28} color='#cbd5e1' style={{marginBottom:'10px'}}/>
                <p style={{color:'#94a3b8',margin:0}}>Sin vehículos en la póliza</p>
              </div>
            ) : emisiones.filter(em=>em.emision_vehiculos?.length>0).map(em => (
              em.emision_vehiculos.map((ev, i) => {
                const allEv = emisiones.flatMap(e=>e.emision_vehiculos||[])
                const idx = allEv.indexOf(ev)
                return (
                  <div key={ev.id}
                    style={{display:'flex',alignItems:'center',padding:'14px 20px',borderBottom:idx<allEv.length-1?'1px solid #f1f5f9':'none',cursor:'pointer'}}
                    onClick={() => navigate('/vehiculos', { state: { openVehiculoId: ev.vehiculos?.id, fromPolizaId: poliza.id } })}
                    onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e=>e.currentTarget.style.background='white'}>
                    <div style={{width:'40px',height:'40px',borderRadius:'8px',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px',flexShrink:0}}>
                      <Car size={18} color='#C4A96B'/>
                    </div>
                    <div style={{flex:1}}>
                      <p style={{fontWeight:700,color:'#111111',fontSize:'14px',margin:0}}>{ev.vehiculos?.marca} {ev.vehiculos?.modelo} {ev.vehiculos?.anio}</p>
                      <p style={{fontSize:'12px',color:'#64748b',margin:0}}>Placa: {fp(ev.vehiculos)} · {em.numero_emision}</p>
                    </div>
                    {(() => {
                      const isExc = em.tipo === 'exclusion' && (em.estado === 'completado' || em.estado === 'emitida')
                      const badge = isExc
                        ? { bg:'#fff7ed', color:'#ea580c', label:'Excluido' }
                        : (polizaEstados[em.estado]||{bg:'#f1f5f9',color:'#64748b',label:em.estado})
                      return <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:badge.bg,color:badge.color,fontWeight:600,flexShrink:0,marginRight:'4px'}}>{badge.label}</span>
                    })()}
                    {ev.vehiculos?.valor_asegurado > 0 && (
                      <p style={{fontSize:'14px',fontWeight:700,color:'#C4A96B',margin:'0 8px 0 0',flexShrink:0}}>Q {parseFloat(ev.vehiculos.valor_asegurado).toLocaleString()}</p>
                    )}
                    <ChevronRight size={16} color='#94a3b8'/>
                  </div>
                )
              })
            ))
           )}
        </div>
      )}

      {/* ─ TAB: Gestiones ─ */}
      {activeTab === 'emisiones' && isEmitida && (() => {
        // Vehicles available for new inclusion:
        // - client vehicles not already in any emission of this policy
        // - AND not assigned to a DIFFERENT policy
        const vehiculosEnEmisiones = new Set(
          emisiones
            .filter(em => em.estado !== 'cancelada')
            .flatMap(em => em.emision_vehiculos?.map(ev=>ev.vehiculos?.id)||[])
        )
        const vehiculosParaInclusion = allClientVehiculos.filter(v =>
          !vehiculosEnEmisiones.has(v.id) &&
          (!v.poliza_id || v.poliza_id === poliza.id)
        )
        return (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid #f1f5f9'}}>
            <h3 style={{fontSize:'15px',fontWeight:600,color:'#111111',margin:0}}>Gestiones</h3>
            <button onClick={()=>{ setTipoGestion(null); setShowNuevaGestionModal(true) }}
              style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 14px',background:'#111111',color:'white',border:'none',borderRadius:'6px',fontSize:'13px',cursor:'pointer',fontWeight:600}}>
              <Plus size={13}/> Nueva gestión
            </button>
          </div>


          {/* List of ALL gestiones */}
          {loading ? <p style={{padding:'20px',color:'#64748b'}}>Cargando...</p> :
           emisiones.length===0 ? (
             <p style={{padding:'24px',color:'#94a3b8',textAlign:'center'}}>Sin gestiones registradas.</p>
           ) :
           emisiones.map(em=>{
            const eEst = polizaEstados[em.estado] || { bg:'#f1f5f9', color:'#64748b', label: em.estado }
            const tipoLabel = { emision:'Emisión principal', inclusion:'Inclusión', exclusion:'Exclusión', renovacion:'Renovación' }[em.tipo] || em.tipo
            const isPrincipal = em.tipo === 'emision'
            const isLocked = em.estado === 'enviada' || em.estado === 'emitida' || em.estado === 'completado'
            return (
              <div key={em.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                {/* Row */}
                <div style={{display:'flex',alignItems:'center',padding:'14px 20px',cursor:'pointer',gap:'10px',background: isPrincipal ? '#fafbff' : 'white'}} onClick={()=>setExpandedEmision(expandedEmision===em.id?null:em.id)}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                      <p style={{fontWeight:700,color:'#111111',fontSize:'13px',margin:0}}>{em.numero_emision}</p>
                      <span style={{fontSize:'11px',padding:'2px 7px',borderRadius:'20px',fontWeight:600,
                        background: isPrincipal ? '#111111' : (em.tipo==='exclusion' ? '#fef2f2' : '#eff6ff'),
                        color: isPrincipal ? 'white' : (em.tipo==='exclusion' ? '#ef4444' : '#1d4ed8')}}>
                        {tipoLabel}
                      </span>
                      <span style={{fontSize:'11px',padding:'2px 7px',borderRadius:'20px',fontWeight:600,background:eEst.bg,color:eEst.color}}>{eEst.label}</span>
                    </div>
                    <p style={{fontSize:'12px',color:'#64748b',margin:'2px 0 0'}}>
                      {em.tipo === 'exclusion'
                        ? `Fecha exclusión: ${em.fecha_inicio ? new Date(em.fecha_inicio).toLocaleDateString('es-GT') : '—'}`
                        : `${em.fecha_inicio ? new Date(em.fecha_inicio).toLocaleDateString('es-GT') : '—'} → ${em.fecha_fin ? new Date(em.fecha_fin).toLocaleDateString('es-GT') : '—'}`
                      } · {em.emision_vehiculos?.length||0} vehículos
                    </p>
                  </div>
                  <p style={{fontSize:'14px',fontWeight:700,color:'#C4A96B',margin:0,flexShrink:0}}>Q {parseFloat(em.prima_emision||0).toLocaleString()}</p>

                  {/* Action buttons (stop propagation) — not shown on principal emission */}
                  {!isPrincipal && (
                    <div style={{display:'flex',gap:'6px',flexShrink:0}} onClick={e=>e.stopPropagation()}>
                      {/* Edit button — only for editable states */}
                      {(em.estado === 'solicitud' || em.estado === 'en_reproceso') && (
                        <button onClick={()=>editarEmision(em)}
                          title="Editar gestión"
                          style={{display:'flex',alignItems:'center',justifyContent:'center',width:'28px',height:'28px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'6px',cursor:'pointer',flexShrink:0}}>
                          <Edit2 size={12}/>
                        </button>
                      )}
                      {/* PDF button for solicitud / enviada / en_reproceso */}
                      {(em.estado === 'solicitud' || em.estado === 'enviada' || em.estado === 'en_reproceso') && (
                        <button onClick={()=>handleGestionPdf(em)}
                          title="Descargar PDF de esta gestión"
                          style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',background:'white',color:'#374151',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'11px',fontWeight:500,cursor:'pointer',whiteSpace:'nowrap'}}>
                          <Download size={11}/> PDF
                        </button>
                      )}
                      {/* Cambiar estado button */}
                      {(em.estado === 'solicitud' || em.estado === 'enviada' || em.estado === 'en_reproceso') && (
                        <button onClick={()=>{ setEmisionForModal(em); setGestionEstadoOpcion(null); setShowGestionEstadoModal(true) }}
                          style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',background:'#111111',color:'white',border:'none',borderRadius:'6px',fontSize:'11px',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
                          <RefreshCw size={10}/> Estado
                        </button>
                      )}
                    </div>
                  )}
                  {expandedEmision===em.id ? <ChevronUp size={16} color="#64748b"/> : <ChevronDown size={16} color="#64748b"/>}
                </div>

                {/* Expanded detail */}
                {expandedEmision===em.id && (
                  <div style={{padding:'12px 20px 16px',background:'#f8fafc',borderTop:'1px solid #f1f5f9'}}>
                    {/* PDF row — download only (upload happens when marking as emitida) */}
                    {em.pdf_url && (
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                        <p style={{fontSize:'12px',fontWeight:600,color:'#374151',margin:0}}>PDF de la aseguradora</p>
                        <a href={em.pdf_url} target="_blank" rel="noopener noreferrer"
                          style={{display:'flex',alignItems:'center',gap:'5px',padding:'4px 10px',background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe',borderRadius:'6px',fontSize:'11px',fontWeight:600,textDecoration:'none'}}>
                          <Download size={11}/> Descargar PDF
                        </a>
                      </div>
                    )}

                    {/* Vehicles */}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                      <p style={{fontSize:'12px',fontWeight:600,color:'#374151',margin:0}}>Vehículos</p>
                      {isLocked ? (
                        <span style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',color:'#94a3b8'}}>
                          <Lock size={11}/> Bloqueado ({eEst.label})
                        </span>
                      ) : (
                        <button onClick={()=>setShowAsignarVehiculo(showAsignarVehiculo===em.id?null:em.id)}
                          style={{fontSize:'11px',padding:'3px 10px',background:'#111111',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontWeight:500}}>
                          + Agregar
                        </button>
                      )}
                    </div>
                    {em.emision_vehiculos?.length===0 && <p style={{fontSize:'13px',color:'#94a3b8',marginBottom:'8px'}}>Sin vehículos asignados</p>}
                    {em.emision_vehiculos?.map(ev=>(
                      <div key={ev.id} style={{display:'flex',gap:'8px',padding:'8px 10px',background:'white',borderRadius:'6px',border:'1px solid #f1f5f9',marginBottom:'4px',fontSize:'13px',alignItems:'center',cursor:'pointer'}}
                        onClick={()=>navigate('/vehiculos',{state:{openVehiculoId:ev.vehiculos?.id,fromPolizaId:poliza.id}})}>
                        <Car size={14} color="#C4A96B"/>
                        <span style={{fontWeight:500,flex:1}}>{ev.vehiculos?.marca} {ev.vehiculos?.modelo} {ev.vehiculos?.anio}</span>
                        <span style={{color:'#64748b'}}>Placa: {fp(ev.vehiculos)}</span>
                        {!isLocked && (
                          <button onClick={e=>{e.stopPropagation();quitarVehiculo(ev.vehiculos?.id, ev.id, em.id)}}
                            style={{padding:'2px 8px',background:'#fef2f2',color:'#ef4444',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'11px'}}>Quitar</button>
                        )}
                      </div>
                    ))}
                    {!isLocked && showAsignarVehiculo===em.id && (
                      <div style={{marginTop:'8px',padding:'10px',background:'white',borderRadius:'8px',border:'1px solid #e2e8f0'}}>
                        <input value={vehiculoSearch} onChange={e=>setVehiculoSearch(e.target.value)} placeholder="Buscar vehículo..."
                          style={{width:'100%',padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'12px',marginBottom:'8px',background:'white',color:'#1e293b',boxSizing:'border-box'}}/>
                        {vehiculosParaInclusion.filter(v=>(v.marca+' '+v.modelo+' '+fp(v)).toLowerCase().includes(vehiculoSearch.toLowerCase())).length===0
                          ? <p style={{fontSize:'12px',color:'#94a3b8',textAlign:'center',padding:'8px'}}>No hay vehículos disponibles</p>
                          : vehiculosParaInclusion.filter(v=>(v.marca+' '+v.modelo+' '+fp(v)).toLowerCase().includes(vehiculoSearch.toLowerCase())).map(v=>(
                          <div key={v.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'6px',border:'1px solid #f1f5f9',marginBottom:'4px',background:'#f8fafc'}}>
                            <Car size={13} color="#C4A96B"/>
                            <span style={{flex:1,fontSize:'12px',fontWeight:500}}>{v.marca} {v.modelo} {v.anio} — {fp(v)}</span>
                            <button onClick={()=>asignarVehiculo(v.id, em.id)}
                              style={{padding:'3px 10px',background:'#111111',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'11px',fontWeight:500}}>Asignar</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        )
      })()}


      {/* ─ TAB: Pagos ─ */}
      {activeTab === 'pagos' && isEmitida && (
        <div>
          {/* Req modal */}
          {showReqModal && (
            <>
              <div onClick={()=>{ setShowReqModal(false); setEditingReq(null); setReqForm(emptyReq) }}
                style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300}}/>
              <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
                background:'white',borderRadius:'16px',padding:'28px',width:'90%',maxWidth:'480px',
                zIndex:301,boxShadow:'0 20px 60px rgba(0,0,0,0.25)',maxHeight:'90vh',overflowY:'auto'}}>
                {/* Header */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
                  <div>
                    <h2 style={{fontSize:'17px',fontWeight:700,color:'#111111',margin:0}}>
                      {editingReq ? 'Editar requerimiento' : 'Nuevo requerimiento de pago'}
                    </h2>
                    <p style={{fontSize:'12px',color:'#64748b',margin:'3px 0 0'}}>Póliza: {poliza.numero_poliza}</p>
                  </div>
                  <button onClick={()=>{ setShowReqModal(false); setEditingReq(null); setReqForm(emptyReq) }}
                    style={{background:'none',border:'none',cursor:'pointer',padding:'4px',color:'#94a3b8'}}>
                    <X size={18}/>
                  </button>
                </div>

                <form onSubmit={handleReqSubmit}>
                  <div style={{display:'flex',flexDirection:'column',gap:'14px',marginBottom:'20px'}}>
                    {/* Emisión selector — only on create */}
                    {!editingReq && (
                      <div>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                          Emisión *
                        </label>
                        <select required value={reqForm.emision_id}
                          onChange={e=>setReqForm({...reqForm,emision_id:e.target.value})}
                          style={{...inputStyle,background:'white'}}>
                          <option value=''>— Seleccionar emisión —</option>
                          {emisiones.filter(em=>em.estado!=='cancelada').map(em=>{
                            const tipoLabel = {emision:'Emisión principal',inclusion:'Inclusión',exclusion:'Exclusión',renovacion:'Renovación'}[em.tipo]||em.tipo
                            const estLabel = polizaEstados[em.estado]?.label||em.estado
                            return <option key={em.id} value={em.id}>{em.numero_emision} · {tipoLabel} · {estLabel}</option>
                          })}
                        </select>
                      </div>
                    )}

                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                      <div>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                          Monto por cuota (Q) *
                        </label>
                        <input type='number' step='0.01' min='0.01' required
                          value={reqForm.monto}
                          onChange={e=>setReqForm({...reqForm,monto:e.target.value})}
                          placeholder='0.00' style={inputStyle}/>
                      </div>
                      {!editingReq && (
                        <div>
                          <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                            Cantidad de cuotas *
                          </label>
                          <input type='number' min='1' max='60' required
                            value={reqForm.total_cuotas}
                            onChange={e=>setReqForm({...reqForm,total_cuotas:e.target.value})}
                            style={inputStyle}/>
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                        {editingReq ? 'Fecha de vencimiento *' : 'Fecha primer vencimiento *'}
                      </label>
                      <input type='date' required
                        value={reqForm.fecha_vencimiento}
                        onChange={e=>setReqForm({...reqForm,fecha_vencimiento:e.target.value})}
                        style={inputStyle}/>
                    </div>

                    {!editingReq && reqForm.monto && reqForm.total_cuotas > 0 && (
                      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'8px',padding:'10px 14px'}}>
                        <p style={{fontSize:'12px',color:'#15803d',margin:0,fontWeight:500}}>
                          Se generarán <strong>{reqForm.total_cuotas}</strong> cuota(s) de <strong>Q {parseFloat(reqForm.monto||0).toLocaleString()}</strong> cada una
                          &nbsp;·&nbsp; Total: <strong>Q {(parseFloat(reqForm.monto||0)*parseInt(reqForm.total_cuotas||0)).toLocaleString()}</strong>
                        </p>
                      </div>
                    )}
                  </div>

                  <div style={{display:'flex',gap:'8px'}}>
                    <button type='submit'
                      style={{flex:1,padding:'11px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
                      {editingReq ? 'Guardar cambios' : 'Generar requerimientos'}
                    </button>
                    <button type='button' onClick={()=>{ setShowReqModal(false); setEditingReq(null); setReqForm(emptyReq) }}
                      style={{padding:'11px 20px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'12px',marginBottom:'16px'}}>
            {[['Pagado','Q '+totalPagado.toLocaleString(),'#22c55e'],['Pendiente','Q '+totalPendiente.toLocaleString(),'#f59e0b'],['Total reqs',reqs.length,'#C4A96B']].map(([label,val,color])=>(
              <div key={label} style={{background:'white',borderRadius:'10px',padding:'14px',border:'1px solid #e2e8f0',borderLeft:`4px solid ${color}`}}>
                <p style={{fontSize:'12px',color:'#64748b',margin:0}}>{label}</p>
                <p style={{fontSize:'16px',fontWeight:700,color,margin:'4px 0 0'}}>{val}</p>
              </div>
            ))}
          </div>

          <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid #f1f5f9'}}>
              <h3 style={{fontSize:'15px',fontWeight:600,color:'#111111',margin:0}}>Requerimientos de pago</h3>
              <button onClick={()=>{ setReqForm(emptyReq); setEditingReq(null); setShowReqModal(true) }}
                style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 14px',background:'#111111',color:'white',border:'none',borderRadius:'6px',fontSize:'13px',cursor:'pointer',fontWeight:600}}>
                <Plus size={13}/> Nuevo req.
              </button>
            </div>

            {reqs.length===0
              ? <p style={{padding:'24px',color:'#94a3b8',textAlign:'center'}}>Sin requerimientos</p>
              : reqs.map((r,i)=>{
                  const estColor = r.estado==='pagado' ? {bg:'#dcfce7',color:'#15803d'} : r.estado==='vencido' ? {bg:'#fef2f2',color:'#ef4444'} : {bg:'#fef9c3',color:'#a16207'}
                  const emNumero = r.emisiones?.numero_emision
                  return (
                    <div key={r.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 20px',borderBottom:i<reqs.length-1?'1px solid #f1f5f9':'none'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                          <p style={{fontWeight:600,color:'#111111',fontSize:'13px',margin:0}}>{r.codigo}</p>
                          <span style={{fontSize:'11px',color:'#64748b'}}>· cuota {r.numero_cuota}/{r.total_cuotas}</span>
                          {emNumero && <span style={{fontSize:'11px',padding:'1px 7px',borderRadius:'20px',background:'#ede9fe',color:'#7c3aed',fontWeight:500}}>{emNumero}</span>}
                        </div>
                        <p style={{fontSize:'12px',color:'#64748b',margin:'2px 0 0'}}>
                          Vence: {new Date(r.fecha_vencimiento+'T12:00:00').toLocaleDateString('es-GT')}
                          {r.fecha_pago && ` · Pagado: ${new Date(r.fecha_pago).toLocaleDateString('es-GT')}`}
                        </p>
                      </div>
                      <p style={{fontSize:'14px',fontWeight:700,color:'#1e293b',margin:0,flexShrink:0}}>Q {parseFloat(r.monto||0).toLocaleString()}</p>
                      <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',flexShrink:0,
                        background:estColor.bg,color:estColor.color,fontWeight:500,textTransform:'capitalize'}}>
                        {r.estado}
                      </span>
                      {r.estado!=='pagado' && (
                        <>
                          <button onClick={()=>marcarPagado(r.id)}
                            style={{padding:'5px 10px',background:'#dcfce7',color:'#15803d',border:'none',borderRadius:'6px',fontSize:'12px',fontWeight:500,cursor:'pointer',flexShrink:0}}>
                            Marcar pagado
                          </button>
                          <button onClick={()=>{ setEditingReq(r); setReqForm({monto:r.monto,fecha_vencimiento:r.fecha_vencimiento,total_cuotas:1,emision_id:r.emision_id||''}); setShowReqModal(true) }}
                            style={{padding:'5px',background:'none',border:'none',cursor:'pointer',color:'#64748b',flexShrink:0}}>
                            <Edit2 size={13}/>
                          </button>
                          <button onClick={()=>eliminarReq(r.id)}
                            style={{padding:'5px',background:'none',border:'none',cursor:'pointer',flexShrink:0}}>
                            <Trash2 size={13} color='#ef4444'/>
                          </button>
                        </>
                      )}
                    </div>
                  )
                })
            }
          </div>
        </div>
      )}

      {/* ─ TAB: Tareas ─ */}
      {activeTab === 'tareas' && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9'}}>
            <h3 style={{fontSize:'15px',fontWeight:600,color:'#111111',margin:0}}>Tareas pendientes</h3>
          </div>
          {tareas.length===0 ? <p style={{padding:'24px',color:'#94a3b8',textAlign:'center'}}>Sin tareas pendientes</p> :
           tareas.map((t,i)=>(
            <div key={t.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 20px',borderBottom:i<tareas.length-1?'1px solid #f1f5f9':'none'}}>
              <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:t.tipo==='automatica'?'#dbeafe':'#f0fdf4',color:t.tipo==='automatica'?'#1d4ed8':'#15803d',flexShrink:0}}>{t.tipo}</span>
              <p style={{flex:1,fontSize:'13px',color:'#1e293b',margin:0}}>{t.titulo}</p>
              {t.fecha_vencimiento && <p style={{fontSize:'12px',color:new Date(t.fecha_vencimiento)<new Date()?'#ef4444':'#64748b',flexShrink:0,margin:0}}>{new Date(t.fecha_vencimiento).toLocaleDateString('es-GT')}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ─ Modal: Nueva gestión ─ */}
      {showNuevaGestionModal && (
        <>
          <div onClick={()=>setShowNuevaGestionModal(false)}
            style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300}}/>
          <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
            background:'white',borderRadius:'16px',padding:'28px',width:'90%',maxWidth:'460px',
            zIndex:301,boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}>

            <div style={{marginBottom:'20px'}}>
              <p style={{fontSize:'12px',fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 4px'}}>Gestiones</p>
              <h2 style={{fontSize:'18px',fontWeight:700,color:'#111111',margin:'0 0 4px'}}>¿Qué tipo de gestión deseas realizar?</h2>
              <p style={{fontSize:'13px',color:'#6B6B62',margin:0}}>
                Póliza: <span style={{fontWeight:600,color:'#111111'}}>{poliza.numero_poliza}</span>
              </p>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'24px'}}>

              {/* Renovación */}
              <div onClick={()=>setTipoGestion(tipoGestion==='renovacion'?null:'renovacion')}
                style={{border:`2px solid ${tipoGestion==='renovacion'?'#C4A96B':'#e2e8f0'}`,borderRadius:'12px',
                  padding:'14px 16px',cursor:'pointer',background:tipoGestion==='renovacion'?'#FDF8EE':'white',transition:'all 0.15s'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                  <div style={{width:'28px',height:'28px',borderRadius:'50%',flexShrink:0,
                    background:tipoGestion==='renovacion'?'#C4A96B':'#f1f5f9',
                    display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <RefreshCw size={13} color={tipoGestion==='renovacion'?'white':'#94a3b8'}/>
                  </div>
                  <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Renovación</p>
                </div>
                <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 38px'}}>
                  Crear una nueva solicitud de póliza para el siguiente periodo de vigencia.
                </p>
              </div>

              {/* Inclusión */}
              <div onClick={()=>setTipoGestion(tipoGestion==='inclusion'?null:'inclusion')}
                style={{border:`2px solid ${tipoGestion==='inclusion'?'#1d4ed8':'#e2e8f0'}`,borderRadius:'12px',
                  padding:'14px 16px',cursor:'pointer',background:tipoGestion==='inclusion'?'#eff6ff':'white',transition:'all 0.15s'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                  <div style={{width:'28px',height:'28px',borderRadius:'50%',flexShrink:0,
                    background:tipoGestion==='inclusion'?'#1d4ed8':'#f1f5f9',
                    display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Plus size={13} color={tipoGestion==='inclusion'?'white':'#94a3b8'}/>
                  </div>
                  <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Inclusión</p>
                </div>
                <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 38px'}}>
                  Agregar uno o más vehículos del cliente a la póliza activa.
                </p>
              </div>

              {/* Exclusión */}
              <div onClick={()=>setTipoGestion(tipoGestion==='exclusion'?null:'exclusion')}
                style={{border:`2px solid ${tipoGestion==='exclusion'?'#dc2626':'#e2e8f0'}`,borderRadius:'12px',
                  padding:'14px 16px',cursor:'pointer',background:tipoGestion==='exclusion'?'#fef2f2':'white',transition:'all 0.15s'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                  <div style={{width:'28px',height:'28px',borderRadius:'50%',flexShrink:0,
                    background:tipoGestion==='exclusion'?'#dc2626':'#f1f5f9',
                    display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Minus size={13} color={tipoGestion==='exclusion'?'white':'#94a3b8'}/>
                  </div>
                  <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Exclusión</p>
                </div>
                <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 38px'}}>
                  Remover uno o más vehículos de la póliza activa.
                </p>
              </div>

            </div>

            <div style={{display:'flex',gap:'10px'}}>
              <button
                disabled={!tipoGestion}
                onClick={async()=>{
                  setShowNuevaGestionModal(false)
                  if (tipoGestion === 'renovacion') {
                    await renovarPoliza()
                  } else {
                    abrirFormEmision(tipoGestion)
                  }
                  setTipoGestion(null)
                }}
                style={{flex:1,padding:'11px',border:'none',borderRadius:'9px',fontSize:'14px',fontWeight:700,
                  cursor: tipoGestion ? 'pointer' : 'not-allowed', transition:'all 0.15s',
                  background: !tipoGestion ? '#e2e8f0'
                    : tipoGestion==='renovacion' ? '#C4A96B'
                    : tipoGestion==='inclusion' ? '#1d4ed8'
                    : '#dc2626',
                  color: !tipoGestion ? '#94a3b8' : 'white'}}>
                {!tipoGestion ? 'Selecciona un tipo'
                  : tipoGestion==='renovacion' ? 'Crear renovación →'
                  : tipoGestion==='inclusion' ? 'Continuar con inclusión →'
                  : 'Continuar con exclusión →'}
              </button>
              <button onClick={()=>{ setShowNuevaGestionModal(false); setTipoGestion(null) }}
                style={{padding:'11px 20px',background:'white',color:'#64748b',
                  border:'1px solid #e2e8f0',borderRadius:'9px',fontSize:'14px',cursor:'pointer'}}>
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─ Modal: Nueva / Editar gestión ─ */}
      {showEmisionModal && (() => {
        const isExclusion = emisionForm.tipo === 'exclusion'
        const isEdit = !!editingEmision
        const formTitle = isEdit
          ? (isExclusion ? 'Editar exclusión' : 'Editar inclusión')
          : (isExclusion ? 'Nueva exclusión' : 'Nueva inclusión')
        const submitLabel = isEdit
          ? 'Guardar cambios'
          : (isExclusion ? 'Crear exclusión' : 'Crear inclusión')
        // Vehicle lists for the modal
        const vehiculosEnEmisionesSet = new Set(
          emisiones
            .filter(em => em.estado !== 'cancelada')
            .flatMap(em => em.emision_vehiculos?.map(ev => ev.vehiculos?.id) || [])
        )
        const vehiculosParaInclusionModal = allClientVehiculos.filter(v =>
          !vehiculosEnEmisionesSet.has(v.id) && (!v.poliza_id || v.poliza_id === poliza.id)
        )
        // Vehicles already excluded (in a non-cancelled exclusion) — not available to exclude again
        const vehiculosYaExcluidosSet = new Set(
          emisiones
            .filter(em => em.tipo === 'exclusion' && em.estado !== 'cancelada')
            .flatMap(em => em.emision_vehiculos?.map(ev => ev.vehiculos?.id) || [])
        )
        // Active vehicles = in a non-cancelled inclusion/emision, not yet excluded
        const vehiculosEnPolizaModal = emisiones
          .filter(em => em.tipo !== 'exclusion' && em.estado !== 'cancelada')
          .flatMap(em =>
            (em.emision_vehiculos || []).map(ev => ({
              ...ev.vehiculos, evId: ev.id, emisionNumero: em.numero_emision, emisionEstado: em.estado
            }))
          )
          .filter(v => v?.id && !vehiculosYaExcluidosSet.has(v.id))
        return (
          <>
            <div onClick={()=>{ setShowEmisionModal(false); setEditingEmision(null); setEmisionForm(emptyEmision) }}
              style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300}}/>
            <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
              background:'white',borderRadius:'16px',padding:'28px',width:'90%',maxWidth:'520px',
              zIndex:301,boxShadow:'0 20px 60px rgba(0,0,0,0.25)',maxHeight:'90vh',overflowY:'auto'}}>

              {/* Header */}
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'20px'}}>
                <div style={{width:'32px',height:'32px',borderRadius:'50%',flexShrink:0,
                  background:isExclusion?'#fef2f2':'#eff6ff',
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {isExclusion ? <Minus size={15} color='#ef4444'/> : <Plus size={15} color='#1d4ed8'/>}
                </div>
                <div>
                  <h2 style={{fontSize:'17px',fontWeight:700,color:'#111111',margin:0}}>{formTitle}</h2>
                  <p style={{fontSize:'12px',color:'#6B6B62',margin:0}}>Póliza: <span style={{fontWeight:600,color:'#111111'}}>{poliza.numero_poliza}</span></p>
                </div>
                <button onClick={()=>{ setShowEmisionModal(false); setEditingEmision(null); setEmisionForm(emptyEmision) }}
                  style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',padding:'4px',color:'#94a3b8'}}>
                  <X size={18}/>
                </button>
              </div>

              <form onSubmit={handleEmisionSubmit}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'14px',marginBottom:'16px'}}>

                  {/* Prima */}
                  <div>
                    <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                      Prima {isExclusion?'de exclusión':'de inclusión'} (Q) *
                    </label>
                    <input type="number" step="0.01" value={emisionForm.prima_emision}
                      onChange={e=>setEmisionForm({...emisionForm,prima_emision:e.target.value})}
                      required style={inputStyle} placeholder="0.00"/>
                  </div>

                  {/* Fecha */}
                  {isExclusion ? (
                    <div>
                      <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>Fecha de exclusión *</label>
                      <input type="date" value={emisionForm.fecha_inicio}
                        onChange={e=>setEmisionForm({...emisionForm,fecha_inicio:e.target.value})}
                        required style={inputStyle}/>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>Fecha de inicio *</label>
                        <input type="date" value={emisionForm.fecha_inicio}
                          onChange={e=>setEmisionForm({...emisionForm,fecha_inicio:e.target.value})}
                          required style={inputStyle}/>
                      </div>
                      <div style={{gridColumn:'1/-1'}}>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>Fecha fin</label>
                        <div style={{padding:'9px 12px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'13px',color:'#374151'}}>
                          {poliza.fecha_vencimiento ? new Date(poliza.fecha_vencimiento).toLocaleDateString('es-GT') : '—'}
                          <span style={{fontSize:'11px',color:'#94a3b8',marginLeft:'6px'}}>(fecha venc. póliza)</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Persona facturable */}
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                      Responsable de pago <span style={{fontWeight:400,color:'#94a3b8'}}>(si es distinto al cliente)</span>
                    </label>
                    {personasFacturablesEmision.length === 0 ? (
                      <div style={{padding:'9px 12px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'13px',color:'#94a3b8'}}>
                        Sin personas facturables registradas para este cliente
                      </div>
                    ) : (
                      <select value={emisionForm.persona_facturable_id}
                        onChange={e=>setEmisionForm({...emisionForm,persona_facturable_id:e.target.value})}
                        style={inputStyle}>
                        <option value="">— Mismo cliente —</option>
                        {personasFacturablesEmision.map(pf=>(
                          <option key={pf.id} value={pf.id}>
                            {[pf.nombre,pf.apellido].filter(Boolean).join(' ')}{pf.nit?` · NIT ${pf.nit}`:''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Tipo de pago — solo inclusión */}
                  {!isExclusion && (
                    <>
                      <div>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>Tipo de pago *</label>
                        <div style={{display:'flex',gap:'8px'}}>
                          {[['contado','Contado'],['financiado','Financiado']].map(([val,lbl])=>(
                            <button key={val} type="button"
                              onClick={()=>setEmisionForm({...emisionForm,tipo_pago:val,numero_cuotas:val==='contado'?1:emisionForm.numero_cuotas})}
                              style={{flex:1,padding:'8px 10px',border:`1.5px solid ${emisionForm.tipo_pago===val?'#111111':'#e2e8f0'}`,
                                borderRadius:'6px',fontSize:'13px',fontWeight:600,cursor:'pointer',
                                background:emisionForm.tipo_pago===val?'#111111':'white',
                                color:emisionForm.tipo_pago===val?'white':'#374151'}}>
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                          Número de cuotas <span style={{fontWeight:400,color:'#94a3b8'}}>(pagos mensuales)</span>
                        </label>
                        <input
                          type="number" min="1" max="36"
                          value={emisionForm.numero_cuotas}
                          onChange={e=>setEmisionForm({...emisionForm,numero_cuotas:parseInt(e.target.value)||1})}
                          disabled={emisionForm.tipo_pago==='contado'}
                          style={{...inputStyle,background:emisionForm.tipo_pago==='contado'?'#f1f5f9':'white',color:emisionForm.tipo_pago==='contado'?'#94a3b8':'#1e293b'}}
                        />
                        {emisionForm.tipo_pago==='contado' && (
                          <p style={{fontSize:'12px',color:'#94a3b8',margin:'4px 0 0'}}>Contado = 1 pago</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Notas */}
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>Notas</label>
                    <input value={emisionForm.notas}
                      onChange={e=>setEmisionForm({...emisionForm,notas:e.target.value})}
                      style={inputStyle}
                      placeholder={`Descripción de la ${isExclusion?'exclusión':'inclusión'}`}/>
                  </div>
                </div>

                {/* Vehicle selection — only in create mode */}
                {!isEdit && (
                  <div style={{marginBottom:'16px',padding:'14px',background:'#f8fafc',borderRadius:'10px',border:'1px solid #e2e8f0'}}>
                    {isExclusion ? (
                      <>
                        <p style={{fontSize:'13px',fontWeight:600,color:'#ef4444',margin:'0 0 10px'}}>
                          Vehículos a excluir * <span style={{fontWeight:400,color:'#94a3b8'}}>(activos en la póliza)</span>
                        </p>
                        {vehiculosEnPolizaModal.length === 0 ? (
                          <p style={{fontSize:'13px',color:'#94a3b8',margin:0}}>Sin vehículos en la póliza</p>
                        ) : (
                          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                            {vehiculosEnPolizaModal.map(v => {
                              const sel = exclusionVehiculosSelected.includes(v.id)
                              const eEst = polizaEstados[v.emisionEstado] || { bg:'#f1f5f9', color:'#64748b', label: v.emisionEstado }
                              return (
                                <div key={v.id}
                                  onClick={()=>setExclusionVehiculosSelected(prev=>sel?prev.filter(x=>x!==v.id):[...prev,v.id])}
                                  style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',
                                    background:sel?'#fef2f2':'white',border:`1px solid ${sel?'#ef4444':'#e2e8f0'}`,borderRadius:'8px',cursor:'pointer'}}>
                                  <div style={{width:'18px',height:'18px',borderRadius:'4px',border:`2px solid ${sel?'#ef4444':'#cbd5e1'}`,
                                    background:sel?'#ef4444':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                    {sel && <CheckCircle size={12} color="white"/>}
                                  </div>
                                  <Car size={14} color={sel?'#ef4444':'#64748b'}/>
                                  <span style={{flex:1,fontSize:'13px',fontWeight:500,color:sel?'#ef4444':'#374151'}}>{v.marca} {v.modelo} {v.anio}</span>
                                  <span style={{fontSize:'12px',color:'#64748b'}}>Placa: {fp(v)}</span>
                                  <span style={{fontSize:'11px',padding:'2px 7px',borderRadius:'20px',background:eEst.bg,color:eEst.color,fontWeight:600,flexShrink:0}}>{v.emisionNumero}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p style={{fontSize:'13px',fontWeight:600,color:'#374151',margin:'0 0 10px'}}>
                          Vehículos a incluir <span style={{fontWeight:400,color:'#94a3b8'}}>(del cliente, sin asignar)</span>
                        </p>
                        {vehiculosParaInclusionModal.length === 0 ? (
                          <p style={{fontSize:'13px',color:'#94a3b8',margin:0}}>Sin vehículos disponibles para incluir</p>
                        ) : (
                          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                            {vehiculosParaInclusionModal.map(v => {
                              const sel = inclusionVehiculosSelected.includes(v.id)
                              return (
                                <div key={v.id}
                                  onClick={()=>setInclusionVehiculosSelected(prev=>sel?prev.filter(x=>x!==v.id):[...prev,v.id])}
                                  style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',
                                    background:sel?'#eff6ff':'white',border:`1px solid ${sel?'#3b82f6':'#e2e8f0'}`,borderRadius:'8px',cursor:'pointer'}}>
                                  <div style={{width:'18px',height:'18px',borderRadius:'4px',border:`2px solid ${sel?'#3b82f6':'#cbd5e1'}`,
                                    background:sel?'#3b82f6':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                    {sel && <CheckCircle size={12} color="white"/>}
                                  </div>
                                  <Car size={14} color={sel?'#1d4ed8':'#64748b'}/>
                                  <span style={{flex:1,fontSize:'13px',fontWeight:500,color:sel?'#1d4ed8':'#374151'}}>{v.marca} {v.modelo} {v.anio}</span>
                                  <span style={{fontSize:'12px',color:'#64748b'}}>Placa: {fp(v)}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Edit mode hint */}
                {isEdit && (
                  <div style={{background:'#eff6ff',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',display:'flex',gap:'8px',alignItems:'flex-start'}}>
                    <AlertCircle size={14} color='#1d4ed8' style={{flexShrink:0,marginTop:'1px'}}/>
                    <p style={{fontSize:'12px',color:'#1d4ed8',margin:0}}>
                      Para agregar o quitar vehículos de esta gestión, usa el panel expandido en la lista de gestiones.
                    </p>
                  </div>
                )}

                <div style={{display:'flex',gap:'10px'}}>
                  <button type="submit"
                    style={{flex:1,padding:'11px',background:isExclusion&&!isEdit?'#dc2626':'#111111',color:'white',
                      border:'none',borderRadius:'9px',fontSize:'14px',fontWeight:700,cursor:'pointer'}}>
                    {submitLabel}
                  </button>
                  <button type="button"
                    onClick={()=>{ setShowEmisionModal(false); setEditingEmision(null); setEmisionForm(emptyEmision) }}
                    style={{padding:'11px 20px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'9px',fontSize:'14px',cursor:'pointer'}}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </>
        )
      })()}

      {/* ─ Modal: Cambiar estado gestión ─ */}
      {showGestionEstadoModal && emisionForModal && (() => {
        const em = emisionForModal
        const eEst = polizaEstados[em.estado] || { bg:'#f1f5f9', color:'#64748b', label: em.estado }
        const isExcl = em.tipo === 'exclusion'
        const tipoLabel = isExcl ? 'Exclusión' : 'Inclusión'
        return (
          <>
            <div onClick={()=>setShowGestionEstadoModal(false)}
              style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300}}/>
            <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
              background:'white',borderRadius:'16px',padding:'28px',width:'90%',maxWidth:'460px',
              zIndex:301,boxShadow:'0 20px 60px rgba(0,0,0,0.25)',maxHeight:'90vh',overflowY:'auto'}}>

              {/* Header */}
              <div style={{marginBottom:'20px'}}>
                <p style={{fontSize:'12px',fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 4px'}}>
                  Cambiar estado · {tipoLabel}
                </p>
                <h2 style={{fontSize:'17px',fontWeight:700,color:'#111111',margin:'0 0 4px'}}>
                  {em.estado === 'solicitud' ? `¿Listo para enviar ${tipoLabel.toLowerCase()}?`
                    : em.estado === 'enviada' ? `¿Qué ocurrió con la ${tipoLabel.toLowerCase()}?`
                    : `¿Listo para re-enviar ${tipoLabel.toLowerCase()}?`}
                </h2>
                <p style={{fontSize:'13px',color:'#6B6B62',margin:0}}>
                  {em.numero_emision} · Estado actual: <span style={{fontWeight:600,color:eEst.color}}>{eEst.label}</span>
                </p>
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'20px'}}>

                {/* solicitud → enviada */}
                {em.estado === 'solicitud' && (
                  <div onClick={()=>setGestionEstadoOpcion('enviar')}
                    style={{border:`2px solid ${gestionEstadoOpcion==='enviar'?'#111111':'#e2e8f0'}`,borderRadius:'12px',
                      padding:'14px 16px',cursor:'pointer',background:gestionEstadoOpcion==='enviar'?'#f8fafc':'white',transition:'all 0.15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                      <div style={{width:'26px',height:'26px',borderRadius:'50%',flexShrink:0,
                        background:gestionEstadoOpcion==='enviar'?'#111111':'#f1f5f9',
                        display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <SendHorizonal size={12} color={gestionEstadoOpcion==='enviar'?'white':'#94a3b8'}/>
                      </div>
                      <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Marcar como enviada</p>
                    </div>
                    <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 36px'}}>
                      El PDF fue generado y enviado a la aseguradora.
                    </p>
                  </div>
                )}

                {/* enviada → emitida / completado */}
                {em.estado === 'enviada' && (
                  <div onClick={()=>{ setGestionEstadoOpcion(isExcl ? 'completar' : 'emitir'); if(!isExcl) setEmisionPdfFile(null) }}
                    style={{border:`2px solid ${(gestionEstadoOpcion==='emitir'||gestionEstadoOpcion==='completar')?'#16a34a':'#e2e8f0'}`,borderRadius:'12px',
                      padding:'14px 16px',cursor:'pointer',background:(gestionEstadoOpcion==='emitir'||gestionEstadoOpcion==='completar')?'#f0fdf4':'white',transition:'all 0.15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                      <div style={{width:'26px',height:'26px',borderRadius:'50%',flexShrink:0,
                        background:(gestionEstadoOpcion==='emitir'||gestionEstadoOpcion==='completar')?'#16a34a':'#f1f5f9',
                        display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <CheckCircle size={13} color={(gestionEstadoOpcion==='emitir'||gestionEstadoOpcion==='completar')?'white':'#94a3b8'}/>
                      </div>
                      <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>
                        {isExcl ? 'Completar exclusión' : 'Emitir inclusión'}
                      </p>
                    </div>
                    <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 36px'}}>
                      {isExcl ? 'Los vehículos excluidos serán removidos de la póliza.' : 'La aseguradora aprobó la inclusión.'}
                    </p>
                    {/* PDF upload — solo inclusión, inline al seleccionar */}
                    {!isExcl && gestionEstadoOpcion === 'emitir' && (
                      <div style={{marginTop:'14px',paddingTop:'14px',borderTop:'1px solid #dcfce7'}}
                        onClick={e=>e.stopPropagation()}>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'6px'}}>
                          PDF de la aseguradora *
                        </label>
                        <label style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 14px',
                          border:`1.5px dashed ${emisionPdfFile?'#16a34a':'#e2e8f0'}`,borderRadius:'8px',cursor:'pointer',
                          background:emisionPdfFile?'#f0fdf4':'white'}}>
                          <Upload size={15} color={emisionPdfFile?'#15803d':'#94a3b8'}/>
                          <span style={{fontSize:'13px',color:emisionPdfFile?'#15803d':'#94a3b8',flex:1}}>
                            {emisionPdfFile ? emisionPdfFile.name : 'Seleccionar PDF de la aseguradora...'}
                          </span>
                          {emisionPdfFile && (
                            <button type="button" onClick={e=>{e.preventDefault();setEmisionPdfFile(null)}}
                              style={{background:'none',border:'none',cursor:'pointer',padding:'0',color:'#94a3b8'}}>
                              <X size={13}/>
                            </button>
                          )}
                          <input type="file" accept=".pdf" style={{display:'none'}}
                            onChange={e=>setEmisionPdfFile(e.target.files[0]||null)}/>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* enviada → en_reproceso */}
                {em.estado === 'enviada' && (
                  <div onClick={()=>setGestionEstadoOpcion('reproceso')}
                    style={{border:`2px solid ${gestionEstadoOpcion==='reproceso'?'#dc2626':'#e2e8f0'}`,borderRadius:'12px',
                      padding:'14px 16px',cursor:'pointer',background:gestionEstadoOpcion==='reproceso'?'#fef2f2':'white',transition:'all 0.15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                      <div style={{width:'26px',height:'26px',borderRadius:'50%',flexShrink:0,
                        background:gestionEstadoOpcion==='reproceso'?'#dc2626':'#f1f5f9',
                        display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <RefreshCw size={12} color={gestionEstadoOpcion==='reproceso'?'white':'#94a3b8'}/>
                      </div>
                      <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Marcar en reproceso</p>
                    </div>
                    <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 36px'}}>
                      La aseguradora solicitó correcciones. Se podrá generar un nuevo PDF.
                    </p>
                  </div>
                )}

                {/* en_reproceso → enviada */}
                {em.estado === 'en_reproceso' && (
                  <div onClick={()=>setGestionEstadoOpcion('reenviar')}
                    style={{border:`2px solid ${gestionEstadoOpcion==='reenviar'?'#C4A96B':'#e2e8f0'}`,borderRadius:'12px',
                      padding:'14px 16px',cursor:'pointer',background:gestionEstadoOpcion==='reenviar'?'#FDF8EE':'white',transition:'all 0.15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                      <div style={{width:'26px',height:'26px',borderRadius:'50%',flexShrink:0,
                        background:gestionEstadoOpcion==='reenviar'?'#C4A96B':'#f1f5f9',
                        display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <SendHorizonal size={12} color={gestionEstadoOpcion==='reenviar'?'white':'#94a3b8'}/>
                      </div>
                      <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Re-enviar a aseguradora</p>
                    </div>
                    <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 36px'}}>
                      Las correcciones fueron aplicadas y el PDF actualizado está listo.
                    </p>
                  </div>
                )}

                {/* Cancelar gestión — available for solicitud, enviada, en_reproceso */}
                <div onClick={()=>setGestionEstadoOpcion(gestionEstadoOpcion==='cancelar'?null:'cancelar')}
                  style={{border:`2px solid ${gestionEstadoOpcion==='cancelar'?'#94a3b8':'#e2e8f0'}`,borderRadius:'12px',
                    padding:'14px 16px',cursor:'pointer',background:gestionEstadoOpcion==='cancelar'?'#f8fafc':'white',transition:'all 0.15s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                    <div style={{width:'26px',height:'26px',borderRadius:'50%',flexShrink:0,
                      background:gestionEstadoOpcion==='cancelar'?'#64748b':'#f1f5f9',
                      display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <X size={12} color={gestionEstadoOpcion==='cancelar'?'white':'#94a3b8'}/>
                    </div>
                    <p style={{fontWeight:700,fontSize:'14px',color:'#374151',margin:0}}>Cancelar gestión</p>
                  </div>
                  <p style={{fontSize:'12px',color:'#94a3b8',margin:'0 0 0 36px'}}>
                    La gestión será marcada como cancelada. Esta acción no se puede deshacer.
                  </p>
                </div>

              </div>

              <div style={{display:'flex',gap:'10px'}}>
                <button
                  disabled={!gestionEstadoOpcion || (gestionEstadoOpcion==='emitir' && !isExcl && !emisionPdfFile) || uploadingPdf}
                  onClick={async()=>{
                    if (!gestionEstadoOpcion) return
                    // Validate vehicles before sending
                    if (gestionEstadoOpcion === 'enviar' && (em.emision_vehiculos?.length || 0) === 0) {
                      toast.error('Debes asignar al menos un vehículo antes de enviar'); return
                    }
                    // Upload PDF for inclusión emitir
                    if (gestionEstadoOpcion === 'emitir' && emisionPdfFile) {
                      setUploadingPdf(true)
                      const ext = emisionPdfFile.name.split('.').pop()
                      const { data: ud, error: ue } = await supabase.storage
                        .from('polizas-pdfs').upload(`${poliza.id}/${em.id}.${ext}`, emisionPdfFile, { upsert: true })
                      setUploadingPdf(false)
                      if (ue) { toast.error('Error subiendo PDF: ' + ue.message); return }
                      const { data: uUrl } = supabase.storage.from('polizas-pdfs').getPublicUrl(ud.path)
                      await supabase.from('emisiones').update({ pdf_url: uUrl.publicUrl }).eq('id', em.id)
                    }
                    const mapa = { enviar:'enviada', emitir:'emitida', completar:'completado', reproceso:'en_reproceso', reenviar:'enviada', cancelar:'cancelada' }
                    await actualizarEstadoEmision(em, mapa[gestionEstadoOpcion])
                    setShowGestionEstadoModal(false)
                    setGestionEstadoOpcion(null)
                    setEmisionForModal(null)
                    setEmisionPdfFile(null)
                  }}
                  style={{flex:1,padding:'11px',border:'none',borderRadius:'9px',fontSize:'14px',fontWeight:700,transition:'all 0.15s',
                    background: (!gestionEstadoOpcion || (gestionEstadoOpcion==='emitir'&&!isExcl&&!emisionPdfFile) || uploadingPdf) ? '#e2e8f0'
                      : gestionEstadoOpcion==='emitir' || gestionEstadoOpcion==='completar' ? '#16a34a'
                      : gestionEstadoOpcion==='reproceso' ? '#dc2626'
                      : gestionEstadoOpcion==='cancelar' ? '#64748b'
                      : gestionEstadoOpcion==='reenviar' ? '#C4A96B'
                      : '#111111',
                    color: (!gestionEstadoOpcion || (gestionEstadoOpcion==='emitir'&&!isExcl&&!emisionPdfFile) || uploadingPdf) ? '#94a3b8' : 'white',
                    cursor: (!gestionEstadoOpcion || (gestionEstadoOpcion==='emitir'&&!isExcl&&!emisionPdfFile) || uploadingPdf) ? 'not-allowed' : 'pointer'}}>
                  {uploadingPdf ? 'Subiendo PDF...'
                    : !gestionEstadoOpcion ? 'Selecciona una opción'
                    : gestionEstadoOpcion==='enviar' ? 'Confirmar envío'
                    : gestionEstadoOpcion==='emitir' ? (emisionPdfFile ? '✓ Confirmar emisión' : 'Adjunta el PDF primero')
                    : gestionEstadoOpcion==='completar' ? '✓ Confirmar completado'
                    : gestionEstadoOpcion==='reproceso' ? 'Confirmar reproceso'
                    : gestionEstadoOpcion==='cancelar' ? 'Confirmar cancelación'
                    : 'Confirmar re-envío'}
                </button>
                <button onClick={()=>{ setShowGestionEstadoModal(false); setGestionEstadoOpcion(null); setEmisionForModal(null); setEmisionPdfFile(null) }}
                  style={{padding:'11px 20px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'9px',fontSize:'14px',cursor:'pointer'}}>
                  Cerrar
                </button>
              </div>
            </div>
          </>
        )
      })()}

      {/* ─ Modal: Cambiar estado ─ */}
      {showCambiarEstadoModal && (
        <>
          <div onClick={()=>setShowCambiarEstadoModal(false)}
            style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300}}/>
          <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
            background:'white',borderRadius:'16px',padding:'28px',width:'90%',maxWidth:'480px',
            zIndex:301,boxShadow:'0 20px 60px rgba(0,0,0,0.25)',maxHeight:'90vh',overflowY:'auto'}}>

            {/* Header */}
            <div style={{marginBottom:'20px'}}>
              <p style={{fontSize:'12px',fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 4px'}}>
                Cambiar estado
              </p>
              <h2 style={{fontSize:'18px',fontWeight:700,color:'#111111',margin:'0 0 4px'}}>
                {poliza.estado === 'solicitud' ? '¿Listo para enviar a la aseguradora?' : poliza.estado === 'enviada' ? '¿Qué ocurrió con la aseguradora?' : '¿Listo para re-enviar?'}
              </h2>
              <p style={{fontSize:'13px',color:'#6B6B62',margin:0}}>
                Estado actual: <span style={{fontWeight:600,color:pEst.color}}>{pEst.label}</span>
              </p>
            </div>

            {/* ── Opción para estado "solicitud" ── */}
            {poliza.estado === 'solicitud' && (
              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'20px'}}>
                <div onClick={()=>setEstadoOpcion('enviar')}
                  style={{border:`2px solid ${estadoOpcion==='enviar'?'#111111':'#e2e8f0'}`,borderRadius:'12px',
                    padding:'16px',cursor:'pointer',background:estadoOpcion==='enviar'?'#f8fafc':'white',transition:'all 0.15s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',
                      background:estadoOpcion==='enviar'?'#111111':'#f1f5f9',
                      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <SendHorizonal size={13} color={estadoOpcion==='enviar'?'white':'#94a3b8'}/>
                    </div>
                    <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Marcar como enviada</p>
                  </div>
                  <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 38px'}}>
                    El PDF fue generado y enviado a la aseguradora. La solicitud quedará en espera de respuesta.
                  </p>
                </div>
              </div>
            )}

            {/* ── Opciones para estado "enviada" ── */}
            {poliza.estado === 'enviada' && (
              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'20px'}}>

                {/* Opción: Emitir */}
                <div onClick={()=>setEstadoOpcion(estadoOpcion==='emitir'?null:'emitir')}
                  style={{border:`2px solid ${estadoOpcion==='emitir'?'#16a34a':'#e2e8f0'}`,borderRadius:'12px',
                    padding:'16px',cursor:'pointer',background:estadoOpcion==='emitir'?'#f0fdf4':'white',transition:'all 0.15s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',
                      background:estadoOpcion==='emitir'?'#16a34a':'#f1f5f9',
                      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <CheckCircle size={15} color={estadoOpcion==='emitir'?'white':'#94a3b8'}/>
                    </div>
                    <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Emitir póliza</p>
                  </div>
                  <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 38px'}}>
                    La aseguradora aprobó la solicitud y asignó un número de póliza.
                  </p>

                  {/* Subformulario inline */}
                  {estadoOpcion === 'emitir' && (
                    <div style={{marginTop:'16px',paddingTop:'16px',borderTop:'1px solid #dcfce7'}}
                      onClick={e=>e.stopPropagation()}>
                      <div style={{marginBottom:'12px'}}>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'6px'}}>
                          Número de póliza *
                        </label>
                        <input value={emitirForm.numero_poliza}
                          onChange={e=>setEmitirForm({...emitirForm,numero_poliza:e.target.value})}
                          placeholder="Ej: POL-2025-001234" autoFocus
                          style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:'8px',
                            fontSize:'14px',background:'white',color:'#1e293b',boxSizing:'border-box'}}/>
                      </div>
                      <div style={{marginBottom:'12px'}}>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'6px'}}>
                          PDF de la póliza <span style={{fontWeight:400,color:'#94a3b8'}}>(opcional)</span>
                        </label>
                        <label style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 14px',
                          border:'1.5px dashed #e2e8f0',borderRadius:'8px',cursor:'pointer',
                          background:emitirPdfFile?'#f0fdf4':'white'}}>
                          <Upload size={15} color={emitirPdfFile?'#15803d':'#94a3b8'}/>
                          <span style={{fontSize:'13px',color:emitirPdfFile?'#15803d':'#94a3b8'}}>
                            {emitirPdfFile ? emitirPdfFile.name : 'Seleccionar PDF...'}
                          </span>
                          <input type="file" accept=".pdf" style={{display:'none'}}
                            onChange={e=>setEmitirPdfFile(e.target.files[0]||null)}/>
                        </label>
                      </div>
                      <div style={{background:'#eff6ff',borderRadius:'8px',padding:'10px 12px',display:'flex',gap:'8px'}}>
                        <CheckCircle size={13} color='#1d4ed8' style={{flexShrink:0,marginTop:'1px'}}/>
                        <div style={{fontSize:'12px',color:'#1d4ed8'}}>
                          <p style={{margin:'0 0 2px',fontWeight:600}}>Se creará automáticamente:</p>
                          <p style={{margin:0}}>· Primera emisión ({poliza.fecha_inicio?new Date(poliza.fecha_inicio).toLocaleDateString('es-GT'):'—'} → {vencDate?new Date(poliza.fecha_vencimiento).toLocaleDateString('es-GT'):'—'})</p>
                          {solicitudVehiculos.length>0&&<p style={{margin:0}}>· {solicitudVehiculos.length} vehículo(s) asignados</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Opción: En reproceso */}
                <div onClick={()=>setEstadoOpcion(estadoOpcion==='reproceso'?null:'reproceso')}
                  style={{border:`2px solid ${estadoOpcion==='reproceso'?'#dc2626':'#e2e8f0'}`,borderRadius:'12px',
                    padding:'16px',cursor:'pointer',background:estadoOpcion==='reproceso'?'#fef2f2':'white',transition:'all 0.15s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',
                      background:estadoOpcion==='reproceso'?'#dc2626':'#f1f5f9',
                      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <RefreshCw size={13} color={estadoOpcion==='reproceso'?'white':'#94a3b8'}/>
                    </div>
                    <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Marcar en reproceso</p>
                  </div>
                  <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 38px'}}>
                    La aseguradora solicitó correcciones. Se podrá editar la solicitud y generar un nuevo PDF.
                  </p>
                </div>

              </div>
            )}

            {/* ── Opción para estado "en_reproceso" ── */}
            {poliza.estado === 'en_reproceso' && (
              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'20px'}}>
                <div onClick={()=>setEstadoOpcion('reenviar')}
                  style={{border:`2px solid ${estadoOpcion==='reenviar'?'#C4A96B':'#e2e8f0'}`,borderRadius:'12px',
                    padding:'16px',cursor:'pointer',background:estadoOpcion==='reenviar'?'#FDF8EE':'white',transition:'all 0.15s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',
                      background:estadoOpcion==='reenviar'?'#C4A96B':'#f1f5f9',
                      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <SendHorizonal size={13} color={estadoOpcion==='reenviar'?'white':'#94a3b8'}/>
                    </div>
                    <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Re-enviar a aseguradora</p>
                  </div>
                  <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 38px'}}>
                    Las correcciones fueron aplicadas y el PDF actualizado está listo para reenvío.
                  </p>
                </div>
              </div>
            )}

            {/* Acciones del modal */}
            <div style={{display:'flex',gap:'10px'}}>
              <button
                disabled={!estadoOpcion || (estadoOpcion==='emitir' && !emitirForm.numero_poliza) || uploadingPdf}
                onClick={async()=>{
                  if (estadoOpcion === 'enviar') {
                    await avanzarEstado()
                    setShowCambiarEstadoModal(false)
                  } else if (estadoOpcion === 'emitir') {
                    await handleEmitir({ preventDefault: ()=>{} })
                    setShowCambiarEstadoModal(false)
                  } else if (estadoOpcion === 'reproceso') {
                    await marcarEnReproceso()
                    setShowCambiarEstadoModal(false)
                  } else if (estadoOpcion === 'reenviar') {
                    await avanzarEstado()
                    setShowCambiarEstadoModal(false)
                  }
                }}
                style={{flex:1,padding:'11px',
                  background: !estadoOpcion||uploadingPdf ? '#e2e8f0'
                    : estadoOpcion==='emitir' ? '#16a34a'
                    : estadoOpcion==='reproceso' ? '#dc2626'
                    : '#111111',
                  color: (!estadoOpcion||uploadingPdf) ? '#94a3b8' : 'white',
                  border:'none',borderRadius:'9px',fontSize:'14px',fontWeight:700,
                  cursor: !estadoOpcion||uploadingPdf ? 'not-allowed' : 'pointer',transition:'all 0.15s'}}>
                {uploadingPdf ? 'Procesando...'
                  : estadoOpcion==='enviar' ? 'Confirmar envío'
                  : estadoOpcion==='emitir' ? '✓ Confirmar emisión'
                  : estadoOpcion==='reproceso' ? 'Confirmar reproceso'
                  : estadoOpcion==='reenviar' ? 'Confirmar re-envío'
                  : 'Selecciona una opción'}
              </button>
              <button onClick={()=>setShowCambiarEstadoModal(false)}
                style={{padding:'11px 20px',background:'white',color:'#64748b',
                  border:'1px solid #e2e8f0',borderRadius:'9px',fontSize:'14px',cursor:'pointer'}}>
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

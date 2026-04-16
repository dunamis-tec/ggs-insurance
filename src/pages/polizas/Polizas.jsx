import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
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

const emptyPoliza  = { cliente_id:'', aseguradora_id:'', producto_id:'', prima_total:'', tipo_pago:'contado', fraccionamiento:'', fecha_inicio:'', fecha_vencimiento:'', vigencia:'1anio' }
const emptyEmision = { tipo:'emision', prima_emision:'', fraccionamiento:'', fecha_inicio:'', fecha_fin:'', notas:'' }
const emptyReq     = { monto:'', fecha_vencimiento:'', total_cuotas:1 }

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
  const location  = useLocation()
  const navigate  = useNavigate()
  const fromClienteId = location.state?.fromClienteId || null
  const fromReqId     = location.state?.fromReqId     || null
  const prefilledClienteId = location.state?.prefilledClienteId || null

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (location.state?.openPolizaId && polizas.length > 0) {
      const p = polizas.find(p => p.id === location.state.openPolizaId)
      if (p) { setSelected(p); setView('detalle') }
    }
  }, [location.state, polizas])

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
      supabase.from('polizas').select('*, clientes(nombre,apellido,nit,email,telefono,dpi), aseguradoras(nombre,logo_url), productos(nombre), poliza_origen:poliza_origen_id(id,numero_poliza)')
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
    setForm(f => ({ ...f, cliente_id: id }))
    setVehiculosSeleccionados([])
    setClienteVehiculos([])
    setClienteValidation([])
    if (!id) return
    const { data: c } = await supabase.from('clientes').select('*').eq('id', id).single()
    const missing = camposClienteReq.filter(f => !c?.[f.key])
    setClienteValidation(missing)
    const { data: vData } = await supabase.from('vehiculos').select('*').eq('cliente_id', id).eq('activo', true).order('marca')
    setClienteVehiculos(vData || [])
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
    if (form.tipo_pago === 'financiado' && !form.fraccionamiento) { toast.error('Selecciona la periodicidad de pago'); return }
    if (!form.fecha_inicio || !form.fecha_vencimiento) { toast.error('Completa las fechas de vigencia'); return }

    const { data: { user } } = await supabase.auth.getUser()

    if (editing) {
      /* ── EDIT mode ── */
      const payload = {
        aseguradora_id: form.aseguradora_id, producto_id: form.producto_id,
        prima_total: parseFloat(form.prima_total) || 0, tipo_pago: form.tipo_pago,
        fraccionamiento: form.tipo_pago === 'financiado' ? form.fraccionamiento : 'anual',
        fecha_inicio: form.fecha_inicio, fecha_vencimiento: form.fecha_vencimiento,
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
        setEditing(null); setReturnToPolizaId(null)
        setForm(emptyPoliza); setProductosFiltered([]); setClienteVehiculos([])
        setVehiculosSeleccionados([]); setClienteValidation([])
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
        fraccionamiento: form.tipo_pago === 'financiado' ? form.fraccionamiento : 'anual',
        fecha_inicio: form.fecha_inicio, fecha_vencimiento: form.fecha_vencimiento,
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
    setView('list')
  }

  const handleEdit = async (p, fromDetalle = false) => {
    if (fromDetalle) setReturnToPolizaId(p.id)
    const aseg = aseguradoras.find(a => a.id === p.aseguradora_id)
    setProductosFiltered(aseg?.productos?.filter(pr=>pr.activo) || [])
    await handleClienteChange(p.cliente_id)
    setForm({
      cliente_id: p.cliente_id, aseguradora_id: p.aseguradora_id, producto_id: p.producto_id,
      prima_total: p.prima_total, tipo_pago: p.tipo_pago||'contado', fraccionamiento: p.fraccionamiento||'',
      fecha_inicio: p.fecha_inicio, fecha_vencimiento: p.fecha_vencimiento, vigencia:'manual'
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
      onBack={()=>{ if (fromClienteId) navigate('/clientes',{state:{openClienteId:fromClienteId}}); else if (fromReqId) navigate('/requerimientos',{state:{openReqId:fromReqId}}); else { setView('list'); fetchAll() } }}
      onEdit={(p) => handleEdit(p, true)} />
  )

  /* ── VIEW: FORM ── */
  if (view === 'form') return (
    <div>
      <button onClick={resetForm} style={{display:'flex',alignItems:'center',gap:'6px',color:'#64748b',background:'none',border:'none',cursor:'pointer',fontSize:'14px',marginBottom:'20px',padding:'0'}}>
        <ArrowLeft size={16}/> Volver a pólizas
      </button>
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
        <div style={{padding:'20px 24px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)'}}>
          <h2 style={{fontSize:'18px',fontWeight:700,color:'white',margin:0}}>{editing ? 'Editar solicitud' : 'Nueva solicitud de póliza'}</h2>
          <p style={{fontSize:'13px',color:'rgba(255,255,255,0.7)',marginTop:'4px',marginBottom:0}}>
            {editing ? 'Actualiza los datos de la solicitud' : 'Completa el formulario para crear la solicitud'}
          </p>
        </div>

        <div style={{padding:'24px'}}>
          <form onSubmit={handleSubmit}>

            {/* ─ Cliente ─ */}
            <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#0C1E3D',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>1 · Cliente</p>
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

            {/* ─ Aseguradora + Producto ─ */}
            <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#0C1E3D',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>2 · Aseguradora y producto</p>
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
              <p style={{fontSize:'13px',fontWeight:700,color:'#0C1E3D',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>3 · Vehículos</p>
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
                          <Car size={16} color='#1A6BBA'/>
                        </div>
                        <div style={{flex:1}}>
                          <p style={{fontWeight:600,color:'#0C1E3D',fontSize:'13px',margin:0}}>{v.marca} {v.modelo} {v.anio}</p>
                          <p style={{fontSize:'12px',color:'#64748b',margin:0}}>Placa: {fp(v)} · {v.tipo}</p>
                        </div>
                        {v.valor_asegurado > 0 && <p style={{fontSize:'12px',fontWeight:600,color:'#1A6BBA',margin:0,flexShrink:0}}>Q {parseFloat(v.valor_asegurado).toLocaleString()}</p>}
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
              <p style={{fontSize:'13px',fontWeight:700,color:'#0C1E3D',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>4 · Pago y prima</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'16px'}}>
                <div>
                  <label style={lbl}>Prima total (Q)</label>
                  <input type="number" step="0.01" value={form.prima_total} onChange={e=>setForm({...form,prima_total:e.target.value})} style={inp} placeholder="0.00"/>
                </div>
                <div>
                  <label style={lbl}>Tipo de pago *</label>
                  <div style={{display:'flex',gap:'8px'}}>
                    {['contado','financiado'].map(t=>(
                      <button key={t} type="button" onClick={()=>setForm({...form,tipo_pago:t,fraccionamiento:''})}
                        style={{flex:1,padding:'10px',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',
                          background:form.tipo_pago===t?'#0C1E3D':'white', color:form.tipo_pago===t?'white':'#64748b',
                          border:`1px solid ${form.tipo_pago===t?'#0C1E3D':'#e2e8f0'}`}}>
                        {t.charAt(0).toUpperCase()+t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {form.tipo_pago === 'financiado' && (
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={lbl}>Periodicidad de pago *</label>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                      {fraccionamientoOpciones.map(({value,label,sub})=>(
                        <button key={value} type="button" onClick={()=>setForm({...form,fraccionamiento:value})}
                          style={{flex:1,minWidth:'90px',padding:'10px 8px',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',
                            background:form.fraccionamiento===value?'#1A6BBA':'white', color:form.fraccionamiento===value?'white':'#64748b',
                            border:`1px solid ${form.fraccionamiento===value?'#1A6BBA':'#e2e8f0'}`,
                            display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
                          <span>{label}</span>
                          <span style={{fontSize:'10px',opacity:0.75}}>{sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─ Vigencia ─ */}
            <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#0C1E3D',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>5 · Vigencia</p>
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
                          background:form.vigencia===v?'#0C1E3D':'white', color:form.vigencia===v?'white':'#64748b',
                          border:`1px solid ${form.vigencia===v?'#0C1E3D':'#e2e8f0'}`}}>
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
                style={{padding:'11px 28px',background:clienteValidation.length>0?'#94a3b8':'#0C1E3D',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:clienteValidation.length>0?'not-allowed':'pointer'}}>
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
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'20px'}}>
        <div style={{padding:'20px 24px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <h1 style={{fontSize:'22px',fontWeight:700,color:'white',margin:0}}>Pólizas</h1>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:'14px',marginTop:'4px',marginBottom:0}}>
              {counts.todas} total · {counts.solicitud} solicitudes · {counts.enviada} enviadas · {counts.en_reproceso} en reproceso · {counts.emitida} emitidas
            </p>
          </div>
          <button onClick={()=>{setView('form');setEditing(null);setForm(emptyPoliza);setProductosFiltered([]);setClienteVehiculos([]);setVehiculosSeleccionados([]);setClienteValidation([])}}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 20px',background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
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
                  background: isActive ? (est?.color||'#0C1E3D') : 'white',
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
                onClick={()=>{setSelected(p);setView('detalle')}}
                onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e=>e.currentTarget.style.background='white'}>
                <div style={{width:'40px',height:'40px',borderRadius:'8px',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px',overflow:'hidden',background:'#f8fafc',flexShrink:0}}>
                  {p.aseguradoras?.logo_url?<img src={p.aseguradoras.logo_url} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<FileText size={16} color="#1A6BBA"/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                    <p style={{fontWeight:700,color:'#0C1E3D',fontSize:'14px',margin:0}}>
                      {p.numero_poliza || `SOL-${p.numero_solicitud||'?'}`}
                    </p>
                    {p.poliza_origen && <span style={{fontSize:'11px',color:'#64748b',background:'#f1f5f9',padding:'1px 6px',borderRadius:'10px'}}>Renovación</span>}
                  </div>
                  <p style={{fontSize:'12px',color:'#64748b',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {p.clientes?.nombre} {p.clientes?.apellido||''} · {p.aseguradoras?.nombre}
                  </p>
                </div>
                <div style={{textAlign:'right',marginRight:'16px',flexShrink:0}}>
                  <p style={{fontSize:'14px',fontWeight:700,color:'#1A6BBA',margin:0}}>Q {parseFloat(p.prima_total||0).toLocaleString()}</p>
                  <p style={{fontSize:'11px',color:'#64748b',margin:0}}>{p.tipo_pago==='financiado'?(fraccionamientoLabels[p.fraccionamiento]||p.fraccionamiento):'Contado'}</p>
                </div>
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
  const [showReqForm, setShowReqForm] = useState(false)
  const [showAsignarVehiculo, setShowAsignarVehiculo] = useState(null)
  const [emisionForm, setEmisionForm] = useState(emptyEmision)
  const [reqForm, setReqForm]         = useState(emptyReq)
  const [expandedEmision, setExpandedEmision] = useState(null)
  const [vehiculoSearch, setVehiculoSearch]   = useState('')
  const [showEmitirModal, setShowEmitirModal] = useState(false)
  const [emitirForm, setEmitirForm]   = useState({ numero_poliza:'' })
  const [emitirPdfFile, setEmitirPdfFile] = useState(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [inclusionVehiculos, setInclusionVehiculos] = useState([])
  const [inclusionVehiculosSelected, setInclusionVehiculosSelected] = useState([])
  const [exclusionVehiculosSelected, setExclusionVehiculosSelected] = useState([])
  const [allClientVehiculos, setAllClientVehiculos] = useState([])

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
      supabase.from('emisiones').select('*, emision_vehiculos(id, vehiculos(*))').eq('poliza_id', poliza.id).order('created_at'),
      supabase.from('requerimientos_pago').select('*').eq('poliza_id', poliza.id).order('fecha_vencimiento'),
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

    setShowEmitirModal(false)
    setEmitirPdfFile(null)
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

  const abrirFormEmision = (tipo) => {
    setEmisionForm({ ...emptyEmision, tipo }); setPreselectedTipo(tipo)
    setInclusionVehiculosSelected([]); setExclusionVehiculosSelected([])
    setShowEmisionForm(true); setActiveTab('emisiones')
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior:'smooth' }), 100)
  }

  const handleEmisionSubmit = async (e) => {
    e.preventDefault()
    const isExclusion = emisionForm.tipo === 'exclusion'
    if (isExclusion && exclusionVehiculosSelected.length === 0) {
      toast.error('Selecciona al menos un vehículo para excluir'); return
    }
    const { data: { user } } = await supabase.auth.getUser()
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
      created_by: user?.id
    }).select().single()
    if (error) { toast.error('Error: ' + error.message); return }
    // Assign selected vehicles (track which vehicles are being included/excluded)
    const selectedVids = isExclusion ? exclusionVehiculosSelected : inclusionVehiculosSelected
    if (selectedVids.length > 0) {
      await supabase.from('emision_vehiculos').insert(
        selectedVids.map(vid => ({ emision_id: emData.id, vehiculo_id: vid }))
      )
    }
    // Log in bitácora
    const tipoLabel = isExclusion ? 'Exclusión' : 'Inclusión'
    await addBitacora(null, 'solicitud', `${tipoLabel} ${numEmision} creada`)
    toast.success(`${tipoLabel} creada · ` + numEmision)
    setEmisionForm(emptyEmision); setShowEmisionForm(false)
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
    if (emisiones.length === 0) { toast.error('Primero crea una emision'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: codigoData } = await supabase.rpc('generate_codigo_req')
    const codigo = codigoData || 'REQ-' + Date.now()
    const monto = parseFloat(reqForm.monto), totalCuotas = parseInt(reqForm.total_cuotas)
    const emisionId = emisiones[emisiones.length-1].id
    const requerimientos = Array.from({ length: totalCuotas }, (_, i) => {
      const fecha = new Date(reqForm.fecha_vencimiento); fecha.setMonth(fecha.getMonth() + i)
      return { emision_id: emisionId, poliza_id: poliza.id,
        codigo: i===0 ? codigo : `${codigo}-${i}`, codigo_matriz: i===0 ? null : codigo,
        numero_cuota: i+1, total_cuotas: totalCuotas, monto,
        fecha_vencimiento: fecha.toISOString().split('T')[0], created_by: user?.id }
    })
    const { error } = await supabase.from('requerimientos_pago').insert(requerimientos)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(`${totalCuotas} requerimiento(s) creado(s)`)
    setReqForm(emptyReq); setShowReqForm(false); fetchData()
  }

  const marcarPagado = async (id) => {
    await supabase.from('requerimientos_pago').update({ estado:'pagado', fecha_pago: new Date().toISOString().split('T')[0] }).eq('id', id)
    toast.success('Marcado como pagado'); fetchData()
  }

  const actualizarEstadoEmision = async (em, nuevoEstado) => {
    await supabase.from('emisiones').update({ estado: nuevoEstado }).eq('id', em.id)
    const tipoLabel = { emision:'Emisión principal', inclusion:'Inclusión', exclusion:'Exclusión' }[em.tipo] || em.tipo
    const estadoLabel = { solicitud:'Solicitud', enviada:'Enviada a aseguradora', en_reproceso:'En reproceso', emitida:'Emitida' }
    const desc = `[Gestión] ${tipoLabel} ${em.numero_emision} — ${estadoLabel[em.estado]||em.estado} → ${estadoLabel[nuevoEstado]||nuevoEstado}`
    await addBitacora(em.estado, nuevoEstado, desc)
    // When an exclusion is completado → remove excluded vehicles from the poliza
    if ((nuevoEstado === 'completado' || nuevoEstado === 'emitida') && em.tipo === 'exclusion') {
      const excVehiculos = em.emision_vehiculos?.map(ev => ev.vehiculos?.id).filter(Boolean) || []
      if (excVehiculos.length > 0) {
        await Promise.all(excVehiculos.map(vid =>
          supabase.from('vehiculos').update({ poliza_id: null }).eq('id', vid)
        ))
      }
    }
    fetchData()
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

      {/* Header */}
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'16px'}}>
        <div style={{padding:'20px 24px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)'}}>
          {/* Row 1: identity + actions */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexWrap:'wrap'}}>
            {/* Left: logo + title + badge */}
            <div style={{display:'flex',alignItems:'center',gap:'14px',minWidth:0}}>
              <div style={{width:'48px',height:'48px',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'rgba(255,255,255,0.15)',flexShrink:0}}>
                {poliza.aseguradoras?.logo_url?<img src={poliza.aseguradoras.logo_url} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<FileText size={20} color="white"/>}
              </div>
              <div style={{minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                  <h1 style={{fontSize:'20px',fontWeight:700,color:'white',margin:0,whiteSpace:'nowrap'}}>
                    {poliza.numero_poliza || `SOL-${poliza.numero_solicitud||'?'}`}
                  </h1>
                  <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',fontWeight:700,background:pEst.bg,color:pEst.color}}>{pEst.label}</span>
                  {isEmitida && vencEst==='vencida' && <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:'#fef2f2',color:'#ef4444',fontWeight:600}}>Vencida</span>}
                  {isEmitida && vencEst==='por_vencer' && <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:'#fef9c3',color:'#a16207',fontWeight:600}}>Por vencer ({diasRestantes}d)</span>}
                </div>
                <p style={{fontSize:'13px',color:'rgba(255,255,255,0.65)',margin:'3px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {poliza.clientes?.nombre} {poliza.clientes?.apellido||''} · {poliza.aseguradoras?.nombre} · {poliza.productos?.nombre}
                </p>
                {poliza.poliza_origen && (
                  <div style={{marginTop:'4px',display:'flex',alignItems:'center',gap:'4px'}}>
                    <GitMerge size={11} color="rgba(255,255,255,0.55)"/>
                    <span style={{fontSize:'12px',color:'rgba(255,255,255,0.65)'}}>
                      Renovación de&nbsp;
                      <button onClick={()=>navigate('/polizas',{state:{openPolizaId:poliza.poliza_origen.id}})}
                        style={{background:'none',border:'none',color:'rgba(255,255,255,0.9)',cursor:'pointer',fontSize:'12px',fontWeight:600,padding:0,textDecoration:'underline'}}>
                        {poliza.poliza_origen.numero_poliza||'solicitud anterior'}
                      </button>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: action buttons */}
            <div style={{display:'flex',flexWrap:'wrap',gap:'8px',alignItems:'center',flexShrink:0}}>
              {/* PDF solicitud: solo visible cuando NO emitida */}
              {!isEmitida && (
                <button onClick={()=>toast('Generación de PDF próximamente', {icon:'📄'})}
                  style={{display:'flex',alignItems:'center',gap:'5px',padding:'8px 12px',background:'rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.85)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer'}}>
                  <Download size={13}/> PDF solicitud
                </button>
              )}
              {/* PDF póliza: visible cuando emitida y tiene PDF */}
              {isEmitida && poliza.poliza_pdf_url && (
                <a href={poliza.poliza_pdf_url} target="_blank" rel="noopener noreferrer"
                  style={{display:'flex',alignItems:'center',gap:'5px',padding:'8px 12px',background:'rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.85)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',textDecoration:'none'}}>
                  <Download size={13}/> Póliza PDF
                </a>
              )}

              {/* solicitud → Enviar a aseguradora */}
              {poliza.estado === 'solicitud' && (
                <button onClick={avanzarEstado}
                  style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 16px',background:'#f59e0b',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:700,cursor:'pointer'}}>
                  <SendHorizonal size={14}/> Enviar a aseguradora
                </button>
              )}

              {/* enviada → dos opciones */}
              {poliza.estado === 'enviada' && (
                <>
                  <button onClick={marcarEnReproceso}
                    style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 14px',background:'rgba(239,68,68,0.15)',color:'#fca5a5',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
                    <RefreshCw size={13}/> En reproceso
                  </button>
                  <button onClick={()=>setShowEmitirModal(true)}
                    style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 16px',background:'#16a34a',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:700,cursor:'pointer'}}>
                    <CheckCircle size={14}/> Emitir póliza
                  </button>
                </>
              )}

              {/* en_reproceso → Re-enviar */}
              {poliza.estado === 'en_reproceso' && (
                <button onClick={avanzarEstado}
                  style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 16px',background:'#f59e0b',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:700,cursor:'pointer'}}>
                  <SendHorizonal size={14}/> Re-enviar a aseguradora
                </button>
              )}

              {/* emitida: Inclusión / Exclusión / Renovar */}
              {isEmitida && (
                <>
                  <button onClick={()=>abrirFormEmision('inclusion')}
                    style={{display:'flex',alignItems:'center',gap:'5px',padding:'8px 12px',background:'rgba(255,255,255,0.15)',color:'white',border:'1px solid rgba(255,255,255,0.25)',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
                    <Plus size={13}/> Inclusión
                  </button>
                  <button onClick={()=>abrirFormEmision('exclusion')}
                    style={{display:'flex',alignItems:'center',gap:'5px',padding:'8px 12px',background:'rgba(255,255,255,0.15)',color:'white',border:'1px solid rgba(255,255,255,0.25)',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
                    <Minus size={13}/> Exclusión
                  </button>
                  <button onClick={renovarPoliza}
                    style={{display:'flex',alignItems:'center',gap:'5px',padding:'8px 12px',background:'rgba(255,255,255,0.15)',color:'white',border:'1px solid rgba(255,255,255,0.25)',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
                    <RefreshCw size={13}/> Renovar
                  </button>
                </>
              )}

              {/* Editar siempre visible */}
              <button onClick={()=>onEdit(poliza)}
                style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 12px',background:'rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.85)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer'}}>
                <Edit2 size={13}/> Editar
              </button>
            </div>
          </div>
        </div>
        {/* Info cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'12px',padding:'16px 24px'}}>
          {[
            ['Prima total','Q '+primaTotal.toLocaleString(),'#1A6BBA'],
            ['Tipo de pago', poliza.tipo_pago==='financiado'?`Financiado · ${fraccionamientoLabels[poliza.fraccionamiento]||poliza.fraccionamiento}`:'Contado','#0C1E3D'],
            ['Inicio', poliza.fecha_inicio ? new Date(poliza.fecha_inicio).toLocaleDateString('es-GT') : '—','#64748b'],
            ['Vencimiento', vencDate ? new Date(poliza.fecha_vencimiento).toLocaleDateString('es-GT') : '—', vencEst==='vencida'?'#ef4444':vencEst==='por_vencer'?'#a16207':'#64748b'],
          ].map(([label,val,color])=>(
            <div key={label} style={{background:'#f8fafc',borderRadius:'8px',padding:'12px'}}>
              <p style={{fontSize:'11px',color:'#64748b',margin:0}}>{label}</p>
              <p style={{fontSize:'14px',fontWeight:700,color,margin:'4px 0 0'}}>{val}</p>
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
              background:activeTab===tab?'#0C1E3D':'white',color:activeTab===tab?'white':'#64748b',
              border:`1px solid ${activeTab===tab?'#0C1E3D':'#e2e8f0'}`}}>
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
            <h3 style={{fontSize:'15px',fontWeight:600,color:'#0C1E3D',margin:0}}>Datos del cliente</h3>
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
              <div key={label} style={{background:'#f8fafc',borderRadius:'8px',padding:'12px'}}>
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
                {polizaEntries.length > 0 && (
                  <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
                    <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:'8px'}}>
                      <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',fontWeight:700,background:'#f1f5f9',color:'#475569'}}>PÓLIZA</span>
                      <span style={{fontSize:'13px',fontWeight:600,color:'#0C1E3D'}}>Historial de la póliza</span>
                      <span style={{marginLeft:'auto',fontSize:'12px',color:'#94a3b8'}}>{polizaEntries.length} evento(s)</span>
                    </div>
                    <div style={{overflowX:'auto'}}>{renderTable(polizaEntries)}</div>
                  </div>
                )}
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
                        <span style={{fontSize:'13px',fontWeight:600,color:'#0C1E3D'}}>{key}</span>
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
            <Car size={16} color='#1A6BBA'/>
            <h3 style={{fontSize:'15px',fontWeight:600,color:'#0C1E3D',margin:0}}>
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
                  <Car size={18} color='#1A6BBA'/>
                </div>
                <div style={{flex:1}}>
                  <p style={{fontWeight:700,color:'#0C1E3D',fontSize:'14px',margin:0}}>{sv.vehiculos?.marca} {sv.vehiculos?.modelo} {sv.vehiculos?.anio}</p>
                  <p style={{fontSize:'12px',color:'#64748b',margin:0}}>Placa: {fp(sv.vehiculos)} · {sv.vehiculos?.tipo}{sv.vehiculos?.color?` · ${sv.vehiculos.color}`:''}</p>
                </div>
                {sv.vehiculos?.valor_asegurado > 0 && (
                  <p style={{fontSize:'14px',fontWeight:700,color:'#1A6BBA',margin:'0 8px 0 0',flexShrink:0}}>Q {parseFloat(sv.vehiculos.valor_asegurado).toLocaleString()}</p>
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
                      <Car size={18} color='#1A6BBA'/>
                    </div>
                    <div style={{flex:1}}>
                      <p style={{fontWeight:700,color:'#0C1E3D',fontSize:'14px',margin:0}}>{ev.vehiculos?.marca} {ev.vehiculos?.modelo} {ev.vehiculos?.anio}</p>
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
                      <p style={{fontSize:'14px',fontWeight:700,color:'#1A6BBA',margin:'0 8px 0 0',flexShrink:0}}>Q {parseFloat(ev.vehiculos.valor_asegurado).toLocaleString()}</p>
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
        const vehiculosEnEmisiones = new Set(emisiones.flatMap(em=>em.emision_vehiculos?.map(ev=>ev.vehiculos?.id)||[]))
        const vehiculosParaInclusion = allClientVehiculos.filter(v =>
          !vehiculosEnEmisiones.has(v.id) &&
          (!v.poliza_id || v.poliza_id === poliza.id)
        )
        return (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid #f1f5f9'}}>
            <h3 style={{fontSize:'15px',fontWeight:600,color:'#0C1E3D',margin:0}}>Gestiones</h3>
            <button onClick={()=>{ setEmisionForm({prima_emision:'',fecha_inicio:'',notas:''}); setInclusionVehiculosSelected([]); setShowEmisionForm(!showEmisionForm) }}
              style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 14px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'6px',fontSize:'13px',cursor:'pointer',fontWeight:600}}>
              <Plus size={13}/> Inclusión
            </button>
          </div>

          {/* Nueva inclusión / exclusión form */}
          {showEmisionForm && (() => {
            const isExclusion = emisionForm.tipo === 'exclusion'
            const formTitle = isExclusion ? 'Nueva exclusión' : 'Nueva inclusión'
            const submitLabel = isExclusion ? 'Crear exclusión' : 'Crear inclusión'
            // Vehicles currently active in the poliza (in any emission)
            const vehiculosEnPoliza = emisiones.flatMap(em =>
              (em.emision_vehiculos||[]).map(ev => ({
                ...ev.vehiculos, evId: ev.id, emisionNumero: em.numero_emision, emisionEstado: em.estado
              }))
            ).filter(v => v?.id)
            return (
            <div style={{padding:'20px',borderBottom:'1px solid #f1f5f9',background:isExclusion?'#fff8f8':'#f8fafc'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
                {isExclusion ? <Minus size={15} color='#ef4444'/> : <Plus size={15} color='#1d4ed8'/>}
                <p style={{fontSize:'13px',fontWeight:700,color:isExclusion?'#ef4444':'#0C1E3D',margin:0}}>{formTitle}</p>
              </div>
              <form onSubmit={handleEmisionSubmit}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'12px',marginBottom:'14px'}}>
                  <div>
                    <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Prima {isExclusion?'de exclusión':'de inclusión'} (Q) *</label>
                    <input type="number" step="0.01" value={emisionForm.prima_emision} onChange={e=>setEmisionForm({...emisionForm,prima_emision:e.target.value})} required style={inputStyle} placeholder="0.00"/>
                  </div>
                  {isExclusion ? (
                    <div>
                      <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Fecha de exclusión *</label>
                      <input type="date" value={emisionForm.fecha_inicio} onChange={e=>setEmisionForm({...emisionForm,fecha_inicio:e.target.value})} required style={inputStyle}/>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Fecha de inicio *</label>
                        <input type="date" value={emisionForm.fecha_inicio} onChange={e=>setEmisionForm({...emisionForm,fecha_inicio:e.target.value})} required style={inputStyle}/>
                      </div>
                      <div>
                        <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Fecha fin</label>
                        <div style={{padding:'8px 10px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'13px',color:'#374151'}}>
                          {poliza.fecha_vencimiento ? new Date(poliza.fecha_vencimiento).toLocaleDateString('es-GT') : '—'} <span style={{fontSize:'11px',color:'#94a3b8'}}>(fecha venc. póliza)</span>
                        </div>
                      </div>
                    </>
                  )}
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Notas</label>
                    <input value={emisionForm.notas} onChange={e=>setEmisionForm({...emisionForm,notas:e.target.value})} style={inputStyle} placeholder={`Descripción de la ${isExclusion?'exclusión':'inclusión'}`}/>
                  </div>
                </div>

                {/* Vehicle selection */}
                <div style={{marginBottom:'14px'}}>
                  {isExclusion ? (
                    <>
                      <p style={{fontSize:'12px',fontWeight:600,color:'#ef4444',margin:'0 0 8px'}}>Vehículos a excluir * <span style={{fontWeight:400,color:'#94a3b8'}}>(activos en la póliza)</span></p>
                      {vehiculosEnPoliza.length === 0 ? (
                        <p style={{fontSize:'12px',color:'#94a3b8',padding:'8px',background:'white',borderRadius:'6px',border:'1px solid #e2e8f0',margin:0}}>Sin vehículos en la póliza</p>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                          {vehiculosEnPoliza.map(v => {
                            const sel = exclusionVehiculosSelected.includes(v.id)
                            const eEst = polizaEstados[v.emisionEstado] || { bg:'#f1f5f9', color:'#64748b', label: v.emisionEstado }
                            return (
                              <div key={v.id} onClick={()=>setExclusionVehiculosSelected(prev=>sel?prev.filter(x=>x!==v.id):[...prev,v.id])}
                                style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',background:sel?'#fef2f2':'white',border:`1px solid ${sel?'#ef4444':'#e2e8f0'}`,borderRadius:'8px',cursor:'pointer'}}>
                                <div style={{width:'18px',height:'18px',borderRadius:'4px',border:`2px solid ${sel?'#ef4444':'#cbd5e1'}`,background:sel?'#ef4444':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
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
                      <p style={{fontSize:'12px',fontWeight:600,color:'#374151',margin:'0 0 8px'}}>Vehículos a incluir <span style={{fontWeight:400,color:'#94a3b8'}}>(del cliente, no asignados a otra emisión)</span></p>
                      {vehiculosParaInclusion.length === 0 ? (
                        <p style={{fontSize:'12px',color:'#94a3b8',padding:'8px',background:'white',borderRadius:'6px',border:'1px solid #e2e8f0',margin:0}}>Sin vehículos disponibles</p>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                          {vehiculosParaInclusion.map(v=>{
                            const sel = inclusionVehiculosSelected.includes(v.id)
                            return (
                              <div key={v.id} onClick={()=>setInclusionVehiculosSelected(prev=>sel?prev.filter(x=>x!==v.id):[...prev,v.id])}
                                style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',background:sel?'#eff6ff':'white',border:`1px solid ${sel?'#3b82f6':'#e2e8f0'}`,borderRadius:'8px',cursor:'pointer'}}>
                                <div style={{width:'18px',height:'18px',borderRadius:'4px',border:`2px solid ${sel?'#3b82f6':'#cbd5e1'}`,background:sel?'#3b82f6':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
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

                <div style={{display:'flex',gap:'8px'}}>
                  <button type="submit" style={{padding:'8px 16px',background:isExclusion?'#dc2626':'#0C1E3D',color:'white',border:'none',borderRadius:'6px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>{submitLabel}</button>
                  <button type="button" onClick={()=>{setShowEmisionForm(false);setInclusionVehiculosSelected([]);setExclusionVehiculosSelected([])}} style={{padding:'8px 14px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'13px',cursor:'pointer'}}>Cancelar</button>
                </div>
              </form>
            </div>
            )
          })()}

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
                      <p style={{fontWeight:700,color:'#0C1E3D',fontSize:'13px',margin:0}}>{em.numero_emision}</p>
                      <span style={{fontSize:'11px',padding:'2px 7px',borderRadius:'20px',fontWeight:600,
                        background: isPrincipal ? '#0C1E3D' : (em.tipo==='exclusion' ? '#fef2f2' : '#eff6ff'),
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
                  <p style={{fontSize:'14px',fontWeight:700,color:'#1A6BBA',margin:0,flexShrink:0}}>Q {parseFloat(em.prima_emision||0).toLocaleString()}</p>

                  {/* Flow buttons (stop propagation) — not shown on principal emission */}
                  <div style={{display:'flex',gap:'6px',flexShrink:0}} onClick={e=>e.stopPropagation()}>
                    {!isPrincipal && em.estado==='solicitud' && (
                      <button onClick={()=>actualizarEstadoEmision(em,'enviada')}
                        style={{padding:'4px 10px',background:'#f59e0b',color:'white',border:'none',borderRadius:'6px',fontSize:'11px',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
                        Enviar
                      </button>
                    )}
                    {!isPrincipal && em.estado==='enviada' && (
                      <>
                        <button onClick={()=>actualizarEstadoEmision(em,'en_reproceso')}
                          style={{padding:'4px 10px',background:'rgba(239,68,68,0.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'6px',fontSize:'11px',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
                          Reproceso
                        </button>
                        {em.tipo === 'exclusion' ? (
                          <button onClick={()=>actualizarEstadoEmision(em,'completado')}
                            style={{padding:'4px 10px',background:'#0891b2',color:'white',border:'none',borderRadius:'6px',fontSize:'11px',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
                            Completar
                          </button>
                        ) : (
                          <button onClick={()=>actualizarEstadoEmision(em,'emitida')}
                            style={{padding:'4px 10px',background:'#16a34a',color:'white',border:'none',borderRadius:'6px',fontSize:'11px',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
                            Emitir
                          </button>
                        )}
                      </>
                    )}
                    {!isPrincipal && em.estado==='en_reproceso' && (
                      <button onClick={()=>actualizarEstadoEmision(em,'enviada')}
                        style={{padding:'4px 10px',background:'#f59e0b',color:'white',border:'none',borderRadius:'6px',fontSize:'11px',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
                        Re-enviar
                      </button>
                    )}
                  </div>
                  {expandedEmision===em.id ? <ChevronUp size={16} color="#64748b"/> : <ChevronDown size={16} color="#64748b"/>}
                </div>

                {/* Expanded detail */}
                {expandedEmision===em.id && (
                  <div style={{padding:'12px 20px 16px',background:'#f8fafc',borderTop:'1px solid #f1f5f9'}}>
                    {/* PDF row */}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                      <p style={{fontSize:'12px',fontWeight:600,color:'#374151',margin:0}}>PDF de la inclusión</p>
                      {em.pdf_url ? (
                        <a href={em.pdf_url} target="_blank" rel="noopener noreferrer"
                          style={{display:'flex',alignItems:'center',gap:'5px',padding:'4px 10px',background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe',borderRadius:'6px',fontSize:'11px',fontWeight:600,textDecoration:'none'}}>
                          <Download size={11}/> Descargar PDF
                        </a>
                      ) : (
                        <label style={{display:'flex',alignItems:'center',gap:'5px',padding:'4px 10px',background:'#f1f5f9',color:'#374151',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'11px',fontWeight:500,cursor:'pointer'}}>
                          <Upload size={11}/> Adjuntar PDF
                          <input type="file" accept=".pdf" style={{display:'none'}} onChange={async(e)=>{
                            const file = e.target.files[0]; if (!file) return
                            const { data: ud, error: ue } = await supabase.storage.from('polizas-pdfs').upload(`${poliza.id}/${em.id}.pdf`, file, {upsert:true})
                            if (ue) { toast.error('Error: '+ue.message); return }
                            const { data: uUrl } = supabase.storage.from('polizas-pdfs').getPublicUrl(ud.path)
                            await supabase.from('emisiones').update({ pdf_url: uUrl.publicUrl }).eq('id', em.id)
                            toast.success('PDF adjuntado')
                            fetchData()
                          }}/>
                        </label>
                      )}
                    </div>

                    {/* Vehicles */}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                      <p style={{fontSize:'12px',fontWeight:600,color:'#374151',margin:0}}>Vehículos</p>
                      {isLocked ? (
                        <span style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',color:'#94a3b8'}}>
                          <Lock size={11}/> Bloqueado ({eEst.label})
                        </span>
                      ) : (
                        <button onClick={()=>setShowAsignarVehiculo(showAsignarVehiculo===em.id?null:em.id)}
                          style={{fontSize:'11px',padding:'3px 10px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontWeight:500}}>
                          + Agregar
                        </button>
                      )}
                    </div>
                    {em.emision_vehiculos?.length===0 && <p style={{fontSize:'13px',color:'#94a3b8',marginBottom:'8px'}}>Sin vehículos asignados</p>}
                    {em.emision_vehiculos?.map(ev=>(
                      <div key={ev.id} style={{display:'flex',gap:'8px',padding:'8px 10px',background:'white',borderRadius:'6px',border:'1px solid #f1f5f9',marginBottom:'4px',fontSize:'13px',alignItems:'center',cursor:'pointer'}}
                        onClick={()=>navigate('/vehiculos',{state:{openVehiculoId:ev.vehiculos?.id,fromPolizaId:poliza.id}})}>
                        <Car size={14} color="#1A6BBA"/>
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
                            <Car size={13} color="#1A6BBA"/>
                            <span style={{flex:1,fontSize:'12px',fontWeight:500}}>{v.marca} {v.modelo} {v.anio} — {fp(v)}</span>
                            <button onClick={()=>asignarVehiculo(v.id, em.id)}
                              style={{padding:'3px 10px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'11px',fontWeight:500}}>Asignar</button>
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
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'12px',marginBottom:'16px'}}>
            {[['Pagado','Q '+totalPagado.toLocaleString(),'#22c55e'],['Pendiente','Q '+totalPendiente.toLocaleString(),'#f59e0b'],['Total reqs',reqs.length,'#1A6BBA']].map(([label,val,color])=>(
              <div key={label} style={{background:'white',borderRadius:'10px',padding:'14px',border:'1px solid #e2e8f0',borderLeft:`4px solid ${color}`}}>
                <p style={{fontSize:'12px',color:'#64748b',margin:0}}>{label}</p>
                <p style={{fontSize:'16px',fontWeight:700,color,margin:'4px 0 0'}}>{val}</p>
              </div>
            ))}
          </div>
          <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid #f1f5f9'}}>
              <h3 style={{fontSize:'15px',fontWeight:600,color:'#0C1E3D',margin:0}}>Requerimientos de pago</h3>
              <button onClick={()=>setShowReqForm(!showReqForm)}
                style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 14px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'6px',fontSize:'13px',cursor:'pointer'}}>
                <Plus size={13}/> Nuevo req.
              </button>
            </div>
            {showReqForm && (
              <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>
                <form onSubmit={handleReqSubmit}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'12px',marginBottom:'12px'}}>
                    <div>
                      <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Monto por cuota (Q) *</label>
                      <input type="number" step="0.01" value={reqForm.monto} onChange={e=>setReqForm({...reqForm,monto:e.target.value})} required style={inputStyle}/>
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Fecha primer vencimiento *</label>
                      <input type="date" value={reqForm.fecha_vencimiento} onChange={e=>setReqForm({...reqForm,fecha_vencimiento:e.target.value})} required style={inputStyle}/>
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Número de cuotas</label>
                      <input type="number" min="1" max="24" value={reqForm.total_cuotas} onChange={e=>setReqForm({...reqForm,total_cuotas:e.target.value})} style={inputStyle}/>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'8px'}}>
                    <button type="submit" style={{padding:'8px 16px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'6px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>Generar requerimientos</button>
                    <button type="button" onClick={()=>setShowReqForm(false)} style={{padding:'8px 14px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'13px',cursor:'pointer'}}>Cancelar</button>
                  </div>
                </form>
              </div>
            )}
            {reqs.length===0 ? <p style={{padding:'24px',color:'#94a3b8',textAlign:'center'}}>Sin requerimientos</p> :
             reqs.map((r,i)=>(
              <div key={r.id} style={{display:'flex',alignItems:'center',padding:'12px 20px',borderBottom:i<reqs.length-1?'1px solid #f1f5f9':'none'}}>
                <div style={{flex:1}}>
                  <p style={{fontWeight:600,color:'#0C1E3D',fontSize:'13px',margin:0}}>{r.codigo} <span style={{fontWeight:400,color:'#64748b'}}>· {r.numero_cuota}/{r.total_cuotas}</span></p>
                  <p style={{fontSize:'12px',color:'#64748b',margin:0}}>Vence: {new Date(r.fecha_vencimiento).toLocaleDateString('es-GT')}{r.fecha_pago?' · Pagado: '+new Date(r.fecha_pago).toLocaleDateString('es-GT'):''}</p>
                </div>
                <p style={{fontSize:'14px',fontWeight:700,color:'#1e293b',marginRight:'12px',margin:'0 12px 0 0'}}>Q {parseFloat(r.monto||0).toLocaleString()}</p>
                <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',marginRight:'8px',
                  background:r.estado==='pagado'?'#dcfce7':r.estado==='vencido'?'#fef2f2':'#fef9c3',
                  color:r.estado==='pagado'?'#15803d':r.estado==='vencido'?'#ef4444':'#a16207',fontWeight:500}}>
                  {r.estado}
                </span>
                {r.estado!=='pagado' && <button onClick={()=>marcarPagado(r.id)} style={{padding:'5px 10px',background:'#dcfce7',color:'#15803d',border:'none',borderRadius:'6px',fontSize:'12px',fontWeight:500,cursor:'pointer'}}>Marcar pagado</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─ TAB: Tareas ─ */}
      {activeTab === 'tareas' && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9'}}>
            <h3 style={{fontSize:'15px',fontWeight:600,color:'#0C1E3D',margin:0}}>Tareas pendientes</h3>
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

      {/* ─ Modal: Emitir póliza ─ */}
      {showEmitirModal && (
        <>
          <div onClick={()=>setShowEmitirModal(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300}}/>
          <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'white',borderRadius:'16px',padding:'28px',width:'90%',maxWidth:'460px',zIndex:301,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <h2 style={{fontSize:'18px',fontWeight:700,color:'#0C1E3D',margin:'0 0 6px'}}>Emitir póliza</h2>
            <p style={{fontSize:'13px',color:'#64748b',margin:'0 0 20px'}}>Ingresa el número de póliza asignado por la aseguradora. Se creará la primera emisión automáticamente con los vehículos de la solicitud.</p>
            <form onSubmit={handleEmitir}>
              <div style={{marginBottom:'14px'}}>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'6px'}}>Número de póliza *</label>
                <input value={emitirForm.numero_poliza} onChange={e=>setEmitirForm({...emitirForm,numero_poliza:e.target.value})}
                  placeholder="Ej: POL-2025-001234" required autoFocus
                  style={{width:'100%',padding:'10px 12px',border:'2px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',background:'white',color:'#1e293b',boxSizing:'border-box'}}/>
              </div>
              <div style={{marginBottom:'20px'}}>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'6px'}}>PDF de la póliza <span style={{fontWeight:400,color:'#94a3b8'}}>(opcional)</span></label>
                <label style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 14px',border:'2px dashed #e2e8f0',borderRadius:'8px',cursor:'pointer',background:emitirPdfFile?'#f0fdf4':'white'}}>
                  <Upload size={16} color={emitirPdfFile?'#15803d':'#94a3b8'}/>
                  <span style={{fontSize:'13px',color:emitirPdfFile?'#15803d':'#94a3b8'}}>
                    {emitirPdfFile ? emitirPdfFile.name : 'Seleccionar PDF...'}
                  </span>
                  <input type="file" accept=".pdf" style={{display:'none'}} onChange={e=>setEmitirPdfFile(e.target.files[0]||null)}/>
                </label>
              </div>
              <div style={{background:'#eff6ff',borderRadius:'8px',padding:'12px 14px',marginBottom:'20px',display:'flex',gap:'8px'}}>
                <CheckCircle size={14} color='#1d4ed8' style={{flexShrink:0,marginTop:'1px'}}/>
                <div style={{fontSize:'12px',color:'#1d4ed8'}}>
                  <p style={{margin:'0 0 2px',fontWeight:600}}>Al emitir se creará automáticamente:</p>
                  <p style={{margin:0}}>· Primera emisión ({poliza.fecha_inicio ? new Date(poliza.fecha_inicio).toLocaleDateString('es-GT') : '—'} → {vencDate ? new Date(poliza.fecha_vencimiento).toLocaleDateString('es-GT') : '—'})</p>
                  {solicitudVehiculos.length > 0 && <p style={{margin:0}}>· {solicitudVehiculos.length} vehículo(s) asignados a la emisión</p>}
                </div>
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <button type="submit" disabled={uploadingPdf} style={{flex:1,padding:'11px',background:uploadingPdf?'#86efac':'#15803d',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:700,cursor:uploadingPdf?'wait':'pointer'}}>
                  {uploadingPdf ? 'Subiendo PDF...' : '✓ Confirmar emisión'}
                </button>
                <button type="button" onClick={()=>setShowEmitirModal(false)} style={{padding:'11px 20px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

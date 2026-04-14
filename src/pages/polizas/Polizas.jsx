import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { FileText, Plus, Search, ArrowLeft, Edit2, Trash2, ChevronDown, ChevronUp, CheckCircle, Clock, AlertCircle, Car, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'

const fraccionamientoOpciones = [2,6,8,10,12]
const emisionTipos = { emision:'Emision', inclusion:'Inclusion', exclusion:'Exclusion', renovacion:'Renovacion' }
const estadoColors = { solicitada:'#f59e0b', reproceso:'#ef4444', emitida:'#22c55e' }
const estadoIcons = { solicitada: Clock, reproceso: AlertCircle, emitida: CheckCircle }
const emptyPoliza = { numero_poliza:'', cliente_id:'', aseguradora_id:'', producto_id:'', persona_facturable_id:'', prima_total:'', tipo_pago:'contado', fraccionamiento:'', fecha_inicio:'', fecha_vencimiento:'', vigencia:'1anio' }
const emptyEmision = { tipo:'emision', prima_emision:'', fraccionamiento:'', fecha_inicio:'', fecha_fin:'', notas:'' }
const emptyReq = { monto:'', fecha_vencimiento:'', total_cuotas:1 }

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

export default function Polizas() {
  const [polizas, setPolizas] = useState([])
  const [clientes, setClientes] = useState([])
  const [aseguradoras, setAseguradoras] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyPoliza)
  const [editing, setEditing] = useState(null)
  const [productosFiltered, setProductosFiltered] = useState([])
  const [personasFacturables, setPersonasFacturables] = useState([])
  const location = useLocation()

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (location.state?.openPolizaId && polizas.length > 0) {
      const p = polizas.find(p => p.id === location.state.openPolizaId)
      if (p) { setSelected(p); setView('detalle') }
    }
  }, [location.state, polizas])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: polizasData }, { data: clientesData }, { data: aseguradorasData }] = await Promise.all([
      supabase.from('polizas').select('*, clientes(nombre, apellido), aseguradoras(nombre, logo_url), productos(nombre)').eq('activa', true).order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nombre, apellido, tipo').eq('activo', true).order('nombre'),
      supabase.from('aseguradoras').select('id, nombre, logo_url, productos(id, nombre, activo)').eq('activa', true).order('nombre')
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
    if (id) {
      const cliente = clientes.find(c => c.id === id)
      const { data } = await supabase.from('personas_facturables').select('*').eq('cliente_id', id).eq('activa', true)
      const clienteOption = cliente ? [{ id: id, nombre: cliente.nombre, apellido: cliente.apellido || '', nit: cliente.nit || '', _isCliente: true }] : []
      setPersonasFacturables([...clienteOption, ...(data || [])])
    } else setPersonasFacturables([])
  }

  const handleFechaInicioChange = (fecha) => {
    let fechaVenc = ''
    if (fecha && form.vigencia === '1anio') {
      const d = new Date(fecha)
      d.setFullYear(d.getFullYear() + 1)
      fechaVenc = d.toISOString().split('T')[0]
    }
    setForm(f => ({ ...f, fecha_inicio: fecha, fecha_vencimiento: fechaVenc }))
  }

  const handleVigenciaChange = (vigencia) => {
    let fechaVenc = form.fecha_vencimiento
    if (vigencia === '1anio' && form.fecha_inicio) {
      const d = new Date(form.fecha_inicio)
      d.setFullYear(d.getFullYear() + 1)
      fechaVenc = d.toISOString().split('T')[0]
    } else if (vigencia === 'manual') {
      fechaVenc = ''
    }
    setForm(f => ({ ...f, vigencia, fecha_vencimiento: fechaVenc }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.persona_facturable_id) { toast.error('Selecciona una persona facturable'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      numero_poliza: form.numero_poliza || null,
      cliente_id: form.cliente_id,
      aseguradora_id: form.aseguradora_id,
      producto_id: form.producto_id,
      persona_facturable_id: form.persona_facturable_id || null,
      prima_total: parseFloat(form.prima_total),
      tipo_pago: form.tipo_pago,
      fraccionamiento: form.tipo_pago === 'financiado' ? form.fraccionamiento : 'anual',
      fecha_inicio: form.fecha_inicio,
      fecha_vencimiento: form.fecha_vencimiento,
      agente_id: user?.id
    }
    if (!payload.numero_poliza) delete payload.numero_poliza
    if (editing) {
      const { error } = await supabase.from('polizas').update(payload).eq('id', editing)
      if (error) { toast.error('Error: ' + error.message); return }
      toast.success('Poliza actualizada')
    } else {
      const { error } = await supabase.from('polizas').insert(payload)
      if (error) { toast.error('Error: ' + error.message); return }
      toast.success('Poliza creada')
    }
    setForm(emptyPoliza)
    setEditing(null)
    setView('list')
    fetchAll()
  }

  const handleEdit = async (p) => {
    const aseg = aseguradoras.find(a => a.id === p.aseguradora_id)
    setProductosFiltered(aseg?.productos?.filter(prod=>prod.activo) || [])
    if (p.cliente_id) {
      const cliente = clientes.find(c => c.id === p.cliente_id)
      const { data } = await supabase.from('personas_facturables').select('*').eq('cliente_id', p.cliente_id).eq('activa', true)
      const clienteOption = cliente ? [{ id: p.cliente_id, nombre: cliente.nombre, apellido: cliente.apellido || '', nit: cliente.nit || '', _isCliente: true }] : []
      setPersonasFacturables([...clienteOption, ...(data || [])])
    }
    setForm({ numero_poliza:p.numero_poliza||'', cliente_id:p.cliente_id, aseguradora_id:p.aseguradora_id, producto_id:p.producto_id, persona_facturable_id:p.persona_facturable_id||'', prima_total:p.prima_total, tipo_pago:p.tipo_pago||'contado', fraccionamiento:p.fraccionamiento||'', fecha_inicio:p.fecha_inicio, fecha_vencimiento:p.fecha_vencimiento, vigencia:'manual' })
    setEditing(p.id)
    setView('form')
    window.scrollTo(0,0)
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminar poliza?')) return
    await supabase.from('polizas').update({ activa: false }).eq('id', id)
    toast.success('Poliza eliminada')
    fetchAll()
  }

  const hoy = new Date()
  const en30dias = new Date()
  en30dias.setDate(en30dias.getDate() + 30)

  const getEstadoPoliza = (p) => {
    const venc = new Date(p.fecha_vencimiento)
    if (venc < hoy) return 'vencida'
    if (venc <= en30dias) return 'por_vencer'
    return 'activa'
  }

  const filtered = polizas.filter(p => {
    const matchSearch = ((p.numero_poliza||'')+' '+(p.clientes?.nombre||'')+' '+(p.clientes?.apellido||'')+' '+(p.aseguradoras?.nombre||'')).toLowerCase().includes(search.toLowerCase())
    const estado = getEstadoPoliza(p)
    const matchEstado = filtroEstado === 'todas' || estado === filtroEstado
    return matchSearch && matchEstado
  })

  const counts = {
    todas: polizas.length,
    activa: polizas.filter(p => getEstadoPoliza(p) === 'activa').length,
    por_vencer: polizas.filter(p => getEstadoPoliza(p) === 'por_vencer').length,
    vencida: polizas.filter(p => getEstadoPoliza(p) === 'vencida').length,
  }

  const inputStyle = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', background:'white', color:'#1e293b', boxSizing:'border-box' }

  if (view === 'detalle' && selected) return (
    <PolizaDetalle poliza={selected} onBack={()=>{setView('list');fetchAll()}} onEdit={handleEdit} />
  )

  if (view === 'form') return (
    <div>
      <button onClick={()=>{setView('list');setEditing(null);setForm(emptyPoliza)}} style={{display:'flex',alignItems:'center',gap:'6px',color:'#64748b',background:'none',border:'none',cursor:'pointer',fontSize:'14px',marginBottom:'20px',padding:'0'}}>
        <ArrowLeft size={16}/> Volver a polizas
      </button>
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',maxWidth:'800px'}}>
        <div style={{padding:'20px 24px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)'}}>
          <h2 style={{fontSize:'18px',fontWeight:700,color:'white',margin:0}}>{editing ? 'Editar poliza' : 'Nueva poliza'}</h2>
          <p style={{fontSize:'13px',color:'rgba(255,255,255,0.7)',marginTop:'4px',marginBottom:0}}>Completa la informacion de la poliza</p>
        </div>
        <div style={{padding:'24px'}}>
          <form onSubmit={handleSubmit}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Numero de poliza <span style={{color:'#94a3b8',fontWeight:400}}>(brindado por aseguradora)</span></label>
                <input value={form.numero_poliza} onChange={e=>setForm({...form,numero_poliza:e.target.value})} placeholder="Ej: POL-2024-001" style={inputStyle}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Cliente *</label>
                <SearchSelect value={form.cliente_id} onChange={handleClienteChange} options={clientes} placeholder="Buscar cliente..."
                  renderOption={c=>`${c.nombre} ${c.apellido||''}`} labelKey="nombre"/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Persona facturable *</label>
                <SearchSelect value={form.persona_facturable_id} onChange={val=>setForm({...form,persona_facturable_id:val})}
                  options={personasFacturables} placeholder={form.cliente_id ? "Selecciona persona facturable..." : "Primero selecciona un cliente"}
                  renderOption={p=>`${p.nombre} ${p.apellido}${p.nit ? ' - ' + p.nit : ''}`} labelKey="nombre"/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Aseguradora *</label>
                <SearchSelect value={form.aseguradora_id} onChange={handleAseguradoraChange} options={aseguradoras} placeholder="Buscar aseguradora..."
                  renderOption={a=>(
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      {a.logo_url && <img src={a.logo_url} style={{width:'18px',height:'18px',objectFit:'contain',borderRadius:'2px'}}/>}
                      <span>{a.nombre}</span>
                    </div>
                  )} labelKey="nombre"/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Producto *</label>
                <SearchSelect value={form.producto_id} onChange={val=>setForm({...form,producto_id:val})}
                  options={productosFiltered} placeholder={form.aseguradora_id?"Seleccionar producto...":"Primero selecciona aseguradora"} labelKey="nombre"/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Prima total (Q) *</label>
                <input type="number" step="0.01" value={form.prima_total} onChange={e=>setForm({...form,prima_total:e.target.value})} required style={inputStyle}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Tipo de pago *</label>
                <div style={{display:'flex',gap:'8px'}}>
                  {['contado','financiado'].map(t=>(
                    <button key={t} type="button" onClick={()=>setForm({...form,tipo_pago:t,fraccionamiento:''})}
                      style={{flex:1,padding:'10px',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',
                        background:form.tipo_pago===t?'#0C1E3D':'white',
                        color:form.tipo_pago===t?'white':'#64748b',
                        border:`1px solid ${form.tipo_pago===t?'#0C1E3D':'#e2e8f0'}`}}>
                      {t.charAt(0).toUpperCase()+t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {form.tipo_pago==='financiado' && (
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Numero de cuotas *</label>
                  <div style={{display:'flex',gap:'6px'}}>
                    {fraccionamientoOpciones.map(n=>(
                      <button key={n} type="button" onClick={()=>setForm({...form,fraccionamiento:String(n)})}
                        style={{flex:1,padding:'9px 0',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',
                          background:form.fraccionamiento===String(n)?'#1A6BBA':'white',
                          color:form.fraccionamiento===String(n)?'white':'#64748b',
                          border:`1px solid ${form.fraccionamiento===String(n)?'#1A6BBA':'#e2e8f0'}`}}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Fecha inicio *</label>
                <input type="date" value={form.fecha_inicio} onChange={e=>handleFechaInicioChange(e.target.value)} required style={inputStyle}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Vigencia *</label>
                <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
                  {[['1anio','1 Año'],['manual','Manual']].map(([v,l])=>(
                    <button key={v} type="button" onClick={()=>handleVigenciaChange(v)}
                      style={{flex:1,padding:'9px',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',
                        background:form.vigencia===v?'#0C1E3D':'white',
                        color:form.vigencia===v?'white':'#64748b',
                        border:`1px solid ${form.vigencia===v?'#0C1E3D':'#e2e8f0'}`}}>
                      {l}
                    </button>
                  ))}
                </div>
                {form.vigencia==='manual' ? (
                  <input type="date" value={form.fecha_vencimiento} onChange={e=>setForm({...form,fecha_vencimiento:e.target.value})} required style={inputStyle}/>
                ) : (
                  <div style={{padding:'10px 12px',background:'#f8fafc',borderRadius:'8px',border:'1px solid #e2e8f0',fontSize:'14px',color:'#64748b'}}>
                    {form.fecha_vencimiento ? new Date(form.fecha_vencimiento).toLocaleDateString('es-GT') : 'Selecciona fecha inicio'}
                  </div>
                )}
              </div>
            </div>
            <div style={{display:'flex',gap:'8px',paddingTop:'8px',borderTop:'1px solid #f1f5f9'}}>
              <button type="submit" style={{padding:'11px 24px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
                {editing ? 'Actualizar poliza' : 'Crear poliza'}
              </button>
              <button type="button" onClick={()=>{setView('list');setEditing(null);setForm(emptyPoliza)}}
                style={{padding:'11px 24px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {/* Encabezado con gradiente */}
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'20px'}}>
        <div style={{padding:'20px 24px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{textAlign:'left'}}>
            <h1 style={{fontSize:'22px',fontWeight:700,color:'white',margin:0}}>Polizas</h1>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:'14px',marginTop:'4px',marginBottom:0}}>
              {counts.todas} total · {counts.activa} activas · {counts.por_vencer} por vencer · {counts.vencida} vencidas
            </p>
          </div>
          <button onClick={()=>{setView('form');setEditing(null);setForm(emptyPoliza);setProductosFiltered([])}}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 20px',background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
            <Plus size={16}/> Nueva poliza
          </button>
        </div>
      </div>

      {/* Buscador y filtros */}
      <div style={{background:'white',borderRadius:'12px',padding:'14px 16px',border:'1px solid #e2e8f0',marginBottom:'16px',display:'flex',gap:'12px',flexWrap:'wrap',alignItems:'center'}}>
        <div style={{flex:1,minWidth:'200px',position:'relative'}}>
          <Search size={16} color="#94a3b8" style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por numero, cliente o aseguradora..."
            style={{width:'100%',padding:'9px 12px 9px 36px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',background:'white',color:'#1e293b',boxSizing:'border-box'}}/>
        </div>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
          {[
            ['todas','Todas','#64748b'],
            ['activa','Activas','#22c55e'],
            ['por_vencer','Por vencer','#f59e0b'],
            ['vencida','Vencidas','#ef4444'],
          ].map(([key,label,color])=>(
            <button key={key} onClick={()=>setFiltroEstado(key)}
              style={{padding:'7px 14px',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontWeight:500,
                background: filtroEstado===key ? '#0C1E3D' : 'white',
                color: filtroEstado===key ? 'white' : '#64748b',
                border: `1px solid ${filtroEstado===key ? '#0C1E3D' : '#e2e8f0'}`}}>
              {label} {filtroEstado===key ? '' : `(${counts[key]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
        {loading ? <p style={{padding:'24px',color:'#64748b'}}>Cargando...</p> :
         filtered.length===0 ? (
          <div style={{padding:'48px',textAlign:'center'}}>
            <FileText size={32} color="#cbd5e1" style={{marginBottom:'12px'}}/>
            <p style={{color:'#94a3b8'}}>No hay polizas registradas</p>
          </div>
        ) : filtered.map((p,i)=>{
          const estado = getEstadoPoliza(p)
          const estadoBadge = {
            activa: { bg:'#dcfce7', color:'#15803d', label:'Activa' },
            por_vencer: { bg:'#fef9c3', color:'#a16207', label:'Por vencer' },
            vencida: { bg:'#fef2f2', color:'#ef4444', label:'Vencida' },
          }[estado]
          return (
            <div key={p.id} style={{display:'flex',alignItems:'center',padding:'14px 20px',borderBottom:i<filtered.length-1?'1px solid #f1f5f9':'none',cursor:'pointer'}}
              onClick={()=>{setSelected(p);setView('detalle')}}
              onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
              onMouseLeave={e=>e.currentTarget.style.background='white'}>
              <div style={{width:'40px',height:'40px',borderRadius:'8px',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px',overflow:'hidden',background:'#f8fafc',flexShrink:0}}>
                {p.aseguradoras?.logo_url?<img src={p.aseguradoras.logo_url} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<FileText size={16} color="#1A6BBA"/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontWeight:700,color:'#0C1E3D',fontSize:'14px',margin:0}}>{p.numero_poliza||'Sin numero'}</p>
                <p style={{fontSize:'12px',color:'#64748b',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.clientes?.nombre} {p.clientes?.apellido||''} · {p.aseguradoras?.nombre}</p>
              </div>
              <div style={{textAlign:'right',marginRight:'16px',flexShrink:0}}>
                <p style={{fontSize:'14px',fontWeight:700,color:'#1A6BBA',margin:0}}>Q {parseFloat(p.prima_total||0).toLocaleString()}</p>
                <p style={{fontSize:'11px',color:'#64748b',margin:0}}>{p.tipo_pago==='financiado'?`${p.fraccionamiento} cuotas`:'Contado'}</p>
              </div>
              <div style={{textAlign:'right',marginRight:'12px',flexShrink:0}}>
                <p style={{fontSize:'12px',color:'#64748b',margin:0}}>Vence: {new Date(p.fecha_vencimiento).toLocaleDateString('es-GT')}</p>
              </div>
              <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',marginRight:'12px',background:estadoBadge.bg,color:estadoBadge.color,fontWeight:500,flexShrink:0,whiteSpace:'nowrap'}}>
                {estadoBadge.label}
              </span>
              <div style={{display:'flex',gap:'6px',flexShrink:0}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>handleEdit(p)} style={{padding:'6px',background:'#f1f5f9',border:'none',borderRadius:'6px',cursor:'pointer'}}><Edit2 size={14} color="#64748b"/></button>
                <button onClick={()=>handleDelete(p.id)} style={{padding:'6px',background:'#fef2f2',border:'none',borderRadius:'6px',cursor:'pointer'}}><Trash2 size={14} color="#ef4444"/></button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PolizaDetalle({ poliza, onBack, onEdit }) {
  const [emisiones, setEmisiones] = useState([])
  const [reqs, setReqs] = useState([])
  const [vehiculosDisponibles, setVehiculosDisponibles] = useState([])
  const [tareas, setTareas] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('emisiones')
  const [showEmisionForm, setShowEmisionForm] = useState(false)
  const [showReqForm, setShowReqForm] = useState(false)
  const [showAsignarVehiculo, setShowAsignarVehiculo] = useState(null)
  const [emisionForm, setEmisionForm] = useState(emptyEmision)
  const [reqForm, setReqForm] = useState(emptyReq)
  const [expandedEmision, setExpandedEmision] = useState(null)
  const [vehiculoSearch, setVehiculoSearch] = useState('')

  useEffect(() => { fetchData() }, [poliza.id])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: emisionesData }, { data: reqsData }, { data: tareasData }, { data: vDisp }] = await Promise.all([
      supabase.from('emisiones').select('*, emision_vehiculos(vehiculos(*))').eq('poliza_id', poliza.id).order('created_at'),
      supabase.from('requerimientos_pago').select('*').eq('poliza_id', poliza.id).order('fecha_vencimiento'),
      supabase.from('tareas').select('*').eq('poliza_id', poliza.id).eq('estado', 'pendiente'),
      supabase.from('vehiculos').select('*').eq('cliente_id', poliza.cliente_id).eq('activo', true).is('poliza_id', null)
    ])
    setEmisiones(emisionesData || [])
    setReqs(reqsData || [])
    setTareas(tareasData || [])
    setVehiculosDisponibles(vDisp || [])
    setLoading(false)
  }

  const handleEmisionSubmit = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('emisiones').insert({
      poliza_id: poliza.id,
      ...emisionForm,
      numero_emision: `${poliza.numero_poliza||'POL'}-E${(emisiones.length+1).toString().padStart(2,'0')}`,
      prima_emision: parseFloat(emisionForm.prima_emision),
      created_by: user?.id
    })
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Emision creada')
    setEmisionForm(emptyEmision)
    setShowEmisionForm(false)
    fetchData()
  }

  const asignarVehiculo = async (vehiculoId, emisionId) => {
    const { data: check } = await supabase.from('vehiculos').select('poliza_id').eq('id', vehiculoId).single()
    if (check?.poliza_id) { toast.error('Este vehiculo ya esta asignado a una poliza vigente'); return }
    const { error: evError } = await supabase.from('emision_vehiculos').insert({ emision_id: emisionId, vehiculo_id: vehiculoId })
    if (evError) { toast.error('Error al asignar'); return }
    await supabase.from('vehiculos').update({ poliza_id: poliza.id }).eq('id', vehiculoId)
    toast.success('Vehiculo asignado')
    setShowAsignarVehiculo(null)
    setVehiculoSearch('')
    fetchData()
  }

  const quitarVehiculo = async (vehiculoId, emisionVehiculoId) => {
    await supabase.from('emision_vehiculos').delete().eq('id', emisionVehiculoId)
    await supabase.from('vehiculos').update({ poliza_id: null }).eq('id', vehiculoId)
    toast.success('Vehiculo removido')
    fetchData()
  }

  const handleReqSubmit = async (e) => {
    e.preventDefault()
    if (emisiones.length === 0) { toast.error('Primero crea una emision'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: codigoData } = await supabase.rpc('generate_codigo_req')
    const codigo = codigoData || 'REQ-' + Date.now()
    const monto = parseFloat(reqForm.monto)
    const totalCuotas = parseInt(reqForm.total_cuotas)
    const emisionId = emisiones[emisiones.length-1].id
    const requerimientos = []
    for (let i = 0; i < totalCuotas; i++) {
      const fecha = new Date(reqForm.fecha_vencimiento)
      fecha.setMonth(fecha.getMonth() + i)
      requerimientos.push({
        emision_id: emisionId, poliza_id: poliza.id,
        codigo: i === 0 ? codigo : `${codigo}-${i}`,
        codigo_matriz: i === 0 ? null : codigo,
        numero_cuota: i + 1, total_cuotas: totalCuotas,
        monto, fecha_vencimiento: fecha.toISOString().split('T')[0],
        created_by: user?.id
      })
    }
    const { error } = await supabase.from('requerimientos_pago').insert(requerimientos)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(`${totalCuotas} requerimiento(s) creado(s)`)
    setReqForm(emptyReq)
    setShowReqForm(false)
    fetchData()
  }

  const marcarPagado = async (id) => {
    await supabase.from('requerimientos_pago').update({ estado: 'pagado', fecha_pago: new Date().toISOString().split('T')[0] }).eq('id', id)
    toast.success('Marcado como pagado')
    fetchData()
  }

  const actualizarEstadoEmision = async (id, estado) => {
    await supabase.from('emisiones').update({ estado }).eq('id', id)
    fetchData()
  }

  const totalPagado = reqs.filter(r=>r.estado==='pagado').reduce((s,r)=>s+parseFloat(r.monto||0),0)
  const totalPendiente = reqs.filter(r=>r.estado!=='pagado').reduce((s,r)=>s+parseFloat(r.monto||0),0)
  const totalVehiculos = emisiones.reduce((s,em)=>s+(em.emision_vehiculos?.length||0),0)
  const inputStyle = { width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:'6px', fontSize:'13px', background:'white', color:'#1e293b', boxSizing:'border-box' }

  const hoy = new Date()
  const vencDate = new Date(poliza.fecha_vencimiento)
  const diasRestantes = Math.ceil((vencDate - hoy) / (1000*60*60*24))
  const estadoPoliza = vencDate < hoy ? 'vencida' : diasRestantes <= 30 ? 'por_vencer' : 'activa'
  const estadoBadge = {
    activa: { bg:'#dcfce7', color:'#15803d', label:'Activa' },
    por_vencer: { bg:'#fef9c3', color:'#a16207', label:`Por vencer (${diasRestantes}d)` },
    vencida: { bg:'#fef2f2', color:'#ef4444', label:'Vencida' },
  }[estadoPoliza]

  return (
    <div>
      <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:'6px',color:'#64748b',background:'none',border:'none',cursor:'pointer',fontSize:'14px',marginBottom:'20px',padding:'0'}}>
        <ArrowLeft size={16}/> Volver a polizas
      </button>

      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'16px'}}>
        <div style={{padding:'20px 24px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
            <div style={{width:'52px',height:'52px',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'rgba(255,255,255,0.15)',flexShrink:0}}>
              {poliza.aseguradoras?.logo_url?<img src={poliza.aseguradoras.logo_url} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<FileText size={22} color="white"/>}
            </div>
            <div>
              <h1 style={{fontSize:'20px',fontWeight:700,color:'white',margin:0}}>{poliza.numero_poliza||'Sin numero'}</h1>
              <p style={{fontSize:'13px',color:'rgba(255,255,255,0.7)',margin:'4px 0 0'}}>{poliza.clientes?.nombre} {poliza.clientes?.apellido||''} · {poliza.aseguradoras?.nombre} · {poliza.productos?.nombre}</p>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
            <span style={{fontSize:'12px',padding:'4px 12px',borderRadius:'20px',background:estadoBadge.bg,color:estadoBadge.color,fontWeight:600}}>
              {estadoBadge.label}
            </span>
            <button onClick={()=>onEdit(poliza)} style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 16px',background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
              <Edit2 size={13}/> Editar
            </button>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',padding:'16px 24px'}}>
          {[
            ['Prima total','Q '+parseFloat(poliza.prima_total||0).toLocaleString(),'#1A6BBA'],
            ['Tipo de pago',(poliza.tipo_pago||'contado').charAt(0).toUpperCase()+(poliza.tipo_pago||'contado').slice(1),'#0C1E3D'],
            ['Inicio',new Date(poliza.fecha_inicio).toLocaleDateString('es-GT'),'#64748b'],
            ['Vencimiento',new Date(poliza.fecha_vencimiento).toLocaleDateString('es-GT'),estadoPoliza==='vencida'?'#ef4444':estadoPoliza==='por_vencer'?'#a16207':'#64748b']
          ].map(([label,val,color])=>(
            <div key={label} style={{background:'#f8fafc',borderRadius:'8px',padding:'12px'}}>
              <p style={{fontSize:'11px',color:'#64748b',marginBottom:'4px',margin:0}}>{label}</p>
              <p style={{fontSize:'15px',fontWeight:700,color,margin:'4px 0 0'}}>{val}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
        {[['emisiones',`Emisiones (${emisiones.length})`],['vehiculos',`Vehiculos (${totalVehiculos})`],['pagos',`Pagos (${reqs.length})`],['tareas',`Tareas (${tareas.length})`]].map(([tab,label])=>(
          <button key={tab} onClick={()=>setActiveTab(tab)}
            style={{padding:'8px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',
              background:activeTab===tab?'#0C1E3D':'white',color:activeTab===tab?'white':'#64748b',
              border:`1px solid ${activeTab===tab?'#0C1E3D':'#e2e8f0'}`}}>
            {label}
          </button>
        ))}
      </div>

      {activeTab==='emisiones' && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid #f1f5f9'}}>
            <h3 style={{fontSize:'15px',fontWeight:600,color:'#0C1E3D',margin:0}}>Emisiones</h3>
            <button onClick={()=>setShowEmisionForm(!showEmisionForm)}
              style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 14px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'6px',fontSize:'13px',cursor:'pointer'}}>
              <Plus size={13}/> Nueva emision
            </button>
          </div>
          {showEmisionForm && (
            <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>
              <form onSubmit={handleEmisionSubmit}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
                  <div>
                    <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Tipo</label>
                    <select value={emisionForm.tipo} onChange={e=>setEmisionForm({...emisionForm,tipo:e.target.value})} style={{...inputStyle,padding:'8px 10px'}}>
                      {Object.entries(emisionTipos).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Prima emision (Q) *</label>
                    <input type="number" step="0.01" value={emisionForm.prima_emision} onChange={e=>setEmisionForm({...emisionForm,prima_emision:e.target.value})} required style={inputStyle}/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Fecha inicio *</label>
                    <input type="date" value={emisionForm.fecha_inicio} onChange={e=>setEmisionForm({...emisionForm,fecha_inicio:e.target.value})} required style={inputStyle}/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Fecha fin *</label>
                    <input type="date" value={emisionForm.fecha_fin} onChange={e=>setEmisionForm({...emisionForm,fecha_fin:e.target.value})} required style={inputStyle}/>
                  </div>
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Notas</label>
                    <input value={emisionForm.notas} onChange={e=>setEmisionForm({...emisionForm,notas:e.target.value})} style={inputStyle}/>
                  </div>
                </div>
                <div style={{display:'flex',gap:'8px'}}>
                  <button type="submit" style={{padding:'8px 16px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'6px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>Crear emision</button>
                  <button type="button" onClick={()=>setShowEmisionForm(false)} style={{padding:'8px 14px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'13px',cursor:'pointer'}}>Cancelar</button>
                </div>
              </form>
            </div>
          )}
          {loading?<p style={{padding:'20px',color:'#64748b'}}>Cargando...</p>:
           emisiones.length===0?<p style={{padding:'24px',color:'#94a3b8',textAlign:'center'}}>Sin emisiones</p>:
           emisiones.map(em=>{
            const Icon=estadoIcons[em.estado]||Clock
            return (
              <div key={em.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                <div style={{display:'flex',alignItems:'center',padding:'14px 20px',cursor:'pointer'}} onClick={()=>setExpandedEmision(expandedEmision===em.id?null:em.id)}>
                  <div style={{width:'34px',height:'34px',borderRadius:'8px',background:estadoColors[em.estado]+'20',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'10px',flexShrink:0}}>
                    <Icon size={15} color={estadoColors[em.estado]}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontWeight:600,color:'#0C1E3D',fontSize:'13px',margin:0}}>{em.numero_emision} — {emisionTipos[em.tipo]}</p>
                    <p style={{fontSize:'12px',color:'#64748b',margin:0}}>{new Date(em.fecha_inicio).toLocaleDateString('es-GT')} → {new Date(em.fecha_fin).toLocaleDateString('es-GT')} · {em.emision_vehiculos?.length||0} vehiculos</p>
                  </div>
                  <p style={{fontSize:'14px',fontWeight:700,color:'#1A6BBA',marginRight:'12px',flexShrink:0}}>Q {parseFloat(em.prima_emision||0).toLocaleString()}</p>
                  <div style={{display:'flex',gap:'4px',marginRight:'8px',flexShrink:0}}>
                    {['solicitada','reproceso','emitida'].map(s=>(
                      <button key={s} onClick={e=>{e.stopPropagation();actualizarEstadoEmision(em.id,s)}}
                        style={{padding:'3px 7px',borderRadius:'4px',fontSize:'11px',fontWeight:500,cursor:'pointer',
                          background:em.estado===s?estadoColors[s]:'white',color:em.estado===s?'white':estadoColors[s],
                          border:`1px solid ${estadoColors[s]}`}}>
                        {s.charAt(0).toUpperCase()+s.slice(1)}
                      </button>
                    ))}
                  </div>
                  {expandedEmision===em.id?<ChevronUp size={16} color="#64748b"/>:<ChevronDown size={16} color="#64748b"/>}
                </div>
                {expandedEmision===em.id && (
                  <div style={{padding:'12px 20px 16px',background:'#f8fafc'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                      <p style={{fontSize:'12px',fontWeight:600,color:'#374151',margin:0}}>Vehiculos asignados</p>
                      <button onClick={()=>setShowAsignarVehiculo(showAsignarVehiculo===em.id?null:em.id)}
                        style={{fontSize:'11px',padding:'3px 10px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontWeight:500}}>
                        + Asignar vehiculo
                      </button>
                    </div>
                    {em.emision_vehiculos?.length===0&&<p style={{fontSize:'13px',color:'#94a3b8',marginBottom:'8px'}}>Sin vehiculos asignados</p>}
                    {em.emision_vehiculos?.map(ev=>(
                      <div key={ev.vehiculos?.id} style={{display:'flex',gap:'8px',padding:'8px 10px',background:'white',borderRadius:'6px',border:'1px solid #f1f5f9',marginBottom:'4px',fontSize:'13px',alignItems:'center'}}>
                        <Car size={14} color="#1A6BBA"/>
                        <span style={{fontWeight:500,flex:1}}>{ev.vehiculos?.marca} {ev.vehiculos?.modelo} {ev.vehiculos?.anio}</span>
                        <span style={{color:'#64748b'}}>Placa: {ev.vehiculos?.placa||'N/A'}</span>
                        <button onClick={()=>quitarVehiculo(ev.vehiculos?.id, ev.id)}
                          style={{padding:'2px 8px',background:'#fef2f2',color:'#ef4444',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'11px'}}>
                          Quitar
                        </button>
                      </div>
                    ))}
                    {showAsignarVehiculo===em.id && (
                      <div style={{marginTop:'8px',padding:'10px',background:'white',borderRadius:'8px',border:'1px solid #e2e8f0'}}>
                        <input value={vehiculoSearch} onChange={e=>setVehiculoSearch(e.target.value)} placeholder="Buscar vehiculo disponible..."
                          style={{width:'100%',padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'12px',marginBottom:'8px',background:'white',color:'#1e293b',boxSizing:'border-box'}}/>
                        {vehiculosDisponibles.filter(v=>(v.marca+' '+v.modelo+' '+(v.placa||'')).toLowerCase().includes(vehiculoSearch.toLowerCase())).length===0
                          ? <p style={{fontSize:'12px',color:'#94a3b8',textAlign:'center',padding:'8px'}}>No hay vehiculos disponibles para este cliente</p>
                          : vehiculosDisponibles.filter(v=>(v.marca+' '+v.modelo+' '+(v.placa||'')).toLowerCase().includes(vehiculoSearch.toLowerCase())).map(v=>(
                          <div key={v.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'6px',border:'1px solid #f1f5f9',marginBottom:'4px',background:'#f8fafc'}}>
                            <Car size={13} color="#1A6BBA"/>
                            <span style={{flex:1,fontSize:'12px',fontWeight:500}}>{v.marca} {v.modelo} {v.anio} — {v.placa||'Sin placa'}</span>
                            <button onClick={()=>asignarVehiculo(v.id, em.id)}
                              style={{padding:'3px 10px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'11px',fontWeight:500}}>
                              Asignar
                            </button>
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
      )}

      {activeTab==='vehiculos' && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',padding:'20px 24px'}}>
          <h3 style={{fontSize:'15px',fontWeight:600,color:'#0C1E3D',marginBottom:'16px',margin:0}}>Vehiculos en esta poliza</h3>
          {emisiones.every(em=>!em.emision_vehiculos?.length) ? <p style={{color:'#94a3b8',fontSize:'14px',textAlign:'center',padding:'16px 0'}}>Sin vehiculos asignados. Asignalos desde la pestana de Emisiones.</p> :
           emisiones.filter(em=>em.emision_vehiculos?.length>0).map(em=>(
            <div key={em.id} style={{marginBottom:'16px'}}>
              <p style={{fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'8px'}}>{em.numero_emision} — {emisionTipos[em.tipo]}</p>
              {em.emision_vehiculos.map(ev=>(
                <div key={ev.vehiculos?.id} style={{display:'flex',alignItems:'center',padding:'12px 16px',background:'#f8fafc',borderRadius:'8px',border:'1px solid #f1f5f9',marginBottom:'6px'}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'8px',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px',flexShrink:0}}>
                    <Car size={16} color="#1A6BBA"/>
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontWeight:600,color:'#0C1E3D',fontSize:'14px',margin:0}}>{ev.vehiculos?.marca} {ev.vehiculos?.modelo} {ev.vehiculos?.anio}</p>
                    <p style={{fontSize:'12px',color:'#64748b',margin:0}}>{ev.vehiculos?.tipo} · Placa: {ev.vehiculos?.placa||'N/A'} · Color: {ev.vehiculos?.color||'N/A'}</p>
                  </div>
                  {ev.vehiculos?.valor_asegurado>0&&<p style={{fontSize:'13px',fontWeight:600,color:'#1A6BBA',margin:0}}>Q {parseFloat(ev.vehiculos.valor_asegurado).toLocaleString()}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {activeTab==='pagos' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'16px'}}>
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
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'12px'}}>
                    <div>
                      <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Monto por cuota (Q) *</label>
                      <input type="number" step="0.01" value={reqForm.monto} onChange={e=>setReqForm({...reqForm,monto:e.target.value})} required style={inputStyle}/>
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Fecha primer vencimiento *</label>
                      <input type="date" value={reqForm.fecha_vencimiento} onChange={e=>setReqForm({...reqForm,fecha_vencimiento:e.target.value})} required style={inputStyle}/>
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Numero de cuotas</label>
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
            {reqs.length===0?<p style={{padding:'24px',color:'#94a3b8',textAlign:'center'}}>Sin requerimientos</p>:
             reqs.map((r,i)=>(
              <div key={r.id} style={{display:'flex',alignItems:'center',padding:'12px 20px',borderBottom:i<reqs.length-1?'1px solid #f1f5f9':'none'}}>
                <div style={{flex:1}}>
                  <p style={{fontWeight:600,color:'#0C1E3D',fontSize:'13px',margin:0}}>{r.codigo} <span style={{fontWeight:400,color:'#64748b'}}>· {r.numero_cuota}/{r.total_cuotas}</span></p>
                  <p style={{fontSize:'12px',color:'#64748b',margin:0}}>Vence: {new Date(r.fecha_vencimiento).toLocaleDateString('es-GT')}{r.fecha_pago?' · Pagado: '+new Date(r.fecha_pago).toLocaleDateString('es-GT'):''}</p>
                </div>
                <p style={{fontSize:'14px',fontWeight:700,color:'#1e293b',marginRight:'12px',margin:0}}>Q {parseFloat(r.monto||0).toLocaleString()}</p>
                <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',marginRight:'8px',
                  background:r.estado==='pagado'?'#dcfce7':r.estado==='vencido'?'#fef2f2':'#fef9c3',
                  color:r.estado==='pagado'?'#15803d':r.estado==='vencido'?'#ef4444':'#a16207',fontWeight:500}}>
                  {r.estado}
                </span>
                {r.estado!=='pagado'&&<button onClick={()=>marcarPagado(r.id)} style={{padding:'5px 10px',background:'#dcfce7',color:'#15803d',border:'none',borderRadius:'6px',fontSize:'12px',fontWeight:500,cursor:'pointer'}}>Marcar pagado</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab==='tareas' && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9'}}>
            <h3 style={{fontSize:'15px',fontWeight:600,color:'#0C1E3D',margin:0}}>Tareas pendientes</h3>
          </div>
          {tareas.length===0?<p style={{padding:'24px',color:'#94a3b8',textAlign:'center'}}>Sin tareas pendientes</p>:
           tareas.map((t,i)=>(
            <div key={t.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 20px',borderBottom:i<tareas.length-1?'1px solid #f1f5f9':'none'}}>
              <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:t.tipo==='automatica'?'#dbeafe':'#f0fdf4',color:t.tipo==='automatica'?'#1d4ed8':'#15803d',flexShrink:0}}>{t.tipo}</span>
              <p style={{flex:1,fontSize:'13px',color:'#1e293b',margin:0}}>{t.titulo}</p>
              {t.fecha_vencimiento&&<p style={{fontSize:'12px',color:new Date(t.fecha_vencimiento)<new Date()?'#ef4444':'#64748b',flexShrink:0,margin:0}}>{new Date(t.fecha_vencimiento).toLocaleDateString('es-GT')}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
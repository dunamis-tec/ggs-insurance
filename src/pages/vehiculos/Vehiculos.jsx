import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Car, Plus, Edit2, Trash2, Search, ArrowLeft, FileText, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const tiposVehiculo = ['sedan','pickup','suv','van','moto','camion','otro']
const emptyForm = { marca:'', modelo:'', anio:'', placa:'', chasis:'', motor:'', color:'', tipo:'sedan', valor_asegurado:'' }
const estadoColors = { solicitada:'#f59e0b', reproceso:'#ef4444', emitida:'#22c55e' }
const tipoLabels = { emision:'Emision', inclusion:'Inclusion', exclusion:'Exclusion', renovacion:'Renovacion' }

function ClienteSearchSelect({ value, onChange, clientes }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const selected = clientes.find(c => c.id === value)
  const filtered = clientes.filter(c =>
    `${c.nombre} ${c.apellido||''}`.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div style={{position:'relative'}}>
      <div onClick={()=>setOpen(!open)} style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box',background:'white',color:'#1e293b',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:'42px'}}>
        <span style={{color:selected?'#1e293b':'#94a3b8'}}>
          {selected ? `${selected.nombre} ${selected.apellido||''}` : 'Buscar cliente...'}
        </span>
        <div style={{display:'flex',gap:'4px',flexShrink:0}}>
          {value && <button type="button" onClick={e=>{e.stopPropagation();onChange('')}} style={{background:'none',border:'none',cursor:'pointer',padding:'0',display:'flex'}}><X size={13} color="#94a3b8"/></button>}
        </div>
      </div>
      {open && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'white',border:'1px solid #e2e8f0',borderRadius:'8px',zIndex:200,boxShadow:'0 8px 24px rgba(0,0,0,0.12)'}}>
          <div style={{padding:'8px'}}>
            <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre..."
              style={{width:'100%',padding:'8px 10px',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'13px',boxSizing:'border-box',outline:'none',background:'white',color:'#1e293b'}}
              onClick={e=>e.stopPropagation()}/>
          </div>
          <div style={{maxHeight:'200px',overflowY:'auto'}}>
            {filtered.length===0 ? <p style={{padding:'10px 14px',fontSize:'13px',color:'#94a3b8'}}>Sin resultados</p> :
             filtered.map(c=>(
              <div key={c.id} onClick={()=>{onChange(c.id);setOpen(false);setSearch('')}}
                style={{padding:'10px 14px',cursor:'pointer',fontSize:'13px',color:'#1e293b',fontWeight:value===c.id?600:400,background:value===c.id?'#dbeafe':'white'}}
                onMouseEnter={e=>{if(value!==c.id)e.currentTarget.style.background='#f8fafc'}}
                onMouseLeave={e=>{if(value!==c.id)e.currentTarget.style.background='white'}}>
                {c.nombre} {c.apellido||''}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [clienteId, setClienteId] = useState('')
  const [editing, setEditing] = useState(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: vData }, { data: cData }] = await Promise.all([
      supabase.from('vehiculos').select('*, clientes(nombre, apellido), polizas(numero_poliza, activa)').eq('activo', true).order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nombre, apellido').eq('activo', true).order('nombre')
    ])
    setVehiculos(vData || [])
    setClientes(cData || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!clienteId) { toast.error('Selecciona un cliente'); return }
    if (!form.marca) { toast.error('La marca es obligatoria'); return }
    if (!form.modelo) { toast.error('El modelo es obligatorio'); return }
    if (!form.placa) { toast.error('La placa es obligatoria'); return }

    if (form.placa) {
      const { data: existePlaca } = await supabase.from('vehiculos').select('id').eq('placa', form.placa).eq('activo', true).neq('id', editing || '')
      if (existePlaca?.length > 0) { toast.error('Ya existe un vehiculo con esa placa'); return }
    }
    if (form.chasis) {
      const { data: existeChasis } = await supabase.from('vehiculos').select('id').eq('chasis', form.chasis).eq('activo', true).neq('id', editing || '')
      if (existeChasis?.length > 0) { toast.error('Ya existe un vehiculo con ese numero de chasis (VIN)'); return }
    }

    const payload = { ...form, cliente_id: clienteId, anio: parseInt(form.anio), valor_asegurado: parseFloat(form.valor_asegurado || 0) }
    if (editing) {
      const { error } = await supabase.from('vehiculos').update(payload).eq('id', editing)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Vehiculo actualizado')
    } else {
      const { error } = await supabase.from('vehiculos').insert(payload)
      if (error) { toast.error('Error al crear'); return }
      toast.success('Vehiculo creado')
    }
    setForm(emptyForm)
    setClienteId('')
    setEditing(null)
    setView('list')
    fetchAll()
  }

  const handleEdit = (v) => {
    setForm({ marca:v.marca, modelo:v.modelo, anio:v.anio, placa:v.placa||'', chasis:v.chasis||'', motor:v.motor||'', color:v.color||'', tipo:v.tipo||'sedan', valor_asegurado:v.valor_asegurado||'' })
    setClienteId(v.cliente_id)
    setEditing(v.id)
    setView('form')
    window.scrollTo(0,0)
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminar vehiculo?')) return
    await supabase.from('vehiculos').update({ activo: false }).eq('id', id)
    toast.success('Vehiculo eliminado')
    fetchAll()
  }

  const filtered = vehiculos.filter(v =>
    (v.marca+' '+v.modelo+' '+v.anio+' '+(v.placa||'')+' '+(v.clientes?.nombre||'')).toLowerCase().includes(search.toLowerCase())
  )

  const inp = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', background:'white', color:'#1e293b', boxSizing:'border-box' }
  const labelStyle = { display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'4px' }

  if (view === 'detalle' && selected) return (
    <VehiculoDetalle vehiculo={selected} onBack={()=>{ setSelected(null); setView('list'); fetchAll() }} onEdit={handleEdit} />
  )

  if (view === 'form') return (
    <div>
      <button onClick={()=>{ setView('list'); setEditing(null); setForm(emptyForm); setClienteId('') }}
        style={{display:'flex',alignItems:'center',gap:'6px',color:'#64748b',background:'none',border:'none',cursor:'pointer',fontSize:'14px',marginBottom:'20px',padding:'0'}}>
        <ArrowLeft size={16}/> Volver a vehiculos
      </button>
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',maxWidth:'800px'}}>
        <div style={{padding:'20px 24px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)'}}>
          <h2 style={{fontSize:'18px',fontWeight:700,color:'white',margin:0}}>{editing ? 'Editar vehiculo' : 'Nuevo vehiculo'}</h2>
          <p style={{fontSize:'13px',color:'rgba(255,255,255,0.7)',marginTop:'4px',marginBottom:0}}>Completa la informacion del vehiculo</p>
        </div>
        <div style={{padding:'24px'}}>
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:'16px'}}>
              <label style={labelStyle}>Cliente propietario *</label>
              <ClienteSearchSelect value={clienteId} onChange={setClienteId} clientes={clientes} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
              <div>
                <label style={labelStyle}>Marca *</label>
                <input value={form.marca} onChange={e=>setForm({...form,marca:e.target.value})} required style={inp} placeholder="Ej: Toyota"/>
              </div>
              <div>
                <label style={labelStyle}>Modelo *</label>
                <input value={form.modelo} onChange={e=>setForm({...form,modelo:e.target.value})} required style={inp} placeholder="Ej: Hilux"/>
              </div>
              <div>
                <label style={labelStyle}>Placa *</label>
                <input value={form.placa} onChange={e=>setForm({...form,placa:e.target.value})} required style={inp} placeholder="Ej: P-123ABC"/>
              </div>
              <div>
                <label style={labelStyle}>Año</label>
                <input type="number" value={form.anio} onChange={e=>setForm({...form,anio:e.target.value})} style={inp} placeholder="Ej: 2022"/>
              </div>
              <div>
                <label style={labelStyle}>No. Chasis / VIN</label>
                <input value={form.chasis} onChange={e=>setForm({...form,chasis:e.target.value})} style={inp}/>
              </div>
              <div>
                <label style={labelStyle}>No. Motor</label>
                <input value={form.motor} onChange={e=>setForm({...form,motor:e.target.value})} style={inp}/>
              </div>
              <div>
                <label style={labelStyle}>Color</label>
                <input value={form.color} onChange={e=>setForm({...form,color:e.target.value})} style={inp}/>
              </div>
              <div>
                <label style={labelStyle}>Valor asegurado (Q)</label>
                <input type="number" step="0.01" value={form.valor_asegurado} onChange={e=>setForm({...form,valor_asegurado:e.target.value})} style={inp}/>
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} style={inp}>
                  {tiposVehiculo.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'flex',gap:'8px',paddingTop:'16px',borderTop:'1px solid #f1f5f9'}}>
              <button type='submit' style={{padding:'11px 24px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
                {editing ? 'Actualizar' : 'Crear vehiculo'}
              </button>
              <button type='button' onClick={()=>{ setView('list'); setEditing(null); setForm(emptyForm); setClienteId('') }}
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
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'20px'}}>
        <div style={{padding:'20px 24px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
            <div style={{width:'44px',height:'44px',borderRadius:'10px',background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Car size={22} color='white'/>
            </div>
            <div>
              <h1 style={{fontSize:'22px',fontWeight:700,color:'white',margin:0}}>Vehiculos</h1>
              <p style={{color:'rgba(255,255,255,0.7)',fontSize:'14px',marginTop:'4px',marginBottom:0}}>
                {vehiculos.length} vehiculos · {vehiculos.filter(v=>v.polizas?.activa).length} en poliza activa
              </p>
            </div>
          </div>
          <button onClick={()=>{ setView('form'); setEditing(null); setForm(emptyForm); setClienteId('') }}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 20px',background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
            <Plus size={16}/> Nuevo vehiculo
          </button>
        </div>
      </div>

      <div style={{background:'white',borderRadius:'12px',padding:'14px 16px',border:'1px solid #e2e8f0',marginBottom:'16px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} color='#94a3b8' style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar por marca, modelo, placa, cliente...'
            style={{width:'100%',padding:'9px 12px 9px 36px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',background:'white',color:'#1e293b',boxSizing:'border-box'}}/>
        </div>
      </div>

      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
        {loading ? <p style={{padding:'24px',color:'#64748b'}}>Cargando...</p> :
          filtered.length === 0 ? (
            <div style={{padding:'48px',textAlign:'center'}}>
              <Car size={32} color='#cbd5e1' style={{marginBottom:'12px'}}/>
              <p style={{color:'#94a3b8'}}>No hay vehiculos registrados</p>
            </div>
          ) : filtered.map((v,i) => {
            const enPoliza = v.polizas?.activa
            return (
              <div key={v.id} style={{display:'flex',alignItems:'center',padding:'14px 20px',borderBottom:i<filtered.length-1?'1px solid #f1f5f9':'none',cursor:'pointer'}}
                onClick={()=>{ setSelected(v); setView('detalle') }}
                onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e=>e.currentTarget.style.background='white'}>
                <div style={{width:'40px',height:'40px',borderRadius:'8px',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px',flexShrink:0}}>
                  <Car size={18} color='#1A6BBA'/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontWeight:700,color:'#0C1E3D',fontSize:'14px',margin:0}}>{v.marca} {v.modelo} {v.anio}</p>
                  <p style={{fontSize:'12px',color:'#64748b',margin:0}}>{v.clientes?.nombre} {v.clientes?.apellido||''} · Placa: {v.placa||'N/A'} · {v.tipo}</p>
                </div>
                {v.valor_asegurado > 0 && <p style={{fontSize:'13px',fontWeight:600,color:'#1A6BBA',marginRight:'12px',margin:0,flexShrink:0}}>Q {parseFloat(v.valor_asegurado).toLocaleString()}</p>}
                <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',marginRight:'12px',background:enPoliza?'#dcfce7':'#f1f5f9',color:enPoliza?'#15803d':'#64748b',fontWeight:500,flexShrink:0}}>
                  {enPoliza ? 'En poliza activa' : 'Disponible'}
                </span>
                <div style={{display:'flex',gap:'6px',flexShrink:0}} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>handleEdit(v)} style={{padding:'6px',background:'#f1f5f9',border:'none',borderRadius:'6px',cursor:'pointer'}}><Edit2 size={14} color='#64748b'/></button>
                  <button onClick={()=>handleDelete(v.id)} disabled={!!enPoliza}
                    style={{padding:'6px',background:enPoliza?'#f8fafc':'#fef2f2',border:'none',borderRadius:'6px',cursor:enPoliza?'not-allowed':'pointer',opacity:enPoliza?0.5:1}}>
                    <Trash2 size={14} color='#ef4444'/>
                  </button>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

function VehiculoDetalle({ vehiculo, onBack, onEdit }) {
  const navigate = useNavigate()
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchHistorial() }, [vehiculo.id])

  const fetchHistorial = async () => {
    setLoading(true)
    const { data } = await supabase.from('emision_vehiculos')
      .select('*, emisiones(id, numero_emision, tipo, estado, fecha_inicio, fecha_fin, poliza_id, polizas(id, numero_poliza, clientes(nombre, apellido)))')
      .eq('vehiculo_id', vehiculo.id)
      .order('created_at', { ascending: false })
    setHistorial(data || [])
    setLoading(false)
  }

  return (
    <div>
      <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:'6px',color:'#64748b',background:'none',border:'none',cursor:'pointer',fontSize:'14px',marginBottom:'20px',padding:'0'}}>
        <ArrowLeft size={16}/> Volver a vehiculos
      </button>

      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'16px'}}>
        <div style={{padding:'20px 24px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
            <div style={{width:'52px',height:'52px',borderRadius:'12px',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Car size={24} color='white'/>
            </div>
            <div>
              <h1 style={{fontSize:'20px',fontWeight:700,color:'white',margin:0}}>{vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}</h1>
              <p style={{fontSize:'13px',color:'rgba(255,255,255,0.7)',margin:'4px 0 0'}}>{vehiculo.clientes?.nombre} {vehiculo.clientes?.apellido||''} · {vehiculo.tipo}</p>
            </div>
          </div>
          <button onClick={()=>onEdit(vehiculo)} style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 16px',background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',flexShrink:0}}>
            <Edit2 size={13}/> Editar
          </button>
        </div>
        <div style={{padding:'16px 24px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px'}}>
          {[['Placa',vehiculo.placa||'N/A'],['Chasis / VIN',vehiculo.chasis||'N/A'],['Motor',vehiculo.motor||'N/A'],['Color',vehiculo.color||'N/A']].map(([label,val])=>(
            <div key={label} style={{background:'#f8fafc',borderRadius:'8px',padding:'10px 14px'}}>
              <p style={{fontSize:'11px',color:'#64748b',margin:0}}>{label}</p>
              <p style={{fontSize:'14px',fontWeight:600,color:'#1e293b',margin:'3px 0 0'}}>{val}</p>
            </div>
          ))}
        </div>
        {vehiculo.valor_asegurado > 0 && (
          <div style={{padding:'0 24px 16px'}}>
            <div style={{padding:'10px 14px',background:'#dbeafe',borderRadius:'8px',display:'inline-block'}}>
              <p style={{fontSize:'11px',color:'#1d4ed8',margin:0}}>Valor asegurado</p>
              <p style={{fontSize:'16px',fontWeight:700,color:'#1d4ed8',margin:'3px 0 0'}}>Q {parseFloat(vehiculo.valor_asegurado).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:'8px'}}>
          <FileText size={16} color='#1A6BBA'/>
          <h3 style={{fontSize:'15px',fontWeight:600,color:'#0C1E3D',margin:0}}>Historial de polizas y emisiones</h3>
          <span style={{marginLeft:'auto',background:'#dbeafe',color:'#1d4ed8',fontSize:'12px',padding:'2px 8px',borderRadius:'20px'}}>{historial.length}</span>
        </div>
        {loading ? <p style={{padding:'20px',color:'#64748b'}}>Cargando...</p> :
          historial.length === 0 ? (
            <div style={{padding:'48px',textAlign:'center'}}>
              <FileText size={28} color='#cbd5e1' style={{marginBottom:'10px'}}/>
              <p style={{color:'#94a3b8',margin:0}}>Sin historial de polizas</p>
            </div>
          ) : historial.map((h,i) => (
            <div key={h.id} style={{display:'flex',alignItems:'center',padding:'14px 20px',borderBottom:i<historial.length-1?'1px solid #f1f5f9':'none',cursor:'pointer'}}
              onClick={()=>navigate('/polizas', { state: { openPolizaId: h.emisiones?.polizas?.id } })}
              onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
              onMouseLeave={e=>e.currentTarget.style.background='white'}>
              <div style={{flex:1}}>
                <p style={{fontWeight:600,color:'#0C1E3D',fontSize:'14px',margin:0}}>{h.emisiones?.polizas?.numero_poliza||'Sin numero'}</p>
                <p style={{fontSize:'12px',color:'#64748b',margin:0}}>
                  {h.emisiones?.numero_emision} · {tipoLabels[h.emisiones?.tipo]||h.emisiones?.tipo} · {h.emisiones?.polizas?.clientes?.nombre}
                </p>
                <p style={{fontSize:'11px',color:'#94a3b8',marginTop:'2px',marginBottom:0}}>
                  {h.emisiones?.fecha_inicio ? new Date(h.emisiones.fecha_inicio).toLocaleDateString('es-GT') : ''} → {h.emisiones?.fecha_fin ? new Date(h.emisiones.fecha_fin).toLocaleDateString('es-GT') : ''}
                </p>
              </div>
              <span style={{fontSize:'12px',padding:'4px 12px',borderRadius:'20px',fontWeight:500,background:estadoColors[h.emisiones?.estado]+'20',color:estadoColors[h.emisiones?.estado],marginRight:'8px'}}>
                {h.emisiones?.estado}
              </span>
              <span style={{fontSize:'12px',color:'#94a3b8'}}>Ver poliza →</span>
            </div>
          ))}
      </div>
    </div>
  )
}
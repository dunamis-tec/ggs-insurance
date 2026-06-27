import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Car, Plus, Edit2, Trash2, Search, ArrowLeft, FileText, X, Paperclip, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'
import { ReclamoModal, ReclamosMiniList } from '../reclamos/Reclamos'

const tiposVehiculo = ['sedan','pickup','suv','van','moto','camion','otro']
const tiposPlaca = ['M','C','P','CD','A','MI','TC']
const emptyForm = { marca:'', modelo:'', anio:'', placa:'', tipo_placa:'', chasis:'', motor:'', color:'', tipo:'sedan', valor_asegurado:'' }
const placaRegex = /^\d{3}[A-Z]{3}$/
const fp = (v) => v?.tipo_placa ? `${v.tipo_placa}${v?.placa||''}` : (v?.placa || 'N/A')
const estadoColors = { solicitada:'#f59e0b', reproceso:'#ef4444', emitida:'#22c55e' }
const tipoLabels = { emision:'Emision', inclusion:'Inclusion', exclusion:'Exclusion', renovacion:'Renovacion' }

function ClienteSearchSelect({ value, onChange, clientes }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const selected = clientes.find(c => c.id === value)
  const getNombre = c => c.tipo === 'empresa' ? (c.razon_social || c.nombre_empresa || c.nombre || '') : `${c.nombre||''} ${c.apellido||''}`.trim()
  const filtered = clientes.filter(c =>
    getNombre(c).toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div style={{position:'relative'}}>
      <div onClick={()=>setOpen(!open)} style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box',background:'white',color:'#1e293b',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:'42px'}}>
        <span style={{color:selected?'#1e293b':'#94a3b8'}}>
          {selected ? getNombre(selected) : 'Buscar cliente...'}
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
                {getNombre(c)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const getNombreCliente = (c) => c?.tipo === 'empresa' ? (c.razon_social || c.nombre_empresa || c.nombre || '') : `${c?.nombre||''} ${c?.apellido||''}`.trim()

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
  const [placaError, setPlacaError] = useState('')
  const [chasisError, setChasisError] = useState('')
  const location = useLocation()
  const fromClienteId = location.state?.fromClienteId || null
  const fromPolizaId  = location.state?.fromPolizaId  || null

  useEffect(() => { fetchAll() }, [])

  // Auto-open vehicle detail when navigated from a client
  useEffect(() => {
    if (location.state?.openVehiculoId && vehiculos.length > 0) {
      const v = vehiculos.find(x => x.id === location.state.openVehiculoId)
      if (v) { setSelected(v); setView('detalle') }
    }
  }, [location.state, vehiculos])

  // Reset to list when navigating to /vehiculos root (e.g. clicking nav link from a detail)
  useEffect(() => {
    if (location.pathname === '/vehiculos' && !location.state?.openVehiculoId && view !== 'list') {
      setView('list'); setSelected(null)
    }
  }, [location.pathname])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: vData }, { data: cData }] = await Promise.all([
      supabase.from('vehiculos').select('*, clientes(nombre, apellido, tipo, razon_social, nombre_empresa), polizas(numero_poliza, activa)').eq('activo', true).order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nombre, apellido, tipo, razon_social, nombre_empresa').eq('activo', true).order('nombre')
    ])
    setVehiculos(vData || [])
    setClientes(cData || [])
    setLoading(false)
  }

  const checkPlacaDuplicado = async (placa) => {
    if (!placa) return
    if (!placaRegex.test(placa)) { setPlacaError('Formato inválido. Usa 3 números seguidos de 3 letras (ej: 123ABC)'); return }
    const { data } = await supabase.from('vehiculos').select('id').eq('placa', placa).eq('activo', true).neq('id', editing || '')
    setPlacaError(data?.length > 0 ? 'Esta placa ya está registrada' : '')
  }

  const checkChasisDuplicado = async (chasis) => {
    if (!chasis) { setChasisError(''); return }
    const { data } = await supabase.from('vehiculos').select('id').eq('chasis', chasis).eq('activo', true).neq('id', editing || '')
    setChasisError(data?.length > 0 ? 'Este número de chasis/VIN ya está registrado' : '')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!clienteId) { toast.error('Selecciona un cliente'); return }
    if (!form.marca) { toast.error('La marca es obligatoria'); return }
    if (!form.modelo) { toast.error('El modelo es obligatorio'); return }
    if (!form.placa) { toast.error('La placa es obligatoria'); return }
    if (!placaRegex.test(form.placa)) { toast.error('Formato de placa inválido. Usa 123ABC (3 números + 3 letras)'); return }
    if (placaError || chasisError) { toast.error('Corrige los errores antes de continuar'); return }

    if (form.placa) {
      const { data: existePlaca } = await supabase.from('vehiculos').select('id').eq('placa', form.placa).eq('activo', true).neq('id', editing || '')
      if (existePlaca?.length > 0) { setPlacaError('Esta placa ya está registrada'); return }
    }
    if (form.chasis) {
      const { data: existeChasis } = await supabase.from('vehiculos').select('id').eq('chasis', form.chasis).eq('activo', true).neq('id', editing || '')
      if (existeChasis?.length > 0) { setChasisError('Este número de chasis/VIN ya está registrado'); return }
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
    setPlacaError('')
    setChasisError('')
    setView('list')
    fetchAll()
  }

  const handleEdit = (v) => {
    setForm({ marca:v.marca, modelo:v.modelo, anio:v.anio, placa:v.placa||'', tipo_placa:v.tipo_placa||'', chasis:v.chasis||'', motor:v.motor||'', color:v.color||'', tipo:v.tipo||'sedan', valor_asegurado:v.valor_asegurado||'' })
    setClienteId(v.cliente_id)
    setEditing(v.id)
    setPlacaError('')
    setChasisError('')
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
    (v.marca+' '+v.modelo+' '+v.anio+' '+fp(v)+' '+getNombreCliente(v.clientes)).toLowerCase().includes(search.toLowerCase())
  )

  const inp = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', background:'white', color:'#1e293b', boxSizing:'border-box' }
  const labelStyle = { display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'4px' }

  if (view === 'detalle' && selected) return (
    <VehiculoDetalle vehiculo={selected} fromClienteId={fromClienteId} fromPolizaId={fromPolizaId} onBack={()=>{ setSelected(null); setView('list'); fetchAll() }} onEdit={handleEdit} />
  )

  if (view === 'form') return (
    <div>
      <button onClick={()=>{ setView('list'); setEditing(null); setForm(emptyForm); setClienteId(''); setPlacaError(''); setChasisError('') }}
        style={{display:'flex',alignItems:'center',gap:'6px',color:'#64748b',background:'none',border:'none',cursor:'pointer',fontSize:'14px',marginBottom:'20px',padding:'0'}}>
        <ArrowLeft size={16}/> Volver a vehiculos
      </button>
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
        <div style={{padding:'20px 24px',borderBottom:'1px solid #f1f5f9'}}>
          <h2 style={{fontSize:'18px',fontWeight:700,color:'#111111',margin:0}}>{editing ? 'Editar vehículo' : 'Nuevo vehículo'}</h2>
          <p style={{fontSize:'13px',color:'#6B6B62',marginTop:'4px',marginBottom:0}}>Completa la información del vehículo</p>
        </div>
        <div style={{padding:'24px'}}>
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:'16px'}}>
              <label style={labelStyle}>Cliente propietario *</label>
              <ClienteSearchSelect value={clienteId} onChange={setClienteId} clientes={clientes} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'16px',marginBottom:'16px'}}>
              <div>
                <label style={labelStyle}>Marca *</label>
                <input value={form.marca} onChange={e=>setForm({...form,marca:e.target.value})} required style={inp} placeholder="Ej: Toyota"/>
              </div>
              <div>
                <label style={labelStyle}>Modelo *</label>
                <input value={form.modelo} onChange={e=>setForm({...form,modelo:e.target.value})} required style={inp} placeholder="Ej: Hilux"/>
              </div>
              <div>
                <label style={labelStyle}>Tipo de placa *</label>
                <select value={form.tipo_placa} onChange={e=>setForm({...form,tipo_placa:e.target.value})} required style={inp}>
                  <option value="">Selecciona tipo...</option>
                  {tiposPlaca.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Placa * <span style={{color:'#94a3b8',fontWeight:400,fontSize:'12px'}}>(formato: 123ABC)</span></label>
                <input value={form.placa}
                  onChange={e=>{ const v=e.target.value.toUpperCase().replace(/[^0-9A-Z]/g,''); setForm({...form,placa:v}); setPlacaError('') }}
                  onBlur={e=>checkPlacaDuplicado(e.target.value)}
                  required maxLength={6}
                  style={{...inp, borderColor: placaError ? '#ef4444' : '#e2e8f0', background: placaError ? '#fef2f2' : 'white'}}
                  placeholder="Ej: 123ABC"/>
                {placaError && <p style={{color:'#ef4444',fontSize:'12px',margin:'4px 0 0'}}>{placaError}</p>}
              </div>
              <div>
                <label style={labelStyle}>Año</label>
                <input type="number" value={form.anio} onChange={e=>setForm({...form,anio:e.target.value})} style={inp} placeholder="Ej: 2022"/>
              </div>
              <div>
                <label style={labelStyle}>No. Chasis / VIN</label>
                <input value={form.chasis}
                  onChange={e=>{ setForm({...form,chasis:e.target.value}); setChasisError('') }}
                  onBlur={e=>checkChasisDuplicado(e.target.value)}
                  style={{...inp, borderColor: chasisError ? '#ef4444' : '#e2e8f0', background: chasisError ? '#fef2f2' : 'white'}}/>
                {chasisError && <p style={{color:'#ef4444',fontSize:'12px',margin:'4px 0 0'}}>{chasisError}</p>}
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
              <button type='submit' style={{padding:'11px 24px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
                {editing ? 'Actualizar' : 'Crear vehiculo'}
              </button>
              <button type='button' onClick={()=>{ setView('list'); setEditing(null); setForm(emptyForm); setClienteId(''); setPlacaError(''); setChasisError('') }}
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
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',marginBottom:'20px'}}>
        <div style={{padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{textAlign:'left'}}>
            <h1 style={{fontSize:'22px',fontWeight:700,color:'#111111',margin:0}}>Vehículos</h1>
            <p style={{color:'#6B6B62',fontSize:'14px',marginTop:'4px',marginBottom:0}}>
              {vehiculos.length} vehiculos · {vehiculos.filter(v=>v.polizas?.activa).length} en poliza activa
            </p>
          </div>
          <button onClick={()=>{ setView('form'); setEditing(null); setForm(emptyForm); setClienteId('') }}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 20px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
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
                  <Car size={18} color='#C4A96B'/>
                </div>
                <div style={{flex:1,minWidth:0,textAlign:'left'}}>
                  <p style={{fontWeight:700,color:'#111111',fontSize:'14px',margin:0,textAlign:'left'}}>{v.marca} {v.modelo} {v.anio}</p>
                  <p style={{fontSize:'12px',color:'#64748b',margin:0,textAlign:'left'}}>{getNombreCliente(v.clientes)} · Placa: {fp(v)} · {v.tipo}</p>
                </div>
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

function VehiculoDetalle({ vehiculo, onBack, onEdit, fromClienteId, fromPolizaId }) {
  const navigate = useNavigate()
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [documentos, setDocumentos] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [reclamos, setReclamos] = useState([])
  const [loadingReclamos, setLoadingReclamos] = useState(true)
  const [polizaVigente, setPolizaVigente] = useState(null)
  const [showReclamoModal, setShowReclamoModal] = useState(false)
  const fileInputRef = useRef(null)

  const handleBack = () => {
    if (fromPolizaId) {
      navigate('/polizas', { state: { openPolizaId: fromPolizaId } })
    } else if (fromClienteId) {
      navigate('/clientes', { state: { openClienteId: fromClienteId, fromVehiculo: true } })
    } else {
      onBack()
    }
  }

  useEffect(() => { fetchHistorial(); fetchDocumentos(); fetchReclamos() }, [vehiculo.id])

  const fetchHistorial = async () => {
    setLoading(true)
    const { data } = await supabase.from('emision_vehiculos')
      .select('*, emisiones(id, numero_emision, tipo, estado, fecha_inicio, fecha_fin, poliza_id, polizas(id, numero_poliza, clientes(nombre, apellido)))')
      .eq('vehiculo_id', vehiculo.id)
      .order('created_at', { ascending: false })
    setHistorial(data || [])
    // Detectar póliza vigente para el botón de nuevo reclamo
    const hoy = new Date().toISOString().split('T')[0]
    const vigente = (data || []).find(ev =>
      ev.emisiones?.estado === 'emitida' &&
      ev.emisiones?.polizas &&
      ev.emisiones.fecha_fin >= hoy
    )
    setPolizaVigente(vigente ? { id: vigente.emisiones.poliza_id, numero_poliza: vigente.emisiones.polizas.numero_poliza, cliente_id: vehiculo.cliente_id } : null)
    setLoading(false)
  }

  const fetchReclamos = async () => {
    setLoadingReclamos(true)
    const { data } = await supabase.from('reclamos')
      .select('*, polizas(id, numero_poliza), vehiculos(id, marca, modelo, anio, placa, tipo_placa), clientes(id, nombre, apellido)')
      .eq('vehiculo_id', vehiculo.id)
      .order('created_at', { ascending: false })
    setReclamos(data || [])
    setLoadingReclamos(false)
  }

  const fetchDocumentos = async () => {
    setLoadingDocs(true)
    const { data } = await supabase.from('vehiculo_documentos')
      .select('*')
      .eq('vehiculo_id', vehiculo.id)
      .order('created_at', { ascending: false })
    setDocumentos(data || [])
    setLoadingDocs(false)
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingDoc(true)
    const toastId = toast.loading('Subiendo documento...')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase.from('users').select('empresa_id').eq('id', user.id).single()
      const empresaId = userData.empresa_id
      const path = `${empresaId}/${vehiculo.id}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage.from('vehiculo-documentos').upload(path, file)
      if (uploadError) throw uploadError
      const ext = file.name.split('.').pop().toLowerCase()
      await supabase.from('vehiculo_documentos').insert({
        vehiculo_id: vehiculo.id,
        empresa_id: empresaId,
        nombre: file.name,
        archivo_url: path,
        tipo: ext,
        created_by: user.id,
      })
      toast.success('Documento adjuntado', { id: toastId })
      fetchDocumentos()
    } catch (err) {
      console.error(err)
      toast.error('Error al subir documento', { id: toastId })
    }
    setUploadingDoc(false)
    e.target.value = ''
  }

  const handleDownload = async (doc) => {
    const { data, error } = await supabase.storage.from('vehiculo-documentos').createSignedUrl(doc.archivo_url, 3600)
    if (error || !data?.signedUrl) { toast.error('Error al obtener el archivo'); return }
    window.open(data.signedUrl, '_blank')
  }

  const handleDeleteDoc = async (doc) => {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return
    await supabase.storage.from('vehiculo-documentos').remove([doc.archivo_url])
    await supabase.from('vehiculo_documentos').delete().eq('id', doc.id)
    toast.success('Documento eliminado')
    setDocumentos(prev => prev.filter(d => d.id !== doc.id))
  }

  return (
    <div>
      <button onClick={handleBack} style={{display:'flex',alignItems:'center',gap:'6px',color:'#64748b',background:'none',border:'none',cursor:'pointer',fontSize:'14px',marginBottom:'20px',padding:'0'}}>
        <ArrowLeft size={16}/> {fromPolizaId ? 'Volver a la póliza' : fromClienteId ? 'Volver al cliente' : 'Volver a vehiculos'}
      </button>

      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',marginBottom:'16px',overflow:'hidden'}}>
        <div style={{padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
            <div style={{width:'52px',height:'52px',borderRadius:'12px',background:'#FDF8EE',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Car size={24} color='#C4A96B'/>
            </div>
            <div>
              <h1 style={{fontSize:'20px',fontWeight:700,color:'#111111',margin:0}}>{vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}</h1>
              <p style={{fontSize:'13px',color:'#6B6B62',margin:'4px 0 0'}}>{getNombreCliente(vehiculo.clientes)} · {vehiculo.tipo}</p>
            </div>
          </div>
          <button onClick={()=>{ onEdit(vehiculo) }} style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 16px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',flexShrink:0}}>
            <Edit2 size={13}/> Editar
          </button>
        </div>
        <div style={{padding:'16px 24px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'12px'}}>
          {[['Placa',fp(vehiculo)],['Chasis / VIN',vehiculo.chasis||'N/A'],['Motor',vehiculo.motor||'N/A'],['Color',vehiculo.color||'N/A']].map(([label,val])=>(
            <div key={label} style={{background:'#f8fafc',borderRadius:'8px',padding:'10px 14px'}}>
              <p style={{fontSize:'11px',color:'#64748b',margin:0}}>{label}</p>
              <p style={{fontSize:'14px',fontWeight:600,color:'#1e293b',margin:'3px 0 0'}}>{val}</p>
            </div>
          ))}
        </div>
        {(() => {
          const lastEv = historial.find(ev => ev.emisiones?.estado === 'emitida' && ev.emisiones?.tipo === 'emision')
          const showValor = vehiculo.valor_asegurado > 0
          const showPrima = lastEv && parseFloat(lastEv.prima_total||0) > 0
          const showDanios = lastEv && parseFloat(lastEv.deducible_danios||0) > 0
          const showRobo   = lastEv && parseFloat(lastEv.deducible_robo||0) > 0
          if (!showValor && !showPrima && !showDanios && !showRobo) return null
          return (
            <div style={{padding:'0 24px 16px',display:'flex',flexWrap:'wrap',gap:'10px'}}>
              {showValor && (
                <div style={{padding:'10px 14px',background:'#dbeafe',borderRadius:'8px'}}>
                  <p style={{fontSize:'11px',color:'#1d4ed8',margin:0}}>Valor asegurado</p>
                  <p style={{fontSize:'16px',fontWeight:700,color:'#1d4ed8',margin:'3px 0 0'}}>Q {parseFloat(vehiculo.valor_asegurado).toLocaleString()}</p>
                </div>
              )}
              {showPrima && (
                <div style={{padding:'10px 14px',background:'#fef9c3',borderRadius:'8px'}}>
                  <p style={{fontSize:'11px',color:'#92400e',margin:0}}>Prima total</p>
                  <p style={{fontSize:'16px',fontWeight:700,color:'#92400e',margin:'3px 0 0'}}>Q {parseFloat(lastEv.prima_total).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
                </div>
              )}
              {showDanios && (
                <div style={{padding:'10px 14px',background:'#f0fdf4',borderRadius:'8px'}}>
                  <p style={{fontSize:'11px',color:'#15803d',margin:0}}>Ded. daños</p>
                  <p style={{fontSize:'16px',fontWeight:700,color:'#15803d',margin:'3px 0 0'}}>{parseFloat(lastEv.deducible_danios)}%</p>
                </div>
              )}
              {showRobo && (
                <div style={{padding:'10px 14px',background:'#fef2f2',borderRadius:'8px'}}>
                  <p style={{fontSize:'11px',color:'#b91c1c',margin:0}}>Ded. robo</p>
                  <p style={{fontSize:'16px',fontWeight:700,color:'#b91c1c',margin:'3px 0 0'}}>{parseFloat(lastEv.deducible_robo)}%</p>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* ── Documentos ── */}
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'16px'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:'8px'}}>
          <Paperclip size={16} color='#C4A96B'/>
          <h3 style={{fontSize:'15px',fontWeight:600,color:'#111111',margin:0}}>Documentos</h3>
          <span style={{marginLeft:'auto',background:'#f1f5f9',color:'#64748b',fontSize:'12px',padding:'2px 8px',borderRadius:'20px'}}>{documentos.length}</span>
          <input ref={fileInputRef} type="file" style={{display:'none'}} onChange={handleUpload}/>
          <button
            onClick={()=>fileInputRef.current?.click()}
            disabled={uploadingDoc}
            style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 14px',background:'#111111',color:'white',border:'none',borderRadius:'7px',fontSize:'13px',fontWeight:600,cursor:uploadingDoc?'not-allowed':'pointer',opacity:uploadingDoc?0.6:1}}>
            <Paperclip size={13}/> {uploadingDoc ? 'Subiendo...' : 'Adjuntar'}
          </button>
        </div>
        {loadingDocs ? (
          <p style={{padding:'20px',color:'#64748b',fontSize:'13px'}}>Cargando...</p>
        ) : documentos.length === 0 ? (
          <div style={{padding:'36px',textAlign:'center'}}>
            <Paperclip size={26} color='#cbd5e1' style={{marginBottom:'8px'}}/>
            <p style={{color:'#94a3b8',margin:0,fontSize:'13px'}}>Sin documentos adjuntos</p>
          </div>
        ) : documentos.map((doc, i) => {
          const ext = doc.tipo || doc.nombre.split('.').pop().toLowerCase()
          const isImg = ['jpg','jpeg','png','gif','webp'].includes(ext)
          const isPdf = ext === 'pdf'
          const iconBg = isPdf ? '#fef2f2' : isImg ? '#f0fdf4' : '#f8fafc'
          const iconColor = isPdf ? '#ef4444' : isImg ? '#22c55e' : '#64748b'
          return (
            <div key={doc.id} style={{display:'flex',alignItems:'center',padding:'12px 20px',borderBottom:i<documentos.length-1?'1px solid #f1f5f9':'none'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'8px',background:iconBg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginRight:'12px'}}>
                <FileText size={16} color={iconColor}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontWeight:600,color:'#111111',fontSize:'13px',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.nombre}</p>
                <p style={{fontSize:'11px',color:'#94a3b8',margin:'2px 0 0'}}>
                  {ext.toUpperCase()} · {new Date(doc.created_at).toLocaleDateString('es-GT')}
                </p>
              </div>
              <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                <button onClick={()=>handleDownload(doc)}
                  style={{display:'flex',alignItems:'center',gap:'5px',padding:'6px 10px',background:'#f1f5f9',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'12px',color:'#475569',fontWeight:500}}>
                  <Download size={13}/> Ver
                </button>
                <button onClick={()=>handleDeleteDoc(doc)}
                  style={{padding:'6px',background:'#fef2f2',border:'none',borderRadius:'6px',cursor:'pointer'}}>
                  <Trash2 size={13} color='#ef4444'/>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Reclamos ── */}
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'16px'}}>
        <ReclamosMiniList
          reclamos={reclamos}
          loading={loadingReclamos}
          sinPolizaVigente={!loading && !polizaVigente}
          onNuevo={polizaVigente ? () => setShowReclamoModal(true) : null}
        />
      </div>

      {/* ── Historial ── */}
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:'8px'}}>
          <FileText size={16} color='#C4A96B'/>
          <h3 style={{fontSize:'15px',fontWeight:600,color:'#111111',margin:0}}>Historial de polizas y emisiones</h3>
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
                <p style={{fontWeight:600,color:'#111111',fontSize:'14px',margin:0}}>{h.emisiones?.polizas?.numero_poliza||'Sin numero'}</p>
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

      {showReclamoModal && polizaVigente && (
        <ReclamoModal
          context={{
            tipo: 'vehiculo',
            vehiculoId: vehiculo.id,
            vehiculoData: vehiculo,
            polizaId: polizaVigente.id,
            polizaData: polizaVigente,
            clienteId: vehiculo.cliente_id,
            clienteData: vehiculo.clientes,
          }}
          onClose={() => setShowReclamoModal(false)}
          onSaved={(r) => {
            setShowReclamoModal(false)
            fetchReclamos()
            navigate('/reclamos', { state: { openReclamoId: r.id } })
          }}
        />
      )}
    </div>
  )
}
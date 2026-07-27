import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getMyEmpresaId } from '../../lib/getMyEmpresaId'
import { Building2, Plus, Trash2, Edit2, X, Upload, Search, Settings, ChevronDown, ChevronUp, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

const emptyForm = { nombre:'', nit:'', direccion:'', telefono:'', email:'', contacto_nombre:'', logo_url:'', porcentaje_gasto_emision: 5, codigo_agente: '' }

/* ─────────────────────────────────────────
   Main page
───────────────────────────────────────── */
export default function Aseguradoras() {
  const [aseguradoras, setAseguradoras]     = useState([])
  const [loading, setLoading]               = useState(true)
  const [search, setSearch]                 = useState('')

  // Modal 1 – create / edit
  const [showFormModal, setShowFormModal]   = useState(false)
  const [form, setForm]                     = useState(emptyForm)
  const [editing, setEditing]               = useState(null)
  const [uploading, setUploading]           = useState(false)
  const [logoPreview, setLogoPreview]       = useState(null)

  // Modal 2 – configure
  const [configTarget, setConfigTarget]     = useState(null) // aseguradora object

  useEffect(() => { fetchAseguradoras() }, [])

  const fetchAseguradoras = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('aseguradoras')
      .select('*, recargo_fraccionamiento(*), coberturas_catalogo(*), productos(*, coberturas(*), producto_comisiones(*), producto_coberturas_catalogo(id,cobertura_catalogo_id))')
      .eq('activa', true)
      .order('nombre')
    setAseguradoras(data || [])
    setLoading(false)
    // refresh config modal target if open
    if (configTarget) {
      const updated = (data || []).find(a => a.id === configTarget.id)
      if (updated) setConfigTarget(updated)
    }
  }

  /* ── logo upload ── */
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('El logo debe ser menor a 2MB'); return }
    setUploading(true)
    const ext = file.name.split('.').pop()
    const eid = await getMyEmpresaId()
    const fileName = `${eid}/aseguradoras/logo_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true })
    if (error) { toast.error('Error al subir logo'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName)
    setForm(f => ({ ...f, logo_url: publicUrl }))
    setLogoPreview(publicUrl)
    setUploading(false)
    toast.success('Logo subido')
  }

  /* ── create / edit submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editing) {
      const { error } = await supabase.from('aseguradoras').update(form).eq('id', editing)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Aseguradora actualizada')
    } else {
      const { error } = await supabase.from('aseguradoras').insert(form)
      if (error) { toast.error('Error al crear'); return }
      toast.success('Aseguradora creada')
    }
    closeFormModal()
    fetchAseguradoras()
  }

  const openEditModal = (a) => {
    setForm({ nombre:a.nombre, nit:a.nit||'', direccion:a.direccion||'', telefono:a.telefono||'', email:a.email||'', contacto_nombre:a.contacto_nombre||'', logo_url:a.logo_url||'', porcentaje_gasto_emision: a.porcentaje_gasto_emision ?? 5, codigo_agente: a.codigo_agente||'' })
    setLogoPreview(a.logo_url || null)
    setEditing(a.id)
    setShowFormModal(true)
  }

  const openNewModal = () => {
    setForm(emptyForm); setLogoPreview(null); setEditing(null); setShowFormModal(true)
  }

  const closeFormModal = () => {
    setShowFormModal(false); setEditing(null); setForm(emptyForm); setLogoPreview(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar aseguradora?')) return
    await supabase.from('aseguradoras').update({ activa: false }).eq('id', id)
    toast.success('Aseguradora eliminada')
    fetchAseguradoras()
  }

  const filtered = aseguradoras.filter(a => a.nombre.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      {/* ── Header ── */}
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',marginBottom:'20px'}}>
        <div style={{padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <h1 style={{fontSize:'22px',fontWeight:700,color:'#111111',margin:0}}>Aseguradoras</h1>
            <p style={{color:'#6B6B62',fontSize:'14px',marginTop:'4px',marginBottom:0}}>
              {aseguradoras.length} aseguradoras registradas
            </p>
          </div>
          <button onClick={openNewModal}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 20px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
            <Plus size={16}/> Nueva aseguradora
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div style={{background:'white',borderRadius:'12px',padding:'14px 16px',border:'1px solid #e2e8f0',marginBottom:'16px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} color='#94a3b8' style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar aseguradora...'
            style={{width:'100%',padding:'9px 12px 9px 36px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',background:'white',color:'#1e293b',boxSizing:'border-box'}}/>
        </div>
      </div>

      {/* ── List ── */}
      {loading ? <p style={{color:'#64748b'}}>Cargando...</p> : (
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {filtered.length === 0 && (
            <div style={{background:'white',borderRadius:'12px',padding:'48px',textAlign:'center',border:'1px solid #e2e8f0'}}>
              <Building2 size={32} color="#cbd5e1" style={{marginBottom:'12px'}}/>
              <p style={{color:'#94a3b8'}}>No hay aseguradoras registradas</p>
            </div>
          )}
          {filtered.map(a => (
            <div key={a.id} style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',padding:'16px 20px',display:'flex',alignItems:'center',gap:'12px'}}>
              {/* Logo */}
              <div style={{width:'48px',height:'48px',borderRadius:'8px',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'#f8fafc',flexShrink:0}}>
                {a.logo_url ? <img src={a.logo_url} alt={a.nombre} style={{width:'100%',height:'100%',objectFit:'contain'}}/> : <Building2 size={20} color="#C4A96B"/>}
              </div>
              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontWeight:600,color:'#111111',fontSize:'15px',margin:0}}>{a.nombre}</p>
                <p style={{fontSize:'13px',color:'#64748b',margin:0}}>
                  {a.productos?.filter(p=>p.activo).length||0} productos
                  {a.contacto_nombre ? ` · ${a.contacto_nombre}` : ''}
                  {a.porcentaje_gasto_emision ? ` · ${a.porcentaje_gasto_emision}% gastos` : ''}
                </p>
              </div>
              {/* Actions */}
              <div style={{display:'flex',gap:'8px',flexShrink:0}}>
                <button onClick={()=>setConfigTarget(a)}
                  style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 14px',background:'#f1f5f9',color:'#374151',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer'}}>
                  <Settings size={14}/> Configurar
                </button>
                <button onClick={()=>openEditModal(a)}
                  style={{padding:'7px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center'}}>
                  <Edit2 size={14} color="#64748b"/>
                </button>
                <button onClick={()=>handleDelete(a.id)}
                  style={{padding:'7px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center'}}>
                  <Trash2 size={14} color="#ef4444"/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal 1: Create / Edit ── */}
      {showFormModal && (
        <ModalOverlay onClose={closeFormModal}>
          <div style={{background:'white',borderRadius:'16px',width:'100%',maxWidth:'540px',padding:'28px',position:'relative'}}>
            <button onClick={closeFormModal} style={{position:'absolute',top:'16px',right:'16px',background:'none',border:'none',cursor:'pointer',padding:'4px',borderRadius:'6px'}}>
              <X size={18} color="#64748b"/>
            </button>
            <h2 style={{fontSize:'18px',fontWeight:700,color:'#111111',marginBottom:'24px'}}>
              {editing ? 'Editar aseguradora' : 'Nueva aseguradora'}
            </h2>

            <form onSubmit={handleSubmit}>
              {/* Logo */}
              <div style={{display:'flex',alignItems:'center',gap:'16px',marginBottom:'24px'}}>
                <div style={{width:'72px',height:'72px',borderRadius:'10px',border:'2px dashed #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'#f8fafc',flexShrink:0}}>
                  {logoPreview ? <img src={logoPreview} alt="logo" style={{width:'100%',height:'100%',objectFit:'contain'}}/> : <Building2 size={26} color="#cbd5e1"/>}
                </div>
                <div>
                  <label style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'8px 14px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:'8px',cursor:'pointer',fontSize:'13px',color:'#374151',fontWeight:500}}>
                    <Upload size={14}/> {uploading ? 'Subiendo...' : 'Subir logo'}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{display:'none'}} disabled={uploading}/>
                  </label>
                  <p style={{fontSize:'12px',color:'#94a3b8',marginTop:'4px',marginBottom:0}}>PNG, JPG, SVG · Máx. 2MB</p>
                  {logoPreview && (
                    <button type="button" onClick={()=>{setLogoPreview(null);setForm(f=>({...f,logo_url:''}))}}
                      style={{fontSize:'12px',color:'#ef4444',background:'none',border:'none',cursor:'pointer',marginTop:'4px',padding:0}}>
                      Eliminar logo
                    </button>
                  )}
                </div>
              </div>

              {/* Fields grid */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
                {[['nombre','Nombre *','text',true],['nit','NIT','text',false],['telefono','Teléfono','text',false],['email','Email','email',false],['contacto_nombre','Contacto principal','text',false],['direccion','Dirección','text',false]].map(([key,label,type,req])=>(
                  <div key={key} style={key==='direccion'?{gridColumn:'1/-1'}:{}}>
                    <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>{label}</label>
                    <input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:['nombre','contacto_nombre','direccion'].includes(key)?e.target.value.toUpperCase():e.target.value})} required={req}
                      style={{width:'100%',padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box',background:'white',color:'#1e293b',textTransform:['nombre','contacto_nombre','direccion'].includes(key)?'uppercase':'none'}}/>
                  </div>
                ))}
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>% Gastos de emisión</label>
                  <input type="number" step="0.01" min="0" max="100"
                    value={form.porcentaje_gasto_emision}
                    onChange={e=>setForm({...form, porcentaje_gasto_emision: e.target.value})}
                    style={{width:'100%',padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box',background:'white',color:'#1e293b'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Código de agente</label>
                  <input type="text" value={form.codigo_agente} onChange={e=>setForm({...form, codigo_agente: e.target.value})}
                    placeholder="Ej. 2128"
                    style={{width:'100%',padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box',background:'white',color:'#1e293b'}}/>
                </div>
              </div>

              <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
                <button type="submit" style={{flex:1,padding:'11px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
                  {editing ? 'Guardar cambios' : 'Crear aseguradora'}
                </button>
                <button type="button" onClick={closeFormModal}
                  style={{padding:'11px 20px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal 2: Configure ── */}
      {configTarget && (
        <ConfigModal
          aseguradora={configTarget}
          onClose={()=>setConfigTarget(null)}
          onRefresh={fetchAseguradoras}
        />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   Shared overlay
───────────────────────────────────────── */
function ModalOverlay({ onClose, children }) {
  return (
    <div onClick={onClose}
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'16px'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:'720px',maxHeight:'90vh',overflowY:'auto',borderRadius:'16px'}}>
        {children}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Modal 2 – Configure (Productos + Recargos)
───────────────────────────────────────── */
function ConfigModal({ aseguradora, onClose, onRefresh }) {
  const [tab, setTab] = useState('productos')

  const tabStyle = (t) => ({
    padding:'8px 20px',
    background: tab===t ? '#111111' : 'transparent',
    color: tab===t ? 'white' : '#64748b',
    border: 'none',
    borderRadius:'8px',
    fontSize:'14px',
    fontWeight: tab===t ? 600 : 400,
    cursor:'pointer',
  })

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{background:'white',borderRadius:'16px',width:'100%',overflow:'hidden'}}>
        {/* Header */}
        <div style={{padding:'20px 24px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:'14px'}}>
          <div style={{width:'44px',height:'44px',borderRadius:'8px',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'#f8fafc',flexShrink:0}}>
            {aseguradora.logo_url ? <img src={aseguradora.logo_url} alt={aseguradora.nombre} style={{width:'100%',height:'100%',objectFit:'contain'}}/> : <Building2 size={18} color="#C4A96B"/>}
          </div>
          <div style={{flex:1}}>
            <h2 style={{fontSize:'17px',fontWeight:700,color:'#111111',margin:0}}>{aseguradora.nombre}</h2>
            <p style={{fontSize:'13px',color:'#64748b',margin:0}}>Configuración de catálogos</p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',padding:'6px',borderRadius:'8px'}}>
            <X size={18} color="#64748b"/>
          </button>
        </div>

        {/* Tabs */}
        <div style={{padding:'12px 24px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc',display:'flex',gap:'4px'}}>
          <button style={tabStyle('productos')} onClick={()=>setTab('productos')}>Productos y coberturas</button>
          <button style={tabStyle('catalogo')} onClick={()=>setTab('catalogo')}>Catálogo de coberturas</button>
          <button style={tabStyle('recargos')} onClick={()=>setTab('recargos')}>Recargos por fraccionamiento</button>
        </div>

        {/* Body */}
        <div style={{padding:'24px',maxHeight:'60vh',overflowY:'auto'}}>
          {tab==='productos' && (
            <ProductosTab aseguradora={aseguradora} onRefresh={onRefresh}/>
          )}
          {tab==='catalogo' && (
            <CatalogoCoberturasTab aseguradora={aseguradora} onRefresh={onRefresh}/>
          )}
          {tab==='recargos' && (
            <RecargosTab aseguradora={aseguradora} onRefresh={onRefresh}/>
          )}
        </div>
      </div>
    </ModalOverlay>
  )
}

/* ─────────────────────────────────────────
   Productos tab
───────────────────────────────────────── */
function ProductosTab({ aseguradora, onRefresh }) {
  const [showForm, setShowForm]           = useState(false)
  const [nombre, setNombre]               = useState('')
  const [expandedProd, setExpandedProd]   = useState(null)
  const [editingComProd, setEditingComProd] = useState(null)
  const [comPct, setComPct]               = useState('')

  const productos = aseguradora.productos?.filter(p => p.activo) || []

  const addProducto = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('productos').insert({ aseguradora_id: aseguradora.id, nombre })
    if (error) { toast.error('Error al agregar producto'); return }
    toast.success('Producto agregado')
    setNombre(''); setShowForm(false); onRefresh()
  }

  const deleteProducto = async (id) => {
    if (!confirm('¿Eliminar producto?')) return
    await supabase.from('productos').update({ activo: false }).eq('id', id)
    toast.success('Producto eliminado'); onRefresh()
  }

  const saveComision = async (prod) => {
    const eid = await getMyEmpresaId()
    const { error } = await supabase.from('producto_comisiones').upsert(
      { empresa_id: eid, producto_id: prod.id, porcentaje: parseFloat(comPct) || 0 },
      { onConflict: 'empresa_id,producto_id' }
    )
    if (error) { toast.error('Error al guardar comisión'); return }
    toast.success('Comisión guardada')
    setEditingComProd(null); setComPct(''); onRefresh()
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
        <p style={{fontSize:'14px',color:'#64748b',margin:0}}>{productos.length} productos activos</p>
        <button onClick={()=>setShowForm(!showForm)}
          style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 14px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer'}}>
          <Plus size={14}/> Nuevo producto
        </button>
      </div>

      {showForm && (
        <form onSubmit={addProducto} style={{display:'flex',gap:'8px',marginBottom:'16px',background:'#f8fafc',padding:'12px',borderRadius:'8px',border:'1px solid #e2e8f0'}}>
          <input value={nombre} onChange={e=>setNombre(e.target.value.toUpperCase())} placeholder="Nombre del producto" required autoFocus
            style={{flex:1,padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',background:'white',textTransform:'uppercase'}}/>
          <button type="submit" style={{padding:'9px 16px',background:'#C4A96B',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'14px',fontWeight:500}}>
            Agregar
          </button>
          <button type="button" onClick={()=>{setShowForm(false);setNombre('')}}
            style={{padding:'9px',background:'white',border:'1px solid #e2e8f0',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center'}}>
            <X size={14} color="#64748b"/>
          </button>
        </form>
      )}

      {productos.length === 0 && (
        <div style={{textAlign:'center',padding:'32px',color:'#94a3b8',fontSize:'14px'}}>
          No hay productos. Agrega el primero.
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
        {productos.map(prod => {
          const currentPct = prod.producto_comisiones?.[0]?.porcentaje ?? null
          const isEditingCom = editingComProd === prod.id
          const isExpanded = expandedProd === prod.id
          return (
            <div key={prod.id} style={{border:'1px solid #e2e8f0',borderRadius:'10px',overflow:'hidden',background:'white'}}>
              {/* Product row */}
              <div style={{display:'flex',alignItems:'center',padding:'12px 16px',gap:'10px'}}>
                <span style={{flex:1,fontSize:'14px',color:'#1e293b',fontWeight:500}}>{prod.nombre}</span>

                {/* Commission */}
                {isEditingCom ? (
                  <div style={{display:'flex',alignItems:'center',gap:'6px'}} onClick={e=>e.stopPropagation()}>
                    <span style={{fontSize:'12px',color:'#64748b'}}>% comisión:</span>
                    <input type="number" step="0.01" min="0" max="100" autoFocus
                      value={comPct} onChange={e=>setComPct(e.target.value)}
                      placeholder="0"
                      style={{width:'64px',padding:'4px 8px',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'13px'}}/>
                    <button onClick={()=>saveComision(prod)}
                      style={{padding:'4px 10px',background:'#C4A96B',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'12px',fontWeight:600}}>
                      OK
                    </button>
                    <button onClick={()=>{setEditingComProd(null);setComPct('')}}
                      style={{padding:'4px',background:'none',border:'none',cursor:'pointer',display:'flex'}}>
                      <X size={13} color="#94a3b8"/>
                    </button>
                  </div>
                ) : (
                  <button onClick={()=>{setEditingComProd(prod.id);setComPct(currentPct !== null ? String(currentPct) : '')}}
                    style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600,cursor:'pointer',border:'1px solid',
                      background: currentPct !== null ? '#fef9c3' : '#f1f5f9',
                      borderColor: currentPct !== null ? '#fde68a' : '#e2e8f0',
                      color: currentPct !== null ? '#a16207' : '#94a3b8'}}>
                    {currentPct !== null ? `${currentPct}% comisión` : 'Sin comisión'}
                  </button>
                )}

                {/* Coberturas toggle */}
                <button onClick={()=>setExpandedProd(isExpanded?null:prod.id)}
                  style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:'6px',cursor:'pointer',fontSize:'12px',color:'#64748b'}}>
                  {prod.producto_coberturas_catalogo?.length||0} coberturas
                  {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                </button>

                <button onClick={()=>deleteProducto(prod.id)}
                  style={{padding:'6px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'6px',cursor:'pointer',display:'flex',alignItems:'center'}}>
                  <Trash2 size={13} color="#ef4444"/>
                </button>
              </div>

              {/* Coberturas section */}
              {isExpanded && (
                <CoberturasSection producto={prod} catalogo={aseguradora.coberturas_catalogo?.filter(c=>c.activa)||[]} onRefresh={onRefresh}/>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Coberturas section (inside product) — selects from catalog
───────────────────────────────────────── */
function CoberturasSection({ producto, catalogo, onRefresh }) {
  const assigned = new Set((producto.producto_coberturas_catalogo || []).map(r => r.cobertura_catalogo_id))

  const toggle = async (catId, isOn) => {
    if (isOn) {
      await supabase.from('producto_coberturas_catalogo').delete()
        .eq('producto_id', producto.id).eq('cobertura_catalogo_id', catId)
    } else {
      await supabase.from('producto_coberturas_catalogo').insert({ producto_id: producto.id, cobertura_catalogo_id: catId })
    }
    onRefresh()
  }

  return (
    <div style={{borderTop:'1px solid #f1f5f9', padding:'12px 16px', background:'#f8fafc'}}>
      <p style={{fontSize:'12px', fontWeight:600, color:'#374151', margin:'0 0 10px'}}>Coberturas del producto</p>
      {catalogo.length === 0 ? (
        <p style={{fontSize:'12px', color:'#94a3b8', margin:0}}>
          Sin coberturas en el catálogo. Agrégalas en la pestaña <strong>Catálogo de coberturas</strong>.
        </p>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
          {catalogo.map(c => {
            const isOn = assigned.has(c.id)
            return (
              <label key={c.id} style={{display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'white', borderRadius:'8px', border:`1px solid ${isOn?'#C4A96B':'#e2e8f0'}`, cursor:'pointer', transition:'border-color 0.15s'}}>
                <input type="checkbox" checked={isOn} onChange={()=>toggle(c.id, isOn)}
                  style={{width:'15px', height:'15px', accentColor:'#C4A96B', cursor:'pointer', flexShrink:0}}/>
                <span style={{flex:1, fontSize:'13px', color:'#374151', fontWeight: isOn?600:400}}>{c.nombre}</span>
                {c.monto != null && (
                  <span style={{fontSize:'12px', fontWeight:600, color:'#C4A96B', whiteSpace:'nowrap'}}>
                    Q {parseFloat(c.monto).toLocaleString('es-GT', {minimumFractionDigits:2, maximumFractionDigits:2})}
                  </span>
                )}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   Catálogo de coberturas tab
───────────────────────────────────────── */
function CatalogoCoberturasTab({ aseguradora, onRefresh }) {
  const [showForm, setShowForm]     = useState(false)
  const [nombre, setNombre]         = useState('')
  const [monto, setMonto]           = useState('')
  const [editingId, setEditingId]   = useState(null)
  const [editNombre, setEditNombre] = useState('')
  const [editMonto, setEditMonto]   = useState('')

  const catalogo = (aseguradora.coberturas_catalogo || []).filter(c => c.activa)
  const inpStyle = { padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', background:'white' }

  const add = async (e) => {
    e.preventDefault()
    const eid = await getMyEmpresaId()
    const { error } = await supabase.from('coberturas_catalogo').insert({
      aseguradora_id: aseguradora.id,
      nombre,
      monto: monto !== '' ? parseFloat(monto) : null,
      empresa_id: eid,
    })
    if (error) { toast.error('Error al agregar'); return }
    toast.success('Cobertura agregada al catálogo')
    setNombre(''); setMonto(''); setShowForm(false); onRefresh()
  }

  const startEdit = (c) => {
    setEditingId(c.id)
    setEditNombre(c.nombre)
    setEditMonto(c.monto != null ? String(c.monto) : '')
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    await supabase.from('coberturas_catalogo').update({
      nombre: editNombre,
      monto: editMonto !== '' ? parseFloat(editMonto) : null,
    }).eq('id', editingId)
    toast.success('Cobertura actualizada')
    setEditingId(null); onRefresh()
  }

  const remove = async (id) => {
    await supabase.from('coberturas_catalogo').update({ activa: false }).eq('id', id)
    toast.success('Cobertura eliminada'); onRefresh()
  }

  return (
    <div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
          <Shield size={16} color="#C4A96B"/>
          <p style={{fontSize:'14px', color:'#64748b', margin:0}}>{catalogo.length} cobertura(s) en el catálogo</p>
        </div>
        <button onClick={()=>setShowForm(!showForm)}
          style={{display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', background:'#111111', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:500, cursor:'pointer'}}>
          <Plus size={14}/> Nueva cobertura
        </button>
      </div>

      <p style={{fontSize:'13px', color:'#94a3b8', margin:'0 0 16px', lineHeight:1.5}}>
        Define aquí todas las coberturas disponibles para esta aseguradora. Luego, selecciónalas desde cada producto.
      </p>

      {showForm && (
        <form onSubmit={add} style={{display:'grid', gridTemplateColumns:'1fr 140px auto auto', gap:'8px', marginBottom:'16px', background:'#f8fafc', padding:'12px', borderRadius:'8px', border:'1px solid #e2e8f0', alignItems:'center'}}>
          <input value={nombre} onChange={e=>setNombre(e.target.value.toUpperCase())} placeholder="Nombre de la cobertura" required autoFocus style={{...inpStyle, textTransform:'uppercase'}}/>
          <input value={monto} onChange={e=>setMonto(e.target.value)} placeholder="Monto (Q) — opcional" type="number" min="0" step="0.01" style={inpStyle}/>
          <button type="submit" style={{padding:'8px 14px', background:'#C4A96B', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:500, whiteSpace:'nowrap'}}>
            Agregar
          </button>
          <button type="button" onClick={()=>{setShowForm(false);setNombre('');setMonto('')}}
            style={{padding:'8px', background:'white', border:'1px solid #e2e8f0', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center'}}>
            <X size={14} color="#64748b"/>
          </button>
        </form>
      )}

      {catalogo.length === 0 && !showForm ? (
        <div style={{textAlign:'center', padding:'40px', color:'#94a3b8', fontSize:'14px', border:'1px dashed #e2e8f0', borderRadius:'10px'}}>
          No hay coberturas en el catálogo aún.
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
          {catalogo.map(c => (
            <div key={c.id}>
              {editingId === c.id ? (
                <form onSubmit={saveEdit} style={{display:'grid', gridTemplateColumns:'1fr 140px auto auto', gap:'8px', alignItems:'center'}}>
                  <input value={editNombre} onChange={e=>setEditNombre(e.target.value)} required autoFocus style={inpStyle}/>
                  <input value={editMonto} onChange={e=>setEditMonto(e.target.value)} placeholder="Monto (Q)" type="number" min="0" step="0.01" style={inpStyle}/>
                  <button type="submit" style={{padding:'8px 14px', background:'#111111', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px'}}>
                    Guardar
                  </button>
                  <button type="button" onClick={()=>setEditingId(null)}
                    style={{padding:'8px', background:'white', border:'1px solid #e2e8f0', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center'}}>
                    <X size={14} color="#64748b"/>
                  </button>
                </form>
              ) : (
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'white', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'12px', minWidth:0}}>
                    <Shield size={13} color="#C4A96B" style={{flexShrink:0}}/>
                    <span style={{fontSize:'13px', color:'#374151', fontWeight:500}}>{c.nombre}</span>
                    {c.monto != null && (
                      <span style={{fontSize:'12px', fontWeight:600, color:'#C4A96B', whiteSpace:'nowrap'}}>
                        Q {parseFloat(c.monto).toLocaleString('es-GT', {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </span>
                    )}
                  </div>
                  <div style={{display:'flex', gap:'4px', flexShrink:0}}>
                    <button onClick={()=>startEdit(c)}
                      style={{padding:'5px', background:'#f1f5f9', border:'none', borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center'}}>
                      <Edit2 size={12} color="#64748b"/>
                    </button>
                    <button onClick={()=>remove(c.id)}
                      style={{padding:'5px', background:'#fef2f2', border:'none', borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center'}}>
                      <Trash2 size={12} color="#ef4444"/>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   Recargos tab
───────────────────────────────────────── */
function RecargosTab({ aseguradora, onRefresh }) {
  const recargos = [...(aseguradora.recargo_fraccionamiento || [])].sort((a, b) => a.numero_cuotas - b.numero_cuotas)
  const [cuotas, setCuotas]       = useState('')
  const [porcentaje, setPorcentaje] = useState('')
  const [saving, setSaving]       = useState(false)

  const addRecargo = async (e) => {
    e.preventDefault()
    const nc = parseInt(cuotas)
    if (isNaN(nc) || nc < 2) { toast.error('Las cuotas deben ser al menos 2'); return }
    setSaving(true)
    const eid = await getMyEmpresaId()
    const { error } = await supabase.from('recargo_fraccionamiento').upsert(
      { empresa_id: eid, aseguradora_id: aseguradora.id, numero_cuotas: nc, porcentaje: parseFloat(porcentaje) || 0 },
      { onConflict: 'empresa_id,aseguradora_id,numero_cuotas' }
    )
    setSaving(false)
    if (error) { toast.error('Error al guardar recargo'); return }
    toast.success('Recargo guardado')
    setCuotas(''); setPorcentaje(''); onRefresh()
  }

  const deleteRecargo = async (id) => {
    await supabase.from('recargo_fraccionamiento').delete().eq('id', id)
    toast.success('Recargo eliminado'); onRefresh()
  }

  return (
    <div>
      <p style={{fontSize:'14px',color:'#64748b',marginBottom:'20px',marginTop:0}}>
        Define el porcentaje de recargo que aplica cuando el cliente paga en cuotas.
      </p>

      {/* Table */}
      {recargos.length > 0 && (
        <div style={{border:'1px solid #e2e8f0',borderRadius:'10px',overflow:'hidden',marginBottom:'20px'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#f8fafc'}}>
                <th style={{padding:'10px 16px',textAlign:'left',fontSize:'12px',fontWeight:600,color:'#374151',borderBottom:'1px solid #e2e8f0'}}>Número de cuotas</th>
                <th style={{padding:'10px 16px',textAlign:'left',fontSize:'12px',fontWeight:600,color:'#374151',borderBottom:'1px solid #e2e8f0'}}>% Recargo</th>
                <th style={{padding:'10px 16px',textAlign:'right',fontSize:'12px',fontWeight:600,color:'#374151',borderBottom:'1px solid #e2e8f0'}}></th>
              </tr>
            </thead>
            <tbody>
              {recargos.map((rec, i) => (
                <tr key={rec.id} style={{borderTop: i>0 ? '1px solid #f1f5f9' : 'none'}}>
                  <td style={{padding:'12px 16px',fontSize:'14px',color:'#1e293b'}}>
                    <span style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
                      <span style={{fontWeight:600}}>{rec.numero_cuotas}</span>
                      <span style={{color:'#94a3b8',fontSize:'13px'}}>cuotas</span>
                    </span>
                  </td>
                  <td style={{padding:'12px 16px'}}>
                    <span style={{display:'inline-block',padding:'3px 10px',background:'#fff7ed',color:'#c2410c',borderRadius:'20px',fontSize:'13px',fontWeight:600,border:'1px solid #fed7aa'}}>
                      {rec.porcentaje}%
                    </span>
                  </td>
                  <td style={{padding:'12px 16px',textAlign:'right'}}>
                    <button onClick={()=>deleteRecargo(rec.id)}
                      style={{padding:'5px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'6px',cursor:'pointer',display:'inline-flex',alignItems:'center'}}>
                      <Trash2 size={13} color="#ef4444"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {recargos.length === 0 && (
        <div style={{textAlign:'center',padding:'32px',color:'#94a3b8',fontSize:'14px',border:'1px dashed #e2e8f0',borderRadius:'10px',marginBottom:'20px'}}>
          No hay recargos configurados.
        </div>
      )}

      {/* Add row */}
      <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'10px',padding:'16px'}}>
        <p style={{fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'12px',marginTop:0}}>Agregar recargo</p>
        <form onSubmit={addRecargo} style={{display:'flex',gap:'10px',alignItems:'flex-end',flexWrap:'wrap'}}>
          <div>
            <label style={{display:'block',fontSize:'12px',color:'#64748b',marginBottom:'4px'}}>Número de cuotas (mín. 2)</label>
            <input type="number" min="2" value={cuotas} onChange={e=>setCuotas(e.target.value)} placeholder="Ej: 6" required
              style={{width:'120px',padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',background:'white'}}/>
          </div>
          <div>
            <label style={{display:'block',fontSize:'12px',color:'#64748b',marginBottom:'4px'}}>% Recargo</label>
            <input type="number" step="0.01" min="0" value={porcentaje} onChange={e=>setPorcentaje(e.target.value)} placeholder="Ej: 3.5" required
              style={{width:'120px',padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',background:'white'}}/>
          </div>
          <button type="submit" disabled={saving}
            style={{padding:'9px 20px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
            {saving ? 'Guardando...' : 'Agregar'}
          </button>
        </form>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Building2, Plus, ChevronDown, ChevronUp, Trash2, Edit2, X, Upload, Search } from 'lucide-react'
import toast from 'react-hot-toast'

const emptyForm = { nombre:'', nit:'', direccion:'', telefono:'', email:'', contacto_nombre:'', logo_url:'' }

export default function Aseguradoras() {
  const [aseguradoras, setAseguradoras] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchAseguradoras() }, [])

  const fetchAseguradoras = async () => {
    setLoading(true)
    const { data } = await supabase.from('aseguradoras').select('*, productos(*, coberturas(*))').eq('activa', true).order('nombre')
    setAseguradoras(data || [])
    setLoading(false)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('El logo debe ser menor a 2MB'); return }
    setUploading(true)
    const ext = file.name.split('.').pop()
    const fileName = `logo_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true })
    if (error) { toast.error('Error al subir logo'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName)
    setForm(f => ({ ...f, logo_url: publicUrl }))
    setLogoPreview(publicUrl)
    setUploading(false)
    toast.success('Logo subido')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editing) {
      const { error } = await supabase.from('aseguradoras').update(form).eq('id', editing)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Aseguradora actualizada')
      setEditing(null)
    } else {
      const { error } = await supabase.from('aseguradoras').insert(form)
      if (error) { toast.error('Error al crear'); return }
      toast.success('Aseguradora creada')
    }
    setForm(emptyForm)
    setLogoPreview(null)
    setShowForm(false)
    fetchAseguradoras()
  }

  const handleEdit = (a) => {
    setForm({ nombre:a.nombre, nit:a.nit||'', direccion:a.direccion||'', telefono:a.telefono||'', email:a.email||'', contacto_nombre:a.contacto_nombre||'', logo_url:a.logo_url||'' })
    setLogoPreview(a.logo_url || null)
    setEditing(a.id)
    setShowForm(true)
    window.scrollTo(0,0)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar aseguradora?')) return
    await supabase.from('aseguradoras').update({ activa: false }).eq('id', id)
    toast.success('Aseguradora eliminada')
    fetchAseguradoras()
  }

  return (
    <div>
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'20px'}}>
        <div style={{padding:'20px 24px',background:'linear-gradient(135deg, #0C1E3D 0%, #1A6BBA 100%)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <h1 style={{fontSize:'22px',fontWeight:700,color:'white',margin:0}}>Aseguradoras</h1>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:'14px',marginTop:'4px',marginBottom:0}}>
              {aseguradoras.length} aseguradoras registradas
            </p>
          </div>
          <button onClick={()=>{setShowForm(!showForm);setEditing(null);setForm(emptyForm);setLogoPreview(null)}}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 20px',background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
            <Plus size={16}/> Nueva aseguradora
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{background:'white',borderRadius:'12px',padding:'24px',border:'1px solid #e2e8f0',marginBottom:'24px'}}>
          <h2 style={{fontSize:'16px',fontWeight:600,color:'#0C1E3D',marginBottom:'16px'}}>{editing?'Editar aseguradora':'Nueva aseguradora'}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:'20px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
                <div style={{width:'80px',height:'80px',borderRadius:'10px',border:'2px dashed #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'#f8fafc'}}>
                  {logoPreview ? <img src={logoPreview} alt="logo" style={{width:'100%',height:'100%',objectFit:'contain'}}/> : <Building2 size={28} color="#cbd5e1"/>}
                </div>
                <div>
                  <label style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'8px 16px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:'8px',cursor:'pointer',fontSize:'13px',color:'#374151',fontWeight:500}}>
                    <Upload size={14}/> {uploading ? 'Subiendo...' : 'Subir logo'}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{display:'none'}} disabled={uploading}/>
                  </label>
                  <p style={{fontSize:'12px',color:'#94a3b8',marginTop:'4px'}}>PNG, JPG, SVG · Máx. 2MB</p>
                  {logoPreview && <button type="button" onClick={()=>{setLogoPreview(null);setForm(f=>({...f,logo_url:''}))}} style={{fontSize:'12px',color:'#ef4444',background:'none',border:'none',cursor:'pointer',marginTop:'4px'}}>Eliminar logo</button>}
                </div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
              {[['nombre','Nombre *','text',true],['nit','NIT','text',false],['telefono','Teléfono','text',false],['email','Email','email',false],['contacto_nombre','Contacto principal','text',false],['direccion','Dirección','text',false]].map(([key,label,type,req])=>(
                <div key={key}>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>{label}</label>
                  <input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} required={req}
                    style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box',background:'white',color:'#1e293b'}}/>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button type="submit" style={{padding:'10px 20px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
                {editing?'Actualizar':'Crear aseguradora'}
              </button>
              <button type="button" onClick={()=>{setShowForm(false);setEditing(null);setForm(emptyForm);setLogoPreview(null)}}
                style={{padding:'10px 20px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{background:'white',borderRadius:'12px',padding:'14px 16px',border:'1px solid #e2e8f0',marginBottom:'16px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} color='#94a3b8' style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar aseguradora...'
            style={{width:'100%',padding:'9px 12px 9px 36px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',background:'white',color:'#1e293b',boxSizing:'border-box'}}/>
        </div>
      </div>

      {loading ? <p style={{color:'#64748b'}}>Cargando...</p> : (
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {aseguradoras.filter(a=>a.nombre.toLowerCase().includes(search.toLowerCase())).length===0 && <div style={{background:'white',borderRadius:'12px',padding:'48px',textAlign:'center',border:'1px solid #e2e8f0'}}><Building2 size={32} color="#cbd5e1" style={{marginBottom:'12px'}}/><p style={{color:'#94a3b8'}}>No hay aseguradoras registradas</p></div>}
          {aseguradoras.filter(a=>a.nombre.toLowerCase().includes(search.toLowerCase())).map(a=>(
            <div key={a.id} style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',padding:'16px 20px',cursor:'pointer'}} onClick={()=>setExpanded(expanded===a.id?null:a.id)}>
                <div style={{width:'44px',height:'44px',borderRadius:'8px',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px',overflow:'hidden',background:'#f8fafc'}}>
                  {a.logo_url ? <img src={a.logo_url} alt={a.nombre} style={{width:'100%',height:'100%',objectFit:'contain'}}/> : <Building2 size={18} color="#1A6BBA"/>}
                </div>
                <div style={{flex:1}}>
                  <p style={{fontWeight:600,color:'#0C1E3D',fontSize:'15px'}}>{a.nombre}</p>
                  <p style={{fontSize:'13px',color:'#64748b'}}>{a.productos?.length||0} productos · {a.contacto_nombre||'Sin contacto'}</p>
                </div>
                <div style={{display:'flex',gap:'8px',marginRight:'12px'}}>
                  <button onClick={e=>{e.stopPropagation();handleEdit(a)}} style={{padding:'6px',background:'#f1f5f9',border:'none',borderRadius:'6px',cursor:'pointer'}}><Edit2 size={14} color="#64748b"/></button>
                  <button onClick={e=>{e.stopPropagation();handleDelete(a.id)}} style={{padding:'6px',background:'#fef2f2',border:'none',borderRadius:'6px',cursor:'pointer'}}><Trash2 size={14} color="#ef4444"/></button>
                </div>
                {expanded===a.id?<ChevronUp size={18} color="#64748b"/>:<ChevronDown size={18} color="#64748b"/>}
              </div>
              {expanded===a.id && <ProductosSection aseguradora={a} onRefresh={fetchAseguradoras}/>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProductosSection({ aseguradora, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [expandedProd, setExpandedProd] = useState(null)

  const addProducto = async (e) => {
    e.preventDefault()
    await supabase.from('productos').insert({ aseguradora_id: aseguradora.id, nombre })
    toast.success('Producto agregado')
    setNombre(''); setShowForm(false); onRefresh()
  }

  const deleteProducto = async (id) => {
    await supabase.from('productos').update({ activo: false }).eq('id', id)
    toast.success('Producto eliminado'); onRefresh()
  }

  return (
    <div style={{borderTop:'1px solid #f1f5f9',padding:'16px 20px',background:'#fafafa'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
        <p style={{fontSize:'13px',fontWeight:600,color:'#374151'}}>Productos y coberturas</p>
        <button onClick={()=>setShowForm(!showForm)} style={{fontSize:'12px',padding:'4px 10px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'6px',cursor:'pointer'}}>+ Producto</button>
      </div>
      {showForm && (
        <form onSubmit={addProducto} style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
          <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre del producto" required
            style={{flex:1,padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'13px'}}/>
          <button type="submit" style={{padding:'8px 12px',background:'#1A6BBA',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}}>Agregar</button>
          <button type="button" onClick={()=>setShowForm(false)} style={{padding:'8px',background:'white',border:'1px solid #e2e8f0',borderRadius:'6px',cursor:'pointer'}}><X size={14}/></button>
        </form>
      )}
      {aseguradora.productos?.filter(p=>p.activo).map(prod=>(
        <div key={prod.id} style={{marginBottom:'8px',background:'white',borderRadius:'8px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',padding:'10px 14px',cursor:'pointer'}} onClick={()=>setExpandedProd(expandedProd===prod.id?null:prod.id)}>
            <span style={{flex:1,fontSize:'14px',color:'#1e293b',fontWeight:500}}>{prod.nombre}</span>
            <span style={{fontSize:'12px',color:'#64748b',marginRight:'8px'}}>{prod.coberturas?.length||0} coberturas</span>
            <button onClick={e=>{e.stopPropagation();deleteProducto(prod.id)}} style={{padding:'4px',background:'none',border:'none',cursor:'pointer',marginRight:'4px'}}><Trash2 size={12} color="#ef4444"/></button>
            {expandedProd===prod.id?<ChevronUp size={14} color="#64748b"/>:<ChevronDown size={14} color="#64748b"/>}
          </div>
          {expandedProd===prod.id && <CoberturasSection producto={prod} onRefresh={onRefresh}/>}
        </div>
      ))}
    </div>
  )
}

function CoberturasSection({ producto, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')

  const addCobertura = async (e) => {
    e.preventDefault()
    await supabase.from('coberturas').insert({ producto_id: producto.id, nombre })
    toast.success('Cobertura agregada')
    setNombre(''); setShowForm(false); onRefresh()
  }

  const deleteCobertura = async (id) => {
    await supabase.from('coberturas').update({ activa: false }).eq('id', id); onRefresh()
  }

  return (
    <div style={{borderTop:'1px solid #f1f5f9',padding:'10px 14px',background:'#f8fafc'}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
        <span style={{fontSize:'12px',color:'#64748b',fontWeight:600}}>Coberturas</span>
        <button onClick={()=>setShowForm(!showForm)} style={{fontSize:'11px',padding:'2px 8px',background:'#1A6BBA',color:'white',border:'none',borderRadius:'4px',cursor:'pointer'}}>+ Cobertura</button>
      </div>
      {showForm && (
        <form onSubmit={addCobertura} style={{display:'flex',gap:'6px',marginBottom:'8px'}}>
          <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre de cobertura" required
            style={{flex:1,padding:'6px 10px',border:'1px solid #e2e8f0',borderRadius:'4px',fontSize:'12px'}}/>
          <button type="submit" style={{padding:'6px 10px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'12px'}}>OK</button>
        </form>
      )}
      <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
        {producto.coberturas?.filter(c=>c.activa).map(c=>(
          <span key={c.id} style={{display:'inline-flex',alignItems:'center',gap:'4px',padding:'3px 10px',background:'#dbeafe',color:'#1d4ed8',borderRadius:'20px',fontSize:'12px'}}>
            {c.nombre}
            <button onClick={()=>deleteCobertura(c.id)} style={{background:'none',border:'none',cursor:'pointer',padding:'0',display:'flex'}}><X size={10} color="#1d4ed8"/></button>
          </span>
        ))}
        {(!producto.coberturas||producto.coberturas.filter(c=>c.activa).length===0) && <span style={{fontSize:'12px',color:'#94a3b8'}}>Sin coberturas</span>}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Users, Plus, Search, Building2, User, Briefcase, Edit2, Trash2, ChevronDown, ChevronUp, ArrowLeft, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const tipoLabels = { prospecto:'Prospecto', individual:'Individual', empresa:'Empresa' }
const tipoColors = { prospecto:'#f59e0b', individual:'#1A6BBA', empresa:'#0C1E3D' }
const tipoIcons = { prospecto: User, individual: User, empresa: Building2 }

const emptyForm = { tipo:'prospecto', nombre:'', apellido:'', razon_social:'', nit:'', dpi:'', email:'', telefono:'', direccion:'', nombre_empresa:'', representante_legal:'', conglomerado_id:'' }
const emptyConglomerado = { nombre:'', descripcion:'' }

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [conglomerados, setConglomerados] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [showForm, setShowForm] = useState(false)
  const [showConglomeradoForm, setShowConglomeradoForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [conglomeradoForm, setConglomeradoForm] = useState(emptyConglomerado)
  const [editing, setEditing] = useState(null)
  const [expandedConglomerado, setExpandedConglomerado] = useState(null)
  const [activeTab, setActiveTab] = useState('clientes')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: clientesData }, { data: conglomeradosData }] = await Promise.all([
      supabase.from('clientes').select('*, conglomerados(nombre)').eq('activo', true).order('nombre'),
      supabase.from('conglomerados').select('*, clientes(id, nombre, apellido, tipo, email, nit, telefono, dpi, direccion, razon_social, nombre_empresa, representante_legal, conglomerado_id)').eq('activo', true).order('nombre')
    ])
    setClientes(clientesData || [])
    setConglomerados(conglomeradosData || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, conglomerado_id: form.conglomerado_id || null }
    if (editing) {
      const { error } = await supabase.from('clientes').update(payload).eq('id', editing)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Cliente actualizado')
    } else {
      const { error } = await supabase.from('clientes').insert(payload)
      if (error) { toast.error('Error al crear'); return }
      toast.success('Cliente creado')
    }
    setForm(emptyForm)
    setShowForm(false)
    setEditing(null)
    fetchAll()
  }

  const handleConglomeradoSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('conglomerados').insert(conglomeradoForm)
    if (error) { toast.error('Error al crear conglomerado'); return }
    toast.success('Conglomerado creado')
    setConglomeradoForm(emptyConglomerado)
    setShowConglomeradoForm(false)
    fetchAll()
  }

  const handleEdit = (c) => {
    setForm({ tipo:c.tipo, nombre:c.nombre, apellido:c.apellido||'', razon_social:c.razon_social||'', nit:c.nit||'', dpi:c.dpi||'', email:c.email||'', telefono:c.telefono||'', direccion:c.direccion||'', nombre_empresa:c.nombre_empresa||'', representante_legal:c.representante_legal||'', conglomerado_id:c.conglomerado_id||'' })
    setEditing(c.id)
    setShowForm(true)
    setShowConglomeradoForm(false)
    setActiveTab('clientes')
    window.scrollTo(0,0)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar cliente?')) return
    await supabase.from('clientes').update({ activo: false }).eq('id', id)
    toast.success('Cliente eliminado')
    fetchAll()
  }

  const handleDeleteConglomerado = async (id) => {
    if (!confirm('¿Eliminar conglomerado? Los clientes asociados no serán eliminados.')) return
    await supabase.from('conglomerados').update({ activo: false }).eq('id', id)
    toast.success('Conglomerado eliminado')
    fetchAll()
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const filtered = clientes.filter(c => {
    const matchSearch = (c.nombre+' '+(c.apellido||'')+' '+(c.razon_social||'')+' '+(c.email||'')).toLowerCase().includes(search.toLowerCase())
    const matchTipo = filtroTipo === 'todos' || c.tipo === filtroTipo
    return matchSearch && matchTipo
  })

  if (showForm) return (
    <div>
      <button onClick={cancelForm} style={{display:'flex',alignItems:'center',gap:'6px',color:'#64748b',background:'none',border:'none',cursor:'pointer',fontSize:'14px',marginBottom:'20px',padding:'0'}}>
        <ArrowLeft size={16}/> Volver a clientes
      </button>
      <div style={{background:'white',borderRadius:'12px',padding:'28px',border:'1px solid #e2e8f0',maxWidth:'800px'}}>
        <h2 style={{fontSize:'18px',fontWeight:700,color:'#0C1E3D',marginBottom:'20px'}}>{editing?'Editar cliente':'Nuevo cliente'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'8px'}}>Tipo de cliente</label>
            <div style={{display:'flex',gap:'8px'}}>
              {Object.entries(tipoLabels).map(([key,label])=>(
                <button key={key} type="button" onClick={()=>setForm({...form,tipo:key})}
                  style={{padding:'9px 18px',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',
                    background:form.tipo===key?tipoColors[key]:'white',
                    color:form.tipo===key?'white':'#64748b',
                    border:`1px solid ${form.tipo===key?tipoColors[key]:'#e2e8f0'}`}}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
            <div>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Nombre *</label>
              <input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required
                style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
            </div>
            <div>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Apellido</label>
              <input value={form.apellido} onChange={e=>setForm({...form,apellido:e.target.value})}
                style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
            </div>
            <div>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>NIT</label>
              <input value={form.nit} onChange={e=>setForm({...form,nit:e.target.value})}
                style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
            </div>
            <div>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>DPI</label>
              <input value={form.dpi} onChange={e=>setForm({...form,dpi:e.target.value})}
                style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
            </div>
            <div>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Email</label>
              <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
                style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
            </div>
            <div>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Teléfono</label>
              <input value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})}
                style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
            </div>
            {form.tipo==='empresa' && <>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Nombre empresa</label>
                <input value={form.nombre_empresa} onChange={e=>setForm({...form,nombre_empresa:e.target.value})}
                  style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Representante legal</label>
                <input value={form.representante_legal} onChange={e=>setForm({...form,representante_legal:e.target.value})}
                  style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
              </div>
            </>}
            <div>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Conglomerado (opcional)</label>
              <select value={form.conglomerado_id} onChange={e=>setForm({...form,conglomerado_id:e.target.value})}
                style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box',background:'white'}}>
                <option value=''>Sin conglomerado</option>
                {conglomerados.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Dirección</label>
              <input value={form.direccion} onChange={e=>setForm({...form,direccion:e.target.value})}
                style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
            </div>
          </div>
          <div style={{display:'flex',gap:'8px',paddingTop:'8px',borderTop:'1px solid #f1f5f9'}}>
            <button type="submit" style={{padding:'11px 24px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
              {editing?'Actualizar cliente':'Crear cliente'}
            </button>
            <button type="button" onClick={cancelForm}
              style={{padding:'11px 24px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
        <div>
          <h1 style={{fontSize:'24px',fontWeight:700,color:'#0C1E3D'}}>Clientes</h1>
          <p style={{color:'#64748b',fontSize:'14px',marginTop:'4px'}}>{clientes.length} clientes · {conglomerados.length} conglomerados</p>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>setShowConglomeradoForm(!showConglomeradoForm)}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px',background:'white',color:'#0C1E3D',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
            <Briefcase size={15}/> Nuevo conglomerado
          </button>
          <button onClick={()=>{setShowForm(true);setEditing(null);setForm(emptyForm)}}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
            <Plus size={15}/> Nuevo cliente
          </button>
        </div>
      </div>

      {showConglomeradoForm && (
        <div style={{background:'white',borderRadius:'12px',padding:'20px 24px',border:'1px solid #e2e8f0',marginBottom:'20px'}}>
          <h2 style={{fontSize:'15px',fontWeight:600,color:'#0C1E3D',marginBottom:'14px'}}>Nuevo conglomerado</h2>
          <form onSubmit={handleConglomeradoSubmit}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Nombre *</label>
                <input value={conglomeradoForm.nombre} onChange={e=>setConglomeradoForm({...conglomeradoForm,nombre:e.target.value})} required
                  style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Descripción</label>
                <input value={conglomeradoForm.descripcion} onChange={e=>setConglomeradoForm({...conglomeradoForm,descripcion:e.target.value})}
                  style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
              </div>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button type="submit" style={{padding:'9px 18px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>Crear conglomerado</button>
              <button type="button" onClick={()=>setShowConglomeradoForm(false)} style={{padding:'9px 18px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
        {['clientes','conglomerados'].map(tab=>(
          <button key={tab} onClick={()=>setActiveTab(tab)}
            style={{padding:'8px 20px',borderRadius:'8px',fontSize:'14px',fontWeight:500,cursor:'pointer',
              background:activeTab===tab?'#0C1E3D':'white',
              color:activeTab===tab?'white':'#64748b',
              border:`1px solid ${activeTab===tab?'#0C1E3D':'#e2e8f0'}`}}>
            {tab==='clientes'?`Clientes (${clientes.length})`:`Conglomerados (${conglomerados.length})`}
          </button>
        ))}
      </div>

      {activeTab==='clientes' && <>
        <div style={{background:'white',borderRadius:'12px',padding:'14px 16px',border:'1px solid #e2e8f0',marginBottom:'16px',display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:'200px',position:'relative'}}>
            <Search size={16} color="#94a3b8" style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)'}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, email..."
              style={{width:'100%',padding:'9px 12px 9px 36px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
          </div>
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
            {['todos',...Object.keys(tipoLabels)].map(t=>(
              <button key={t} onClick={()=>setFiltroTipo(t)}
                style={{padding:'7px 14px',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontWeight:500,
                  background:filtroTipo===t?'#0C1E3D':'white',
                  color:filtroTipo===t?'white':'#64748b',
                  border:`1px solid ${filtroTipo===t?'#0C1E3D':'#e2e8f0'}`}}>
                {t==='todos'?'Todos':tipoLabels[t]}
              </button>
            ))}
          </div>
        </div>
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          {loading ? <p style={{padding:'24px',color:'#64748b'}}>Cargando...</p> :
           filtered.length===0 ? (
            <div style={{padding:'48px',textAlign:'center'}}>
              <Users size={32} color="#cbd5e1" style={{marginBottom:'12px'}}/>
              <p style={{color:'#94a3b8'}}>No hay clientes{search?' que coincidan':''}</p>
            </div>
          ) : filtered.map((c,i)=>{
            const Icon = tipoIcons[c.tipo]||User
            return (
              <div key={c.id} style={{display:'flex',alignItems:'center',padding:'14px 20px',borderBottom:i<filtered.length-1?'1px solid #f1f5f9':'none'}}
                onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e=>e.currentTarget.style.background='white'}>
                <div style={{width:'38px',height:'38px',borderRadius:'8px',background:tipoColors[c.tipo]+'20',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px'}}>
                  <Icon size={16} color={tipoColors[c.tipo]}/>
                </div>
                <div style={{flex:1}}>
                  <p style={{fontWeight:600,color:'#0C1E3D',fontSize:'14px'}}>{c.nombre} {c.apellido||''}</p>
                  <p style={{fontSize:'12px',color:'#64748b'}}>{c.conglomerados?.nombre?`${c.conglomerados.nombre} · `:''}{c.email||c.telefono||c.nit||'Sin contacto'}</p>
                </div>
                <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',marginRight:'12px',background:tipoColors[c.tipo]+'20',color:tipoColors[c.tipo],fontWeight:500}}>
                  {tipoLabels[c.tipo]}
                </span>
                <div style={{display:'flex',gap:'6px'}}>
                  <button onClick={()=>handleEdit(c)} style={{padding:'6px',background:'#f1f5f9',border:'none',borderRadius:'6px',cursor:'pointer'}}><Edit2 size={14} color="#64748b"/></button>
                  <button onClick={()=>handleDelete(c.id)} style={{padding:'6px',background:'#fef2f2',border:'none',borderRadius:'6px',cursor:'pointer'}}><Trash2 size={14} color="#ef4444"/></button>
                </div>
              </div>
            )
          })}
        </div>
      </>}

      {activeTab==='conglomerados' && (
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {conglomerados.length===0 ? (
            <div style={{background:'white',borderRadius:'12px',padding:'48px',textAlign:'center',border:'1px solid #e2e8f0'}}>
              <Briefcase size={32} color="#cbd5e1" style={{marginBottom:'12px'}}/>
              <p style={{color:'#94a3b8'}}>No hay conglomerados registrados</p>
            </div>
          ) : conglomerados.map(cong=>(
            <div key={cong.id} style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',padding:'16px 20px',cursor:'pointer'}} onClick={()=>setExpandedConglomerado(expandedConglomerado===cong.id?null:cong.id)}>
                <div style={{width:'40px',height:'40px',borderRadius:'8px',background:'#7c3aed20',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px'}}>
                  <Briefcase size={18} color="#7c3aed"/>
                </div>
                <div style={{flex:1}}>
                  <p style={{fontWeight:600,color:'#0C1E3D',fontSize:'15px'}}>{cong.nombre}</p>
                  <p style={{fontSize:'13px',color:'#64748b'}}>{cong.clientes?.length||0} clientes{cong.descripcion?' · '+cong.descripcion:''}</p>
                </div>
                <button onClick={e=>{e.stopPropagation();handleDeleteConglomerado(cong.id)}} style={{padding:'6px',background:'#fef2f2',border:'none',borderRadius:'6px',cursor:'pointer',marginRight:'8px'}}><Trash2 size={14} color="#ef4444"/></button>
                {expandedConglomerado===cong.id?<ChevronUp size={18} color="#64748b"/>:<ChevronDown size={18} color="#64748b"/>}
              </div>
              {expandedConglomerado===cong.id && (
                <div style={{borderTop:'1px solid #f1f5f9',padding:'12px 20px',background:'#fafafa'}}>
                  {(!cong.clientes||cong.clientes.length===0) ? <p style={{fontSize:'13px',color:'#94a3b8'}}>Sin clientes asociados</p> :
                   cong.clientes.map(c=>(
                    <div key={c.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',marginBottom:'4px',borderRadius:'8px',background:'white',border:'1px solid #f1f5f9',cursor:'pointer',transition:'all 0.15s'}}
                      onClick={()=>handleEdit(c)}
                      onMouseEnter={e=>e.currentTarget.style.borderColor='#1A6BBA'}
                      onMouseLeave={e=>e.currentTarget.style.borderColor='#f1f5f9'}>
                      <div style={{width:'32px',height:'32px',borderRadius:'6px',background:tipoColors[c.tipo]+'20',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <User size={14} color={tipoColors[c.tipo]}/>
                      </div>
                      <div style={{flex:1}}>
                        <span style={{fontSize:'13px',color:'#1e293b',fontWeight:600}}>{c.nombre} {c.apellido||''}</span>
                        {c.email && <p style={{fontSize:'11px',color:'#64748b',margin:'1px 0 0'}}>{c.email}</p>}
                      </div>
                      <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:tipoColors[c.tipo]+'20',color:tipoColors[c.tipo]}}>{tipoLabels[c.tipo]}</span>
                      <ExternalLink size={13} color="#94a3b8"/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

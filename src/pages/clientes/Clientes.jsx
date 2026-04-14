import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Users, Plus, Search, Building2, User, Briefcase, ChevronRight, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const tipoLabels = { prospecto:'Prospecto', individual:'Individual', empresa:'Empresa', conglomerado:'Conglomerado' }
const tipoColors = { prospecto:'#f59e0b', individual:'#1A6BBA', empresa:'#0C1E3D', conglomerado:'#7c3aed' }
const tipoIcons = { prospecto: User, individual: User, empresa: Building2, conglomerado: Briefcase }

const emptyForm = { tipo:'prospecto', nombre:'', apellido:'', razon_social:'', nit:'', dpi:'', email:'', telefono:'', direccion:'', nombre_empresa:'', representante_legal:'' }

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)

  useEffect(() => { fetchClientes() }, [])

  const fetchClientes = async () => {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*').eq('activo', true).order('nombre')
    setClientes(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form }
    if (editing) {
      const { error } = await supabase.from('clientes').update(payload).eq('id', editing)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Cliente actualizado')
      setEditing(null)
    } else {
      const { error } = await supabase.from('clientes').insert(payload)
      if (error) { toast.error('Error al crear'); return }
      toast.success('Cliente creado')
    }
    setForm(emptyForm)
    setShowForm(false)
    fetchClientes()
  }

  const handleEdit = (c) => {
    setForm({ tipo:c.tipo, nombre:c.nombre, apellido:c.apellido||'', razon_social:c.razon_social||'', nit:c.nit||'', dpi:c.dpi||'', email:c.email||'', telefono:c.telefono||'', direccion:c.direccion||'', nombre_empresa:c.nombre_empresa||'', representante_legal:c.representante_legal||'' })
    setEditing(c.id)
    setShowForm(true)
    window.scrollTo(0,0)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar cliente?')) return
    await supabase.from('clientes').update({ activo: false }).eq('id', id)
    toast.success('Cliente eliminado')
    fetchClientes()
  }

  const filtered = clientes.filter(c => {
    const matchSearch = (c.nombre+' '+(c.apellido||'')+' '+(c.razon_social||'')+' '+(c.email||'')).toLowerCase().includes(search.toLowerCase())
    const matchTipo = filtroTipo === 'todos' || c.tipo === filtroTipo
    return matchSearch && matchTipo
  })

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
        <div>
          <h1 style={{fontSize:'24px',fontWeight:700,color:'#0C1E3D'}}>Clientes</h1>
          <p style={{color:'#64748b',fontSize:'14px',marginTop:'4px'}}>{clientes.length} clientes registrados</p>
        </div>
        <button onClick={()=>{setShowForm(!showForm);setEditing(null);setForm(emptyForm)}}
          style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 20px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
          <Plus size={16}/> Nuevo cliente
        </button>
      </div>

      {showForm && (
        <div style={{background:'white',borderRadius:'12px',padding:'24px',border:'1px solid #e2e8f0',marginBottom:'24px'}}>
          <h2 style={{fontSize:'16px',fontWeight:600,color:'#0C1E3D',marginBottom:'16px'}}>{editing?'Editar cliente':'Nuevo cliente'}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'6px'}}>Tipo de cliente</label>
              <div style={{display:'flex',gap:'8px'}}>
                {Object.entries(tipoLabels).map(([key,label])=>(
                  <button key={key} type="button" onClick={()=>setForm({...form,tipo:key})}
                    style={{padding:'8px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',
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
              {(form.tipo==='empresa'||form.tipo==='conglomerado') && <>
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
              <div style={{gridColumn:'1/-1'}}>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Dirección</label>
                <input value={form.direccion} onChange={e=>setForm({...form,direccion:e.target.value})}
                  style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
              </div>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button type="submit" style={{padding:'10px 20px',background:'#0C1E3D',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
                {editing?'Actualizar':'Crear cliente'}
              </button>
              <button type="button" onClick={()=>{setShowForm(false);setEditing(null);setForm(emptyForm)}}
                style={{padding:'10px 20px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{background:'white',borderRadius:'12px',padding:'16px',border:'1px solid #e2e8f0',marginBottom:'16px',display:'flex',gap:'12px',alignItems:'center'}}>
        <div style={{flex:1,position:'relative'}}>
          <Search size={16} color="#94a3b8" style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, email..."
            style={{width:'100%',padding:'10px 12px 10px 36px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
        </div>
        <div style={{display:'flex',gap:'6px'}}>
          {['todos',...Object.keys(tipoLabels)].map(t=>(
            <button key={t} onClick={()=>setFiltroTipo(t)}
              style={{padding:'8px 14px',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontWeight:500,
                background:filtroTipo===t?'#0C1E3D':'white',
                color:filtroTipo===t?'white':'#64748b',
                border:`1px solid ${filtroTipo===t?'#0C1E3D':'#e2e8f0'}`}}>
              {t==='todos'?'Todos':tipoLabels[t]}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p style={{color:'#64748b'}}>Cargando...</p> : (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          {filtered.length === 0 ? (
            <div style={{padding:'48px',textAlign:'center'}}>
              <Users size={32} color="#cbd5e1" style={{marginBottom:'12px'}}/>
              <p style={{color:'#94a3b8'}}>No hay clientes{search?' que coincidan con la búsqueda':''}</p>
            </div>
          ) : filtered.map((c,i) => {
            const Icon = tipoIcons[c.tipo] || User
            return (
              <div key={c.id} style={{display:'flex',alignItems:'center',padding:'14px 20px',borderBottom:i<filtered.length-1?'1px solid #f1f5f9':'none',transition:'background 0.15s'}}
                onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e=>e.currentTarget.style.background='white'}>
                <div style={{width:'38px',height:'38px',borderRadius:'8px',background:tipoColors[c.tipo]+'20',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px'}}>
                  <Icon size={16} color={tipoColors[c.tipo]}/>
                </div>
                <div style={{flex:1}}>
                  <p style={{fontWeight:600,color:'#0C1E3D',fontSize:'14px'}}>{c.nombre} {c.apellido||''}</p>
                  <p style={{fontSize:'12px',color:'#64748b'}}>{c.email||c.telefono||c.nit||'Sin contacto'}</p>
                </div>
                <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',marginRight:'12px',
                  background:tipoColors[c.tipo]+'20',color:tipoColors[c.tipo],fontWeight:500}}>
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
      )}
    </div>
  )
}

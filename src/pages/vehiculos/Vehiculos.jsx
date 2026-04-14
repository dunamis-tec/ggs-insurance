import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Car, Plus, Edit2, Trash2, Search, ArrowLeft, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

const tiposVehiculo = ['sedan','pickup','suv','van','moto','camion','otro']
const emptyForm = { marca:'', modelo:'', anio:'', placa:'', chasis:'', motor:'', color:'', tipo:'sedan', valor_asegurado:'' }

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

    // Validar duplicados placa y chasis
    if (form.placa) {
      const { data: existePlaca } = await supabase.from('vehiculos').select('id').eq('placa', form.placa).eq('activo', true).neq('id', editing || '')
      if (existePlaca?.length > 0) { toast.error('Ya existe un vehículo con esa placa'); return }
    }
    if (form.chasis) {
      const { data: existeChasis } = await supabase.from('vehiculos').select('id').eq('chasis', form.chasis).eq('activo', true).neq('id', editing || '')
      if (existeChasis?.length > 0) { toast.error('Ya existe un vehículo con ese número de chasis (VIN)'); return }
    }

    const payload = { ...form, cliente_id: clienteId, anio: parseInt(form.anio), valor_asegurado: parseFloat(form.valor_asegurado || 0) }
    if (editing) {
      const { error } = await supabase.from('vehiculos').update(payload).eq('id', editing)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Vehículo actualizado')
    } else {
      const { error } = await supabase.from('vehiculos').insert(payload)
      if (error) { toast.error('Error al crear'); return }
      toast.success('Vehículo creado')
    }
    setForm(emptyForm)
    setClienteId('')
    setEditing(null)
    setView('list')
    fetchAll()
  }

  const handleEdit = (v) => {
    setForm({ marca: v.marca, modelo: v.modelo, anio: v.anio, placa: v.placa || '', chasis: v.chasis || '', motor: v.motor || '', color: v.color || '', tipo: v.tipo || 'sedan', valor_asegurado: v.valor_asegurado || '' })
    setClienteId(v.cliente_id)
    setEditing(v.id)
    setView('form')
    window.scrollTo(0, 0)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar vehículo?')) return
    await supabase.from('vehiculos').update({ activo: false }).eq('id', id)
    toast.success('Vehículo eliminado')
    fetchAll()
  }

  const filtered = vehiculos.filter(v =>
    (v.marca + ' ' + v.modelo + ' ' + v.anio + ' ' + (v.placa || '') + ' ' + (v.clientes?.nombre || '')).toLowerCase().includes(search.toLowerCase())
  )

  if (view === 'detalle' && selected) return (
    <VehiculoDetalle vehiculo={selected} onBack={() => { setSelected(null); setView('list'); fetchAll() }} onEdit={handleEdit} />
  )

  if (view === 'form') return (
    <div>
      <button onClick={() => { setView('list'); setEditing(null); setForm(emptyForm); setClienteId('') }}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '20px', padding: '0' }}>
        <ArrowLeft size={16} /> Volver a vehículos
      </button>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', border: '1px solid #e2e8f0', maxWidth: '800px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0C1E3D', marginBottom: '20px' }}>{editing ? 'Editar vehículo' : 'Nuevo vehículo'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Cliente propietario *</label>
            <select value={clienteId} onChange={e => setClienteId(e.target.value)} required
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', color: '#1e293b', boxSizing: 'border-box' }}>
              <option value=''>Seleccionar cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido || ''}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {[['marca', 'Marca *', true, 'text'], ['modelo', 'Modelo *', true, 'text'], ['anio', 'Año *', true, 'number'], ['placa', 'Placa', false, 'text'], ['chasis', 'No. Chasis / VIN', false, 'text'], ['motor', 'No. Motor', false, 'text'], ['color', 'Color', false, 'text'], ['valor_asegurado', 'Valor asegurado (Q)', false, 'number']].map(([key, label, req, type]) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>{label}</label>
                <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} required={req} type={type}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', color: '#1e293b', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Tipo</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', color: '#1e293b', boxSizing: 'border-box' }}>
                {tiposVehiculo.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
            <button type='submit' style={{ padding: '11px 24px', background: '#0C1E3D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              {editing ? 'Actualizar' : 'Crear vehículo'}
            </button>
            <button type='button' onClick={() => { setView('list'); setEditing(null); setForm(emptyForm); setClienteId('') }}
              style={{ padding: '11px 24px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0C1E3D' }}>Vehículos</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>{vehiculos.length} vehículos registrados</p>
        </div>
        <button onClick={() => { setView('form'); setEditing(null); setForm(emptyForm); setClienteId('') }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#0C1E3D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Nuevo vehículo
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '14px 16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} color='#94a3b8' style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Buscar por marca, modelo, placa, cliente...'
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', color: '#1e293b', boxSizing: 'border-box' }} />
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? <p style={{ padding: '24px', color: '#64748b' }}>Cargando...</p> :
          filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Car size={32} color='#cbd5e1' style={{ marginBottom: '12px' }} />
              <p style={{ color: '#94a3b8' }}>No hay vehículos registrados</p>
            </div>
          ) : filtered.map((v, i) => {
            const enPoliza = v.polizas?.activa
            return (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}
                onClick={() => { setSelected(v); setView('detalle') }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0 }}>
                  <Car size={18} color='#1A6BBA' />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: '#0C1E3D', fontSize: '14px' }}>{v.marca} {v.modelo} {v.anio}</p>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>{v.clientes?.nombre} {v.clientes?.apellido || ''} · Placa: {v.placa || 'N/A'} · {v.tipo}</p>
                </div>
                {v.valor_asegurado > 0 && <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A6BBA', marginRight: '12px' }}>Q {parseFloat(v.valor_asegurado).toLocaleString()}</p>}
                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', marginRight: '12px', background: enPoliza ? '#dcfce7' : '#f1f5f9', color: enPoliza ? '#15803d' : '#64748b', fontWeight: 500 }}>
                  {enPoliza ? 'En póliza activa' : 'Disponible'}
                </span>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleEdit(v)} style={{ padding: '6px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Edit2 size={14} color='#64748b' /></button>
                  <button onClick={() => handleDelete(v.id)} disabled={!!enPoliza}
                    style={{ padding: '6px', background: enPoliza ? '#f8fafc' : '#fef2f2', border: 'none', borderRadius: '6px', cursor: enPoliza ? 'not-allowed' : 'pointer', opacity: enPoliza ? 0.5 : 1 }}>
                    <Trash2 size={14} color='#ef4444' />
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
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchHistorial() }, [vehiculo.id])

  const fetchHistorial = async () => {
    setLoading(true)
    const { data } = await supabase.from('emision_vehiculos')
      .select('*, emisiones(numero_emision, tipo, estado, fecha_inicio, fecha_fin, polizas(numero_poliza, clientes(nombre, apellido)))')
      .eq('vehiculo_id', vehiculo.id)
      .order('created_at', { ascending: false })
    setHistorial(data || [])
    setLoading(false)
  }

  const estadoColors = { solicitada: '#f59e0b', reproceso: '#ef4444', emitida: '#22c55e' }
  const tipoLabels = { emision: 'Emisión', inclusion: 'Inclusión', exclusion: 'Exclusión', renovacion: 'Renovación' }

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '20px', padding: '0' }}>
        <ArrowLeft size={16} /> Volver a vehículos
      </button>

      <div style={{ background: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Car size={24} color='#1A6BBA' />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0C1E3D' }}>{vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}</h1>
              <p style={{ fontSize: '13px', color: '#64748b' }}>{vehiculo.clientes?.nombre} {vehiculo.clientes?.apellido || ''} · {vehiculo.tipo}</p>
            </div>
          </div>
          <button onClick={() => onEdit(vehiculo)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0C1E3D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            <Edit2 size={13} /> Editar
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginTop: '16px' }}>
          {[['Placa', vehiculo.placa || 'N/A'], ['Chasis / VIN', vehiculo.chasis || 'N/A'], ['Motor', vehiculo.motor || 'N/A'], ['Color', vehiculo.color || 'N/A']].map(([label, val]) => (
            <div key={label} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 14px' }}>
              <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>{label}</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{val}</p>
            </div>
          ))}
        </div>
        {vehiculo.valor_asegurado > 0 && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: '#dbeafe', borderRadius: '8px', display: 'inline-block' }}>
            <p style={{ fontSize: '11px', color: '#1d4ed8', marginBottom: '2px' }}>Valor asegurado</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#1d4ed8' }}>Q {parseFloat(vehiculo.valor_asegurado).toLocaleString()}</p>
          </div>
        )}
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} color='#1A6BBA' />
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0C1E3D' }}>Historial de pólizas y emisiones</h3>
          <span style={{ marginLeft: 'auto', background: '#dbeafe', color: '#1d4ed8', fontSize: '12px', padding: '2px 8px', borderRadius: '20px' }}>{historial.length}</span>
        </div>
        {loading ? <p style={{ padding: '20px', color: '#64748b' }}>Cargando...</p> :
          historial.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <FileText size={28} color='#cbd5e1' style={{ marginBottom: '10px' }} />
              <p style={{ color: '#94a3b8' }}>Sin historial de pólizas</p>
            </div>
          ) : historial.map((h, i) => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < historial.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: '#0C1E3D', fontSize: '14px' }}>{h.emisiones?.polizas?.numero_poliza || 'Sin número'}</p>
                <p style={{ fontSize: '12px', color: '#64748b' }}>
                  {h.emisiones?.numero_emision} · {tipoLabels[h.emisiones?.tipo] || h.emisiones?.tipo} · {h.emisiones?.polizas?.clientes?.nombre}
                </p>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  {h.emisiones?.fecha_inicio ? new Date(h.emisiones.fecha_inicio).toLocaleDateString('es-GT') : ''} → {h.emisiones?.fecha_fin ? new Date(h.emisiones.fecha_fin).toLocaleDateString('es-GT') : ''}
                </p>
              </div>
              <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: 500, background: estadoColors[h.emisiones?.estado] + '20', color: estadoColors[h.emisiones?.estado] }}>
                {h.emisiones?.estado}
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}
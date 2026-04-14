import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { DollarSign, Copy, Send, Filter, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Comisiones() {
  const [reqs, setReqs] = useState([])
  const [aseguradoras, setAseguradoras] = useState([])
  const [productos, setProductos] = useState([])
  const [informes, setInformes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroAseguradora, setFiltroAseguradora] = useState('')
  const [filtroProducto, setFiltroProducto] = useState('')
  const [filtroDesde, setFiltroDesde] = useState(new Date().toISOString().split('T')[0])
  const [filtroHasta, setFiltroHasta] = useState(new Date().toISOString().split('T')[0])
  const [selectedIds, setSelectedIds] = useState([])
  const [activeTab, setActiveTab] = useState('pendientes')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: r }, { data: a }, { data: inf }] = await Promise.all([
      supabase.from('requerimientos_pago')
        .select('*, polizas(numero_poliza, producto_id, aseguradoras(id, nombre), productos(id, nombre), clientes(nombre, apellido))')
        .eq('estado', 'pagado').eq('informe_comision_enviado', false)
        .order('fecha_pago', { ascending: false }),
      supabase.from('aseguradoras').select('id, nombre, productos(id, nombre)').eq('activa', true).order('nombre'),
      supabase.from('informes_enviados').select('*, aseguradoras(nombre)').eq('tipo', 'comision').order('created_at', { ascending: false }).limit(50)
    ])
    setReqs(r || [])
    setAseguradoras(a || [])
    setInformes(inf || [])
    setLoading(false)
  }

  const handleAsegFilter = (id) => {
    setFiltroAseguradora(id)
    setFiltroProducto('')
    setProductos(aseguradoras.find(a => a.id === id)?.productos || [])
  }

  const filtered = reqs.filter(r => {
    const a = !filtroAseguradora || r.polizas?.aseguradoras?.id === filtroAseguradora
    const p = !filtroProducto || r.polizas?.producto_id === filtroProducto
    const d = !filtroDesde || r.fecha_pago >= filtroDesde
    const h = !filtroHasta || r.fecha_pago <= filtroHasta
    return a && p && d && h
  })

  const toggle = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  const total = filtered.filter(r => selectedIds.includes(r.id)).reduce((s, r) => s + parseFloat(r.monto || 0), 0)

  const copiar = () => {
    const sel = filtered.filter(r => selectedIds.includes(r.id))
    if (!sel.length) { toast.error('Selecciona requerimientos'); return }
    let t = 'COMISIONES - ' + (sel[0]?.polizas?.aseguradoras?.nombre || '') + '\n' + new Date().toLocaleDateString('es-GT') + '\n\n'
    sel.forEach(r => { t += r.codigo + ' | ' + (r.polizas?.numero_poliza || '') + ' | Q ' + parseFloat(r.monto || 0).toLocaleString() + '\n' })
    t += '\nTOTAL: Q ' + total.toLocaleString()
    navigator.clipboard.writeText(t)
    toast.success('Copiado')
  }

  const enviar = async () => {
    if (!selectedIds.length) { toast.error('Selecciona requerimientos'); return }
    const sel = filtered.filter(r => selectedIds.includes(r.id))
    const asegId = sel[0]?.polizas?.aseguradoras?.id
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('requerimientos_pago').update({ informe_comision_enviado: true, fecha_informe_comision: new Date().toISOString() }).in('id', selectedIds)
    await supabase.from('informes_enviados').insert({ tipo: 'comision', aseguradora_id: asegId, fecha_desde: filtroDesde, fecha_hasta: filtroHasta, total_requerimientos: selectedIds.length, total_monto: total, created_by: user?.id })
    toast.success(selectedIds.length + ' enviados')
    setSelectedIds([])
    fetchAll()
  }

  const inp = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', background: 'white', color: '#1e293b', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0C1E3D' }}>Comisiones</h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Requerimientos pagados para cobro de comisiones</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[['Pendientes', reqs.length, '#f59e0b'], ['Seleccionados', selectedIds.length, '#1A6BBA'], ['Informes', informes.length, '#22c55e']].map(([l, c, col]) => (
          <div key={l} style={{ background: 'white', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e2e8f0', borderLeft: '4px solid ' + col }}>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>{l}</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: col }}>{c}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[['pendientes', 'Pendientes'], ['historial', 'Historial']].map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', background: activeTab === t ? '#0C1E3D' : 'white', color: activeTab === t ? 'white' : '#64748b', border: '1px solid ' + (activeTab === t ? '#0C1E3D' : '#e2e8f0') }}>
            {l}
          </button>
        ))}
      </div>

      {activeTab === 'pendientes' && (
        <div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}><Filter size={14} /> Filtros</p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Aseguradora</label>
                <select value={filtroAseguradora} onChange={e => handleAsegFilter(e.target.value)} style={{ ...inp, minWidth: '160px' }}>
                  <option value=''>Todas</option>
                  {aseguradoras.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Producto</label>
                <select value={filtroProducto} onChange={e => setFiltroProducto(e.target.value)} style={{ ...inp, minWidth: '140px' }} disabled={!filtroAseguradora}>
                  <option value=''>Todos</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Desde</label>
                <input type='date' value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Hasta</label>
                <input type='date' value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} style={inp} />
              </div>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div style={{ background: '#0C1E3D', borderRadius: '12px', padding: '14px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <p style={{ color: 'white', fontWeight: 600 }}>{selectedIds.length} seleccionados · Q {total.toLocaleString()}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={copiar} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <Copy size={14} /> Copiar
                </button>
                <button onClick={enviar} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#C8A84B', color: '#0C1E3D', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                  <Send size={14} /> Marcar enviado
                </button>
              </div>
            </div>
          )}

          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <input type='checkbox' checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={() => selectedIds.length === filtered.length ? setSelectedIds([]) : setSelectedIds(filtered.map(r => r.id))}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#1A6BBA', marginRight: '12px' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', flex: 1 }}>Requerimiento</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', width: '160px' }}>Aseguradora / Producto</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', width: '100px' }}>Fecha pago</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', width: '100px', textAlign: 'right' }}>Monto</span>
            </div>
            {loading ? <p style={{ padding: '24px', color: '#64748b' }}>Cargando...</p> :
              filtered.length === 0 ? <div style={{ padding: '48px', textAlign: 'center' }}><DollarSign size={32} color='#cbd5e1' style={{ marginBottom: '12px' }} /><p style={{ color: '#94a3b8' }}>No hay comisiones pendientes</p></div> :
                filtered.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none', background: selectedIds.includes(r.id) ? '#eff6ff' : 'white', cursor: 'pointer' }}
                    onClick={() => toggle(r.id)}>
                    <input type='checkbox' checked={selectedIds.includes(r.id)} onChange={() => toggle(r.id)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#1A6BBA', marginRight: '12px' }} onClick={e => e.stopPropagation()} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, color: '#0C1E3D', fontSize: '13px' }}>{r.codigo} <span style={{ fontWeight: 400, color: '#64748b' }}>· {r.numero_cuota}/{r.total_cuotas}</span></p>
                      <p style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.polizas?.numero_poliza} · {r.polizas?.clientes?.nombre}</p>
                    </div>
                    <div style={{ width: '160px' }}>
                      <p style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>{r.polizas?.aseguradoras?.nombre}</p>
                      <p style={{ fontSize: '11px', color: '#94a3b8' }}>{r.polizas?.productos?.nombre}</p>
                    </div>
                    <p style={{ width: '100px', fontSize: '12px', color: '#64748b' }}>{r.fecha_pago ? new Date(r.fecha_pago).toLocaleDateString('es-GT') : '-'}</p>
                    <p style={{ width: '100px', fontSize: '14px', fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>Q {parseFloat(r.monto || 0).toLocaleString()}</p>
                  </div>
                ))}
            {filtered.length > 0 && (
              <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '24px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>{filtered.length} reqs</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0C1E3D' }}>Q {filtered.reduce((s, r) => s + parseFloat(r.monto || 0), 0).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'historial' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Historial de comisiones enviadas</p>
          </div>
          {informes.length === 0 ? <div style={{ padding: '48px', textAlign: 'center' }}><BookOpen size={32} color='#cbd5e1' style={{ marginBottom: '12px' }} /><p style={{ color: '#94a3b8' }}>No hay informes</p></div> :
            informes.map((inf, i) => (
              <div key={inf.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < informes.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: '#0C1E3D', fontSize: '13px' }}>{inf.aseguradoras?.nombre}</p>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>{new Date(inf.fecha_desde).toLocaleDateString('es-GT')} → {new Date(inf.fecha_hasta).toLocaleDateString('es-GT')} · {inf.total_requerimientos} reqs</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#1A6BBA' }}>Q {parseFloat(inf.total_monto || 0).toLocaleString()}</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(inf.created_at).toLocaleDateString('es-GT')}</p>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
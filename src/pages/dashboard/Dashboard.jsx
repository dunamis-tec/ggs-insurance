import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useIsMobile } from '../../lib/useIsMobile'
import {
  FileText, Users, CreditCard, AlertCircle, TrendingUp, Clock,
  Calendar, DollarSign, Plus, CheckSquare, AlertTriangle, Activity,
  CheckCircle, ArrowRight, Check
} from 'lucide-react'

/* ── Helpers ── */
const fmtQ = (v) => `Q ${parseFloat(v || 0).toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtDateShort = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-GT', { day: '2-digit', month: 'short' }) : '—'
const diasHasta = (fecha) => {
  if (!fecha) return null
  return Math.ceil((new Date(fecha + 'T12:00:00') - new Date()) / 864e5)
}
const nombreCliente = (c) => c ? [c.nombre, c.apellido].filter(Boolean).join(' ') : '—'

const estadoLabel = { solicitud: 'Solicitud', enviada: 'Enviada', en_reproceso: 'En reproceso' }
const estadoBadge = {
  solicitud:    { bg: '#dbeafe', color: '#1d4ed8' },
  enviada:      { bg: '#fef9c3', color: '#854d0e' },
  en_reproceso: { bg: '#fee2e2', color: '#991b1b' },
}

function urgenciaStyle(dias) {
  if (dias == null) return { bg: '#f1f5f9', color: '#64748b' }
  if (dias <= 0)  return { bg: '#fef2f2', color: '#ef4444' }
  if (dias <= 7)  return { bg: '#fef2f2', color: '#ef4444' }
  if (dias <= 15) return { bg: '#fff7ed', color: '#ea580c' }
  if (dias <= 30) return { bg: '#fefce8', color: '#ca8a04' }
  return { bg: '#f0fdf4', color: '#16a34a' }
}

/* ── Sub-components ── */
function KpiCard({ label, value, icon: Icon, color, sub, sub2, alert, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white', borderRadius: '12px', padding: '18px 20px',
        border: `1px solid ${alert ? color + '60' : '#e2e8f0'}`,
        position: 'relative', overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.boxShadow = 'none' }}
    >
      {alert && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color }} />}
      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
        <Icon size={18} color={color} />
      </div>
      <p style={{ fontSize: '24px', fontWeight: 800, color: '#111111', margin: 0, letterSpacing: '-0.5px', lineHeight: 1.1 }}>{value}</p>
      <p style={{ fontSize: '13px', color: '#374151', fontWeight: 600, margin: '6px 0 2px' }}>{label}</p>
      {sub && <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{sub}</p>}
      {sub2 && <p style={{ fontSize: '11px', color: color, fontWeight: 600, margin: '4px 0 0', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>{sub2}</p>}
    </div>
  )
}

function SectionHeader({ icon: Icon, label, color, badge, badgeColor, action, onAction }) {
  return (
    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Icon size={15} color={color} />
      <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111111', margin: 0 }}>{label}</h2>
      {badge != null && (
        <span style={{ marginLeft: 'auto', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: (badgeColor || color) + '20', color: badgeColor || color, fontWeight: 700 }}>
          {badge}
        </span>
      )}
      {action && (
        <button onClick={onAction} style={{ marginLeft: badge != null ? '8px' : 'auto', fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {action} <ArrowRight size={12} />
        </button>
      )}
    </div>
  )
}

/* ── Main ── */
export default function Dashboard() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({})
  const [polizasVencen, setPolizasVencen] = useState([])
  const [reqsVencidos, setReqsVencidos] = useState([])
  const [pipeline, setPipeline] = useState([])
  const [vencimientos, setVencimientos] = useState([])
  const [tareas, setTareas] = useState([])
  const [nuevaTarea, setNuevaTarea] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const hoy = new Date().toISOString().split('T')[0]
    const en15 = new Date(Date.now() + 15 * 864e5).toISOString().split('T')[0]
    const en30 = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0]
    const en60 = new Date(Date.now() + 60 * 864e5).toISOString().split('T')[0]
    const ahora = new Date()
    const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0]
    const ultimoDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0]
    const primerDiaAnio = new Date(ahora.getFullYear(), 0, 1).toISOString().split('T')[0]

    const [
      { data: polizasActivas },
      { data: reqsPendMes },
      { data: reqsPend },
      { data: reqsVenc },
      { data: polVencen30 },
      { data: polVencen60 },
      { data: pipelineData },
      { data: tareasData },
      { count: cntVencen15 },
      { count: cntVencidas },
      { count: cntNuevasMes },
      { count: cntNuevasAnio },
    ] = await Promise.all([
      supabase.from('polizas')
        .select('id, prima_total, fecha_vencimiento, numero_poliza, estado, clientes(nombre,apellido), aseguradoras(nombre)')
        .eq('activa', true),
      supabase.from('requerimientos_pago')
        .select('monto')
        .eq('estado', 'pendiente')
        .gte('fecha_vencimiento', primerDiaMes)
        .lte('fecha_vencimiento', ultimoDiaMes),
      supabase.from('requerimientos_pago')
        .select('monto, codigo, fecha_vencimiento, polizas(numero_poliza, clientes(nombre,apellido))')
        .eq('estado', 'pendiente'),
      supabase.from('requerimientos_pago')
        .select('monto, codigo, fecha_vencimiento, polizas(numero_poliza, clientes(nombre,apellido))')
        .eq('estado', 'vencido')
        .order('fecha_vencimiento', { ascending: true })
        .limit(5),
      supabase.from('polizas')
        .select('id, numero_poliza, fecha_vencimiento, prima_total, clientes(nombre,apellido), aseguradoras(nombre)')
        .eq('activa', true)
        .lte('fecha_vencimiento', en30)
        .gte('fecha_vencimiento', hoy)
        .order('fecha_vencimiento', { ascending: true }),
      supabase.from('polizas')
        .select('id, numero_poliza, fecha_vencimiento, clientes(nombre,apellido)')
        .eq('activa', true)
        .lte('fecha_vencimiento', en60)
        .gte('fecha_vencimiento', hoy)
        .order('fecha_vencimiento', { ascending: true }),
      supabase.from('polizas')
        .select('id, numero_poliza, prima_total, estado, created_at, clientes(nombre,apellido), aseguradoras(nombre), productos(nombre)')
        .in('estado', ['solicitud', 'enviada', 'en_reproceso'])
        .order('created_at', { ascending: false })
        .limit(6),
      supabase.from('tareas')
        .select('*, polizas(numero_poliza), clientes(nombre,apellido)')
        .eq('estado', 'pendiente')
        .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
        .limit(8),
      // Card 2: pólizas que vencen en los próximos 15 días
      supabase.from('polizas')
        .select('*', { count: 'exact', head: true })
        .eq('activa', true)
        .gte('fecha_vencimiento', hoy)
        .lte('fecha_vencimiento', en15),
      // Card 3: pólizas vencidas que no se han renovado (activa=true pero ya pasó el vencimiento)
      supabase.from('polizas')
        .select('*', { count: 'exact', head: true })
        .eq('activa', true)
        .lt('fecha_vencimiento', hoy),
      // Card 4: pólizas nuevas este mes (excluye renovaciones)
      supabase.from('polizas')
        .select('*', { count: 'exact', head: true })
        .is('poliza_origen_id', null)
        .gte('created_at', primerDiaMes)
        .lte('created_at', ultimoDiaMes + 'T23:59:59'),
      // Card 4 sub2: pólizas nuevas este año (excluye renovaciones)
      supabase.from('polizas')
        .select('*', { count: 'exact', head: true })
        .is('poliza_origen_id', null)
        .gte('created_at', primerDiaAnio),
    ])

    const primaTotal = (polizasActivas || []).reduce((s, p) => s + parseFloat(p.prima_total || 0), 0)
    const montosPendMes = (reqsPendMes || []).reduce((s, r) => s + parseFloat(r.monto || 0), 0)
    const montosVenc = (reqsVenc || []).reduce((s, r) => s + parseFloat(r.monto || 0), 0)
    const mesLabel = ahora.toLocaleDateString('es-GT', { month: 'long' })
    const reqsPendProximos = (reqsPend || [])
      .filter(r => r.fecha_vencimiento && r.fecha_vencimiento >= hoy && r.fecha_vencimiento <= en60)
      .sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))
      .slice(0, 5)

    setKpis({
      primaTotal,
      cntPolizas: (polizasActivas || []).length,
      cntVencen15: cntVencen15 || 0,
      cntVencidas: cntVencidas || 0,
      montosPendMes,
      cntPendMes: (reqsPendMes || []).length,
      mesLabel,
      montosVenc,
      cntVenc: (reqsVenc || []).length,
      cntVencen30: (polVencen30 || []).length,
      cntPipeline: (pipelineData || []).length,
      cntNuevasMes: cntNuevasMes || 0,
      cntNuevasAnio: cntNuevasAnio || 0,
    })

    setPolizasVencen(polVencen30 || [])
    setReqsVencidos(reqsVenc || [])
    setPipeline(pipelineData || [])
    setTareas(tareasData || [])

    const venc = [
      ...(polVencen60 || []).map(p => ({
        tipo: 'poliza', id: p.id, label: p.numero_poliza,
        cliente: nombreCliente(p.clientes), fecha: p.fecha_vencimiento,
      })),
      ...reqsPendProximos.map(r => ({
        tipo: 'req', id: r.codigo, label: r.codigo,
        cliente: nombreCliente(r.polizas?.clientes),
        fecha: r.fecha_vencimiento, monto: r.monto,
        poliza: r.polizas?.numero_poliza,
      })),
    ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))

    setVencimientos(venc)
    setLoading(false)
  }

  const completarTarea = async (id) => {
    await supabase.from('tareas').update({ estado: 'completada', fecha_completada: new Date().toISOString() }).eq('id', id)
    setTareas(t => t.filter(x => x.id !== id))
  }

  const agregarTarea = async (e) => {
    e.preventDefault()
    if (!nuevaTarea.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('tareas').insert({ titulo: nuevaTarea, tipo: 'manual', estado: 'pendiente', created_by: user?.id }).select().single()
    if (data) setTareas(t => [...t, data])
    setNuevaTarea('')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <p style={{ color: '#64748b' }}>Cargando...</p>
    </div>
  )

  const totalAlertas = polizasVencen.length + reqsVencidos.length
  const tareasVencidas = tareas.filter(t => t.fecha_vencimiento && new Date(t.fecha_vencimiento) < new Date()).length

  return (
    <div>

      {/* ── Header ── */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
        <div style={{ padding: '20px 24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111111', margin: 0 }}>Dashboard</h1>
          <p style={{ color: '#6B6B62', fontSize: '14px', marginTop: '4px', marginBottom: 0 }}>
            {kpis.cntPolizas} pólizas activas · {kpis.cntVencen15 > 0 ? `⚠ ${kpis.cntVencen15} vencen en ≤15 días` : 'Sin vencimientos urgentes'} · {kpis.cntVencidas > 0 ? `${kpis.cntVencidas} vencidas sin renovar` : 'Sin vencidas pendientes'}
          </p>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(5,1fr)', gap: '12px', marginBottom: '20px' }}>
        <KpiCard
          label="Prima total activa" value={fmtQ(kpis.primaTotal)}
          icon={DollarSign} color="#C4A96B" sub={`${kpis.cntPolizas} pólizas emitidas`}
        />
        <KpiCard
          label="Pólizas vencen ≤15d" value={kpis.cntVencen15}
          icon={Clock} color={kpis.cntVencen15 > 0 ? '#f59e0b' : '#22c55e'}
          sub="vencimiento próximo"
          alert={kpis.cntVencen15 > 0}
        />
        <KpiCard
          label="Vencidas sin renovar" value={kpis.cntVencidas}
          icon={AlertTriangle} color={kpis.cntVencidas > 0 ? '#ef4444' : '#22c55e'}
          sub="pólizas por gestionar"
          alert={kpis.cntVencidas > 0}
        />
        <KpiCard
          label={`Pólizas nuevas — ${kpis.mesLabel}`} value={kpis.cntNuevasMes}
          icon={TrendingUp} color="#C4A96B"
          sub="nuevas este mes (sin renovaciones)"
          sub2={`${kpis.cntNuevasAnio} nuevas en ${new Date().getFullYear()}`}
        />
        <KpiCard
          label="Requerimientos de pago" value={kpis.cntVenc > 0 ? `${kpis.cntVenc} vencidos` : 'Al día'}
          icon={CreditCard} color={kpis.cntVenc > 0 ? '#ef4444' : '#22c55e'}
          sub={`${fmtQ(kpis.montosVenc)} pendiente de cobro`}
          alert={kpis.cntVenc > 0}
          onClick={() => navigate('/requerimientos')}
        />
      </div>

      {/* ── Main 2-col: Pipeline | Alertas + Tareas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap: '16px', marginBottom: '16px', alignItems: 'stretch' }}>

        {/* Pipeline — columna dominante */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <SectionHeader
            icon={Activity} label="Pipeline de solicitudes"
            color="#C4A96B" badge={pipeline.length}
            action="Ver pólizas" onAction={() => navigate('/polizas')}
          />
          <div style={{ padding: '4px 16px 16px', flex: 1, overflowY: 'auto' }}>
            {pipeline.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <FileText size={28} color='#cbd5e1' style={{ marginBottom: '8px' }} />
                <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Sin solicitudes pendientes</p>
              </div>
            ) : pipeline.map(p => {
              const badge = estadoBadge[p.estado] || { bg: '#f1f5f9', color: '#64748b' }
              return (
                <div key={p.id}
                  onClick={() => navigate('/polizas', { state: { openPolizaId: p.id } })}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#111111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.numero_poliza || '(Sin número)'}
                      </p>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '20px', background: badge.bg, color: badge.color, fontWeight: 700, flexShrink: 0 }}>
                        {estadoLabel[p.estado]}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {nombreCliente(p.clientes)} · {p.aseguradoras?.nombre}
                    </p>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#C4A96B', margin: 0, flexShrink: 0 }}>{fmtQ(p.prima_total)}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Columna derecha: Alertas + Tareas apiladas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>

          {/* Alertas críticas */}
          <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${totalAlertas > 0 ? '#fecaca' : '#e2e8f0'}`, overflow: 'hidden' }}>
            <SectionHeader
              icon={AlertTriangle} label="Alertas críticas"
              color="#ef4444" badge={totalAlertas} badgeColor="#ef4444"
              action="Ver reqs." onAction={() => navigate('/requerimientos')}
            />
            <div style={{ padding: '4px 16px 16px' }}>
              {totalAlertas === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <CheckCircle size={16} color='#22c55e' />
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Sin alertas críticas</p>
                </div>
              ) : (
                <>
                  {polizasVencen.length > 0 && (
                    <>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase', margin: '14px 0 6px' }}>Pólizas por vencer</p>
                      {polizasVencen.map(p => {
                        const dias = diasHasta(p.fecha_vencimiento)
                        const { bg, color } = urgenciaStyle(dias)
                        return (
                          <div key={p.id}
                            onClick={() => navigate('/polizas', { state: { openPolizaId: p.id } })}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ fontSize: '13px', fontWeight: 600, color: '#111111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.numero_poliza}</p>
                              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombreCliente(p.clientes)}</p>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', background: bg, color, flexShrink: 0, marginLeft: '8px' }}>
                              {dias <= 0 ? 'Venció' : `${dias}d`}
                            </span>
                          </div>
                        )
                      })}
                    </>
                  )}
                  {reqsVencidos.length > 0 && (
                    <>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase', margin: '14px 0 6px' }}>Reqs. vencidos</p>
                      {reqsVencidos.map(r => (
                        <div key={r.codigo}
                          onClick={() => navigate('/requerimientos')}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#111111', margin: 0 }}>{r.codigo}</p>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombreCliente(r.polizas?.clientes)}</p>
                          </div>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', margin: 0, flexShrink: 0, marginLeft: '8px' }}>{fmtQ(r.monto)}</p>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Tareas */}
          <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${tareasVencidas > 0 ? '#fecaca' : '#e2e8f0'}`, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <SectionHeader
              icon={CheckSquare} label="Tareas pendientes"
              color="#111111" badge={tareas.length}
              action="Ver todas" onAction={() => navigate('/tareas')}
            />
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 0' }}>
              {tareas.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>¡Sin tareas pendientes! 🎉</p>
                </div>
              ) : tareas.map(t => {
                const dias = t.fecha_vencimiento ? diasHasta(t.fecha_vencimiento) : null
                const vencida = dias != null && dias < 0
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <button onClick={() => completarTarea(t.id)}
                      style={{ width: '17px', height: '17px', borderRadius: '4px', border: '2px solid #e2e8f0', background: 'white', cursor: 'pointer', flexShrink: 0, marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#111111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titulo}</p>
                      {t.fecha_vencimiento && (
                        <p style={{ fontSize: '11px', color: vencida ? '#ef4444' : '#94a3b8', margin: '2px 0 0', fontWeight: vencida ? 600 : 400 }}>
                          {vencida ? `⚠ Venció hace ${Math.abs(dias)}d` : `Vence ${fmtDateShort(t.fecha_vencimiento)}`}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Quick-add pinned at bottom */}
            <form onSubmit={agregarTarea} style={{ display: 'flex', gap: '6px', padding: '10px 16px 14px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
              <input value={nuevaTarea} onChange={e => setNuevaTarea(e.target.value)} placeholder="Nueva tarea rápida..."
                style={{ flex: 1, padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', outline: 'none', background: 'white', color: '#1e293b' }} />
              <button type="submit" style={{ padding: '7px 12px', background: '#111111', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}>
                <Plus size={13} />
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* ── Próximos vencimientos ── */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <SectionHeader icon={Calendar} label="Próximos vencimientos — 60 días" color="#C4A96B" badge={vencimientos.length} />
        {vencimientos.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Calendar size={30} color='#cbd5e1' style={{ marginBottom: '10px' }} />
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Sin vencimientos en los próximos 60 días</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Tipo', 'Referencia', 'Cliente', 'Fecha de vencimiento', 'Días restantes'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b', textAlign: 'left', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vencimientos.map((v, i) => {
                const dias = diasHasta(v.fecha)
                const { bg, color } = urgenciaStyle(dias)
                return (
                  <tr key={i}
                    onClick={() => v.tipo === 'poliza' ? navigate('/polizas', { state: { openPolizaId: v.id } }) : navigate('/requerimientos')}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: 600, background: v.tipo === 'poliza' ? '#FDF8EE' : '#dbeafe', color: v.tipo === 'poliza' ? '#92703a' : '#1d4ed8' }}>
                        {v.tipo === 'poliza' ? 'Póliza' : 'Req. pago'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: '13px', fontWeight: 600, color: '#111111' }}>{v.label}</td>
                    <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>{v.cliente || '—'}</td>
                    <td style={{ padding: '11px 16px', fontSize: '13px', color: '#475569' }}>{fmtDate(v.fecha)}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', background: bg, color }}>
                        {dias == null ? '—' : dias <= 0 ? 'Vencido' : dias === 0 ? 'Hoy' : `${dias} días`}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

    </div>
  )
}

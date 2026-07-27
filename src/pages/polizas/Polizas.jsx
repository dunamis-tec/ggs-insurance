import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { getMyEmpresaId } from '../../lib/getMyEmpresaId'
import { useIsMobile } from '../../lib/useIsMobile'
import { generateSolicitudPdf } from '../../lib/generateSolicitudPdf'
import { generateInclusionPdf } from '../../lib/generateInclusionPdf'
import { generateEstadoCuentaPdf } from '../../lib/generateEstadoCuentaPdf'
import { generateModificacionPdf } from '../../lib/generateModificacionPdf'
import { FileText, Plus, Minus, Search, ArrowLeft, Edit2, Trash2, ChevronDown, ChevronUp, ChevronRight,
  CheckCircle, Clock, AlertCircle, Car, X, RefreshCw, SendHorizonal, GitMerge,
  AlertTriangle, Download, History, CheckSquare, Square, Upload, Lock, Check, Paperclip, ExternalLink } from 'lucide-react'
import { calcularPrima } from '../../lib/calcularPrima'
import { notifyTaskAssigned } from '../../lib/notifyTaskAssigned'
import toast from 'react-hot-toast'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { ReclamoModal, ReclamosMiniList } from '../reclamos/Reclamos'

/* ─── Constants ─────────────────────────────────────────────────────────── */
const fraccionamientoOpciones = [
  { value:'semestral',  label:'Semestral',  sub:'2 pagos/año' },
  { value:'trimestral', label:'Trimestral', sub:'4 pagos/año' },
  { value:'mensual',    label:'Mensual',    sub:'12 pagos/año' },
]
const fraccionamientoLabels = { anual:'Contado', semestral:'Semestral', trimestral:'Trimestral', mensual:'Mensual' }

const polizaEstados = {
  solicitud:    { bg:'#F5F0E8', color:'#7A5A1E', label:'Solicitud' },
  enviada:      { bg:'#FBF5E6', color:'#C4A96B', label:'Enviada' },
  en_reproceso: { bg:'#111111', color:'#C4A96B', label:'En reproceso' },
  emitida:      { bg:'#C4A96B', color:'#ffffff', label:'Emitida' },
  completado:   { bg:'#2C2C2C', color:'#C4A96B', label:'Completado' },
  cancelada:    { bg:'#F1F5F9', color:'#94A3B8', label:'Cancelada' },
}
// Flujo lineal simple (un solo siguiente): solicitud→enviada, en_reproceso→enviada (regresa)
const estadoFlujo  = { solicitud:'enviada', en_reproceso:'enviada' }
const estadoFlujoLabel = { solicitud:'Enviada a la aseguradora', en_reproceso:'Re-enviada a la aseguradora' }

const getCamposReq = (tipo) => tipo === 'empresa'
  ? [
      { key:'nit',                        label:'NIT empresa' },
      { key:'rep_legal_nombre',            label:'Nombre rep. legal' },
      { key:'rep_legal_nit',              label:'NIT rep. legal' },
      { key:'rep_legal_fecha_nacimiento', label:'Fecha nac. rep. legal' },
      { key:'dpi',                        label:'DPI rep. legal' },
      { key:'fecha_constitucion',         label:'Fecha de constitución' },
    ]
  : [
      { key:'nombre',          label:'Nombre' },
      { key:'nit',             label:'NIT' },
      { key:'email',           label:'Correo' },
      { key:'telefono',        label:'Teléfono' },
      { key:'dpi',             label:'DPI' },
      { key:'fecha_nacimiento',label:'Fecha de nacimiento' },
      { key:'direccion',       label:'Dirección' },
    ]

const fp = (v) => v?.tipo_placa ? `${v.tipo_placa}${v?.placa||''}` : (v?.placa || 'N/A')
const emisionTipos = { emision:'Emision', inclusion:'Inclusion', exclusion:'Exclusion', renovacion:'Renovacion', modificacion:'Modificacion' }
const emisionEstadoColors = { solicitada:'#C4A96B', reproceso:'#111111', emitida:'#C4A96B' }
const emisionEstadoIcons  = { solicitada: Clock, reproceso: AlertCircle, emitida: CheckCircle }

const emptyPoliza  = { cliente_id:'', aseguradora_id:'', producto_id:'', prima_neta:'', prima_total:0, monto_gasto_emision:0, monto_recargo:0, monto_iva:0, tipo_pago:'contado', numero_cuotas:1, fecha_inicio:'', fecha_vencimiento:'', vigencia:'1anio', persona_facturable_id:'', observaciones:'', ejecutivo_id:'', incluir_coberturas_pdf:false }
const emptyEmision = { tipo:'emision', prima_neta:'', tipo_pago:'contado', numero_cuotas:1, fecha_inicio:'', fecha_fin:'', notas:'', persona_facturable_id:'', metodo_pago:'', incluir_coberturas_pdf:false }
const emptyReq     = { monto:'', fecha_vencimiento:'', total_cuotas:1, emision_id:'', numero_req_matriz:'' }

/* ─── SearchSelect ───────────────────────────────────────────────────────── */
function SearchSelect({ value, onChange, options, placeholder, labelKey='nombre', valueKey='id', renderOption }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o[valueKey] === value)
  const filtered = options.filter(o => {
    const label = renderOption
      ? `${o.nombre||''} ${o.apellido||''} ${o.razon_social||''} ${o.nombre_empresa||''}`
      : (o[labelKey]||'')
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

/* ─── Draft key ─────────────────────────────────────────────────────────── */
const DRAFT_KEY = 'poliza_draft_v1'

/* ─── Vehicle modal helpers ──────────────────────────────────────────────── */
const _tiposPlacaV    = ['M','C','P','CD','A','MI','TC']
const _tiposVehiculoV = ['sedan','pickup','suv','van','moto','camion','otro']
const _placaRegexV    = /^\d{3}[A-Z]{3}$/
const _emptyVehicleForm = { marca:'', modelo:'', anio:'', placa:'', tipo_placa:'', tipo:'sedan', valor_asegurado:'' }
const _inpV = { width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', background:'white', color:'#1e293b', boxSizing:'border-box', outline:'none' }
const _lblV = { display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'4px' }

const _complianceQuestions = [
  { key:'pep',            label:'¿Es o ha sido en los últimos dos años Persona Expuesta Políticamente (PEP)?' },
  { key:'pep_parentesco', label:'¿Tiene parentesco o está relacionado con una Persona Expuesta Políticamente (PEP)?' },
  { key:'cpe',            label:'¿Es o ha sido en el último año Contratista o Proveedor del Estado (CPE)?' },
]

function CompletarClienteModal({ clienteId, campos, onClose, onSaved }) {
  const [vform, setVform] = useState({})
  const [compliance, setCompliance] = useState({ pep: null, pep_parentesco: null, cpe: null })
  const [clienteTipo, setClienteTipo] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init = {}
    campos.forEach(c => { init[c.key] = '' })
    setVform(init)
    supabase.from('clientes').select('tipo,pep,pep_parentesco,cpe').eq('id', clienteId).single()
      .then(({ data }) => {
        if (!data) return
        setClienteTipo(data.tipo)
        setCompliance({
          pep:            data.pep            ?? null,
          pep_parentesco: data.pep_parentesco ?? null,
          cpe:            data.cpe            ?? null,
        })
      })
  }, [])

  const handleSave = async () => {
    const missingFields = campos.filter(c => !vform[c.key]?.trim())
    if (missingFields.length) { toast.error(`Completa: ${missingFields.map(f=>f.label).join(', ')}`); return }
    const unanswered = _complianceQuestions.filter(q => compliance[q.key] === null)
    if (unanswered.length) { toast.error('Responde todas las preguntas de cumplimiento'); return }
    setSaving(true)
    const payload = { ...vform, ...compliance }
    if (clienteTipo === 'prospecto') payload.tipo = 'individual'
    const { error } = await supabase.from('clientes').update(payload).eq('id', clienteId)
    if (error) { toast.error('Error al guardar: ' + error.message); setSaving(false); return }
    toast.success(clienteTipo === 'prospecto' ? 'Perfil completado · Cliente activado' : 'Datos del cliente actualizados')
    onSaved()
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'white',borderRadius:'16px',width:'100%',maxWidth:'480px',padding:'28px',boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
          <p style={{fontSize:'16px',fontWeight:700,color:'#111111',margin:0}}>Completar perfil del cliente</p>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',padding:'4px',display:'flex'}}><X size={18} color="#64748b"/></button>
        </div>
        <p style={{fontSize:'13px',color:'#64748b',margin:'0 0 20px'}}>
          Completa los datos requeridos para continuar.
          {clienteTipo === 'prospecto' && <strong style={{color:'#C4A96B'}}> El prospecto pasará a ser cliente al guardar.</strong>}
        </p>

        {/* Campos faltantes */}
        {campos.length > 0 && (
          <div style={{marginBottom:'20px'}}>
            <p style={{fontSize:'12px',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.5px',margin:'0 0 12px'}}>{clienteTipo === 'empresa' ? 'Datos de la empresa' : 'Datos del perfil'}</p>
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {campos.map(c => (
                <div key={c.key}>
                  <label style={_lblV}>{c.label} *</label>
                  {c.key === 'direccion' ? (
                    <textarea
                      value={vform[c.key]||''}
                      onChange={e=>setVform(f=>({...f,[c.key]:e.target.value}))}
                      placeholder="Zona, municipio, departamento..."
                      rows={2}
                      style={{..._inpV, resize:'vertical', fontFamily:'inherit'}}
                    />
                  ) : (
                    <input
                      type={c.key==='email'?'email':['fecha_nacimiento','rep_legal_fecha_nacimiento','fecha_constitucion'].includes(c.key)?'date':'text'}
                      value={vform[c.key]||''}
                      onChange={e=>setVform(f=>({...f,[c.key]:e.target.value}))}
                      placeholder={({'nit':'CF / 1234567-8','rep_legal_nit':'1234567-8','telefono':'5555-5555','email':'correo@ejemplo.com','dpi':'0000 00000 0000','rep_legal_nombre':'Nombre completo'})[c.key]||''}
                      style={_inpV}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cumplimiento PEP / CPE */}
        <div>
          <p style={{fontSize:'12px',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.5px',margin:'0 0 4px'}}>Cumplimiento *</p>
          <p style={{fontSize:'12px',color:'#94a3b8',margin:'0 0 12px'}}>Todas las preguntas son obligatorias</p>
          {_complianceQuestions.map(({ key, label }) => (
            <div key={key} style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'12px',padding:'11px 0',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'13px',color:'#374151',margin:0,flex:1,lineHeight:'1.4'}}>{label}</p>
              <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                {[true, false].map(val => (
                  <button key={String(val)} type="button"
                    onClick={() => setCompliance(c => ({...c,[key]:val}))}
                    style={{padding:'6px 16px',borderRadius:'6px',fontSize:'13px',fontWeight:600,cursor:'pointer',
                      border: `1.5px solid ${compliance[key]===val?(val?'#C4A96B':'#e2e8f0'):'#e2e8f0'}`,
                      background: compliance[key]===val?(val?'#FDF8EE':'#f1f5f9'):'white',
                      color: compliance[key]===val?(val?'#C4A96B':'#111111'):'#94a3b8'}}>
                    {val ? 'Sí' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:'10px',marginTop:'24px'}}>
          <button onClick={onClose} style={{flex:1,padding:'10px',background:'white',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',cursor:'pointer',color:'#64748b'}}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            style={{flex:2,padding:'10px',background:'#C4A96B',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1}}>
            {saving ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NuevoVehiculoModal({ clienteId, onClose, onSaved }) {
  const [vform, setVform] = useState(_emptyVehicleForm)
  const [placaErr, setPlacaErr] = useState('')
  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    if (!vform.marca.trim()) { toast.error('La marca es obligatoria'); return }
    if (!vform.modelo.trim()) { toast.error('El modelo es obligatorio'); return }
    if (!vform.tipo_placa) { toast.error('Selecciona el tipo de placa'); return }
    if (!vform.placa) { toast.error('La placa es obligatoria'); return }
    if (!_placaRegexV.test(vform.placa)) { toast.error('Formato de placa inválido. Usa 123ABC'); return }
    if (placaErr) { toast.error(placaErr); return }
    const { data: existe } = await supabase.from('vehiculos').select('id').eq('placa', vform.placa).eq('activo', true)
    if (existe?.length > 0) { setPlacaErr('Esta placa ya está registrada'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: uRow } = await supabase.from('users').select('empresa_id').eq('id', user.id).single()
    const payload = {
      ...vform,
      cliente_id: clienteId,
      anio: vform.anio ? parseInt(vform.anio) : null,
      valor_asegurado: parseFloat(vform.valor_asegurado || 0),
      activo: true,
      empresa_id: uRow?.empresa_id,
    }
    const { data: newV, error } = await supabase.from('vehiculos').insert(payload).select().single()
    if (error) { toast.error('Error al registrar vehículo: ' + error.message); setSaving(false); return }
    toast.success('Vehículo registrado')
    onSaved(newV)
  }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'white',borderRadius:'16px',width:'100%',maxWidth:'480px',padding:'28px',boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
          <p style={{fontSize:'16px',fontWeight:700,color:'#111111',margin:0}}>Registrar vehículo</p>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',padding:'4px',display:'flex'}}><X size={18} color="#64748b"/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div>
              <label style={_lblV}>Marca *</label>
              <input value={vform.marca} onChange={e=>setVform(f=>({...f,marca:e.target.value}))} placeholder="Ej: Toyota" style={_inpV}/>
            </div>
            <div>
              <label style={_lblV}>Modelo *</label>
              <input value={vform.modelo} onChange={e=>setVform(f=>({...f,modelo:e.target.value}))} placeholder="Ej: Hilux" style={_inpV}/>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div>
              <label style={_lblV}>Tipo de placa *</label>
              <select value={vform.tipo_placa} onChange={e=>setVform(f=>({...f,tipo_placa:e.target.value}))} style={_inpV}>
                <option value="">Selecciona...</option>
                {_tiposPlacaV.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={_lblV}>Placa * <span style={{fontWeight:400,color:'#94a3b8'}}>(123ABC)</span></label>
              <input value={vform.placa}
                onChange={e=>{ const v=e.target.value.toUpperCase().replace(/[^0-9A-Z]/g,''); setVform(f=>({...f,placa:v})); setPlacaErr('') }}
                maxLength={6} placeholder="123ABC"
                style={{..._inpV, borderColor:placaErr?'#ef4444':'#e2e8f0', background:placaErr?'#fef2f2':'white'}}/>
              {placaErr && <p style={{color:'#ef4444',fontSize:'11px',margin:'3px 0 0'}}>{placaErr}</p>}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div>
              <label style={_lblV}>Año</label>
              <input type="number" value={vform.anio} onChange={e=>setVform(f=>({...f,anio:e.target.value}))} placeholder="2022" style={_inpV}/>
            </div>
            <div>
              <label style={_lblV}>Tipo</label>
              <select value={vform.tipo} onChange={e=>setVform(f=>({...f,tipo:e.target.value}))} style={_inpV}>
                {_tiposVehiculoV.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={_lblV}>Valor asegurado (Q)</label>
            <input type="number" step="0.01" min="0" value={vform.valor_asegurado} onChange={e=>setVform(f=>({...f,valor_asegurado:e.target.value}))} placeholder="0.00" style={_inpV}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div>
              <label style={_lblV}>No. Chasis / VIN</label>
              <input value={vform.chasis||''} onChange={e=>setVform(f=>({...f,chasis:e.target.value}))} placeholder="Ej: 1HGBH41JX" style={_inpV}/>
            </div>
            <div>
              <label style={_lblV}>No. Motor</label>
              <input value={vform.motor||''} onChange={e=>setVform(f=>({...f,motor:e.target.value}))} placeholder="Ej: K24A2" style={_inpV}/>
            </div>
          </div>
          <div>
            <label style={_lblV}>Color</label>
            <input value={vform.color||''} onChange={e=>setVform(f=>({...f,color:e.target.value}))} placeholder="Ej: Blanco" style={_inpV}/>
          </div>
        </div>
        <div style={{display:'flex',gap:'10px',marginTop:'24px'}}>
          <button onClick={onClose} style={{flex:1,padding:'10px',background:'white',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',cursor:'pointer',color:'#64748b'}}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            style={{flex:2,padding:'10px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1}}>
            {saving ? 'Registrando...' : 'Registrar vehículo'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Polizas component ─────────────────────────────────────────────── */
export default function Polizas() {
  const isMobile = useIsMobile()
  const [polizas, setPolizas]       = useState([])
  const [clientes, setClientes]     = useState([])
  const [aseguradoras, setAseguradoras] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [view, setView]             = useState('list')
  const [selected, setSelected]     = useState(null)
  const [form, setForm]             = useState(emptyPoliza)
  const [editing, setEditing]       = useState(null)
  const [returnToPolizaId, setReturnToPolizaId] = useState(null)
  const [editingPolizaEstado, setEditingPolizaEstado] = useState(null)
  const [productosFiltered, setProductosFiltered] = useState([])
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  // Client validation & vehicle selection
  const [clienteVehiculos, setClienteVehiculos]     = useState([])
  const [vehiculosSeleccionados, setVehiculosSeleccionados] = useState([])
  const [vehiculosPrimasForm, setVehiculosPrimasForm] = useState({})
  const [vehiculosDeduciblesForm, setVehiculosDeduciblesForm] = useState({})
  const [clienteValidation, setClienteValidation]   = useState([])
  const [personasFacturables, setPersonasFacturables] = useState([])
  const [aseguradoraConfig, setAseguradoraConfig] = useState(null)
  const [productoComPct, setProductoComPct] = useState(0)
  const [usuariosForm, setUsuariosForm] = useState([])
  const [showCompletarClienteModal, setShowCompletarClienteModal] = useState(false)
  const [showNuevoVehiculoModal, setShowNuevoVehiculoModal] = useState(false)
  const [draftBanner, setDraftBanner] = useState(false)
  const location  = useLocation()
  const navigate  = useNavigate()
  const fromClienteId = location.state?.fromClienteId || null
  const fromReqId     = location.state?.fromReqId     || null
  const prefilledClienteId = location.state?.prefilledClienteId || null

  useEffect(() => { fetchAll() }, [])

  // Sync URL → view: open detail if URL has /polizas/{id}, reset to list if at root
  useEffect(() => {
    const urlId = location.pathname.replace(/^\/polizas\/?/, '')
    // Reset to list when navigating to /polizas root (e.g. clicking nav link from a detail)
    if (!urlId && !location.state?.openPolizaId && view !== 'list') {
      setView('list'); setSelected(null); return
    }
    if (polizas.length === 0) return
    // Priority 1: location.state (cross-page navigation)
    if (location.state?.openPolizaId) {
      const p = polizas.find(p => p.id === location.state.openPolizaId)
      if (p) { setSelected(p); setView('detalle'); navigate('/polizas/' + p.id, { replace: true }) }
      return
    }
    // Priority 2: URL path on direct load / refresh
    if (urlId && view === 'list') {
      const p = polizas.find(p => p.id === urlId)
      if (p) { setSelected(p); setView('detalle') }
    }
  }, [location.state, location.pathname, polizas])

  useEffect(() => {
    if (location.state?.newPoliza && prefilledClienteId && clientes.length > 0) {
      handleClienteChange(prefilledClienteId)
      setForm(f => ({ ...f, cliente_id: prefilledClienteId }))
      setEditing(null)
      setView('form')
    }
  }, [location.state, clientes])

  const fetchAll = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: myRow } = await supabase.from('users').select('empresa_id').eq('id', user.id).single()
    const empresaId = myRow?.empresa_id || null
    const [{ data: polizasData }, { data: clientesData }, { data: aseguradorasData }, { data: usuariosData }] = await Promise.all([
      supabase.from('polizas').select('*, clientes(nombre,apellido,tipo,razon_social,nombre_empresa,nit,email,telefono,dpi), aseguradoras(nombre,logo_url,codigo_agente), productos(nombre), poliza_origen:poliza_origen_id(id,numero_poliza), emisiones(tipo,estado,prima_emision)')
        .eq('activa', true).order('created_at', { ascending: false }),
      supabase.from('clientes').select('id,nombre,apellido,tipo,nit,email,telefono,dpi,razon_social,nombre_empresa').eq('activo', true).order('nombre'),
      supabase.from('aseguradoras').select('id,nombre,logo_url,porcentaje_gasto_emision,productos(id,nombre,activo,producto_comisiones(porcentaje))').eq('activa', true).order('nombre'),
      empresaId
        ? supabase.from('users').select('id,nombre').eq('activo', true).eq('empresa_id', empresaId).order('nombre')
        : supabase.from('users').select('id,nombre').eq('activo', true).order('nombre'),
    ])
    setPolizas(polizasData || [])
    setClientes(clientesData || [])
    setAseguradoras(aseguradorasData || [])
    setUsuariosForm(usuariosData || [])
    setLoading(false)
  }

  const handleAseguradoraChange = async (id) => {
    const aseg = aseguradoras.find(a => a.id === id)
    setProductosFiltered(aseg?.productos?.filter(p=>p.activo) || [])
    setForm(f => ({ ...f, aseguradora_id: id, producto_id: '' }))
    // Load recargo_fraccionamiento rates for this aseguradora
    if (id) {
      const { data: recargos } = await supabase.from('recargo_fraccionamiento').select('numero_cuotas, porcentaje').eq('aseguradora_id', id).order('numero_cuotas')
      setAseguradoraConfig({ porcentaje_gasto_emision: aseg?.porcentaje_gasto_emision ?? 5, recargos: recargos || [] })
      setProductoComPct(0)
    } else {
      setAseguradoraConfig(null); setProductoComPct(0)
    }
  }

  const handleClienteChange = async (id) => {
    setForm(f => ({ ...f, cliente_id: id, persona_facturable_id: '' }))
    setVehiculosSeleccionados([])
    setVehiculosPrimasForm({})
    setVehiculosDeduciblesForm({})
    setClienteVehiculos([])
    setClienteValidation([])
    setPersonasFacturables([])
    if (!id) return
    const { data: c } = await supabase.from('clientes').select('*').eq('id', id).single()
    const missing = getCamposReq(c?.tipo).filter(f => !c?.[f.key])
    setClienteValidation(missing)
    const [{ data: vData }, { data: pfData }] = await Promise.all([
      supabase.from('vehiculos').select('*').eq('cliente_id', id).eq('activo', true).order('marca'),
      supabase.from('personas_facturables').select('*').eq('cliente_id', id).eq('activa', true).order('nombre'),
    ])
    const allVehiculos = vData || []
    // Exclude vehicles already covered by a vigent emission (emision/inclusion emitida or completado)
    if (allVehiculos.length > 0) {
      const { data: emVehData } = await supabase
        .from('emision_vehiculos')
        .select('vehiculo_id, emisiones!inner(tipo, estado, polizas!inner(estado, fecha_vencimiento, activa))')
        .in('vehiculo_id', allVehiculos.map(v => v.id))
      const _hoy = new Date().toISOString().split('T')[0]
      const coveredIds = new Set(
        (emVehData || [])
          .filter(ev => {
            const em = ev.emisiones; const p = em?.polizas
            if (!['emision','inclusion'].includes(em?.tipo)) return false
            if (!['emitida','completado'].includes(em?.estado)) return false
            if (!p || p.estado !== 'emitida' || !p.activa) return false
            if (p.fecha_vencimiento && p.fecha_vencimiento < _hoy) return false // vencida → disponible
            return true
          })
          .map(ev => ev.vehiculo_id)
      )
      setClienteVehiculos(allVehiculos.filter(v => !coveredIds.has(v.id)))
    } else {
      setClienteVehiculos([])
    }
    setPersonasFacturables(pfData || [])
  }

  const refreshVehiculos = async () => {
    const id = form.cliente_id
    if (!id) return
    const { data: vData } = await supabase.from('vehiculos').select('*').eq('cliente_id', id).eq('activo', true).order('marca')
    const allVehiculos = vData || []
    if (allVehiculos.length > 0) {
      const { data: emVehData } = await supabase
        .from('emision_vehiculos')
        .select('vehiculo_id, emisiones!inner(tipo, estado, polizas!inner(estado, fecha_vencimiento, activa))')
        .in('vehiculo_id', allVehiculos.map(v => v.id))
      const _hoy = new Date().toISOString().split('T')[0]
      const coveredIds = new Set(
        (emVehData || [])
          .filter(ev => {
            const em = ev.emisiones; const p = em?.polizas
            if (!['emision','inclusion'].includes(em?.tipo)) return false
            if (!['emitida','completado'].includes(em?.estado)) return false
            if (!p || p.estado !== 'emitida' || !p.activa) return false
            if (p.fecha_vencimiento && p.fecha_vencimiento < _hoy) return false
            return true
          })
          .map(ev => ev.vehiculo_id)
      )
      setClienteVehiculos(allVehiculos.filter(v => !coveredIds.has(v.id)))
    } else {
      setClienteVehiculos([])
    }
  }

  const toggleVehiculo = (id) => {
    setVehiculosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleFechaInicioChange = (fecha) => {
    let fechaVenc = ''
    if (fecha && form.vigencia === '1anio') {
      const d = new Date(fecha); d.setFullYear(d.getFullYear() + 1)
      fechaVenc = d.toISOString().split('T')[0]
    }
    setForm(f => ({ ...f, fecha_inicio: fecha, fecha_vencimiento: fechaVenc }))
  }

  const handleVigenciaChange = (vigencia) => {
    let fechaVenc = form.fecha_vencimiento
    if (vigencia === '1anio' && form.fecha_inicio) {
      const d = new Date(form.fecha_inicio); d.setFullYear(d.getFullYear() + 1)
      fechaVenc = d.toISOString().split('T')[0]
    } else if (vigencia === 'manual') { fechaVenc = '' }
    setForm(f => ({ ...f, vigencia, fecha_vencimiento: fechaVenc }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()

    // Restricted edit for emitida polizas — only ejecutivo + observaciones
    if (editing && editingPolizaEstado === 'emitida') {
      const { data: original } = await supabase.from('polizas')
        .select('ejecutivo_id, observaciones, ejecutivo_user:ejecutivo_id(nombre)').eq('id', editing).single()
      const { error } = await supabase.from('polizas')
        .update({ ejecutivo_id: form.ejecutivo_id || null, observaciones: form.observaciones || null })
        .eq('id', editing)
      if (error) { toast.error('Error: ' + error.message); return }
      const ejOrig = original?.ejecutivo_user?.nombre || 'Sin asignar'
      const ejNew  = usuariosForm.find(u => u.id === form.ejecutivo_id)?.nombre || 'Sin asignar'
      const changes = []
      if ((original?.ejecutivo_id||null) !== (form.ejecutivo_id||null)) changes.push(`Dueño ejecutivo: ${ejOrig} → ${ejNew}`)
      if ((original?.observaciones||'') !== (form.observaciones||'')) changes.push('Observaciones actualizadas')
      if (changes.length > 0) {
        const { data: myRow2 } = await supabase.from('users').select('empresa_id').eq('id', user.id).single()
        await supabase.from('bitacora_polizas').insert({ poliza_id: editing, descripcion: changes.join(' · '), created_by: user?.id, empresa_id: myRow2?.empresa_id || null })
      }
      toast.success('Póliza actualizada')
      const backId = editing
      const { data: updatedPoliza } = await supabase.from('polizas')
        .select('*, clientes(nombre,apellido,tipo,razon_social,nombre_empresa,nit,email,telefono,dpi), aseguradoras(nombre,logo_url,codigo_agente), productos(nombre), poliza_origen:poliza_origen_id(id,numero_poliza)')
        .eq('id', backId).single()
      if (updatedPoliza) setSelected(updatedPoliza)
      setEditing(null); setReturnToPolizaId(null); setEditingPolizaEstado(null)
      setForm(emptyPoliza)
      setView('detalle')
      navigate('/polizas/' + backId, { replace: true })
      fetchAll()
      return
    }

    if (!form.cliente_id)     { toast.error('Selecciona un cliente'); return }
    if (clienteValidation.length > 0) {
      toast.error(`Faltan datos del cliente: ${clienteValidation.map(f=>f.label).join(', ')}`)
      return
    }
    if (!form.aseguradora_id) { toast.error('Selecciona una aseguradora'); return }
    if (!form.producto_id)    { toast.error('Selecciona un producto'); return }
    if (form.tipo_pago === 'financiado' && (parseInt(form.numero_cuotas) || 0) < 2) { toast.error('El número de cuotas debe ser al menos 2'); return }
    if (!form.fecha_inicio || !form.fecha_vencimiento) { toast.error('Completa las fechas de vigencia'); return }

    if (editing) {
      /* ── EDIT mode ── */
      // Fetch original to diff changes
      const { data: original } = await supabase.from('polizas')
        .select('*, aseguradoras(nombre), productos(nombre), personas_facturables:persona_facturable_id(nombre,apellido), ejecutivo_user:ejecutivo_id(nombre)')
        .eq('id', editing).single()

      const _r2e = n => Math.round(n*100)/100
      const _pct_rec_e = form.tipo_pago==='contado'?0:(aseguradoraConfig?.recargos?.find(r=>r.numero_cuotas===parseInt(form.numero_cuotas))?.porcentaje||0)
      let _ePN=0, _eGasto=0, _eRec=0, _eIva=0, _eTotal=0
      const _vehiculoPrimasCalcEdit = vehiculosSeleccionados.map(vid => {
        const pn = parseFloat(vehiculosPrimasForm[vid]||0)
        const ded = vehiculosDeduciblesForm[vid] || {}
        if (!aseguradoraConfig||pn<=0) return {vehiculo_id:vid,prima_neta:0,monto_gasto_emision:0,monto_recargo:0,monto_iva:0,prima_total:0,deducible_danios:parseFloat(ded.danios||0),deducible_robo:parseFloat(ded.robo||0)}
        const c = calcularPrima(pn, aseguradoraConfig.porcentaje_gasto_emision, _pct_rec_e)
        _ePN+=c.prima_neta; _eGasto+=c.monto_gasto_emision; _eRec+=c.monto_recargo; _eIva+=c.monto_iva; _eTotal+=c.prima_total
        return {vehiculo_id:vid,...c,deducible_danios:parseFloat(ded.danios||0),deducible_robo:parseFloat(ded.robo||0)}
      })
      const payload = {
        aseguradora_id: form.aseguradora_id, producto_id: form.producto_id,
        prima_neta: _r2e(_ePN),
        prima_total: _r2e(_eTotal),
        monto_gasto_emision: _r2e(_eGasto),
        monto_recargo: _r2e(_eRec),
        monto_iva: _r2e(_eIva),
        tipo_pago: form.tipo_pago,
        fraccionamiento: 'mensual',
        numero_cuotas: form.tipo_pago === 'contado' ? 1 : (parseInt(form.numero_cuotas) || 1),
        fecha_inicio: form.fecha_inicio, fecha_vencimiento: form.fecha_vencimiento,
        persona_facturable_id: form.persona_facturable_id || null,
        observaciones: form.observaciones || null,
        ejecutivo_id: form.ejecutivo_id || null,
        incluir_coberturas_pdf: form.incluir_coberturas_pdf || false,
      }
      const { error } = await supabase.from('polizas').update(payload).eq('id', editing)
      if (error) { toast.error('Error: ' + error.message); return }

      // Build change log
      if (original) {
        const fmtQ = v => v ? `Q${parseFloat(v).toFixed(2)}` : 'Q0.00'
        const fmtDate = v => v ? new Date(v+'T12:00:00').toLocaleDateString('es-GT') : '—'
        const pfOrig = original.personas_facturables ? [original.personas_facturables.nombre, original.personas_facturables.apellido].filter(Boolean).join(' ') : 'Ninguno'
        const pfNew  = personasFacturables.find(p => p.id === form.persona_facturable_id)
        const pfNewLabel = pfNew ? [pfNew.nombre, pfNew.apellido].filter(Boolean).join(' ') : 'Ninguno'
        const ejOrig = original.ejecutivo_user?.nombre || 'Sin asignar'
        const ejNew  = usuariosForm.find(u => u.id === form.ejecutivo_id)?.nombre || 'Sin asignar'
        const asegOrig = original.aseguradoras?.nombre || '—'
        const asegNew  = aseguradoras.find(a => a.id === form.aseguradora_id)?.nombre || '—'
        const prodOrig = original.productos?.nombre || '—'
        const prodNew  = productosFiltered.find(p => p.id === form.producto_id)?.nombre || '—'
        const changes = []
        if (original.aseguradora_id !== form.aseguradora_id) changes.push(`Aseguradora: ${asegOrig} → ${asegNew}`)
        if (original.producto_id !== form.producto_id)       changes.push(`Producto: ${prodOrig} → ${prodNew}`)
        if (parseFloat(original.prima_neta||0) !== _r2e(_ePN)) changes.push(`Prima neta: ${fmtQ(original.prima_neta)} → ${fmtQ(_r2e(_ePN))}`)
        if (original.tipo_pago !== form.tipo_pago)            changes.push(`Tipo de pago: ${original.tipo_pago} → ${form.tipo_pago}`)
        if (original.fecha_inicio !== form.fecha_inicio)      changes.push(`Inicio: ${fmtDate(original.fecha_inicio)} → ${fmtDate(form.fecha_inicio)}`)
        if (original.fecha_vencimiento !== form.fecha_vencimiento) changes.push(`Vencimiento: ${fmtDate(original.fecha_vencimiento)} → ${fmtDate(form.fecha_vencimiento)}`)
        if ((original.persona_facturable_id||null) !== (form.persona_facturable_id||null)) changes.push(`Responsable de pago: ${pfOrig} → ${pfNewLabel}`)
        if ((original.ejecutivo_id||null) !== (form.ejecutivo_id||null)) changes.push(`Dueño ejecutivo: ${ejOrig} → ${ejNew}`)
        if ((original.observaciones||'') !== (form.observaciones||'')) changes.push('Observaciones actualizadas')
        const desc = changes.length > 0 ? `Solicitud editada · ${changes.join(' · ')}` : 'Solicitud editada'
        const { data: myRow2 } = await supabase.from('users').select('empresa_id').eq('id', user.id).single()
        await supabase.from('bitacora_polizas').insert({
          poliza_id: editing, descripcion: desc, created_by: user?.id, empresa_id: myRow2?.empresa_id || null
        })
      }

      // Update solicitud_vehiculos
      await supabase.from('solicitud_vehiculos').delete().eq('poliza_id', editing)
      if (_vehiculoPrimasCalcEdit.length > 0) {
        await supabase.from('solicitud_vehiculos').insert(
          _vehiculoPrimasCalcEdit.map(vc => ({
            poliza_id: editing, vehiculo_id: vc.vehiculo_id,
            prima_neta: vc.prima_neta, monto_gasto_emision: vc.monto_gasto_emision,
            monto_recargo: vc.monto_recargo, monto_iva: vc.monto_iva, prima_total: vc.prima_total,
            deducible_danios: vc.deducible_danios, deducible_robo: vc.deducible_robo,
          }))
        )
      }
      toast.success('Solicitud actualizada')
      // Return to detail view if we came from there
      if (returnToPolizaId) {
        const { data: updatedPoliza } = await supabase.from('polizas')
          .select('*, clientes(nombre,apellido,tipo,razon_social,nombre_empresa,nit,email,telefono,dpi), aseguradoras(nombre,logo_url,codigo_agente), productos(nombre), poliza_origen:poliza_origen_id(id,numero_poliza)')
          .eq('id', returnToPolizaId).single()
        if (updatedPoliza) setSelected(updatedPoliza)
        setView('detalle')
        navigate('/polizas/' + returnToPolizaId, { replace: true })
        setEditing(null); setReturnToPolizaId(null)
        setForm(emptyPoliza); setProductosFiltered([]); setClienteVehiculos([])
        setVehiculosSeleccionados([]); setVehiculosPrimasForm({}); setVehiculosDeduciblesForm({}); setClienteValidation([]); setPersonasFacturables([])
        fetchAll()
        return
      }
    } else {
      /* ── CREATE mode ── */
      const { data: numData } = await supabase.rpc('generate_numero_solicitud')
      const numero_solicitud = numData
      const _r2c = n => Math.round(n*100)/100
      const _pct_rec_c = form.tipo_pago==='contado'?0:(aseguradoraConfig?.recargos?.find(r=>r.numero_cuotas===parseInt(form.numero_cuotas))?.porcentaje||0)
      let _cPN=0, _cGasto=0, _cRec=0, _cIva=0, _cTotal=0
      const _vehiculoPrimasCalcCreate = vehiculosSeleccionados.map(vid => {
        const pn = parseFloat(vehiculosPrimasForm[vid]||0)
        const ded = vehiculosDeduciblesForm[vid] || {}
        if (!aseguradoraConfig||pn<=0) return {vehiculo_id:vid,prima_neta:0,monto_gasto_emision:0,monto_recargo:0,monto_iva:0,prima_total:0,deducible_danios:parseFloat(ded.danios||0),deducible_robo:parseFloat(ded.robo||0)}
        const c = calcularPrima(pn, aseguradoraConfig.porcentaje_gasto_emision, _pct_rec_c)
        _cPN+=c.prima_neta; _cGasto+=c.monto_gasto_emision; _cRec+=c.monto_recargo; _cIva+=c.monto_iva; _cTotal+=c.prima_total
        return {vehiculo_id:vid,...c,deducible_danios:parseFloat(ded.danios||0),deducible_robo:parseFloat(ded.robo||0)}
      })
      const payload = {
        numero_solicitud, estado: 'solicitud',
        cliente_id: form.cliente_id, aseguradora_id: form.aseguradora_id, producto_id: form.producto_id,
        prima_neta: _r2c(_cPN),
        prima_total: _r2c(_cTotal),
        monto_gasto_emision: _r2c(_cGasto),
        monto_recargo: _r2c(_cRec),
        monto_iva: _r2c(_cIva),
        tipo_pago: form.tipo_pago,
        fraccionamiento: 'mensual',
        numero_cuotas: form.tipo_pago === 'contado' ? 1 : (parseInt(form.numero_cuotas) || 1),
        fecha_inicio: form.fecha_inicio, fecha_vencimiento: form.fecha_vencimiento,
        persona_facturable_id: form.persona_facturable_id || null,
        observaciones: form.observaciones || null,
        ejecutivo_id: form.ejecutivo_id || null,
        incluir_coberturas_pdf: form.incluir_coberturas_pdf || false,
        agente_id: user?.id
      }
      const { data: polizaData, error } = await supabase.from('polizas').insert(payload).select().single()
      if (error) { toast.error('Error: ' + error.message); return }
      if (_vehiculoPrimasCalcCreate.length > 0) {
        await supabase.from('solicitud_vehiculos').insert(
          _vehiculoPrimasCalcCreate.map(vc => ({
            poliza_id: polizaData.id, vehiculo_id: vc.vehiculo_id,
            prima_neta: vc.prima_neta, monto_gasto_emision: vc.monto_gasto_emision,
            monto_recargo: vc.monto_recargo, monto_iva: vc.monto_iva, prima_total: vc.prima_total,
            deducible_danios: vc.deducible_danios, deducible_robo: vc.deducible_robo,
          }))
        )
      }
      await supabase.from('bitacora_polizas').insert({
        poliza_id: polizaData.id, estado_nuevo: 'solicitud',
        descripcion: 'Solicitud de póliza creada', created_by: user?.id
      })
      toast.success(`Solicitud creada · #${numero_solicitud}`)
      localStorage.removeItem(DRAFT_KEY)
      // Reset form state and navigate to the newly created poliza's detail view
      setForm(emptyPoliza); setEditing(null)
      setProductosFiltered([]); setClienteVehiculos([])
      setVehiculosSeleccionados([]); setVehiculosPrimasForm({}); setVehiculosDeduciblesForm({}); setClienteValidation([])
      setPersonasFacturables([])
      await fetchAll()
      setSelected(polizaData)
      setView('detalle')
      navigate('/polizas/' + polizaData.id, { replace: true })
      return
    }

    resetForm()
    fetchAll()
  }

  const resetForm = () => {
    localStorage.removeItem(DRAFT_KEY)
    const backId = returnToPolizaId
    setForm(emptyPoliza); setEditing(null)
    setReturnToPolizaId(null); setEditingPolizaEstado(null)
    setProductosFiltered([]); setClienteVehiculos([])
    setVehiculosSeleccionados([]); setVehiculosPrimasForm({}); setVehiculosDeduciblesForm({}); setClienteValidation([])
    setPersonasFacturables([])
    if (backId) {
      const pol = polizas.find(p => p.id === backId)
      if (pol) setSelected(pol)
      setView('detalle')
      navigate('/polizas/' + backId, { replace: true })
    } else {
      setView('list')
      navigate('/polizas', { replace: true })
    }
  }

  // Draft: auto-save while filling new form
  useEffect(() => {
    if (view !== 'form' || editing) return
    if (!form.cliente_id && vehiculosSeleccionados.length === 0) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, vehiculosSeleccionados, vehiculosPrimasForm, vehiculosDeduciblesForm }))
  }, [view, editing, form, vehiculosSeleccionados, vehiculosPrimasForm, vehiculosDeduciblesForm])

  // Draft: detect saved draft when opening new form
  useEffect(() => {
    if (view !== 'form' || editing) { setDraftBanner(false); return }
    const saved = localStorage.getItem(DRAFT_KEY)
    if (!saved) return
    try {
      const d = JSON.parse(saved)
      if (d?.form?.cliente_id) setDraftBanner(true)
    } catch {}
  }, [view, editing])

  const restoreDraft = async () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (!saved) { setDraftBanner(false); return }
      const draft = JSON.parse(saved)
      setDraftBanner(false)
      if (!draft?.form?.cliente_id) return
      // Reload client + aseguradora data (resets lists), then restore form + selections
      if (draft.form.cliente_id) await handleClienteChange(draft.form.cliente_id)
      if (draft.form.aseguradora_id) await handleAseguradoraChange(draft.form.aseguradora_id)
      setForm(draft.form)
      setVehiculosSeleccionados(draft.vehiculosSeleccionados || [])
      setVehiculosPrimasForm(draft.vehiculosPrimasForm || {})
      setVehiculosDeduciblesForm(draft.vehiculosDeduciblesForm || {})
      toast.success('Borrador restaurado')
    } catch {
      toast.error('Error al restaurar borrador')
    }
  }

  const handleEdit = async (p, fromDetalle = false) => {
    setReturnToPolizaId(p.id)
    setEditingPolizaEstado(p.estado)
    if (p.estado === 'emitida') {
      setForm({ ...emptyPoliza, ejecutivo_id: p.ejecutivo_id || '', observaciones: p.observaciones || '' })
      setEditing(p.id)
      setView('form')
      window.scrollTo(0, 0)
      return
    }
    const aseg = aseguradoras.find(a => a.id === p.aseguradora_id)
    setProductosFiltered(aseg?.productos?.filter(pr=>pr.activo) || [])
    // Load aseguradora config so prima recalculation works on save
    if (p.aseguradora_id) {
      const { data: recargos } = await supabase.from('recargo_fraccionamiento').select('numero_cuotas, porcentaje').eq('aseguradora_id', p.aseguradora_id).order('numero_cuotas')
      setAseguradoraConfig({ porcentaje_gasto_emision: aseg?.porcentaje_gasto_emision ?? 5, recargos: recargos || [] })
      const prod = aseg?.productos?.find(pr => pr.id === p.producto_id)
      const comision = prod?.producto_comisiones?.[0]?.porcentaje ?? 0
      setProductoComPct(comision)
    } else {
      setAseguradoraConfig(null); setProductoComPct(0)
    }
    await handleClienteChange(p.cliente_id)
    setForm({
      cliente_id: p.cliente_id, aseguradora_id: p.aseguradora_id, producto_id: p.producto_id,
      prima_neta: p.prima_neta || '', prima_total: p.prima_total, tipo_pago: p.tipo_pago||'contado',
      monto_gasto_emision: p.monto_gasto_emision || 0, monto_recargo: p.monto_recargo || 0, monto_iva: p.monto_iva || 0,
      numero_cuotas: p.tipo_pago === 'contado' ? 1 : (p.numero_cuotas || 1),
      fecha_inicio: p.fecha_inicio, fecha_vencimiento: p.fecha_vencimiento, vigencia:'manual',
      persona_facturable_id: p.persona_facturable_id || '',
      observaciones: p.observaciones || '',
      ejecutivo_id: p.ejecutivo_id || '',
      incluir_coberturas_pdf: p.incluir_coberturas_pdf || false
    })
    // Load existing vehiculos with prima
    const { data: svData } = await supabase.from('solicitud_vehiculos').select('vehiculo_id, prima_neta, deducible_danios, deducible_robo').eq('poliza_id', p.id)
    setVehiculosSeleccionados((svData||[]).map(sv => sv.vehiculo_id))
    const _primaMap = {}; const _dedMap = {}
    ;(svData||[]).forEach(sv => {
      _primaMap[sv.vehiculo_id] = String(sv.prima_neta || '')
      _dedMap[sv.vehiculo_id] = { danios: String(sv.deducible_danios || ''), robo: String(sv.deducible_robo || '') }
    })
    setVehiculosPrimasForm(_primaMap)
    setVehiculosDeduciblesForm(_dedMap)
    setEditing(p.id)
    setView('form')
    window.scrollTo(0, 0)
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminar solicitud/póliza?')) return
    await supabase.from('polizas').update({ activa: false }).eq('id', id)
    toast.success('Eliminado')
    fetchAll()
  }

  const hoy = new Date()
  const en30d = new Date(); en30d.setDate(en30d.getDate() + 30)

  const getVencimientoEstado = (p) => {
    if (!p.fecha_vencimiento) return 'activa'
    const v = new Date(p.fecha_vencimiento)
    return v < hoy ? 'vencida' : v <= en30d ? 'por_vencer' : 'activa'
  }

  const hoyStr = new Date().toISOString().split('T')[0]
  const esVigente = (p) => p.estado === 'emitida' && (!p.fecha_vencimiento || p.fecha_vencimiento >= hoyStr)

  const filtered = polizas.filter(p => {
    const matchSearch = ((p.numero_poliza||'')+' '+(p.numero_solicitud||'')+' '+(p.clientes?.nombre||'')+' '+(p.clientes?.apellido||'')+' '+(p.clientes?.razon_social||'')+' '+(p.clientes?.nombre_empresa||'')+' '+(p.aseguradoras?.nombre||'')).toLowerCase().includes(search.toLowerCase())
    let matchEstado = true
    if (filtroEstado === 'vigentes')         matchEstado = esVigente(p)
    else if (filtroEstado === 'solicitud')    matchEstado = p.estado === 'solicitud'
    else if (filtroEstado === 'enviada')      matchEstado = p.estado === 'enviada'
    else if (filtroEstado === 'en_reproceso') matchEstado = p.estado === 'en_reproceso'
    return matchSearch && matchEstado
  }).sort((a, b) => {
    // Nulls (sin fecha) al final
    if (!a.fecha_vencimiento && !b.fecha_vencimiento) return 0
    if (!a.fecha_vencimiento) return 1
    if (!b.fecha_vencimiento) return -1
    return new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento)
  })

  const counts = {
    todas:        polizas.length,
    vigentes:     polizas.filter(p => esVigente(p)).length,
    solicitud:    polizas.filter(p => p.estado === 'solicitud').length,
    enviada:      polizas.filter(p => p.estado === 'enviada').length,
    en_reproceso: polizas.filter(p => p.estado === 'en_reproceso').length,
  }

  const inp = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', background:'white', color:'#1e293b', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'4px' }

  /* ── VIEW: DETALLE ── */
  if (view === 'detalle' && selected) return (
    <PolizaDetalle poliza={selected} fromCliente={!!fromClienteId} fromReq={!!fromReqId}
      onBack={()=>{ if (fromClienteId) navigate('/clientes',{state:{openClienteId:fromClienteId}}); else if (fromReqId) navigate('/requerimientos',{state:{openReqId:fromReqId}}); else { setView('list'); navigate('/polizas', {replace:true}); fetchAll() } }}
      onEdit={(p) => handleEdit(p, true)} />
  )

  /* ── VIEW: FORM ── */
  if (view === 'form') return (
    <div>
      <button onClick={resetForm} style={{display:'flex',alignItems:'center',gap:'6px',color:'#64748b',background:'none',border:'none',cursor:'pointer',fontSize:'14px',marginBottom:'20px',padding:'0'}}>
        <ArrowLeft size={16}/> Volver a pólizas
      </button>
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',overflow:'hidden'}}>
        <div style={{padding:'20px 24px',borderBottom:'1px solid #f1f5f9'}}>
          <h2 style={{fontSize:'18px',fontWeight:700,color:'#111111',margin:0}}>{editing ? 'Editar solicitud' : 'Nueva solicitud de póliza'}</h2>
          <p style={{fontSize:'13px',color:'#6B6B62',marginTop:'4px',marginBottom:0}}>
            {editing ? 'Actualiza los datos de la solicitud' : 'Completa el formulario para crear la solicitud'}
          </p>
        </div>

        <div style={{padding:'24px'}}>
          <form onSubmit={handleSubmit}>

            {/* ─ Draft restore banner ─ */}
            {draftBanner && !editing && (
              <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:'8px',padding:'12px 16px',marginBottom:'20px',display:'flex',gap:'10px',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}>
                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  <History size={15} color='#1d4ed8' style={{flexShrink:0}}/>
                  <span style={{fontSize:'13px',color:'#1d4ed8',fontWeight:500}}>Tienes un borrador guardado. ¿Quieres restaurarlo?</span>
                </div>
                <div style={{display:'flex',gap:'8px'}}>
                  <button type="button" onClick={()=>{localStorage.removeItem(DRAFT_KEY);setDraftBanner(false)}}
                    style={{fontSize:'12px',color:'#64748b',background:'none',border:'1px solid #cbd5e1',borderRadius:'6px',cursor:'pointer',padding:'5px 10px'}}>
                    Descartar
                  </button>
                  <button type="button" onClick={restoreDraft}
                    style={{fontSize:'12px',color:'white',background:'#1d4ed8',border:'none',borderRadius:'6px',cursor:'pointer',padding:'5px 12px',fontWeight:600}}>
                    Restaurar
                  </button>
                </div>
              </div>
            )}

            {/* ─ Restricted form for emitida polizas ─ */}
            {editingPolizaEstado === 'emitida' ? (
              <>
                <div style={{background:'#fef9c3',border:'1px solid #fde68a',borderRadius:'8px',padding:'12px 16px',marginBottom:'24px',display:'flex',gap:'10px',alignItems:'center'}}>
                  <AlertTriangle size={16} color='#a16207' style={{flexShrink:0}}/>
                  <span style={{fontSize:'13px',color:'#92400e',fontWeight:500}}>Esta póliza está emitida. Solo es posible editar el Dueño Ejecutivo y las Observaciones.</span>
                </div>
                <div style={{marginBottom:'20px'}}>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                    Observaciones <span style={{fontWeight:400,color:'#94a3b8'}}>(opcional)</span>
                  </label>
                  <textarea value={form.observaciones} onChange={e=>setForm({...form,observaciones:e.target.value.toUpperCase()})}
                    rows={4} placeholder="Observaciones sobre la póliza..."
                    style={{width:'100%',padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box',background:'white',color:'#1e293b',resize:'vertical',fontFamily:'inherit',textTransform:'uppercase'}}/>
                </div>
                <div style={{marginBottom:'28px'}}>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                    Dueño Ejecutivo <span style={{fontWeight:400,color:'#94a3b8'}}>(opcional)</span>
                  </label>
                  <select value={form.ejecutivo_id} onChange={e=>setForm({...form,ejecutivo_id:e.target.value})}
                    style={{width:'100%',padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box',background:'white',color:form.ejecutivo_id?'#1e293b':'#94a3b8'}}>
                    <option value="">Sin asignar</option>
                    {usuariosForm.map(u=>(
                      <option key={u.id} value={u.id}>{[u.nombre,u.apellido].filter(Boolean).join(' ')}</option>
                    ))}
                  </select>
                </div>
                <div style={{display:'flex',gap:'8px'}}>
                  <button type="submit" style={{padding:'11px 28px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
                    Guardar cambios
                  </button>
                  <button type="button" onClick={resetForm} style={{padding:'11px 24px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>
                    Cancelar
                  </button>
                </div>
              </>
            ) : (<>

            {/* ─ Cliente ─ */}
            <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#111111',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>1 · Cliente</p>
              <div style={{marginBottom:'12px'}}>
                <label style={lbl}>Seleccionar cliente *</label>
                {prefilledClienteId ? (
                  <div style={{padding:'9px 12px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',color:'#374151'}}>
                    {clientes.find(c=>c.id===prefilledClienteId) ? (c=>c.tipo==='empresa'?(c.razon_social||c.nombre_empresa||c.nombre||''):`${c.nombre||''} ${c.apellido||''}`.trim())(clientes.find(c=>c.id===prefilledClienteId)) : '...'}
                  </div>
                ) : (
                  <SearchSelect value={form.cliente_id} onChange={handleClienteChange} options={clientes}
                    placeholder="Buscar cliente..." renderOption={c=>c.tipo==='empresa'?(c.razon_social||c.nombre_empresa||c.nombre||''):`${c.nombre||''} ${c.apellido||''}`.trim()} labelKey="nombre"/>
                )}
              </div>
              {/* Validation warning */}
              {form.cliente_id && clienteValidation.length > 0 && (
                <div style={{background:'#fef9c3',border:'1px solid #fde68a',borderRadius:'8px',padding:'12px 16px',display:'flex',gap:'10px',alignItems:'flex-start'}}>
                  <AlertTriangle size={16} color='#a16207' style={{flexShrink:0,marginTop:'1px'}}/>
                  <div>
                    <p style={{fontSize:'13px',fontWeight:600,color:'#a16207',margin:'0 0 4px'}}>El cliente no puede ser seleccionado hasta completar sus datos</p>
                    <p style={{fontSize:'12px',color:'#92400e',margin:0}}>
                      Campos faltantes: <strong>{clienteValidation.map(f=>f.label).join(', ')}</strong>
                    </p>
                    <button type="button"
                      onClick={()=>setShowCompletarClienteModal(true)}
                      style={{marginTop:'8px',fontSize:'12px',color:'white',background:'#a16207',border:'none',borderRadius:'6px',cursor:'pointer',padding:'5px 12px',fontWeight:600}}>
                      Completar datos del cliente →
                    </button>
                  </div>
                </div>
              )}
              {form.cliente_id && clienteValidation.length === 0 && (
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'8px',padding:'10px 14px',display:'flex',gap:'8px',alignItems:'center'}}>
                  <CheckCircle size={14} color='#15803d'/>
                  <p style={{fontSize:'12px',color:'#15803d',fontWeight:500,margin:0}}>Cliente con datos completos</p>
                </div>
              )}
            </div>

            {/* ─ Persona facturable ─ */}
            <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#111111',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>2 · Responsable de pago</p>
              {!form.cliente_id ? (
                <p style={{fontSize:'13px',color:'#94a3b8',margin:0}}>Selecciona un cliente para ver sus personas facturables</p>
              ) : personasFacturables.length === 0 ? (
                <div style={{background:'#f8fafc',borderRadius:'8px',padding:'14px 16px',display:'flex',alignItems:'center',gap:'10px'}}>
                  <AlertTriangle size={15} color='#94a3b8'/>
                  <p style={{fontSize:'13px',color:'#94a3b8',margin:0}}>
                    Este cliente no tiene personas facturables registradas.{' '}
                    <button type="button"
                      onClick={()=>navigate('/clientes',{state:{openClienteId:form.cliente_id}})}
                      style={{fontSize:'13px',color:'#1d4ed8',background:'none',border:'none',cursor:'pointer',padding:0,textDecoration:'underline'}}>
                      Agregar persona facturable →
                    </button>
                  </p>
                </div>
              ) : (
                <div>
                  <label style={lbl}>Persona responsable de pago <span style={{fontWeight:400,color:'#94a3b8'}}>(opcional)</span></label>
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    {personasFacturables.map(pf => {
                      const sel = form.persona_facturable_id === pf.id
                      return (
                        <div key={pf.id}
                          onClick={()=>setForm(f=>({...f,persona_facturable_id:sel?'':pf.id}))}
                          style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',background:sel?'#f0fdf4':'#f8fafc',border:`2px solid ${sel?'#16a34a':'#e2e8f0'}`,borderRadius:'10px',cursor:'pointer',transition:'all 0.15s'}}>
                          <div style={{width:'20px',height:'20px',borderRadius:'50%',border:`2px solid ${sel?'#16a34a':'#cbd5e1'}`,background:sel?'#16a34a':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            {sel && <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'white'}}/>}
                          </div>
                          <div style={{flex:1}}>
                            <p style={{fontWeight:600,color:'#111111',fontSize:'13px',margin:0}}>{pf.nombre} {pf.apellido||''}</p>
                            <p style={{fontSize:'12px',color:'#64748b',margin:0}}>NIT: {pf.nit||'N/A'}{pf.email?` · ${pf.email}`:''}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ─ Aseguradora + Producto ─ */}
            <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#111111',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>3 · Aseguradora y producto</p>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(auto-fit,minmax(220px,1fr))',gap:'16px'}}>
                <div>
                  <label style={lbl}>Aseguradora *</label>
                  <SearchSelect value={form.aseguradora_id} onChange={handleAseguradoraChange} options={aseguradoras}
                    placeholder="Buscar aseguradora..."
                    renderOption={a=>(
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        {a.logo_url && <img src={a.logo_url} style={{width:'18px',height:'18px',objectFit:'contain',borderRadius:'2px'}}/>}
                        <span>{a.nombre}</span>
                      </div>
                    )} labelKey="nombre"/>
                </div>
                <div>
                  <label style={lbl}>Producto *</label>
                  <SearchSelect value={form.producto_id} onChange={async val => {
                    setForm(f => ({...f, producto_id: val}))
                    if (val) {
                      const aseg = aseguradoras.find(a => a.id === form.aseguradora_id)
                      const prod = aseg?.productos?.find(p => p.id === val)
                      setProductoComPct(prod?.producto_comisiones?.[0]?.porcentaje ?? 0)
                    } else { setProductoComPct(0) }
                  }}
                    options={productosFiltered} placeholder={form.aseguradora_id?"Seleccionar producto...":"Primero selecciona aseguradora"} labelKey="nombre"/>
                </div>
              </div>
            </div>

            {/* ─ Vehículos ─ */}
            <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#111111',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>4 · Vehículos</p>
              {!form.cliente_id ? (
                <p style={{fontSize:'13px',color:'#94a3b8',margin:0}}>Selecciona un cliente para ver sus vehículos</p>
              ) : clienteVehiculos.length === 0 ? (
                <div style={{background:'#f8fafc',borderRadius:'8px',padding:'16px',textAlign:'center'}}>
                  <Car size={24} color='#cbd5e1' style={{marginBottom:'8px'}}/>
                  <p style={{fontSize:'13px',color:'#94a3b8',margin:0}}>Este cliente no tiene vehículos registrados</p>
                  <button type="button"
                    onClick={()=>setShowNuevoVehiculoModal(true)}
                    style={{marginTop:'10px',fontSize:'13px',color:'white',background:'#111111',border:'none',borderRadius:'8px',cursor:'pointer',padding:'8px 16px',fontWeight:600,display:'inline-flex',alignItems:'center',gap:'6px'}}>
                    <Plus size={14}/> Registrar vehículo
                  </button>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {clienteVehiculos.map(v => {
                    const sel = vehiculosSeleccionados.includes(v.id)
                    const primaVal = vehiculosPrimasForm[v.id] || ''
                    const _pctRec = form.tipo_pago==='contado'?0:(aseguradoraConfig?.recargos?.find(r=>r.numero_cuotas===parseInt(form.numero_cuotas))?.porcentaje||0)
                    const primaCalc = sel && aseguradoraConfig && parseFloat(primaVal)>0
                      ? calcularPrima(primaVal, aseguradoraConfig.porcentaje_gasto_emision, _pctRec) : null
                    const _fmtQv = n => 'Q '+parseFloat(n).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2})
                    return (
                      <div key={v.id} style={{background:sel?'#eff6ff':'#f8fafc',border:`2px solid ${sel?'#1d4ed8':'#e2e8f0'}`,borderRadius:'10px',transition:'all 0.15s'}}>
                        <div onClick={()=>toggleVehiculo(v.id)} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',cursor:'pointer'}}>
                          {sel ? <CheckSquare size={18} color='#1d4ed8'/> : <Square size={18} color='#94a3b8'/>}
                          <div style={{width:'36px',height:'36px',borderRadius:'8px',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <Car size={16} color='#C4A96B'/>
                          </div>
                          <div style={{flex:1}}>
                            <p style={{fontWeight:600,color:'#111111',fontSize:'13px',margin:0}}>{v.marca} {v.modelo} {v.anio}</p>
                            <p style={{fontSize:'12px',color:'#64748b',margin:0}}>Placa: {fp(v)} · {v.tipo}</p>
                          </div>
                          {v.valor_asegurado > 0 && <p style={{fontSize:'12px',fontWeight:600,color:'#C4A96B',margin:0,flexShrink:0}}>Q {parseFloat(v.valor_asegurado).toLocaleString()}</p>}
                        </div>
                        {sel && (
                          <div style={{padding:'0 16px 14px'}} onClick={e=>e.stopPropagation()}>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'6px'}}>
                              <div>
                                <label style={{display:'block',fontSize:'11px',fontWeight:600,color:'#374151',marginBottom:'3px'}}>Prima neta (Q)</label>
                                <input type="number" step="0.01" min="0"
                                  value={primaVal}
                                  onChange={e=>setVehiculosPrimasForm(prev=>({...prev,[v.id]:e.target.value}))}
                                  placeholder="0.00"
                                  style={{width:'100%',padding:'7px 8px',border:'1px solid #bfdbfe',borderRadius:'6px',fontSize:'13px',boxSizing:'border-box',background:'white',color:'#1e293b',outline:'none'}}/>
                              </div>
                              <div>
                                <label style={{display:'block',fontSize:'11px',fontWeight:600,color:'#374151',marginBottom:'3px'}}>Ded. daños (%)</label>
                                <input type="number" step="0.01" min="0" max="100"
                                  value={vehiculosDeduciblesForm[v.id]?.danios || ''}
                                  onChange={e=>setVehiculosDeduciblesForm(prev=>({...prev,[v.id]:{...(prev[v.id]||{}),danios:e.target.value}}))}
                                  placeholder="0.00"
                                  style={{width:'100%',padding:'7px 8px',border:'1px solid #bfdbfe',borderRadius:'6px',fontSize:'13px',boxSizing:'border-box',background:'white',color:'#1e293b',outline:'none'}}/>
                              </div>
                              <div>
                                <label style={{display:'block',fontSize:'11px',fontWeight:600,color:'#374151',marginBottom:'3px'}}>Ded. robo (%)</label>
                                <input type="number" step="0.01" min="0" max="100"
                                  value={vehiculosDeduciblesForm[v.id]?.robo || ''}
                                  onChange={e=>setVehiculosDeduciblesForm(prev=>({...prev,[v.id]:{...(prev[v.id]||{}),robo:e.target.value}}))}
                                  placeholder="0.00"
                                  style={{width:'100%',padding:'7px 8px',border:'1px solid #bfdbfe',borderRadius:'6px',fontSize:'13px',boxSizing:'border-box',background:'white',color:'#1e293b',outline:'none'}}/>
                              </div>
                            </div>
                            {primaCalc && (
                              <div style={{background:'white',borderRadius:'6px',padding:'8px 10px',border:'1px solid #bfdbfe',fontSize:'12px'}}>
                                <div style={{display:'flex',justifyContent:'space-between',color:'#64748b',marginBottom:'2px'}}><span>+ Gastos ({aseguradoraConfig.porcentaje_gasto_emision}%)</span><span>{_fmtQv(primaCalc.monto_gasto_emision)}</span></div>
                                {primaCalc.monto_recargo>0&&<div style={{display:'flex',justifyContent:'space-between',color:'#64748b',marginBottom:'2px'}}><span>+ Recargo ({_pctRec}%)</span><span>{_fmtQv(primaCalc.monto_recargo)}</span></div>}
                                <div style={{display:'flex',justifyContent:'space-between',color:'#64748b',marginBottom:'4px'}}><span>+ IVA 12%</span><span>{_fmtQv(primaCalc.monto_iva)}</span></div>
                                <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,color:'#111111',borderTop:'1px solid #e2e8f0',paddingTop:'4px'}}><span>Prima total</span><span>{_fmtQv(primaCalc.prima_total)}</span></div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {vehiculosSeleccionados.length > 0 && (
                    <p style={{fontSize:'12px',color:'#1d4ed8',margin:'4px 0 0',fontWeight:500}}>{vehiculosSeleccionados.length} vehículo(s) seleccionado(s)</p>
                  )}
                </div>
              )}
            </div>

            {/* ─ Pago + Prima ─ */}
            <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#111111',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>5 · Pago y prima</p>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(auto-fit,minmax(200px,1fr))',gap:'16px'}}>
                {vehiculosSeleccionados.length > 0 && aseguradoraConfig && (() => {
                  const _pr = form.tipo_pago==='contado'?0:(aseguradoraConfig.recargos?.find(r=>r.numero_cuotas===parseInt(form.numero_cuotas))?.porcentaje||0)
                  const _r2s = n => Math.round(n*100)/100
                  let _sPN=0,_sG=0,_sR=0,_sI=0,_sT=0
                  vehiculosSeleccionados.forEach(vid=>{
                    const pn=parseFloat(vehiculosPrimasForm[vid]||0)
                    if(pn>0){const c=calcularPrima(pn,aseguradoraConfig.porcentaje_gasto_emision,_pr);_sPN+=c.prima_neta;_sG+=c.monto_gasto_emision;_sR+=c.monto_recargo;_sI+=c.monto_iva;_sT+=c.prima_total}
                  })
                  if(_sT===0) return null
                  const _fmtS = n => 'Q '+parseFloat(n).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2})
                  return (
                    <div style={{background:'#f8fafc',borderRadius:'8px',padding:'12px 14px',border:'1px solid #e2e8f0',fontSize:'13px'}}>
                      <p style={{fontSize:'12px',fontWeight:700,color:'#374151',margin:'0 0 8px',textTransform:'uppercase',letterSpacing:'0.3px'}}>Resumen prima de póliza</p>
                      <div style={{display:'flex',gap:'8px',justifyContent:'space-between',color:'#64748b',marginBottom:'4px'}}><span>Prima neta total</span><span style={{fontWeight:500}}>{_fmtS(_r2s(_sPN))}</span></div>
                      <div style={{display:'flex',gap:'8px',justifyContent:'space-between',color:'#64748b',marginBottom:'4px'}}><span>+ Gastos de emisión ({aseguradoraConfig.porcentaje_gasto_emision}%)</span><span>{_fmtS(_r2s(_sG))}</span></div>
                      {_r2s(_sR)>0&&<div style={{display:'flex',gap:'8px',justifyContent:'space-between',color:'#64748b',marginBottom:'4px'}}><span>+ Recargo fraccionamiento ({_pr}%)</span><span>{_fmtS(_r2s(_sR))}</span></div>}
                      <div style={{display:'flex',gap:'8px',justifyContent:'space-between',color:'#64748b',marginBottom:'8px'}}><span>+ IVA 12%</span><span>{_fmtS(_r2s(_sI))}</span></div>
                      <div style={{display:'flex',gap:'8px',justifyContent:'space-between',fontWeight:700,color:'#111111',borderTop:'1px solid #e2e8f0',paddingTop:'8px'}}><span>Prima total póliza</span><span>{_fmtS(_r2s(_sT))}</span></div>
                      {productoComPct>0&&<div style={{marginTop:'6px',display:'flex',gap:'8px',justifyContent:'space-between',color:'#C4A96B',fontWeight:500}}><span>Comisión ({productoComPct}%)</span><span>{_fmtS(_r2s(_sPN*productoComPct/100))}</span></div>}
                    </div>
                  )
                })()}
                <div>
                  <label style={lbl}>Tipo de pago *</label>
                  <div style={{display:'flex',gap:'8px'}}>
                    {['contado','financiado'].map(t=>(
                      <button key={t} type="button" onClick={()=>setForm({...form,tipo_pago:t,numero_cuotas:t==='contado'?1:(aseguradoraConfig?.recargos?.[0]?.numero_cuotas||form.numero_cuotas)})}
                        style={{flex:1,padding:'10px',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',
                          background:form.tipo_pago===t?'#111111':'white', color:form.tipo_pago===t?'white':'#64748b',
                          border:`1px solid ${form.tipo_pago===t?'#111111':'#e2e8f0'}`}}>
                        {t === 'financiado' ? 'Fraccionado' : 'Contado'}
                      </button>
                    ))}
                  </div>
                </div>
                {form.tipo_pago === 'financiado' && (
                  <div>
                    <label style={lbl}>Número de cuotas * <span style={{fontWeight:400,color:'#94a3b8'}}>(pagos mensuales)</span></label>
                    {aseguradoraConfig?.recargos?.length > 0 ? (
                      <select
                        value={form.numero_cuotas}
                        onChange={e=>setForm({...form,numero_cuotas:parseInt(e.target.value)})}
                        required
                        style={inp}>
                        {aseguradoraConfig.recargos.map(r=>(
                          <option key={r.numero_cuotas} value={r.numero_cuotas}>
                            {r.numero_cuotas} cuotas{r.porcentaje > 0 ? ` (${r.porcentaje}% recargo)` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p style={{fontSize:'13px',color:'#f59e0b',margin:'4px 0 0',padding:'9px 12px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'8px'}}>
                        ⚠ Esta aseguradora no tiene cuotas configuradas. Configúralas en el módulo de Aseguradoras.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ─ Vigencia ─ */}
            <div style={{marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'13px',fontWeight:700,color:'#111111',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>6 · Vigencia</p>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(auto-fit,minmax(200px,1fr))',gap:'16px'}}>
                <div>
                  <label style={lbl}>Fecha de inicio *</label>
                  <input type="date" value={form.fecha_inicio} onChange={e=>handleFechaInicioChange(e.target.value)} required style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Duración *</label>
                  <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
                    {[['1anio','1 Año'],['manual','Manual']].map(([v,l])=>(
                      <button key={v} type="button" onClick={()=>handleVigenciaChange(v)}
                        style={{flex:1,padding:'9px',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',
                          background:form.vigencia===v?'#111111':'white', color:form.vigencia===v?'white':'#64748b',
                          border:`1px solid ${form.vigencia===v?'#111111':'#e2e8f0'}`}}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {form.vigencia === 'manual' ? (
                    <input type="date" value={form.fecha_vencimiento} onChange={e=>setForm({...form,fecha_vencimiento:e.target.value})} required style={inp}/>
                  ) : (
                    <div style={{padding:'10px 12px',background:'#f8fafc',borderRadius:'8px',border:'1px solid #e2e8f0',fontSize:'14px',color:'#64748b'}}>
                      {form.fecha_vencimiento ? new Date(form.fecha_vencimiento).toLocaleDateString('es-GT') : 'Selecciona fecha inicio'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─ Observaciones ─ */}
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                Observaciones <span style={{fontWeight:400,color:'#94a3b8'}}>(opcional)</span>
              </label>
              <textarea value={form.observaciones} onChange={e=>setForm({...form,observaciones:e.target.value.toUpperCase()})}
                rows={3} placeholder="Observaciones adicionales sobre la solicitud..."
                style={{width:'100%',padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box',background:'white',color:'#1e293b',resize:'vertical',fontFamily:'inherit',textTransform:'uppercase'}}/>
            </div>

            {/* ─ Dueño Ejecutivo ─ */}
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                Dueño Ejecutivo <span style={{fontWeight:400,color:'#94a3b8'}}>(opcional)</span>
              </label>
              <select value={form.ejecutivo_id} onChange={e=>setForm({...form,ejecutivo_id:e.target.value})}
                style={{width:'100%',padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box',background:'white',color:form.ejecutivo_id?'#1e293b':'#94a3b8'}}>
                <option value="">Sin asignar</option>
                {usuariosForm.map(u=>(
                  <option key={u.id} value={u.id}>{[u.nombre,u.apellido].filter(Boolean).join(' ')}</option>
                ))}
              </select>
            </div>

            {/* ─ Incluir coberturas en PDF ─ */}
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',userSelect:'none'}}>
                <input type="checkbox" checked={!!form.incluir_coberturas_pdf}
                  onChange={e=>setForm({...form,incluir_coberturas_pdf:e.target.checked})}
                  style={{width:'16px',height:'16px',accentColor:'#C4A96B',cursor:'pointer',flexShrink:0}}/>
                <span style={{fontSize:'13px',fontWeight:600,color:'#374151'}}>
                  Incluir coberturas en PDF
                  <span style={{fontWeight:400,color:'#94a3b8',marginLeft:'6px'}}>— agrega el listado de coberturas del producto al documento</span>
                </span>
              </label>
            </div>

            {/* ─ Submit ─ */}
            <div style={{display:'flex',gap:'8px'}}>
              <button type="submit" disabled={clienteValidation.length > 0}
                style={{padding:'11px 28px',background:clienteValidation.length>0?'#94a3b8':'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:clienteValidation.length>0?'not-allowed':'pointer'}}>
                {editing ? 'Actualizar solicitud' : 'Crear solicitud'}
              </button>
              <button type="button" onClick={resetForm}
                style={{padding:'11px 24px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>
                Cancelar
              </button>
            </div>
            </>)}
          </form>
        </div>
      </div>
      {showCompletarClienteModal && clienteValidation.length > 0 && (
        <CompletarClienteModal
          clienteId={form.cliente_id}
          campos={clienteValidation}
          onClose={() => setShowCompletarClienteModal(false)}
          onSaved={async () => {
            setShowCompletarClienteModal(false)
            const { data: c } = await supabase.from('clientes').select('*').eq('id', form.cliente_id).single()
            const missing = getCamposReq(c?.tipo).filter(f => !c?.[f.key])
            setClienteValidation(missing)
            if (missing.length === 0) toast.success('Cliente listo — ya puedes continuar')
          }}
        />
      )}
      {showNuevoVehiculoModal && (
        <NuevoVehiculoModal
          clienteId={form.cliente_id}
          onClose={() => setShowNuevoVehiculoModal(false)}
          onSaved={async (newV) => {
            setShowNuevoVehiculoModal(false)
            await refreshVehiculos()
            setVehiculosSeleccionados(prev => [...prev, newV.id])
          }}
        />
      )}
    </div>
  )

  /* ── VIEW: LIST ── */
  return (
    <div>
      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',marginBottom:'20px'}}>
        <div style={{padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <h1 style={{fontSize:'22px',fontWeight:700,color:'#111111',margin:0}}>Cartera de Clientes</h1>
            <p style={{color:'#6B6B62',fontSize:'14px',marginTop:'4px',marginBottom:0}}>
              {counts.todas} total · {counts.vigentes} vigentes · {counts.solicitud} solicitudes · {counts.enviada} enviadas · {counts.en_reproceso} en reproceso
            </p>
          </div>
          <button onClick={()=>{setView('form');setEditing(null);setForm(emptyPoliza);setProductosFiltered([]);setClienteVehiculos([]);setVehiculosSeleccionados([]);setClienteValidation([]);setPersonasFacturables([])}}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 20px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
            <Plus size={16}/> Nueva solicitud
          </button>
        </div>
      </div>

      <div style={{background:'white',borderRadius:'12px',padding:'14px 16px',border:'1px solid #e2e8f0',marginBottom:'16px',display:'flex',gap:'12px',flexWrap:'wrap',alignItems:'center'}}>
        <div style={{flex:1,minWidth:'200px',position:'relative'}}>
          <Search size={16} color="#94a3b8" style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por número, cliente o aseguradora..."
            style={{width:'100%',padding:'9px 12px 9px 36px',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',background:'white',color:'#1e293b',boxSizing:'border-box'}}/>
        </div>
        {isMobile ? (
          <div style={{position:'relative',width:'100%'}}>
            {showFilterDropdown && (
              <div onClick={()=>setShowFilterDropdown(false)}
                style={{position:'fixed',inset:0,zIndex:100}}/>
            )}
            <button onClick={()=>setShowFilterDropdown(v=>!v)}
              style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',fontWeight:500,cursor:'pointer',color:'#1e293b'}}>
              <span>
                {[['todas','Todas'],['vigentes','Pólizas Vigentes'],['solicitud','Solicitudes'],['enviada','Solicitudes Enviadas'],['en_reproceso','Reproceso']].find(([k])=>k===filtroEstado)?.[1]}
                {' '}({counts[filtroEstado]??counts.todas})
              </span>
              <ChevronDown size={16} color="#64748b" style={{transform:showFilterDropdown?'rotate(180deg)':'none',transition:'transform 0.2s'}}/>
            </button>
            {showFilterDropdown && (
              <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,background:'white',border:'1px solid #e2e8f0',borderRadius:'10px',boxShadow:'0 4px 16px rgba(0,0,0,0.10)',zIndex:101,overflow:'hidden'}}>
                {[['todas','Todas'],['vigentes','Pólizas Vigentes'],['solicitud','Solicitudes'],['enviada','Solicitudes Enviadas'],['en_reproceso','Reproceso']].map(([key,label])=>{
                  const isActive = filtroEstado === key
                  return (
                    <button key={key}
                      onClick={()=>{ setFiltroEstado(key); setShowFilterDropdown(false) }}
                      style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 16px',background:isActive?'#F5F0E8':'white',border:'none',borderBottom:'1px solid #f1f5f9',fontSize:'14px',fontWeight:isActive?600:400,cursor:'pointer',color:isActive?'#111111':'#374151',textAlign:'left'}}>
                      <span>{label} ({counts[key]??counts.todas})</span>
                      {isActive && <Check size={15} color="#C4A96B"/>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
            {[['todas','Todas'],['vigentes','Pólizas Vigentes'],['solicitud','Solicitudes'],['enviada','Solicitudes Enviadas'],['en_reproceso','Reproceso']].map(([key,label])=>{
              const isActive = filtroEstado === key
              return (
                <button key={key} onClick={()=>setFiltroEstado(key)}
                  style={{padding:'7px 14px',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontWeight:isActive?600:400,
                    background: isActive ? '#111111' : 'white',
                    color: isActive ? 'white' : '#6B6B62',
                    border: `1px solid ${isActive ? '#111111' : '#E2E8F0'}`}}>
                  {label} ({counts[key]??counts.todas})
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
        {loading ? <p style={{padding:'24px',color:'#64748b'}}>Cargando...</p> :
         filtered.length === 0 ? (
          <div style={{padding:'48px',textAlign:'center'}}>
            <FileText size={32} color="#cbd5e1" style={{marginBottom:'12px'}}/>
            <p style={{color:'#94a3b8'}}>No hay solicitudes registradas</p>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
          <div style={{minWidth:'600px'}}>
          {filtered.map((p,i)=>{
            const pEst = polizaEstados[p.estado] || polizaEstados.solicitud
            const vencEst = p.estado === 'emitida' ? getVencimientoEstado(p) : null
            const vencBadge = vencEst === 'vencida' ? { bg:'#111111',color:'#ffffff',label:'Vencida' } : vencEst === 'por_vencer' ? { bg:'#F5F0E8',color:'#7A5A1E',label:'Por vencer' } : null
            return (
              <div key={p.id} style={{display:'flex',alignItems:'center',padding:'14px 20px',borderBottom:i<filtered.length-1?'1px solid #f1f5f9':'none',cursor:'pointer'}}
                onClick={()=>{ setSelected(p); setView('detalle'); navigate('/polizas/'+p.id, {replace:true}) }}
                onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e=>e.currentTarget.style.background='white'}>
                <div style={{width:'40px',height:'40px',borderRadius:'8px',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px',overflow:'hidden',background:'#f8fafc',flexShrink:0}}>
                  {p.aseguradoras?.logo_url?<img src={p.aseguradoras.logo_url} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<FileText size={16} color="#C4A96B"/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                    <p style={{fontWeight:700,color:'#111111',fontSize:'14px',margin:0}}>
                      {p.numero_poliza || `SOL-${p.numero_solicitud||'?'}`}
                    </p>
                    {p.poliza_origen && <span style={{fontSize:'11px',color:'#64748b',background:'#f1f5f9',padding:'1px 6px',borderRadius:'10px'}}>Renovación</span>}
                    {p.created_at && new Date(p.created_at).toDateString() === new Date().toDateString() && (
                      <span style={{fontSize:'11px',color:'#16a34a',background:'#dcfce7',padding:'1px 7px',borderRadius:'10px',fontWeight:600}}>Nueva</span>
                    )}
                  </div>
                  <p style={{fontSize:'12px',color:'#64748b',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {p.clientes?.tipo === 'empresa' ? (p.clientes?.razon_social || p.clientes?.nombre_empresa || p.clientes?.nombre || '') : `${p.clientes?.nombre||''} ${p.clientes?.apellido||''}`.trim()} · {p.aseguradoras?.nombre}
                  </p>
                </div>
                {(() => {
                  const primaActiva = p.estado === 'emitida'
                    ? (p.emisiones||[])
                        .filter(em => em.estado === 'emitida' || em.estado === 'completado')
                        .reduce((s,em) => { const v=parseFloat(em.prima_emision||0); return em.tipo==='exclusion'?s-v:s+v }, 0)
                    : parseFloat(p.prima_total||0)
                  return (
                    <div style={{textAlign:'right',marginRight:'16px',flexShrink:0}}>
                      <p style={{fontSize:'14px',fontWeight:700,color:'#C4A96B',margin:0}}>Q {primaActiva.toLocaleString('es-GT', {minimumFractionDigits:0})}</p>
                      <p style={{fontSize:'11px',color:'#64748b',margin:0}}>{p.tipo_pago==='financiado'?`Fraccionado · ${p.numero_cuotas||1} cuotas`:'Contado'}</p>
                    </div>
                  )
                })()}
                {!isMobile && p.fecha_vencimiento && (
                  <div style={{textAlign:'right',marginRight:'12px',flexShrink:0}}>
                    <p style={{fontSize:'12px',color:'#64748b',margin:0,whiteSpace:'nowrap'}}>Vence: {new Date(p.fecha_vencimiento).toLocaleDateString('es-GT')}</p>
                  </div>
                )}
                <div style={{display:'flex',gap:'4px',marginRight:'8px',flexShrink:0}}>
                  <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:pEst.bg,color:pEst.color,fontWeight:600,whiteSpace:'nowrap'}}>{pEst.label}</span>
                  {!isMobile && vencBadge && <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:vencBadge.bg,color:vencBadge.color,fontWeight:500,whiteSpace:'nowrap'}}>{vencBadge.label}</span>}
                </div>
                {!isMobile && (
                  <div style={{display:'flex',gap:'6px',flexShrink:0}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>handleEdit(p)} style={{padding:'6px',background:'#f1f5f9',border:'none',borderRadius:'6px',cursor:'pointer'}}><Edit2 size={14} color="#64748b"/></button>
                    <button onClick={()=>handleDelete(p.id)} style={{padding:'6px',background:'#fef2f2',border:'none',borderRadius:'6px',cursor:'pointer'}}><Trash2 size={14} color="#ef4444"/></button>
                  </div>
                )}
              </div>
            )
          })}
          </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── PolizaDetalle ──────────────────────────────────────────────────────── */
function PolizaDetalle({ poliza: polizaInit, onBack, onEdit, fromCliente, fromReq }) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [searchParams, setSearchParams] = useSearchParams()
  const validTabs = ['detalle','bitacora','vehiculos_sol','emisiones','pagos','tareas','reclamos','documentos']
  const defaultTab = polizaInit.estado === 'emitida' ? 'detalle' : 'detalle'
  const [poliza, setPoliza]           = useState(polizaInit)
  const [emisiones, setEmisiones]     = useState([])
  const [reqs, setReqs]               = useState([])
  const [vehiculosDisponibles, setVehiculosDisponibles] = useState([])
  const [tareas, setTareas]           = useState([])
  const [bitacora, setBitacora]       = useState([])
  const [solicitudVehiculos, setSolicitudVehiculos] = useState([])
  const [reclamosPoliza, setReclamosPoliza] = useState([])
  const [loadingReclamos, setLoadingReclamos] = useState(false)
  const [showReclamoModal, setShowReclamoModal] = useState(false)
  const [loading, setLoading]         = useState(true)
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTabState] = useState(validTabs.includes(tabFromUrl) ? tabFromUrl : defaultTab)
  const setActiveTab = (tab) => { setActiveTabState(tab); setSearchParams(p => { p.set('tab', tab); return p }, { replace: true }) }
  const [showTabDropdown, setShowTabDropdown] = useState(false)
  const [showEmisionForm, setShowEmisionForm] = useState(false)
  const [preselectedTipo, setPreselectedTipo] = useState(null)
  const [showReqModal, setShowReqModal]       = useState(false)
  const [editingReq, setEditingReq]           = useState(null)
  const [showReqGestion, setShowReqGestion]   = useState(false)
  const [reqGestionTarget, setReqGestionTarget] = useState(null)
  const [reqGestionFechaPago, setReqGestionFechaPago] = useState('')
  const [reqGestionNotas, setReqGestionNotas] = useState('')
  const [reqComprobanteFile, setReqComprobanteFile] = useState(null)
  const [expandedReqGroups, setExpandedReqGroups] = useState(new Set())
  const [expandedVehiculos, setExpandedVehiculos] = useState(new Set())
  const [showAsignarVehiculo, setShowAsignarVehiculo] = useState(null)
  const [emisionForm, setEmisionForm] = useState(emptyEmision)
  const [reqForm, setReqForm]         = useState(emptyReq)
  const [reqAjustar, setReqAjustar]   = useState(false)
  const [expandedEmision, setExpandedEmision] = useState(null)
  const [isHistorialOpen, setIsHistorialOpen] = useState(true)
  const [vehiculoSearch, setVehiculoSearch]   = useState('')
  const [showCambiarEstadoModal, setShowCambiarEstadoModal] = useState(false)
  const [estadoOpcion, setEstadoOpcion] = useState(null)   // 'enviar' | 'emitir' | 'reproceso' | 'reenviar'
  const [showNuevaGestionModal, setShowNuevaGestionModal] = useState(false)
  const [tareaModal, setTareaModal]           = useState(null)   // tarea being viewed/edited
  const [showNuevaTareaModal, setShowNuevaTareaModal] = useState(false)
  const [usuariosPoliza, setUsuariosPoliza]   = useState([])
  const [tipoGestion, setTipoGestion] = useState(null)    // 'renovacion' | 'inclusion' | 'exclusion' | 'modificacion'
  const [showModificacionModal, setShowModificacionModal] = useState(false)
  const [modificacionDesc, setModificacionDesc] = useState('')
  const [emitirForm, setEmitirForm]   = useState({ numero_poliza:'', metodo_pago:'' })
  const [emitirPdfFile, setEmitirPdfFile] = useState(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [inclusionVehiculos, setInclusionVehiculos] = useState([])
  const [inclusionVehiculosSelected, setInclusionVehiculosSelected] = useState([])
  const [exclusionVehiculosSelected, setExclusionVehiculosSelected] = useState([])
  const [vehiculoPrimasInclusion, setVehiculoPrimasInclusion] = useState({})
  const [vehiculoDeduciblesInclusion, setVehiculoDeduciblesInclusion] = useState({})
  const [allClientVehiculos, setAllClientVehiculos] = useState([])
  const [otherPolizaOccupiedIds, setOtherPolizaOccupiedIds] = useState(new Set())
  const [personasFacturablesEmision, setPersonasFacturablesEmision] = useState([])
  const [showGestionEstadoModal, setShowGestionEstadoModal] = useState(false)
  const [gestionEstadoOpcion, setGestionEstadoOpcion] = useState(null) // 'enviar'|'emitir'|'completar'|'reproceso'|'reenviar'|'cancelar'
  const [emisionForModal, setEmisionForModal] = useState(null)
  const [showEmisionModal, setShowEmisionModal] = useState(false)
  const [editingEmision, setEditingEmision] = useState(null)
  const [emisionPdfFile, setEmisionPdfFile] = useState(null)
  const [polizaComPct, setPolizaComPct] = useState(0)
  const [polizaAsegConfig, setPolizaAsegConfig] = useState(null)
  const [documentos, setDocumentos] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [isDraggingDoc, setIsDraggingDoc] = useState(false)
  const docFileInputRef = useRef(null)

  useEffect(() => { fetchData() }, [poliza.id])

  const reloadPoliza = async () => {
    const { data } = await supabase.from('polizas')
      .select('*, clientes(nombre,apellido,tipo,razon_social,nombre_empresa,nit,email,telefono,dpi,direccion,fecha_nacimiento), aseguradoras(nombre,logo_url,codigo_agente), productos(nombre), poliza_origen:poliza_origen_id(id,numero_poliza), personas_facturables:persona_facturable_id(id,nombre,apellido,nit,direccion), emisiones(tipo,estado,prima_emision)')
      .eq('id', poliza.id).single()
    if (data) setPoliza(data)
  }

  const fetchData = async () => {
    setLoading(true)
    const [{ data: emisionesData }, { data: reqsData }, { data: tareasData }, { data: vDisp },
           { data: bitacoraData }, { data: svData }, { data: allVData }, { data: usuariosData },
           { data: otherPolizasData }] = await Promise.all([
      supabase.from('emisiones').select('*, emision_vehiculos(id, prima_neta, monto_gasto_emision, monto_recargo, monto_iva, prima_total, deducible_danios, deducible_robo, vehiculos(*)), personas_facturables:persona_facturable_id(id,nombre,apellido,nit,direccion)').eq('poliza_id', poliza.id).order('created_at'),
      supabase.from('requerimientos_pago').select('*, emisiones(numero_emision,tipo)').eq('poliza_id', poliza.id).order('fecha_vencimiento'),
      supabase.from('tareas').select('*, asignado_user:users!asignado_a(id, nombre)').eq('poliza_id', poliza.id).order('estado').order('fecha_vencimiento', { ascending: true, nullsFirst: false }),
      supabase.from('vehiculos').select('*').eq('cliente_id', poliza.cliente_id).eq('activo', true).is('poliza_id', null),
      supabase.from('bitacora_polizas').select('*').eq('poliza_id', poliza.id).order('created_at'),
      supabase.from('solicitud_vehiculos').select('*, vehiculos(*)').eq('poliza_id', poliza.id),
      supabase.from('vehiculos').select('*').eq('cliente_id', poliza.cliente_id).eq('activo', true),
      supabase.from('users').select('id, nombre, email').eq('activo', true).order('nombre'),
      supabase.from('polizas')
        .select('id, fecha_vencimiento, emisiones(tipo, estado, emision_vehiculos(vehiculo_id))')
        .eq('cliente_id', poliza.cliente_id).eq('estado', 'emitida').eq('activa', true).neq('id', poliza.id),
    ])
    setEmisiones(emisionesData || [])
    setReqs(reqsData || [])
    setTareas(tareasData || [])
    setUsuariosPoliza(usuariosData || [])
    setVehiculosDisponibles(vDisp || [])
    setBitacora(bitacoraData || [])
    setSolicitudVehiculos(svData || [])
    setAllClientVehiculos(allVData || [])

    // Compute vehicle IDs occupied by other vigente emitida polizas of this client
    const _today = new Date().toISOString().split('T')[0]
    const _occupied = new Set()
    for (const p of otherPolizasData || []) {
      if (p.fecha_vencimiento && p.fecha_vencimiento < _today) continue // poliza vencida → disponible
      const _activeInP = new Set(
        (p.emisiones || [])
          .filter(em => ['emision','inclusion'].includes(em.tipo) && em.estado !== 'cancelada')
          .flatMap(em => (em.emision_vehiculos || []).map(ev => ev.vehiculo_id))
      )
      const _excludedInP = new Set(
        (p.emisiones || [])
          .filter(em => em.tipo === 'exclusion' && ['emitida','completado'].includes(em.estado))
          .flatMap(em => (em.emision_vehiculos || []).map(ev => ev.vehiculo_id))
      )
      for (const vid of _activeInP) {
        if (!_excludedInP.has(vid)) _occupied.add(vid)
      }
    }
    setOtherPolizaOccupiedIds(_occupied)

    // Load commission % for poliza product
    if (poliza?.producto_id) {
      const { data: comData } = await supabase.from('producto_comisiones').select('porcentaje').eq('producto_id', poliza.producto_id).maybeSingle()
      setPolizaComPct(comData?.porcentaje || 0)
    }
    // Load aseguradora rates
    if (poliza?.aseguradora_id) {
      const { data: asegData } = await supabase.from('aseguradoras').select('porcentaje_gasto_emision').eq('id', poliza.aseguradora_id).single()
      const { data: recargos } = await supabase.from('recargo_fraccionamiento').select('numero_cuotas, porcentaje').eq('aseguradora_id', poliza.aseguradora_id).order('numero_cuotas')
      setPolizaAsegConfig({ porcentaje_gasto_emision: asegData?.porcentaje_gasto_emision ?? 5, recargos: recargos || [] })
    }

    setLoading(false)
    fetchReclamos()
    fetchDocumentos()
  }

  const fetchReclamos = async () => {
    setLoadingReclamos(true)
    const { data } = await supabase.from('reclamos')
      .select('*, polizas(id, numero_poliza), vehiculos(id, marca, modelo, anio, placa, tipo_placa), clientes(id, nombre, apellido)')
      .eq('poliza_id', poliza.id)
      .order('created_at', { ascending: false })
    setReclamosPoliza(data || [])
    setLoadingReclamos(false)
  }

  const fetchDocumentos = async () => {
    setLoadingDocs(true)
    const { data } = await supabase.from('poliza_documentos')
      .select('*').eq('poliza_id', poliza.id).order('created_at', { ascending: false })
    setDocumentos(data || [])
    setLoadingDocs(false)
  }

  const uploadDocFile = async (file) => {
    if (!file) return
    setUploadingDoc(true)
    const toastId = toast.loading('Subiendo documento...')
    try {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user) throw new Error('No autenticado')
      const { data: uRow } = await supabase.from('users').select('empresa_id').eq('id', user.id).single()
      const empresaId = uRow?.empresa_id
      const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_')
      const path = `${empresaId}/${poliza.id}/${Date.now()}_${safeName}`
      const { error: upErr } = await supabase.storage.from('polizas-docs').upload(path, file, { upsert: false })
      if (upErr) throw new Error(`Storage: ${upErr.message}`)
      const { error: dbErr } = await supabase.from('poliza_documentos').insert({
        poliza_id: poliza.id, empresa_id: empresaId, nombre: file.name, url: path, created_by: user.id,
      })
      if (dbErr) throw new Error(`DB: ${dbErr.message}`)
      toast.success('Documento adjuntado', { id: toastId })
      fetchDocumentos()
    } catch (err) {
      console.error('uploadDocFile error:', err)
      toast.error(err?.message || 'Error al subir documento', { id: toastId })
    }
    setUploadingDoc(false)
  }

  const handleDocUpload = async (e) => {
    await uploadDocFile(e.target.files?.[0])
    e.target.value = ''
  }

  const handleDocDrop = async (e) => {
    e.preventDefault()
    setIsDraggingDoc(false)
    const file = e.dataTransfer.files?.[0]
    if (file) await uploadDocFile(file)
  }

  const handleDocDownload = async (doc) => {
    const { data, error } = await supabase.storage.from('polizas-docs').createSignedUrl(doc.url, 3600)
    if (error || !data?.signedUrl) { toast.error('Error al obtener el archivo'); return }
    window.open(data.signedUrl, '_blank')
  }

  const handleDocDelete = async (doc) => {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return
    await supabase.storage.from('polizas-docs').remove([doc.url])
    await supabase.from('poliza_documentos').delete().eq('id', doc.id)
    toast.success('Documento eliminado')
    setDocumentos(prev => prev.filter(d => d.id !== doc.id))
  }

  const addBitacora = async (estado_anterior, estado_nuevo, descripcion) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('bitacora_polizas').insert({
      poliza_id: poliza.id, estado_anterior, estado_nuevo, descripcion, created_by: user?.id
    })
  }

  const avanzarEstado = async () => {
    const siguiente = estadoFlujo[poliza.estado]
    if (!siguiente) return
    await supabase.from('polizas').update({ estado: siguiente }).eq('id', poliza.id)
    await addBitacora(poliza.estado, siguiente, estadoFlujoLabel[poliza.estado])
    toast.success(`Estado actualizado: ${polizaEstados[siguiente]?.label}`)
    await reloadPoliza(); fetchData()
  }

  const marcarEnReproceso = async () => {
    await supabase.from('polizas').update({ estado: 'en_reproceso' }).eq('id', poliza.id)
    await addBitacora('enviada', 'en_reproceso', 'Marcada en reproceso — requiere correcciones por la aseguradora')
    toast.success('Marcada en reproceso')
    await reloadPoliza(); fetchData()
  }

  const handleEmitir = async (e) => {
    e.preventDefault()
    if (!emitirForm.numero_poliza) { toast.error('Ingresa el número de póliza'); return }
    if (uploadingPdf) return  // prevent double-submit
    setUploadingPdf(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Upload PDF if provided
    let pdf_url = null
    if (emitirPdfFile) {
      const ext = emitirPdfFile.name.split('.').pop()
      const eid = await getMyEmpresaId()
      const path = `${eid}/${poliza.id}/poliza.${ext}`
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('polizas-pdfs').upload(path, emitirPdfFile, { upsert: true })
      if (uploadErr) { setUploadingPdf(false); toast.error('Error subiendo PDF: ' + uploadErr.message); return }
      const { data: urlData } = supabase.storage.from('polizas-pdfs').getPublicUrl(uploadData.path)
      pdf_url = urlData.publicUrl
    }

    // 1. Update poliza
    await supabase.from('polizas').update({
      estado: 'emitida', numero_poliza: emitirForm.numero_poliza,
      poliza_pdf_url: pdf_url
    }).eq('id', poliza.id)

    // 2. Auto-create first emision
    const { data: emisionData } = await supabase.from('emisiones').insert({
      poliza_id: poliza.id, tipo: 'emision',
      numero_emision: `${emitirForm.numero_poliza}-E01`,
      prima_emision: poliza.prima_total,
      prima_neta: poliza.prima_neta || 0,
      monto_gasto_emision: poliza.monto_gasto_emision || 0,
      monto_recargo: poliza.monto_recargo || 0,
      monto_iva: poliza.monto_iva || 0,
      tipo_pago: poliza.tipo_pago || 'contado',
      numero_cuotas: poliza.tipo_pago === 'contado' ? 1 : (poliza.numero_cuotas || 1),
      fecha_inicio: poliza.fecha_inicio, fecha_fin: poliza.fecha_vencimiento,
      estado: 'emitida', metodo_pago: emitirForm.metodo_pago || null,
      created_by: user?.id
    }).select().single()

    // 3. Assign solicitud_vehiculos → emision_vehiculos (with prima)
    if (solicitudVehiculos.length > 0 && emisionData) {
      await Promise.all(solicitudVehiculos.map(sv =>
        supabase.from('emision_vehiculos').insert({
          emision_id: emisionData.id, vehiculo_id: sv.vehiculo_id,
          prima_neta: sv.prima_neta||0, monto_gasto_emision: sv.monto_gasto_emision||0,
          monto_recargo: sv.monto_recargo||0, monto_iva: sv.monto_iva||0, prima_total: sv.prima_total||0,
          deducible_danios: sv.deducible_danios||0, deducible_robo: sv.deducible_robo||0,
        })
      ))
      await Promise.all(solicitudVehiculos.map(sv =>
        supabase.from('vehiculos').update({ poliza_id: poliza.id }).eq('id', sv.vehiculo_id)
      ))
    }

    // 4. Bitácora — poliza event + gestión event for E01
    await addBitacora(poliza.estado, 'emitida', `Póliza emitida · Núm: ${emitirForm.numero_poliza}`)
    if (emisionData) {
      await addBitacora(null, 'emitida', `[Gestión] Emisión principal ${emisionData.numero_emision} — Solicitud → Emitida`)
    }

    setUploadingPdf(false)
    setEmitirPdfFile(null)
    setEmitirForm({ numero_poliza:'', metodo_pago:'' })
    toast.success('¡Póliza emitida exitosamente!')
    await reloadPoliza(); fetchData()
  }

  const renovarPoliza = async () => {
    if (!confirm('Se creará una nueva solicitud en borrador como renovación. ¿Continuar?')) return
    const { data: { user } } = await supabase.auth.getUser()
    const ni = poliza.fecha_inicio ? new Date(poliza.fecha_inicio) : new Date()
    const nv = poliza.fecha_vencimiento ? new Date(poliza.fecha_vencimiento) : new Date()
    ni.setFullYear(ni.getFullYear() + 1); nv.setFullYear(nv.getFullYear() + 1)
    const { data: numData } = await supabase.rpc('generate_numero_solicitud')
    const { data, error } = await supabase.from('polizas').insert({
      numero_solicitud: numData, estado: 'solicitud',
      cliente_id: poliza.cliente_id, aseguradora_id: poliza.aseguradora_id,
      producto_id: poliza.producto_id, prima_total: poliza.prima_total,
      tipo_pago: poliza.tipo_pago, fraccionamiento: poliza.fraccionamiento,
      fecha_inicio: ni.toISOString().split('T')[0], fecha_vencimiento: nv.toISOString().split('T')[0],
      poliza_origen_id: poliza.id, agente_id: user?.id
    }).select().single()
    if (error) { toast.error('Error: ' + error.message); return }
    await supabase.from('bitacora_polizas').insert({
      poliza_id: data.id, estado_nuevo: 'solicitud',
      descripcion: `Renovación de póliza ${poliza.numero_poliza || poliza.numero_solicitud}`,
      created_by: user?.id
    })
    toast.success('Solicitud de renovación creada · #' + numData)
    navigate('/polizas', { state: { openPolizaId: data.id } })
  }

  const abrirFormEmision = async (tipo) => {
    setEmisionForm({ ...emptyEmision, tipo }); setPreselectedTipo(tipo)
    setInclusionVehiculosSelected([]); setExclusionVehiculosSelected([])
    setVehiculoPrimasInclusion({}); setVehiculoDeduciblesInclusion({})
    setEditingEmision(null)
    setActiveTab('emisiones')
    const { data: pfData } = await supabase.from('personas_facturables')
      .select('*').eq('cliente_id', poliza.cliente_id).eq('activa', true).order('nombre')
    setPersonasFacturablesEmision(pfData || [])
    setShowEmisionModal(true)
  }

  const editarEmision = async (em) => {
    setEmisionForm({
      tipo: em.tipo,
      prima_neta: em.prima_neta ?? '',
      tipo_pago: em.tipo_pago || 'contado',
      numero_cuotas: em.numero_cuotas ?? 1,
      fecha_inicio: em.fecha_inicio || '',
      fecha_fin: em.fecha_fin || '',
      notas: em.notas || '',
      persona_facturable_id: em.persona_facturable_id || '',
      metodo_pago: em.metodo_pago || '',
      incluir_coberturas_pdf: em.incluir_coberturas_pdf || false,
    })
    setEditingEmision(em)
    if (em.tipo === 'inclusion') {
      const currentVehicleIds = (em.emision_vehiculos || []).map(ev => ev.vehiculos?.id).filter(Boolean)
      setInclusionVehiculosSelected(currentVehicleIds)
      const primaMap = {}; const dedMap = {}
      ;(em.emision_vehiculos || []).forEach(ev => {
        if (ev.vehiculos?.id) {
          primaMap[ev.vehiculos.id] = String(ev.prima_neta || '')
          dedMap[ev.vehiculos.id] = { danios: String(ev.deducible_danios || ''), robo: String(ev.deducible_robo || '') }
        }
      })
      setVehiculoPrimasInclusion(primaMap)
      setVehiculoDeduciblesInclusion(dedMap)
    } else {
      setInclusionVehiculosSelected([]); setExclusionVehiculosSelected([])
    }
    const { data: pfData } = await supabase.from('personas_facturables')
      .select('*').eq('cliente_id', poliza.cliente_id).eq('activa', true).order('nombre')
    setPersonasFacturablesEmision(pfData || [])
    setShowEmisionModal(true)
  }

  const recalcularPrimaPoliza = async (polizaId) => {
    const [{ data: emisNonExcl }, { data: activeVehiculos }] = await Promise.all([
      supabase.from('emisiones').select('id').eq('poliza_id', polizaId).in('tipo', ['emision','inclusion']).neq('estado','cancelada'),
      supabase.from('vehiculos').select('id').eq('poliza_id', polizaId),
    ])
    const emisIds = (emisNonExcl||[]).map(e=>e.id)
    const activeIds = (activeVehiculos||[]).map(v=>v.id)
    if (activeIds.length===0 || emisIds.length===0) return
    const { data: evAll } = await supabase.from('emision_vehiculos')
      .select('vehiculo_id, prima_neta, monto_gasto_emision, monto_recargo, monto_iva, prima_total, created_at')
      .in('vehiculo_id', activeIds).in('emision_id', emisIds).order('created_at', {ascending:false})
    const latestByV = {}
    for (const ev of (evAll||[])) { if (!latestByV[ev.vehiculo_id]) latestByV[ev.vehiculo_id] = ev }
    const evList = Object.values(latestByV).filter(ev => parseFloat(ev.prima_total||0)>0 || parseFloat(ev.prima_neta||0)>0)
    if (evList.length===0) return
    const _r2p = n => Math.round(n*100)/100
    const totals = evList.reduce((acc,ev)=>({
      prima_neta: acc.prima_neta+parseFloat(ev.prima_neta||0),
      monto_gasto_emision: acc.monto_gasto_emision+parseFloat(ev.monto_gasto_emision||0),
      monto_recargo: acc.monto_recargo+parseFloat(ev.monto_recargo||0),
      monto_iva: acc.monto_iva+parseFloat(ev.monto_iva||0),
      prima_total: acc.prima_total+parseFloat(ev.prima_total||0),
    }),{prima_neta:0,monto_gasto_emision:0,monto_recargo:0,monto_iva:0,prima_total:0})
    await supabase.from('polizas').update({
      prima_neta: _r2p(totals.prima_neta), monto_gasto_emision: _r2p(totals.monto_gasto_emision),
      monto_recargo: _r2p(totals.monto_recargo), monto_iva: _r2p(totals.monto_iva),
      prima_total: _r2p(totals.prima_total),
    }).eq('id', polizaId)
  }

  const handleEmisionSubmit = async (e) => {
    e.preventDefault()
    const isExclusion = emisionForm.tipo === 'exclusion'
    const { data: { user } } = await supabase.auth.getUser()

    // ── EDIT mode ──
    if (editingEmision) {
      const isEditInclusion = editingEmision.tipo === 'inclusion'

      // Validations for inclusion edits
      if (isEditInclusion) {
        if (inclusionVehiculosSelected.length === 0) {
          toast.error('Selecciona al menos un vehículo para incluir'); return
        }
        const sinPrima = inclusionVehiculosSelected.filter(vid => !(parseFloat(vehiculoPrimasInclusion[vid]||0) > 0))
        if (sinPrima.length > 0) { toast.error('Ingresa la prima neta para todos los vehículos seleccionados'); return }
        const sinDanios = inclusionVehiculosSelected.filter(vid => (vehiculoDeduciblesInclusion[vid]?.danios ?? '') === '')
        if (sinDanios.length > 0) { toast.error('Ingresa el deducible de daños para todos los vehículos seleccionados'); return }
        const sinRobo = inclusionVehiculosSelected.filter(vid => (vehiculoDeduciblesInclusion[vid]?.robo ?? '') === '')
        if (sinRobo.length > 0) { toast.error('Ingresa el deducible de robo para todos los vehículos seleccionados'); return }
      }

      const _r2e = n => Math.round(n*100)/100
      const pct_rec_edit = emisionForm.tipo_pago==='contado'?0:(polizaAsegConfig?.recargos?.find(r=>r.numero_cuotas===parseInt(emisionForm.numero_cuotas))?.porcentaje||0)

      // For inclusions, compute prima from per-vehicle values; for others, from single prima_neta field
      let emCalcEdit
      if (isEditInclusion) {
        let _ePN=0,_eGasto=0,_eRec=0,_eIva=0,_eTotal=0
        inclusionVehiculosSelected.forEach(vid => {
          const pn = parseFloat(vehiculoPrimasInclusion[vid]||0)
          if (!polizaAsegConfig||pn<=0) return
          const c = calcularPrima(pn, polizaAsegConfig.porcentaje_gasto_emision, pct_rec_edit)
          _ePN+=c.prima_neta; _eGasto+=c.monto_gasto_emision; _eRec+=c.monto_recargo; _eIva+=c.monto_iva; _eTotal+=c.prima_total
        })
        emCalcEdit = {prima_neta:_r2e(_ePN),monto_gasto_emision:_r2e(_eGasto),monto_recargo:_r2e(_eRec),monto_iva:_r2e(_eIva),prima_total:_r2e(_eTotal)}
      } else {
        emCalcEdit = (() => {
          if (!polizaAsegConfig || !(parseFloat(emisionForm.prima_neta) > 0)) return { prima_neta:0, prima_total:0, monto_gasto_emision:0, monto_recargo:0, monto_iva:0 }
          return calcularPrima(emisionForm.prima_neta, polizaAsegConfig.porcentaje_gasto_emision, pct_rec_edit)
        })()
      }

      const { error } = await supabase.from('emisiones').update({
        prima_emision: emCalcEdit.prima_total,
        prima_neta: emCalcEdit.prima_neta,
        monto_gasto_emision: emCalcEdit.monto_gasto_emision,
        monto_recargo: emCalcEdit.monto_recargo,
        monto_iva: emCalcEdit.monto_iva,
        fecha_inicio: emisionForm.fecha_inicio,
        fecha_fin: isExclusion ? emisionForm.fecha_inicio : poliza.fecha_vencimiento,
        notas: emisionForm.notas || null,
        persona_facturable_id: emisionForm.persona_facturable_id || null,
        tipo_pago: emisionForm.tipo_pago || 'contado',
        fraccionamiento: 'anual',
        numero_cuotas: emisionForm.tipo_pago === 'contado' ? 1 : (parseInt(emisionForm.numero_cuotas) || 1),
        metodo_pago: emisionForm.metodo_pago || null,
        incluir_coberturas_pdf: emisionForm.incluir_coberturas_pdf || false,
      }).eq('id', editingEmision.id)
      if (error) { toast.error('Error: ' + error.message); return }

      // For inclusions, sync emision_vehiculos (add/remove/update)
      if (isEditInclusion) {
        const origEvs = editingEmision.emision_vehiculos || []
        const origIds = origEvs.map(ev=>ev.vehiculos?.id).filter(Boolean)
        const newIds  = inclusionVehiculosSelected
        const calcVehicleEv = (vid) => {
          const pn = parseFloat(vehiculoPrimasInclusion[vid]||0)
          const ded = vehiculoDeduciblesInclusion[vid] || {}
          if (!polizaAsegConfig||pn<=0) return {prima_neta:0,monto_gasto_emision:0,monto_recargo:0,monto_iva:0,prima_total:0,deducible_danios:parseFloat(ded.danios||0),deducible_robo:parseFloat(ded.robo||0)}
          const c = calcularPrima(pn, polizaAsegConfig.porcentaje_gasto_emision, pct_rec_edit)
          return {...c, deducible_danios:parseFloat(ded.danios||0), deducible_robo:parseFloat(ded.robo||0)}
        }
        const toRemove = origIds.filter(id=>!newIds.includes(id))
        if (toRemove.length>0) {
          const evIds = origEvs.filter(ev=>toRemove.includes(ev.vehiculos?.id)).map(ev=>ev.id)
          await supabase.from('emision_vehiculos').delete().in('id',evIds)
        }
        const toAdd = newIds.filter(id=>!origIds.includes(id))
        if (toAdd.length>0) {
          await supabase.from('emision_vehiculos').insert(toAdd.map(vid=>({emision_id:editingEmision.id,vehiculo_id:vid,...calcVehicleEv(vid)})))
        }
        await Promise.all(
          newIds.filter(id=>origIds.includes(id)).map(vid=>{
            const ev = origEvs.find(e=>e.vehiculos?.id===vid)
            if (!ev) return
            return supabase.from('emision_vehiculos').update(calcVehicleEv(vid)).eq('id',ev.id)
          })
        )
      }

      const tipoLabel = isExclusion ? 'Exclusión' : 'Inclusión'
      await addBitacora(editingEmision.estado, editingEmision.estado, `${tipoLabel} ${editingEmision.numero_emision} editada`)
      toast.success(`${tipoLabel} actualizada`)
      setShowEmisionModal(false); setEditingEmision(null); setEmisionForm(emptyEmision)
      setInclusionVehiculosSelected([]); setVehiculoPrimasInclusion({}); setVehiculoDeduciblesInclusion({})
      fetchData(); return
    }

    // ── CREATE mode ──
    if (isExclusion && exclusionVehiculosSelected.length === 0) {
      toast.error('Selecciona al menos un vehículo para excluir'); return
    }
    if (!isExclusion && inclusionVehiculosSelected.length === 0) {
      toast.error('Selecciona al menos un vehículo para incluir'); return
    }
    if (!isExclusion) {
      const sinPrima = inclusionVehiculosSelected.filter(vid => !(parseFloat(vehiculoPrimasInclusion[vid]||0) > 0))
      if (sinPrima.length > 0) { toast.error('Ingresa la prima neta para todos los vehículos seleccionados'); return }
      const sinDanios = inclusionVehiculosSelected.filter(vid => (vehiculoDeduciblesInclusion[vid]?.danios ?? '') === '')
      if (sinDanios.length > 0) { toast.error('Ingresa el deducible de daños para todos los vehículos seleccionados'); return }
      const sinRobo = inclusionVehiculosSelected.filter(vid => (vehiculoDeduciblesInclusion[vid]?.robo ?? '') === '')
      if (sinRobo.length > 0) { toast.error('Ingresa el deducible de robo para todos los vehículos seleccionados'); return }
    }
    const tipoCode = isExclusion ? 'EXC' : 'INC'
    const tipoFilter = isExclusion ? 'exclusion' : 'inclusion'
    const count = emisiones.filter(em=>em.tipo===tipoFilter).length + 1
    const numEmision = `${poliza.numero_poliza||'SOL'}-${tipoCode}${count.toString().padStart(2,'0')}`
    // Per-vehicle prima calculation for inclusions
    const _r2em = n => Math.round(n*100)/100
    const _pct_rec_em = emisionForm.tipo_pago==='contado'?0:(polizaAsegConfig?.recargos?.find(r=>r.numero_cuotas===parseInt(emisionForm.numero_cuotas))?.porcentaje||0)
    let _emPN=0,_emG=0,_emR=0,_emI=0,_emT=0
    const _vehiculoPrimasCalcEm = (!isExclusion ? inclusionVehiculosSelected : []).map(vid => {
      const pn = parseFloat(vehiculoPrimasInclusion[vid]||0)
      const ded = vehiculoDeduciblesInclusion[vid] || {}
      if (!polizaAsegConfig||pn<=0) return {vehiculo_id:vid,prima_neta:0,monto_gasto_emision:0,monto_recargo:0,monto_iva:0,prima_total:0,deducible_danios:parseFloat(ded.danios||0),deducible_robo:parseFloat(ded.robo||0)}
      const c = calcularPrima(pn, polizaAsegConfig.porcentaje_gasto_emision, _pct_rec_em)
      _emPN+=c.prima_neta;_emG+=c.monto_gasto_emision;_emR+=c.monto_recargo;_emI+=c.monto_iva;_emT+=c.prima_total
      return {vehiculo_id:vid,...c,deducible_danios:parseFloat(ded.danios||0),deducible_robo:parseFloat(ded.robo||0)}
    })
    const { data: emData, error } = await supabase.from('emisiones').insert({
      poliza_id: poliza.id, tipo: emisionForm.tipo, estado: 'solicitud',
      numero_emision: numEmision,
      prima_emision: isExclusion ? 0 : _r2em(_emT),
      prima_neta: isExclusion ? 0 : _r2em(_emPN),
      monto_gasto_emision: isExclusion ? 0 : _r2em(_emG),
      monto_recargo: isExclusion ? 0 : _r2em(_emR),
      monto_iva: isExclusion ? 0 : _r2em(_emI),
      fecha_inicio: emisionForm.fecha_inicio,
      fecha_fin: isExclusion ? emisionForm.fecha_inicio : poliza.fecha_vencimiento,
      notas: emisionForm.notas || null,
      persona_facturable_id: emisionForm.persona_facturable_id || null,
      tipo_pago: emisionForm.tipo_pago || 'contado',
      fraccionamiento: 'anual',
      numero_cuotas: emisionForm.tipo_pago === 'contado' ? 1 : (parseInt(emisionForm.numero_cuotas) || 1),
      metodo_pago: emisionForm.metodo_pago || null,
      incluir_coberturas_pdf: emisionForm.incluir_coberturas_pdf || false,
      created_by: user?.id
    }).select().single()
    if (error) { toast.error('Error: ' + error.message); return }
    const selectedVids = isExclusion ? exclusionVehiculosSelected : inclusionVehiculosSelected
    if (selectedVids.length > 0) {
      if (!isExclusion) {
        await supabase.from('emision_vehiculos').insert(
          _vehiculoPrimasCalcEm.map(vc => ({
            emision_id: emData.id, vehiculo_id: vc.vehiculo_id,
            prima_neta: vc.prima_neta, monto_gasto_emision: vc.monto_gasto_emision,
            monto_recargo: vc.monto_recargo, monto_iva: vc.monto_iva, prima_total: vc.prima_total,
            deducible_danios: vc.deducible_danios, deducible_robo: vc.deducible_robo,
          }))
        )
      } else {
        await supabase.from('emision_vehiculos').insert(
          selectedVids.map(vid => ({ emision_id: emData.id, vehiculo_id: vid }))
        )
      }
      await Promise.all(selectedVids.map(vid =>
        supabase.from('vehiculos').update({ poliza_id: isExclusion ? null : poliza.id }).eq('id', vid)
      ))
    }
    // Recalculate poliza prima after inclusion/exclusion
    await recalcularPrimaPoliza(poliza.id)
    const tipoLabel = isExclusion ? 'Exclusión' : 'Inclusión'
    await addBitacora(null, 'solicitud', `${tipoLabel} ${numEmision} creada`)
    toast.success(`${tipoLabel} creada · ` + numEmision)
    setShowEmisionModal(false); setEmisionForm(emptyEmision)
    setInclusionVehiculosSelected([]); setExclusionVehiculosSelected([])
    setVehiculoPrimasInclusion({}); setVehiculoDeduciblesInclusion({})
    fetchData()
  }

  const asignarVehiculo = async (vehiculoId, emisionId) => {
    const { data: check } = await supabase.from('vehiculos').select('poliza_id').eq('id', vehiculoId).single()
    if (check?.poliza_id) { toast.error('Este vehiculo ya esta asignado a una poliza vigente'); return }
    const { error: evError } = await supabase.from('emision_vehiculos').insert({ emision_id: emisionId, vehiculo_id: vehiculoId })
    if (evError) { toast.error('Error al asignar'); return }
    await supabase.from('vehiculos').update({ poliza_id: poliza.id }).eq('id', vehiculoId)
    toast.success('Vehiculo asignado')
    setShowAsignarVehiculo(null); setVehiculoSearch(''); fetchData()
  }

  const quitarVehiculo = async (vehiculoId, emisionVehiculoId, emisionId) => {
    // Prevent removing the last vehicle from an existing emission
    const em = emisiones.find(e => e.id === emisionId)
    if (em && em.emision_vehiculos?.length <= 1) {
      toast.error('No puedes quitar el único vehículo de esta gestión')
      return
    }
    await supabase.from('emision_vehiculos').delete().eq('id', emisionVehiculoId)
    await supabase.from('vehiculos').update({ poliza_id: null }).eq('id', vehiculoId)
    toast.success('Vehiculo removido'); fetchData()
  }

  const handleReqSubmit = async (e) => {
    e.preventDefault()
    if (editingReq) {
      // Edit mode — update single req
      const { error } = await supabase.from('requerimientos_pago').update({
        monto: parseFloat(reqForm.monto),
        fecha_vencimiento: reqForm.fecha_vencimiento,
      }).eq('id', editingReq.id)
      if (error) { toast.error('Error: ' + error.message); return }
      toast.success('Requerimiento actualizado')
      setReqForm(emptyReq); setEditingReq(null); setShowReqModal(false); setReqAjustar(false); fetchData()
      return
    }
    // Create mode — bulk generate
    if (!reqForm.emision_id) { toast.error('Selecciona la emisión'); return }
    if (!reqForm.numero_req_matriz) { toast.error('Ingresa el número de requerimiento matriz'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const baseNum = parseInt(reqForm.numero_req_matriz)
    if (isNaN(baseNum)) { toast.error('El número de requerimiento debe ser numérico'); return }
    const monto = parseFloat(reqForm.monto)
    const totalCuotas = parseInt(reqForm.total_cuotas)
    // Get prima breakdown from the selected emision
    const emisionSel = emisiones.find(em => em.id === reqForm.emision_id)
    const emPN  = emisionSel?.prima_neta || 0
    const emGE  = emisionSel?.monto_gasto_emision || 0
    const emRec = emisionSel?.monto_recargo || 0
    const emIva = emisionSel?.monto_iva || 0
    const r2 = n => Math.round(n * 100) / 100
    const pnCuota  = r2(emPN  / totalCuotas)
    const geCuota  = r2(emGE  / totalCuotas)
    const recCuota = r2(emRec / totalCuotas)
    const ivaCuota = r2(emIva / totalCuotas)
    const comCuota = r2(pnCuota * (polizaComPct || 0) / 100)
    const codigosAGenerar = Array.from({ length: totalCuotas }, (_, i) => String(baseNum + i))
    // Validate no code conflicts before inserting
    const { data: existing } = await supabase.from('requerimientos_pago')
      .select('codigo').in('codigo', codigosAGenerar)
    if (existing && existing.length > 0) {
      const conflictos = existing.map(r => r.codigo).join(', ')
      toast.error(`Los códigos ya existen: ${conflictos}. Usa un número de inicio diferente.`)
      return
    }
    const requerimientos = Array.from({ length: totalCuotas }, (_, i) => {
      const fecha = new Date(reqForm.fecha_vencimiento + 'T12:00:00')
      fecha.setMonth(fecha.getMonth() + i)
      return {
        emision_id: reqForm.emision_id, poliza_id: poliza.id,
        codigo: codigosAGenerar[i],
        codigo_matriz: i === 0 ? null : String(baseNum),
        numero_cuota: i+1, total_cuotas: totalCuotas, monto,
        fecha_vencimiento: fecha.toISOString().split('T')[0], created_by: user?.id,
        prima_neta: pnCuota,
        monto_gasto_emision: geCuota,
        monto_recargo: recCuota,
        monto_iva: ivaCuota,
        porcentaje_comision: polizaComPct || 0,
        monto_comision: comCuota,
      }
    })
    const { error } = await supabase.from('requerimientos_pago').insert(requerimientos)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(`${totalCuotas} requerimiento(s) creado(s)`)
    setReqForm(emptyReq); setShowReqModal(false); setReqAjustar(false); fetchData()
  }

  const eliminarReq = async (id) => {
    if (!confirm('¿Eliminar este requerimiento de pago?')) return
    const { error } = await supabase.from('requerimientos_pago').delete().eq('id', id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Requerimiento eliminado')
    setShowReqGestion(false); setReqGestionTarget(null); fetchData()
  }

  const closeReqGestion = () => {
    setShowReqGestion(false); setReqGestionTarget(null)
    setReqGestionFechaPago(''); setReqGestionNotas(''); setReqComprobanteFile(null)
  }

  const marcarPagado = async () => {
    if (!reqGestionTarget) return
    if (!reqGestionFechaPago) { toast.error('Ingresa la fecha de pago'); return }
    const toastId = toast.loading('Registrando pago…')
    let comprobante_url = reqGestionTarget.comprobante_url || null
    if (reqComprobanteFile) {
      const ext = reqComprobanteFile.name.split('.').pop()
      const eid = await getMyEmpresaId()
      const path = `${eid}/comprobantes/${poliza.id}/${reqGestionTarget.id}.${ext}`
      const { error: upErr } = await supabase.storage.from('polizas-pdfs').upload(path, reqComprobanteFile, { upsert: true })
      if (upErr) { toast.dismiss(toastId); toast.error('Error subiendo comprobante: ' + upErr.message); return }
      const { data: { publicUrl } } = supabase.storage.from('polizas-pdfs').getPublicUrl(path)
      comprobante_url = publicUrl
    }
    const { error } = await supabase.from('requerimientos_pago').update({
      estado: 'pagado', fecha_pago: reqGestionFechaPago,
      comprobante_url, notas: reqGestionNotas || null,
    }).eq('id', reqGestionTarget.id)
    toast.dismiss(toastId)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Pago registrado')
    closeReqGestion(); fetchData()
  }

  const subirComprobante = async () => {
    if (!reqComprobanteFile || !reqGestionTarget) return
    const toastId = toast.loading('Subiendo comprobante…')
    const ext = reqComprobanteFile.name.split('.').pop()
    const eid = await getMyEmpresaId()
    const path = `${eid}/comprobantes/${poliza.id}/${reqGestionTarget.id}.${ext}`
    const { error: upErr } = await supabase.storage.from('polizas-pdfs').upload(path, reqComprobanteFile, { upsert: true })
    if (upErr) { toast.dismiss(toastId); toast.error('Error: ' + upErr.message); return }
    const { data: { publicUrl } } = supabase.storage.from('polizas-pdfs').getPublicUrl(path)
    const { error } = await supabase.from('requerimientos_pago').update({ comprobante_url: publicUrl }).eq('id', reqGestionTarget.id)
    toast.dismiss(toastId)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Comprobante guardado')
    setReqGestionTarget(prev => ({ ...prev, comprobante_url: publicUrl }))
    setReqComprobanteFile(null); fetchData()
  }

  const handleGenerarPdf = async () => {
    const toastId = toast.loading('Generando PDF…')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase.from('users').select('nombre,apellido').eq('id', user.id).single()
      const usuarioNombre = userData ? `${userData.nombre || ''} ${userData.apellido || ''}`.trim() : (user.email?.split('@')[0] || 'GGS')
      const { data: clienteFull } = await supabase.from('clientes').select('*').eq('id', poliza.cliente_id).single()
      let personaFacturable = null
      if (poliza.persona_facturable_id) {
        const { data: pfData } = await supabase.from('personas_facturables').select('*').eq('id', poliza.persona_facturable_id).single()
        personaFacturable = pfData || null
      }
      let coberturas = null
      if (poliza.incluir_coberturas_pdf && poliza.producto_id) {
        const { data: pcc } = await supabase
          .from('producto_coberturas_catalogo')
          .select('coberturas_catalogo(nombre, monto)')
          .eq('producto_id', poliza.producto_id)
        coberturas = (pcc || []).map(r => r.coberturas_catalogo).filter(Boolean)
      }
      await generateSolicitudPdf({
        poliza: { ...poliza, clientes: clienteFull || poliza.clientes },
        vehiculos: solicitudVehiculos,
        personaFacturable,
        usuario: usuarioNombre,
        coberturas,
      })
      toast.success('PDF generado', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Error al generar PDF', { id: toastId })
    }
  }

  const handleGestionPdf = async (em) => {
    const toastId = toast.loading('Generando PDF…')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase.from('users').select('nombre,apellido').eq('id', user.id).single()
      const usuarioNombre = userData ? `${userData.nombre||''} ${userData.apellido||''}`.trim() : (user.email?.split('@')[0]||'GGS')
      const { data: clienteFull } = await supabase.from('clientes').select('*').eq('id', poliza.cliente_id).single()
      let personaFacturable = null
      if (em.persona_facturable_id) {
        const { data: pfData } = await supabase.from('personas_facturables').select('*').eq('id', em.persona_facturable_id).single()
        personaFacturable = pfData || null
      }
      if (em.tipo === 'modificacion') {
        await generateModificacionPdf({
          emision: em,
          poliza: { ...poliza, clientes: clienteFull || poliza.clientes },
          usuario: usuarioNombre,
        })
      } else {
        const vehiculos = (em.emision_vehiculos || []).filter(ev => ev.vehiculos).map(ev => ({
          ...ev.vehiculos,
          prima_neta: ev.prima_neta, monto_gasto_emision: ev.monto_gasto_emision,
          monto_recargo: ev.monto_recargo, monto_iva: ev.monto_iva, prima_total: ev.prima_total,
          deducible_danios: ev.deducible_danios, deducible_robo: ev.deducible_robo,
        }))
        let coberturas = null
        if (em.incluir_coberturas_pdf && poliza.producto_id) {
          const { data: pcc } = await supabase
            .from('producto_coberturas_catalogo')
            .select('coberturas_catalogo(nombre, monto)')
            .eq('producto_id', poliza.producto_id)
          coberturas = (pcc || []).map(r => r.coberturas_catalogo).filter(Boolean)
        }
        await generateInclusionPdf({
          emision: em,
          poliza: { ...poliza, clientes: clienteFull || poliza.clientes },
          vehiculos,
          personaFacturable,
          usuario: usuarioNombre,
          coberturas,
        })
      }
      toast.success('PDF generado', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Error al generar PDF', { id: toastId })
    }
  }

  const handleEstadoCuenta = async () => {
    const toastId = toast.loading('Generando estado de cuenta…')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase.from('users').select('nombre,apellido').eq('id', user.id).single()
      const usuarioNombre = userData ? `${userData.nombre || ''} ${userData.apellido || ''}`.trim() : (user.email?.split('@')[0] || 'GGS')
      await generateEstadoCuentaPdf({ poliza, reqs, usuario: usuarioNombre })
      toast.success('Estado de cuenta generado', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Error al generar estado de cuenta', { id: toastId })
    }
  }

  const handleModificacionSubmit = async () => {
    if (!modificacionDesc.trim()) { toast.error('Ingresa la descripción de modificaciones'); return }
    const isEditing = !!emisionForModal && emisionForModal.tipo === 'modificacion'
    const toastId = toast.loading(isEditing ? 'Guardando cambios…' : 'Creando gestión…')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (isEditing) {
        const { error } = await supabase.from('emisiones').update({ notas: modificacionDesc.trim() }).eq('id', emisionForModal.id)
        if (error) { toast.error('Error: ' + error.message, { id: toastId }); return }
        toast.success('Modificación actualizada', { id: toastId })
      } else {
        const count = emisiones.filter(em => em.tipo === 'modificacion').length + 1
        const numEmision = `${poliza.numero_poliza || 'SOL'}-MOD${count.toString().padStart(2, '0')}`
        const today = new Date().toISOString().split('T')[0]
        const { error } = await supabase.from('emisiones').insert({
          poliza_id: poliza.id, tipo: 'modificacion', estado: 'solicitud',
          numero_emision: numEmision,
          notas: modificacionDesc.trim(),
          fecha_inicio: today,
          fecha_fin: today,
          created_by: user?.id,
        })
        if (error) { toast.error('Error: ' + error.message, { id: toastId }); return }
        await addBitacora(null, 'solicitud', `[Gestión] Modificación ${numEmision} creada`)
        toast.success('Modificación creada · ' + numEmision, { id: toastId })
      }
      setShowModificacionModal(false)
      setModificacionDesc('')
      setEmisionForModal(null)
      fetchData()
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar modificación', { id: toastId })
    }
  }

  const handleModificacionPdf = async (em) => {
    const toastId = toast.loading('Generando PDF…')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase.from('users').select('nombre,apellido').eq('id', user.id).single()
      const usuarioNombre = userData ? `${userData.nombre||''} ${userData.apellido||''}`.trim() : (user.email?.split('@')[0]||'GGS')
      const { data: clienteFull } = await supabase.from('clientes').select('*').eq('id', poliza.cliente_id).single()
      await generateModificacionPdf({
        emision: em,
        poliza: { ...poliza, clientes: clienteFull || poliza.clientes },
        usuario: usuarioNombre,
      })
      toast.success('PDF generado', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Error al generar PDF', { id: toastId })
    }
  }

  const actualizarEstadoEmision = async (em, nuevoEstado) => {
    const { error } = await supabase.from('emisiones').update({ estado: nuevoEstado }).eq('id', em.id)
    if (error) { toast.error('Error: ' + error.message); return false }
    const tipoLabel = { emision:'Emisión principal', inclusion:'Inclusión', exclusion:'Exclusión', modificacion:'Modificación' }[em.tipo] || em.tipo
    const estadoLabel = { solicitud:'Solicitud', enviada:'Enviada a aseguradora', en_reproceso:'En reproceso', emitida:'Emitida', completado:'Completada', cancelada:'Cancelada' }
    const desc = `[Gestión] ${tipoLabel} ${em.numero_emision} — ${estadoLabel[em.estado]||em.estado} → ${estadoLabel[nuevoEstado]||nuevoEstado}`
    await addBitacora(em.estado, nuevoEstado, desc)
    // When an exclusion is completado/emitida → release excluded vehicles
    if ((nuevoEstado === 'completado' || nuevoEstado === 'emitida') && em.tipo === 'exclusion') {
      const excVehiculos = em.emision_vehiculos?.map(ev => ev.vehiculos?.id).filter(Boolean) || []
      if (excVehiculos.length > 0) {
        await Promise.all(excVehiculos.map(vid =>
          supabase.from('vehiculos').update({ poliza_id: null }).eq('id', vid)
        ))
      }
    }
    // When an inclusion is emitida/completado → claim vehicles for this poliza
    if ((nuevoEstado === 'completado' || nuevoEstado === 'emitida') && em.tipo === 'inclusion') {
      const incVehiculos = em.emision_vehiculos?.map(ev => ev.vehiculos?.id).filter(Boolean) || []
      if (incVehiculos.length > 0) {
        await Promise.all(incVehiculos.map(vid =>
          supabase.from('vehiculos').update({ poliza_id: poliza.id }).eq('id', vid)
        ))
      }
    }
    toast.success(`${tipoLabel} → ${estadoLabel[nuevoEstado]||nuevoEstado}`)
    await fetchData()
    return true
  }

  const totalPagado    = reqs.filter(r=>r.estado==='pagado').reduce((s,r)=>s+parseFloat(r.monto||0),0)
  const totalVencido   = reqs.filter(r=>r.estado==='vencido').reduce((s,r)=>s+parseFloat(r.monto||0),0)
  const totalPendiente = reqs.filter(r=>r.estado!=='pagado').reduce((s,r)=>s+parseFloat(r.monto||0),0)
  const totalVehiculos = emisiones.reduce((s,em)=>s+(em.emision_vehiculos?.length||0),0)
  const isEmitida = poliza.estado === 'emitida'
  const primaTotal = isEmitida
    ? emisiones
        .filter(em=>em.estado==='emitida'||em.estado==='completado')
        .reduce((s,em)=>{ const v=parseFloat(em.prima_emision||0); return em.tipo==='exclusion'?s-v:s+v }, 0)
    : parseFloat(poliza.prima_total||0)
  const inputStyle = { width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:'6px', fontSize:'13px', background:'white', color:'#1e293b', boxSizing:'border-box' }

  const hoy = new Date()
  const pEst = polizaEstados[poliza.estado] || polizaEstados.solicitud
  const vencDate = poliza.fecha_vencimiento ? new Date(poliza.fecha_vencimiento) : null
  const diasRestantes = vencDate ? Math.ceil((vencDate - hoy) / (1000*60*60*24)) : null
  const vencEst = vencDate ? (vencDate < hoy ? 'vencida' : diasRestantes <= 30 ? 'por_vencer' : 'activa') : 'activa'

  const estadoBitacora = {
    solicitud:'#7A5A1E', enviada:'#C4A96B', en_reproceso:'#C4A96B', emitida:'#C4A96B'
  }

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:'6px',color:'#64748b',background:'none',border:'none',cursor:'pointer',fontSize:'14px',marginBottom:'20px',padding:'0'}}>
        <ArrowLeft size={16}/> {fromCliente ? 'Volver al cliente' : fromReq ? 'Volver al requerimiento' : 'Volver a pólizas'}
      </button>

      {/* ── Policy header card ── */}
      <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'14px',marginBottom:'20px',overflow:'hidden'}}>

        {/* Identity row + actions */}
        <div style={{padding:'20px 24px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'16px',flexWrap:'wrap'}}>

          {/* Left: logo + title + subtitle */}
          <div style={{display:'flex',alignItems:'flex-start',gap:'16px',minWidth:0}}>
            {/* Insurer logo */}
            <div style={{width:'56px',height:'56px',borderRadius:'12px',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'white',flexShrink:0,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              {poliza.aseguradoras?.logo_url
                ? <img src={poliza.aseguradoras.logo_url} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
                : <FileText size={22} color="#C4A96B"/>}
            </div>

            {/* Title + badges + subtitle */}
            <div style={{minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                <h1 style={{fontSize:'22px',fontWeight:800,color:'#111111',margin:0,letterSpacing:'-0.3px'}}>
                  {poliza.numero_poliza || `SOL-${poliza.numero_solicitud||'?'}`}
                </h1>
                <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',fontWeight:700,background:pEst.bg,color:pEst.color}}>{pEst.label}</span>
                {isEmitida && vencEst==='vencida' && <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:'#fef2f2',color:'#ef4444',fontWeight:600}}>Vencida</span>}
                {isEmitida && vencEst==='por_vencer' && <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:'#fef9c3',color:'#a16207',fontWeight:600}}>Por vencer ({diasRestantes}d)</span>}
              </div>
              <p style={{fontSize:'13px',color:'#6B6B62',margin:'5px 0 0',overflow:'hidden',textOverflow:isMobile?'clip':'ellipsis',whiteSpace:isMobile?'normal':'nowrap'}}>
                {poliza.clientes?.tipo === 'empresa' ? (poliza.clientes?.razon_social || poliza.clientes?.nombre_empresa || poliza.clientes?.nombre || '') : `${poliza.clientes?.nombre||''} ${poliza.clientes?.apellido||''}`.trim()} · {poliza.aseguradoras?.nombre} · {poliza.productos?.nombre}
              </p>
              {isEmitida && poliza.numero_solicitud && (
                <p style={{fontSize:'11px',color:'#94a3b8',margin:'2px 0 0'}}>
                  Solicitud: <span style={{fontWeight:600}}>SOL-{poliza.numero_solicitud}</span>
                </p>
              )}
              {poliza.poliza_origen && (
                <div style={{marginTop:'4px',display:'flex',alignItems:'center',gap:'4px'}}>
                  <GitMerge size={11} color="#94a3b8"/>
                  <span style={{fontSize:'12px',color:'#6B6B62'}}>
                    Renovación de&nbsp;
                    <button onClick={()=>navigate('/polizas',{state:{openPolizaId:poliza.poliza_origen.id}})}
                      style={{background:'none',border:'none',color:'#C4A96B',cursor:'pointer',fontSize:'12px',fontWeight:600,padding:0,textDecoration:'underline'}}>
                      {poliza.poliza_origen.numero_poliza||'solicitud anterior'}
                    </button>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: action buttons */}
          <div style={{display:'flex',flexWrap:'wrap',gap:'8px',alignItems:'center',flexShrink:0}}>

            {/* ── Editar ── */}
            <button onClick={()=>onEdit(poliza)} title="Editar"
              style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 14px',background:'white',color:'#374151',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',flexShrink:0}}>
              <Edit2 size={14}/> Editar
            </button>

            {/* ── PDF solicitud: outline en todos los estados pre-emitida ── */}
            {(poliza.estado === 'solicitud' || poliza.estado === 'enviada' || poliza.estado === 'en_reproceso') && (
              <button onClick={handleGenerarPdf}
                title={poliza.estado === 'en_reproceso' ? 'Re-descargar PDF con cambios' : 'Descargar PDF solicitud'}
                style={{display:'flex',alignItems:'center',gap:'7px',padding:'8px 14px',
                  background:'white',color:'#374151',border:'1px solid #e2e8f0',
                  borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer'}}>
                <Download size={14}/>
                {poliza.estado === 'en_reproceso' ? 'Re-descargar PDF' : 'PDF solicitud'}
              </button>
            )}

            {/* ── Cambiar estado: solicitud / enviada / en_reproceso ── */}
            {(poliza.estado === 'solicitud' || poliza.estado === 'enviada' || poliza.estado === 'en_reproceso') && (
              <button onClick={()=>{ setEstadoOpcion(null); setShowCambiarEstadoModal(true) }}
                style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 18px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
                <RefreshCw size={13}/> Cambiar estado
              </button>
            )}

            {/* ── Estado: emitida ── */}
            {isEmitida && poliza.poliza_pdf_url && (
              <a href={poliza.poliza_pdf_url} target="_blank" rel="noopener noreferrer"
                style={{display:'flex',alignItems:'center',gap:'5px',padding:'8px 14px',background:'white',color:'#374151',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',textDecoration:'none'}}>
                <Download size={13}/> Póliza PDF
              </a>
            )}

          </div>
        </div>

        {/* Divider */}
        <div style={{height:'1px',background:'#f1f5f9',margin:'0 24px'}}/>

        {/* KPI strip — integrated into card */}
        <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)'}}>
          {[
            ['Prima total',   'Q '+primaTotal.toLocaleString(),  '#C4A96B'],
            ['Tipo de pago',  poliza.tipo_pago==='financiado'?`Fraccionado · ${poliza.numero_cuotas||1} cuotas`:'Contado', '#111111'],
            ['Inicio',        poliza.fecha_inicio ? new Date(poliza.fecha_inicio+'T12:00:00').toLocaleDateString('es-GT') : '—', '#374151'],
            ['Vencimiento',   vencDate ? new Date(poliza.fecha_vencimiento+'T12:00:00').toLocaleDateString('es-GT') : '—', vencEst==='vencida'?'#ef4444':vencEst==='por_vencer'?'#a16207':'#374151'],
          ].map(([label,val,color],i)=>(
            <div key={label} style={{padding:isMobile?'12px 16px':'16px 24px',borderRight:isMobile?(i%2===0?'1px solid #f1f5f9':'none'):(i<3?'1px solid #f1f5f9':'none'),borderBottom:isMobile&&i<2?'1px solid #f1f5f9':'none'}}>
              <p style={{fontSize:'11px',color:'#94a3b8',margin:0,textTransform:'uppercase',letterSpacing:'0.05em',fontWeight:500}}>{label}</p>
              <p style={{fontSize:'15px',fontWeight:700,color,margin:'4px 0 0'}}>{val}</p>
            </div>
          ))}
        </div>

      </div>

      {/* Tabs */}
      {(() => {
        const activeIds = new Set(
          emisiones.filter(em => em.tipo !== 'exclusion' && em.estado !== 'cancelada')
            .flatMap(em => em.emision_vehiculos?.map(ev => ev.vehiculos?.id).filter(Boolean) || [])
        )
        const excludedIds = new Set(
          emisiones.filter(em => em.tipo === 'exclusion' && (em.estado === 'emitida' || em.estado === 'completado'))
            .flatMap(em => em.emision_vehiculos?.map(ev => ev.vehiculos?.id).filter(Boolean) || [])
        )
        const uniqueActive = [...activeIds].filter(id => !excludedIds.has(id)).length
        const tabList = [
          ['detalle','Detalle'],
          ['bitacora',`Bitácora (${bitacora.length})`],
          ['vehiculos_sol', isEmitida ? `Vehículos (${uniqueActive})` : `Vehículos (${solicitudVehiculos.length})`],
          ...(isEmitida ? [
            ['emisiones',`Gestiones (${emisiones.length})`],
            ['pagos',`Pagos (${reqs.length})`],
          ] : []),
          ['tareas',`Tareas (${tareas.length})`],
          ['reclamos',`Reclamos (${reclamosPoliza.length})`],
          ['documentos',`Documentos (${documentos.length})`],
        ]
        const activeLabel = tabList.find(([t]) => t === activeTab)?.[1] || 'Detalle'

        if (isMobile) {
          return (
            <div style={{position:'relative',marginBottom:'16px'}}>
              <button
                onClick={() => setShowTabDropdown(v => !v)}
                style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'11px 16px',background:'white',border:'1px solid #e2e8f0',borderRadius:'10px',
                  fontSize:'14px',fontWeight:600,color:'#111111',cursor:'pointer',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
                <span>{activeLabel}</span>
                <ChevronDown size={16} color='#64748b' style={{transform:showTabDropdown?'rotate(180deg)':'none',transition:'transform 0.2s'}}/>
              </button>
              {showTabDropdown && (
                <>
                  <div onClick={() => setShowTabDropdown(false)}
                    style={{position:'fixed',inset:0,zIndex:100}}/>
                  <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,background:'white',
                    border:'1px solid #e2e8f0',borderRadius:'10px',boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
                    zIndex:101,overflow:'hidden'}}>
                    {tabList.map(([tab, label]) => (
                      <button key={tab}
                        onClick={() => { setActiveTab(tab); setShowTabDropdown(false) }}
                        style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',
                          padding:'12px 16px',background:activeTab===tab?'#f8fafc':'white',
                          border:'none',borderBottom:'1px solid #f1f5f9',fontSize:'14px',
                          fontWeight:activeTab===tab?600:400,color:activeTab===tab?'#111111':'#374151',
                          cursor:'pointer',textAlign:'left'}}>
                        {label}
                        {activeTab===tab && <Check size={15} color='#111111'/>}
                      </button>
                    ))}
                    {!isEmitida && (
                      <p style={{fontSize:'12px',color:'#94a3b8',padding:'10px 16px',margin:0,background:'#f8fafc'}}>
                        Gestiones y pagos disponibles al emitir.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        }

        return (
          <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
            {tabList.map(([tab,label])=>(
              <button key={tab} onClick={()=>setActiveTab(tab)}
                style={{padding:'8px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',
                  background:activeTab===tab?'#111111':'white',color:activeTab===tab?'white':'#64748b',
                  border:`1px solid ${activeTab===tab?'#111111':'#e2e8f0'}`}}>
                {label}
              </button>
            ))}
            {!isEmitida && (
              <p style={{fontSize:'13px',color:'#94a3b8',margin:'auto 0',paddingLeft:'4px'}}>
                Emisiones y pagos disponibles al emitir la póliza.
              </p>
            )}
          </div>
        )
      })()}

      {/* ─ TAB: Detalle ─ */}
      {activeTab === 'detalle' && (() => {
        const cli = poliza.clientes || {}
        const pf  = poliza.personas_facturables
        const hoy = new Date()
        const fVenc = poliza.fecha_vencimiento ? new Date(poliza.fecha_vencimiento) : null
        const diasRestantes = fVenc ? Math.ceil((fVenc - hoy) / (1000*60*60*24)) : null
        const diasColor = diasRestantes === null ? '#64748b' : diasRestantes < 0 ? '#ef4444' : diasRestantes <= 30 ? '#f59e0b' : diasRestantes <= 60 ? '#a16207' : '#15803d'
        const diasBg    = diasRestantes === null ? '#f1f5f9' : diasRestantes < 0 ? '#fef2f2' : diasRestantes <= 30 ? '#fef2f2' : diasRestantes <= 60 ? '#fef9c3' : '#dcfce7'
        const diasLabel = diasRestantes === null ? '—' : diasRestantes < 0 ? `Venció hace ${Math.abs(diasRestantes)} días` : diasRestantes === 0 ? 'Vence hoy' : `${diasRestantes} días restantes`
        const nombreCliente = cli.tipo === 'empresa'
          ? (cli.razon_social || cli.nombre_empresa || cli.nombre || '—')
          : [cli.nombre, cli.apellido].filter(Boolean).join(' ') || '—'
        const initials = nombreCliente !== '—' ? nombreCliente.charAt(0).toUpperCase() : '?'

        const SectionLabel = ({children}) => (
          <p style={{fontSize:'11px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',margin:'0 0 12px'}}>{children}</p>
        )
        const Field = ({label, value, mono=false}) => value ? (
          <div>
            <p style={{fontSize:'11px',color:'#94a3b8',margin:'0 0 2px'}}>{label}</p>
            <p style={{fontSize:'13px',fontWeight:600,color:'#111111',margin:0,fontFamily:mono?'monospace':'inherit'}}>{value}</p>
          </div>
        ) : null

        return (
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 320px',gap:'16px',alignItems:'start'}}>

            {/* ── Left column ── */}
            <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>

              {/* Póliza card */}
              <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',padding:'20px 24px'}}>
                <SectionLabel>Datos de la póliza</SectionLabel>
                <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #f1f5f9'}}>
                  <div style={{width:'48px',height:'48px',borderRadius:'10px',background:'#f8fafc',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
                    {poliza.aseguradoras?.logo_url
                      ? <img src={poliza.aseguradoras.logo_url} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
                      : <FileText size={20} color='#C4A96B'/>}
                  </div>
                  <div>
                    <p style={{fontSize:'15px',fontWeight:700,color:'#111111',margin:0}}>{poliza.aseguradoras?.nombre || '—'}</p>
                    <p style={{fontSize:'12px',color:'#64748b',margin:'2px 0 0'}}>{poliza.productos?.nombre || '—'}</p>
                  </div>
                  {poliza.poliza_pdf_url && (
                    <a href={poliza.poliza_pdf_url} target='_blank' rel='noopener noreferrer'
                      style={{marginLeft:'auto',display:'inline-flex',alignItems:'center',gap:'5px',padding:'6px 12px',background:'#f8fafc',color:'#374151',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'12px',fontWeight:600,textDecoration:'none',flexShrink:0}}>
                      <Download size={13}/> PDF póliza
                    </a>
                  )}
                </div>
              </div>

              {/* Desglose de prima */}
              {parseFloat(poliza.prima_total) > 0 && (() => {
                const pn   = parseFloat(poliza.prima_neta        || 0)
                const ge   = parseFloat(poliza.monto_gasto_emision|| 0)
                const rec  = parseFloat(poliza.monto_recargo      || 0)
                const iva  = parseFloat(poliza.monto_iva          || 0)
                const pt   = parseFloat(poliza.prima_total        || 0)
                const com  = polizaComPct > 0 ? Math.round(pn * polizaComPct) / 100 : 0
                const pctGasto = polizaAsegConfig?.porcentaje_gasto_emision ?? null
                const pctRec   = poliza.tipo_pago === 'financiado' && polizaAsegConfig?.recargos
                  ? (polizaAsegConfig.recargos.find(r => r.numero_cuotas === (poliza.numero_cuotas || 1))?.porcentaje ?? null)
                  : null
                const fmt = v => `Q ${parseFloat(v).toLocaleString('es-GT', {minimumFractionDigits:2, maximumFractionDigits:2})}`
                const Row = ({label, value, color, bold, border}) => (
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',
                    padding: border ? '10px 0 0' : '5px 0',
                    borderTop: border ? '1px solid #e2e8f0' : 'none',
                    marginTop: border ? '6px' : 0}}>
                    <span style={{fontSize:'13px',color: color||'#64748b',fontWeight:bold?700:400}}>{label}</span>
                    <span style={{fontSize:'13px',color: color||'#374151',fontWeight:bold?700:500,fontVariantNumeric:'tabular-nums'}}>{value}</span>
                  </div>
                )
                return (
                  <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',padding:'20px 24px'}}>
                    <SectionLabel>Desglose de prima</SectionLabel>
                    <Row label='Prima neta' value={fmt(pn)}/>
                    {ge > 0 && <Row label={`+ Gastos de emisión${pctGasto !== null ? ` (${pctGasto}%)` : ''}`} value={fmt(ge)}/>}
                    {rec > 0 && <Row label={`+ Recargo fraccionamiento${pctRec !== null ? ` (${pctRec}%)` : ''}`} value={fmt(rec)}/>}
                    {iva > 0 && <Row label='+ IVA (12%)' value={fmt(iva)}/>}
                    <Row label='Prima total' value={fmt(pt)} bold border color='#111111'/>
                    {com > 0 && (
                      <div style={{marginTop:'10px',paddingTop:'10px',borderTop:'1px dashed #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                        <span style={{fontSize:'13px',color:'#C4A96B',fontWeight:500}}>Comisión ({polizaComPct}%)</span>
                        <span style={{fontSize:'13px',color:'#C4A96B',fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{fmt(com)}</span>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Vigencia card */}
              <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',padding:'20px 24px'}}>
                <SectionLabel>Vigencia</SectionLabel>
                <div style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                      <div style={{textAlign:'center',padding:'10px 16px',background:'#f8fafc',borderRadius:'8px',border:'1px solid #e2e8f0'}}>
                        <p style={{fontSize:'10px',color:'#94a3b8',margin:0,textTransform:'uppercase',letterSpacing:'0.4px'}}>Inicio</p>
                        <p style={{fontSize:'14px',fontWeight:700,color:'#111111',margin:'3px 0 0'}}>
                          {poliza.fecha_inicio ? new Date(poliza.fecha_inicio+'T12:00:00').toLocaleDateString('es-GT') : '—'}
                        </p>
                      </div>
                      <div style={{color:'#cbd5e1',fontSize:'18px'}}>→</div>
                      <div style={{textAlign:'center',padding:'10px 16px',background:'#f8fafc',borderRadius:'8px',border:'1px solid #e2e8f0'}}>
                        <p style={{fontSize:'10px',color:'#94a3b8',margin:0,textTransform:'uppercase',letterSpacing:'0.4px'}}>Vencimiento</p>
                        <p style={{fontSize:'14px',fontWeight:700,color:'#111111',margin:'3px 0 0'}}>
                          {fVenc ? fVenc.toLocaleDateString('es-GT') : '—'}
                        </p>
                      </div>
                      {diasRestantes !== null && (
                        <span style={{padding:'6px 14px',borderRadius:'20px',background:diasBg,color:diasColor,fontSize:'12px',fontWeight:600}}>
                          {diasLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Responsable de pago — only if different from client */}
              {pf && (
                <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',padding:'20px 24px'}}>
                  <SectionLabel>Responsable de pago</SectionLabel>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'16px'}}>
                    <Field label='Nombre' value={[pf.nombre,pf.apellido].filter(Boolean).join(' ')}/>
                    <Field label='NIT' value={pf.nit} mono/>
                    <Field label='Dirección' value={pf.direccion}/>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right column: Cliente ── */}
            <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',padding:'20px 24px'}}>
                <SectionLabel>Cliente</SectionLabel>
                {/* Avatar + name */}
                <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px',paddingBottom:'16px',borderBottom:'1px solid #f1f5f9'}}>
                  <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'#C4A96B',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{fontSize:'16px',fontWeight:700,color:'white'}}>{initials}</span>
                  </div>
                  <div>
                    <button onClick={()=>navigate('/clientes',{state:{openClienteId:poliza.cliente_id}})}
                      style={{fontSize:'14px',fontWeight:700,color:'#111111',background:'none',border:'none',cursor:'pointer',padding:0,textAlign:'left',textDecoration:'underline',textDecorationColor:'#e2e8f0'}}>
                      {nombreCliente || '—'}
                    </button>
                    <p style={{fontSize:'11px',color:'#94a3b8',margin:'2px 0 0'}}>Ver perfil completo →</p>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
                  <Field label='NIT' value={cli.nit} mono/>
                  <Field label='DPI' value={cli.dpi} mono/>
                  <Field label='Teléfono' value={cli.telefono}/>
                  <Field label='Correo' value={cli.email}/>
                  {cli.direccion && <Field label='Dirección' value={cli.direccion}/>}
                  {cli.fecha_nacimiento && (
                    <Field label='Fecha de nacimiento' value={new Date(cli.fecha_nacimiento+'T12:00:00').toLocaleDateString('es-GT')}/>
                  )}
                  {poliza.ejecutivo_id && (() => {
                    const ej = usuariosPoliza.find(u => u.id === poliza.ejecutivo_id)
                    return ej ? <Field label='Dueño Ejecutivo' value={ej.nombre}/> : null
                  })()}
                </div>
              </div>
          </div>
        )
      })()}

      {/* ─ TAB: Bitácora ─ */}
      {activeTab === 'bitacora' && (() => {
        const polizaEntries = bitacora.filter(e => !e.descripcion?.startsWith('[Gestión]'))
        const gestionEntries = bitacora.filter(e => e.descripcion?.startsWith('[Gestión]'))
        // Group gestion entries by emission number
        const gestionGroups = {}
        gestionEntries.forEach(e => {
          const cleanDesc = e.descripcion.replace('[Gestión] ','')
          const matchedEm = emisiones.find(em => cleanDesc.includes(em.numero_emision))
          const key = matchedEm ? matchedEm.numero_emision : 'otras'
          if (!gestionGroups[key]) {
            gestionGroups[key] = { em: matchedEm, entries: [], key }
          }
          gestionGroups[key].entries.push(e)
        })
        const groupKeys = Object.keys(gestionGroups)
        const thStyle = { padding:'8px 12px', fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', textAlign:'left', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }
        const tdStyle = { padding:'9px 12px', fontSize:'13px', color:'#374151', borderBottom:'1px solid #f8fafc', verticalAlign:'middle' }
        const renderTable = (entries) => (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Evento</th>
                <th style={thStyle}>Estado anterior</th>
                <th style={thStyle}>Estado nuevo</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const cleanDesc = entry.descripcion?.startsWith('[Gestión]') ? entry.descripcion.replace('[Gestión] ','') : (entry.descripcion||'')
                // Strip the "X — prev → next" part from gestion descriptions if we have columns
                const displayDesc = cleanDesc.replace(/ — .+→.+$/,'').trim() || cleanDesc
                const eAnterior = polizaEstados[entry.estado_anterior]
                const eNuevo    = polizaEstados[entry.estado_nuevo]
                return (
                  <tr key={entry.id} onMouseEnter={e=>e.currentTarget.style.background='#fafbff'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
                    <td style={{...tdStyle, whiteSpace:'nowrap', color:'#64748b', fontSize:'12px'}}>
                      {new Date(entry.created_at).toLocaleDateString('es-GT')}<br/>
                      <span style={{color:'#94a3b8'}}>{new Date(entry.created_at).toLocaleTimeString('es-GT',{hour:'2-digit',minute:'2-digit'})}</span>
                    </td>
                    <td style={tdStyle}>{displayDesc}</td>
                    <td style={tdStyle}>
                      {entry.estado_anterior ? (
                        <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:eAnterior?.bg||'#f1f5f9',color:eAnterior?.color||'#64748b',fontWeight:600,whiteSpace:'nowrap'}}>
                          {eAnterior?.label||entry.estado_anterior}
                        </span>
                      ) : <span style={{color:'#94a3b8',fontSize:'12px'}}>—</span>}
                    </td>
                    <td style={tdStyle}>
                      {entry.estado_nuevo ? (
                        <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:eNuevo?.bg||'#f1f5f9',color:eNuevo?.color||'#64748b',fontWeight:600,whiteSpace:'nowrap'}}>
                          {eNuevo?.label||entry.estado_nuevo}
                        </span>
                      ) : <span style={{color:'#94a3b8',fontSize:'12px'}}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )
        return (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            {loading ? <p style={{padding:'20px',color:'#64748b'}}>Cargando...</p> :
             bitacora.length === 0 ? (
              <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',padding:'32px',textAlign:'center'}}>
                <History size={28} color='#cbd5e1' style={{marginBottom:'10px'}}/>
                <p style={{color:'#94a3b8',margin:0}}>Sin registros en la bitácora</p>
              </div>
             ) : (
              <>
                {/* Póliza events */}
                {polizaEntries.length > 0 && (() => {
                  const isPolizaExpanded = expandedEmision === 'bit-poliza'
                  return (
                    <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
                      <div style={{padding:'12px 16px',borderBottom:isPolizaExpanded?'1px solid #f1f5f9':'none',display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'}}
                        onClick={()=>setExpandedEmision(isPolizaExpanded?null:'bit-poliza')}>
                        <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',fontWeight:700,background:'#f1f5f9',color:'#475569'}}>PÓLIZA</span>
                        <span style={{fontSize:'13px',fontWeight:600,color:'#111111'}}>Bitácora completa</span>
                        <span style={{marginLeft:'auto',fontSize:'12px',color:'#94a3b8'}}>{polizaEntries.length} evento(s)</span>
                        {isPolizaExpanded ? <ChevronUp size={14} color="#94a3b8"/> : <ChevronDown size={14} color="#94a3b8"/>}
                      </div>
                      {isPolizaExpanded && <div style={{overflowX:'auto'}}>{renderTable(polizaEntries)}</div>}
                    </div>
                  )
                })()}
                {/* Gestión events grouped by emission */}
                {groupKeys.map(key => {
                  const grp = gestionGroups[key]
                  const tipoLabel = grp.em ? ({ emision:'Emisión principal', inclusion:'Inclusión', exclusion:'Exclusión', renovacion:'Renovación', modificacion:'Modificación' }[grp.em.tipo] || grp.em.tipo) : 'Gestión'
                  const eEst = grp.em ? (polizaEstados[grp.em.estado] || { bg:'#f1f5f9', color:'#64748b', label:grp.em.estado }) : null
                  const isExpanded = expandedEmision === ('bit-'+key)
                  return (
                    <div key={key} style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
                      <div style={{padding:'12px 16px',borderBottom: isExpanded?'1px solid #f1f5f9':'none',display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'}}
                        onClick={()=>setExpandedEmision(isExpanded?null:'bit-'+key)}>
                        <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',fontWeight:700,background:'#ede9fe',color:'#7c3aed'}}>GESTIÓN</span>
                        <span style={{fontSize:'13px',fontWeight:600,color:'#111111'}}>{key}</span>
                        <span style={{fontSize:'12px',color:'#64748b'}}>{tipoLabel}</span>
                        {eEst && <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:eEst.bg,color:eEst.color,fontWeight:600}}>{eEst.label}</span>}
                        <span style={{marginLeft:'auto',fontSize:'12px',color:'#94a3b8'}}>{grp.entries.length} evento(s)</span>
                        {isExpanded ? <ChevronUp size={14} color="#94a3b8"/> : <ChevronDown size={14} color="#94a3b8"/>}
                      </div>
                      {isExpanded && <div style={{overflowX:'auto'}}>{renderTable(grp.entries)}</div>}
                    </div>
                  )
                })}
              </>
             )}

            {/* ── Histórico de cambios ── */}
            <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <div onClick={()=>setIsHistorialOpen(v=>!v)}
                style={{padding:'14px 20px',cursor:'pointer',display:'flex',alignItems:'center',gap:'10px',borderBottom:isHistorialOpen?'1px solid #f1f5f9':'none'}}>
                <p style={{fontSize:'13px',fontWeight:700,color:'#111111',margin:0,textTransform:'uppercase',letterSpacing:'0.5px',flex:1}}>Histórico de cambios</p>
                <span style={{fontSize:'11px',color:'#94a3b8',marginRight:'4px'}}>{bitacora.length} evento(s)</span>
                {isHistorialOpen ? <ChevronUp size={14} color="#94a3b8"/> : <ChevronDown size={14} color="#94a3b8"/>}
              </div>
              {isHistorialOpen && (
                <div style={{padding:'16px 20px'}}>
                  {bitacora.length === 0 ? (
                    <p style={{fontSize:'13px',color:'#94a3b8',margin:0}}>Sin cambios registrados</p>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                      {[...bitacora].reverse().map((entry, i) => {
                        const userMatch = usuariosPoliza.find(u => u.id === entry.created_by)
                        const nombre = userMatch?.nombre || 'Sistema'
                        const fecha = new Date(entry.created_at).toLocaleDateString('es-GT',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
                        const desc = entry.descripcion?.startsWith('[Gestión]') ? entry.descripcion.replace('[Gestión] ','') : (entry.descripcion||'')
                        return (
                          <div key={entry.id||i} style={{display:'flex',gap:'10px',alignItems:'flex-start',paddingBottom:'10px',borderBottom:i<bitacora.length-1?'1px solid #f1f5f9':'none'}}>
                            <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:'1px'}}>
                              <span style={{fontSize:'10px',fontWeight:700,color:'#64748b'}}>{nombre.charAt(0).toUpperCase()}</span>
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <p style={{margin:'0 0 2px',fontSize:'12px',fontWeight:600,color:'#111111'}}>{nombre}</p>
                              <p style={{margin:'0 0 2px',fontSize:'12px',color:'#374151',wordBreak:'break-word'}}>{desc}</p>
                              <p style={{margin:0,fontSize:'11px',color:'#94a3b8'}}>{fecha}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )
      })()}

      {/* ─ TAB: Vehículos ─ */}
      {activeTab === 'vehiculos_sol' && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:'8px'}}>
            <Car size={16} color='#C4A96B'/>
            <h3 style={{fontSize:'15px',fontWeight:600,color:'#111111',margin:0}}>
              {isEmitida ? 'Vehículos de la póliza' : 'Vehículos de la solicitud'}
            </h3>
          </div>
          {loading ? <p style={{padding:'20px',color:'#64748b'}}>Cargando...</p> :
           !isEmitida ? (
            /* ── Solicitud mode: simple list ── */
            solicitudVehiculos.length === 0 ? (
              <div style={{padding:'32px',textAlign:'center'}}>
                <Car size={28} color='#cbd5e1' style={{marginBottom:'10px'}}/>
                <p style={{color:'#94a3b8',margin:0}}>Sin vehículos asignados a esta solicitud</p>
              </div>
            ) : solicitudVehiculos.map((sv, i) => (
              <div key={sv.id}
                style={{display:'flex',alignItems:'center',padding:'14px 20px',borderBottom:i<solicitudVehiculos.length-1?'1px solid #f1f5f9':'none',cursor:'pointer'}}
                onClick={() => navigate('/vehiculos', { state: { openVehiculoId: sv.vehiculos?.id, fromPolizaId: poliza.id } })}
                onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e=>e.currentTarget.style.background='white'}>
                <div style={{width:'40px',height:'40px',borderRadius:'8px',background:'#f0f4ff',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px',flexShrink:0}}>
                  <Car size={18} color='#C4A96B'/>
                </div>
                <div style={{flex:1}}>
                  <p style={{fontWeight:700,color:'#111111',fontSize:'14px',margin:0}}>{sv.vehiculos?.marca} {sv.vehiculos?.modelo} {sv.vehiculos?.anio}</p>
                  <p style={{fontSize:'12px',color:'#64748b',margin:0}}>Placa: {fp(sv.vehiculos)}{sv.vehiculos?.color ? ` · ${sv.vehiculos.color}` : ''}</p>
                </div>
                {sv.vehiculos?.valor_asegurado > 0 && (
                  <p style={{fontSize:'14px',fontWeight:700,color:'#C4A96B',margin:'0 8px 0 0',flexShrink:0}}>Q {parseFloat(sv.vehiculos.valor_asegurado).toLocaleString()}</p>
                )}
                <ChevronRight size={16} color='#94a3b8'/>
              </div>
            ))
           ) : (() => {
            /* ── Emitida mode: deduplicated + history ── */

            // 1. Build unique vehicle map with full history
            const vehicleMap = new Map()
            // Sort emissions by created_at so history is chronological
            const sortedEm = [...emisiones].sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
            sortedEm.forEach(em => {
              (em.emision_vehiculos || []).forEach(ev => {
                if (!ev.vehiculos?.id) return
                const vid = ev.vehiculos.id
                if (!vehicleMap.has(vid)) vehicleMap.set(vid, { v: ev.vehiculos, history: [] })
                vehicleMap.get(vid).history.push({ em, ev })
              })
            })

            // 2. Determine current status for each vehicle
            const vehicles = [...vehicleMap.values()].map(({ v, history }) => {
              // Look at non-cancelled history entries to determine current state
              const activeHistory = history.filter(h => h.em.estado !== 'cancelada')
              let status = 'cancelado' // default if all cancelled
              if (activeHistory.length > 0) {
                // The most recent active emission determines status
                const last = activeHistory[activeHistory.length - 1]
                if (last.em.tipo === 'exclusion' && (last.em.estado === 'emitida' || last.em.estado === 'completado')) {
                  status = 'excluido'
                } else {
                  status = 'activo'
                }
              }
              // Current prima: latest active non-exclusion entry that has prima data
              const currentPrimaEv = [...activeHistory].reverse()
                .find(h => h.em.tipo !== 'exclusion' && parseFloat(h.ev?.prima_total || 0) > 0)?.ev || null
              return { v, history, status, currentPrimaEv }
            })

            // 3. Sort: activos first, excluidos second, cancelados last
            const order = { activo: 0, excluido: 1, cancelado: 2 }
            vehicles.sort((a,b) => order[a.status] - order[b.status])

            const statusStyle = {
              activo:    { bg:'#C4A96B', color:'#ffffff', label:'Activo' },
              excluido:  { bg:'#F5F0E8', color:'#7A5A1E', label:'Excluido' },
              cancelado: { bg:'#F1F5F9', color:'#94A3B8', label:'Cancelado' },
            }

            const historyTipoStyle = {
              emision:    { icon:'➕', color:'#7A5A1E', label:'Emisión inicial' },
              inclusion:  { icon:'➕', color:'#C4A96B', label:'Inclusión' },
              exclusion:  { icon:'➖', color:'#111111', label:'Exclusión' },
              renovacion: { icon:'🔄', color:'#C4A96B', label:'Renovación' },
            }

            if (vehicles.length === 0) return (
              <div style={{padding:'32px',textAlign:'center'}}>
                <Car size={28} color='#cbd5e1' style={{marginBottom:'10px'}}/>
                <p style={{color:'#94a3b8',margin:0}}>Sin vehículos en la póliza</p>
              </div>
            )

            return vehicles.map(({ v, history, status, currentPrimaEv }, vi) => {
              const badge = statusStyle[status]
              const isExpanded = expandedVehiculos.has(v.id)
              const toggleV = () => setExpandedVehiculos(prev => {
                const s = new Set(prev); s.has(v.id) ? s.delete(v.id) : s.add(v.id); return s
              })
              return (
                <div key={v.id} style={{borderBottom: vi < vehicles.length-1 ? '1px solid #f1f5f9' : 'none'}}>
                  {/* Vehicle row */}
                  <div style={{display:'flex',alignItems:'center',padding:'14px 20px',cursor:'pointer',
                    background: status === 'excluido' ? '#fffaf7' : status === 'cancelado' ? '#fafafa' : 'white'}}
                    onClick={toggleV}
                    onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e=>e.currentTarget.style.background=status==='excluido'?'#fffaf7':status==='cancelado'?'#fafafa':'white'}>
                    <div style={{width:'40px',height:'40px',borderRadius:'8px',
                      background: status==='activo'?'#f0fdf4':status==='excluido'?'#fff7ed':'#f1f5f9',
                      display:'flex',alignItems:'center',justifyContent:'center',marginRight:'12px',flexShrink:0}}>
                      <Car size={18} color={status==='activo'?'#15803d':status==='excluido'?'#ea580c':'#94a3b8'}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                        <p style={{fontWeight:700,color: status==='cancelado'?'#94a3b8':'#111111',fontSize:'14px',margin:0,
                          textDecoration: status==='cancelado'?'line-through':'none'}}>
                          {v.marca} {v.modelo} {v.anio}
                        </p>
                        <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:badge.bg,color:badge.color,fontWeight:600,flexShrink:0}}>
                          {badge.label}
                        </span>
                      </div>
                      <p style={{fontSize:'12px',color:'#64748b',margin:'2px 0 0'}}>
                        Placa: {fp(v)}{v.color ? ` · ${v.color}` : ''}
                        {' · '}<span style={{color:'#94a3b8'}}>{history.length} gestión(es)</span>
                      </p>
                    </div>
                    {v.valor_asegurado > 0 && (
                      <p style={{fontSize:'14px',fontWeight:700,color: status==='cancelado'?'#94a3b8':'#C4A96B',margin:'0 10px 0 0',flexShrink:0}}>
                        Q {parseFloat(v.valor_asegurado).toLocaleString()}
                      </p>
                    )}
                    <button onClick={e=>{e.stopPropagation(); navigate('/vehiculos',{state:{openVehiculoId:v.id,fromPolizaId:poliza.id}})}}
                      style={{padding:'5px 10px',background:'white',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'11px',color:'#64748b',cursor:'pointer',flexShrink:0,marginRight:'8px'}}
                      title='Ver ficha del vehículo'>
                      Ver
                    </button>
                    {isExpanded ? <ChevronUp size={15} color='#94a3b8' style={{flexShrink:0}}/> : <ChevronDown size={15} color='#94a3b8' style={{flexShrink:0}}/>}
                  </div>

                  {/* History timeline */}
                  {isExpanded && (
                    <div style={{background:'#f8fafc',borderTop:'1px solid #f1f5f9',padding:'12px 20px 12px 72px'}}>
                      {/* Prima breakdown */}
                      {currentPrimaEv && (
                        <div style={{marginBottom:'14px',background:'white',border:'1px solid #e9e0cc',borderRadius:'8px',overflow:'hidden'}}>
                          <div style={{background:'#C4A96B',padding:'5px 12px'}}>
                            <p style={{margin:0,fontSize:'10px',fontWeight:700,color:'white',textTransform:'uppercase',letterSpacing:'0.5px'}}>Prima del vehículo</p>
                          </div>
                          <div style={{padding:'8px 12px',display:'flex',flexDirection:'column',gap:'3px'}}>
                            {[
                              { label: 'Prima neta',          val: currentPrimaEv.prima_neta },
                              { label: 'Gastos de emisión',   val: currentPrimaEv.monto_gasto_emision },
                              ...(parseFloat(currentPrimaEv.monto_recargo||0) > 0 ? [{ label: 'Recargo fraccionamiento', val: currentPrimaEv.monto_recargo }] : []),
                              { label: 'IVA 12%',             val: currentPrimaEv.monto_iva },
                            ].map(({ label, val }) => (
                              <div key={label} style={{display:'flex',justifyContent:'space-between',fontSize:'12px'}}>
                                <span style={{color:'#64748b'}}>{label}</span>
                                <span style={{color:'#111111'}}>Q {parseFloat(val||0).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                              </div>
                            ))}
                            <div style={{borderTop:'1px solid #e9e0cc',marginTop:'3px',paddingTop:'5px',display:'flex',justifyContent:'space-between',fontSize:'13px'}}>
                              <span style={{fontWeight:700,color:'#111111'}}>Prima total</span>
                              <span style={{fontWeight:700,color:'#C4A96B'}}>Q {parseFloat(currentPrimaEv.prima_total||0).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                            </div>
                            {(parseFloat(currentPrimaEv.deducible_danios||0)>0 || parseFloat(currentPrimaEv.deducible_robo||0)>0) && (
                              <>
                                <div style={{borderTop:'1px solid #e9e0cc',marginTop:'6px',paddingTop:'4px'}}>
                                  <p style={{margin:'0 0 4px',fontSize:'10px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px'}}>Deducibles</p>
                                </div>
                                {parseFloat(currentPrimaEv.deducible_danios||0)>0 && (
                                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px'}}>
                                    <span style={{color:'#64748b'}}>Deducible daños</span>
                                    <span style={{fontWeight:600,color:'#111111'}}>{parseFloat(currentPrimaEv.deducible_danios)}%</span>
                                  </div>
                                )}
                                {parseFloat(currentPrimaEv.deducible_robo||0)>0 && (
                                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px'}}>
                                    <span style={{color:'#64748b'}}>Deducible robo</span>
                                    <span style={{fontWeight:600,color:'#111111'}}>{parseFloat(currentPrimaEv.deducible_robo)}%</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      <p style={{fontSize:'11px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',margin:'0 0 10px'}}>Historial de gestiones</p>
                      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                        {history.map((h, hi) => {
                          const tStyle = historyTipoStyle[h.em.tipo] || {icon:'•',color:'#64748b',label:h.em.tipo}
                          const estBadge = h.em.estado === 'cancelada'
                            ? {bg:'#f1f5f9',color:'#64748b',label:'Cancelada'}
                            : (polizaEstados[h.em.estado]||{bg:'#f1f5f9',color:'#64748b',label:h.em.estado})
                          const fechaRef = h.em.fecha_inicio || h.em.created_at
                          return (
                            <div key={hi} style={{display:'flex',alignItems:'center',gap:'10px',
                              opacity: h.em.estado === 'cancelada' ? 0.5 : 1}}>
                              {/* Timeline dot + line */}
                              <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
                                <div style={{width:'22px',height:'22px',borderRadius:'50%',
                                  background: h.em.tipo==='exclusion'?'#fff7ed':h.em.estado==='cancelada'?'#f1f5f9':'#f0fdf4',
                                  border:`2px solid ${tStyle.color}`,
                                  display:'flex',alignItems:'center',justifyContent:'center',
                                  fontSize:'11px'}}>
                                  {h.em.tipo === 'exclusion' ? <Minus size={10} color={tStyle.color}/> : <Plus size={10} color={tStyle.color}/>}
                                </div>
                                {hi < history.length-1 && <div style={{width:'2px',height:'12px',background:'#e2e8f0',margin:'2px 0'}}/>}
                              </div>
                              <div style={{flex:1}}>
                                <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                                  <span style={{fontSize:'12px',fontWeight:600,color:tStyle.color}}>{tStyle.label}</span>
                                  <span style={{fontSize:'12px',color:'#111111',fontWeight:500}}>{h.em.numero_emision}</span>
                                  <span style={{fontSize:'11px',padding:'1px 7px',borderRadius:'20px',background:estBadge.bg,color:estBadge.color,fontWeight:500}}>
                                    {estBadge.label}
                                  </span>
                                </div>
                                {fechaRef && <p style={{fontSize:'11px',color:'#94a3b8',margin:'1px 0 0'}}>
                                  {new Date(fechaRef+'T12:00:00').toLocaleDateString('es-GT')}
                                </p>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </div>
      )}

      {/* ─ TAB: Gestiones ─ */}
      {activeTab === 'emisiones' && isEmitida && (() => {
        // Vehicles available for new inclusion:
        // Vehicles currently active in the policy (in non-cancelled inclusion/emision)
        const vehiculosActivosSet = new Set(
          emisiones
            .filter(em => em.tipo !== 'exclusion' && em.estado !== 'cancelada')
            .flatMap(em => em.emision_vehiculos?.map(ev=>ev.vehiculos?.id)||[])
        )
        // Vehicles that have been excluded (active exclusion emitida/completado)
        const vehiculosExcluidosTabSet = new Set(
          emisiones
            .filter(em => em.tipo === 'exclusion' && (em.estado === 'emitida' || em.estado === 'completado'))
            .flatMap(em => em.emision_vehiculos?.map(ev=>ev.vehiculos?.id)||[])
        )
        // Available for new inclusion = not currently active OR already excluded
        const vehiculosEnUsoTab = new Set([...vehiculosActivosSet].filter(id => !vehiculosExcluidosTabSet.has(id)))
        const vehiculosParaInclusion = allClientVehiculos.filter(v =>
          !vehiculosEnUsoTab.has(v.id) && !otherPolizaOccupiedIds.has(v.id)
        )
        return (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid #f1f5f9'}}>
            <h3 style={{fontSize:'15px',fontWeight:600,color:'#111111',margin:0}}>Gestiones</h3>
            <button onClick={()=>{ setTipoGestion(null); setShowNuevaGestionModal(true) }}
              style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 14px',background:'#111111',color:'white',border:'none',borderRadius:'6px',fontSize:'13px',cursor:'pointer',fontWeight:600}}>
              <Plus size={13}/> Nueva gestión
            </button>
          </div>


          {/* List of ALL gestiones */}
          {loading ? <p style={{padding:'20px',color:'#64748b'}}>Cargando...</p> :
           emisiones.length===0 ? (
             <p style={{padding:'24px',color:'#94a3b8',textAlign:'center'}}>Sin gestiones registradas.</p>
           ) :
           emisiones.map(em=>{
            const eEst = polizaEstados[em.estado] || { bg:'#f1f5f9', color:'#64748b', label: em.estado }
            const tipoLabel = { emision:'Emisión principal', inclusion:'Inclusión', exclusion:'Exclusión', renovacion:'Renovación', modificacion:'Modificación' }[em.tipo] || em.tipo
            const isPrincipal = em.tipo === 'emision'
            const isLocked = em.estado === 'enviada' || em.estado === 'emitida' || em.estado === 'completado' || em.tipo === 'inclusion' || em.tipo === 'exclusion'
            return (
              <div key={em.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                {/* Row */}
                <div style={{display:'flex',alignItems:'center',padding:'14px 20px',cursor:'pointer',gap:'10px',background: isPrincipal ? '#fafbff' : 'white'}} onClick={()=>setExpandedEmision(expandedEmision===em.id?null:em.id)}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                      <p style={{fontWeight:700,color:'#111111',fontSize:'13px',margin:0}}>{em.numero_emision}</p>
                      <span style={{fontSize:'11px',padding:'2px 7px',borderRadius:'20px',fontWeight:600,
                        background: isPrincipal ? '#111111' : (em.tipo==='exclusion' ? '#fef2f2' : '#eff6ff'),
                        color: isPrincipal ? 'white' : (em.tipo==='exclusion' ? '#ef4444' : '#1d4ed8')}}>
                        {tipoLabel}
                      </span>
                      <span style={{fontSize:'11px',padding:'2px 7px',borderRadius:'20px',fontWeight:600,background:eEst.bg,color:eEst.color}}>{eEst.label}</span>
                    </div>
                    <p style={{fontSize:'12px',color:'#64748b',margin:'2px 0 0'}}>
                      {em.tipo === 'exclusion'
                        ? `Fecha exclusión: ${em.fecha_inicio ? new Date(em.fecha_inicio).toLocaleDateString('es-GT') : '—'}`
                        : `${em.fecha_inicio ? new Date(em.fecha_inicio).toLocaleDateString('es-GT') : '—'} → ${em.fecha_fin ? new Date(em.fecha_fin).toLocaleDateString('es-GT') : '—'}`
                      }{em.tipo !== 'modificacion' ? ` · ${em.emision_vehiculos?.length||0} vehículos` : ''}
                    </p>
                  </div>
                  {em.tipo !== 'modificacion' && (
                    <p style={{fontSize:'14px',fontWeight:700,color:'#C4A96B',margin:0,flexShrink:0}}>Q {parseFloat(em.prima_emision||0).toLocaleString()}</p>
                  )}

                  {/* Action buttons (stop propagation) — not shown on principal emission */}
                  {!isPrincipal && (
                    <div style={{display:'flex',gap:'6px',flexShrink:0}} onClick={e=>e.stopPropagation()}>
                      {/* Edit button — only for editable states */}
                      {(em.estado === 'solicitud' || em.estado === 'en_reproceso') && (
                        <button
                          onClick={()=>{
                            if (em.tipo === 'modificacion') {
                              setModificacionDesc(em.notas || '')
                              setEmisionForModal(em)
                              setShowModificacionModal(true)
                            } else {
                              editarEmision(em)
                            }
                          }}
                          title="Editar gestión"
                          style={{display:'flex',alignItems:'center',justifyContent:'center',width:'28px',height:'28px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'6px',cursor:'pointer',flexShrink:0}}>
                          <Edit2 size={12}/>
                        </button>
                      )}
                      {/* PDF button for solicitud / enviada / en_reproceso, or always for modificacion */}
                      {(em.tipo === 'modificacion' || em.estado === 'solicitud' || em.estado === 'enviada' || em.estado === 'en_reproceso') && (
                        <button onClick={()=>handleGestionPdf(em)}
                          title="Descargar PDF de esta gestión"
                          style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',background:'white',color:'#374151',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'11px',fontWeight:500,cursor:'pointer',whiteSpace:'nowrap'}}>
                          <Download size={11}/> PDF
                        </button>
                      )}
                      {/* Cambiar estado button */}
                      {(em.estado === 'solicitud' || em.estado === 'enviada' || em.estado === 'en_reproceso') && (
                        <button onClick={()=>{ setEmisionForModal(em); setGestionEstadoOpcion(null); setShowGestionEstadoModal(true) }}
                          style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',background:'#111111',color:'white',border:'none',borderRadius:'6px',fontSize:'11px',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
                          <RefreshCw size={10}/> Estado
                        </button>
                      )}
                    </div>
                  )}
                  {expandedEmision===em.id ? <ChevronUp size={16} color="#64748b"/> : <ChevronDown size={16} color="#64748b"/>}
                </div>

                {/* Expanded detail */}
                {expandedEmision===em.id && (
                  <div style={{padding:'12px 20px 16px',background:'#f8fafc',borderTop:'1px solid #f1f5f9'}}>
                    {/* PDF row — download only (upload happens when marking as emitida) */}
                    {em.pdf_url && (
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                        <p style={{fontSize:'12px',fontWeight:600,color:'#374151',margin:0}}>PDF de la aseguradora</p>
                        <a href={em.pdf_url} target="_blank" rel="noopener noreferrer"
                          style={{display:'flex',alignItems:'center',gap:'5px',padding:'4px 10px',background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe',borderRadius:'6px',fontSize:'11px',fontWeight:600,textDecoration:'none'}}>
                          <Download size={11}/> Descargar PDF
                        </a>
                      </div>
                    )}

                    {/* Método de pago + notas */}
                    {(em.metodo_pago || em.notas) && (
                      <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'12px',padding:'10px 12px',background:'white',borderRadius:'8px',border:'1px solid #f1f5f9'}}>
                        {em.metodo_pago && (
                          <span style={{fontSize:'12px',color:'#374151'}}>
                            <span style={{fontWeight:600,color:'#64748b'}}>Método de pago: </span>
                            {{'tarjeta':'Tarjeta asociada','deposito':'Depósito','transferencia':'Transferencia','cheque':'Cheque'}[em.metodo_pago] || em.metodo_pago}
                          </span>
                        )}
                        {em.notas && (
                          <span style={{fontSize:'12px',color:'#374151'}}>
                            <span style={{fontWeight:600,color:'#64748b'}}>Obs: </span>{em.notas}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Vehicles — hidden for modificacion */}
                    {em.tipo !== 'modificacion' && (
                      <>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                          <p style={{fontSize:'12px',fontWeight:600,color:'#374151',margin:0}}>Vehículos</p>
                          {isLocked ? (
                            <span style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',color:'#94a3b8'}}>
                              <Lock size={11}/> Bloqueado ({eEst.label})
                            </span>
                          ) : (
                            <button onClick={()=>setShowAsignarVehiculo(showAsignarVehiculo===em.id?null:em.id)}
                              style={{fontSize:'11px',padding:'3px 10px',background:'#111111',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontWeight:500}}>
                              + Agregar
                            </button>
                          )}
                        </div>
                        {em.emision_vehiculos?.length===0 && <p style={{fontSize:'13px',color:'#94a3b8',marginBottom:'8px'}}>Sin vehículos asignados</p>}
                        {em.emision_vehiculos?.map(ev=>(
                          <div key={ev.id} style={{display:'flex',gap:'8px',padding:'8px 10px',background:'white',borderRadius:'6px',border:'1px solid #f1f5f9',marginBottom:'4px',fontSize:'13px',alignItems:'center',cursor:'pointer'}}
                            onClick={()=>navigate('/vehiculos',{state:{openVehiculoId:ev.vehiculos?.id,fromPolizaId:poliza.id}})}>
                            <Car size={14} color="#C4A96B"/>
                            <span style={{fontWeight:500,flex:1}}>{ev.vehiculos?.marca} {ev.vehiculos?.modelo} {ev.vehiculos?.anio}</span>
                            <span style={{color:'#64748b'}}>Placa: {fp(ev.vehiculos)}</span>
                            {!isLocked && (
                              <button onClick={e=>{e.stopPropagation();quitarVehiculo(ev.vehiculos?.id, ev.id, em.id)}}
                                style={{padding:'2px 8px',background:'#fef2f2',color:'#ef4444',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'11px'}}>Quitar</button>
                            )}
                          </div>
                        ))}
                        {!isLocked && showAsignarVehiculo===em.id && (
                          <div style={{marginTop:'8px',padding:'10px',background:'white',borderRadius:'8px',border:'1px solid #e2e8f0'}}>
                            <input value={vehiculoSearch} onChange={e=>setVehiculoSearch(e.target.value)} placeholder="Buscar vehículo..."
                              style={{width:'100%',padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'12px',marginBottom:'8px',background:'white',color:'#1e293b',boxSizing:'border-box'}}/>
                            {vehiculosParaInclusion.filter(v=>(v.marca+' '+v.modelo+' '+fp(v)).toLowerCase().includes(vehiculoSearch.toLowerCase())).length===0
                              ? <p style={{fontSize:'12px',color:'#94a3b8',textAlign:'center',padding:'8px'}}>No hay vehículos disponibles</p>
                              : vehiculosParaInclusion.filter(v=>(v.marca+' '+v.modelo+' '+fp(v)).toLowerCase().includes(vehiculoSearch.toLowerCase())).map(v=>(
                              <div key={v.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'6px',border:'1px solid #f1f5f9',marginBottom:'4px',background:'#f8fafc'}}>
                                <Car size={13} color="#C4A96B"/>
                                <span style={{flex:1,fontSize:'12px',fontWeight:500}}>{v.marca} {v.modelo} {v.anio} — {fp(v)}</span>
                                <button onClick={()=>asignarVehiculo(v.id, em.id)}
                                  style={{padding:'3px 10px',background:'#111111',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'11px',fontWeight:500}}>Asignar</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        )
      })()}


      {/* ─ TAB: Pagos ─ */}
      {activeTab === 'pagos' && isEmitida && (
        <div>

          {/* ── Gestión modal ── */}
          {showReqGestion && reqGestionTarget && (() => {
            const r = reqGestionTarget
            const isPagado = r.estado === 'pagado'
            const emNum = r.emisiones?.numero_emision
            const estColor = r.estado==='pagado' ? {bg:'#dcfce7',color:'#15803d'} : r.estado==='vencido' ? {bg:'#fef2f2',color:'#ef4444'} : {bg:'#fef9c3',color:'#a16207'}
            return (
              <>
                <div onClick={closeReqGestion} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:400}}/>
                <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
                  background:'white',borderRadius:'16px',padding:'0',width:'90%',maxWidth:'460px',
                  zIndex:401,boxShadow:'0 20px 60px rgba(0,0,0,0.25)',maxHeight:'90vh',overflowY:'auto'}}>

                  {/* Header */}
                  <div style={{padding:'20px 24px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                        <span style={{fontSize:'15px',fontWeight:700,color:'#111111'}}>{r.codigo}</span>
                        <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:estColor.bg,color:estColor.color,fontWeight:600,textTransform:'capitalize'}}>{r.estado}</span>
                      </div>
                      <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
                        <span style={{fontSize:'12px',color:'#64748b'}}>Cuota {r.numero_cuota}/{r.total_cuotas}</span>
                        {emNum && <span style={{fontSize:'12px',color:'#7c3aed',fontWeight:500}}>{emNum}</span>}
                        <span style={{fontSize:'12px',color:'#64748b'}}>Vence: {new Date(r.fecha_vencimiento+'T12:00:00').toLocaleDateString('es-GT')}</span>
                        <span style={{fontSize:'13px',fontWeight:700,color:'#111111'}}>Q {parseFloat(r.monto||0).toLocaleString()}</span>
                      </div>
                    </div>
                    <button onClick={closeReqGestion} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8',flexShrink:0}}><X size={18}/></button>
                  </div>

                  <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:'20px'}}>

                    {/* ── Desglose de prima ── */}
                    {parseFloat(r.prima_neta) > 0 && (() => {
                      const pn  = parseFloat(r.prima_neta             || 0)
                      const ge  = parseFloat(r.monto_gasto_emision    || 0)
                      const rec = parseFloat(r.monto_recargo          || 0)
                      const iva = parseFloat(r.monto_iva              || 0)
                      const tot = parseFloat(r.monto                  || 0)
                      const com = parseFloat(r.monto_comision         || 0)
                      const pct = r.porcentaje_comision
                      const fmt = v => `Q ${parseFloat(v).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2})}`
                      const DRow = ({label, value, bold, gold, border}) => (
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',
                          padding: border ? '7px 0 0' : '3px 0',
                          marginTop: border ? '4px' : 0,
                          borderTop: border ? '1px solid #e2e8f0' : 'none'}}>
                          <span style={{fontSize:'12px',color: gold?'#C4A96B': bold?'#111111':'#64748b',fontWeight:bold||gold?600:400}}>{label}</span>
                          <span style={{fontSize:'12px',color: gold?'#C4A96B': bold?'#111111':'#374151',fontWeight:bold||gold?700:400,fontVariantNumeric:'tabular-nums'}}>{value}</span>
                        </div>
                      )
                      return (
                        <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'10px',padding:'12px 14px'}}>
                          <p style={{fontSize:'10px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',margin:'0 0 8px'}}>Desglose</p>
                          <DRow label='Prima neta' value={fmt(pn)}/>
                          {ge  > 0 && <DRow label={`+ Gastos de emisión`} value={fmt(ge)}/>}
                          {rec > 0 && <DRow label={`+ Recargo fracc.`}    value={fmt(rec)}/>}
                          {iva > 0 && <DRow label={`+ IVA 12%`}           value={fmt(iva)}/>}
                          <DRow label='Total cuota' value={fmt(tot)} bold border/>
                          {com > 0 && <DRow label={`Comisión${pct ? ` (${pct}%)` : ''}`} value={fmt(com)} gold/>}
                        </div>
                      )
                    })()}

                    {isPagado ? (
                      /* ── PAID: show info + comprobante ── */
                      <>
                        <div style={{background:'#f0fdf4',borderRadius:'10px',padding:'14px 16px'}}>
                          <p style={{fontSize:'12px',fontWeight:600,color:'#15803d',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.4px'}}>Pago registrado</p>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                            <div>
                              <p style={{fontSize:'11px',color:'#64748b',margin:0}}>Fecha de pago</p>
                              <p style={{fontSize:'13px',fontWeight:600,color:'#111111',margin:'2px 0 0'}}>{r.fecha_pago ? new Date(r.fecha_pago+'T12:00:00').toLocaleDateString('es-GT') : '—'}</p>
                            </div>
                            <div>
                              <p style={{fontSize:'11px',color:'#64748b',margin:0}}>Monto</p>
                              <p style={{fontSize:'13px',fontWeight:600,color:'#111111',margin:'2px 0 0'}}>Q {parseFloat(r.monto||0).toLocaleString()}</p>
                            </div>
                          </div>
                          {r.notas && <p style={{fontSize:'12px',color:'#374151',marginTop:'8px',marginBottom:0}}>Nota: {r.notas}</p>}
                        </div>

                        <div>
                          <p style={{fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'10px'}}>Comprobante de pago</p>
                          {r.comprobante_url ? (
                            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',background:'#f8fafc',borderRadius:'8px',border:'1px solid #e2e8f0'}}>
                              <FileText size={16} color='#C4A96B'/>
                              <span style={{flex:1,fontSize:'13px',color:'#374151'}}>Comprobante adjunto</span>
                              <a href={r.comprobante_url} target='_blank' rel='noreferrer'
                                style={{fontSize:'12px',color:'#1d4ed8',fontWeight:500,textDecoration:'none'}}>Ver</a>
                            </div>
                          ) : (
                            <p style={{fontSize:'12px',color:'#94a3b8',marginBottom:'8px'}}>Sin comprobante adjunto</p>
                          )}
                          <div style={{marginTop:'10px'}}>
                            <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                              {r.comprobante_url ? 'Reemplazar comprobante' : 'Adjuntar comprobante'}
                            </label>
                            <input type='file' accept='.pdf,.jpg,.jpeg,.png'
                              onChange={e=>setReqComprobanteFile(e.target.files[0]||null)}
                              style={{fontSize:'12px',width:'100%'}}/>
                            {reqComprobanteFile && (
                              <button onClick={subirComprobante}
                                style={{marginTop:'8px',padding:'7px 14px',background:'#111111',color:'white',border:'none',borderRadius:'6px',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>
                                Guardar comprobante
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      /* ── UNPAID: mark paid + edit + delete ── */
                      <>
                        <div>
                          <p style={{fontSize:'13px',fontWeight:700,color:'#374151',marginBottom:'12px'}}>Registrar pago</p>
                          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                            <div>
                              <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>Fecha de pago *</label>
                              <input type='date' value={reqGestionFechaPago}
                                onChange={e=>setReqGestionFechaPago(e.target.value)}
                                style={inputStyle}/>
                            </div>
                            <div>
                              <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>
                                Comprobante <span style={{fontWeight:400,color:'#94a3b8'}}>(opcional)</span>
                              </label>
                              <input type='file' accept='.pdf,.jpg,.jpeg,.png'
                                onChange={e=>setReqComprobanteFile(e.target.files[0]||null)}
                                style={{fontSize:'12px',width:'100%'}}/>
                              {reqComprobanteFile && <p style={{fontSize:'11px',color:'#64748b',margin:'3px 0 0'}}>{reqComprobanteFile.name}</p>}
                            </div>
                            <div>
                              <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'4px'}}>
                                Notas <span style={{fontWeight:400,color:'#94a3b8'}}>(opcional)</span>
                              </label>
                              <input value={reqGestionNotas} onChange={e=>setReqGestionNotas(e.target.value)}
                                placeholder='Ej: Pagado por transferencia...' style={inputStyle}/>
                            </div>
                            <button onClick={marcarPagado}
                              style={{padding:'11px',background:'#15803d',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
                              Confirmar pago
                            </button>
                          </div>
                        </div>

                        <div style={{borderTop:'1px solid #f1f5f9',paddingTop:'16px',display:'flex',gap:'8px'}}>
                          <button onClick={()=>{ closeReqGestion(); setEditingReq(r); setReqForm({monto:r.monto,fecha_vencimiento:r.fecha_vencimiento,total_cuotas:1,emision_id:r.emision_id||'',numero_req_matriz:''}); setShowReqModal(true) }}
                            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',padding:'9px',background:'white',color:'#374151',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'13px',cursor:'pointer'}}>
                            <Edit2 size={13}/> Editar
                          </button>
                          <button onClick={()=>eliminarReq(r.id)}
                            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',padding:'9px',background:'#fef2f2',color:'#ef4444',border:'1px solid #fecaca',borderRadius:'8px',fontSize:'13px',cursor:'pointer'}}>
                            <Trash2 size={13}/> Eliminar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )
          })()}

          {/* Req modal */}
          {showReqModal && (
            <>
              <div onClick={()=>{ setShowReqModal(false); setEditingReq(null); setReqForm(emptyReq); setReqAjustar(false) }}
                style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300}}/>
              <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
                background:'white',borderRadius:'16px',padding:'28px',width:'90%',maxWidth:'480px',
                zIndex:301,boxShadow:'0 20px 60px rgba(0,0,0,0.25)',maxHeight:'90vh',overflowY:'auto'}}>
                {/* Header */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
                  <div>
                    <h2 style={{fontSize:'17px',fontWeight:700,color:'#111111',margin:0}}>
                      {editingReq ? 'Editar requerimiento' : 'Nuevo requerimiento de pago'}
                    </h2>
                    <p style={{fontSize:'12px',color:'#64748b',margin:'3px 0 0'}}>Póliza: {poliza.numero_poliza}</p>
                  </div>
                  <button onClick={()=>{ setShowReqModal(false); setEditingReq(null); setReqForm(emptyReq); setReqAjustar(false) }}
                    style={{background:'none',border:'none',cursor:'pointer',padding:'4px',color:'#94a3b8'}}>
                    <X size={18}/>
                  </button>
                </div>

                <form onSubmit={handleReqSubmit}>
                  <div style={{display:'flex',flexDirection:'column',gap:'14px',marginBottom:'20px'}}>
                    {/* Emisión selector — only on create */}
                    {!editingReq && (
                      <div>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                          Emisión *
                        </label>
                        <select required value={reqForm.emision_id}
                          onChange={e => {
                            const emId = e.target.value
                            const emSel = emisiones.find(em => em.id === emId)
                            const cuotas = emSel?.numero_cuotas || poliza.numero_cuotas || 1
                            const montoPorCuota = emSel ? String(Math.round(parseFloat(emSel.prima_emision || 0) / cuotas * 100) / 100) : ''
                            setReqForm({ ...reqForm, emision_id: emId, total_cuotas: cuotas, monto: montoPorCuota })
                            setReqAjustar(false)
                          }}
                          style={{...inputStyle,background:'white'}}>
                          <option value=''>— Seleccionar emisión —</option>
                          {emisiones
                            .filter(em => (em.tipo === 'emision' || em.tipo === 'inclusion') && em.estado === 'emitida')
                            .map(em=>{
                              const tipoLabel = {emision:'Emisión principal',inclusion:'Inclusión'}[em.tipo]||em.tipo
                              return <option key={em.id} value={em.id}>{em.numero_emision} · {tipoLabel} · Emitida</option>
                            })}
                        </select>
                      </div>
                    )}

                    {/* Número req. matriz — only on create */}
                    {!editingReq && (
                      <div>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                          No. de requerimiento matriz * <span style={{fontWeight:400,color:'#94a3b8'}}>(asignado por aseguradora)</span>
                        </label>
                        <input type='text' required
                          value={reqForm.numero_req_matriz}
                          onChange={e=>setReqForm({...reqForm,numero_req_matriz:e.target.value})}
                          placeholder='Ej: 10001' style={inputStyle}/>
                        {reqForm.numero_req_matriz && parseInt(reqForm.total_cuotas) > 1 && !isNaN(parseInt(reqForm.numero_req_matriz)) && (
                          <p style={{fontSize:'11px',color:'#64748b',margin:'4px 0 0'}}>
                            Los reqs. se numerarán: {reqForm.numero_req_matriz} → {String(parseInt(reqForm.numero_req_matriz) + parseInt(reqForm.total_cuotas) - 1)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Prima summary card (new) or manual inputs (edit / ajustar) */}
                    {!editingReq && reqForm.emision_id && !reqAjustar ? (() => {
                      const emSel = emisiones.find(em => em.id === reqForm.emision_id)
                      if (!emSel) return null
                      const cuotas = emSel.numero_cuotas || poliza.numero_cuotas || 1
                      const fmtQ2 = v => parseFloat(v||0).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2})
                      const montoCuota = Math.round(parseFloat(emSel.prima_emision||0) / cuotas * 100) / 100
                      const r2c = n => Math.round(n * 100) / 100
                      const pnCuotaReq = emSel.prima_neta > 0 ? r2c(emSel.prima_neta / cuotas) : 0
                      const comCuotaReq = r2c(pnCuotaReq * polizaComPct / 100)
                      return (
                        <div style={{border:'1px solid #e9e0cc',borderRadius:'8px',overflow:'hidden'}}>
                          <div style={{background:'#C4A96B',padding:'6px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                            <p style={{margin:0,fontSize:'11px',fontWeight:700,color:'white',textTransform:'uppercase',letterSpacing:'0.5px'}}>Desglose de prima</p>
                            <button type='button' onClick={()=>setReqAjustar(true)}
                              style={{background:'rgba(255,255,255,0.25)',border:'1px solid rgba(255,255,255,0.5)',borderRadius:'5px',
                                color:'white',fontSize:'11px',fontWeight:600,padding:'2px 9px',cursor:'pointer'}}>
                              Ajustar
                            </button>
                          </div>
                          <div style={{background:'white',padding:'10px 14px',display:'flex',flexDirection:'column',gap:'3px'}}>
                            {[
                              { label:'Prima neta',            val: emSel.prima_neta },
                              { label:'Gastos de emisión',     val: emSel.monto_gasto_emision },
                              ...(parseFloat(emSel.monto_recargo||0)>0?[{ label:'Recargo fraccionamiento', val: emSel.monto_recargo }]:[]),
                              { label:'IVA 12%',               val: emSel.monto_iva },
                            ].map(({label,val})=>(
                              <div key={label} style={{display:'flex',justifyContent:'space-between',fontSize:'12px'}}>
                                <span style={{color:'#64748b'}}>{label}</span>
                                <span style={{color:'#111111'}}>Q {fmtQ2(val)}</span>
                              </div>
                            ))}
                            <div style={{borderTop:'1px solid #e9e0cc',marginTop:'3px',paddingTop:'6px',display:'flex',justifyContent:'space-between',fontSize:'13px'}}>
                              <span style={{fontWeight:700,color:'#111111'}}>Prima total</span>
                              <span style={{fontWeight:700,color:'#C4A96B'}}>Q {fmtQ2(emSel.prima_emision)}</span>
                            </div>
                            <div style={{borderTop:'1px solid #f1f5f9',marginTop:'4px',paddingTop:'6px',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'13px',background:'#f8fafc',margin:'4px -14px -10px',padding:'8px 14px'}}>
                              <span style={{color:'#374151',fontWeight:500}}>{cuotas} cuota{cuotas>1?'s':''}</span>
                              <span style={{fontWeight:700,color:'#111111'}}>Q {fmtQ2(montoCuota)} / cuota</span>
                            </div>
                          </div>
                          {polizaComPct > 0 && emSel.prima_neta > 0 && (
                            <div style={{background:'#fffbeb',borderTop:'1px solid #fde68a',padding:'6px 14px'}}>
                              <p style={{margin:0,fontSize:'11px',color:'#92400e'}}>
                                Comisión estimada por cuota: Q {comCuotaReq.toLocaleString('es-GT',{minimumFractionDigits:2})} ({polizaComPct}%)
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })() : (editingReq || reqAjustar) ? (
                      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                        {reqAjustar && (
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:'6px',padding:'7px 12px'}}>
                            <p style={{margin:0,fontSize:'12px',color:'#9a3412',fontWeight:500}}>Modo personalizado activo</p>
                            <button type='button' onClick={()=>{
                              const emSel = emisiones.find(em => em.id === reqForm.emision_id)
                              if (emSel) {
                                const cuotas = emSel.numero_cuotas || poliza.numero_cuotas || 1
                                const monto = String(Math.round(parseFloat(emSel.prima_emision||0)/cuotas*100)/100)
                                setReqForm(prev=>({...prev,total_cuotas:cuotas,monto}))
                              }
                              setReqAjustar(false)
                            }} style={{background:'none',border:'none',fontSize:'12px',color:'#9a3412',cursor:'pointer',fontWeight:600,padding:0}}>
                              ← Usar valores de emisión
                            </button>
                          </div>
                        )}
                        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'12px'}}>
                          <div>
                            <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                              Monto por cuota (Q) *
                            </label>
                            <input type='number' step='0.01' min='0.01' required
                              value={reqForm.monto}
                              onChange={e=>setReqForm({...reqForm,monto:e.target.value})}
                              placeholder='0.00' style={inputStyle}/>
                          </div>
                          {!editingReq && (
                            <div>
                              <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                                Cantidad de cuotas *
                              </label>
                              <input type='number' min='1' max='60' required
                                value={reqForm.total_cuotas}
                                onChange={e=>setReqForm({...reqForm,total_cuotas:e.target.value})}
                                style={inputStyle}/>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                        {editingReq ? 'Fecha de vencimiento *' : 'Fecha primer vencimiento *'}
                      </label>
                      <input type='date' required
                        value={reqForm.fecha_vencimiento}
                        onChange={e=>setReqForm({...reqForm,fecha_vencimiento:e.target.value})}
                        style={inputStyle}/>
                    </div>
                  </div>

                  <div style={{display:'flex',gap:'8px'}}>
                    <button type='submit'
                      style={{flex:1,padding:'11px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
                      {editingReq ? 'Guardar cambios' : 'Generar requerimientos'}
                    </button>
                    <button type='button' onClick={()=>{ setShowReqModal(false); setEditingReq(null); setReqForm(emptyReq); setReqAjustar(false) }}
                      style={{padding:'11px 20px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* ── Summary cards ── */}
          <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)',gap:'12px',marginBottom:'16px'}}>
            {[
              ['Pagado',   'Q '+totalPagado.toLocaleString('es-GT'),   '#22c55e', reqs.filter(r=>r.estado==='pagado').length],
              ['Pendiente','Q '+totalPendiente.toLocaleString('es-GT'), '#f59e0b', reqs.filter(r=>r.estado==='pendiente').length],
              ['Vencido',  'Q '+totalVencido.toLocaleString('es-GT'),   '#ef4444', reqs.filter(r=>r.estado==='vencido').length],
              ['Total',    reqs.length+' reqs',                         '#C4A96B', null],
            ].map(([label,val,color,count])=>(
              <div key={label} style={{background:'white',borderRadius:'10px',padding:'14px 16px',border:'1px solid #e2e8f0',borderLeft:`4px solid ${color}`}}>
                <p style={{fontSize:'11px',color:'#64748b',margin:0,textTransform:'uppercase',letterSpacing:'0.4px'}}>{label}</p>
                <p style={{fontSize:'17px',fontWeight:700,color,margin:'4px 0 0'}}>{val}</p>
                {count !== null && <p style={{fontSize:'11px',color:'#94a3b8',margin:'2px 0 0'}}>{count} requerimiento(s)</p>}
              </div>
            ))}
          </div>

          {/* ── Header row ── */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
            <h3 style={{fontSize:'15px',fontWeight:600,color:'#111111',margin:0}}>Requerimientos de pago</h3>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={handleEstadoCuenta}
                style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 14px',background:'#C4A96B',color:'#111111',border:'none',borderRadius:'6px',fontSize:'13px',cursor:'pointer',fontWeight:600}}>
                Estado de cuenta
              </button>
              <button onClick={()=>{ setReqForm(emptyReq); setEditingReq(null); setReqAjustar(false); setShowReqModal(true) }}
                style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 14px',background:'#111111',color:'white',border:'none',borderRadius:'6px',fontSize:'13px',cursor:'pointer',fontWeight:600}}>
                <Plus size={13}/> Nuevo req.
              </button>
            </div>
          </div>

          {/* ── Grouped by emission ── */}
          {reqs.length === 0
            ? <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',padding:'32px',textAlign:'center'}}>
                <p style={{color:'#94a3b8',margin:0}}>Sin requerimientos de pago</p>
              </div>
            : (() => {
                // Group reqs by emision_id
                const groups = {}
                reqs.forEach(r => {
                  const key = r.emision_id || 'sin-emision'
                  if (!groups[key]) groups[key] = { emision: r.emisiones, reqs: [] }
                  groups[key].reqs.push(r)
                })
                return Object.entries(groups).map(([emisionId, grp]) => {
                  const isExpanded = expandedReqGroups.has(emisionId)
                  const toggleGroup = () => setExpandedReqGroups(prev => {
                    const s = new Set(prev)
                    s.has(emisionId) ? s.delete(emisionId) : s.add(emisionId)
                    return s
                  })
                  const gPagado   = grp.reqs.filter(r=>r.estado==='pagado').length
                  const gVencido  = grp.reqs.filter(r=>r.estado==='vencido').length
                  const gTotal    = grp.reqs.length
                  const gMontoPag = grp.reqs.filter(r=>r.estado==='pagado').reduce((s,r)=>s+parseFloat(r.monto||0),0)
                  const gMontoPend= grp.reqs.filter(r=>r.estado!=='pagado').reduce((s,r)=>s+parseFloat(r.monto||0),0)
                  const pct = Math.round((gPagado/gTotal)*100)
                  const barColor = gVencido > 0 ? '#ef4444' : gPagado === gTotal ? '#22c55e' : '#f59e0b'
                  const emTipo = grp.emision ? ({emision:'Emisión principal',inclusion:'Inclusión',exclusion:'Exclusión',renovacion:'Renovación',modificacion:'Modificación'}[grp.emision.tipo]||grp.emision.tipo) : '—'
                  const emEst  = grp.emision ? (polizaEstados[grp.emision.estado]||{bg:'#f1f5f9',color:'#64748b',label:grp.emision.estado}) : null

                  return (
                    <div key={emisionId} style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'10px'}}>
                      {/* Group header */}
                      <div onClick={toggleGroup} style={{padding:'14px 20px',cursor:'pointer',display:'flex',alignItems:'center',gap:'10px',
                        borderBottom: isExpanded ? '1px solid #f1f5f9' : 'none',
                        background: isExpanded ? 'white' : '#fafafa'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'6px'}}>
                            <span style={{fontSize:'13px',fontWeight:700,color:'#111111'}}>{grp.emision?.numero_emision || 'Sin emisión'}</span>
                            <span style={{fontSize:'11px',color:'#64748b'}}>{emTipo}</span>
                            {emEst && <span style={{fontSize:'11px',padding:'1px 7px',borderRadius:'20px',background:emEst.bg,color:emEst.color,fontWeight:600}}>{emEst.label}</span>}
                            {gVencido > 0 && <span style={{fontSize:'11px',padding:'1px 7px',borderRadius:'20px',background:'#fef2f2',color:'#ef4444',fontWeight:600}}>{gVencido} vencido(s)</span>}
                          </div>
                          {/* Progress bar */}
                          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <div style={{flex:1,height:'5px',background:'#f1f5f9',borderRadius:'99px',overflow:'hidden'}}>
                              <div style={{width:`${pct}%`,height:'100%',background:barColor,borderRadius:'99px',transition:'width 0.3s'}}/>
                            </div>
                            <span style={{fontSize:'11px',color:'#64748b',flexShrink:0,whiteSpace:'nowrap'}}>{gPagado}/{gTotal} pagados</span>
                          </div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <p style={{fontSize:'12px',color:'#22c55e',fontWeight:600,margin:0}}>Q {gMontoPag.toLocaleString('es-GT')} pag.</p>
                          {gMontoPend > 0 && <p style={{fontSize:'12px',color:'#f59e0b',fontWeight:600,margin:'2px 0 0'}}>Q {gMontoPend.toLocaleString('es-GT')} pend.</p>}
                        </div>
                        {isExpanded ? <ChevronUp size={15} color='#94a3b8' style={{flexShrink:0}}/> : <ChevronDown size={15} color='#94a3b8' style={{flexShrink:0}}/>}
                      </div>

                      {/* Reqs list */}
                      {isExpanded && grp.reqs.map((r, ri) => {
                        const estColor = r.estado==='pagado' ? {bg:'#dcfce7',color:'#15803d'} : r.estado==='vencido' ? {bg:'#fef2f2',color:'#ef4444'} : {bg:'#fef9c3',color:'#a16207'}
                        return (
                          <div key={r.id} onClick={()=>{ setReqGestionTarget(r); setReqGestionFechaPago(''); setReqGestionNotas(r.notas||''); setReqComprobanteFile(null); setShowReqGestion(true) }}
                            style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 20px',
                              borderBottom: ri < grp.reqs.length-1 ? '1px solid #f8fafc' : 'none',
                              cursor:'pointer', background: r.estado==='vencido' ? '#fff8f8' : 'white'}}
                            onMouseEnter={e=>e.currentTarget.style.background=r.estado==='vencido'?'#fef2f2':'#f8fafc'}
                            onMouseLeave={e=>e.currentTarget.style.background=r.estado==='vencido'?'#fff8f8':'white'}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                                <span style={{fontSize:'13px',fontWeight:600,color:'#111111'}}>{r.codigo}</span>
                                <span style={{fontSize:'11px',color:'#94a3b8'}}>cuota {r.numero_cuota}/{r.total_cuotas}</span>
                                {r.comprobante_url && <span title='Tiene comprobante' style={{fontSize:'10px',padding:'1px 5px',borderRadius:'10px',background:'#dbeafe',color:'#1d4ed8',fontWeight:600}}>REC</span>}
                              </div>
                              <p style={{fontSize:'12px',color:'#64748b',margin:'2px 0 0'}}>
                                Vence: {new Date(r.fecha_vencimiento+'T12:00:00').toLocaleDateString('es-GT')}
                                {r.fecha_pago && <span style={{color:'#22c55e'}}> · Pagado: {new Date(r.fecha_pago+'T12:00:00').toLocaleDateString('es-GT')}</span>}
                              </p>
                            </div>
                            <span style={{fontSize:'14px',fontWeight:700,color:'#111111',flexShrink:0}}>Q {parseFloat(r.monto||0).toLocaleString()}</span>
                            <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',flexShrink:0,
                              background:estColor.bg,color:estColor.color,fontWeight:500,textTransform:'capitalize',minWidth:'60px',textAlign:'center'}}>
                              {r.estado}
                            </span>
                            <ChevronRight size={14} color='#cbd5e1' style={{flexShrink:0}}/>
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              })()
          }
        </div>
      )}

      {/* ─ TAB: Tareas ─ */}
      {activeTab === 'tareas' && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          {/* Header */}
          <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'10px'}}>
            <div>
              <h3 style={{fontSize:'15px',fontWeight:600,color:'#111111',margin:0}}>Tareas</h3>
              <p style={{fontSize:'12px',color:'#64748b',margin:'2px 0 0'}}>{tareas.filter(t=>t.estado==='pendiente').length} pendientes · {tareas.length} total</p>
            </div>
            <button onClick={()=>setShowNuevaTareaModal(true)}
              style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 14px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',flexShrink:0}}>
              + Nueva tarea
            </button>
          </div>

          {/* List */}
          {tareas.length===0
            ? <p style={{padding:'32px',color:'#94a3b8',textAlign:'center',fontSize:'14px'}}>Sin tareas — creá la primera</p>
            : tareas.map((t,i)=>{
                const vencida = t.estado==='pendiente' && t.fecha_vencimiento && new Date(t.fecha_vencimiento+'T12:00:00') < new Date()
                return (
                  <div key={t.id} onClick={()=>setTareaModal(t)}
                    style={{display:'flex',alignItems:'center',gap:'12px',padding:'13px 20px',borderBottom:i<tareas.length-1?'1px solid #f1f5f9':'none',cursor:'pointer',opacity:t.estado==='completada'?0.6:1,background:vencida?'#fff8f8':'white',transition:'background 0.12s'}}
                    onMouseEnter={e=>e.currentTarget.style.background=vencida?'#fff0f0':'#f8fafc'}
                    onMouseLeave={e=>e.currentTarget.style.background=vencida?'#fff8f8':'white'}>
                    {/* Estado indicator */}
                    <div style={{width:'20px',height:'20px',borderRadius:'5px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:t.estado==='completada'?'#22c55e':'white',border:'2px solid '+(t.estado==='completada'?'#22c55e':vencida?'#ef4444':'#e2e8f0')}}>
                      {t.estado==='completada' && <span style={{color:'white',fontSize:'11px',fontWeight:700}}>✓</span>}
                    </div>
                    {/* Info */}
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:'13px',fontWeight:600,color:'#111111',margin:0,textDecoration:t.estado==='completada'?'line-through':'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {t.titulo}
                      </p>
                      <div style={{display:'flex',gap:'8px',alignItems:'center',marginTop:'3px',flexWrap:'wrap'}}>
                        {t.asignado_user && <span style={{fontSize:'11px',color:'#64748b'}}>👤 {t.asignado_user.nombre||'Sin nombre'}</span>}
                        {t.fecha_vencimiento && <span style={{fontSize:'11px',color:vencida?'#ef4444':'#64748b',fontWeight:vencida?600:400}}>📅 {new Date(t.fecha_vencimiento+'T12:00:00').toLocaleDateString('es-GT',{day:'numeric',month:'short'})}{vencida?' · Vencida':''}</span>}
                      </div>
                    </div>
                    {/* Type badge */}
                    <span style={{fontSize:'10px',padding:'2px 7px',borderRadius:'20px',background:t.tipo==='automatica'?'#dbeafe':'#f0fdf4',color:t.tipo==='automatica'?'#1d4ed8':'#15803d',flexShrink:0}}>
                      {t.tipo==='automatica'?'Auto':'Manual'}
                    </span>
                  </div>
                )
              })
          }
        </div>
      )}

      {/* ── Tarea detail / edit modal ── */}
      {tareaModal && (
        <TareaDetailModal
          tarea={tareaModal}
          usuarios={usuariosPoliza}
          onClose={()=>setTareaModal(null)}
          onSaved={()=>{ setTareaModal(null); fetchData() }}
        />
      )}

      {/* ── Nueva tarea en póliza modal ── */}
      {showNuevaTareaModal && (
        <NuevaTareaPolizaModal
          polizaId={poliza.id}
          usuarios={usuariosPoliza}
          onClose={()=>setShowNuevaTareaModal(false)}
          onSaved={()=>{ setShowNuevaTareaModal(false); fetchData() }}
        />
      )}

      {/* ─ Tab: Reclamos ─ */}
      {activeTab === 'reclamos' && (
        <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <ReclamosMiniList
            reclamos={reclamosPoliza}
            loading={loadingReclamos}
            sinPolizaVigente={poliza.estado !== 'emitida'}
            onNuevo={poliza.estado === 'emitida' ? () => setShowReclamoModal(true) : null}
          />
        </div>
      )}

      {showReclamoModal && (
        <ReclamoModal
          context={{
            tipo: 'poliza',
            polizaId: poliza.id,
            polizaData: poliza,
            clienteId: poliza.cliente_id,
            clienteData: poliza.clientes,
          }}
          onClose={() => setShowReclamoModal(false)}
          onSaved={(r) => { setShowReclamoModal(false); fetchReclamos(); navigate('/reclamos', { state: { openReclamoId: r.id, fromPolizaId: poliza.id } }) }}
        />
      )}

      {/* ─ Tab: Documentos ─ */}
      {activeTab === 'documentos' && (() => {
        // Collect system-generated PDFs
        const systemPdfs = []
        if (poliza.poliza_pdf_url) systemPdfs.push({ label: 'Póliza emitida', url: poliza.poliza_pdf_url, tipo: 'poliza' })
        emisiones.forEach(em => {
          if (em.pdf_url) systemPdfs.push({
            label: `${emisionTipos[em.tipo] || em.tipo} · ${em.numero_emision || ''}`.trim(),
            url: em.pdf_url, tipo: 'emision',
          })
        })
        return (
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            {/* PDFs del sistema */}
            <div style={{background:'white',borderRadius:'12px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:'8px'}}>
                <FileText size={16} color='#C4A96B'/>
                <h3 style={{fontSize:'15px',fontWeight:600,color:'#111111',margin:0}}>PDFs generados</h3>
                <span style={{marginLeft:'auto',background:'#f1f5f9',color:'#64748b',fontSize:'12px',padding:'2px 8px',borderRadius:'20px'}}>{systemPdfs.length}</span>
              </div>
              {systemPdfs.length === 0 ? (
                <div style={{padding:'32px',textAlign:'center'}}>
                  <FileText size={26} color='#cbd5e1' style={{marginBottom:'8px'}}/>
                  <p style={{color:'#94a3b8',margin:0,fontSize:'13px'}}>No hay PDFs generados aún</p>
                </div>
              ) : systemPdfs.map((pdf, i) => (
                <div key={i} style={{display:'flex',alignItems:'center',padding:'12px 20px',borderBottom:i<systemPdfs.length-1?'1px solid #f1f5f9':'none'}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'8px',background:'#fef2f2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginRight:'12px'}}>
                    <FileText size={16} color='#ef4444'/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontWeight:600,color:'#111111',fontSize:'13px',margin:0}}>{pdf.label}</p>
                    <p style={{fontSize:'11px',color:'#94a3b8',margin:'2px 0 0'}}>PDF · Generado por el sistema</p>
                  </div>
                  <a href={pdf.url} target="_blank" rel="noopener noreferrer"
                    style={{display:'flex',alignItems:'center',gap:'5px',padding:'6px 12px',background:'#f1f5f9',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'12px',color:'#475569',fontWeight:500,textDecoration:'none'}}>
                    <ExternalLink size={13}/> Abrir
                  </a>
                </div>
              ))}
            </div>

            {/* Documentos adjuntos */}
            <div
              style={{background:isDraggingDoc?'#eff6ff':'white',borderRadius:'12px',border:`${isDraggingDoc?'2px dashed #3b82f6':'1px solid #e2e8f0'}`,overflow:'hidden',transition:'all 0.15s'}}
              onDragOver={e=>{e.preventDefault();setIsDraggingDoc(true)}}
              onDragEnter={e=>{e.preventDefault();setIsDraggingDoc(true)}}
              onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setIsDraggingDoc(false)}}
              onDrop={handleDocDrop}
            >
              <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:'8px'}}>
                <Paperclip size={16} color='#C4A96B'/>
                <h3 style={{fontSize:'15px',fontWeight:600,color:'#111111',margin:0}}>Documentos adjuntos</h3>
                <span style={{marginLeft:'auto',background:'#f1f5f9',color:'#64748b',fontSize:'12px',padding:'2px 8px',borderRadius:'20px'}}>{documentos.length}</span>
                <input ref={docFileInputRef} type="file" style={{display:'none'}} onChange={handleDocUpload}/>
                <button onClick={()=>docFileInputRef.current?.click()} disabled={uploadingDoc}
                  style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 14px',background:'#111111',color:'white',border:'none',borderRadius:'7px',fontSize:'13px',fontWeight:600,cursor:uploadingDoc?'not-allowed':'pointer',opacity:uploadingDoc?0.6:1}}>
                  <Paperclip size={13}/>{uploadingDoc ? 'Subiendo...' : 'Adjuntar'}
                </button>
              </div>
              {isDraggingDoc && (
                <div style={{padding:'28px',textAlign:'center',pointerEvents:'none'}}>
                  <Upload size={28} color='#3b82f6' style={{marginBottom:'8px'}}/>
                  <p style={{color:'#3b82f6',fontWeight:600,fontSize:'14px',margin:0}}>Suelta el archivo para adjuntarlo</p>
                </div>
              )}
              {!isDraggingDoc && (loadingDocs ? (
                <p style={{padding:'20px',color:'#64748b',fontSize:'13px'}}>Cargando...</p>
              ) : documentos.length === 0 ? (
                <div style={{padding:'36px',textAlign:'center'}}>
                  <Paperclip size={26} color='#cbd5e1' style={{marginBottom:'8px'}}/>
                  <p style={{color:'#94a3b8',margin:0,fontSize:'13px'}}>Sin documentos adjuntos</p>
                  <p style={{color:'#cbd5e1',fontSize:'12px',margin:'6px 0 0'}}>Arrastra un archivo aquí o usa el botón "Adjuntar"</p>
                </div>
              ) : documentos.map((doc, i) => {
                const ext = doc.nombre.split('.').pop().toLowerCase()
                const isPdf = ext === 'pdf'
                const isImg = ['jpg','jpeg','png','gif','webp'].includes(ext)
                return (
                  <div key={doc.id} style={{display:'flex',alignItems:'center',padding:'12px 20px',borderBottom:i<documentos.length-1?'1px solid #f1f5f9':'none'}}>
                    <div style={{width:'36px',height:'36px',borderRadius:'8px',background:isPdf?'#fef2f2':isImg?'#f0fdf4':'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginRight:'12px'}}>
                      <FileText size={16} color={isPdf?'#ef4444':isImg?'#22c55e':'#64748b'}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontWeight:600,color:'#111111',fontSize:'13px',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.nombre}</p>
                      <p style={{fontSize:'11px',color:'#94a3b8',margin:'2px 0 0'}}>{ext.toUpperCase()} · {new Date(doc.created_at).toLocaleDateString('es-GT')}</p>
                    </div>
                    <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                      <button onClick={()=>handleDocDownload(doc)}
                        style={{display:'flex',alignItems:'center',gap:'5px',padding:'6px 10px',background:'#f1f5f9',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'12px',color:'#475569',fontWeight:500}}>
                        <Download size={13}/> Ver
                      </button>
                      <button onClick={()=>handleDocDelete(doc)}
                        style={{padding:'6px',background:'#fef2f2',border:'none',borderRadius:'6px',cursor:'pointer'}}>
                        <Trash2 size={13} color='#ef4444'/>
                      </button>
                    </div>
                  </div>
                )
              }))}
            </div>
          </div>
        )
      })()}

      {/* ─ Modal: Nueva gestión ─ */}
      {showNuevaGestionModal && (
        <>
          <div onClick={()=>setShowNuevaGestionModal(false)}
            style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300}}/>
          <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
            background:'white',borderRadius:'16px',padding:'28px',width:'90%',maxWidth:'460px',
            zIndex:301,boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}>

            <div style={{marginBottom:'20px'}}>
              <p style={{fontSize:'12px',fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 4px'}}>Gestiones</p>
              <h2 style={{fontSize:'18px',fontWeight:700,color:'#111111',margin:'0 0 4px'}}>¿Qué tipo de gestión deseas realizar?</h2>
              <p style={{fontSize:'13px',color:'#6B6B62',margin:0}}>
                Póliza: <span style={{fontWeight:600,color:'#111111'}}>{poliza.numero_poliza}</span>
              </p>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'24px'}}>

              {/* Renovación */}
              <div onClick={()=>setTipoGestion(tipoGestion==='renovacion'?null:'renovacion')}
                style={{border:`2px solid ${tipoGestion==='renovacion'?'#C4A96B':'#e2e8f0'}`,borderRadius:'12px',
                  padding:'14px 16px',cursor:'pointer',background:tipoGestion==='renovacion'?'#FDF8EE':'white',transition:'all 0.15s'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                  <div style={{width:'28px',height:'28px',borderRadius:'50%',flexShrink:0,
                    background:tipoGestion==='renovacion'?'#C4A96B':'#f1f5f9',
                    display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <RefreshCw size={13} color={tipoGestion==='renovacion'?'white':'#94a3b8'}/>
                  </div>
                  <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Renovación</p>
                </div>
                <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 38px'}}>
                  Crear una nueva solicitud de póliza para el siguiente periodo de vigencia.
                </p>
              </div>

              {/* Inclusión */}
              <div onClick={()=>setTipoGestion(tipoGestion==='inclusion'?null:'inclusion')}
                style={{border:`2px solid ${tipoGestion==='inclusion'?'#1d4ed8':'#e2e8f0'}`,borderRadius:'12px',
                  padding:'14px 16px',cursor:'pointer',background:tipoGestion==='inclusion'?'#eff6ff':'white',transition:'all 0.15s'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                  <div style={{width:'28px',height:'28px',borderRadius:'50%',flexShrink:0,
                    background:tipoGestion==='inclusion'?'#1d4ed8':'#f1f5f9',
                    display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Plus size={13} color={tipoGestion==='inclusion'?'white':'#94a3b8'}/>
                  </div>
                  <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Inclusión</p>
                </div>
                <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 38px'}}>
                  Agregar uno o más vehículos del cliente a la póliza activa.
                </p>
              </div>

              {/* Exclusión */}
              <div onClick={()=>setTipoGestion(tipoGestion==='exclusion'?null:'exclusion')}
                style={{border:`2px solid ${tipoGestion==='exclusion'?'#dc2626':'#e2e8f0'}`,borderRadius:'12px',
                  padding:'14px 16px',cursor:'pointer',background:tipoGestion==='exclusion'?'#fef2f2':'white',transition:'all 0.15s'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                  <div style={{width:'28px',height:'28px',borderRadius:'50%',flexShrink:0,
                    background:tipoGestion==='exclusion'?'#dc2626':'#f1f5f9',
                    display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Minus size={13} color={tipoGestion==='exclusion'?'white':'#94a3b8'}/>
                  </div>
                  <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Exclusión</p>
                </div>
                <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 38px'}}>
                  Remover uno o más vehículos de la póliza activa.
                </p>
              </div>

              {/* Modificación */}
              <div onClick={()=>setTipoGestion(tipoGestion==='modificacion'?null:'modificacion')}
                style={{border:`2px solid ${tipoGestion==='modificacion'?'#7c3aed':'#e2e8f0'}`,borderRadius:'12px',
                  padding:'14px 16px',cursor:'pointer',background:tipoGestion==='modificacion'?'#f5f3ff':'white',transition:'all 0.15s'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                  <div style={{width:'28px',height:'28px',borderRadius:'50%',flexShrink:0,
                    background:tipoGestion==='modificacion'?'#7c3aed':'#f1f5f9',
                    display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Edit2 size={12} color={tipoGestion==='modificacion'?'white':'#94a3b8'}/>
                  </div>
                  <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Modificación</p>
                </div>
                <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 38px'}}>
                  Notificar a la aseguradora sobre cambios en los datos del cliente o la póliza.
                </p>
              </div>

            </div>

            <div style={{display:'flex',gap:'10px'}}>
              <button
                disabled={!tipoGestion}
                onClick={async()=>{
                  setShowNuevaGestionModal(false)
                  if (tipoGestion === 'renovacion') {
                    await renovarPoliza()
                  } else if (tipoGestion === 'modificacion') {
                    setModificacionDesc('')
                    setShowModificacionModal(true)
                  } else {
                    abrirFormEmision(tipoGestion)
                  }
                  setTipoGestion(null)
                }}
                style={{flex:1,padding:'11px',border:'none',borderRadius:'9px',fontSize:'14px',fontWeight:700,
                  cursor: tipoGestion ? 'pointer' : 'not-allowed', transition:'all 0.15s',
                  background: !tipoGestion ? '#e2e8f0'
                    : tipoGestion==='renovacion' ? '#C4A96B'
                    : tipoGestion==='inclusion' ? '#1d4ed8'
                    : tipoGestion==='exclusion' ? '#dc2626'
                    : '#7c3aed',
                  color: !tipoGestion ? '#94a3b8' : 'white'}}>
                {!tipoGestion ? 'Selecciona un tipo'
                  : tipoGestion==='renovacion' ? 'Crear renovación →'
                  : tipoGestion==='inclusion' ? 'Continuar con inclusión →'
                  : tipoGestion==='exclusion' ? 'Continuar con exclusión →'
                  : 'Crear modificación →'}
              </button>
              <button onClick={()=>{ setShowNuevaGestionModal(false); setTipoGestion(null) }}
                style={{padding:'11px 20px',background:'white',color:'#64748b',
                  border:'1px solid #e2e8f0',borderRadius:'9px',fontSize:'14px',cursor:'pointer'}}>
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─ Modal: Nueva modificación ─ */}
      {showModificacionModal && (() => {
        const isEditingMod = !!emisionForModal && emisionForModal.tipo === 'modificacion'
        return (
        <>
          <div onClick={()=>{ setShowModificacionModal(false); setModificacionDesc(''); setEmisionForModal(null) }}
            style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300}}/>
          <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
            background:'white',borderRadius:'16px',padding:'28px',width:'90%',maxWidth:'480px',
            zIndex:301,boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}>

            {/* Header */}
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px'}}>
              <div style={{width:'34px',height:'34px',borderRadius:'50%',flexShrink:0,
                background:'#f5f3ff',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Edit2 size={15} color='#7c3aed'/>
              </div>
              <div style={{flex:1}}>
                <h2 style={{fontSize:'17px',fontWeight:700,color:'#111111',margin:0}}>{isEditingMod ? 'Editar modificación' : 'Nueva modificación'}</h2>
                <p style={{fontSize:'12px',color:'#6B6B62',margin:0}}>Póliza: <span style={{fontWeight:600,color:'#111111'}}>{poliza.numero_poliza}</span></p>
              </div>
              <button onClick={()=>{ setShowModificacionModal(false); setModificacionDesc(''); setEmisionForModal(null) }}
                style={{background:'none',border:'none',cursor:'pointer',padding:'4px',color:'#94a3b8'}}>
                <X size={18}/>
              </button>
            </div>

            {/* Description field */}
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'6px'}}>
                Descripción de modificaciones *
              </label>
              <textarea
                value={modificacionDesc}
                onChange={e=>setModificacionDesc(e.target.value)}
                placeholder="Ej. El cliente cambió su dirección fiscal a Av. Reforma 5-12 zona 10..."
                rows={5}
                style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:'8px',
                  fontSize:'14px',resize:'vertical',boxSizing:'border-box',fontFamily:'inherit',
                  color:'#1e293b',lineHeight:1.5}}
              />
            </div>

            {/* Actions */}
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={handleModificacionSubmit}
                disabled={!modificacionDesc.trim()}
                style={{flex:1,padding:'11px',background:modificacionDesc.trim()?'#7c3aed':'#e2e8f0',
                  color:modificacionDesc.trim()?'white':'#94a3b8',border:'none',borderRadius:'9px',
                  fontSize:'14px',fontWeight:700,cursor:modificacionDesc.trim()?'pointer':'not-allowed'}}>
                {isEditingMod ? 'Guardar cambios' : 'Crear modificación'}
              </button>
              <button onClick={()=>{ setShowModificacionModal(false); setModificacionDesc(''); setEmisionForModal(null) }}
                style={{padding:'11px 20px',background:'white',color:'#64748b',
                  border:'1px solid #e2e8f0',borderRadius:'9px',fontSize:'14px',cursor:'pointer'}}>
                Cancelar
              </button>
            </div>
          </div>
        </>
        )
      })()}

      {/* ─ Modal: Nueva / Editar gestión ─ */}
      {showEmisionModal && (() => {
        const isExclusion = emisionForm.tipo === 'exclusion'
        const isEdit = !!editingEmision
        const formTitle = isEdit
          ? (isExclusion ? 'Editar exclusión' : 'Editar inclusión')
          : (isExclusion ? 'Nueva exclusión' : 'Nueva inclusión')
        const submitLabel = isEdit
          ? 'Guardar cambios'
          : (isExclusion ? 'Crear exclusión' : 'Crear inclusión')
        // Vehicle lists for the modal
        // Active = in a non-cancelled inclusion/emision
        const vehiculosActivosModalSet = new Set(
          emisiones
            .filter(em => em.tipo !== 'exclusion' && em.estado !== 'cancelada')
            .flatMap(em => em.emision_vehiculos?.map(ev => ev.vehiculos?.id) || [])
        )
        // Excluded = in a emitida/completado exclusion → available for re-inclusion
        const vehiculosExcluidosModalSet = new Set(
          emisiones
            .filter(em => em.tipo === 'exclusion' && (em.estado === 'emitida' || em.estado === 'completado'))
            .flatMap(em => em.emision_vehiculos?.map(ev => ev.vehiculos?.id) || [])
        )
        const vehiculosEnUsoModal = new Set([...vehiculosActivosModalSet].filter(id => !vehiculosExcluidosModalSet.has(id)))
        const vehiculosParaInclusionModal = allClientVehiculos.filter(v =>
          !vehiculosEnUsoModal.has(v.id) && !otherPolizaOccupiedIds.has(v.id)
        )
        // Vehicles already excluded (in a non-cancelled exclusion) — not available to exclude again
        const vehiculosYaExcluidosSet = new Set(
          emisiones
            .filter(em => em.tipo === 'exclusion' && em.estado !== 'cancelada')
            .flatMap(em => em.emision_vehiculos?.map(ev => ev.vehiculos?.id) || [])
        )
        // Active vehicles = in a non-cancelled inclusion/emision, not yet excluded
        const vehiculosEnPolizaModal = emisiones
          .filter(em => em.tipo !== 'exclusion' && em.estado !== 'cancelada')
          .flatMap(em =>
            (em.emision_vehiculos || []).map(ev => ({
              ...ev.vehiculos, evId: ev.id, emisionNumero: em.numero_emision, emisionEstado: em.estado
            }))
          )
          .filter(v => v?.id && !vehiculosYaExcluidosSet.has(v.id))
        // For editing an inclusion: combine currently-in-inclusion vehicles + available-for-new-inclusion
        const isEditInclusion = isEdit && editingEmision?.tipo === 'inclusion'
        const editInclusionCurrentIds = isEditInclusion
          ? (editingEmision.emision_vehiculos || []).map(ev => ev.vehiculos?.id).filter(Boolean)
          : []
        const vehiculosParaEditInclusion = isEditInclusion ? [
          ...allClientVehiculos.filter(v => editInclusionCurrentIds.includes(v.id)),
          ...vehiculosParaInclusionModal.filter(v => !editInclusionCurrentIds.includes(v.id))
        ] : vehiculosParaInclusionModal
        return (
          <>
            <div onClick={()=>{ setShowEmisionModal(false); setEditingEmision(null); setEmisionForm(emptyEmision) }}
              style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300}}/>
            <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
              background:'white',borderRadius:'16px',padding:'28px',width:'90%',maxWidth:'520px',
              zIndex:301,boxShadow:'0 20px 60px rgba(0,0,0,0.25)',maxHeight:'90vh',overflowY:'auto'}}>

              {/* Header */}
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'20px'}}>
                <div style={{width:'32px',height:'32px',borderRadius:'50%',flexShrink:0,
                  background:isExclusion?'#fef2f2':'#eff6ff',
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {isExclusion ? <Minus size={15} color='#ef4444'/> : <Plus size={15} color='#1d4ed8'/>}
                </div>
                <div>
                  <h2 style={{fontSize:'17px',fontWeight:700,color:'#111111',margin:0}}>{formTitle}</h2>
                  <p style={{fontSize:'12px',color:'#6B6B62',margin:0}}>Póliza: <span style={{fontWeight:600,color:'#111111'}}>{poliza.numero_poliza}</span></p>
                </div>
                <button onClick={()=>{ setShowEmisionModal(false); setEditingEmision(null); setEmisionForm(emptyEmision) }}
                  style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',padding:'4px',color:'#94a3b8'}}>
                  <X size={18}/>
                </button>
              </div>

              <form onSubmit={handleEmisionSubmit}>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(auto-fit,minmax(200px,1fr))',gap:'14px',marginBottom:'16px'}}>

                  {/* Prima neta — only shown in edit mode for non-inclusion types (inclusions use per-vehicle prima) */}
                  {isEdit && !isEditInclusion && (
                    <div>
                      <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                        Prima neta {isExclusion?'de exclusión':'de inclusión'} (Q)
                      </label>
                      <input type="number" step="0.01" min="0" value={emisionForm.prima_neta}
                        onChange={e=>setEmisionForm({...emisionForm,prima_neta:e.target.value})}
                        style={inputStyle} placeholder="0.00"/>
                      {(() => {
                        if (!polizaAsegConfig || !(parseFloat(emisionForm.prima_neta) > 0)) return null
                        const pct_rec = emisionForm.tipo_pago === 'contado' ? 0 :
                          (polizaAsegConfig.recargos.find(r => r.numero_cuotas === parseInt(emisionForm.numero_cuotas))?.porcentaje || 0)
                        const calc = calcularPrima(emisionForm.prima_neta, polizaAsegConfig.porcentaje_gasto_emision, pct_rec)
                        const fmt = n => 'Q ' + parseFloat(n).toLocaleString('es-GT', {minimumFractionDigits:2, maximumFractionDigits:2})
                        return (
                          <div style={{marginTop:'8px', background:'#f8fafc', borderRadius:'8px', padding:'10px 12px', border:'1px solid #e2e8f0', fontSize:'12px'}}>
                            <div style={{display:'flex', justifyContent:'space-between', color:'#64748b', marginBottom:'3px'}}><span>+ Gastos ({polizaAsegConfig.porcentaje_gasto_emision}%)</span><span>{fmt(calc.monto_gasto_emision)}</span></div>
                            {calc.monto_recargo > 0 && <div style={{display:'flex', justifyContent:'space-between', color:'#64748b', marginBottom:'3px'}}><span>+ Recargo ({pct_rec}%)</span><span>{fmt(calc.monto_recargo)}</span></div>}
                            <div style={{display:'flex', justifyContent:'space-between', color:'#64748b', marginBottom:'6px'}}><span>+ IVA 12%</span><span>{fmt(calc.monto_iva)}</span></div>
                            <div style={{display:'flex', justifyContent:'space-between', fontWeight:700, color:'#111111', borderTop:'1px solid #e2e8f0', paddingTop:'6px'}}><span>Prima total</span><span>{fmt(calc.prima_total)}</span></div>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Fecha */}
                  {isExclusion ? (
                    <div>
                      <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>Fecha de exclusión *</label>
                      <input type="date" value={emisionForm.fecha_inicio}
                        onChange={e=>setEmisionForm({...emisionForm,fecha_inicio:e.target.value})}
                        required style={inputStyle}/>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>Fecha de inicio *</label>
                        <input type="date" value={emisionForm.fecha_inicio}
                          onChange={e=>setEmisionForm({...emisionForm,fecha_inicio:e.target.value})}
                          required style={inputStyle}/>
                      </div>
                      <div style={{gridColumn:'1/-1'}}>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>Fecha fin</label>
                        <div style={{padding:'9px 12px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'13px',color:'#374151'}}>
                          {poliza.fecha_vencimiento ? new Date(poliza.fecha_vencimiento).toLocaleDateString('es-GT') : '—'}
                          <span style={{fontSize:'11px',color:'#94a3b8',marginLeft:'6px'}}>(fecha venc. póliza)</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Persona facturable */}
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                      Responsable de pago <span style={{fontWeight:400,color:'#94a3b8'}}>(si es distinto al cliente)</span>
                    </label>
                    {personasFacturablesEmision.length === 0 ? (
                      <div style={{padding:'9px 12px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'6px',fontSize:'13px',color:'#94a3b8'}}>
                        Sin personas facturables registradas para este cliente
                      </div>
                    ) : (
                      <select value={emisionForm.persona_facturable_id}
                        onChange={e=>setEmisionForm({...emisionForm,persona_facturable_id:e.target.value})}
                        style={inputStyle}>
                        <option value="">— Mismo cliente —</option>
                        {personasFacturablesEmision.map(pf=>(
                          <option key={pf.id} value={pf.id}>
                            {[pf.nombre,pf.apellido].filter(Boolean).join(' ')}{pf.nit?` · NIT ${pf.nit}`:''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Tipo de pago — solo inclusión */}
                  {!isExclusion && (
                    <>
                      <div>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>Tipo de pago *</label>
                        <div style={{display:'flex',gap:'8px'}}>
                          {[['contado','Contado'],['financiado','Fraccionado']].map(([val,lbl])=>(
                            <button key={val} type="button"
                              onClick={()=>setEmisionForm({...emisionForm,tipo_pago:val,numero_cuotas:val==='contado'?1:(polizaAsegConfig?.recargos?.[0]?.numero_cuotas||emisionForm.numero_cuotas)})}
                              style={{flex:1,padding:'8px 10px',border:`1.5px solid ${emisionForm.tipo_pago===val?'#111111':'#e2e8f0'}`,
                                borderRadius:'6px',fontSize:'13px',fontWeight:600,cursor:'pointer',
                                background:emisionForm.tipo_pago===val?'#111111':'white',
                                color:emisionForm.tipo_pago===val?'white':'#374151'}}>
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                      {emisionForm.tipo_pago === 'financiado' && (
                        <div>
                          <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                            Número de cuotas <span style={{fontWeight:400,color:'#94a3b8'}}>(pagos mensuales)</span>
                          </label>
                          {polizaAsegConfig?.recargos?.length > 0 ? (
                            <select
                              value={emisionForm.numero_cuotas}
                              onChange={e=>setEmisionForm({...emisionForm,numero_cuotas:parseInt(e.target.value)})}
                              required
                              style={inputStyle}>
                              {polizaAsegConfig.recargos.map(r=>(
                                <option key={r.numero_cuotas} value={r.numero_cuotas}>
                                  {r.numero_cuotas} cuotas{r.porcentaje > 0 ? ` (${r.porcentaje}% recargo)` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p style={{fontSize:'13px',color:'#f59e0b',margin:'4px 0 0',padding:'9px 12px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'8px'}}>
                              ⚠ Sin cuotas configuradas para esta aseguradora.
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Método de pago */}
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                      Método de pago <span style={{fontWeight:400,color:'#94a3b8'}}>(opcional)</span>
                    </label>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                      {[['tarjeta','Tarjeta asociada'],['deposito','Depósito'],['transferencia','Transferencia'],['cheque','Cheque']].map(([val,lbl])=>(
                        <button key={val} type="button"
                          onClick={()=>setEmisionForm({...emisionForm, metodo_pago: emisionForm.metodo_pago===val ? '' : val})}
                          style={{padding:'8px 14px',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',
                            background:emisionForm.metodo_pago===val?'#111111':'white',
                            color:emisionForm.metodo_pago===val?'white':'#374151',
                            border:`1.5px solid ${emisionForm.metodo_pago===val?'#111111':'#e2e8f0'}`}}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}}>
                      Observaciones <span style={{fontWeight:400,color:'#94a3b8'}}>(opcional)</span>
                    </label>
                    <textarea value={emisionForm.notas}
                      onChange={e=>setEmisionForm({...emisionForm,notas:e.target.value})}
                      rows={3}
                      style={{...inputStyle, resize:'vertical', fontFamily:'inherit'}}
                      placeholder={`Observaciones sobre la ${isExclusion?'exclusión':'inclusión'}...`}/>
                  </div>

                  {/* Incluir coberturas en PDF */}
                  {!isExclusion && (
                    <div style={{gridColumn:'1/-1'}}>
                      <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',userSelect:'none'}}>
                        <input type="checkbox" checked={!!emisionForm.incluir_coberturas_pdf}
                          onChange={e=>setEmisionForm({...emisionForm,incluir_coberturas_pdf:e.target.checked})}
                          style={{width:'16px',height:'16px',accentColor:'#C4A96B',cursor:'pointer',flexShrink:0}}/>
                        <span style={{fontSize:'13px',fontWeight:600,color:'#374151'}}>
                          Incluir coberturas en PDF
                          <span style={{fontWeight:400,color:'#94a3b8',marginLeft:'6px'}}>— agrega el listado de coberturas del producto al documento</span>
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Vehicle selection — create mode, or edit mode for inclusions */}
                {(!isEdit || isEditInclusion) && (
                  <div style={{marginBottom:'16px',padding:'14px',background:'#f8fafc',borderRadius:'10px',border:'1px solid #e2e8f0'}}>
                    {isExclusion ? (
                      <>
                        <p style={{fontSize:'13px',fontWeight:600,color:'#ef4444',margin:'0 0 10px'}}>
                          Vehículos a excluir * <span style={{fontWeight:400,color:'#94a3b8'}}>(activos en la póliza)</span>
                        </p>
                        {vehiculosEnPolizaModal.length === 0 ? (
                          <p style={{fontSize:'13px',color:'#94a3b8',margin:0}}>Sin vehículos en la póliza</p>
                        ) : (
                          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                            {vehiculosEnPolizaModal.map(v => {
                              const sel = exclusionVehiculosSelected.includes(v.id)
                              const eEst = polizaEstados[v.emisionEstado] || { bg:'#f1f5f9', color:'#64748b', label: v.emisionEstado }
                              return (
                                <div key={v.id}
                                  onClick={()=>setExclusionVehiculosSelected(prev=>sel?prev.filter(x=>x!==v.id):[...prev,v.id])}
                                  style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',
                                    background:sel?'#fef2f2':'white',border:`1px solid ${sel?'#ef4444':'#e2e8f0'}`,borderRadius:'8px',cursor:'pointer'}}>
                                  <div style={{width:'18px',height:'18px',borderRadius:'4px',border:`2px solid ${sel?'#ef4444':'#cbd5e1'}`,
                                    background:sel?'#ef4444':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                    {sel && <CheckCircle size={12} color="white"/>}
                                  </div>
                                  <Car size={14} color={sel?'#ef4444':'#64748b'}/>
                                  <span style={{flex:1,fontSize:'13px',fontWeight:500,color:sel?'#ef4444':'#374151'}}>{v.marca} {v.modelo} {v.anio}</span>
                                  <span style={{fontSize:'12px',color:'#64748b'}}>Placa: {fp(v)}</span>
                                  <span style={{fontSize:'11px',padding:'2px 7px',borderRadius:'20px',background:eEst.bg,color:eEst.color,fontWeight:600,flexShrink:0}}>{v.emisionNumero}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p style={{fontSize:'13px',fontWeight:600,color:'#374151',margin:'0 0 10px'}}>
                          Vehículos a incluir <span style={{fontWeight:400,color:'#94a3b8'}}>(del cliente, sin asignar)</span>
                        </p>
                        {vehiculosParaEditInclusion.length === 0 ? (
                          <p style={{fontSize:'13px',color:'#94a3b8',margin:0}}>Sin vehículos disponibles para incluir</p>
                        ) : (
                          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                            {vehiculosParaEditInclusion.map(v => {
                              const sel = inclusionVehiculosSelected.includes(v.id)
                              const primaValI = vehiculoPrimasInclusion[v.id] || ''
                              const _pctRecI = emisionForm.tipo_pago==='contado'?0:(polizaAsegConfig?.recargos?.find(r=>r.numero_cuotas===parseInt(emisionForm.numero_cuotas))?.porcentaje||0)
                              const primaCalcI = sel && polizaAsegConfig && parseFloat(primaValI)>0
                                ? calcularPrima(primaValI, polizaAsegConfig.porcentaje_gasto_emision, _pctRecI) : null
                              const _fmtQi = n => 'Q '+parseFloat(n).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2})
                              return (
                                <div key={v.id} style={{background:sel?'#eff6ff':'white',border:`1px solid ${sel?'#3b82f6':'#e2e8f0'}`,borderRadius:'8px'}}>
                                  <div onClick={()=>setInclusionVehiculosSelected(prev=>sel?prev.filter(x=>x!==v.id):[...prev,v.id])}
                                    style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',cursor:'pointer'}}>
                                    <div style={{width:'18px',height:'18px',borderRadius:'4px',border:`2px solid ${sel?'#3b82f6':'#cbd5e1'}`,
                                      background:sel?'#3b82f6':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                      {sel && <CheckCircle size={12} color="white"/>}
                                    </div>
                                    <Car size={14} color={sel?'#1d4ed8':'#64748b'}/>
                                    <span style={{flex:1,fontSize:'13px',fontWeight:500,color:sel?'#1d4ed8':'#374151'}}>{v.marca} {v.modelo} {v.anio}</span>
                                    <span style={{fontSize:'12px',color:'#64748b'}}>Placa: {fp(v)}</span>
                                  </div>
                                  {sel && (
                                    <div style={{padding:'0 12px 10px'}} onClick={e=>e.stopPropagation()}>
                                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px',marginBottom:'5px'}}>
                                        <div>
                                          <label style={{display:'block',fontSize:'11px',fontWeight:600,color:'#374151',marginBottom:'3px'}}>Prima neta (Q)</label>
                                          <input type="number" step="0.01" min="0"
                                            value={primaValI}
                                            onChange={e=>setVehiculoPrimasInclusion(prev=>({...prev,[v.id]:e.target.value}))}
                                            placeholder="0.00"
                                            style={{width:'100%',padding:'6px 8px',border:'1px solid #bfdbfe',borderRadius:'6px',fontSize:'12px',boxSizing:'border-box',background:'white',color:'#1e293b',outline:'none'}}/>
                                        </div>
                                        <div>
                                          <label style={{display:'block',fontSize:'11px',fontWeight:600,color:'#374151',marginBottom:'3px'}}>Ded. daños (%)</label>
                                          <input type="number" step="0.01" min="0" max="100"
                                            value={vehiculoDeduciblesInclusion[v.id]?.danios || ''}
                                            onChange={e=>setVehiculoDeduciblesInclusion(prev=>({...prev,[v.id]:{...(prev[v.id]||{}),danios:e.target.value}}))}
                                            placeholder="0.00"
                                            style={{width:'100%',padding:'6px 8px',border:'1px solid #bfdbfe',borderRadius:'6px',fontSize:'12px',boxSizing:'border-box',background:'white',color:'#1e293b',outline:'none'}}/>
                                        </div>
                                        <div>
                                          <label style={{display:'block',fontSize:'11px',fontWeight:600,color:'#374151',marginBottom:'3px'}}>Ded. robo (%)</label>
                                          <input type="number" step="0.01" min="0" max="100"
                                            value={vehiculoDeduciblesInclusion[v.id]?.robo || ''}
                                            onChange={e=>setVehiculoDeduciblesInclusion(prev=>({...prev,[v.id]:{...(prev[v.id]||{}),robo:e.target.value}}))}
                                            placeholder="0.00"
                                            style={{width:'100%',padding:'6px 8px',border:'1px solid #bfdbfe',borderRadius:'6px',fontSize:'12px',boxSizing:'border-box',background:'white',color:'#1e293b',outline:'none'}}/>
                                        </div>
                                      </div>
                                      {primaCalcI && (
                                        <div style={{background:'white',borderRadius:'5px',padding:'7px 10px',border:'1px solid #bfdbfe',fontSize:'12px'}}>
                                          <div style={{display:'flex',justifyContent:'space-between',color:'#64748b',marginBottom:'2px'}}><span>+ Gastos ({polizaAsegConfig.porcentaje_gasto_emision}%)</span><span>{_fmtQi(primaCalcI.monto_gasto_emision)}</span></div>
                                          {primaCalcI.monto_recargo>0&&<div style={{display:'flex',justifyContent:'space-between',color:'#64748b',marginBottom:'2px'}}><span>+ Recargo ({_pctRecI}%)</span><span>{_fmtQi(primaCalcI.monto_recargo)}</span></div>}
                                          <div style={{display:'flex',justifyContent:'space-between',color:'#64748b',marginBottom:'3px'}}><span>+ IVA 12%</span><span>{_fmtQi(primaCalcI.monto_iva)}</span></div>
                                          <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,color:'#111111',borderTop:'1px solid #e2e8f0',paddingTop:'3px'}}><span>Prima total</span><span>{_fmtQi(primaCalcI.prima_total)}</span></div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Edit mode hint — only for non-inclusion types */}
                {isEdit && !isEditInclusion && (
                  <div style={{background:'#eff6ff',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',display:'flex',gap:'8px',alignItems:'flex-start'}}>
                    <AlertCircle size={14} color='#1d4ed8' style={{flexShrink:0,marginTop:'1px'}}/>
                    <p style={{fontSize:'12px',color:'#1d4ed8',margin:0}}>
                      Los vehículos de esta gestión se modifican directamente en la lista de vehículos de la póliza.
                    </p>
                  </div>
                )}

                <div style={{display:'flex',gap:'10px'}}>
                  <button type="submit"
                    style={{flex:1,padding:'11px',background:isExclusion&&!isEdit?'#dc2626':'#111111',color:'white',
                      border:'none',borderRadius:'9px',fontSize:'14px',fontWeight:700,cursor:'pointer'}}>
                    {submitLabel}
                  </button>
                  <button type="button"
                    onClick={()=>{ setShowEmisionModal(false); setEditingEmision(null); setEmisionForm(emptyEmision) }}
                    style={{padding:'11px 20px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'9px',fontSize:'14px',cursor:'pointer'}}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </>
        )
      })()}

      {/* ─ Modal: Cambiar estado gestión ─ */}
      {showGestionEstadoModal && emisionForModal && (() => {
        const em = emisionForModal
        const eEst = polizaEstados[em.estado] || { bg:'#f1f5f9', color:'#64748b', label: em.estado }
        const isExcl = em.tipo === 'exclusion'
        const tipoLabel = em.tipo === 'modificacion' ? 'Modificación' : isExcl ? 'Exclusión' : 'Inclusión'
        return (
          <>
            <div onClick={()=>setShowGestionEstadoModal(false)}
              style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300}}/>
            <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
              background:'white',borderRadius:'16px',padding:'28px',width:'90%',maxWidth:'460px',
              zIndex:301,boxShadow:'0 20px 60px rgba(0,0,0,0.25)',maxHeight:'90vh',overflowY:'auto'}}>

              {/* Header */}
              <div style={{marginBottom:'20px'}}>
                <p style={{fontSize:'12px',fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 4px'}}>
                  Cambiar estado · {tipoLabel}
                </p>
                <h2 style={{fontSize:'17px',fontWeight:700,color:'#111111',margin:'0 0 4px'}}>
                  {em.estado === 'solicitud' ? `¿Listo para enviar ${tipoLabel.toLowerCase()}?`
                    : em.estado === 'enviada' ? `¿Qué ocurrió con la ${tipoLabel.toLowerCase()}?`
                    : `¿Listo para re-enviar ${tipoLabel.toLowerCase()}?`}
                </h2>
                <p style={{fontSize:'13px',color:'#6B6B62',margin:0}}>
                  {em.numero_emision} · Estado actual: <span style={{fontWeight:600,color:eEst.color}}>{eEst.label}</span>
                </p>
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'20px'}}>

                {/* solicitud → enviada */}
                {em.estado === 'solicitud' && (
                  <div onClick={()=>setGestionEstadoOpcion('enviar')}
                    style={{border:`2px solid ${gestionEstadoOpcion==='enviar'?'#111111':'#e2e8f0'}`,borderRadius:'12px',
                      padding:'14px 16px',cursor:'pointer',background:gestionEstadoOpcion==='enviar'?'#f8fafc':'white',transition:'all 0.15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                      <div style={{width:'26px',height:'26px',borderRadius:'50%',flexShrink:0,
                        background:gestionEstadoOpcion==='enviar'?'#111111':'#f1f5f9',
                        display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <SendHorizonal size={12} color={gestionEstadoOpcion==='enviar'?'white':'#94a3b8'}/>
                      </div>
                      <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Marcar como enviada</p>
                    </div>
                    <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 36px'}}>
                      El PDF fue generado y enviado a la aseguradora.
                    </p>
                  </div>
                )}

                {/* enviada → emitida / completado */}
                {em.estado === 'enviada' && (
                  <div onClick={()=>{ setGestionEstadoOpcion(isExcl || em.tipo==='modificacion' ? 'completar' : 'emitir'); if(!isExcl && em.tipo!=='modificacion') setEmisionPdfFile(null) }}
                    style={{border:`2px solid ${(gestionEstadoOpcion==='emitir'||gestionEstadoOpcion==='completar')?'#16a34a':'#e2e8f0'}`,borderRadius:'12px',
                      padding:'14px 16px',cursor:'pointer',background:(gestionEstadoOpcion==='emitir'||gestionEstadoOpcion==='completar')?'#f0fdf4':'white',transition:'all 0.15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                      <div style={{width:'26px',height:'26px',borderRadius:'50%',flexShrink:0,
                        background:(gestionEstadoOpcion==='emitir'||gestionEstadoOpcion==='completar')?'#16a34a':'#f1f5f9',
                        display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <CheckCircle size={13} color={(gestionEstadoOpcion==='emitir'||gestionEstadoOpcion==='completar')?'white':'#94a3b8'}/>
                      </div>
                      <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>
                        {em.tipo==='modificacion' ? 'Completada' : isExcl ? 'Completar exclusión' : 'Emitir inclusión'}
                      </p>
                    </div>
                    <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 36px'}}>
                      {em.tipo==='modificacion' ? 'La aseguradora aplicó los cambios solicitados.' : isExcl ? 'Los vehículos excluidos serán removidos de la póliza.' : 'La aseguradora aprobó la inclusión.'}
                    </p>
                    {/* PDF upload — solo inclusión, inline al seleccionar */}
                    {!isExcl && em.tipo!=='modificacion' && gestionEstadoOpcion === 'emitir' && (
                      <div style={{marginTop:'14px',paddingTop:'14px',borderTop:'1px solid #dcfce7'}}
                        onClick={e=>e.stopPropagation()}>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'6px'}}>
                          PDF de la aseguradora *
                        </label>
                        <label style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 14px',
                          border:`1.5px dashed ${emisionPdfFile?'#16a34a':'#e2e8f0'}`,borderRadius:'8px',cursor:'pointer',
                          background:emisionPdfFile?'#f0fdf4':'white'}}>
                          <Upload size={15} color={emisionPdfFile?'#15803d':'#94a3b8'}/>
                          <span style={{fontSize:'13px',color:emisionPdfFile?'#15803d':'#94a3b8',flex:1}}>
                            {emisionPdfFile ? emisionPdfFile.name : 'Seleccionar PDF de la aseguradora...'}
                          </span>
                          {emisionPdfFile && (
                            <button type="button" onClick={e=>{e.preventDefault();setEmisionPdfFile(null)}}
                              style={{background:'none',border:'none',cursor:'pointer',padding:'0',color:'#94a3b8'}}>
                              <X size={13}/>
                            </button>
                          )}
                          <input type="file" accept=".pdf" style={{display:'none'}}
                            onChange={e=>setEmisionPdfFile(e.target.files[0]||null)}/>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* enviada → en_reproceso */}
                {em.estado === 'enviada' && (
                  <div onClick={()=>setGestionEstadoOpcion('reproceso')}
                    style={{border:`2px solid ${gestionEstadoOpcion==='reproceso'?'#dc2626':'#e2e8f0'}`,borderRadius:'12px',
                      padding:'14px 16px',cursor:'pointer',background:gestionEstadoOpcion==='reproceso'?'#fef2f2':'white',transition:'all 0.15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                      <div style={{width:'26px',height:'26px',borderRadius:'50%',flexShrink:0,
                        background:gestionEstadoOpcion==='reproceso'?'#dc2626':'#f1f5f9',
                        display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <RefreshCw size={12} color={gestionEstadoOpcion==='reproceso'?'white':'#94a3b8'}/>
                      </div>
                      <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Marcar en reproceso</p>
                    </div>
                    <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 36px'}}>
                      La aseguradora solicitó correcciones. Se podrá generar un nuevo PDF.
                    </p>
                  </div>
                )}

                {/* en_reproceso → enviada */}
                {em.estado === 'en_reproceso' && (
                  <div onClick={()=>setGestionEstadoOpcion('reenviar')}
                    style={{border:`2px solid ${gestionEstadoOpcion==='reenviar'?'#C4A96B':'#e2e8f0'}`,borderRadius:'12px',
                      padding:'14px 16px',cursor:'pointer',background:gestionEstadoOpcion==='reenviar'?'#FDF8EE':'white',transition:'all 0.15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                      <div style={{width:'26px',height:'26px',borderRadius:'50%',flexShrink:0,
                        background:gestionEstadoOpcion==='reenviar'?'#C4A96B':'#f1f5f9',
                        display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <SendHorizonal size={12} color={gestionEstadoOpcion==='reenviar'?'white':'#94a3b8'}/>
                      </div>
                      <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Re-enviar a aseguradora</p>
                    </div>
                    <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 36px'}}>
                      Las correcciones fueron aplicadas y el PDF actualizado está listo.
                    </p>
                  </div>
                )}

                {/* Cancelar gestión — available for solicitud, enviada, en_reproceso */}
                <div onClick={()=>setGestionEstadoOpcion(gestionEstadoOpcion==='cancelar'?null:'cancelar')}
                  style={{border:`2px solid ${gestionEstadoOpcion==='cancelar'?'#94a3b8':'#e2e8f0'}`,borderRadius:'12px',
                    padding:'14px 16px',cursor:'pointer',background:gestionEstadoOpcion==='cancelar'?'#f8fafc':'white',transition:'all 0.15s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
                    <div style={{width:'26px',height:'26px',borderRadius:'50%',flexShrink:0,
                      background:gestionEstadoOpcion==='cancelar'?'#64748b':'#f1f5f9',
                      display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <X size={12} color={gestionEstadoOpcion==='cancelar'?'white':'#94a3b8'}/>
                    </div>
                    <p style={{fontWeight:700,fontSize:'14px',color:'#374151',margin:0}}>Cancelar gestión</p>
                  </div>
                  <p style={{fontSize:'12px',color:'#94a3b8',margin:'0 0 0 36px'}}>
                    La gestión será marcada como cancelada. Esta acción no se puede deshacer.
                  </p>
                </div>

              </div>

              <div style={{display:'flex',gap:'10px'}}>
                <button
                  disabled={!gestionEstadoOpcion || (gestionEstadoOpcion==='emitir' && !isExcl && !emisionPdfFile) || uploadingPdf}
                  onClick={async()=>{
                    if (!gestionEstadoOpcion) return
                    // Validate vehicles before sending (not required for modificacion)
                    if (gestionEstadoOpcion === 'enviar' && em.tipo !== 'modificacion' && (em.emision_vehiculos?.length || 0) === 0) {
                      toast.error('Debes asignar al menos un vehículo antes de enviar'); return
                    }
                    // Upload PDF for inclusión emitir
                    if (gestionEstadoOpcion === 'emitir' && emisionPdfFile) {
                      setUploadingPdf(true)
                      const ext = emisionPdfFile.name.split('.').pop()
                      const eid = await getMyEmpresaId()
                      const path = `${eid}/${poliza.id}/${em.id}.${ext}`
                      const { data: ud, error: ue } = await supabase.storage
                        .from('polizas-pdfs').upload(path, emisionPdfFile, { upsert: true })
                      setUploadingPdf(false)
                      if (ue) { toast.error('Error subiendo PDF: ' + ue.message); return }
                      const { data: uUrl } = supabase.storage.from('polizas-pdfs').getPublicUrl(ud.path)
                      await supabase.from('emisiones').update({ pdf_url: uUrl.publicUrl }).eq('id', em.id)
                    }
                    const mapa = { enviar:'enviada', emitir:'emitida', completar:'completado', reproceso:'en_reproceso', reenviar:'enviada', cancelar:'cancelada' }
                    await actualizarEstadoEmision(em, mapa[gestionEstadoOpcion])
                    setShowGestionEstadoModal(false)
                    setGestionEstadoOpcion(null)
                    setEmisionForModal(null)
                    setEmisionPdfFile(null)
                  }}
                  style={{flex:1,padding:'11px',border:'none',borderRadius:'9px',fontSize:'14px',fontWeight:700,transition:'all 0.15s',
                    background: (!gestionEstadoOpcion || (gestionEstadoOpcion==='emitir'&&!isExcl&&!emisionPdfFile) || uploadingPdf) ? '#e2e8f0'
                      : gestionEstadoOpcion==='emitir' || gestionEstadoOpcion==='completar' ? '#16a34a'
                      : gestionEstadoOpcion==='reproceso' ? '#dc2626'
                      : gestionEstadoOpcion==='cancelar' ? '#64748b'
                      : gestionEstadoOpcion==='reenviar' ? '#C4A96B'
                      : '#111111',
                    color: (!gestionEstadoOpcion || (gestionEstadoOpcion==='emitir'&&!isExcl&&!emisionPdfFile) || uploadingPdf) ? '#94a3b8' : 'white',
                    cursor: (!gestionEstadoOpcion || (gestionEstadoOpcion==='emitir'&&!isExcl&&!emisionPdfFile) || uploadingPdf) ? 'not-allowed' : 'pointer'}}>
                  {uploadingPdf ? 'Subiendo PDF...'
                    : !gestionEstadoOpcion ? 'Selecciona una opción'
                    : gestionEstadoOpcion==='enviar' ? 'Confirmar envío'
                    : gestionEstadoOpcion==='emitir' ? (emisionPdfFile ? '✓ Confirmar emisión' : 'Adjunta el PDF primero')
                    : gestionEstadoOpcion==='completar' ? '✓ Confirmar completado'
                    : gestionEstadoOpcion==='reproceso' ? 'Confirmar reproceso'
                    : gestionEstadoOpcion==='cancelar' ? 'Confirmar cancelación'
                    : 'Confirmar re-envío'}
                </button>
                <button onClick={()=>{ setShowGestionEstadoModal(false); setGestionEstadoOpcion(null); setEmisionForModal(null); setEmisionPdfFile(null) }}
                  style={{padding:'11px 20px',background:'white',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:'9px',fontSize:'14px',cursor:'pointer'}}>
                  Cerrar
                </button>
              </div>
            </div>
          </>
        )
      })()}

      {/* ─ Modal: Cambiar estado ─ */}
      {showCambiarEstadoModal && (
        <>
          <div onClick={()=>setShowCambiarEstadoModal(false)}
            style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300}}/>
          <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
            background:'white',borderRadius:'16px',padding:'28px',width:'90%',maxWidth:'480px',
            zIndex:301,boxShadow:'0 20px 60px rgba(0,0,0,0.25)',maxHeight:'90vh',overflowY:'auto'}}>

            {/* Header */}
            <div style={{marginBottom:'20px'}}>
              <p style={{fontSize:'12px',fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 4px'}}>
                Cambiar estado
              </p>
              <h2 style={{fontSize:'18px',fontWeight:700,color:'#111111',margin:'0 0 4px'}}>
                {poliza.estado === 'solicitud' ? '¿Listo para enviar a la aseguradora?' : poliza.estado === 'enviada' ? '¿Qué ocurrió con la aseguradora?' : '¿Listo para re-enviar?'}
              </h2>
              <p style={{fontSize:'13px',color:'#6B6B62',margin:0}}>
                Estado actual: <span style={{fontWeight:600,color:pEst.color}}>{pEst.label}</span>
              </p>
            </div>

            {/* ── Opción para estado "solicitud" ── */}
            {poliza.estado === 'solicitud' && (
              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'20px'}}>
                <div onClick={()=>setEstadoOpcion('enviar')}
                  style={{border:`2px solid ${estadoOpcion==='enviar'?'#111111':'#e2e8f0'}`,borderRadius:'12px',
                    padding:'16px',cursor:'pointer',background:estadoOpcion==='enviar'?'#f8fafc':'white',transition:'all 0.15s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',
                      background:estadoOpcion==='enviar'?'#111111':'#f1f5f9',
                      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <SendHorizonal size={13} color={estadoOpcion==='enviar'?'white':'#94a3b8'}/>
                    </div>
                    <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Marcar como enviada</p>
                  </div>
                  <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 38px'}}>
                    El PDF fue generado y enviado a la aseguradora. La solicitud quedará en espera de respuesta.
                  </p>
                </div>
              </div>
            )}

            {/* ── Opciones para estado "enviada" ── */}
            {poliza.estado === 'enviada' && (
              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'20px'}}>

                {/* Opción: Emitir */}
                <div onClick={()=>setEstadoOpcion(estadoOpcion==='emitir'?null:'emitir')}
                  style={{border:`2px solid ${estadoOpcion==='emitir'?'#16a34a':'#e2e8f0'}`,borderRadius:'12px',
                    padding:'16px',cursor:'pointer',background:estadoOpcion==='emitir'?'#f0fdf4':'white',transition:'all 0.15s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',
                      background:estadoOpcion==='emitir'?'#16a34a':'#f1f5f9',
                      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <CheckCircle size={15} color={estadoOpcion==='emitir'?'white':'#94a3b8'}/>
                    </div>
                    <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Emitir póliza</p>
                  </div>
                  <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 38px'}}>
                    La aseguradora aprobó la solicitud y asignó un número de póliza.
                  </p>

                  {/* Subformulario inline */}
                  {estadoOpcion === 'emitir' && (
                    <div style={{marginTop:'16px',paddingTop:'16px',borderTop:'1px solid #dcfce7'}}
                      onClick={e=>e.stopPropagation()}>
                      <div style={{marginBottom:'12px'}}>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'6px'}}>
                          Número de póliza *
                        </label>
                        <input value={emitirForm.numero_poliza}
                          onChange={e=>setEmitirForm({...emitirForm,numero_poliza:e.target.value})}
                          placeholder="Ej: POL-2025-001234" autoFocus
                          style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:'8px',
                            fontSize:'14px',background:'white',color:'#1e293b',boxSizing:'border-box'}}/>
                      </div>
                      <div style={{marginBottom:'12px'}}>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'6px'}}>
                          PDF de la póliza <span style={{fontWeight:400,color:'#94a3b8'}}>(opcional)</span>
                        </label>
                        <label style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 14px',
                          border:'1.5px dashed #e2e8f0',borderRadius:'8px',cursor:'pointer',
                          background:emitirPdfFile?'#f0fdf4':'white'}}>
                          <Upload size={15} color={emitirPdfFile?'#15803d':'#94a3b8'}/>
                          <span style={{fontSize:'13px',color:emitirPdfFile?'#15803d':'#94a3b8'}}>
                            {emitirPdfFile ? emitirPdfFile.name : 'Seleccionar PDF...'}
                          </span>
                          <input type="file" accept=".pdf" style={{display:'none'}}
                            onChange={e=>setEmitirPdfFile(e.target.files[0]||null)}/>
                        </label>
                      </div>
                      <div style={{marginBottom:'12px'}}>
                        <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'6px'}}>
                          Método de pago <span style={{fontWeight:400,color:'#94a3b8'}}>(opcional)</span>
                        </label>
                        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                          {[['tarjeta','Tarjeta asociada'],['deposito','Depósito'],['transferencia','Transferencia'],['cheque','Cheque']].map(([val,lbl])=>(
                            <button key={val} type="button"
                              onClick={()=>setEmitirForm({...emitirForm, metodo_pago: emitirForm.metodo_pago===val ? '' : val})}
                              style={{padding:'7px 12px',borderRadius:'8px',fontSize:'12px',fontWeight:500,cursor:'pointer',
                                background:emitirForm.metodo_pago===val?'#111111':'white',
                                color:emitirForm.metodo_pago===val?'white':'#374151',
                                border:`1.5px solid ${emitirForm.metodo_pago===val?'#111111':'#e2e8f0'}`}}>
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{background:'#eff6ff',borderRadius:'8px',padding:'10px 12px',display:'flex',gap:'8px'}}>
                        <CheckCircle size={13} color='#1d4ed8' style={{flexShrink:0,marginTop:'1px'}}/>
                        <div style={{fontSize:'12px',color:'#1d4ed8'}}>
                          <p style={{margin:'0 0 2px',fontWeight:600}}>Se creará automáticamente:</p>
                          <p style={{margin:0}}>· Primera emisión ({poliza.fecha_inicio?new Date(poliza.fecha_inicio).toLocaleDateString('es-GT'):'—'} → {vencDate?new Date(poliza.fecha_vencimiento).toLocaleDateString('es-GT'):'—'})</p>
                          {solicitudVehiculos.length>0&&<p style={{margin:0}}>· {solicitudVehiculos.length} vehículo(s) asignados</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Opción: En reproceso */}
                <div onClick={()=>setEstadoOpcion(estadoOpcion==='reproceso'?null:'reproceso')}
                  style={{border:`2px solid ${estadoOpcion==='reproceso'?'#dc2626':'#e2e8f0'}`,borderRadius:'12px',
                    padding:'16px',cursor:'pointer',background:estadoOpcion==='reproceso'?'#fef2f2':'white',transition:'all 0.15s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',
                      background:estadoOpcion==='reproceso'?'#dc2626':'#f1f5f9',
                      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <RefreshCw size={13} color={estadoOpcion==='reproceso'?'white':'#94a3b8'}/>
                    </div>
                    <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Marcar en reproceso</p>
                  </div>
                  <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 38px'}}>
                    La aseguradora solicitó correcciones. Se podrá editar la solicitud y generar un nuevo PDF.
                  </p>
                </div>

              </div>
            )}

            {/* ── Opción para estado "en_reproceso" ── */}
            {poliza.estado === 'en_reproceso' && (
              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'20px'}}>
                <div onClick={()=>setEstadoOpcion('reenviar')}
                  style={{border:`2px solid ${estadoOpcion==='reenviar'?'#C4A96B':'#e2e8f0'}`,borderRadius:'12px',
                    padding:'16px',cursor:'pointer',background:estadoOpcion==='reenviar'?'#FDF8EE':'white',transition:'all 0.15s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',
                      background:estadoOpcion==='reenviar'?'#C4A96B':'#f1f5f9',
                      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <SendHorizonal size={13} color={estadoOpcion==='reenviar'?'white':'#94a3b8'}/>
                    </div>
                    <p style={{fontWeight:700,fontSize:'14px',color:'#111111',margin:0}}>Re-enviar a aseguradora</p>
                  </div>
                  <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 0 38px'}}>
                    Las correcciones fueron aplicadas y el PDF actualizado está listo para reenvío.
                  </p>
                </div>
              </div>
            )}

            {/* Acciones del modal */}
            <div style={{display:'flex',gap:'10px'}}>
              <button
                disabled={!estadoOpcion || (estadoOpcion==='emitir' && !emitirForm.numero_poliza) || uploadingPdf}
                onClick={async()=>{
                  if (estadoOpcion === 'enviar') {
                    await avanzarEstado()
                    setShowCambiarEstadoModal(false)
                  } else if (estadoOpcion === 'emitir') {
                    await handleEmitir({ preventDefault: ()=>{} })
                    setShowCambiarEstadoModal(false)
                  } else if (estadoOpcion === 'reproceso') {
                    await marcarEnReproceso()
                    setShowCambiarEstadoModal(false)
                  } else if (estadoOpcion === 'reenviar') {
                    await avanzarEstado()
                    setShowCambiarEstadoModal(false)
                  }
                }}
                style={{flex:1,padding:'11px',
                  background: !estadoOpcion||uploadingPdf ? '#e2e8f0'
                    : estadoOpcion==='emitir' ? '#16a34a'
                    : estadoOpcion==='reproceso' ? '#dc2626'
                    : '#111111',
                  color: (!estadoOpcion||uploadingPdf) ? '#94a3b8' : 'white',
                  border:'none',borderRadius:'9px',fontSize:'14px',fontWeight:700,
                  cursor: !estadoOpcion||uploadingPdf ? 'not-allowed' : 'pointer',transition:'all 0.15s'}}>
                {uploadingPdf ? 'Procesando...'
                  : estadoOpcion==='enviar' ? 'Confirmar envío'
                  : estadoOpcion==='emitir' ? '✓ Confirmar emisión'
                  : estadoOpcion==='reproceso' ? 'Confirmar reproceso'
                  : estadoOpcion==='reenviar' ? 'Confirmar re-envío'
                  : 'Selecciona una opción'}
              </button>
              <button onClick={()=>setShowCambiarEstadoModal(false)}
                style={{padding:'11px 20px',background:'white',color:'#64748b',
                  border:'1px solid #e2e8f0',borderRadius:'9px',fontSize:'14px',cursor:'pointer'}}>
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Tarea detail / edit modal ──────────────────────────────────── */
function TareaDetailModal({ tarea, usuarios, onClose, onSaved }) {
  const [titulo, setTitulo]       = useState(tarea.titulo || '')
  const [descripcion, setDesc]    = useState(tarea.descripcion || '')
  const [fechaVenc, setFechaVenc] = useState(tarea.fecha_vencimiento || '')
  const [asignadoA, setAsignadoA] = useState(tarea.asignado_a || '')
  const [saving, setSaving]       = useState(false)

  const inp = {width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',background:'white',color:'#1e293b',boxSizing:'border-box',outline:'none'}
  const lbl = {display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('tareas').update({ titulo, descripcion:descripcion||null, fecha_vencimiento:fechaVenc||null, asignado_a:asignadoA||null }).eq('id', tarea.id)
    toast.success('Tarea actualizada')
    onSaved()
  }

  const handleToggleEstado = async () => {
    const nuevoEstado = tarea.estado === 'pendiente' ? 'completada' : 'pendiente'
    await supabase.from('tareas').update({ estado: nuevoEstado, fecha_completada: nuevoEstado==='completada' ? new Date().toISOString() : null }).eq('id', tarea.id)
    toast.success(nuevoEstado==='completada' ? 'Tarea completada ✓' : 'Tarea reabierta')
    onSaved()
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta tarea?')) return
    await supabase.from('tareas').delete().eq('id', tarea.id)
    toast.success('Tarea eliminada')
    onSaved()
  }

  const vencida = tarea.estado==='pendiente' && tarea.fecha_vencimiento && new Date(tarea.fecha_vencimiento+'T12:00:00') < new Date()

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'16px',width:'100%',maxWidth:'480px',boxShadow:'0 20px 60px rgba(0,0,0,0.25)',overflow:'hidden'}}>

        {/* Header */}
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'22px',height:'22px',borderRadius:'6px',border:'2px solid '+(tarea.estado==='completada'?'#22c55e':vencida?'#ef4444':'#e2e8f0'),background:tarea.estado==='completada'?'#22c55e':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              {tarea.estado==='completada' && <Check size={12} color='white' />}
            </div>
            <h3 style={{fontSize:'16px',fontWeight:700,color:'#111111',margin:0}}>
              {tarea.estado==='completada' ? 'Tarea completada' : vencida ? '⚠️ Tarea vencida' : 'Detalle de tarea'}
            </h3>
          </div>
          <button onClick={onClose} style={{background:'#f1f5f9',border:'none',borderRadius:'8px',width:'30px',height:'30px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <X size={14} color='#64748b' />
          </button>
        </div>

        {/* Body */}
        <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:'14px'}}>
          <div>
            <label style={lbl}>Título</label>
            <input value={titulo} onChange={e=>setTitulo(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Descripción</label>
            <textarea value={descripcion} onChange={e=>setDesc(e.target.value)} rows={3} placeholder='Sin descripción...'
              style={{...inp,resize:'vertical',minHeight:'72px',fontFamily:'inherit'}} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div>
              <label style={lbl}>Asignado a</label>
              <select value={asignadoA} onChange={e=>setAsignadoA(e.target.value)} style={inp}>
                <option value=''>Sin asignar</option>
                {usuarios.map(u=>(
                  <option key={u.id} value={u.id}>{u.nombre||u.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Fecha límite</label>
              <input type='date' value={fechaVenc} onChange={e=>setFechaVenc(e.target.value)} style={inp} />
            </div>
          </div>

          {/* Metadata */}
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            <span style={{fontSize:'11px',padding:'3px 9px',borderRadius:'20px',background:tarea.tipo==='automatica'?'#dbeafe':'#f0fdf4',color:tarea.tipo==='automatica'?'#1d4ed8':'#15803d'}}>
              {tarea.tipo==='automatica'?'Automática':'Manual'}
            </span>
            <span style={{fontSize:'11px',padding:'3px 9px',borderRadius:'20px',background:tarea.estado==='completada'?'#dcfce7':'vencida'?'#fef2f2':'#f1f5f9',color:tarea.estado==='completada'?'#15803d':vencida?'#ef4444':'#64748b'}}>
              {tarea.estado==='completada'?'Completada':vencida?'Vencida':'Pendiente'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:'14px 20px',borderTop:'1px solid #f1f5f9',display:'flex',gap:'8px',justifyContent:'space-between'}}>
          <button onClick={handleDelete}
            style={{padding:'9px 14px',background:'#fef2f2',color:'#ef4444',border:'1px solid #fecaca',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontWeight:500}}>
            Eliminar
          </button>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={handleToggleEstado}
              style={{padding:'9px 14px',background:tarea.estado==='completada'?'#f1f5f9':'#dcfce7',color:tarea.estado==='completada'?'#64748b':'#15803d',border:'none',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontWeight:600}}>
              {tarea.estado==='completada'?'Reabrir':'✓ Completar'}
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{padding:'9px 18px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
              {saving?'Guardando...':'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Nueva tarea en póliza modal ────────────────────────────────── */
function NuevaTareaPolizaModal({ polizaId, usuarios, onClose, onSaved }) {
  const [titulo, setTitulo]       = useState('')
  const [descripcion, setDesc]    = useState('')
  const [fechaVenc, setFechaVenc] = useState('')
  const [asignadoA, setAsignadoA] = useState('')
  const [saving, setSaving]       = useState(false)


  const inp = {width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',background:'white',color:'#1e293b',boxSizing:'border-box',outline:'none'}
  const lbl = {display:'block',fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'5px'}

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: myRow } = await supabase.from('users').select('empresa_id').eq('id', user.id).single()
    const { data: inserted } = await supabase.from('tareas').insert({
      titulo, descripcion:descripcion||null, tipo:'manual', estado:'pendiente',
      fecha_vencimiento:fechaVenc||null,
      asignado_a:asignadoA||null,
      created_by:user.id,
      poliza_id:polizaId,
      empresa_id:myRow?.empresa_id||null,
    }).select().single()
    if (inserted && asignadoA && asignadoA !== user.id) {
      notifyTaskAssigned({ taskId: inserted.id, titulo, descripcion, fechaVencimiento: fechaVenc || null, asignadoAId: asignadoA, creadoPorId: user.id })
    }
    toast.success('Tarea creada')
    onSaved()
  }

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'16px',width:'100%',maxWidth:'460px',boxShadow:'0 20px 60px rgba(0,0,0,0.25)',overflow:'hidden'}}>

        <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h3 style={{fontSize:'16px',fontWeight:700,color:'#111111',margin:0}}>Nueva tarea</h3>
          <button onClick={onClose} style={{background:'#f1f5f9',border:'none',borderRadius:'8px',width:'30px',height:'30px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <X size={14} color='#64748b' />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:'14px'}}>
            <div>
              <label style={lbl}>Título *</label>
              <input value={titulo} onChange={e=>setTitulo(e.target.value)} required placeholder='Ej: Llamar al cliente para renovación' style={inp} />
            </div>
            <div>
              <label style={lbl}>Descripción</label>
              <textarea value={descripcion} onChange={e=>setDesc(e.target.value)} rows={3} placeholder='Detalles adicionales...'
                style={{...inp,resize:'vertical',minHeight:'72px',fontFamily:'inherit'}} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div>
                <label style={lbl}>Asignado a</label>
                <select value={asignadoA} onChange={e=>setAsignadoA(e.target.value)} style={inp}>
                  <option value=''>Sin asignar</option>
                  {usuarios.map(u=>(
                    <option key={u.id} value={u.id}>{u.nombre||u.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Fecha límite</label>
                <input type='date' value={fechaVenc} onChange={e=>setFechaVenc(e.target.value)} style={inp} />
              </div>
            </div>
          </div>
          <div style={{padding:'14px 20px',borderTop:'1px solid #f1f5f9',display:'flex',gap:'8px'}}>
            <button type='submit' disabled={saving}
              style={{flex:1,padding:'11px',background:'#111111',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
              {saving?'Creando...':'Crear tarea'}
            </button>
            <button type='button' onClick={onClose}
              style={{padding:'11px 18px',background:'white',color:'#64748b',border:'1.5px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',cursor:'pointer'}}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

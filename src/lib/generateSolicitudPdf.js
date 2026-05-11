import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/* ── Brand tokens ── */
const GOLD    = [196, 169, 107]   // #C4A96B
const BLACK   = [17,  17,  17]    // #111111
const WHITE   = [255, 255, 255]
const GRAY    = [107, 107, 98]    // #6B6B62
const LIGHT   = [245, 244, 242]   // #F5F4F2
const BORDER  = [226, 232, 240]   // #e2e8f0

const fmt = (v) => v || '—'
const fmtQ = (v) => v ? `Q ${parseFloat(v).toLocaleString('es-GT', { minimumFractionDigits: 2 })}` : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-GT') : '—'

function calcNumeroPagos(poliza) {
  if (poliza.tipo_pago === 'contado') return 1
  const inicio = new Date(poliza.fecha_inicio)
  const fin    = new Date(poliza.fecha_vencimiento)
  const meses  = (fin.getFullYear() - inicio.getFullYear()) * 12 + (fin.getMonth() - inicio.getMonth())
  const frac   = poliza.fraccionamiento
  if (frac === 'mensual')    return meses
  if (frac === 'trimestral') return Math.round(meses / 3)
  if (frac === 'semestral')  return Math.round(meses / 6)
  return 1
}

const fracLabel = {
  mensual:    'Mensual',
  trimestral: 'Trimestral',
  semestral:  'Semestral',
}

/* ── Load image as base64 data URL ── */
async function loadDataUrl(src) {
  try {
    const res = await fetch(src)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

/* ─────────────────────────────────────────────────── */
export async function generateSolicitudPdf({ poliza, vehiculos, personaFacturable, usuario }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()   // 210
  const margin = 14
  let y = 0

  // Pre-load logo (PNG icon — symbol only, white background friendly)
  const logoDataUrl = await loadDataUrl('/icon-192.png')

  /* ── Helper: section table ── */
  function sectionTable(title, rows, startY) {
    // Section header bar
    doc.setFillColor(...GOLD)
    doc.rect(margin, startY, W - margin * 2, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BLACK)
    doc.text(title, W / 2, startY + 4.8, { align: 'center' })

    autoTable(doc, {
      startY: startY + 7,
      margin: { left: margin, right: margin },
      body: rows,
      columns: [{ dataKey: 'label' }, { dataKey: 'value' }],
      columnStyles: {
        0: { cellWidth: 58, fontStyle: 'bold', fontSize: 8, textColor: BLACK, fillColor: LIGHT, cellPadding: { top: 2.8, bottom: 2.8, left: 4, right: 3 } },
        1: { fontSize: 8, textColor: BLACK, fillColor: WHITE, cellPadding: { top: 2.8, bottom: 2.8, left: 4, right: 4 } },
      },
      theme: 'grid',
      styles: { lineColor: BORDER, lineWidth: 0.2, overflow: 'linebreak' },
      showHead: false,
    })

    return doc.lastAutoTable.finalY + 5
  }

  /* ══════════════ PAGE HEADER ══════════════ */
  const HEADER_H = 30

  // Black top bar
  doc.setFillColor(...BLACK)
  doc.rect(0, 0, W, HEADER_H, 'F')

  // Gold left accent stripe
  doc.setFillColor(...GOLD)
  doc.rect(0, 0, 4, HEADER_H, 'F')

  // GGS logo image — PNG icon (symbol: two circles + square)
  // icon-192.png is 368×178px → ratio ≈ 2.068
  const logoW = 22, logoH = logoW / (368 / 178)   // 22 × 10.6 mm
  const logoX = 8
  const logoY = (HEADER_H - logoH) / 2             // vertically centred
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoW, logoH)
  }

  // Company name + tagline (right of logo)
  const textX = logoX + logoW + 3
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...WHITE)
  doc.text('GRUPO GLOBAL EN SEGUROS', textX, HEADER_H / 2 + 0.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...GOLD)
  doc.text('TÚ CREA, NOSOTROS TE CUIDAMOS', textX, HEADER_H / 2 + 5.5)

  // Document title (right-aligned)
  const solNum = poliza.numero_poliza || `SOL-${poliza.numero_solicitud || '?'}`
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...WHITE)
  doc.text('SOLICITUD SEGURO DE VEHÍCULOS', W - margin, HEADER_H / 2 - 0.5, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GOLD)
  doc.text(`${solNum}  ·  ${fmtDate(new Date())}`, W - margin, HEADER_H / 2 + 5, { align: 'right' })

  y = HEADER_H + 6

  /* ══════════════ DATOS DE AGENTE ══════════════ */
  y = sectionTable('DATOS DE AGENTE', [
    { label: 'Código de agente', value: '2128' },
    { label: 'Nombre de agente', value: 'GRUPO GLOBAL EN SEGUROS, S.A.' },
  ], y)

  /* ══════════════ DATOS DEL CLIENTE ══════════════ */
  const cli = poliza.clientes || {}
  const nombreCliente = [cli.nombre, cli.apellido].filter(Boolean).join(' ').toUpperCase()
  y = sectionTable('DATOS DEL CLIENTE', [
    { label: 'Nombre completo',   value: fmt(nombreCliente) },
    { label: 'DPI',               value: fmt(cli.dpi) },
    { label: 'Fecha de nacimiento', value: fmtDate(cli.fecha_nacimiento) },
    { label: 'Dirección',         value: fmt(cli.direccion) },
    { label: 'NIT',               value: fmt(cli.nit) },
    { label: 'Teléfono / Celular',value: fmt(cli.telefono) },
    { label: 'Email',             value: fmt(cli.email) },
  ], y)

  /* ══════════════ RESPONSABLE DE PAGO (si aplica) ══════════════ */
  if (personaFacturable) {
    const pf = personaFacturable
    y = sectionTable('COMPLETAR SOLO SI EL RESPONSABLE DE PAGO ES DISTINTO', [
      { label: 'NIT',       value: fmt(pf.nit) },
      { label: 'Nombre',    value: fmt([pf.nombre, pf.apellido].filter(Boolean).join(' ')) },
      { label: 'Dirección', value: fmt(pf.direccion) },
    ], y)
  }

  /* ══════════════ VEHÍCULOS (una tabla por vehículo) ══════════════ */
  const vList = vehiculos.length > 0
    ? vehiculos.map(sv => sv.vehiculos || sv)
    : []

  for (const v of vList) {
    // New page if not enough space
    if (y > 220) { doc.addPage(); y = 14 }

    const placa = v.tipo_placa ? `${v.tipo_placa}${v.placa || ''}` : (v.placa || '—')
    y = sectionTable('DESCRIPCIÓN DEL VEHÍCULO', [
      { label: 'Marca',            value: fmt(v.marca?.toUpperCase()) },
      { label: 'Línea / Modelo',   value: fmt(v.modelo?.toUpperCase()) },
      { label: 'Año',              value: fmt(v.anio) },
      { label: 'Placa',            value: fmt(placa.toUpperCase()) },
      { label: 'No. de Chasis',    value: fmt(v.chasis?.toUpperCase()) },
      { label: 'No. de Motor',     value: fmt(v.motor?.toUpperCase()) },
      { label: 'Color',            value: fmt(v.color?.toUpperCase()) },
      { label: 'Valor del vehículo', value: fmtQ(v.valor_asegurado) },
    ], y)
  }

  if (vList.length === 0) {
    y = sectionTable('DESCRIPCIÓN DEL VEHÍCULO', [
      { label: 'Vehículo', value: 'Sin vehículos registrados en esta solicitud' },
    ], y)
  }

  /* ══════════════ INFORMACIÓN DE PAGO ══════════════ */
  const numPagos = calcNumeroPagos(poliza)
  const frecLabel = poliza.tipo_pago === 'contado'
    ? 'Contado'
    : fracLabel[poliza.fraccionamiento] || poliza.fraccionamiento || '—'

  y = sectionTable('INFORMACIÓN DE PAGO', [
    { label: 'Prima total (plan elegido)', value: fmtQ(poliza.prima_total) },
    { label: 'Tipo de pago',               value: poliza.tipo_pago === 'contado' ? 'Contado' : `Financiado · ${frecLabel}` },
    { label: 'Frecuencia de pago',         value: frecLabel },
    { label: 'No. de pagos',               value: String(numPagos) },
    { label: 'Vigencia',                   value: `${fmtDate(poliza.fecha_inicio)} — ${fmtDate(poliza.fecha_vencimiento)}` },
  ], y)

  /* ══════════════ FECHA / REALIZADO POR ══════════════ */
  if (y > 250) { doc.addPage(); y = 14 }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      [
        { content: `Fecha: ${fmtDate(new Date())}`, styles: { fontStyle: 'bold' } },
        { content: `Realizado por: ${fmt(usuario)}`, styles: { fontStyle: 'bold' } },
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 8, textColor: BLACK, lineColor: BORDER, lineWidth: 0.2, cellPadding: 3 },
    columnStyles: {
      0: { fillColor: LIGHT },
      1: { fillColor: LIGHT },
    },
    showHead: false,
  })

  y = doc.lastAutoTable.finalY + 10

  /* ══════════════ FOOTER ══════════════ */
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pageH = doc.internal.pageSize.getHeight()
    doc.setFillColor(...GOLD)
    doc.rect(0, pageH - 10, W, 10, 'F')
    doc.setFont('helvetica', 'bolditalic')
    doc.setFontSize(8)
    doc.setTextColor(...BLACK)
    doc.text('TÚ CREA, NOSOTROS TE CUIDAMOS', W / 2, pageH - 4, { align: 'center' })
    if (pageCount > 1) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...BLACK)
      doc.text(`Página ${i} / ${pageCount}`, W - margin, pageH - 4, { align: 'right' })
    }
  }

  /* ── Save ── */
  const filename = `Solicitud_${solNum}_${cli.apellido || 'cliente'}.pdf`.replace(/\s+/g, '_')
  doc.save(filename)
}

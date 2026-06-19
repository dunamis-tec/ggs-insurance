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
  return poliza.numero_cuotas || 1
}

/* ── Render GGS symbol SVG → PNG data URL (transparent background) ── */
async function buildLogoDataUrl() {
  try {
    // Inline SVG — symbol only (no wordmark), transparent bg, gold strokes
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 490 265">
      <circle cx="115" cy="140" r="108" fill="none" stroke="#C4A96B" stroke-width="10.5"/>
      <circle cx="268" cy="140" r="108" fill="none" stroke="#C4A96B" stroke-width="10.5"/>
      <rect x="328" y="32" width="140" height="216" fill="none" stroke="#C4A96B" stroke-width="10.5"/>
      <text x="115" y="145" text-anchor="middle" dominant-baseline="central"
            font-family="Arial,Helvetica,sans-serif" font-size="98" font-weight="300" fill="#C4A96B">G</text>
      <text x="268" y="145" text-anchor="middle" dominant-baseline="central"
            font-family="Arial,Helvetica,sans-serif" font-size="98" font-weight="300" fill="#C4A96B">G</text>
      <text x="398" y="145" text-anchor="middle" dominant-baseline="central"
            font-family="Arial,Helvetica,sans-serif" font-size="98" font-weight="300" fill="#C4A96B">S</text>
    </svg>`
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(blob)
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const scale = 4   // high-res for print
        const canvas = document.createElement('canvas')
        canvas.width  = 490 * scale
        canvas.height = 265 * scale
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(svgUrl)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => { URL.revokeObjectURL(svgUrl); resolve(null) }
      img.src = svgUrl
    })
  } catch { return null }
}

/* ─────────────────────────────────────────────────── */
export async function generateSolicitudPdf({ poliza, vehiculos, personaFacturable, usuario, coberturas }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()   // 210
  const margin = 14
  let y = 0

  // Build GGS logo as PNG with transparent background
  const logoDataUrl = await buildLogoDataUrl()

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

  // GGS logo — SVG symbol rendered as PNG, ratio 490:265 ≈ 1.849
  const logoH = 18
  const logoW = logoH * (490 / 265)                // 18 × 33.3 mm
  const logoX = 8
  const logoY = (HEADER_H - logoH) / 2             // vertically centred in bar
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoW, logoH)
  }

  // Company name + tagline (right of logo)
  const textX = logoX + logoW + 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...WHITE)
  doc.text('GRUPO GLOBAL EN SEGUROS', textX, HEADER_H / 2 + 0.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...GOLD)
  doc.text('CUIDAR ES AMAR', textX, HEADER_H / 2 + 5.5)

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
    { label: 'Código de agente', value: fmt(poliza.aseguradoras?.codigo_agente) },
    { label: 'Nombre de agente', value: 'GRUPO GLOBAL EN SEGUROS, S.A.' },
  ], y)

  /* ══════════════ DATOS DE LA PÓLIZA ══════════════ */
  y = sectionTable('DATOS DE LA PÓLIZA', [
    { label: 'Aseguradora', value: fmt(poliza.aseguradoras?.nombre) },
    { label: 'Producto',    value: fmt(poliza.productos?.nombre) },
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
    { label: '¿Es o ha sido PEP (últimos 2 años)?',             value: cli.pep            === true ? 'Sí' : cli.pep            === false ? 'No' : 'No indicado' },
    { label: '¿Tiene parentesco o relación con un PEP?',        value: cli.pep_parentesco === true ? 'Sí' : cli.pep_parentesco === false ? 'No' : 'No indicado' },
    { label: '¿Es o ha sido CPE (Contratista/Proveedor Estado)?', value: cli.cpe          === true ? 'Sí' : cli.cpe          === false ? 'No' : 'No indicado' },
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
    ? vehiculos.map(sv => ({
        ...(sv.vehiculos || sv),
        prima_neta: sv.prima_neta,
        monto_gasto_emision: sv.monto_gasto_emision,
        monto_recargo: sv.monto_recargo,
        monto_iva: sv.monto_iva,
        prima_total: sv.prima_total,
        deducible_danios: sv.deducible_danios,
        deducible_robo: sv.deducible_robo,
      }))
    : []

  for (const v of vList) {
    if (y > 200) { doc.addPage(); y = 14 }

    const placa = v.tipo_placa ? `${v.tipo_placa}${v.placa || ''}` : (v.placa || '—')
    const hasPrima = parseFloat(v.prima_total || 0) > 0

    // Build unified body: vehicle rows + optional prima separator + prima rows
    const bodyRows = [
      [{ content: 'Marca',              styles: { fontStyle:'bold', fillColor:LIGHT } }, fmt(v.marca?.toUpperCase())],
      [{ content: 'Línea / Modelo',     styles: { fontStyle:'bold', fillColor:LIGHT } }, fmt(v.modelo?.toUpperCase())],
      [{ content: 'Año',                styles: { fontStyle:'bold', fillColor:LIGHT } }, fmt(v.anio)],
      [{ content: 'Placa',              styles: { fontStyle:'bold', fillColor:LIGHT } }, fmt(placa.toUpperCase())],
      [{ content: 'No. de Chasis',      styles: { fontStyle:'bold', fillColor:LIGHT } }, fmt(v.chasis?.toUpperCase())],
      [{ content: 'No. de Motor',       styles: { fontStyle:'bold', fillColor:LIGHT } }, fmt(v.motor?.toUpperCase())],
      [{ content: 'Color',              styles: { fontStyle:'bold', fillColor:LIGHT } }, fmt(v.color?.toUpperCase())],
      [{ content: 'Valor del vehículo', styles: { fontStyle:'bold', fillColor:LIGHT } }, fmtQ(v.valor_asegurado)],
    ]

    if (hasPrima) {
      bodyRows.push([{
        content: 'PRIMA DEL VEHÍCULO',
        colSpan: 2,
        styles: { fillColor: GOLD, textColor: BLACK, fontStyle: 'bold', halign: 'center', fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      }])
      bodyRows.push([{ content: 'Prima neta',            styles: { fontStyle:'bold', fillColor:LIGHT } }, { content: fmtQ(v.prima_neta),            styles: { halign:'right' } }])
      bodyRows.push([{ content: 'Gastos de emisión',     styles: { fontStyle:'bold', fillColor:LIGHT } }, { content: fmtQ(v.monto_gasto_emision),   styles: { halign:'right' } }])
      if (parseFloat(v.monto_recargo || 0) > 0) {
        bodyRows.push([{ content: 'Recargo fraccionamiento', styles: { fontStyle:'bold', fillColor:LIGHT } }, { content: fmtQ(v.monto_recargo), styles: { halign:'right' } }])
      }
      bodyRows.push([{ content: 'IVA 12%',               styles: { fontStyle:'bold', fillColor:LIGHT } }, { content: fmtQ(v.monto_iva),             styles: { halign:'right' } }])
      bodyRows.push([
        { content: 'Prima total', styles: { fontStyle:'bold', fillColor:[235,225,200], textColor:BLACK } },
        { content: fmtQ(v.prima_total), styles: { fontStyle:'bold', fillColor:[235,225,200], textColor:BLACK, halign:'right' } },
      ])
    }

    const hasDed = parseFloat(v.deducible_danios||0) > 0 || parseFloat(v.deducible_robo||0) > 0
    if (hasDed) {
      bodyRows.push([{
        content: 'DEDUCIBLES',
        colSpan: 2,
        styles: { fillColor: [80,80,80], textColor: [255,255,255], fontStyle: 'bold', halign: 'center', fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      }])
      if (parseFloat(v.deducible_danios||0) > 0)
        bodyRows.push([{ content: 'Deducible daños', styles: { fontStyle:'bold', fillColor:LIGHT } }, { content: `${parseFloat(v.deducible_danios)}%`, styles: { halign:'right' } }])
      if (parseFloat(v.deducible_robo||0) > 0)
        bodyRows.push([{ content: 'Deducible robo', styles: { fontStyle:'bold', fillColor:LIGHT } }, { content: `${parseFloat(v.deducible_robo)}%`, styles: { halign:'right' } }])
    }

    // Section header bar
    doc.setFillColor(...GOLD)
    doc.rect(margin, y, W - margin * 2, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BLACK)
    doc.text('DESCRIPCIÓN DEL VEHÍCULO', W / 2, y + 4.8, { align: 'center' })

    autoTable(doc, {
      startY: y + 7,
      margin: { left: margin, right: margin },
      body: bodyRows,
      columnStyles: {
        0: { cellWidth: 58, fontSize: 8, textColor: BLACK, cellPadding: { top: 2.8, bottom: 2.8, left: 4, right: 3 } },
        1: { fontSize: 8, textColor: BLACK, fillColor: WHITE, cellPadding: { top: 2.8, bottom: 2.8, left: 4, right: 4 } },
      },
      theme: 'grid',
      styles: { lineColor: BORDER, lineWidth: 0.2, overflow: 'linebreak' },
      showHead: false,
    })
    y = doc.lastAutoTable.finalY + 6
  }

  if (vList.length === 0) {
    y = sectionTable('DESCRIPCIÓN DEL VEHÍCULO', [
      { label: 'Vehículo', value: 'Sin vehículos registrados en esta solicitud' },
    ], y)
  }

  /* ══════════════ OBSERVACIONES ══════════════ */
  if (poliza.observaciones) {
    y = sectionTable('OBSERVACIONES', [
      { label: 'Observaciones', value: fmt(poliza.observaciones) },
    ], y)
  }

  /* ══════════════ INFORMACIÓN DE PAGO ══════════════ */
  const numPagos = calcNumeroPagos(poliza)

  y = sectionTable('INFORMACIÓN DE PAGO', [
    { label: 'Prima total (plan elegido)', value: fmtQ(poliza.prima_total) },
    { label: 'Tipo de pago',               value: poliza.tipo_pago === 'contado' ? 'Contado' : 'Fraccionado' },
    { label: 'Frecuencia de pago',         value: poliza.tipo_pago === 'contado' ? 'Pago único' : 'Mensual' },
    { label: 'No. de cuotas',              value: String(numPagos) },
    { label: 'Vigencia',                   value: `${fmtDate(poliza.fecha_inicio)} — ${fmtDate(poliza.fecha_vencimiento)}` },
  ], y)

  /* ══════════════ COBERTURAS ══════════════ */
  if (coberturas && coberturas.length > 0) {
    if (y > 200) { doc.addPage(); y = 14 }

    doc.setFillColor(...GOLD)
    doc.rect(margin, y, W - margin * 2, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BLACK)
    doc.text('COBERTURAS', W / 2, y + 4.8, { align: 'center' })

    autoTable(doc, {
      startY: y + 7,
      margin: { left: margin, right: margin },
      head: [['Cobertura', 'Monto']],
      body: coberturas.map(c => [c.nombre || '—', c.monto ? fmtQ(c.monto) : 'Incluida']),
      columnStyles: {
        0: { fontSize: 8, textColor: BLACK, fillColor: WHITE, cellPadding: { top: 2.8, bottom: 2.8, left: 4, right: 3 } },
        1: { fontSize: 8, textColor: BLACK, fillColor: LIGHT, cellPadding: { top: 2.8, bottom: 2.8, left: 4, right: 4 }, halign: 'right' },
      },
      headStyles: { fillColor: LIGHT, textColor: BLACK, fontSize: 8, fontStyle: 'bold' },
      theme: 'grid',
      styles: { lineColor: BORDER, lineWidth: 0.2, overflow: 'linebreak' },
    })

    y = doc.lastAutoTable.finalY + 5
  }

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
    doc.text('CUIDAR ES AMAR', W / 2, pageH - 4, { align: 'center' })
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

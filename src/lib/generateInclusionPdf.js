import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/* ── Brand tokens ── */
const GOLD    = [196, 169, 107]
const BLACK   = [17,  17,  17]
const WHITE   = [255, 255, 255]
const LIGHT   = [245, 244, 242]
const BORDER  = [226, 232, 240]

const fmt = (v) => v || '—'
const fmtQ = (v) => v ? `Q ${parseFloat(v).toLocaleString('es-GT', { minimumFractionDigits: 2 })}` : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-GT') : '—'


async function buildLogoDataUrl() {
  try {
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
        const scale = 4
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

/**
 * generateInclusionPdf
 * @param {object} opts
 * @param {object} opts.emision      — the emission record (inclusion/exclusion)
 * @param {object} opts.poliza       — the parent poliza (for header info + client)
 * @param {object[]} opts.vehiculos  — array of vehicle objects for this emission
 * @param {object|null} opts.personaFacturable
 * @param {string} opts.usuario      — user name string
 */
export async function generateInclusionPdf({ emision, poliza, vehiculos, personaFacturable, usuario }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const margin = 14
  let y = 0

  const isExclusion = emision.tipo === 'exclusion'
  const docTitle = isExclusion
    ? 'SOLICITUD DE EXCLUSIÓN DE VEHÍCULOS'
    : 'SOLICITUD DE INCLUSIÓN DE VEHÍCULOS'

  const logoDataUrl = await buildLogoDataUrl()

  function sectionTable(title, rows, startY) {
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

  /* ══ PAGE HEADER ══ */
  const HEADER_H = 30

  doc.setFillColor(...BLACK)
  doc.rect(0, 0, W, HEADER_H, 'F')

  doc.setFillColor(...GOLD)
  doc.rect(0, 0, 4, HEADER_H, 'F')

  const logoH = 18
  const logoW = logoH * (490 / 265)
  const logoX = 8
  const logoY = (HEADER_H - logoH) / 2
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoW, logoH)
  }

  const textX = logoX + logoW + 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...WHITE)
  doc.text('GRUPO GLOBAL EN SEGUROS', textX, HEADER_H / 2 + 0.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...GOLD)
  doc.text('TÚ CREA, NOSOTROS TE CUIDAMOS', textX, HEADER_H / 2 + 5.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...WHITE)
  doc.text(docTitle, W - margin, HEADER_H / 2 - 0.5, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GOLD)
  doc.text(`${emision.numero_emision}  ·  ${fmtDate(new Date())}`, W - margin, HEADER_H / 2 + 5, { align: 'right' })

  y = HEADER_H + 6

  /* ══ DATOS DE AGENTE ══ */
  y = sectionTable('DATOS DE AGENTE', [
    { label: 'Código de agente', value: '2128' },
    { label: 'Nombre de agente', value: 'GRUPO GLOBAL EN SEGUROS, S.A.' },
  ], y)

  /* ══ DATOS DE LA PÓLIZA ══ */
  y = sectionTable('DATOS DE LA PÓLIZA', [
    { label: 'No. de póliza',    value: fmt(poliza.numero_poliza) },
    { label: 'Aseguradora',      value: fmt(poliza.aseguradoras?.nombre) },
    { label: 'Producto',         value: fmt(poliza.productos?.nombre) },
    { label: 'No. de gestión',   value: fmt(emision.numero_emision) },
    { label: 'Tipo',             value: isExclusion ? 'Exclusión' : 'Inclusión' },
  ], y)

  /* ══ DATOS DEL CLIENTE ══ */
  const cli = poliza.clientes || {}
  const nombreCliente = [cli.nombre, cli.apellido].filter(Boolean).join(' ').toUpperCase()
  y = sectionTable('DATOS DEL CLIENTE', [
    { label: 'Nombre completo',    value: fmt(nombreCliente) },
    { label: 'DPI',                value: fmt(cli.dpi) },
    { label: 'Fecha de nacimiento', value: fmtDate(cli.fecha_nacimiento) },
    { label: 'Dirección',          value: fmt(cli.direccion) },
    { label: 'NIT',                value: fmt(cli.nit) },
    { label: 'Teléfono / Celular', value: fmt(cli.telefono) },
    { label: 'Email',              value: fmt(cli.email) },
  ], y)

  /* ══ RESPONSABLE DE PAGO (si aplica) ══ */
  if (personaFacturable) {
    const pf = personaFacturable
    y = sectionTable('COMPLETAR SOLO SI EL RESPONSABLE DE PAGO ES DISTINTO', [
      { label: 'NIT',       value: fmt(pf.nit) },
      { label: 'Nombre',    value: fmt([pf.nombre, pf.apellido].filter(Boolean).join(' ')) },
      { label: 'Dirección', value: fmt(pf.direccion) },
    ], y)
  }

  /* ══ VEHÍCULOS ══ */
  const vList = vehiculos || []

  for (const v of vList) {
    if (y > 220) { doc.addPage(); y = 14 }
    const placa = v.tipo_placa ? `${v.tipo_placa}${v.placa || ''}` : (v.placa || '—')
    const sectionTitle = isExclusion ? 'VEHÍCULO A EXCLUIR' : 'VEHÍCULO A INCLUIR'
    y = sectionTable(sectionTitle, [
      { label: 'Marca',              value: fmt(v.marca?.toUpperCase()) },
      { label: 'Línea / Modelo',     value: fmt(v.modelo?.toUpperCase()) },
      { label: 'Año',                value: fmt(v.anio) },
      { label: 'Placa',              value: fmt(placa.toUpperCase()) },
      { label: 'No. de Chasis',      value: fmt(v.chasis?.toUpperCase()) },
      { label: 'No. de Motor',       value: fmt(v.motor?.toUpperCase()) },
      { label: 'Color',              value: fmt(v.color?.toUpperCase()) },
      { label: 'Valor del vehículo', value: fmtQ(v.valor_asegurado) },
    ], y)
  }

  if (vList.length === 0) {
    y = sectionTable(isExclusion ? 'VEHÍCULO A EXCLUIR' : 'VEHÍCULO A INCLUIR', [
      { label: 'Vehículo', value: 'Sin vehículos registrados en esta gestión' },
    ], y)
  }

  /* ══ INFORMACIÓN DE PAGO ══ */
  if (!isExclusion) {
    const numCuotas = emision.tipo_pago === 'contado' ? 1 : (emision.numero_cuotas || 1)
    y = sectionTable('INFORMACIÓN DE PAGO', [
      { label: 'Prima de inclusión',   value: fmtQ(emision.prima_emision) },
      { label: 'Tipo de pago',         value: emision.tipo_pago === 'contado' ? 'Contado' : 'Financiado' },
      { label: 'No. de cuotas',        value: String(numCuotas) },
      { label: 'Frecuencia',           value: numCuotas === 1 ? 'Pago único' : 'Mensual' },
      { label: 'Vigencia inclusión',   value: `${fmtDate(emision.fecha_inicio)} — ${fmtDate(emision.fecha_fin)}` },
    ], y)
  } else {
    y = sectionTable('INFORMACIÓN DE EXCLUSIÓN', [
      { label: 'Prima de exclusión', value: fmtQ(emision.prima_emision) },
      { label: 'Fecha de exclusión', value: fmtDate(emision.fecha_inicio) },
    ], y)
  }

  /* ══ FECHA / REALIZADO POR ══ */
  if (y > 250) { doc.addPage(); y = 14 }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [[
      { content: `Fecha: ${fmtDate(new Date())}`, styles: { fontStyle: 'bold' } },
      { content: `Realizado por: ${fmt(usuario)}`, styles: { fontStyle: 'bold' } },
    ]],
    theme: 'grid',
    styles: { fontSize: 8, textColor: BLACK, lineColor: BORDER, lineWidth: 0.2, cellPadding: 3 },
    columnStyles: {
      0: { fillColor: LIGHT },
      1: { fillColor: LIGHT },
    },
    showHead: false,
  })

  /* ══ FOOTER ══ */
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
  const tipoSuffix = isExclusion ? 'Exclusion' : 'Inclusion'
  const apellido = cli.apellido || 'cliente'
  const filename = `${tipoSuffix}_${emision.numero_emision}_${apellido}.pdf`.replace(/\s+/g, '_')
  doc.save(filename)
}

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


async function loadLogoFromUrl(url) {
  if (!url) return null
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    const blob = await resp.blob()
    const dataUrl = await new Promise(resolve => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
    if (!dataUrl) return null
    const dims = await new Promise(resolve => {
      const img = new Image()
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = () => resolve({ w: 1, h: 1 })
      img.src = dataUrl
    })
    return { dataUrl, ...dims }
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
export async function generateInclusionPdf({ emision, poliza, vehiculos, personaFacturable, usuario, coberturas, logoUrl }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const margin = 14
  let y = 0

  const isExclusion = emision.tipo === 'exclusion'
  const docTitle = isExclusion
    ? 'SOLICITUD DE EXCLUSIÓN DE VEHÍCULOS'
    : 'SOLICITUD DE INCLUSIÓN DE VEHÍCULOS'

  const logoDataUrl = await loadLogoFromUrl(logoUrl)

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

  let logoW = 0, logoH = 0
  if (logoDataUrl) {
    const MAX_H = 22, MAX_W = 70
    const scale = Math.min(MAX_H / logoDataUrl.h, MAX_W / logoDataUrl.w)
    logoH = logoDataUrl.h * scale
    logoW = logoDataUrl.w * scale
    doc.addImage(logoDataUrl.dataUrl, 'PNG', 8, (HEADER_H - logoH) / 2, logoW, logoH)
  }

  const textX = logoDataUrl ? (8 + logoW + 4) : 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...WHITE)
  doc.text('GRUPO GLOBAL EN SEGUROS', textX, HEADER_H / 2 + 0.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...GOLD)
  doc.text('CUIDAR ES AMAR', textX, HEADER_H / 2 + 5.5)

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
    { label: 'Código de agente', value: fmt(poliza.aseguradoras?.codigo_agente) },
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
    { label: '¿Es o ha sido PEP (últimos 2 años)?',              value: cli.pep            === true ? 'Sí' : cli.pep            === false ? 'No' : 'No indicado' },
    { label: '¿Tiene parentesco o relación con un PEP?',         value: cli.pep_parentesco === true ? 'Sí' : cli.pep_parentesco === false ? 'No' : 'No indicado' },
    { label: '¿Es o ha sido CPE (Contratista/Proveedor Estado)?', value: cli.cpe           === true ? 'Sí' : cli.cpe           === false ? 'No' : 'No indicado' },
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
    if (y > 200) { doc.addPage(); y = 14 }
    const placa = v.tipo_placa ? `${v.tipo_placa}${v.placa || ''}` : (v.placa || '—')
    const sectionTitle = isExclusion ? 'VEHÍCULO A EXCLUIR' : 'VEHÍCULO A INCLUIR'
    const hasPrimaI = !isExclusion && parseFloat(v.prima_total || 0) > 0

    const bodyRowsI = [
      [{ content: 'Marca',              styles: { fontStyle:'bold', fillColor:LIGHT } }, fmt(v.marca?.toUpperCase())],
      [{ content: 'Línea / Modelo',     styles: { fontStyle:'bold', fillColor:LIGHT } }, fmt(v.modelo?.toUpperCase())],
      [{ content: 'Año',                styles: { fontStyle:'bold', fillColor:LIGHT } }, fmt(v.anio)],
      [{ content: 'Placa',              styles: { fontStyle:'bold', fillColor:LIGHT } }, fmt(placa.toUpperCase())],
      [{ content: 'No. de Chasis',      styles: { fontStyle:'bold', fillColor:LIGHT } }, fmt(v.chasis?.toUpperCase())],
      [{ content: 'No. de Motor',       styles: { fontStyle:'bold', fillColor:LIGHT } }, fmt(v.motor?.toUpperCase())],
      [{ content: 'Color',              styles: { fontStyle:'bold', fillColor:LIGHT } }, fmt(v.color?.toUpperCase())],
      [{ content: 'Valor del vehículo', styles: { fontStyle:'bold', fillColor:LIGHT } }, fmtQ(v.valor_asegurado)],
    ]

    if (hasPrimaI) {
      bodyRowsI.push([{
        content: 'PRIMA DEL VEHÍCULO',
        colSpan: 2,
        styles: { fillColor: GOLD, textColor: BLACK, fontStyle: 'bold', halign: 'center', fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      }])
      bodyRowsI.push([{ content: 'Prima neta',            styles: { fontStyle:'bold', fillColor:LIGHT } }, { content: fmtQ(v.prima_neta),          styles: { halign:'right' } }])
      bodyRowsI.push([{ content: 'Gastos de emisión',     styles: { fontStyle:'bold', fillColor:LIGHT } }, { content: fmtQ(v.monto_gasto_emision), styles: { halign:'right' } }])
      if (parseFloat(v.monto_recargo || 0) > 0) {
        bodyRowsI.push([{ content: 'Recargo fraccionamiento', styles: { fontStyle:'bold', fillColor:LIGHT } }, { content: fmtQ(v.monto_recargo), styles: { halign:'right' } }])
      }
      bodyRowsI.push([{ content: 'IVA 12%',               styles: { fontStyle:'bold', fillColor:LIGHT } }, { content: fmtQ(v.monto_iva),           styles: { halign:'right' } }])
      bodyRowsI.push([
        { content: 'Prima total', styles: { fontStyle:'bold', fillColor:[235,225,200], textColor:BLACK } },
        { content: fmtQ(v.prima_total), styles: { fontStyle:'bold', fillColor:[235,225,200], textColor:BLACK, halign:'right' } },
      ])
    }

    const hasDedI = parseFloat(v.deducible_danios||0) > 0 || parseFloat(v.deducible_robo||0) > 0
    if (hasDedI) {
      bodyRowsI.push([{
        content: 'DEDUCIBLES',
        colSpan: 2,
        styles: { fillColor: [80,80,80], textColor: [255,255,255], fontStyle: 'bold', halign: 'center', fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      }])
      if (parseFloat(v.deducible_danios||0) > 0)
        bodyRowsI.push([{ content: 'Deducible daños', styles: { fontStyle:'bold', fillColor:LIGHT } }, { content: `${parseFloat(v.deducible_danios)}%`, styles: { halign:'right' } }])
      if (parseFloat(v.deducible_robo||0) > 0)
        bodyRowsI.push([{ content: 'Deducible robo', styles: { fontStyle:'bold', fillColor:LIGHT } }, { content: `${parseFloat(v.deducible_robo)}%`, styles: { halign:'right' } }])
    }

    doc.setFillColor(...GOLD)
    doc.rect(margin, y, W - margin * 2, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BLACK)
    doc.text(sectionTitle, W / 2, y + 4.8, { align: 'center' })

    autoTable(doc, {
      startY: y + 7,
      margin: { left: margin, right: margin },
      body: bodyRowsI,
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
    y = sectionTable(isExclusion ? 'VEHÍCULO A EXCLUIR' : 'VEHÍCULO A INCLUIR', [
      { label: 'Vehículo', value: 'Sin vehículos registrados en esta gestión' },
    ], y)
  }

  /* ══ OBSERVACIONES ══ */
  if (emision.notas) {
    y = sectionTable('OBSERVACIONES', [
      { label: 'Observaciones', value: fmt(emision.notas) },
    ], y)
  }

  /* ══ INFORMACIÓN DE PAGO ══ */
  if (!isExclusion) {
    const numCuotas = emision.tipo_pago === 'contado' ? 1 : (emision.numero_cuotas || 1)
    y = sectionTable('INFORMACIÓN DE PAGO', [
      { label: 'Prima de inclusión',   value: fmtQ(emision.prima_emision) },
      { label: 'Tipo de pago',         value: emision.tipo_pago === 'contado' ? 'Contado' : 'Fraccionado' },
      { label: 'No. de cuotas',        value: String(numCuotas) },
      { label: 'Frecuencia',           value: numCuotas === 1 ? 'Pago único' : 'Mensual' },
      { label: 'Vigencia inclusión',   value: `${fmtDate(emision.fecha_inicio)} — ${fmtDate(emision.fecha_fin)}` },
    ], y)
  } else {
    y = sectionTable('INFORMACIÓN DE EXCLUSIÓN', [
      { label: 'Fecha de exclusión', value: fmtDate(emision.fecha_inicio) },
    ], y)
  }

  /* ══ COBERTURAS ══ */
  if (!isExclusion && coberturas && coberturas.length > 0) {
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
        0: { fontSize: 8, textColor: BLACK, fillColor: [255,255,255], cellPadding: { top: 2.8, bottom: 2.8, left: 4, right: 3 } },
        1: { fontSize: 8, textColor: BLACK, fillColor: LIGHT, cellPadding: { top: 2.8, bottom: 2.8, left: 4, right: 4 }, halign: 'right' },
      },
      headStyles: { fillColor: LIGHT, textColor: BLACK, fontSize: 8, fontStyle: 'bold' },
      theme: 'grid',
      styles: { lineColor: BORDER, lineWidth: 0.2, overflow: 'linebreak' },
    })

    y = doc.lastAutoTable.finalY + 5
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
    doc.text('CUIDAR ES AMAR', W / 2, pageH - 4, { align: 'center' })
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

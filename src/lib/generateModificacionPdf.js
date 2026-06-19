import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const GOLD   = [196, 169, 107]
const BLACK  = [17,  17,  17]
const WHITE  = [255, 255, 255]
const LIGHT  = [245, 244, 242]
const BORDER = [226, 232, 240]

const fmt     = (v) => v || '—'
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-GT') : '—'

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
    const blob   = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(blob)
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const scale  = 4
        const canvas = document.createElement('canvas')
        canvas.width  = 490 * scale
        canvas.height = 265 * scale
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(svgUrl)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => { URL.revokeObjectURL(svgUrl); resolve(null) }
      img.src = svgUrl
    })
  } catch { return null }
}

/**
 * generateModificacionPdf
 * @param {object} opts
 * @param {object} opts.emision   — the modificacion emission record
 * @param {object} opts.poliza    — poliza with clientes, aseguradoras, productos joins
 * @param {string} opts.usuario   — logged-in user name
 */
export async function generateModificacionPdf({ emision, poliza, usuario }) {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W      = doc.internal.pageSize.getWidth()
  const margin = 14
  let y        = 0

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
  const HEADER_H = 32

  doc.setFillColor(...BLACK)
  doc.rect(0, 0, W, HEADER_H, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, 0, 4, HEADER_H, 'F')

  const logoH = 19
  const logoW = logoH * (490 / 265)
  if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', 8, (HEADER_H - logoH) / 2, logoW, logoH)

  const textX = 8 + logoW + 4
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
  doc.text('SOLICITUD DE MODIFICACIÓN', W - margin, HEADER_H / 2 - 1, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GOLD)
  doc.text(`${emision.numero_emision || ''}  ·  ${fmtDate(new Date().toISOString().split('T')[0])}`, W - margin, HEADER_H / 2 + 5, { align: 'right' })

  y = HEADER_H + 6

  /* ══ DATOS DE AGENTE ══ */
  y = sectionTable('DATOS DE AGENTE', [
    { label: 'Código de agente', value: fmt(poliza.aseguradoras?.codigo_agente) },
    { label: 'Nombre de agente', value: 'GRUPO GLOBAL EN SEGUROS, S.A.' },
  ], y)

  /* ══ DATOS DE LA PÓLIZA ══ */
  y = sectionTable('DATOS DE LA PÓLIZA', [
    { label: 'No. de póliza',  value: fmt(poliza.numero_poliza) },
    { label: 'Aseguradora',    value: fmt(poliza.aseguradoras?.nombre) },
    { label: 'Producto',       value: fmt(poliza.productos?.nombre) },
    { label: 'No. de gestión', value: fmt(emision.numero_emision) },
    { label: 'Vigencia',       value: `${fmtDate(poliza.fecha_inicio)} — ${fmtDate(poliza.fecha_vencimiento)}` },
  ], y)

  /* ══ DATOS DEL CLIENTE ══ */
  const cli = poliza.clientes || {}
  const nombreCliente = [cli.nombre, cli.apellido].filter(Boolean).join(' ').toUpperCase()
  y = sectionTable('DATOS DEL CLIENTE', [
    { label: 'Nombre completo',   value: fmt(nombreCliente) },
    { label: 'DPI',               value: fmt(cli.dpi) },
    { label: 'Fecha de nacimiento', value: fmtDate(cli.fecha_nacimiento) },
    { label: 'Dirección',         value: fmt(cli.direccion) },
    { label: 'NIT',               value: fmt(cli.nit) },
    { label: 'Teléfono / Celular', value: fmt(cli.telefono) },
    { label: 'Email',             value: fmt(cli.email) },
  ], y)

  /* ══ DESCRIPCIÓN DE MODIFICACIONES ══ */
  y = sectionTable('DESCRIPCIÓN DE MODIFICACIONES', [
    { label: 'Modificaciones', value: fmt(emision.notas) },
  ], y)

  /* ══ FECHA / REALIZADO POR ══ */
  if (y > 250) { doc.addPage(); y = 14 }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [[
      { content: `Fecha: ${fmtDate(new Date().toISOString().split('T')[0])}`, styles: { fontStyle: 'bold' } },
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
  const apellido  = cli.apellido || 'cliente'
  const polizaNum = poliza.numero_poliza || 'poliza'
  doc.save(`Modificacion_${emision.numero_emision || polizaNum}_${apellido}.pdf`.replace(/\s+/g, '_'))
}

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const GOLD   = [196, 169, 107]
const BLACK  = [17,  17,  17]
const WHITE  = [255, 255, 255]
const LIGHT  = [245, 244, 242]
const BORDER = [226, 232, 240]
const GREEN  = [34,  197, 94]
const YELLOW = [245, 158, 11]
const RED    = [239, 68,  68]

const fmt     = (v) => v || '—'
const fmtQ    = (v) => v ? `Q ${parseFloat(v).toLocaleString('es-GT', { minimumFractionDigits: 2 })}` : 'Q 0.00'
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
 * generateEstadoCuentaPdf
 * @param {object} opts
 * @param {object}   opts.poliza   — poliza record with clientes, aseguradoras, productos joins
 * @param {object[]} opts.reqs     — requerimientos_pago array (with emisiones join)
 * @param {string}   opts.usuario  — logged-in user name
 */
export async function generateEstadoCuentaPdf({ poliza, reqs, usuario }) {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W      = doc.internal.pageSize.getWidth()
  const margin = 14
  let y        = 0

  const logoDataUrl = await buildLogoDataUrl()

  /* ── Totals ── */
  const totalPagado    = reqs.filter(r => r.estado === 'pagado').reduce((s, r) => s + parseFloat(r.monto || 0), 0)
  const totalVencido   = reqs.filter(r => r.estado === 'vencido').reduce((s, r) => s + parseFloat(r.monto || 0), 0)
  const totalPendiente = reqs.filter(r => r.estado === 'pendiente').reduce((s, r) => s + parseFloat(r.monto || 0), 0)
  const totalGeneral   = reqs.reduce((s, r) => s + parseFloat(r.monto || 0), 0)

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
  doc.text('ESTADO DE CUENTA', W - margin, HEADER_H / 2 - 1, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GOLD)
  doc.text(`${poliza.numero_poliza || ''}  ·  ${fmtDate(new Date().toISOString().split('T')[0])}`, W - margin, HEADER_H / 2 + 5, { align: 'right' })

  y = HEADER_H + 6

  /* ══ DATOS DE LA PÓLIZA ══ */
  const cli         = poliza.clientes || {}
  const nombreCliente = [cli.nombre, cli.apellido].filter(Boolean).join(' ').toUpperCase()

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      [
        { content: 'DATOS DE LA PÓLIZA', colSpan: 4, styles: { fillColor: GOLD, textColor: BLACK, fontStyle: 'bold', fontSize: 8, halign: 'center', cellPadding: { top: 3, bottom: 3 } } },
      ],
      [
        { content: 'No. de póliza',    styles: { fontStyle: 'bold', fillColor: LIGHT, fontSize: 8 } },
        { content: fmt(poliza.numero_poliza), styles: { fontSize: 8 } },
        { content: 'Aseguradora',      styles: { fontStyle: 'bold', fillColor: LIGHT, fontSize: 8 } },
        { content: fmt(poliza.aseguradoras?.nombre), styles: { fontSize: 8 } },
      ],
      [
        { content: 'Cliente',          styles: { fontStyle: 'bold', fillColor: LIGHT, fontSize: 8 } },
        { content: fmt(nombreCliente), styles: { fontSize: 8 } },
        { content: 'Producto',         styles: { fontStyle: 'bold', fillColor: LIGHT, fontSize: 8 } },
        { content: fmt(poliza.productos?.nombre), styles: { fontSize: 8 } },
      ],
      [
        { content: 'Vigencia',         styles: { fontStyle: 'bold', fillColor: LIGHT, fontSize: 8 } },
        { content: `${fmtDate(poliza.fecha_inicio)} — ${fmtDate(poliza.fecha_vencimiento)}`, styles: { fontSize: 8 } },
        { content: 'NIT',              styles: { fontStyle: 'bold', fillColor: LIGHT, fontSize: 8 } },
        { content: fmt(cli.nit),       styles: { fontSize: 8 } },
      ],
    ],
    theme: 'grid',
    styles: { lineColor: BORDER, lineWidth: 0.2, textColor: BLACK, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 }, overflow: 'linebreak' },
    showHead: false,
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 32 },
      3: { cellWidth: 'auto' },
    },
  })
  y = doc.lastAutoTable.finalY + 5

  /* ══ RESUMEN DE CUENTA ══ */
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      [
        { content: 'RESUMEN DE CUENTA', colSpan: 4, styles: { fillColor: GOLD, textColor: BLACK, fontStyle: 'bold', fontSize: 8, halign: 'center', cellPadding: { top: 3, bottom: 3 } } },
      ],
      [
        { content: 'Total pagado',    styles: { fontStyle: 'bold', fillColor: [220, 252, 231], textColor: [21, 128, 61], fontSize: 9, halign: 'center' } },
        { content: fmtQ(totalPagado), styles: { fontStyle: 'bold', fillColor: [220, 252, 231], textColor: [21, 128, 61], fontSize: 9, halign: 'center' } },
        { content: 'Total pendiente', styles: { fontStyle: 'bold', fillColor: [254, 249, 195], textColor: [161, 98, 7],  fontSize: 9, halign: 'center' } },
        { content: fmtQ(totalPendiente), styles: { fontStyle: 'bold', fillColor: [254, 249, 195], textColor: [161, 98, 7], fontSize: 9, halign: 'center' } },
      ],
      [
        { content: 'Total vencido',   styles: { fontStyle: 'bold', fillColor: [254, 226, 226], textColor: [185, 28, 28], fontSize: 9, halign: 'center' } },
        { content: fmtQ(totalVencido), styles: { fontStyle: 'bold', fillColor: [254, 226, 226], textColor: [185, 28, 28], fontSize: 9, halign: 'center' } },
        { content: 'Total general',   styles: { fontStyle: 'bold', fillColor: LIGHT, textColor: BLACK, fontSize: 9, halign: 'center' } },
        { content: fmtQ(totalGeneral), styles: { fontStyle: 'bold', fillColor: LIGHT, textColor: BLACK, fontSize: 9, halign: 'center' } },
      ],
    ],
    theme: 'grid',
    styles: { lineColor: BORDER, lineWidth: 0.2, textColor: BLACK, cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 }, overflow: 'linebreak' },
    showHead: false,
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 'auto' },
    },
  })
  y = doc.lastAutoTable.finalY + 6

  /* ══ DETALLE DE PAGOS ══ */
  doc.setFillColor(...GOLD)
  doc.rect(margin, y, W - margin * 2, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...BLACK)
  doc.text('DETALLE DE REQUERIMIENTOS DE PAGO', W / 2, y + 4.8, { align: 'center' })
  y += 7

  // pagado primero (por fecha_pago), luego vencido, luego pendiente (por fecha_vencimiento)
  const sortedReqs = [...reqs].sort((a, b) => {
    const order = { pagado: 0, vencido: 1, pendiente: 2 }
    const oa = order[a.estado] ?? 3
    const ob = order[b.estado] ?? 3
    if (oa !== ob) return oa - ob
    if (a.estado === 'pagado') return (a.fecha_pago || '').localeCompare(b.fecha_pago || '')
    return (a.fecha_vencimiento || '').localeCompare(b.fecha_vencimiento || '')
  })

  const tableBody = sortedReqs.map(r => {
    const estadoLabel = r.estado === 'pagado' ? 'Pagado' : r.estado === 'vencido' ? 'Vencido' : 'Pendiente'
    const estadoColor = r.estado === 'pagado' ? [21, 128, 61] : r.estado === 'vencido' ? [185, 28, 28] : [161, 98, 7]
    const estadoBg    = r.estado === 'pagado' ? [220, 252, 231] : r.estado === 'vencido' ? [254, 226, 226] : [254, 249, 195]
    const cuota       = (r.numero_cuota && r.total_cuotas) ? `${r.numero_cuota}/${r.total_cuotas}` : (r.numero_cuota ? String(r.numero_cuota) : '—')
    const emisionNum  = r.emisiones?.numero_emision || '—'
    return [
      { content: emisionNum,                   styles: { fontSize: 7, halign: 'center' } },
      { content: fmt(r.codigo),                styles: { fontSize: 7 } },
      { content: cuota,                         styles: { fontSize: 7, halign: 'center' } },
      { content: fmtDate(r.fecha_vencimiento),  styles: { fontSize: 7, halign: 'center' } },
      { content: fmtDate(r.fecha_pago),         styles: { fontSize: 7, halign: 'center' } },
      { content: fmtQ(r.monto),                styles: { fontSize: 7, halign: 'right' } },
      { content: estadoLabel,                   styles: { fontSize: 7, fontStyle: 'bold', halign: 'center', textColor: estadoColor, fillColor: estadoBg } },
    ]
  })

  // Column widths must sum to W - margin*2 = 182mm for full-width table
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: W - margin * 2,
    head: [[
      { content: 'Emisión',           styles: { fillColor: BLACK, textColor: WHITE, fontSize: 7, fontStyle: 'bold', halign: 'center' } },
      { content: '# Requerimiento',   styles: { fillColor: BLACK, textColor: WHITE, fontSize: 7, fontStyle: 'bold' } },
      { content: 'Cuota',             styles: { fillColor: BLACK, textColor: WHITE, fontSize: 7, fontStyle: 'bold', halign: 'center' } },
      { content: 'Vencimiento',       styles: { fillColor: BLACK, textColor: WHITE, fontSize: 7, fontStyle: 'bold', halign: 'center' } },
      { content: 'Fecha de pago',     styles: { fillColor: BLACK, textColor: WHITE, fontSize: 7, fontStyle: 'bold', halign: 'center' } },
      { content: 'Monto',             styles: { fillColor: BLACK, textColor: WHITE, fontSize: 7, fontStyle: 'bold', halign: 'right' } },
      { content: 'Estado',            styles: { fillColor: BLACK, textColor: WHITE, fontSize: 7, fontStyle: 'bold', halign: 'center' } },
    ]],
    body: tableBody,
    theme: 'grid',
    styles: { lineColor: BORDER, lineWidth: 0.2, textColor: BLACK, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 42 },
      2: { cellWidth: 13 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 26 },
      6: { cellWidth: 25 },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
  })

  y = doc.lastAutoTable.finalY + 8

  /* ══ REALIZADO POR ══ */
  if (y > 262) { doc.addPage(); y = 14 }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [[
      { content: `Fecha de generación: ${fmtDate(new Date().toISOString().split('T')[0])}`, styles: { fontStyle: 'bold' } },
      { content: `Generado por: ${fmt(usuario)}`, styles: { fontStyle: 'bold' } },
    ]],
    theme: 'grid',
    styles: { fontSize: 8, textColor: BLACK, lineColor: BORDER, lineWidth: 0.2, cellPadding: 3 },
    columnStyles: {
      0: { fillColor: LIGHT },
      1: { fillColor: LIGHT },
    },
    showHead: false,
  })

  /* ══ FOOTER (all pages) ══ */
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
  const apellido = cli.apellido || 'cliente'
  const polizaNum = poliza.numero_poliza || 'poliza'
  doc.save(`EstadoCuenta_${polizaNum}_${apellido}.pdf`.replace(/\s+/g, '_'))
}

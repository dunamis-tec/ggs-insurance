import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const GOLD   = [196, 169, 107]
const BLACK  = [17,  17,  17]
const WHITE  = [255, 255, 255]
const LIGHT  = [245, 244, 242]
const BORDER = [226, 232, 240]

const fmt    = (v) => v || '—'
const fmtQ   = (v) => v != null ? `Q ${parseFloat(v).toLocaleString('es-GT', { minimumFractionDigits: 2 })}` : '—'
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-GT') : '—'

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
 * generateInformePdf
 * @param {object}   opts
 * @param {object}   opts.informe  — informes_enviados record with aseguradoras join
 * @param {object[]} opts.reqs     — requerimientos_pago records with polizas+clientes joins
 * @param {string}   opts.logoUrl  — empresa logo URL (from configuracion_empresa)
 */
export async function generateInformePdf({ informe, reqs, logoUrl }) {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W      = doc.internal.pageSize.getWidth()
  const margin = 14
  let y        = 0

  const logoDataUrl = await loadLogoFromUrl(logoUrl)

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
  doc.text('INFORME DE LIQUIDACIÓN', W - margin, HEADER_H / 2 - 1, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GOLD)
  const infDate = informe.created_at ? new Date(informe.created_at).toLocaleDateString('es-GT') : '—'
  doc.text(infDate, W - margin, HEADER_H / 2 + 5, { align: 'right' })

  y = HEADER_H + 6

  /* ══ SUMMARY ══ */
  const asegNombre = informe.aseguradoras?.nombre || '—'
  const fechaDesde = fmt(informe.fecha_desde ? fmtDate(informe.fecha_desde) : null)
  const fechaHasta = fmt(informe.fecha_hasta ? fmtDate(informe.fecha_hasta) : null)
  const totalMonto = parseFloat(informe.total_monto || 0)

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      [{ content: 'Aseguradora',    styles: { fontStyle: 'bold', fillColor: LIGHT } }, asegNombre],
      [{ content: 'Periodo',        styles: { fontStyle: 'bold', fillColor: LIGHT } }, `${fechaDesde} — ${fechaHasta}`],
      [{ content: 'Total reqs.',    styles: { fontStyle: 'bold', fillColor: LIGHT } }, String(informe.total_requerimientos || reqs.length)],
      [{ content: 'Monto total',    styles: { fontStyle: 'bold', fillColor: LIGHT } }, fmtQ(totalMonto)],
    ],
    columnStyles: {
      0: { cellWidth: 50, fontSize: 8, textColor: BLACK, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 3 } },
      1: { fontSize: 8,  textColor: BLACK, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 } },
    },
    theme: 'grid',
    styles: { lineColor: BORDER, lineWidth: 0.2 },
    showHead: false,
  })

  y = doc.lastAutoTable.finalY + 6

  /* ══ DETAIL TABLE ══ */
  doc.setFillColor(...GOLD)
  doc.rect(margin, y, W - margin * 2, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...BLACK)
  doc.text('DETALLE DE REQUERIMIENTOS', W / 2, y + 4.8, { align: 'center' })
  y += 7

  const tableRows = reqs.map(r => [
    r.codigo || '—',
    `${r.numero_cuota}/${r.total_cuotas}`,
    r.polizas?.numero_poliza || '—',
    [r.polizas?.clientes?.nombre, r.polizas?.clientes?.apellido].filter(Boolean).join(' ') || '—',
    r.fecha_pago ? fmtDate(r.fecha_pago) : '—',
    fmtQ(r.monto),
  ])

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Nº Req.', 'Cuota', 'Póliza', 'Cliente', 'Fecha pago', 'Monto']],
    body: tableRows,
    foot: [['', '', '', '', 'TOTAL', fmtQ(totalMonto)]],
    headStyles: { fillColor: BLACK, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold', cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
    footStyles: { fillColor: LIGHT, textColor: BLACK, fontSize: 8, fontStyle: 'bold', cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
    columnStyles: {
      0: { cellWidth: 24, fontSize: 7.5 },
      1: { cellWidth: 14, fontSize: 7.5, halign: 'center' },
      2: { cellWidth: 28, fontSize: 7.5 },
      3: { fontSize: 7.5 },
      4: { cellWidth: 26, fontSize: 7.5 },
      5: { cellWidth: 26, fontSize: 7.5, halign: 'right' },
    },
    theme: 'grid',
    styles: { lineColor: BORDER, lineWidth: 0.2, textColor: BLACK, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
    alternateRowStyles: { fillColor: LIGHT },
    showFoot: 'lastPage',
  })

  /* ══ FOOTER ══ */
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const H = doc.internal.pageSize.getHeight()
    doc.setFillColor(...BLACK)
    doc.rect(0, H - 10, W, 10, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...GOLD)
    doc.text('CUIDAR ES AMAR', margin, H - 4)
    doc.setTextColor(150, 150, 150)
    doc.text(`Página ${i} de ${pageCount}`, W - margin, H - 4, { align: 'right' })
  }

  const asegSlug = (informe.aseguradoras?.nombre || 'informe').replace(/\s+/g, '_')
  const fechaSlug = informe.created_at ? new Date(informe.created_at).toISOString().split('T')[0] : 'export'
  doc.save(`Liquidacion_${asegSlug}_${fechaSlug}.pdf`)
}

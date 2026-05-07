import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'

export async function generateTicketPdf(params: {
  orderToken: string
  buyerName: string
  eventName: string
  eventDate: string
  venue?: string
  eventImageUrl?: string
  items: Array<{ section: string; seat?: string; quantity: number; unitPrice: number }>
  total: number
  ticketsAppUrl: string
}): Promise<Buffer> {
  const orderUrl = `${params.ticketsAppUrl}/mi-orden/${params.orderToken}`

  // Generate QR as PNG buffer
  const qrPng = await QRCode.toBuffer(orderUrl, {
    width: 300,
    margin: 2,
    color: { dark: '#1a1a2e', light: '#ffffff' },
  })

  // Pre-load event image if provided
  let eventImgBuf: Buffer | null = null
  if (params.eventImageUrl) {
    try {
      const imgRes = await fetch(params.eventImageUrl)
      if (imgRes.ok) eventImgBuf = Buffer.from(await imgRes.arrayBuffer())
    } catch { /* ignore */ }
  }

  // Create PDF document
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 40 })
    const chunks: Buffer[] = []

    doc.on('data', chunk => chunks.push(chunk as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // ── Header ─────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 100).fill('#6B46C1')

    // Embed event image
    if (eventImgBuf) {
      doc.image(eventImgBuf, doc.page.width - 120, 5, { width: 90, height: 90 })
    }

    doc.fontSize(26).fillColor('#fff').font('Helvetica-Bold').text('BOLETO DE ENTRADA', 40, 22)
    doc.fontSize(13).fillColor('rgba(255,255,255,0.9)').font('Helvetica').text('IventIA Tickets', 40, 58)

    // ── Event info ──────────────────────────────────────────────────────────
    doc.moveTo(0, 120).lineTo(doc.page.width, 120).stroke('#ddd')
    doc.y = 140
    doc.fontSize(18).fillColor('#1a1a2e').font('Helvetica-Bold').text(params.eventName)
    doc.fontSize(11).fillColor('#666').font('Helvetica').text(params.eventDate)
    if (params.venue) doc.text(params.venue)

    // ── Buyer info ──────────────────────────────────────────────────────────
    doc.y += 20
    doc.fontSize(10).fillColor('#888').font('Helvetica').text('COMPRADOR')
    doc.fontSize(13).fillColor('#1a1a2e').font('Helvetica-Bold').text(params.buyerName)

    // ── Items table ─────────────────────────────────────────────────────────
    doc.y += 20
    doc.fontSize(10).fillColor('#888').font('Helvetica').text('ENTRADAS')

    const tableY = doc.y + 15
    const col1 = 40, col2 = 320, col3 = 420, col4 = 520
    const rowHeight = 25

    // Header
    doc.fontSize(9).fillColor('#666').font('Helvetica-Bold')
    doc.text('SECCIÓN / ASIENTO', col1, tableY)
    doc.text('CANT.', col2, tableY)
    doc.text('UNITARIO', col3, tableY)
    doc.text('TOTAL', col4, tableY)

    // Data rows
    doc.fontSize(9).fillColor('#333').font('Helvetica')
    let rowIdx = 0
    for (const item of params.items) {
      const y = tableY + 20 + (rowIdx * rowHeight)
      const seatLabel = item.seat ? ` — Asiento ${item.seat}` : ''
      doc.text(item.section + seatLabel, col1, y)
      doc.text(item.quantity.toString(), col2, y)
      doc.text(`$${item.unitPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, col3, y)
      doc.text(`$${(item.quantity * item.unitPrice).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, col4, y)
      rowIdx++
    }

    // Total
    doc.y = tableY + 20 + (rowIdx * rowHeight) + 10
    doc.moveTo(col3 - 20, doc.y).lineTo(doc.page.width - 40, doc.y).stroke('#ddd')
    doc.y += 10
    doc.fontSize(11).fillColor('#6B46C1').font('Helvetica-Bold')
    doc.text('TOTAL', col3, doc.y)
    doc.text(`$${params.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, col4, doc.y)

    // ── QR Code ─────────────────────────────────────────────────────────────
    doc.y += 50
    const qrSize = 180
    const qrX = (doc.page.width - qrSize) / 2
    doc.image(qrPng, qrX, doc.y, { width: qrSize, height: qrSize })

    // QR instruction
    doc.y += qrSize + 15
    doc.fontSize(12).fillColor('#1a1a2e').font('Helvetica-Bold')
    doc.text('Presenta este código QR en la entrada', { align: 'center' })

    // ── Token reference ─────────────────────────────────────────────────────
    doc.y += 15
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke('#eee')
    doc.y += 10
    doc.fontSize(9).fillColor('#999').font('Helvetica')
    doc.text(`Referencia: ${params.orderToken}`, { align: 'center' })
    doc.text('Imprime o guarda este boleto. Es tu acceso al evento.', { align: 'center' })

    // Finalize
    doc.end()
  })
}

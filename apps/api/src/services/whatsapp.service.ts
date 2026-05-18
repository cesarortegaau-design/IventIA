import { env } from '../config/env'
import { AppError } from '../middleware/errorHandler'

// Meta WhatsApp Business Cloud API
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages

const META_API_BASE = 'https://graph.facebook.com/v19.0'

export interface SendWhatsAppOptions {
  to: string     // E.164 format, e.g. +521234567890
  message: string
}

/**
 * Send a plain-text WhatsApp message via Meta Cloud API.
 * Returns the message ID on success.
 */
export async function sendWhatsAppMessage(options: SendWhatsAppOptions): Promise<string> {
  if (!env.META_WA_ACCESS_TOKEN || !env.META_WA_PHONE_NUMBER_ID) {
    console.warn('⚠️ WhatsApp not configured: META_WA_ACCESS_TOKEN or META_WA_PHONE_NUMBER_ID missing')
    return 'SKIPPED'
  }

  const url = `${META_API_BASE}/${env.META_WA_PHONE_NUMBER_ID}/messages`
  const body = {
    messaging_product: 'whatsapp',
    to: options.to,
    type: 'text',
    text: { body: options.message },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.META_WA_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    console.error(`✗ Meta WhatsApp error for ${options.to}:`, JSON.stringify(err))
    throw new AppError(500, 'WHATSAPP_SEND_FAILED', (err as any)?.error?.message ?? 'Failed to send WhatsApp message')
  }

  const data = await response.json() as any
  const msgId: string = data?.messages?.[0]?.id ?? 'unknown'
  console.log(`✓ WhatsApp sent to ${options.to}: ${msgId}`)
  return msgId
}

/**
 * Send a document/media message via Meta Cloud API.
 * Used for PDFs (tickets, etc.) accessible via a public URL.
 */
export async function sendWhatsAppDocument(params: {
  to: string
  documentUrl: string
  caption?: string
  filename?: string
}): Promise<string> {
  if (!env.META_WA_ACCESS_TOKEN || !env.META_WA_PHONE_NUMBER_ID) {
    console.warn('⚠️ WhatsApp not configured: cannot send document')
    return 'SKIPPED'
  }

  const url = `${META_API_BASE}/${env.META_WA_PHONE_NUMBER_ID}/messages`
  const body = {
    messaging_product: 'whatsapp',
    to: params.to,
    type: 'document',
    document: {
      link: params.documentUrl,
      ...(params.caption && { caption: params.caption }),
      ...(params.filename && { filename: params.filename }),
    },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.META_WA_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    console.error(`✗ Meta WhatsApp document error for ${params.to}:`, JSON.stringify(err))
    throw new AppError(500, 'WHATSAPP_SEND_FAILED', (err as any)?.error?.message ?? 'Failed to send WhatsApp document')
  }

  const data = await response.json() as any
  const msgId: string = data?.messages?.[0]?.id ?? 'unknown'
  console.log(`✓ WhatsApp document sent to ${params.to}: ${msgId}`)
  return msgId
}

/**
 * Ticket confirmation — sends text + PDF document
 */
export async function sendTicketWhatsApp(params: {
  to: string
  buyerName: string
  eventName: string
  eventDate: string
  pdfUrl: string
}): Promise<string> {
  const caption = `🎟️ Hola ${params.buyerName}, aquí están tus boletos para *${params.eventName}* (${params.eventDate}). Presenta el QR en la entrada.`
  return sendWhatsAppDocument({
    to: params.to,
    documentUrl: params.pdfUrl,
    caption,
    filename: `boletos-${params.eventName.replace(/\s+/g, '-').toLowerCase()}.pdf`,
  })
}

/**
 * Guest invitation with access code
 */
export async function sendGuestInvitationWhatsApp(params: {
  to: string
  guestName: string
  eventName: string
  slug: string
  code: string
  ticketsAppUrl: string
}): Promise<string> {
  const eventUrl = `${params.ticketsAppUrl}/evento/${params.slug}`
  const message =
    `🎟️ Hola ${params.guestName}, tienes una invitación para *${params.eventName}*.\n\n` +
    `Tu código de acceso es: *${params.code}*\n\n` +
    `Regístrate aquí para obtener tu boleto:\n${eventUrl}`
  return sendWhatsAppMessage({ to: params.to, message })
}

/**
 * Generic notification with optional CTA link
 */
export async function sendGenericNotification(
  phoneNumber: string,
  data: { title: string; message: string; actionUrl?: string; actionText?: string }
): Promise<string> {
  const message = [
    `*${data.title}*`,
    '',
    data.message,
    data.actionUrl ? `\n👉 ${data.actionText || 'Ver más'}: ${data.actionUrl}` : '',
  ].join('\n').trim()
  return sendWhatsAppMessage({ to: phoneNumber, message })
}

/**
 * Bulk send to multiple recipients — failures don't stop the rest
 */
export async function sendBulkWhatsApp(
  recipients: string[],
  messageTemplate: (phone: string) => string
) {
  const results = await Promise.allSettled(
    recipients.map(phone => sendWhatsAppMessage({ to: phone, message: messageTemplate(phone) }))
  )
  return {
    successful: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
    results,
  }
}

/**
 * Check if WhatsApp is configured
 */
export function isWhatsAppConfigured(): boolean {
  return !!(env.META_WA_ACCESS_TOKEN && env.META_WA_PHONE_NUMBER_ID)
}

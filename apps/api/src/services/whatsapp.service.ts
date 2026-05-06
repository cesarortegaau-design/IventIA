import twilio from 'twilio'
import { env } from '../config/env'
import { AppError } from '../middleware/errorHandler'

// Initialize Twilio client
const client = env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
  ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
  : null

export interface SendWhatsAppOptions {
  to: string // Recipient phone number in E.164 format (e.g., +34123456789)
  message: string
  templateName?: string // For template-based messages
  variables?: Record<string, string>
}

/**
 * Send a WhatsApp message via Twilio
 */
export async function sendWhatsAppMessage(options: SendWhatsAppOptions): Promise<string> {
  if (!client || !env.TWILIO_WHATSAPP_FROM) {
    console.warn('⚠️ WhatsApp not configured: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_WHATSAPP_FROM missing')
    return 'SKIPPED'
  }

  try {
    const message = await client.messages.create({
      from: `whatsapp:${env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${options.to}`,
      body: options.message,
    })

    console.log(`✓ WhatsApp sent to ${options.to}: ${message.sid}`)
    return message.sid
  } catch (error) {
    console.error(`✗ Failed to send WhatsApp to ${options.to}:`, error)
    throw new AppError(500, 'WHATSAPP_SEND_FAILED', 'Failed to send WhatsApp message')
  }
}

/**
 * Order confirmation message
 */
export async function sendOrderConfirmation(
  phoneNumber: string,
  orderData: { orderNumber: string; total: number; itemCount: number; estimatedDelivery?: string }
) {
  const message = `
¡Hola! 👋

Tu pedido *${orderData.orderNumber}* ha sido confirmado.

📦 Resumen:
• Artículos: ${orderData.itemCount}
• Total: $${orderData.total.toFixed(2)}
${orderData.estimatedDelivery ? `• Entrega estimada: ${orderData.estimatedDelivery}` : ''}

Rastrearemos tu envío y te notificaremos cuando esté en camino.

¡Gracias por tu compra! 🎨
`.trim()

  return sendWhatsAppMessage({ to: phoneNumber, message })
}

/**
 * Order status update message
 */
export async function sendOrderStatusUpdate(
  phoneNumber: string,
  orderData: { orderNumber: string; status: string; trackingNumber?: string; estimatedDelivery?: string }
) {
  let statusEmoji = '📦'
  let statusText = orderData.status

  switch (orderData.status) {
    case 'PAID':
      statusEmoji = '✅'
      statusText = 'Pagado'
      break
    case 'SHIPPED':
      statusEmoji = '🚚'
      statusText = 'En camino'
      break
    case 'DELIVERED':
      statusEmoji = '🎉'
      statusText = 'Entregado'
      break
    case 'CANCELLED':
      statusEmoji = '❌'
      statusText = 'Cancelado'
      break
  }

  const message = `
${statusEmoji} Actualización de tu pedido

Pedido: *${orderData.orderNumber}*
Estado: *${statusText}*
${orderData.trackingNumber ? `Rastreo: ${orderData.trackingNumber}` : ''}
${orderData.estimatedDelivery ? `Entrega: ${orderData.estimatedDelivery}` : ''}

¡Gracias por tu paciencia! 🙌
`.trim()

  return sendWhatsAppMessage({ to: phoneNumber, message })
}

/**
 * Class enrollment confirmation
 */
export async function sendClassEnrollmentConfirmation(
  phoneNumber: string,
  classData: { className: string; instructor: string; dateTime: string; location: string; meetingLink?: string }
) {
  const message = `
¡Bienvenido! 🎨

Te has inscrito exitosamente en:
*${classData.className}*

📋 Detalles:
• Instructor: ${classData.instructor}
• Fecha y hora: ${classData.dateTime}
• Ubicación: ${classData.location}
${classData.meetingLink ? `• Link: ${classData.meetingLink}` : ''}

¡Esperamos verte pronto!
`.trim()

  return sendWhatsAppMessage({ to: phoneNumber, message })
}

/**
 * Gallery location information and WhatsApp business link
 */
export async function sendLocationInfo(
  phoneNumber: string,
  locationData: { name: string; address: string; phone?: string; whatsappPhone?: string; hours?: string }
) {
  const message = `
🏛️ *${locationData.name}*

📍 ${locationData.address}
${locationData.hours ? `⏰ Horario: ${locationData.hours}` : ''}
${locationData.phone ? `📱 Tel: ${locationData.phone}` : ''}

¿Preguntas? Contáctanos directamente por WhatsApp para atención personalizada.

¡Te esperamos! 🎨
`.trim()

  return sendWhatsAppMessage({ to: phoneNumber, message })
}

/**
 * Generic notification with CTA
 */
export async function sendGenericNotification(
  phoneNumber: string,
  data: { title: string; message: string; actionUrl?: string; actionText?: string }
) {
  const message = `
*${data.title}*

${data.message}

${data.actionUrl ? `👉 ${data.actionText || 'Ver más'}: ${data.actionUrl}` : ''}
`.trim()

  return sendWhatsAppMessage({ to: phoneNumber, message })
}

/**
 * Bulk send to multiple recipients
 */
export async function sendBulkWhatsApp(
  recipients: string[],
  messageTemplate: (phone: string) => string
) {
  const results = await Promise.allSettled(
    recipients.map((phone) =>
      sendWhatsAppMessage({
        to: phone,
        message: messageTemplate(phone),
      })
    )
  )

  const successful = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return { successful, failed, results }
}

/**
 * Ticket confirmation with PDF attachment
 */
export async function sendTicketWhatsApp(params: {
  to: string
  buyerName: string
  eventName: string
  eventDate: string
  pdfUrl: string
}): Promise<string> {
  if (!client || !env.TWILIO_WHATSAPP_FROM) {
    console.warn('⚠️ WhatsApp not configured: cannot send ticket')
    return 'SKIPPED'
  }

  try {
    const message = await client.messages.create({
      from: `whatsapp:${env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${params.to}`,
      body: `🎟️ Hola ${params.buyerName}, aquí están tus boletos para *${params.eventName}* (${params.eventDate}). Presenta el QR en la entrada. 👇`,
      mediaUrl: [params.pdfUrl],
    })

    console.log(`✓ Ticket WhatsApp sent to ${params.to}: ${message.sid}`)
    return message.sid
  } catch (error) {
    console.error(`✗ Failed to send ticket WhatsApp to ${params.to}:`, error)
    throw new AppError(500, 'WHATSAPP_SEND_FAILED', 'Failed to send ticket WhatsApp')
  }
}

/**
 * Check if WhatsApp is configured
 */
export function isWhatsAppConfigured(): boolean {
  return !!(client && env.TWILIO_WHATSAPP_FROM)
}

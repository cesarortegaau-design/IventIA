import nodemailer from 'nodemailer'
import QRCode from 'qrcode'
import { env } from '../config/env'

const transporter = env.SENDGRID_API_KEY
  ? nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: { user: 'apikey', pass: env.SENDGRID_API_KEY },
    })
  : null

export const emailService = {
  async sendTicketConfirmation(params: {
    to: string
    buyerName: string
    orderToken: string
    eventName: string
    eventDate: string
    venue?: string
    items: Array<{ section: string; seat?: string; quantity: number; unitPrice: number }>
    total: number
    pdfAttachment?: Buffer
  }) {
    const orderUrl = `${env.TICKETS_APP_URL}/mi-orden/${params.orderToken}`
    const whatsappText = `Mis boletos para ${params.eventName} 🎟️ ${orderUrl}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`

    // Generate QR as base64 data URL
    const qrDataUrl = await QRCode.toDataURL(orderUrl, {
      width: 220,
      margin: 1,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    })

    const itemRows = params.items
      .map(i => `
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0;">
            ${i.section}${i.seat ? ` — Asiento ${i.seat}` : ''}
          </td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: center;">${i.quantity}</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: right;">
            $${(i.unitPrice * i.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </td>
        </tr>`)
      .join('')

    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6B46C1 0%, #9b79e3 100%); padding: 32px 36px; text-align: center;">
          <div style="font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px;">IventIA Boletos</div>
          <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-top: 4px;">Confirmación de compra</div>
        </div>

        <!-- Body -->
        <div style="padding: 32px 36px;">
          <p style="font-size: 16px; color: #333; margin: 0 0 8px;">Hola <strong>${params.buyerName}</strong>,</p>
          <p style="font-size: 15px; color: #555; margin: 0 0 24px;">
            ¡Tu compra fue exitosa! 🎉 Aquí tienes los detalles de tu orden.
          </p>

          <!-- Event info -->
          <div style="background: #f4eeff; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <div style="font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 6px;">${params.eventName}</div>
            <div style="font-size: 13px; color: #666;">${params.eventDate}${params.venue ? ` · ${params.venue}` : ''}</div>
          </div>

          <!-- Items table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
            <thead>
              <tr style="background: #f8f8f8;">
                <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #888; font-weight: 600;">SECCIÓN / ASIENTO</th>
                <th style="padding: 10px 16px; text-align: center; font-size: 12px; color: #888; font-weight: 600;">CANT.</th>
                <th style="padding: 10px 16px; text-align: right; font-size: 12px; color: #888; font-weight: 600;">SUBTOTAL</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 12px 16px; text-align: right; font-weight: 700; font-size: 15px; color: #333;">Total</td>
                <td style="padding: 12px 16px; text-align: right; font-weight: 800; font-size: 18px; color: #6B46C1;">
                  $${params.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>

          <!-- QR code -->
          <div style="text-align: center; margin: 28px 0;">
            <div style="display: inline-block; border: 3px solid #6B46C1; border-radius: 16px; padding: 16px; background: #fff;">
              <img src="${qrDataUrl}" alt="QR Boleto" width="180" height="180" style="display: block;" />
            </div>
            <div style="font-size: 12px; color: #888; margin-top: 8px;">
              Presenta este código en la entrada del evento
            </div>
          </div>

          <!-- Ref -->
          <div style="background: #f8f8f8; border-radius: 8px; padding: 12px 16px; text-align: center; margin-bottom: 24px; font-size: 13px; color: #666;">
            Referencia: <span style="font-family: monospace; font-weight: 700; color: #6B46C1;">${params.orderToken}</span>
          </div>

          <!-- CTA buttons -->
          <div style="text-align: center;">
            <a href="${orderUrl}" style="display: inline-block; background: #6B46C1; color: #fff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; margin-bottom: 12px;">
              Ver mis boletos
            </a>
            <br />
            <a href="${whatsappUrl}" style="display: inline-block; background: #25D366; color: #fff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 4px;">
              📱 Compartir por WhatsApp
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8f8f8; padding: 16px 36px; text-align: center; font-size: 12px; color: #aaa;">
          IventIA · Sistema de Boletos · Si tienes dudas, responde este correo.
        </div>
      </div>
    `

    if (!transporter) {
      console.log(`[email] Ticket confirmation for ${params.to} — order ${params.orderToken}: ${orderUrl}`)
      return
    }

    await transporter.sendMail({
      from: `IventIA Boletos <${env.EMAIL_FROM}>`,
      to: params.to,
      subject: `🎟️ Tus boletos para ${params.eventName} — Confirmado`,
      html,
      attachments: params.pdfAttachment
        ? [
            {
              filename: `boleto-${params.orderToken.slice(0, 8)}.pdf`,
              content: params.pdfAttachment,
              contentType: 'application/pdf',
            },
          ]
        : [],
    })
  },

  async sendPasswordReset(to: string, resetUrl: string, firstName: string) {
    if (!transporter) {
      console.warn('[email] No SENDGRID_API_KEY configured — logging reset link instead')
      console.log(`[email] Password reset for ${to}: ${resetUrl}`)
      return
    }

    await transporter.sendMail({
      from: `IventIA <${env.EMAIL_FROM}>`,
      to,
      subject: 'Restablecer contraseña — Portal de Expositores',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Hola ${firstName},</h2>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #1677ff; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Restablecer contraseña
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>
        </div>
      `,
    })
  },
}

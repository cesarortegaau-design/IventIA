import nodemailer from 'nodemailer'
import { env } from '../config/env'

const transporter = env.SENDGRID_API_KEY
  ? nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: { user: 'apikey', pass: env.SENDGRID_API_KEY },
    })
  : null

export const emailService = {
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

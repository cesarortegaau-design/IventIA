import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as whatsappService from '../services/whatsapp.service'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'

const sendLocationNotificationSchema = z.object({
  locationId: z.string().min(1),
  message: z.string().min(1),
})

const sendBulkNotificationSchema = z.object({
  recipientPhones: z.array(z.string().min(1)),
  message: z.string().min(1),
})

/**
 * Send WhatsApp message to location's WhatsApp number
 */
export async function sendLocationNotification(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const data = sendLocationNotificationSchema.parse(req.body)

    // Get location
    const location = await prisma.galleryLocation.findFirst({
      where: { id: data.locationId, tenantId, isActive: true },
    })
    if (!location) throw new AppError(404, 'LOCATION_NOT_FOUND', 'Location not found')
    if (!location.whatsapp) throw new AppError(400, 'NO_WHATSAPP', 'Location does not have a WhatsApp number')

    // Send message
    const messageId = await whatsappService.sendWhatsAppMessage({
      to: location.whatsapp,
      message: data.message,
    })

    res.json({
      success: true,
      data: { messageId, locationId: data.locationId },
      message: 'Message sent successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Send bulk WhatsApp notification to multiple recipients
 */
export async function sendBulkNotification(req: Request, res: Response, next: NextFunction) {
  try {
    const data = sendBulkNotificationSchema.parse(req.body)

    // Send to all recipients
    const result = await whatsappService.sendBulkWhatsApp(
      data.recipientPhones,
      () => data.message
    )

    res.json({
      success: true,
      data: {
        successful: result.successful,
        failed: result.failed,
      },
      message: `Sent to ${result.successful} recipients, ${result.failed} failed`,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Send announcement to all gallery locations
 */
export async function broadcastAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { message } = z.object({ message: z.string().min(1) }).parse(req.body)

    // Get all locations with WhatsApp
    const locations = await prisma.galleryLocation.findMany({
      where: { tenantId, isActive: true, whatsapp: { not: null } },
    })

    if (locations.length === 0) {
      throw new AppError(400, 'NO_LOCATIONS', 'No locations with WhatsApp configured')
    }

    // Send to all
    const result = await whatsappService.sendBulkWhatsApp(
      locations.map((l) => l.whatsapp!),
      () => message
    )

    res.json({
      success: true,
      data: {
        locationsReached: result.successful,
        locationsFailed: result.failed,
      },
      message: `Announcement sent to ${result.successful} locations`,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Check WhatsApp configuration status
 */
export async function getWhatsAppStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const isConfigured = whatsappService.isWhatsAppConfigured()

    res.json({
      success: true,
      data: {
        configured: isConfigured,
        message: isConfigured
          ? 'WhatsApp is configured and ready to use'
          : 'WhatsApp is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM',
      },
    })
  } catch (error) {
    next(error)
  }
}

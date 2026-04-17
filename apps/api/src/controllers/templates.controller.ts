import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as templateService from '../services/template.service'

const uploadSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  context: z.enum(['EVENT', 'ORDER', 'CONTRACT']),
})

const generateSchema = z.object({
  entityId: z.string().min(1),
})

export async function listTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { context } = req.query as Record<string, string>
    const templates = await templateService.list(tenantId, { context })
    res.json(templates)
  } catch (err) { next(err) }
}

export async function uploadTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const data = uploadSchema.parse(req.body)
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'Archivo requerido' } })
    }
    const template = await templateService.upload(
      req.user!.tenantId,
      req.user!.userId,
      { name: data.name, description: data.description, context: data.context },
      req.file.buffer,
      req.file.originalname,
    )
    res.status(201).json(template)
  } catch (err) { next(err) }
}

export async function deleteTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    await templateService.deleteTemplate(req.params.id, req.user!.tenantId)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function generateDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { entityId } = generateSchema.parse(req.body)
    const { buffer, fileName } = await templateService.generate(
      req.params.id,
      req.user!.tenantId,
      entityId,
      req.user!.userId,
    )
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
    res.send(buffer)
  } catch (err) { next(err) }
}

export async function getAvailableLabels(req: Request, res: Response, next: NextFunction) {
  try {
    const { context } = req.params
    const labels = templateService.getAvailableLabels(context)
    res.json(labels)
  } catch (err) { next(err) }
}

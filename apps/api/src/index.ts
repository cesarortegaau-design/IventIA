import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import apiRoutes from './routes/index'

const app = express()

// Security
app.use(helmet())
app.use(cors({
  origin: env.CORS_ORIGIN.split(','),
  credentials: true,
}))
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
}))

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'))
}

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', env: env.NODE_ENV })
})

// API routes
app.use('/api/v1', apiRoutes)

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } })
})

// Error handler
app.use(errorHandler)

app.listen(env.PORT, () => {
  console.log(`🚀 IventIA API running on http://localhost:${env.PORT}`)
  console.log(`   Environment: ${env.NODE_ENV}`)
})

export default app

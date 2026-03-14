import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { authRouter } from './routes/auth'
import { shopRouter } from './routes/shop'
import { customersRouter } from './routes/customers'
import { framesRouter } from './routes/frames'
import { lensesRouter } from './routes/lenses'
import { accessoriesRouter } from './routes/accessories'
import { ordersRouter } from './routes/orders'
import { labOrdersRouter } from './routes/labOrders'
import { repairsRouter } from './routes/repairs'
import { prescriptionsRouter } from './routes/prescriptions'
import { staffRouter } from './routes/staff'
import { invoicesRouter } from './routes/invoices'
import { reportsRouter } from './routes/reports'

import { errorHandler } from './middleware/errorHandler'

const app = express()

const PORT = Number(process.env.PORT) || 4000

app.set('trust proxy', 1)

app.use(helmet())

app.use(
  cors({
    origin: true,
    credentials: true
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use(morgan('combined'))

/* Rate Limiters */

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15
})

app.use('/api/', globalLimiter)

/* Healthcheck */

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', version: '1.0.0' })
})

/* Routes */

app.use('/api/auth', authLimiter, authRouter)
app.use('/api/shop', shopRouter)
app.use('/api/customers', customersRouter)
app.use('/api/frames', framesRouter)
app.use('/api/lenses', lensesRouter)
app.use('/api/accessories', accessoriesRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/lab-orders', labOrdersRouter)
app.use('/api/repairs', repairsRouter)
app.use('/api/prescriptions', prescriptionsRouter)
app.use('/api/staff', staffRouter)
app.use('/api/invoices', invoicesRouter)
app.use('/api/reports', reportsRouter)

/* 404 */

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

/* Error Handler */

app.use(errorHandler)

/* Start Server */

app.listen(PORT, '0.0.0.0', () => {
  console.log(`LensFlow API running on port ${PORT}`)
})

export default app

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { authRouter } from './routes/auth';
import { shopRouter } from './routes/shop';
import { customersRouter } from './routes/customers';
import { framesRouter } from './routes/frames';
import { lensesRouter } from './routes/lenses';
import { accessoriesRouter } from './routes/accessories';
import { ordersRouter } from './routes/orders';
import { labOrdersRouter } from './routes/labOrders';
import { repairsRouter } from './routes/repairs';
import { prescriptionsRouter } from './routes/prescriptions';
import { staffRouter } from './routes/staff';
import { invoicesRouter } from './routes/invoices';
import { reportsRouter } from './routes/reports';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many login attempts, please try again later.' },
});

app.use('/api/', globalLimiter);

// ── Parsing ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  })
);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/shop', shopRouter);
app.use('/api/customers', customersRouter);
app.use('/api/frames', framesRouter);
app.use('/api/lenses', lensesRouter);
app.use('/api/accessories', accessoriesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/lab-orders', labOrdersRouter);
app.use('/api/repairs', repairsRouter);
app.use('/api/prescriptions', prescriptionsRouter);
app.use('/api/staff', staffRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/reports', reportsRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀  LensFlow API  →  http://0.0.0.0:${PORT}`);
  logger.info(`🌍  Environment   →  ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;

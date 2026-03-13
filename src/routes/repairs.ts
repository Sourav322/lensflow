import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const repairsRouter = Router();
repairsRouter.use(authenticate);

const schema = z.object({
  customerId:    z.string(),
  description:   z.string().min(1),
  itemType:      z.string(),
  brand:         z.string().optional(),
  issue:         z.string().optional(),
  estimatedCost: z.number().optional(),
  estimatedDate: z.string().optional(),
  notes:         z.string().optional(),
});

const genTicket = () => `REP-${Date.now().toString().slice(-8)}`;

// GET /api/repairs
repairsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
    const where: any = { shopId: req.user!.shopId };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      prisma.repair.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { customer: true },
      }),
      prisma.repair.count({ where }),
    ]);
    res.json({ success: true, data, meta: { total } });
  } catch (err) { next(err); }
});

// GET /api/repairs/:id
repairsRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.repair.findFirst({
      where: { id: req.params.id, shopId: req.user!.shopId },
      include: { customer: true },
    });
    if (!item) throw new AppError('Repair ticket not found', 404);
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

// POST /api/repairs
repairsRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body);
    const item = await prisma.repair.create({
      data: {
        ...data,
        shopId:        req.user!.shopId,
        ticketNumber:  genTicket(),
        estimatedDate: data.estimatedDate ? new Date(data.estimatedDate) : null,
      },
      include: { customer: true },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
});

// PUT /api/repairs/:id
repairsRouter.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = schema.partial().parse(req.body);
    await prisma.repair.updateMany({
      where: { id: req.params.id, shopId: req.user!.shopId },
      data:  { ...data, estimatedDate: data.estimatedDate ? new Date(data.estimatedDate) : undefined },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PATCH /api/repairs/:id/status
repairsRouter.patch('/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, finalCost } = req.body;
    const valid = ['received','diagnosing','repairing','quality_check','ready','delivered','cancelled'];
    if (!valid.includes(status)) throw new AppError('Invalid status', 400);
    const extra: any = {};
    if (status === 'delivered') extra.deliveredDate = new Date();
    if (finalCost !== undefined) extra.finalCost = finalCost;
    const result = await prisma.repair.updateMany({
      where: { id: req.params.id, shopId: req.user!.shopId },
      data:  { status, ...extra },
    });
    if (!result.count) throw new AppError('Repair ticket not found', 404);
    res.json({ success: true });
  } catch (err) { next(err); }
});

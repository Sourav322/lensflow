import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const labOrdersRouter = Router();
labOrdersRouter.use(authenticate);

const schema = z.object({
  orderId:        z.string().optional(),
  prescriptionId: z.string().optional(),
  lensId:         z.string().optional(),
  labName:        z.string().min(1),
  expectedDate:   z.string().optional(),
  cost:           z.number().optional(),
  notes:          z.string().optional(),
});

const genLabNo = () => `LAB-${Date.now().toString().slice(-8)}`;

// GET /api/lab-orders
labOrdersRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
    const where: any = { shopId: req.user!.shopId };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      prisma.labOrder.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          lens:  true,
          order: { include: { customer: true } },
          prescription: { include: { customer: true } },
        },
      }),
      prisma.labOrder.count({ where }),
    ]);
    res.json({ success: true, data, meta: { total } });
  } catch (err) { next(err); }
});

// GET /api/lab-orders/:id
labOrdersRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.labOrder.findFirst({
      where: { id: req.params.id, shopId: req.user!.shopId },
      include: {
        lens: true,
        order: { include: { customer: true, items: true } },
        prescription: { include: { customer: true } },
      },
    });
    if (!item) throw new AppError('Lab order not found', 404);
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

// POST /api/lab-orders
labOrdersRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body);
    const item = await prisma.labOrder.create({
      data: {
        ...data,
        shopId:       req.user!.shopId,
        labOrderNumber: genLabNo(),
        expectedDate:   data.expectedDate ? new Date(data.expectedDate) : null,
      },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
});

// PATCH /api/lab-orders/:id/status
labOrdersRouter.patch('/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const extra: Record<string, Date> = {};
    if (status === 'sent_to_lab') extra.sentDate     = new Date();
    if (status === 'delivered')   extra.receivedDate = new Date();
    const result = await prisma.labOrder.updateMany({
      where: { id: req.params.id, shopId: req.user!.shopId },
      data:  { status, ...extra },
    });
    if (!result.count) throw new AppError('Lab order not found', 404);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PUT /api/lab-orders/:id
labOrdersRouter.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = schema.partial().parse(req.body);
    await prisma.labOrder.updateMany({
      where: { id: req.params.id, shopId: req.user!.shopId },
      data:  { ...data, expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/lab-orders/:id
labOrdersRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.labOrder.deleteMany({ where: { id: req.params.id, shopId: req.user!.shopId } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const prescriptionsRouter = Router();
prescriptionsRouter.use(authenticate);

const schema = z.object({
  customerId: z.string(),
  date:       z.string().optional(),
  // Right eye
  reSph:  z.number().optional(), reCyl: z.number().optional(),
  reAxis: z.number().int().optional(), reAdd: z.number().optional(), reVa: z.string().optional(),
  // Left eye
  leSph:  z.number().optional(), leCyl: z.number().optional(),
  leAxis: z.number().int().optional(), leAdd: z.number().optional(), leVa: z.string().optional(),
  ipd:       z.number().optional(),
  notes:     z.string().optional(),
  nextVisit: z.string().optional(),
});

// GET /api/prescriptions
prescriptionsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId, page = '1', limit = '20' } = req.query as Record<string, string>;
    const where: any = customerId
      ? { customerId }
      : { customer: { shopId: req.user!.shopId } };
    const [data, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { date: 'desc' },
        include: { customer: true },
      }),
      prisma.prescription.count({ where }),
    ]);
    res.json({ success: true, data, meta: { total } });
  } catch (err) { next(err); }
});

// GET /api/prescriptions/:id
prescriptionsRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.prescription.findFirst({
      where: { id: req.params.id, customer: { shopId: req.user!.shopId } },
      include: { customer: true },
    });
    if (!item) throw new AppError('Prescription not found', 404);
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

// POST /api/prescriptions
prescriptionsRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body);
    const item = await prisma.prescription.create({
      data: {
        ...data,
        doctorId:  req.user!.userId,
        date:      data.date      ? new Date(data.date)      : new Date(),
        nextVisit: data.nextVisit ? new Date(data.nextVisit) : null,
      },
      include: { customer: true },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
});

// PUT /api/prescriptions/:id
prescriptionsRouter.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body);
    await prisma.prescription.update({
      where: { id: req.params.id },
      data: {
        ...data,
        date:      data.date      ? new Date(data.date)      : undefined,
        nextVisit: data.nextVisit ? new Date(data.nextVisit) : null,
      },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/prescriptions/:id
prescriptionsRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.prescription.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const lensesRouter = Router();
lensesRouter.use(authenticate);

const schema = z.object({
  barcode:    z.string().optional(),
  brand:      z.string().min(1),
  type:       z.enum(['single_vision', 'bifocal', 'progressive', 'toric', 'colored']),
  coating:    z.string().optional(),
  index:      z.number().optional(),
  powerRange: z.string().optional(),
  costPrice:  z.number().positive(),
  sellPrice:  z.number().positive(),
  stock:      z.number().int().min(0),
  minStock:   z.number().int().min(0).default(2),
});

// GET /api/lenses
lensesRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50', search, lowStock } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { shopId: req.user!.shopId, isActive: true };
    if (search) {
      where.OR = [
        { brand:   { contains: search, mode: 'insensitive' } },
        { coating: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search } },
      ];
    }
    const [lenses, total] = await Promise.all([
      prisma.lens.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.lens.count({ where }),
    ]);
    const result = lowStock === 'true' ? lenses.filter((l) => l.stock <= l.minStock) : lenses;
    res.json({ success: true, data: result, meta: { total } });
  } catch (err) { next(err); }
});

// GET /api/lenses/barcode/:code
lensesRouter.get('/barcode/:code', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lens = await prisma.lens.findFirst({
      where: { barcode: req.params.code, shopId: req.user!.shopId, isActive: true },
    });
    if (!lens) throw new AppError('Lens not found for barcode', 404);
    res.json({ success: true, data: lens });
  } catch (err) { next(err); }
});

// GET /api/lenses/:id
lensesRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lens = await prisma.lens.findFirst({ where: { id: req.params.id, shopId: req.user!.shopId } });
    if (!lens) throw new AppError('Lens not found', 404);
    res.json({ success: true, data: lens });
  } catch (err) { next(err); }
});

// POST /api/lenses
lensesRouter.post('/', authorize('admin', 'staff'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body);
    const lens = await prisma.lens.create({ data: { ...data, shopId: req.user!.shopId } });
    res.status(201).json({ success: true, data: lens });
  } catch (err) { next(err); }
});

// PUT /api/lenses/:id
lensesRouter.put('/:id', authorize('admin', 'staff'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body);
    const result = await prisma.lens.updateMany({ where: { id: req.params.id, shopId: req.user!.shopId }, data });
    if (!result.count) throw new AppError('Lens not found', 404);
    res.json({ success: true, message: 'Lens updated' });
  } catch (err) { next(err); }
});

// DELETE /api/lenses/:id
lensesRouter.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.lens.updateMany({ where: { id: req.params.id, shopId: req.user!.shopId }, data: { isActive: false } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

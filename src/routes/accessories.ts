import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const accessoriesRouter = Router();
accessoriesRouter.use(authenticate);

const schema = z.object({
  barcode:   z.string().optional(),
  name:      z.string().min(1),
  category:  z.string().optional(),
  brand:     z.string().optional(),
  costPrice: z.number().positive(),
  sellPrice: z.number().positive(),
  stock:     z.number().int().min(0),
  minStock:  z.number().int().min(0).default(2),
});

accessoriesRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query as Record<string, string>;
    const where: any = { shopId: req.user!.shopId, isActive: true };
    if (search) {
      where.OR = [
        { name:  { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }
    const data = await prisma.accessory.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

accessoriesRouter.get('/barcode/:code', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.accessory.findFirst({
      where: { barcode: req.params.code, shopId: req.user!.shopId, isActive: true },
    });
    if (!item) throw new AppError('Accessory not found', 404);
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

accessoriesRouter.post('/', authorize('admin', 'staff'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body);
    const item = await prisma.accessory.create({ data: { ...data, shopId: req.user!.shopId } });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
});

accessoriesRouter.put('/:id', authorize('admin', 'staff'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body);
    await prisma.accessory.updateMany({ where: { id: req.params.id, shopId: req.user!.shopId }, data });
    res.json({ success: true });
  } catch (err) { next(err); }
});

accessoriesRouter.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.accessory.updateMany({ where: { id: req.params.id, shopId: req.user!.shopId }, data: { isActive: false } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

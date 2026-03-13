import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const framesRouter = Router();
framesRouter.use(authenticate);

const schema = z.object({
  barcode:   z.string().optional(),
  brand:     z.string().min(1),
  model:     z.string().min(1),
  color:     z.string().optional(),
  size:      z.string().optional(),
  material:  z.string().optional(),
  type:      z.enum(['full_rim', 'half_rim', 'rimless', 'sports']).optional(),
  gender:    z.string().optional(),
  costPrice: z.number().positive(),
  sellPrice: z.number().positive(),
  mrp:       z.number().optional(),
  stock:     z.number().int().min(0),
  minStock:  z.number().int().min(0).default(2),
  imageUrl:  z.string().url().optional().or(z.literal('')),
});

// GET /api/frames
framesRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50', search, lowStock } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { shopId: req.user!.shopId, isActive: true };

    if (search) {
      where.OR = [
        { brand:   { contains: search, mode: 'insensitive' } },
        { model:   { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search } },
        { color:   { contains: search, mode: 'insensitive' } },
      ];
    }
    // low stock: where stock <= minStock — we do a raw comparison via a filter after fetch
    const [frames, total] = await Promise.all([
      prisma.frame.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.frame.count({ where }),
    ]);

    const result = lowStock === 'true' ? frames.filter((f) => f.stock <= f.minStock) : frames;
    res.json({ success: true, data: result, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { next(err); }
});

// GET /api/frames/barcode/:code  – barcode scan lookup
framesRouter.get('/barcode/:code', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const frame = await prisma.frame.findFirst({
      where: { barcode: req.params.code, shopId: req.user!.shopId, isActive: true },
    });
    if (!frame) throw new AppError('Frame not found for barcode', 404);
    res.json({ success: true, data: frame });
  } catch (err) { next(err); }
});

// GET /api/frames/:id
framesRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const frame = await prisma.frame.findFirst({
      where: { id: req.params.id, shopId: req.user!.shopId },
    });
    if (!frame) throw new AppError('Frame not found', 404);
    res.json({ success: true, data: frame });
  } catch (err) { next(err); }
});

// POST /api/frames
framesRouter.post('/', authorize('admin', 'staff'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body);
    const frame = await prisma.frame.create({
      data: { ...data, shopId: req.user!.shopId, imageUrl: data.imageUrl || null },
    });
    res.status(201).json({ success: true, data: frame });
  } catch (err) { next(err); }
});

// PUT /api/frames/:id
framesRouter.put('/:id', authorize('admin', 'staff'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body);
    const result = await prisma.frame.updateMany({
      where: { id: req.params.id, shopId: req.user!.shopId },
      data: { ...data, imageUrl: data.imageUrl || null },
    });
    if (!result.count) throw new AppError('Frame not found', 404);
    res.json({ success: true, message: 'Frame updated' });
  } catch (err) { next(err); }
});

// PATCH /api/frames/:id/stock
framesRouter.patch('/:id/stock', authorize('admin', 'staff'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { stock } = req.body;
    if (typeof stock !== 'number') throw new AppError('stock must be a number', 400);
    const result = await prisma.frame.updateMany({
      where: { id: req.params.id, shopId: req.user!.shopId },
      data: { stock },
    });
    if (!result.count) throw new AppError('Frame not found', 404);
    res.json({ success: true, message: 'Stock updated' });
  } catch (err) { next(err); }
});

// DELETE /api/frames/:id  (soft delete)
framesRouter.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.frame.updateMany({
      where: { id: req.params.id, shopId: req.user!.shopId },
      data: { isActive: false },
    });
    if (!result.count) throw new AppError('Frame not found', 404);
    res.json({ success: true, message: 'Frame deactivated' });
  } catch (err) { next(err); }
});

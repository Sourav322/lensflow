import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const staffRouter = Router();
staffRouter.use(authenticate, authorize('admin'));

const schema = z.object({
  name:     z.string().min(2),
  role:     z.string().min(1),
  phone:    z.string().optional(),
  email:    z.string().email().optional().or(z.literal('')),
  salary:   z.number().min(0).optional(),
  joinDate: z.string().optional(),
});

// GET /api/staff
staffRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.staff.findMany({
      where: { shopId: req.user!.shopId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /api/staff/:id
staffRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.staff.findFirst({
      where: { id: req.params.id, shopId: req.user!.shopId },
    });
    if (!item) throw new AppError('Staff member not found', 404);
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

// POST /api/staff
staffRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body);
    const item = await prisma.staff.create({
      data: {
        ...data,
        shopId:   req.user!.shopId,
        email:    data.email    || null,
        joinDate: data.joinDate ? new Date(data.joinDate) : null,
      },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
});

// PUT /api/staff/:id
staffRouter.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body);
    const result = await prisma.staff.updateMany({
      where: { id: req.params.id, shopId: req.user!.shopId },
      data: {
        ...data,
        email:    data.email    || null,
        joinDate: data.joinDate ? new Date(data.joinDate) : null,
      },
    });
    if (!result.count) throw new AppError('Staff member not found', 404);
    res.json({ success: true, message: 'Staff updated' });
  } catch (err) { next(err); }
});

// DELETE /api/staff/:id  (soft delete)
staffRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.staff.updateMany({
      where: { id: req.params.id, shopId: req.user!.shopId },
      data: { isActive: false },
    });
    if (!result.count) throw new AppError('Staff member not found', 404);
    res.json({ success: true, message: 'Staff member deactivated' });
  } catch (err) { next(err); }
});

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import * as auth from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Middleware references
const authenticate = auth.authenticate;
const authorize = auth.authorize;

router.use(authenticate);

const shopSchema = z.object({
  name:     z.string().min(2).optional(),
  address:  z.string().optional(),
  city:     z.string().optional(),
  state:    z.string().optional(),
  phone:    z.string().optional(),
  gstin:    z.string().optional(),
});

router.get('/', async (req: any, res: Response, next: NextFunction) => {
  try {
    const shop = await prisma.shop.findUnique({ where: { id: req.user!.shopId } });
    if (!shop) throw new AppError('Shop not found', 404);
    res.json({ success: true, data: shop });
  } catch (err) { next(err); }
});

router.put('/', authorize('ADMIN'), async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = shopSchema.parse(req.body);
    const shop = await prisma.shop.update({
      where: { id: req.user!.shopId },
      data,
    });
    res.json({ success: true, data: shop });
  } catch (err) { next(err); }
});

export default router;

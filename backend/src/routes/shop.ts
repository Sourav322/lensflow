import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import * as auth from '../middleware/auth'; // Changed to wildcard to prevent Object error
import { AppError } from '../middleware/errorHandler';
import { hashPassword } from '../utils/auth';

export const shopRouter = Router();

// Fix: Destructuring properly or using direct reference
const authenticate = auth.authenticate;
const authorize = auth.authorize;

shopRouter.use(authenticate);

const shopSchema = z.object({
  name:     z.string().min(2),
  address:  z.string().optional(),
  city:     z.string().optional(),
  state:    z.string().optional(),
  pincode:  z.string().optional(),
  phone:    z.string().optional(),
  email:    z.string().email().optional().or(z.literal('')),
  gstin:    z.string().optional(),
  currency: z.string().default('INR'),
});

// GET /api/shop
shopRouter.get('/', async (req: any, res: Response, next: NextFunction) => {
  try {
    const shop = await prisma.shop.findUnique({ where: { id: req.user!.shopId } });
    if (!shop) throw new AppError('Shop not found', 404);
    res.json({ success: true, data: shop });
  } catch (err) { next(err); }
});

// PUT /api/shop
shopRouter.put('/', authorize('admin'), async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = shopSchema.parse(req.body);
    const shop = await prisma.shop.update({
      where: { id: req.user!.shopId },
      data: { ...data, email: data.email || null },
    });
    res.json({ success: true, data: shop });
  } catch (err) { next(err); }
});

// GET /api/shop/users
shopRouter.get('/users', authorize('admin'), async (req: any, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { shopId: req.user!.shopId },
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
});

// POST /api/shop/users
shopRouter.post('/users', authorize('admin'), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) throw new AppError('name, email, password required', 400);

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new AppError('Email already registered', 409);

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { shopId: req.user!.shopId, name, email, passwordHash, role: role || 'staff' },
      select: { id: true, name: true, email: true, role: true },
    });
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
});

// PATCH /api/shop/users/:id
shopRouter.patch('/users/:id', authorize('admin'), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { name, role, isActive } = req.body;
    const userId = parseInt(req.params.id); // Convert ID to number if necessary
    
    const user = await prisma.user.updateMany({
      where: { id: userId, shopId: req.user!.shopId },
      data: { name, role, isActive },
    });
    if (!user.count) throw new AppError('User not found', 404);
    res.json({ success: true, message: 'User updated' });
  } catch (err) { next(err); }
});

export default shopRouter; // Added default export

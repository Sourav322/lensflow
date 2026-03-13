import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const customersRouter = Router();
customersRouter.use(authenticate);

const schema = z.object({
  name:        z.string().min(2),
  mobile:      z.string().min(10),
  email:       z.string().email().optional().or(z.literal('')),
  city:        z.string().optional(),
  address:     z.string().optional(),
  dateOfBirth: z.string().optional(),
  notes:       z.string().optional(),
});

// GET /api/customers
customersRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', search } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { shopId: req.user!.shopId };
    if (search) {
      where.OR = [
        { name:   { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
        { email:  { contains: search, mode: 'insensitive' } },
      ];
    }
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { orders: true, prescriptions: true } } },
      }),
      prisma.customer.count({ where }),
    ]);
    res.json({ success: true, data: customers, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { next(err); }
});

// GET /api/customers/:id
customersRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, shopId: req.user!.shopId },
      include: {
        orders:        { orderBy: { createdAt: 'desc' }, take: 10, include: { items: true, invoice: true } },
        prescriptions: { orderBy: { date: 'desc' }, take: 5 },
        repairs:       { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!customer) throw new AppError('Customer not found', 404);
    res.json({ success: true, data: customer });
  } catch (err) { next(err); }
});

// POST /api/customers
customersRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body);
    const customer = await prisma.customer.create({
      data: {
        ...data,
        shopId: req.user!.shopId,
        email:       data.email || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      },
    });
    res.status(201).json({ success: true, data: customer });
  } catch (err) { next(err); }
});

// PUT /api/customers/:id
customersRouter.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body);
    const result = await prisma.customer.updateMany({
      where: { id: req.params.id, shopId: req.user!.shopId },
      data: {
        ...data,
        email:       data.email || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      },
    });
    if (!result.count) throw new AppError('Customer not found', 404);
    res.json({ success: true, message: 'Customer updated' });
  } catch (err) { next(err); }
});

// DELETE /api/customers/:id
customersRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.customer.deleteMany({
      where: { id: req.params.id, shopId: req.user!.shopId },
    });
    if (!result.count) throw new AppError('Customer not found', 404);
    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) { next(err); }
});

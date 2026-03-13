import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const ordersRouter = Router();
ordersRouter.use(authenticate);

const itemSchema = z.object({
  itemType:    z.enum(['frame', 'lens', 'accessory']),
  frameId:     z.string().optional(),
  lensId:      z.string().optional(),
  accessoryId: z.string().optional(),
  name:        z.string(),
  qty:         z.number().int().positive(),
  unitPrice:   z.number().positive(),
});

const createSchema = z.object({
  customerId:    z.string(),
  items:         z.array(itemSchema).min(1),
  discountType:  z.enum(['flat', 'percent']).optional(),
  discountValue: z.number().min(0).optional(),
  taxPct:        z.number().min(0).max(100).optional(),
  paymentMode:   z.enum(['cash', 'upi', 'card', 'netbanking', 'cheque', 'credit']),
  amountPaid:    z.number().min(0),
  notes:         z.string().optional(),
  deliveryDate:  z.string().optional(),
});

const genOrderNo  = () => `ORD-${Date.now().toString().slice(-8)}`;
const genInvoNo   = () => `INV-${Date.now().toString().slice(-8)}`;

// GET /api/orders
ordersRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', status, search } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { shopId: req.user!.shopId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { customer: true, items: true, invoice: true },
      }),
      prisma.order.count({ where }),
    ]);
    res.json({ success: true, data: orders, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { next(err); }
});

// GET /api/orders/:id
ordersRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, shopId: req.user!.shopId },
      include: {
        customer:  true,
        items:     true,
        invoice:   true,
        createdBy: { select: { name: true } },
      },
    });
    if (!order) throw new AppError('Order not found', 404);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

// POST /api/orders  ──  creates order + invoice + deducts stock atomically
ordersRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = createSchema.parse(req.body);
    const shopId = req.user!.shopId;

    // Compute totals
    const subtotal    = body.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    const discountAmt = body.discountType === 'percent'
      ? subtotal * (body.discountValue ?? 0) / 100
      : (body.discountValue ?? 0);
    const taxAmt  = (subtotal - discountAmt) * (body.taxPct ?? 0) / 100;
    const total   = Math.max(0, subtotal - discountAmt + taxAmt);
    const change  = Math.max(0, body.amountPaid - total);

    const result = await prisma.$transaction(async (tx) => {
      // ── Validate & deduct stock ───────────────────────────────────────────
      for (const item of body.items) {
        if (item.itemType === 'frame' && item.frameId) {
          const f = await tx.frame.findFirst({ where: { id: item.frameId, shopId } });
          if (!f) throw new AppError(`Frame ${item.frameId} not found`, 404);
          if (f.stock < item.qty) throw new AppError(`Insufficient stock for "${f.brand} ${f.model}"`, 400);
          await tx.frame.update({ where: { id: item.frameId }, data: { stock: { decrement: item.qty } } });
        }
        if (item.itemType === 'lens' && item.lensId) {
          const l = await tx.lens.findFirst({ where: { id: item.lensId, shopId } });
          if (!l) throw new AppError(`Lens ${item.lensId} not found`, 404);
          if (l.stock < item.qty) throw new AppError(`Insufficient stock for "${l.brand}" lens`, 400);
          await tx.lens.update({ where: { id: item.lensId }, data: { stock: { decrement: item.qty } } });
        }
        if (item.itemType === 'accessory' && item.accessoryId) {
          const a = await tx.accessory.findFirst({ where: { id: item.accessoryId, shopId } });
          if (!a) throw new AppError(`Accessory ${item.accessoryId} not found`, 404);
          if (a.stock < item.qty) throw new AppError(`Insufficient stock for "${a.name}"`, 400);
          await tx.accessory.update({ where: { id: item.accessoryId }, data: { stock: { decrement: item.qty } } });
        }
      }

      // ── Create order ───────────────────────────────────────────────────────
      const order = await tx.order.create({
        data: {
          shopId,
          customerId:    body.customerId,
          createdById:   req.user!.userId,
          orderNumber:   genOrderNo(),
          status:        'confirmed',
          subtotal,
          discountType:  body.discountType,
          discountValue: body.discountValue ?? 0,
          discountAmt,
          taxPct:        body.taxPct ?? 0,
          taxAmt,
          total,
          paymentMode:   body.paymentMode,
          amountPaid:    body.amountPaid,
          changeGiven:   change,
          notes:         body.notes,
          deliveryDate:  body.deliveryDate ? new Date(body.deliveryDate) : null,
          items: {
            create: body.items.map((i) => ({
              itemType:    i.itemType,
              frameId:     i.frameId     ?? null,
              lensId:      i.lensId      ?? null,
              accessoryId: i.accessoryId ?? null,
              name:        i.name,
              qty:         i.qty,
              unitPrice:   i.unitPrice,
              total:       i.unitPrice * i.qty,
            })),
          },
        },
        include: { items: true, customer: true },
      });

      // ── Auto-create invoice ────────────────────────────────────────────────
      const invoice = await tx.invoice.create({
        data: { shopId, orderId: order.id, invoiceNumber: genInvoNo() },
      });

      // ── Update customer totals & loyalty ──────────────────────────────────
      await tx.customer.update({
        where: { id: body.customerId },
        data: {
          totalSpent:   { increment: total },
          totalOrders:  { increment: 1 },
          loyaltyPoints:{ increment: Math.floor(total / 100) },
        },
      });

      return { order, invoice };
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// PATCH /api/orders/:id/status
ordersRouter.patch('/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const valid = ['pending','confirmed','processing','ready','delivered','cancelled'];
    if (!valid.includes(status)) throw new AppError('Invalid status', 400);
    const result = await prisma.order.updateMany({
      where: { id: req.params.id, shopId: req.user!.shopId },
      data: { status },
    });
    if (!result.count) throw new AppError('Order not found', 404);
    res.json({ success: true });
  } catch (err) { next(err); }
});

import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const reportsRouter = Router();
reportsRouter.use(authenticate);

// ── GET /api/reports/dashboard ────────────────────────────────────────────────
reportsRouter.get('/dashboard', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId;

    const today       = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart  = new Date(today.getFullYear(), today.getMonth(), 1);
    const lMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lMonthEnd   = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

    // ── Core aggregates ────────────────────────────────────────────────────
    const [
      todayAgg, monthAgg, lMonthAgg,
      totalCustomers, newCustomers,
      pendingLab, openRepairs,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { shopId, createdAt: { gte: today }, status: { not: 'cancelled' } },
        _sum: { total: true }, _count: true,
      }),
      prisma.order.aggregate({
        where: { shopId, createdAt: { gte: monthStart }, status: { not: 'cancelled' } },
        _sum: { total: true }, _count: true,
      }),
      prisma.order.aggregate({
        where: { shopId, createdAt: { gte: lMonthStart, lte: lMonthEnd }, status: { not: 'cancelled' } },
        _sum: { total: true }, _count: true,
      }),
      prisma.customer.count({ where: { shopId } }),
      prisma.customer.count({ where: { shopId, createdAt: { gte: monthStart } } }),
      prisma.labOrder.count({ where: { shopId, status: { notIn: ['delivered', 'cancelled'] } } }),
      prisma.repair.count({   where: { shopId, status: { notIn: ['delivered', 'cancelled'] } } }),
    ]);

    // ── Low stock counts ───────────────────────────────────────────────────
    const allFrames = await prisma.frame.findMany({
      where: { shopId, isActive: true }, select: { stock: true, minStock: true },
    });
    const allLenses = await prisma.lens.findMany({
      where: { shopId, isActive: true }, select: { stock: true, minStock: true },
    });
    const lowStockFrames = allFrames.filter((f) => f.stock <= f.minStock).length;
    const lowStockLenses = allLenses.filter((l) => l.stock <= l.minStock).length;

    // ── 7-day daily revenue ────────────────────────────────────────────────
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const recentOrders = await prisma.order.findMany({
      where: { shopId, createdAt: { gte: sevenDaysAgo }, status: { not: 'cancelled' } },
      select: { createdAt: true, total: true },
    });

    // Build day-keyed map
    const dailyMap: Record<string, { revenue: number; orders: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dailyMap[d.toISOString().split('T')[0]] = { revenue: 0, orders: 0 };
    }
    recentOrders.forEach((o) => {
      const k = o.createdAt.toISOString().split('T')[0];
      if (dailyMap[k]) {
        dailyMap[k].revenue += Number(o.total);
        dailyMap[k].orders  += 1;
      }
    });

    const dailyRevenue = Object.entries(dailyMap).map(([date, v]) => ({
      date,
      label: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      revenue: v.revenue,
      orders:  v.orders,
    }));

    // ── 6-month revenue ────────────────────────────────────────────────────
    const sixMonthRevenue: { month: string; revenue: number; orders: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ms = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const me = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59);
      const agg = await prisma.order.aggregate({
        where: { shopId, createdAt: { gte: ms, lte: me }, status: { not: 'cancelled' } },
        _sum: { total: true }, _count: true,
      });
      sixMonthRevenue.push({
        month:   ms.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        revenue: Number(agg._sum.total ?? 0),
        orders:  agg._count,
      });
    }

    // ── Top 5 frames by units sold ─────────────────────────────────────────
    const topFrameGroups = await prisma.orderItem.groupBy({
      by:    ['frameId'],
      where: { order: { shopId }, frameId: { not: null } },
      _sum:  { qty: true, total: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: 5,
    });

    const topFrames = await Promise.all(
      topFrameGroups.map(async (g) => {
        const frame = await prisma.frame.findUnique({ where: { id: g.frameId! } });
        return {
          frame,
          soldQty: Number(g._sum.qty  ?? 0),
          revenue: Number(g._sum.total ?? 0),
        };
      })
    );

    // ── Month-over-month % change ──────────────────────────────────────────
    const thisMonthRev  = Number(monthAgg._sum.total  ?? 0);
    const lastMonthRev  = Number(lMonthAgg._sum.total ?? 0);
    const revChange     = lastMonthRev > 0
      ? (((thisMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1)
      : null;

    res.json({
      success: true,
      data: {
        today: {
          revenue: Number(todayAgg._sum.total ?? 0),
          orders:  todayAgg._count,
        },
        month: {
          revenue:   thisMonthRev,
          orders:    monthAgg._count,
          revChange, // e.g. "12.5" or "-3.2"
        },
        lastMonth: {
          revenue: lastMonthRev,
          orders:  lMonthAgg._count,
        },
        customers: {
          total:        totalCustomers,
          newThisMonth: newCustomers,
        },
        pending: {
          lab:     pendingLab,
          repairs: openRepairs,
        },
        lowStock: {
          frames: lowStockFrames,
          lenses: lowStockLenses,
        },
        dailyRevenue,
        sixMonthRevenue,
        topFrames,
      },
    });
  } catch (err) { next(err); }
});

// ── GET /api/reports/sales ────────────────────────────────────────────────────
reportsRouter.get('/sales', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId;
    const { from, to, page = '1', limit = '50' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { shopId, status: { not: 'cancelled' } };
    if (from) where.createdAt = { ...where.createdAt, gte: new Date(from) };
    if (to)   where.createdAt = { ...where.createdAt, lte: new Date(to)   };

    const [orders, total, aggregate] = await Promise.all([
      prisma.order.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { customer: true, items: true },
      }),
      prisma.order.count({ where }),
      prisma.order.aggregate({ where, _sum: { total: true, discountAmt: true, taxAmt: true } }),
    ]);

    res.json({
      success: true,
      data:    orders,
      summary: {
        totalRevenue:  Number(aggregate._sum.total       ?? 0),
        totalDiscount: Number(aggregate._sum.discountAmt ?? 0),
        totalTax:      Number(aggregate._sum.taxAmt      ?? 0),
        orderCount:    total,
      },
      meta: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) { next(err); }
});

// ── GET /api/reports/inventory ────────────────────────────────────────────────
reportsRouter.get('/inventory', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId;

    const [frames, lenses, accessories] = await Promise.all([
      prisma.frame.findMany({ where: { shopId, isActive: true } }),
      prisma.lens.findMany({ where: { shopId, isActive: true } }),
      prisma.accessory.findMany({ where: { shopId, isActive: true } }),
    ]);

    const stockValue = (items: { stock: number; costPrice: any }[]) =>
      items.reduce((s, i) => s + i.stock * Number(i.costPrice), 0);

    res.json({
      success: true,
      data: {
        frames: {
          total:    frames.length,
          lowStock: frames.filter((f) => f.stock <= f.minStock).length,
          outOfStock: frames.filter((f) => f.stock === 0).length,
          stockValue: stockValue(frames),
        },
        lenses: {
          total:    lenses.length,
          lowStock: lenses.filter((l) => l.stock <= l.minStock).length,
          outOfStock: lenses.filter((l) => l.stock === 0).length,
          stockValue: stockValue(lenses),
        },
        accessories: {
          total:    accessories.length,
          lowStock: accessories.filter((a) => a.stock <= a.minStock).length,
          outOfStock: accessories.filter((a) => a.stock === 0).length,
          stockValue: stockValue(accessories),
        },
      },
    });
  } catch (err) { next(err); }
});

// ── GET /api/reports/customers ────────────────────────────────────────────────
reportsRouter.get('/customers', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId;

    const topCustomers = await prisma.customer.findMany({
      where:   { shopId },
      orderBy: { totalSpent: 'desc' },
      take:    10,
    });

    res.json({ success: true, data: topCustomers });
  } catch (err) { next(err); }
});

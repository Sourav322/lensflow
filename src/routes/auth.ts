import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import {
  generateTokens, hashPassword, comparePassword,
  verifyRefreshToken, refreshExpiresAt,
} from '../utils/auth';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

// ── Schemas ───────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  shopName: z.string().min(2),
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  city:     z.string().optional(),
  phone:    z.string().optional(),
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already registered', 409);

    const passwordHash = await hashPassword(data.password);

    const { shop, user } = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: { name: data.shopName, city: data.city, phone: data.phone },
      });
      const user = await tx.user.create({
        data: { shopId: shop.id, name: data.name, email: data.email, passwordHash, role: 'admin' },
      });
      return { shop, user };
    });

    const { accessToken, refreshToken } = generateTokens({
      userId: user.id, shopId: shop.id, role: user.role, email: user.email,
    });

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt: refreshExpiresAt() },
    });

    res.status(201).json({
      success: true,
      data: {
        accessToken, refreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, shopId: shop.id, shopName: shop.name },
      },
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { shop: true },
    });
    if (!user || !user.isActive) throw new AppError('Invalid credentials', 401);

    const valid = await comparePassword(data.password, user.passwordHash);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const { accessToken, refreshToken } = generateTokens({
      userId: user.id, shopId: user.shopId, role: user.role, email: user.email,
    });

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt: refreshExpiresAt() },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    res.json({
      success: true,
      data: {
        accessToken, refreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, shopId: user.shopId, shopName: user.shop.name },
      },
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400);

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) throw new AppError('Invalid or expired refresh token', 401);

    const payload = verifyRefreshToken(refreshToken);
    const { accessToken, refreshToken: newRefresh } = generateTokens(payload);

    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: stored.id } }),
      prisma.refreshToken.create({ data: { userId: stored.userId, token: newRefresh, expiresAt: refreshExpiresAt() } }),
    ]);

    res.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
  } catch (err) { next(err); }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
authRouter.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { next(err); }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { shop: true },
    });
    if (!user) throw new AppError('User not found', 404);
    res.json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email, role: user.role, shopId: user.shopId, shopName: user.shop.name, shop: user.shop },
    });
  } catch (err) { next(err); }
});

// ── PATCH /api/auth/change-password ──────────────────────────────────────────
authRouter.patch('/change-password', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) throw new AppError('New password must be at least 8 characters', 400);

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new AppError('User not found', 404);

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) throw new AppError('Current password is incorrect', 401);

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
});

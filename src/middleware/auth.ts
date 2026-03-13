import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/auth';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const authenticate = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AppError('Access token required', 401));
  try {
    req.user = verifyAccessToken(header.split(' ')[1]);
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
};

export const authorize =
  (...roles: string[]) =>
  (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Not authenticated', 401));
    if (!roles.includes(req.user.role))
      return next(new AppError('Insufficient permissions', 403));
    next();
  };

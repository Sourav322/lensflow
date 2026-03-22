// backend/src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';

export const authenticate = (req: any, res: Response, next: NextFunction) => {
  // TEMP user (replace later with JWT logic)
  req.user = { shopId: 1, role: 'admin' };
  next();
};

export const authorize = (role: string) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
    public isOperational = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  // Operational / known errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return res.status(422).json({ success: false, error: `Validation error: ${messages}` });
  }

  // Prisma unique-constraint
  if ((err as any)?.code === 'P2002') {
    return res.status(409).json({ success: false, error: 'A record with this value already exists.' });
  }

  // Prisma record not found
  if ((err as any)?.code === 'P2025') {
    return res.status(404).json({ success: false, error: 'Record not found.' });
  }

  // Unknown
  logger.error((err as Error)?.message ?? 'Unknown error', { stack: (err as Error)?.stack });
  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err as Error)?.message,
  });
};

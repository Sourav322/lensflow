import { Request, Response, NextFunction } from "express"

export class AppError extends Error {
  constructor(public message: string, public status: number = 500) {
    super(message)
    this.name = "AppError"
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err)

  const status = err.status || err.statusCode || 500
  const message = err.message || "Internal Server Error"

  res.status(status).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err : undefined
  })
}

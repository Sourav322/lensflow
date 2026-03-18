import { Request, Response, NextFunction } from "express"
import { verifyToken } from "../utils/auth"

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; role: string; shopId: number }
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization

  if (!header) {
    return res.status(401).json({ error: "No token provided" })
  }

  const token = header.split(" ")[1]

  const decoded = verifyToken(token)

  if (!decoded || typeof decoded === 'string') {
    return res.status(401).json({ error: "Invalid token" })
  }

  req.user = decoded as any
  next()
}

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" })
    }

    next()
  }
}

export const authMiddleware = authenticate

import { Request, Response, NextFunction } from "express"
import { verifyToken } from "../utils/auth"

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; shopId: string; role: string }
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
    return res.status(401).json({ message: "No token provided" })
  }

  const token = header.split(" ")[1]

  const decoded = verifyToken(token) as any

  if (!decoded) {
    return res.status(401).json({ message: "Invalid token" })
  }

  req.user = { userId: decoded.userId, shopId: decoded.shopId, role: decoded.role || 'staff' }

  next()
}

export function authorize(requiredRole: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" })
    }

    if (req.user.role !== requiredRole && requiredRole !== 'any') {
      return res.status(403).json({ message: "Insufficient permissions" })
    }

    next()
  }
}

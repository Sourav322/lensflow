import { Request, Response, NextFunction } from "express"
import { verifyToken } from "../utils/auth"

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization

  if (!header) {
    return res.status(401).json({ message: "No token provided" })
  }

  const token = header.split(" ")[1]

  const decoded = verifyToken(token)

  if (!decoded) {
    return res.status(401).json({ message: "Invalid token" })
  }

  next()
}

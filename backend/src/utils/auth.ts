import jwt from "jsonwebtoken"
import bcryptjs from "bcryptjs"

export interface TokenPayload {
  id: number
  role: string
  shopId: number
}

export function generateToken(userId: number, role: string = 'staff', shopId: number = 0) {
  return jwt.sign(
    { id: userId, role, shopId },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "7d" }
  )
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "secret") as TokenPayload | null
  } catch {
    return null
  }
}

export async function hashPassword(password: string) {
  return await bcryptjs.hash(password, 10)
}

export async function comparePassword(password: string, hashedPassword: string) {
  return await bcryptjs.compare(password, hashedPassword)
}

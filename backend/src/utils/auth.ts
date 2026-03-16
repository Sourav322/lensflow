import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

export function generateToken(userId: string, shopId?: string, role?: string) {
  return jwt.sign(
    { userId, shopId, role },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "7d" }
  )
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "secret")
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

import { Router } from "express"
import { prisma } from "../lib/prisma"
import { generateToken } from "../utils/auth"

const router = Router()

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid credentials" })
    }

    const token = generateToken(String(user.id))

    res.json({ success: true, data: { token, user } })
  } catch (error) {
    res.status(500).json({ success: false, message: "Login failed" })
  }
})

export default router

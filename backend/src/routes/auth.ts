import { Router } from "express"
import { prisma } from "../lib/prisma"
import { generateToken } from "../utils/auth"

const router = Router()

router.post("/login", async (req, res) => {
  const { email, password } = req.body

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid credentials" })
  }

  const token = generateToken(user.id)

  res.json({ token, user })
})

export default router

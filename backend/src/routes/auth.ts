import { Router } from "express"
import { prisma } from "../lib/prisma"
import { generateToken, hashPassword, comparePassword } from "../utils/auth"

const router = Router()

// Register new shop admin (setup endpoint)
router.post("/register", async (req, res) => {
  try {
    const { shopName, city, phone, name, email, password } = req.body

    if (!shopName || !city || !name || !email || !password) {
      return res.status(400).json({ error: "Sab fields zaroori hain" })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password kam se kam 8 characters ka hona chahiye" })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(409).json({ error: "Yeh email pehle se use ho raha hai" })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create shop
    const shop = await prisma.shop.create({
      data: {
        name: shopName,
        city,
        phone,
        address: "",
        state: "",
        gstin: "",
      },
    })

    // Create admin user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "ADMIN",
        shopId: shop.id,
      },
    })

    // Generate tokens
    const accessToken = generateToken(user.id, user.role, shop.id)
    const refreshToken = generateToken(user.id, user.role, shop.id)

    res.status(201).json({
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, shopId: shop.id, shopName: shop.name },
        accessToken,
        refreshToken,
      },
    })
  } catch (err: any) {
    console.error("Register error:", err)
    res.status(500).json({ error: err.message || "Setup failed — dobara try karein" })
  }
})

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const isValidPassword = await comparePassword(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const shop = await prisma.shop.findUnique({ where: { id: user.shopId } })

    const accessToken = generateToken(user.id, user.role, user.shopId)
    const refreshToken = generateToken(user.id, user.role, user.shopId)

    res.json({
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, shopId: user.shopId, shopName: shop?.name || "" },
        accessToken,
        refreshToken,
      },
    })
  } catch (err: any) {
    console.error("Login error:", err)
    res.status(500).json({ error: "Login failed" })
  }
})

export default router

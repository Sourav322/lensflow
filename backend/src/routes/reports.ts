import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/dashboard", async (_, res) => {
  try {
    const sales = await prisma.order.aggregate({
      _sum: { total: true },
      _count: true
    })
    res.json({ success: true, data: sales })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load dashboard data" })
  }
})

router.get("/inventory", async (_, res) => {
  try {
    const inventory = await prisma.product.groupBy({
      by: ['category'],
      _count: true
    })
    res.json({ success: true, data: inventory })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load inventory report" })
  }
})

router.get("/customers", async (_, res) => {
  try {
    const customers = await prisma.customer.findMany()
    res.json({ success: true, data: customers })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load customer report" })
  }
})

router.get("/sales", async (_, res) => {
  try {
    const sales = await prisma.order.aggregate({
      _sum: { total: true },
      _count: true
    })
    res.json({ success: true, data: sales })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load sales report" })
  }
})

export default router

import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/dashboard", async (_, res) => {
  try {
    const totalOrders = await prisma.order.count()
    const totalCustomers = await prisma.customer.count()
    const totalProducts = await prisma.product.count()
    const totalRevenue = await prisma.order.aggregate({
      _sum: { totalAmount: true }
    })
    
    res.json({ success: true, data: { totalOrders, totalCustomers, totalProducts, totalRevenue: totalRevenue._sum.totalAmount || 0 } })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load dashboard data" })
  }
})

router.get("/inventory", async (_, res) => {
  try {
    const inventory = await prisma.product.groupBy({
      by: ['category'],
      _count: true,
      _sum: { stock: true }
    })
    res.json({ success: true, data: inventory })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load inventory report" })
  }
})

router.get("/customers", async (_, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { _count: { select: { orders: true } } }
    })
    res.json({ success: true, data: customers })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load customer report" })
  }
})

router.get("/sales", async (_, res) => {
  try {
    const sales = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      _count: true
    })
    res.json({ success: true, data: sales })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load sales report" })
  }
})

export default router

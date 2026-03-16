import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  try {
    const orders = await prisma.order.findMany()
    res.json({ success: true, data: orders })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load orders" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } })
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load order" })
  }
})

router.post("/", async (req, res) => {
  try {
    const order = await prisma.order.create({ data: req.body })
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create order" })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: req.body
    })
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update order" })
  }
})

export default router

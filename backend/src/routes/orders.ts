import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { customer: true, orderItems: { include: { product: true } } }
    })
    res.json({ success: true, data: orders })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load orders" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { customer: true, orderItems: { include: { product: true } } }
    })
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
    const order = await prisma.order.create({
      data: req.body,
      include: { customer: true, orderItems: { include: { product: true } } }
    })
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create order" })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
      include: { customer: true, orderItems: { include: { product: true } } }
    })
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update order" })
  }
})

export default router

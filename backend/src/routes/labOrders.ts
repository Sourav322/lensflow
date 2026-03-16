import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  try {
    const orders = await prisma.labOrder.findMany()
    res.json({ success: true, data: orders })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load lab orders" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const order = await prisma.labOrder.findUnique({ where: { id: req.params.id } })
    if (!order) {
      return res.status(404).json({ success: false, message: "Lab order not found" })
    }
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load lab order" })
  }
})

router.post("/", async (req, res) => {
  try {
    const order = await prisma.labOrder.create({ data: req.body })
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create lab order" })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const order = await prisma.labOrder.update({
      where: { id: req.params.id },
      data: req.body
    })
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update lab order" })
  }
})

export default router

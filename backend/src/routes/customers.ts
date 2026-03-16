import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  try {
    const customers = await prisma.customer.findMany()
    res.json({ success: true, data: customers })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load customers" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({ 
      where: { id: parseInt(req.params.id) }
    })
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" })
    }
    res.json({ success: true, data: customer })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load customer" })
  }
})

router.post("/", async (req, res) => {
  try {
    const customer = await prisma.customer.create({ data: req.body })
    res.json({ success: true, data: customer })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create customer" })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const customer = await prisma.customer.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    })
    res.json({ success: true, data: customer })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update customer" })
  }
})

export default router

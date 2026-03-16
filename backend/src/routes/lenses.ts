import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  try {
    const lenses = await prisma.product.findMany({
      where: { category: 'LENS' }
    })
    res.json({ success: true, data: lenses })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load lenses" })
  }
})

router.get("/barcode/:code", async (req, res) => {
  try {
    const lens = await prisma.product.findFirst({
      where: { category: 'LENS', sku: req.params.code }
    })
    if (!lens) {
      return res.status(404).json({ success: false, message: "Lens not found" })
    }
    res.json({ success: true, data: lens })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to lookup barcode" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const lens = await prisma.product.findFirst({
      where: { id: parseInt(req.params.id), category: 'LENS' }
    })
    if (!lens) {
      return res.status(404).json({ success: false, message: "Lens not found" })
    }
    res.json({ success: true, data: lens })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load lens" })
  }
})

router.post("/", async (req, res) => {
  try {
    const lens = await prisma.product.create({
      data: { ...req.body, category: 'LENS' }
    })
    res.json({ success: true, data: lens })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create lens" })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const lens = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    })
    res.json({ success: true, data: lens })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update lens" })
  }
})

export default router

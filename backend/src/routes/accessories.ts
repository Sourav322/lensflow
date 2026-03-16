import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  try {
    const accessories = await prisma.product.findMany({
      where: { category: 'ACCESSORY' }
    })
    res.json({ success: true, data: accessories })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load accessories" })
  }
})

router.get("/barcode/:code", async (req, res) => {
  try {
    const accessory = await prisma.product.findFirst({
      where: { category: 'ACCESSORY', sku: req.params.code }
    })
    if (!accessory) {
      return res.status(404).json({ success: false, message: "Accessory not found" })
    }
    res.json({ success: true, data: accessory })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to lookup barcode" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const accessory = await prisma.product.findFirst({
      where: { id: parseInt(req.params.id), category: 'ACCESSORY' }
    })
    if (!accessory) {
      return res.status(404).json({ success: false, message: "Accessory not found" })
    }
    res.json({ success: true, data: accessory })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load accessory" })
  }
})

router.post("/", async (req, res) => {
  try {
    const item = await prisma.product.create({
      data: { ...req.body, category: 'ACCESSORY' }
    })
    res.json({ success: true, data: item })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create accessory" })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const item = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    })
    res.json({ success: true, data: item })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update accessory" })
  }
})

export default router

import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  try {
    const lenses = await prisma.lens.findMany()
    res.json({ success: true, data: lenses })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load lenses" })
  }
})

router.get("/barcode/:code", async (req, res) => {
  try {
    const lens = await prisma.lens.findFirst({
      where: { barcode: req.params.code }
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
    const lens = await prisma.lens.findUnique({ where: { id: req.params.id } })
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
    const lens = await prisma.lens.create({ data: req.body })
    res.json({ success: true, data: lens })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create lens" })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const lens = await prisma.lens.update({
      where: { id: req.params.id },
      data: req.body
    })
    res.json({ success: true, data: lens })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update lens" })
  }
})

export default router

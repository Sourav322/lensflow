import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  try {
    const repairs = await prisma.repair.findMany()
    res.json({ success: true, data: repairs })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load repairs" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const repair = await prisma.repair.findUnique({ where: { id: req.params.id } })
    if (!repair) {
      return res.status(404).json({ success: false, message: "Repair not found" })
    }
    res.json({ success: true, data: repair })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load repair" })
  }
})

router.post("/", async (req, res) => {
  try {
    const repair = await prisma.repair.create({ data: req.body })
    res.json({ success: true, data: repair })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create repair" })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const repair = await prisma.repair.update({
      where: { id: req.params.id },
      data: req.body
    })
    res.json({ success: true, data: repair })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update repair" })
  }
})

export default router

import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  try {
    const staff = await prisma.staff.findMany()
    res.json({ success: true, data: staff })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load staff" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const staff = await prisma.staff.findUnique({ where: { id: req.params.id } })
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" })
    }
    res.json({ success: true, data: staff })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load staff" })
  }
})

router.post("/", async (req, res) => {
  try {
    const staff = await prisma.staff.create({ data: req.body })
    res.json({ success: true, data: staff })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create staff" })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const staff = await prisma.staff.update({
      where: { id: req.params.id },
      data: req.body
    })
    res.json({ success: true, data: staff })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update staff" })
  }
})

export default router

import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      include: { customer: true }
    })
    res.json({ success: true, data: prescriptions })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load prescriptions" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { customer: true }
    })
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found" })
    }
    res.json({ success: true, data: prescription })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load prescription" })
  }
})

router.post("/", async (req, res) => {
  try {
    const prescription = await prisma.prescription.create({
      data: req.body,
      include: { customer: true }
    })
    res.json({ success: true, data: prescription })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create prescription" })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const prescription = await prisma.prescription.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
      include: { customer: true }
    })
    res.json({ success: true, data: prescription })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update prescription" })
  }
})

export default router

import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  res.json(await prisma.prescription.findMany())
})

router.post("/", async (req, res) => {
  const prescription = await prisma.prescription.create({ data: req.body })
  res.json(prescription)
})

export default router

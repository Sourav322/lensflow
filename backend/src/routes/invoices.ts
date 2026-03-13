import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  res.json(await prisma.invoice.findMany())
})

router.post("/", async (req, res) => {
  const invoice = await prisma.invoice.create({ data: req.body })
  res.json(invoice)
})

export default router

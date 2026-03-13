import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  res.json(await prisma.labOrder.findMany())
})

router.post("/", async (req, res) => {
  const order = await prisma.labOrder.create({ data: req.body })
  res.json(order)
})

export default router

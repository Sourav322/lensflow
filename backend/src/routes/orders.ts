import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  res.json(await prisma.order.findMany())
})

router.post("/", async (req, res) => {
  const order = await prisma.order.create({ data: req.body })
  res.json(order)
})

export default router

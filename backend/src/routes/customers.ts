import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  const customers = await prisma.customer.findMany()
  res.json(customers)
})

router.post("/", async (req, res) => {
  const customer = await prisma.customer.create({ data: req.body })
  res.json(customer)
})

export default router

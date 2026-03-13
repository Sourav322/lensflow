import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/sales", async (_, res) => {
  const sales = await prisma.order.aggregate({
    _sum: { total: true }
  })

  res.json(sales)
})

export default router

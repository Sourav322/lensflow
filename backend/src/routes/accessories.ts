import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  res.json(await prisma.accessory.findMany())
})

router.post("/", async (req, res) => {
  const item = await prisma.accessory.create({ data: req.body })
  res.json(item)
})

export default router

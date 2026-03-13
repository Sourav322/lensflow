import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  res.json(await prisma.frame.findMany())
})

router.post("/", async (req, res) => {
  const frame = await prisma.frame.create({ data: req.body })
  res.json(frame)
})

export default router

import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  res.json(await prisma.lens.findMany())
})

router.post("/", async (req, res) => {
  const lens = await prisma.lens.create({ data: req.body })
  res.json(lens)
})

export default router

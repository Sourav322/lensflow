import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  res.json(await prisma.repair.findMany())
})

router.post("/", async (req, res) => {
  const repair = await prisma.repair.create({ data: req.body })
  res.json(repair)
})

export default router

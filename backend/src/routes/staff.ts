import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (_, res) => {
  res.json(await prisma.staff.findMany())
})

router.post("/", async (req, res) => {
  const staff = await prisma.staff.create({ data: req.body })
  res.json(staff)
})

export default router

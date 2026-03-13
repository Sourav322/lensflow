import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/:code", async (req, res) => {

  const code = req.params.code

  const frame = await prisma.frame.findUnique({
    where: { barcode: code }
  })

  if (frame) return res.json(frame)

  const lens = await prisma.lens.findUnique({
    where: { barcode: code }
  })

  if (lens) return res.json(lens)

  const accessory = await prisma.accessory.findUnique({
    where: { barcode: code }
  })

  res.json(accessory)
})

export default router

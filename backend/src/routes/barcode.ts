import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/:code", async (req, res) => {
  const { code } = req.params

  try {
    // 1. Teeno tables ko ek saath parallelly search karega (Faster)
    const [frame, lens, accessory] = await Promise.all([
      prisma.frame.findUnique({ where: { barcode: code } }),
      prisma.lens.findUnique({ where: { barcode: code } }),
      prisma.accessory.findUnique({ where: { barcode: code } })
    ])

    // 2. Jo bhi result mile, usko return karega
    if (frame) return res.json({ ...frame, type: 'FRAME' })
    if (lens) return res.json({ ...lens, type: 'LENS' })
    if (accessory) return res.json({ ...accessory, type: 'ACCESSORY' })

    // 3. Agar kuch nahi mila toh 404 error return karega
    return res.status(404).json({ 
      success: false, 
      message: "Product not found" 
    })

  } catch (error) {
    console.error("Search Error:", error)
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    })
  }
})

export default router

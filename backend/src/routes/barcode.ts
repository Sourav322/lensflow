import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/:code", async (req, res) => {
  const { code } = req.params

  try {
    // Schema ke hisaab se Product table mein SKU search karein
    const product = await prisma.product.findUnique({
      where: { sku: code } // Schema mein 'sku' unique hai, use hi barcode ki tarah use karein
    })

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      })
    }

    // Category ke hisaab se type bhej dein
    return res.json({
      ...product,
      type: product.category 
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

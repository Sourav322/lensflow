import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/:code", async (req, res) => {
  const { code } = req.params;

  try {
    // Single 'product' table mein SKU search karein
    const product = await prisma.product.findUnique({
      where: { sku: code }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found in inventory"
      });
    }

    // Category ke hisaab se frontend ko bataein kya hai
    res.json({
      ...product,
      type: product.category 
    });

  } catch (error) {
    console.error("Barcode Search Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;

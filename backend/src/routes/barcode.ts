import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/:code", async (req, res) => {
  const { code } = req.params;
  try {
    const product = await prisma.product.findUnique({
      where: { sku: code }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ ...product, type: product.category });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;

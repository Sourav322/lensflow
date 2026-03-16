import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/:code", async (req, res) => {
  const { code } = req.params;
  try {
    const product = await prisma.product.findFirst({
      where: { sku: code }
    });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;

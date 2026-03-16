import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const invoices = await prisma.order.findMany({
      include: { customer: true, orderItems: true }
    });
    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load invoices" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const invoice = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { customer: true, orderItems: true }
    });
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load invoice" });
  }
});

export default router;

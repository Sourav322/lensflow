import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const invoices = await prisma.order.findMany({
      include: { customer: true, orderItems: true }
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: "Invoices nahi mil rahi hain" });
  }
});

export default router;

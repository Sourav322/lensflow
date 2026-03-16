import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const frames = await prisma.product.findMany({
      where: { category: 'FRAME' }
    });
    res.json(frames);
  } catch (error) {
    res.status(500).json({ error: "Frames load nahi ho paye" });
  }
});

router.post("/", async (req, res) => {
  try {
    const frame = await prisma.product.create({
      data: { ...req.body, category: 'FRAME' }
    });
    res.json(frame);
  } catch (error) {
    res.status(500).json({ error: "Frame save nahi hua" });
  }
});

export default router;

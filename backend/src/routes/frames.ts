import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const frames = await prisma.product.findMany({
      where: { category: 'FRAME' }
    });
    res.json({ success: true, data: frames });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load frames" });
  }
});

router.get("/barcode/:code", async (req, res) => {
  try {
    const frame = await prisma.product.findFirst({
      where: { category: 'FRAME', barcode: req.params.code }
    });
    if (!frame) {
      return res.status(404).json({ success: false, message: "Frame not found" });
    }
    res.json({ success: true, data: frame });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to lookup barcode" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const frame = await prisma.product.findUnique({
      where: { id: req.params.id, category: 'FRAME' }
    });
    if (!frame) {
      return res.status(404).json({ success: false, message: "Frame not found" });
    }
    res.json({ success: true, data: frame });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load frame" });
  }
});

router.post("/", async (req, res) => {
  try {
    const frame = await prisma.product.create({
      data: { ...req.body, category: 'FRAME' }
    });
    res.json({ success: true, data: frame });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create frame" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const frame = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, data: frame });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update frame" });
  }
});

export default router;

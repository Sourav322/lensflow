// src/routes/frames.ts
router.get("/", async (req, res) => {
  const frames = await prisma.product.findMany({
    where: { category: 'FRAME' }
  });
  res.json(frames);
});

// src/routes/lenses.ts (Same logic)
router.get("/", async (req, res) => {
  const lenses = await prisma.product.findMany({
    where: { category: 'LENS' }
  });
  res.json(lenses);
});

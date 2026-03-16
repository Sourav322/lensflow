import { Router } from "express"

const router = Router()

// Note: LabOrder model doesn't exist in Prisma schema
router.get("/", async (_, res) => {
  try {
    res.json({ success: true, data: [] })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load lab orders" })
  }
})

router.post("/", async (req, res) => {
  try {
    res.json({ success: true, data: { error: "Lab Order model not implemented" } })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create lab order" })
  }
})

export default router

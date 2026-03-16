import { Router } from "express"

const router = Router()

// Note: Repair model doesn't exist in Prisma schema
router.get("/", async (_, res) => {
  try {
    res.json({ success: true, data: [] })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load repairs" })
  }
})

router.post("/", async (req, res) => {
  try {
    res.json({ success: true, data: { error: "Repair model not implemented" } })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create repair" })
  }
})

export default router

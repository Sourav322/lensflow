import { Router } from "express"

const router = Router()

// Note: Staff model doesn't exist in Prisma schema
// Return empty array for now

router.get("/", async (_, res) => {
  try {
    res.json({ success: true, data: [] })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load staff" })
  }
})

router.post("/", async (req, res) => {
  try {
    res.json({ success: true, data: { error: "Staff model not implemented" } })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create staff" })
  }
})

export default router

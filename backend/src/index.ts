import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("LensFlow API running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

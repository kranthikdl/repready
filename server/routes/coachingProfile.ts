import { Router } from "express";
import { sessionStorage } from "../services/storageService";

const router = Router();

router.get("/", (_req, res) => {
  res.json(sessionStorage.getCoachingProfile());
});

router.post("/", (req, res) => {
  const profile = req.body;
  if (!profile || typeof profile !== "object") {
    return res.status(400).json({ message: "Invalid profile data" });
  }
  const updated = sessionStorage.setCoachingProfile(profile);
  res.json(updated);
});

export default router;

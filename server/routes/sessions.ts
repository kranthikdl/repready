import { Router } from "express";
import { sessionStorage } from "../services/storageService";

const router = Router();

router.get("/", (_req, res) => {
  const sessions = sessionStorage.getAllSessions();
  res.json(sessions);
});

router.get("/:id", (req, res) => {
  const session = sessionStorage.getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }
  res.json(session);
});

router.delete("/:id", (req, res) => {
  const deleted = sessionStorage.deleteSession(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: "Session not found" });
  }
  res.json({ message: "Session deleted" });
});

export default router;

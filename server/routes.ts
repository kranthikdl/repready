import type { Express } from "express";
import { type Server } from "http";
import { sessionStorage } from "./services/storageService";
import { setupWebSocket } from "./services/sessionSocket";
import { sessionConfigSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupWebSocket(httpServer);

  app.get("/api/sessions", (_req, res) => {
    const sessions = sessionStorage.getAllSessions();
    res.json(sessions);
  });

  app.get("/api/sessions/:id", (req, res) => {
    const session = sessionStorage.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    res.json(session);
  });

  app.delete("/api/sessions/:id", (req, res) => {
    const deleted = sessionStorage.deleteSession(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Session not found" });
    }
    res.json({ message: "Session deleted" });
  });

  return httpServer;
}

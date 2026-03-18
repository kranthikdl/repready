import type { Express } from "express";
import { type Server } from "http";
import { sessionStorage } from "./services/storageService";
import { setupWebSocket } from "./services/sessionSocket";
import { sessionConfigSchema } from "@shared/schema";
import { transcribeAudio } from "./services/llmService";

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

  app.get("/api/coaching-profile", (_req, res) => {
    res.json(sessionStorage.getCoachingProfile());
  });

  app.post("/api/coaching-profile", (req, res) => {
    const profile = req.body;
    if (!profile || typeof profile !== "object") {
      return res.status(400).json({ message: "Invalid profile data" });
    }
    const updated = sessionStorage.setCoachingProfile(profile);
    res.json(updated);
  });

  app.post("/api/transcribe", async (req, res) => {
    const { audio, mimeType } = req.body as { audio?: string; mimeType?: string };
    if (!audio) {
      return res.status(400).json({ message: "No audio data received" });
    }
    const audioBuffer = Buffer.from(audio, "base64");
    if (audioBuffer.length === 0) {
      return res.status(400).json({ message: "Empty audio data" });
    }
    const text = await transcribeAudio(audioBuffer, mimeType || "audio/webm");
    if (text === null) {
      return res.status(500).json({ message: "Transcription service error. Check your OpenAI API key." });
    }
    res.json({ text });
  });

  return httpServer;
}

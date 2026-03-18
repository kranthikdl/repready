import express from "express";
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

  app.post(
    "/api/transcribe",
    express.raw({ type: "*/*", limit: "10mb" }),
    async (req, res) => {
      const audioBuffer = req.body as Buffer;
      if (!audioBuffer || audioBuffer.length === 0) {
        return res.status(400).json({ message: "No audio data received" });
      }

      const mimeType = req.headers["content-type"] || "audio/webm";
      const text = await transcribeAudio(audioBuffer, mimeType);

      if (text === null) {
        return res.status(500).json({ message: "Transcription service error. Check your OpenAI API key." });
      }

      res.json({ text });
    }
  );

  return httpServer;
}

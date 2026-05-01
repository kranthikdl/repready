import { Router } from "express";
import { transcribeAudio } from "../services/llmService";

const router = Router();

router.post("/", async (req, res) => {
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
    return res.status(500).json({
      message: "Transcription service error. Check your OpenAI API key.",
    });
  }
  res.json({ text });
});

export default router;

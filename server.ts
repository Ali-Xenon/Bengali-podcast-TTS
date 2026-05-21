import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Post API Endpoint to handle Text-To-Speech audio requests
  app.post("/api/tts", async (req, res) => {
    try {
      const { textPrompt, speakerConfigs } = req.body;

      if (!textPrompt) {
        return res.status(400).json({ error: "Missing transcript text prompt." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(500).json({
          error: "Gemini API Key is not configured in the workspace Secrets. Please set your GEMINI_API_KEY.",
        });
      }

      // Lazy load/instantiate the client as per guidelines to prevent application crash at boot-time
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Assemble multiSpeakerVoiceConfig speaker configs
      const speakerVoiceConfigs = (speakerConfigs || []).map((cfg: { speaker: string; voiceName: string }) => ({
        speaker: cfg.speaker,
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: cfg.voiceName },
        },
      }));

      // Call Gemini 3.1 Flash Text-to-Speech
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: textPrompt }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: speakerVoiceConfigs,
            },
          },
        },
      });

      // Extract Audio Bytes
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      const mimeType = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || "audio/pcm";

      if (!base64Audio) {
        return res.status(500).json({
          error: "No audio was generated from the Gemini model. Verify if the script contains valid speaker tags.",
        });
      }

      return res.json({
        audioBase64: base64Audio,
        mimeType: mimeType,
      });
    } catch (err: any) {
      console.error("Gemini API Error in TTS endpoint:", err);
      return res.status(500).json({
        error: err.message || "An error occurred during Gemini TTS speech generation.",
      });
    }
  });

  // Serve static assets or mount Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Bengali Podcast TTS Studio listening on port ${PORT}...`);
  });
}

startServer();

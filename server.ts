import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Route to generate questions
  app.post("/api/generate-questions", async (req, res) => {
    try {
      const { topic, difficulty, count } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "API key is missing on server" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Buatlah ${count} buah soal ujian dengan tingkat kesulitan ${difficulty} tentang materi "${topic}".
Soal yang dibuat dapat berupa tipe PILIHAN_GANDA (Pilihan Ganda biasa dengan 4 opsi A, B, C, D) dan ESSAY.
Setiap soal harus relevan, jelas, dan akurat.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description: "Tipe soal, harus 'PILIHAN_GANDA' atau 'ESSAY'",
                },
                questionText: {
                  type: Type.STRING,
                  description: "Isi teks pertanyaan",
                },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Pilihan jawaban (hanya untuk PILIHAN_GANDA)",
                },
                correctAnswerIndex: {
                  type: Type.INTEGER,
                  description: "Indeks jawaban yang benar dari options (0-3) (hanya untuk PILIHAN_GANDA)",
                },
                essayKeyAnswer: {
                  type: Type.STRING,
                  description: "Kunci jawaban / panduan penilaian (hanya untuk ESSAY)",
                },
              },
              required: ["type", "questionText"],
            },
          },
        },
      });

      const textOutput = response.text;
      if (!textOutput) {
        throw new Error("No text output from Gemini");
      }

      const generatedQuestions = JSON.parse(textOutput);
      res.json({ questions: generatedQuestions });
    } catch (error: any) {
      console.error("Error generating questions:", error);
      res.status(500).json({ error: error.message || "Failed to generate questions" });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

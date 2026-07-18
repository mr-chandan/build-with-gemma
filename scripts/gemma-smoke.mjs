// Verify the Gemma key works via @google/genai in Node.
//   node scripts/gemma-smoke.mjs
import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

// minimal .env.local reader
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const ai = new GoogleGenAI({ apiKey: env.GEMMA_API_KEY });
const model = env.GEMMA_MODEL || "gemma-4-26b-a4b-it";

const res = await ai.models.generateContent({
  model,
  contents: [{ role: "user", parts: [{ text: "Reply with exactly: FINMATE-OK" }] }],
});
console.log("model:", model);
console.log("response:", res.text);

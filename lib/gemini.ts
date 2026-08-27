import type { PageImage } from "./types";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function dataUrlToInlinePart(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) throw new Error("Invalid data URL");
  const [, mimeType, base64] = match;
  return { inline_data: { mime_type: mimeType, data: base64 } };
}

/**
 * Calls Gemini with a text prompt plus a set of page images, requesting
 * strict JSON back that conforms to `schema` (a Gemini/OpenAPI-subset JSON
 * Schema object). Passing a schema is far more reliable than relying on
 * prompt wording alone -- Gemini will refuse to emit fields/types that
 * don't match it. Throws if the API key is missing or the call fails.
 */
export async function callGeminiJSON(params: {
  systemPrompt: string;
  userPrompt: string;
  pages: PageImage[];
  schema?: object;
}): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your .env.local (see README)."
    );
  }

  const imageParts = params.pages.map((p) => dataUrlToInlinePart(p.dataUrl));

  const body = {
    system_instruction: {
      parts: [{ text: params.systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: params.userPrompt }, ...imageParts],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      ...(params.schema ? { responseSchema: params.schema } : {}),
    },
  };

  const res = await fetch(
    `${API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const json = await res.json();

  const candidate = json?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  if (finishReason && finishReason !== "STOP") {
    throw new Error(
      `Gemini stopped early (${finishReason}). This usually means the response was too long or was blocked by safety filters. Try fewer pages per call.`
    );
  }

  const text: string | undefined = candidate?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  try {
    return JSON.parse(text);
  } catch {
    // Some responses may still wrap JSON in fences despite responseMimeType.
    const cleaned = text.replace(/^```json\s*|```$/g, "").trim();
    return JSON.parse(cleaned);
  }
}

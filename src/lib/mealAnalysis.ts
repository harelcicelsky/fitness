/**
 * Meal analysis service — AI-powered food detection & nutrition estimation.
 *
 * Uses Google Gemini Flash (free) or OpenAI Vision to actually analyze
 * the meal photo and return real nutritional data.
 *
 * The user provides their own API key (stored in localStorage).
 * Gemini is recommended — completely free at https://aistudio.google.com/apikey
 */

import type { DetectedFood, MealNutrition } from "../types";
import { dataUrlToBase64 } from "./imageUtils";

// ── Public API ──────────────────────────────────────────────────────────────

export type AiProvider = "gemini" | "openai";

export interface AnalysisResult {
  foods: DetectedFood[];
  totals: MealNutrition;
}

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
}

const NUTRITION_PROMPT = `You are a professional nutritionist AI. Analyze the food visible in this image.

IMPORTANT RULES:
- Identify EVERY distinct food item you can see
- Estimate realistic portion sizes based on what's visible
- Provide accurate nutritional values per item
- If you can't identify a food with confidence, still try your best guess
- For mixed dishes, break down the main components

Return ONLY valid JSON with NO markdown, NO backticks, NO explanation — just the raw JSON object:
{
  "foods": [
    {
      "name": "food name",
      "portion": "estimated portion (e.g. 150g, 1 cup, 1 medium)",
      "confidence": 0.0 to 1.0,
      "calories": number,
      "protein": number in grams,
      "carbs": number in grams,
      "fat": number in grams,
      "fiber": number in grams,
      "sugar": number in grams,
      "sodium": number in mg
    }
  ]
}`;

/**
 * Analyze a meal image and return detected foods + nutrition totals.
 * Throws if no API key is configured or the API call fails.
 */
export async function analyzeMeal(imageDataUrl: string): Promise<AnalysisResult> {
  const config = getStoredConfig();
  if (!config) {
    throw new Error("NO_API_KEY");
  }

  const base64 = dataUrlToBase64(imageDataUrl);

  let foods: DetectedFood[];

  if (config.provider === "gemini") {
    foods = await analyzeWithGemini(base64, config.apiKey);
  } else {
    foods = await analyzeWithOpenAI(base64, config.apiKey);
  }

  // Validate and clean up the results
  foods = foods.filter((f) => f.name && f.calories >= 0);
  if (foods.length === 0) {
    throw new Error("NO_FOODS_DETECTED");
  }

  return { foods, totals: computeTotals(foods) };
}

// ── Config storage ──────────────────────────────────────────────────────────

export function getStoredConfig(): AiConfig | null {
  try {
    const raw = localStorage.getItem("meal-ai-config");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AiConfig;
    if (!parsed.apiKey || !parsed.provider) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredConfig(config: AiConfig) {
  try {
    localStorage.setItem("meal-ai-config", JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

export function clearStoredConfig() {
  try {
    localStorage.removeItem("meal-ai-config");
  } catch {
    /* ignore */
  }
}

// ── Google Gemini Flash (FREE) ──────────────────────────────────────────────

async function analyzeWithGemini(base64: string, apiKey: string): Promise<DetectedFood[]> {
  // Try gemini-2.0-flash first, fall back to gemini-1.5-flash
  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError = "";

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: NUTRITION_PROMPT },
                  { inlineData: { mimeType: "image/jpeg", data: base64 } },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 2048,
            },
          }),
        },
      );

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        // Parse the error for a friendly message
        if (response.status === 400 || response.status === 403) {
          if (errBody.includes("API_KEY_INVALID") || errBody.includes("API key not valid")) {
            throw new Error("INVALID_API_KEY");
          }
        }
        // Try extracting error message from JSON response
        try {
          const errJson = JSON.parse(errBody);
          lastError = errJson?.error?.message || `HTTP ${response.status}`;
        } catch {
          lastError = `HTTP ${response.status}`;
        }
        continue; // try next model
      }

      const data = await response.json();

      // Check for blocked / empty responses
      if (data.candidates?.[0]?.finishReason === "SAFETY") {
        throw new Error("Image was blocked by safety filters. Try a different photo.");
      }

      const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (!text) {
        lastError = "Empty response from AI";
        continue;
      }

      return parseJsonResponse(text);
    } catch (e) {
      if (e instanceof Error && (e.message === "INVALID_API_KEY" || e.message.includes("safety"))) {
        throw e; // Don't retry these
      }
      lastError = e instanceof Error ? e.message : "Unknown error";
      continue;
    }
  }

  throw new Error(lastError || "All Gemini models failed");
}

// ── OpenAI Vision ───────────────────────────────────────────────────────────

async function analyzeWithOpenAI(base64: string, apiKey: string): Promise<DetectedFood[]> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 2048,
      temperature: 0.3,
      messages: [
        { role: "system", content: NUTRITION_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this meal photo." },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64}`, detail: "low" },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("INVALID_API_KEY");
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text: string = data.choices?.[0]?.message?.content ?? "";
  return parseJsonResponse(text);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Parse the JSON response from any AI provider, stripping markdown fences. */
function parseJsonResponse(text: string): DetectedFood[] {
  // Strip markdown code fences if the model wrapped its response
  const clean = text
    .replace(/```json?\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  const parsed = JSON.parse(clean) as { foods: DetectedFood[] };

  if (!Array.isArray(parsed.foods)) {
    throw new Error("Invalid response structure");
  }

  // Ensure every field is a number
  return parsed.foods.map((f) => ({
    name: String(f.name || "Unknown"),
    portion: String(f.portion || "1 serving"),
    confidence: Math.max(0, Math.min(1, Number(f.confidence) || 0.8)),
    calories: Math.max(0, Math.round(Number(f.calories) || 0)),
    protein: Math.max(0, Math.round(Number(f.protein) * 10) / 10 || 0),
    carbs: Math.max(0, Math.round(Number(f.carbs) * 10) / 10 || 0),
    fat: Math.max(0, Math.round(Number(f.fat) * 10) / 10 || 0),
    fiber: Math.max(0, Math.round(Number(f.fiber) * 10) / 10 || 0),
    sugar: Math.max(0, Math.round(Number(f.sugar) * 10) / 10 || 0),
    sodium: Math.max(0, Math.round(Number(f.sodium) || 0)),
  }));
}

export function computeTotals(foods: DetectedFood[]): MealNutrition {
  const totals: MealNutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    healthScore: 0,
  };
  for (const f of foods) {
    totals.calories += f.calories;
    totals.protein += f.protein;
    totals.carbs += f.carbs;
    totals.fat += f.fat;
    totals.fiber += f.fiber;
    totals.sugar += f.sugar;
    totals.sodium += f.sodium;
  }
  // Round everything
  totals.calories = Math.round(totals.calories);
  totals.protein = Math.round(totals.protein * 10) / 10;
  totals.carbs = Math.round(totals.carbs * 10) / 10;
  totals.fat = Math.round(totals.fat * 10) / 10;
  totals.fiber = Math.round(totals.fiber * 10) / 10;
  totals.sugar = Math.round(totals.sugar * 10) / 10;
  totals.sodium = Math.round(totals.sodium);

  // Health score: higher protein & fiber = healthier, more sugar & sodium = worse
  const proteinRatio = totals.protein / Math.max(totals.calories / 100, 1);
  const fiberBonus = Math.min(totals.fiber / 10, 1);
  const sugarPenalty = Math.min(totals.sugar / 40, 1);
  const sodiumPenalty = Math.min(totals.sodium / 2000, 1);
  totals.healthScore = Math.max(
    1,
    Math.min(
      10,
      Math.round(
        (5 + proteinRatio * 2 + fiberBonus * 2 - sugarPenalty * 2 - sodiumPenalty * 1.5) * 10,
      ) / 10,
    ),
  );

  return totals;
}

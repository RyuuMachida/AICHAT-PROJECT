// lib/models.ts
// Sumber kebenaran tunggal untuk semua model AI yang tersedia.
// Dipakai di frontend (ModelSelector.tsx) dan backend (app/api/chat/route.ts).
// Tidak ada API key mentah di sini — hanya NAMA env var-nya, jadi aman diimpor di client component.

export type ModelId =
  | "gemini-2.5-flash"
  | "gemini-3.5-flash-lite"
  | "gemini-3.5-flash"
  | "gemini-3.6-flash"
  | "groq-llama-3.3";

// Dipertahankan untuk kompatibilitas — sekarang tinggal alias dari ModelId
export type AIProvider = ModelId;

export interface ModelConfig {
  provider: "gemini" | "groq";
  apiName: string; // nama model yang dikirim ke SDK/endpoint provider
  apiKeyEnv: string; // nama env var yang menyimpan key untuk model ini
  label: string;
  shortLabel: string;
  tag: string;
  rpmLimit: number;
  iconColor: string;
}

export const MODEL_CONFIGS: Record<ModelId, ModelConfig> = {
  "gemini-2.5-flash": {
    provider: "gemini",
    apiName: "gemini-2.5-flash",
    apiKeyEnv: "GEMINI_API_KEY",
    label: "Google Gemini 2.5 Flash",
    shortLabel: "Gemini 2.5",
    tag: "Vision + Text (Super Presisi)",
    rpmLimit: 15,
    iconColor: "#4285F4",
  },
  "gemini-3.5-flash-lite": {
    provider: "gemini",
    apiName: "gemini-3.5-flash-lite",
    apiKeyEnv: "GEMINI_API_KEY_2",
    label: "Google Gemini 3.5 Flash Lite",
    shortLabel: "Gemini 3.5 Lite",
    tag: "Murah & Cepat",
    rpmLimit: 15,
    iconColor: "#34A853",
  },
  "gemini-3.5-flash": {
    provider: "gemini",
    apiName: "gemini-3.5-flash",
    apiKeyEnv: "GEMINI_API_KEY_2",
    label: "Google Gemini 3.5 Flash",
    shortLabel: "Gemini 3.5",
    tag: "Seimbang",
    rpmLimit: 15,
    iconColor: "#FBBC05",
  },
  "gemini-3.6-flash": {
    provider: "gemini",
    apiName: "gemini-3.6-flash",
    apiKeyEnv: "GEMINI_API_KEY_3",
    label: "Google Gemini 3.6 Flash",
    shortLabel: "Gemini 3.6",
    tag: "Terbaru",
    rpmLimit: 15,
    iconColor: "#EA4335",
  },
  "groq-llama-3.3": {
    provider: "groq",
    apiName: "llama-3.3-70b-versatile",
    apiKeyEnv: "GROQ_API_KEY",
    label: "Groq Llama 3.3 70B",
    shortLabel: "Llama 3.3",
    tag: "Ultra Fast Inference",
    rpmLimit: 30,
    iconColor: "#FFCE99",
  },
};

export const DEFAULT_MODEL_ID: ModelId = "gemini-2.5-flash";

export function isValidModelId(value: unknown): value is ModelId {
  return typeof value === "string" && value in MODEL_CONFIGS;
}
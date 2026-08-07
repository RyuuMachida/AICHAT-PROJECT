import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";
import {
  checkRateLimit,
  getClientIP,
  isPayloadTooLarge,
  validateMessages,
  applySecurityHeaders,
  errorResponse,
} from "@/lib/security";
import { MODEL_CONFIGS } from "@/lib/models";
const EXTRACTION_MODEL_ID = "gemini-3.5-flash-lite" as const;

const EXTRACTION_SYSTEM_PROMPT = `Anda adalah modul ekstraksi karakteristik pengguna untuk aplikasi chatbot.
Tugas Anda HANYA: baca histori percakapan yang diberikan, lalu simpulkan fakta-fakta singkat, faktual, dan relevan tentang penggunanya (misalnya: nama, pekerjaan/sekolah, minat, preferensi, konteks penting lain yang disebutkan).

Aturan:
- Jangan menyapa, jangan menjawab pertanyaan user, jangan berperan sebagai asisten chat.
- Keluarkan HANYA daftar poin singkat (bullet list), bahasa Indonesia, tanpa basa-basi pembuka/penutup.
- Kalau tidak ada informasi baru yang bisa disimpulkan, keluarkan teks kosong.
- Maksimal 8 poin, tiap poin maksimal 1 baris.`;

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rateCheck = checkRateLimit(ip, 30, 60);
  if (!rateCheck.allowed) {
    return errorResponse("Terlalu banyak request. Coba lagi nanti.", 429, {
      retryAfter: rateCheck.retryAfter,
    });
  }

  if (isPayloadTooLarge(req)) {
    return errorResponse("Payload terlalu besar (maks 5 MB).", 413);
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Body request bukan JSON yang valid.", 400);
    }

    if (typeof body !== "object" || body === null) {
      return errorResponse("Body request tidak valid.", 400);
    }

    const { messages } = body as Record<string, unknown>;

    const msgValidation = validateMessages(messages);
    if (!msgValidation.valid) {
      return errorResponse(msgValidation.reason ?? "messages tidak valid.", 400);
    }
    const sanitizedMessages = msgValidation.sanitized!;

    const modelConfig = MODEL_CONFIGS[EXTRACTION_MODEL_ID];
    const geminiApiKey = process.env[modelConfig.apiKeyEnv];

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error: `${modelConfig.apiKeyEnv} belum diatur di file .env.local.`,
          setup: true,
        }),
        { status: 400, headers: applySecurityHeaders({ "Content-Type": "application/json" }) }
      );
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const geminiContents = sanitizedMessages
      .filter((msg) => msg.role === "user")
      .map((msg) => {
        const text = Array.isArray(msg.content)
          ? (msg.content as Array<{ type?: string; text?: string }>)
            .filter((item) => item.type === "text")
            .map((item) => item.text)
            .join(" ")
          : typeof msg.content === "string"
            ? msg.content
            : "";
        return { role: "user", parts: [{ text }] };
      });

    let result;
    try {
      result = await ai.models.generateContent({
        model: modelConfig.apiName,
        contents: geminiContents as any,
        config: {
          systemInstruction: EXTRACTION_SYSTEM_PROMPT,
          temperature: 0.3,
          maxOutputTokens: 300,
        },
      });
    } catch (err: any) {
      console.error("Extract-characteristics Gemini error:", err);

      const rawMessage: string = err?.message || "";
      const isQuotaError =
        err?.status === 429 ||
        err?.error?.code === 429 ||
        /RESOURCE_EXHAUSTED|429/i.test(rawMessage);

      if (isQuotaError) {
        // Bukan endpoint kritis untuk UX chat utama — gagal diam-diam saja dengan status 429
        // biar frontend bisa skip update karakteristik tanpa mengganggu chat.
        return new Response(
          JSON.stringify({ error: "Kuota ekstraksi karakteristik sedang habis.", code: 429 }),
          { status: 429, headers: applySecurityHeaders({ "Content-Type": "application/json" }) }
        );
      }

      return new Response(
        JSON.stringify({ error: `Gagal ekstraksi karakteristik: ${rawMessage || "unknown"}` }),
        { status: 502, headers: applySecurityHeaders({ "Content-Type": "application/json" }) }
      );
    }

    const characteristics = result.text?.trim() || "";

    return new Response(
      JSON.stringify({ characteristics }),
      { status: 200, headers: applySecurityHeaders({ "Content-Type": "application/json" }) }
    );
  } catch (error: unknown) {
    console.error("Extract-characteristics API Error:", error);
    return errorResponse("Terjadi kesalahan pada server.", 500);
  }
}
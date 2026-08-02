import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIP,
  applySecurityHeaders,
  errorResponse,
  validateAudioFile,
} from "@/lib/security";

export async function POST(req: NextRequest) {
  // ── 1. Rate Limiting ───────────────────────────────────────────────────
  const ip = getClientIP(req);
  const rateCheck = checkRateLimit(ip, 10, 60); // 10 transcribe/menit per IP
  if (!rateCheck.allowed) {
    return errorResponse("Terlalu banyak request transkripsi. Coba lagi nanti.", 429, {
      retryAfter: rateCheck.retryAfter,
    });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return NextResponse.json(
        { error: "API key belum diatur di server (file .env.local)." },
        {
          status: 400,
          headers: applySecurityHeaders(),
        }
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return errorResponse("Request bukan form-data yang valid.", 400);
    }

    const file = formData.get("file") as Blob | null;

    if (!file) {
      return errorResponse("File audio tidak ditemukan.", 400);
    }

    // ── 2. Validasi File Audio ────────────────────────────────────────────
    const audioValidation = validateAudioFile(file);
    if (!audioValidation.valid) {
      return errorResponse(audioValidation.reason ?? "File audio tidak valid.", 400);
    }

    const groq = new Groq({ apiKey });

    // Detect extension and mimeType from uploaded file
    const uploadName = (file as unknown as { name?: string }).name || "";
    let fileName = "speech.webm";
    let mimeType = file.type || "audio/webm";

    if (uploadName.endsWith(".wav") || mimeType.includes("wav")) {
      fileName = "speech.wav";
      mimeType = "audio/wav";
    } else if (uploadName.endsWith(".mp4") || uploadName.endsWith(".m4a") || mimeType.includes("mp4") || mimeType.includes("aac")) {
      fileName = "speech.m4a";
      mimeType = "audio/mp4";
    } else if (uploadName.endsWith(".ogg") || mimeType.includes("ogg")) {
      fileName = "speech.ogg";
      mimeType = "audio/ogg";
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const transcription = await groq.audio.transcriptions.create({
      file: await Groq.toFile(buffer, fileName, { type: mimeType }),
      model: "whisper-large-v3",
      language: "id",
      temperature: 0.0,
    });

    let text = (transcription.text || "").trim();

    // List of known Whisper silent hallucination phrases
    const SILENT_HALLUCINATIONS = [
      "terima kasih",
      "terima kasih.",
      "terimakasih",
      "terimakasih.",
      "terima kasih telah menyaksikan",
      "terima kasih sudah menonton",
      "terima kasih banyak",
      "sekian dan terima kasih",
      "subtitles by",
      "dibuat oleh",
      "suara",
      "dua",
      "sampai di sini",
      "selamat menyaksikan",
    ];

    const cleanedText = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const isHallucination = SILENT_HALLUCINATIONS.some(
      (phrase) => cleanedText === phrase.replace(/[^a-z0-9\s]/g, "").trim()
    );

    if (isHallucination || cleanedText.length < 2) {
      text = "";
    }

    return NextResponse.json(
      { text },
      { headers: applySecurityHeaders() }
    );
  } catch (error: unknown) {
    console.error("Transcription API Error:", error);
    // Jangan bocorkan detail error internal ke client
    return errorResponse("Gagal menerjemahkan suara.", 500);
  }
}

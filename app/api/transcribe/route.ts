import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return NextResponse.json(
        { error: "API key belum diatur di server (file .env.local)." },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "File audio tidak ditemukan." }, { status: 400 });
    }

    const groq = new Groq({ apiKey });

    // Convert Blob to File object to be compatible with Groq SDK
    // Next.js standard Blob to File conversions:
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Groq API client accepts standard File object or readable streams/buffers with filenames.
    // We can cast standard buffer with filename options.
    const transcription = await groq.audio.transcriptions.create({
      file: await Groq.toFile(buffer, "audio.webm", { type: "audio/webm" }),
      model: "whisper-large-v3",
      language: "id", // Force transcription to Indonesian or default to auto
      response_format: "json",
      temperature: 0.0,
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error: unknown) {
    console.error("Transcription API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menerjemahkan suara." },
      { status: 500 }
    );
  }
}

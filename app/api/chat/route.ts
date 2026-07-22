import Groq from "groq-sdk";
import { NextRequest } from "next/server";

// Active Groq models (as of July 2026)
const TEXT_MODEL = "llama-3.3-70b-versatile";
const VISION_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "llama-3.2-90b-vision-preview",
];

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey || apiKey === "your_api_key_here") {
      return new Response(
        JSON.stringify({
          error: "API key belum diatur di server (file .env.local).",
          setup: true,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const groq = new Groq({ apiKey });

    // Parse messages — detect if vision is needed, strip image_url from history
    let isVisionNeeded = false;
    const chatMessages = [
      {
        role: "system" as const,
        content:
          "Kamu adalah ChatBot AI, asisten yang cerdas, ramah, dan membantu. " +
          "Jawab dengan bahasa yang natural. Kamu bisa menjawab dalam Bahasa Indonesia atau English, " +
          "sesuaikan dengan bahasa yang digunakan user. " +
          "Gunakan markdown formatting ketika perlu (bold, code blocks, lists, dll). " +
          "Berikan jawaban yang detail tapi tetap mudah dipahami. " +
          "Jika user melampirkan gambar, analisis gambar tersebut dengan cermat dan jawab pertanyaan terkait gambar tersebut.",
      },
      ...messages.map((msg: { role: string; content: string | any[] }, idx: number) => {
        const isLastUserMsg = idx === messages.length - 1 && msg.role === "user";

        if (Array.isArray(msg.content)) {
          const hasImage = msg.content.some((item) => item.type === "image_url");

          if (hasImage) {
            // Only send image_url for the most recent user message to avoid model errors
            if (isLastUserMsg) {
              isVisionNeeded = true;
              return {
                role: msg.role as "user" | "assistant",
                content: msg.content
                  .filter((item) => item.type === "text" || item.type === "image_url")
                  .map((item) => {
                    if (item.type === "text") return { type: "text" as const, text: item.text };
                    if (item.type === "image_url") {
                      return {
                        type: "image_url" as const,
                        image_url: { url: item.image_url.url },
                      };
                    }
                    return item;
                  }),
              };
            } else {
              // For older messages that had images: flatten to text-only to avoid model errors
              const textParts = msg.content
                .filter((item) => item.type === "text")
                .map((item) => item.text)
                .join(" ");
              return {
                role: msg.role as "user" | "assistant",
                content: textParts || "[Gambar dilampirkan]",
              };
            }
          }

          // Array with only text parts
          const text = msg.content
            .filter((item) => item.type === "text")
            .map((item) => item.text)
            .join(" ");
          return {
            role: msg.role as "user" | "assistant",
            content: text,
          };
        }

        return {
          role: msg.role as "user" | "assistant",
          content: msg.content || "",
        };
      }),
    ];

    // Try vision models with fallback, or text model
    const modelsToTry = isVisionNeeded ? VISION_MODELS : [TEXT_MODEL];

    let lastError: Error | null = null;
    for (const modelName of modelsToTry) {
      try {
        const stream = await groq.chat.completions.create({
          model: modelName,
          messages: chatMessages,
          temperature: 0.7,
          max_tokens: 4096,
          stream: true,
        });

        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || "";
                if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch (streamErr) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ error: "Stream error" })}\n\n`
                )
              );
              controller.close();
            }
          },
        });

        return new Response(readableStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } catch (modelErr) {
        console.warn(`Model ${modelName} failed, trying next...`, modelErr);
        lastError = modelErr instanceof Error ? modelErr : new Error(String(modelErr));
        // Continue to next model
      }
    }

    // All models failed
    throw lastError ?? new Error("Semua model tidak tersedia saat ini.");
  } catch (error: unknown) {
    console.error("Chat API Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Terjadi kesalahan tidak terduga.";

    return new Response(
      JSON.stringify({ error: `Terjadi kesalahan. Pastikan API key sudah benar di file .env.local.\nError: ${errorMessage}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

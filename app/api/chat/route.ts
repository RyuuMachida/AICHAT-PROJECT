import Groq from "groq-sdk";
import { NextRequest } from "next/server";

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

    // Parse messages to see if there is any image content (multimodal request)
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
      ...messages.map((msg: { role: string; content: string | any[] }) => {
        // If content is an array, check if it contains image_url
        if (Array.isArray(msg.content)) {
          const hasImage = msg.content.some(item => item.type === "image_url");
          if (hasImage) isVisionNeeded = true;
          return {
            role: msg.role as "user" | "assistant",
            content: msg.content.map(item => {
              if (item.type === "text") return { type: "text" as const, text: item.text };
              if (item.type === "image_url") {
                return {
                  type: "image_url" as const,
                  image_url: { url: item.image_url.url }
                };
              }
              return item;
            })
          };
        }

        // Standard text content
        return {
          role: msg.role as "user" | "assistant",
          content: msg.content,
        };
      }),
    ];

    const modelName = isVisionNeeded ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";

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
        } catch (error) {
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
  } catch (error: unknown) {
    console.error("Chat API Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Terjadi kesalahan";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

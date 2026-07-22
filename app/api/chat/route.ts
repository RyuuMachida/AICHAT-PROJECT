import OpenAI from "openai";
import Groq from "groq-sdk";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const qwenApiKey = process.env.QWEN_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!qwenApiKey && (!groqApiKey || groqApiKey === "your_api_key_here")) {
      return new Response(
        JSON.stringify({
          error: "API key belum diatur di file .env.local (QWEN_API_KEY / GROQ_API_KEY).",
          setup: true,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Determine if multimodal / image vision is required
    let isVisionNeeded = false;

    // Format messages for OpenAI / Qwen structure
    const formattedMessages = [
      {
        role: "system" as const,
        content:
          "Kamu adalah ChatBot AI, asisten cerdas, ramah, dan serba tahu. " +
          "Jawab dengan natural dalam Bahasa Indonesia atau English. " +
          "Gunakan format markdown yang rapi (bold, code blocks terminal macOS, list, dll). " +
          "Jika user melampirkan gambar, analisis gambar tersebut dengan teliti.",
      },
      ...messages.map((msg: { role: string; content: string | any[] }, idx: number) => {
        const isLastMsg = idx === messages.length - 1 && msg.role === "user";

        if (Array.isArray(msg.content)) {
          const hasImage = msg.content.some((item) => item.type === "image_url");

          if (hasImage) {
            if (isLastMsg) {
              isVisionNeeded = true;
              return {
                role: msg.role,
                content: msg.content
                  .filter((item) => item.type === "text" || item.type === "image_url")
                  .map((item) => {
                    if (item.type === "text") return { type: "text", text: item.text };
                    if (item.type === "image_url") {
                      return {
                        type: "image_url",
                        image_url: { url: item.image_url.url },
                      };
                    }
                    return item;
                  }),
              };
            } else {
              // Flatten older image messages to text
              const textParts = msg.content
                .filter((item) => item.type === "text")
                .map((item) => item.text)
                .join(" ");
              return {
                role: msg.role,
                content: textParts || "[Gambar dilampirkan]",
              };
            }
          }

          const textOnly = msg.content
            .filter((item) => item.type === "text")
            .map((item) => item.text)
            .join(" ");
          return { role: msg.role, content: textOnly };
        }

        return { role: msg.role, content: msg.content || "" };
      }),
    ];

    // Attempt 1: Try Qwen Cloud API if key exists
    if (qwenApiKey && !qwenApiKey.includes("your_")) {
      try {
        const qwenClient = new OpenAI({
          apiKey: qwenApiKey,
          baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        });

        const qwenModel = isVisionNeeded ? "qwen-vl-max" : "qwen-plus";

        const response = await qwenClient.chat.completions.create({
          model: qwenModel,
          messages: formattedMessages as any,
          temperature: 0.7,
          max_tokens: 4096,
          stream: true,
        });

        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of response) {
                const content = chunk.choices[0]?.delta?.content || "";
                if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch (err) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Qwen Stream Error" })}\n\n`));
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
      } catch (qwenErr: any) {
        console.warn("Qwen API failed or quota exhausted, switching to backup provider:", qwenErr?.message || qwenErr);
        // If it's a quota error, provide clear guidance or fallback to Groq
      }
    }

    // Attempt 2: Fallback to Groq API
    if (groqApiKey) {
      const groq = new Groq({ apiKey: groqApiKey });
      const groqModel = isVisionNeeded ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";

      const stream = await groq.chat.completions.create({
        model: groqModel,
        messages: formattedMessages as any,
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
          } catch (err) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Groq Stream Error" })}\n\n`));
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
    }

    throw new Error("Tidak ada provider AI yang tersedia.");
  } catch (error: unknown) {
    console.error("Chat API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan.";

    return new Response(
      JSON.stringify({ error: `Gagal memproses pesan.\nError: ${errorMessage}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

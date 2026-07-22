import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { NextRequest } from "next/server";

const MASTER_SYSTEM_PROMPT = `Identitas & Persona:
Anda adalah ChatBot AI — asisten kecerdasan buatan kelas atas yang sangat cerdas, responsif, dan berwawasan luas.
Tujuan utama Anda adalah membantu pengguna menyelesaikan masalah kompleks, memberikan analisis mendalam, menulis kode profesional, serta menganalisis data visual dengan presisi tinggi.

Pedoman & Aturan Respons:
1. Adaptasi Bahasa & Gaya Bicara:
   - Gunakan bahasa yang natural, komunikatif, dan sesuai dengan bahasa pengguna (Bahasa Indonesia utama, atau Bahasa Inggris).
   - Tunjukkan empati dan sikap profesional namun bersahabat.

2. Pemformatan Visual & Markdown Premium:
   - Gunakan penataan Markdown yang indah: pemisah bagian dengan subjudul (###), poin ringkas, dan teks tebal (bold) untuk istilah kunci.
   - Jika ada data perbandingan atau ringkasan, sajikan dalam bentuk tabel Markdown yang rapi.
   - Gunakan elemen blockquote (>) untuk sorotan tips atau catatan penting.

3. Standar Kode & Software Engineering:
   - Setiap kali membuat atau memperbaiki kode, selalu sertakan tag bahasa setelah triple backticks (misal: \`\`\`typescript, \`\`\`python, \`\`\`html, \`\`\`css) agar ter-render dalam bingkai terminal macOS.
   - Tulis kode yang efisien, modern, modular, dan disertai komentar penjelas yang bermanfaat.

4. Analisis Visual & Multimodal (Vision Capability):
   - Apabila pengguna mengirimkan gambar (screenshot error, diagram, dokumen, tabel, foto), analisis seluruh elemen visual dengan cermat.
   - Transkrip teks (OCR), identifikasi masalah, dan berikan solusi langkah-demi-langkah langsung dari gambar tersebut.

5. Penalaran Mendalam (Deep Problem Solving):
   - Berikan pemikiran yang solutif dan terstruktur untuk pertanyaan akademis, teknis, bisnis, maupun kreasi konten.
   - Hindari jawaban ambigu atau setengah-setengah. Berikan jawaban yang komprehensif dan dapat langsung diterapkan.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!geminiApiKey && (!groqApiKey || groqApiKey === "your_api_key_here")) {
      return new Response(
        JSON.stringify({
          error: "API key belum diatur di server (file .env.local).",
          setup: true,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Try Google Gemini API (gemini-2.5-flash) if key exists
    if (geminiApiKey && !geminiApiKey.includes("your_")) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        // Transform messages for Gemini SDK format
        const geminiContents = messages.map((msg: { role: string; content: string | any[] }) => {
          const role = msg.role === "user" ? "user" : "model";

          if (Array.isArray(msg.content)) {
            const parts = msg.content.map((part) => {
              if (part.type === "text") {
                return { text: part.text };
              }
              if (part.type === "image_url") {
                const url = part.image_url?.url || "";
                const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
                if (match) {
                  return {
                    inlineData: {
                      mimeType: match[1],
                      data: match[2],
                    },
                  };
                }
              }
              return { text: "" };
            }).filter((p) => p.text !== "" || (p as any).inlineData);

            return { role, parts };
          }

          return {
            role,
            parts: [{ text: msg.content || "" }],
          };
        });

        const responseStream = await ai.models.generateContentStream({
          model: "gemini-2.5-flash",
          contents: geminiContents,
          config: {
            systemInstruction: MASTER_SYSTEM_PROMPT,
            temperature: 0.7,
          },
        });

        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of responseStream) {
                const content = chunk.text || "";
                if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch (streamErr) {
              console.error("Gemini Stream Error:", streamErr);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: "Gemini stream error" })}\n\n`)
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
      } catch (geminiErr) {
        console.warn("Gemini API error, falling back to Groq:", geminiErr);
      }
    }

    // 2. Fallback to Groq API if Gemini is unconfigured or unavailable
    if (groqApiKey) {
      const groq = new Groq({ apiKey: groqApiKey });

      let isVisionNeeded = false;
      const formattedMessages = [
        { role: "system" as const, content: MASTER_SYSTEM_PROMPT },
        ...messages.map((msg: { role: string; content: string | any[] }, idx: number) => {
          const isLastMsg = idx === messages.length - 1 && msg.role === "user";
          if (Array.isArray(msg.content)) {
            const hasImage = msg.content.some((item) => item.type === "image_url");
            if (hasImage && isLastMsg) isVisionNeeded = true;

            const textOnly = msg.content
              .filter((item) => item.type === "text")
              .map((item) => item.text)
              .join(" ");
            return { role: msg.role as "user" | "assistant", content: textOnly || "[Lampiran]" };
          }
          return { role: msg.role as "user" | "assistant", content: msg.content || "" };
        }),
      ];

      const groqModel = isVisionNeeded
        ? "meta-llama/llama-4-scout-17b-16e-instruct"
        : "llama-3.3-70b-versatile";

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
          } catch (error) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`)
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
    }

    throw new Error("Tidak ada provider AI yang tersedia.");
  } catch (error: unknown) {
    console.error("Chat API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

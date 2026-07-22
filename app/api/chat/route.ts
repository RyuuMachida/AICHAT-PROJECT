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

    // Determine if multimodal / image vision is required
    let isVisionNeeded = false;

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

    const chatMessages = [
      {
        role: "system" as const,
        content: MASTER_SYSTEM_PROMPT,
      },
      ...messages.map((msg: { role: string; content: string | any[] }, idx: number) => {
        const isLastMsg = idx === messages.length - 1 && msg.role === "user";

        if (Array.isArray(msg.content)) {
          const hasImage = msg.content.some((item) => item.type === "image_url");

          if (hasImage) {
            if (isLastMsg) {
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
              // Flatten older image messages to text to prevent model errors
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

          const textOnly = msg.content
            .filter((item) => item.type === "text")
            .map((item) => item.text)
            .join(" ");
          return { role: msg.role as "user" | "assistant", content: textOnly };
        }

        return {
          role: msg.role as "user" | "assistant",
          content: msg.content || "",
        };
      }),
    ];

    const modelName = isVisionNeeded
      ? "meta-llama/llama-4-scout-17b-16e-instruct"
      : "llama-3.3-70b-versatile";

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

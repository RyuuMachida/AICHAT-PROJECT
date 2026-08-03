import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";
import {
  checkRateLimit,
  getClientIP,
  isPayloadTooLarge,
  validateMessages,
  validateUsername,
  sanitizeString,
  applySecurityHeaders,
  errorResponse,
} from "@/lib/security";

export async function POST(req: NextRequest) {
  // ── 1. Rate Limiting ───────────────────────────────────────────────────
  const ip = getClientIP(req);
  const rateCheck = checkRateLimit(ip, 30, 60); // 30 req/menit per IP
  if (!rateCheck.allowed) {
    return errorResponse("Terlalu banyak request. Coba lagi nanti.", 429, {
      retryAfter: rateCheck.retryAfter,
    });
  }

  // ── 2. Payload Size Guard ──────────────────────────────────────────────
  if (isPayloadTooLarge(req)) {
    return errorResponse("Payload terlalu besar (maks 5 MB).", 413);
  }

  try {
    // ── 3. Parse & Validasi Body ─────────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Body request bukan JSON yang valid.", 400);
    }

    if (typeof body !== "object" || body === null) {
      return errorResponse("Body request tidak valid.", 400);
    }

    const { messages, username, userCharacteristics, provider } = body as Record<string, unknown>;

    // Validasi messages
    const msgValidation = validateMessages(messages);
    if (!msgValidation.valid) {
      return errorResponse(msgValidation.reason ?? "messages tidak valid.", 400);
    }
    const sanitizedMessages = msgValidation.sanitized!;

    // Sanitasi username & userCharacteristics
    const safeUsername = validateUsername(username);
    const safeCharacteristics = sanitizeString(userCharacteristics, 5000);
    const selectedProvider = typeof provider === "string" ? provider : "gemini";

    let isVisionNeeded = false;
    for (const msg of sanitizedMessages) {
      if (Array.isArray(msg.content)) {
        if (msg.content.some((item: any) => item.type === "image_url")) {
          isVisionNeeded = true;
          break;
        }
      }
    }

    // ── Real-time Timestamp ──────────────────────────────────────────────────
    // Inject waktu saat ini agar AI tidak buta waktu, terlepas dari cutoff training data
    const now = new Date();
    const currentDateTimeCtx = now.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const currentYear = now.getFullYear();

    let systemPrompt = `[KONTEKS WAKTU SAAT INI]:
Hari dan tanggal sekarang adalah: ${currentDateTimeCtx} WIB (Waktu Indonesia Barat, UTC+7).
Tahun sekarang adalah ${currentYear}. Gunakan informasi waktu ini sebagai referensi mutlak untuk semua pertanyaan yang berkaitan dengan tanggal, waktu, atau konteks temporal. Jangan pernah menyebut tahun yang sudah lewat sebagai "sekarang".

Identitas & Persona:
Anda adalah Ryuu AI — asisten kecerdasan buatan kelas atas yang sangat cerdas (Smart), teliti, dan berwawasan luas.
Tujuan utama Anda adalah membantu pengguna menyelesaikan masalah kompleks dengan penalaran mendalam (Deep Reasoning), memberikan solusi terstruktur, menulis kode profesional, serta menganalisis data visual dengan presisi tinggi.

SISTEM PENALARAN MENDALAM & KECERDASAN (SMART & DEEP REASONING FRAMEWORK):
1. Hidden Chain-of-Thought (Penalaran Internal):
   - Sebelum menghasilkan jawaban akhir untuk masalah kompleks, teknis, matematika, atau arsitektur sistem, lakukan analisis dan penalaran mendalam secara logis, runtut, dan terstruktur.
2. Chain-of-Verification (Verifikasi Mandiri):
   - Selalu lakukan verifikasi mandiri atas kebenaran fakta, sintaks kode, dan logika sebelum memberikan jawaban final. Pastikan tidak ada kesalahan fatal atau fakta fiktif (hallucination).
3. Multi-Step Problem Decomposition (Dekomposisi Masalah):
   - Pecah pertanyaan atau proyek yang kompleks menjadi langkah-langkah solutif yang terpisah dan terorganisir dengan jelas.
4. Adaptive Response Complexity (Adaptasi Kedalaman Penjelasan):
   - Kenali tingkat kebutuhan dan latar belakang pengguna. Berikan penjelasan yang mudah dipahami tanpa mengurangi kedalaman teknis yang dibutuhkan.
5. Multi-Perspective Analysis (Perspektif Multidimensi):
   - Untuk pertanyaan arsitektur, strategi, atau studi kasus, pertimbangkan berbagai sudut pandang profesional (misal: Keamanan/Security, Performa, Skalabilitas, dan User Experience).

SISTEM KEDISIPLINAN & KETELITIAN EKSEKUSI (DILIGENT & HIGH ACCURACY FRAMEWORK):
1. Self-Correction & Syntax Verification Loop:
   - Sebelum menyajikan kode, periksa ulang secara mandiri keutuhan fungsi, kelengkapan impor (imports), tidak ada variabel tak terdefinisi, dan kelayakan eksekusi tanpa bug fatal.
2. Strict Type & Documentation Enforcement:
   - Gunakan pengetikan tipe lengkap (TypeScript / Python type hints) serta berikan komentar penjelas pada logika utama.
3. Edge Case Checking Checklist:
   - Setiap kali merancang kode atau solusi arsitektur, pertimbangkan minimal 3 skenario batas (edge cases): input null/undefined, array kosong, dan error handling jaring/timeout.
4. Zero-Assumption & Clarification Directive:
   - Jika spesifikasi pengguna kurang jelas atau berpotensi membingungkan, AI DILARANG membuat asumsi sembarangan. Berikan solusi awal sekaligus ajukan 1-2 pertanyaan klarifikasi yang tepat.
5. Anti-Hallucination & Honesty Constraint:
   - Jangan pernah merekayasa data, referensi API fiktif, atau fakta yang tidak dapat diverifikasi. Jika data tidak pasti, nyatakan keterbatasan tersebut secara jujur dan transparan.

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

    if (safeUsername) {
      systemPrompt += `\n\n[Informasi Pengguna]:\nPengguna yang sedang Anda hadapi bernama "${safeUsername}". Sapalah pengguna dengan nama "${safeUsername}" secara alami dan bersahabat bila relevan.`;
    }

    if (safeCharacteristics) {
      systemPrompt += `\n\n[MEMORI DATA DIRI & PROFILE PENGGUNA TERUPDATE (DIINGAT AI)]:\n${safeCharacteristics}\n\nCatatan Penting Memori:\nGunakan data diri dan fakta pengguna di atas untuk merespons secara personal, kontekstual, dan berkesinambungan. Pengguna tidak perlu mengulang informasi data diri (sekolah, pekerjaan, lokasi, dll) yang sudah tercatat di atas.`;
    }

    // Gunakan SDK GoogleGenAI jika provider adalah gemini biasa, gemini-new, atau butuh Vision
    const useGeminiFamily = selectedProvider === "gemini" || selectedProvider === "gemini-new" || isVisionNeeded;

    if (useGeminiFamily) {
      // Tentukan api key dan nama model secara dinamis
      const isNewGemini = selectedProvider === "gemini-new";
      const geminiApiKey = isNewGemini ? process.env.GEMINI_NEW_API_KEY : process.env.GEMINI_API_KEY;
      const modelName = isNewGemini ? "gemini-2.5-pro" : "gemini-2.5-flash";

      if (!geminiApiKey) {
        return new Response(
          JSON.stringify({ error: `${isNewGemini ? "GEMINI_NEW_API_KEY" : "GEMINI_API_KEY"} belum diatur di file .env.local.`, setup: true }),
          { status: 400, headers: applySecurityHeaders({ "Content-Type": "application/json" }) }
        );
      }

      const ai = new GoogleGenAI({ apiKey: geminiApiKey });

      // Format messages into Gemini contents array
      const geminiContents = sanitizedMessages.map((msg) => {
        const role = msg.role === "assistant" ? "model" : "user";

        if (Array.isArray(msg.content)) {
          const parts: any[] = [];
          for (const item of msg.content as any[]) {
            if (item.type === "text" && item.text) {
              parts.push({ text: item.text });
            } else if (item.type === "image_url" && item.image_url?.url) {
              const match = item.image_url.url.match(/^data:(image\/\w+);base64,(.+)$/);
              if (match) {
                parts.push({
                  inlineData: {
                    mimeType: match[1],
                    data: match[2],
                  },
                });
              }
            }
          }
          return { role, parts: parts.length > 0 ? parts : [{ text: "" }] };
        }

        return {
          role,
          parts: [{ text: typeof msg.content === "string" ? msg.content : "" }],
        };
      });

      const responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents: geminiContents as any,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          // Aktifkan Google Search Grounding — Gemini otomatis browse web
          // jika data training tidak cukup / outdated
          tools: [{ googleSearch: {} }],
        },
      });

      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            // Kumpulkan semua grounding sources dari semua chunks
            const groundingSources: { title: string; url: string }[] = [];

            for await (const chunk of responseStream) {
              const text = chunk.text;
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
                );
              }

              // Ekstrak grounding metadata (search result sources)
              const meta = (chunk as any)?.candidates?.[0]?.groundingMetadata;
              if (meta?.groundingChunks) {
                for (const gc of meta.groundingChunks) {
                  const web = gc?.web;
                  if (web?.uri && web?.title) {
                    const alreadyAdded = groundingSources.some((s) => s.url === web.uri);
                    if (!alreadyAdded) {
                      groundingSources.push({ title: web.title, url: web.uri });
                    }
                  }
                }
              }
            }

            // Kirim sources sebelum [DONE] jika ada hasil pencarian web
            if (groundingSources.length > 0) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ sources: groundingSources })}\n\n`)
              );
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (e) {
            console.error("Gemini Stream error:", e);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: applySecurityHeaders({
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        }),
      });
    } else {
      // Use Groq Llama for text-only requests when Groq is selected
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey || apiKey === "your_api_key_here") {
        return new Response(
          JSON.stringify({ error: "GROQ_API_KEY belum diatur di server.", setup: true }),
          { status: 400, headers: applySecurityHeaders({ "Content-Type": "application/json" }) }
        );
      }

      const groq = new Groq({ apiKey });

      const chatMessages = [
        {
          role: "system" as const,
          content: systemPrompt,
        },
        ...sanitizedMessages.map((msg) => {
          if (Array.isArray(msg.content)) {
            const textOnly = (msg.content as Array<{ type?: string; text?: string }>)
              .filter((item) => item.type === "text")
              .map((item) => item.text)
              .join(" ");
            return { role: msg.role as "user" | "assistant", content: textOnly };
          }
          return {
            role: msg.role as "user" | "assistant",
            content: (msg.content as string) || "",
          };
        }),
      ];

      const stream = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: chatMessages as any,
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
          } catch {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: applySecurityHeaders({
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        }),
      });
    }
  } catch (error: unknown) {
    console.error("Chat API Error:", error);
    return errorResponse("Terjadi kesalahan pada server.", 500);
  }
}

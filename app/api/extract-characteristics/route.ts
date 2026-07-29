import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import {
  checkRateLimit,
  getClientIP,
  isPayloadTooLarge,
  sanitizeString,
  validateUsername,
  applySecurityHeaders,
  errorResponse,
} from "@/lib/security";

export async function POST(req: NextRequest) {
  // ── 1. Rate Limiting ───────────────────────────────────────────────────
  const ip = getClientIP(req);
  const rateCheck = checkRateLimit(ip, 15, 60); // 15 req/menit per IP
  if (!rateCheck.allowed) {
    return errorResponse("Terlalu banyak request. Coba lagi nanti.", 429, {
      retryAfter: rateCheck.retryAfter,
    });
  }

  // ── 2. Payload Size Guard ──────────────────────────────────────────────
  if (isPayloadTooLarge(req)) {
    return errorResponse("Payload terlalu besar.", 413);
  }

  let existingCharacteristics = "";
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

    const rawBody = body as Record<string, unknown>;
    existingCharacteristics = sanitizeString(rawBody.existingCharacteristics, 5000);
    const messages = rawBody.messages;
    const username = validateUsername(rawBody.username);

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey || apiKey === "your_api_key_here") {
      return new Response(
        JSON.stringify({ characteristics: existingCharacteristics || "" }),
        {
          status: 200,
          headers: applySecurityHeaders({ "Content-Type": "application/json" }),
        }
      );
    }

    const groq = new Groq({ apiKey });

    // Validasi messages array
    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ characteristics: existingCharacteristics || "" }),
        {
          status: 200,
          headers: applySecurityHeaders({ "Content-Type": "application/json" }),
        }
      );
    }

    const userText = messages
      .filter((m: unknown) => {
        if (typeof m !== "object" || m === null) return false;
        return (m as Record<string, unknown>).role === "user";
      })
      .map((m: unknown) => {
        const msg = m as Record<string, unknown>;
        return typeof msg.content === "string"
          ? sanitizeString(msg.content, 5000)
          : JSON.stringify(msg.content).slice(0, 2000);
      })
      .slice(-6)
      .join("\n");

    if (!userText.trim()) {
      return new Response(
        JSON.stringify({ characteristics: existingCharacteristics || "" }),
        {
          status: 200,
          headers: applySecurityHeaders({ "Content-Type": "application/json" }),
        }
      );
    }

    const safeUsername = username || "User";

    const prompt = `Anda adalah sistem memori analitik AI yang bertugas membangun dan mengelola profil data diri pengguna secara otomatis dan kumulatif dari percakapan.

Nama pengguna saat ini: ${safeUsername}

PROFIL DATA DIRI YANG SUDAH TERCEK KAN SAAT INI:
${existingCharacteristics ? existingCharacteristics : "(Belum ada data diri yang tercatat)"}

PESAN PERCAKAPAN TERBARU:
${userText}

TUGAS ANDA:
1. Analisis seluruh pesan pengguna di atas. Identifikasi dan ekstrak SEMUA informasi data diri baru yang disebutkan oleh pengguna (misal: asal sekolah/universitas, jurusan, pekerjaan/profesi, tempat tinggal/kota, usia, hobi/minat, proyek yang dikerjakan, bahasa pemrograman favorit, kebiasaan, makanan favorit, dll).
2. Gabungkan fakta data diri baru tersebut dengan profil lama tanpa menghapus informasi lama yang masih relevan.
3. Format hasil akhir dalam bentuk poin-poin ringkas yang terorganisir (misal:
   - Nama: ${safeUsername}
   - Pendidikan/Sekolah: ...
   - Pekerjaan/Profesi: ...
   - Lokasi: ...
   - Minat & Tech Stack: ...
   - Catatan/Preferensi Lain: ...).
4. Jika tidak ada fakta data diri baru yang dapat diekstrak dari percakapan terbaru, KEMBALIKAN SELURUH TEKS PROFIL LAMA tanpa diubah sedikit pun.
5. CUKUP hasilkan daftar poin data diri tersebut. JANGAN tambahkan teks pembuka, penutup, atau salam.`;

    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 500,
    });

    const characteristics = res.choices[0]?.message?.content?.trim() || existingCharacteristics || "";

    return new Response(
      JSON.stringify({ characteristics }),
      {
        status: 200,
        headers: applySecurityHeaders({ "Content-Type": "application/json" }),
      }
    );
  } catch (err) {
    console.error("Error extracting user characteristics:", err);
    // Jangan bocorkan detail error internal
    return new Response(
      JSON.stringify({ characteristics: existingCharacteristics || "" }),
      {
        status: 200,
        headers: applySecurityHeaders({ "Content-Type": "application/json" }),
      }
    );
  }
}

/**
 * Security Utilities — Middleware keamanan terpusat untuk API routes.
 * Mencakup: Rate Limiting, Input Validation, CORS, Payload Size Guard,
 * Sanitization, dan Security Headers.
 */

// ─── Rate Limiter (In-Memory, per IP) ──────────────────────────────────────
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Periksa apakah IP melebihi batas request.
 * @param ip         - IP address klien
 * @param limit      - Maks request dalam window
 * @param windowSec  - Durasi window dalam detik
 */
export function checkRateLimit(
  ip: string,
  limit: number = 30,
  windowSec: number = 60
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count += 1;
  return { allowed: true, retryAfter: 0 };
}

// Bersihkan entri lama setiap 5 menit agar tidak memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitStore.entries()) {
      if (now > val.resetAt) rateLimitStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

// ─── Ekstrak IP dari Request ────────────────────────────────────────────────
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ─── Security Headers ───────────────────────────────────────────────────────
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

/** Tambahkan security headers ke objek Headers yang sudah ada */
export function applySecurityHeaders(
  headers: Record<string, string> = {}
): Record<string, string> {
  return { ...headers, ...SECURITY_HEADERS };
}

// ─── Sanitasi String Input ──────────────────────────────────────────────────
/**
 * Strip karakter berbahaya dari string (XSS basic prevention).
 */
export function sanitizeString(input: unknown, maxLen = 8000): string {
  if (typeof input !== "string") return "";
  return input
    .slice(0, maxLen)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
}

// ─── Validasi Ukuran Payload ────────────────────────────────────────────────
const MAX_BODY_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function isPayloadTooLarge(req: Request): boolean {
  const contentLength = req.headers.get("content-length");
  if (!contentLength) return false;
  return parseInt(contentLength, 10) > MAX_BODY_SIZE_BYTES;
}

// ─── Respons Error Terstandar ───────────────────────────────────────────────
export function errorResponse(
  message: string,
  status: number,
  extra: Record<string, unknown> = {}
): Response {
  return new Response(
    JSON.stringify({ error: message, ...extra }),
    {
      status,
      headers: applySecurityHeaders({ "Content-Type": "application/json" }),
    }
  );
}

// ─── Validasi Pesan Chat ────────────────────────────────────────────────────
export interface ChatMessage {
  role: string;
  content: string | unknown[];
}

/** Pastikan array messages valid dan tidak mengandung input berbahaya */
export function validateMessages(messages: unknown): {
  valid: boolean;
  reason?: string;
  sanitized?: ChatMessage[];
} {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { valid: false, reason: "messages harus berupa array tidak kosong" };
  }

  if (messages.length > 200) {
    return { valid: false, reason: "Terlalu banyak pesan dalam satu request" };
  }

  const sanitized: ChatMessage[] = [];

  for (const msg of messages) {
    if (typeof msg !== "object" || msg === null) {
      return { valid: false, reason: "Format pesan tidak valid" };
    }
    const m = msg as Record<string, unknown>;

    if (!["user", "assistant", "system"].includes(m.role as string)) {
      return { valid: false, reason: `Role tidak dikenal: ${m.role}` };
    }

    if (typeof m.content === "string") {
      sanitized.push({
        role: m.role as string,
        content: sanitizeString(m.content, 20000),
      });
    } else if (Array.isArray(m.content)) {
      if (m.content.length > 10) {
        return { valid: false, reason: "Terlalu banyak bagian dalam satu pesan" };
      }
      sanitized.push({ role: m.role as string, content: m.content });
    } else {
      return { valid: false, reason: "Konten pesan harus string atau array" };
    }
  }

  return { valid: true, sanitized };
}

// ─── Validasi Username ──────────────────────────────────────────────────────
export function validateUsername(username: unknown): string {
  if (typeof username !== "string") return "";
  // Hanya izinkan alfanumerik, spasi, underscore, strip, titik
  return username.replace(/[^a-zA-Z0-9 _\-\.]/g, "").slice(0, 50).trim();
}

// ─── Validasi Audio Upload ──────────────────────────────────────────────────
const ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
];
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25 MB (batas Whisper)

export function validateAudioFile(file: Blob): {
  valid: boolean;
  reason?: string;
} {
  if (file.size > MAX_AUDIO_SIZE) {
    return { valid: false, reason: "File audio terlalu besar (maks 25 MB)" };
  }

  // Izinkan jika tipe kosong (browser kadang tidak set type)
  if (file.type && file.type !== "" && !ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return { valid: false, reason: `Tipe file tidak diizinkan: ${file.type}` };
  }

  return { valid: true };
}

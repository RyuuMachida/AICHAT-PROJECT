import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Izinkan akses dari IP lokal saat development
  allowedDevOrigins: ["localhost", "127.0.0.1", "10.51.52.147", "192.168.1.5", "*.local"],

  // ─── Security Headers ──────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Cegah caching pada API responses
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },

  // ─── Matikan header X-Powered-By ────────────────────────────────────
  poweredByHeader: false,
};

export default nextConfig;

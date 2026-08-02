import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ryuu AI — Asisten Cerdas",
  description: "Ryuu AI dengan antarmuka modern dan respons cerdas. Ditenagai oleh AI canggih.",
  keywords: ["chatbot", "Ryuu AI", "AI", "assistant", "Groq", "Gemini", "Indonesia"],
  authors: [{ name: "Ryuu AI" }],
  icons: {
    icon: "/logo&brand.jpeg",
    shortcut: "/logo&brand.jpeg",
    apple: "/logo&brand.jpeg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

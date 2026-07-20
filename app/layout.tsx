import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatBot AI — Asisten Cerdas",
  description: "ChatBot AI dengan antarmuka modern dan respons cerdas. Ditenagai oleh Groq AI.",
  keywords: ["chatbot", "AI", "assistant", "Groq", "Indonesia"],
  authors: [{ name: "ChatBot AI" }],
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

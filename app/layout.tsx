import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ryuu AI",
  description: "Platform AI Gemini & Groq",
  keywords: ["chatbot", "Ryuu AI", "AI", "assistant", "Groq", "Gemini", "Indonesia"],
  authors: [{ name: "Ryuu AI" }],
  icons: {
    icon: "/logo&brand.jpeg",
    shortcut: "/logo&brand.jpeg",
    apple: "/logo&brand.jpeg",
  },
  openGraph: {
    title: "Ryuu AI",
    description: "Platform AI Gemini & Groq",
    url: "https://ryuuuai.vercel.app",
    siteName: "Ryuu AI",
    images: [
      {
        url: "/thumbnail&startupPage.jpeg",
        width: 1200,
        height: 630,
        alt: "Ryuu AI — AI Chat for Everyone",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ryuu AI",
    description: "Platform AI Gemini & Groq",
    images: ["/thumbnail&startupPage.jpeg"],
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

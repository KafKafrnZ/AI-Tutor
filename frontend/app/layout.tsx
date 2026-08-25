import type { Metadata } from "next";
import "@/styles/tokens.css";
import "./globals.css";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import AppLayout from "./AppLayout";
import { Toaster } from "sonner";
import { assertPreviewAuthConfig } from "@/lib/preview-auth";

assertPreviewAuthConfig(process.env.NODE_ENV, process.env.PREVIEW_AUTH);

export const metadata: Metadata = {
  title: "Ascend AI — AI Tutor for Government Exams",
  description:
    "Adaptive AI tutor for IBPS, UPSC, SSC & State PSC exams. RAG-powered streamed responses, 3D knowledge graph, mock tests, and mistake tracking.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://ascend-ai.vercel.app"
  ),
  openGraph: {
    title: "Ascend AI — AI Tutor for Government Exams",
    description:
      "Adaptive AI tutor for IBPS, UPSC, SSC & State PSC exams. RAG-powered streamed responses, 3D knowledge graph, and mock tests.",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "https://ascend-ai.vercel.app",
    siteName: "Ascend AI",
    images: [
      {
        url: "/brand/og-image.png",
        width: 1200,
        height: 630,
        alt: "Ascend AI — AI Tutor for Government Exams",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ascend AI — AI Tutor for Government Exams",
    description:
      "Adaptive AI tutor for IBPS, UPSC, SSC & State PSC exams. RAG-powered, streamed, 3D.",
    images: ["/brand/og-image.png"],
  },
  icons: {
    icon: "/brand/icon-192.png",
    apple: "/brand/icon-192.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const previewAuthEnabled =
    process.env.NODE_ENV !== "production" &&
    process.env.PREVIEW_AUTH === "true";

  return (
    <html lang="en" className="dark font-sans">
      <body>
        <ErrorBoundary>
          <AppLayout previewAuthEnabled={previewAuthEnabled}>{children}</AppLayout>
        </ErrorBoundary>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

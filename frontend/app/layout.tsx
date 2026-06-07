import type { Metadata } from "next";
import "@/styles/tokens.css";
import "./globals.css";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import AppLayout from "./AppLayout";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Ascend AI - AI Tutor for Government Exams",
  description: "Open-source AI tutor for UPSC, State PSC, and India's government exams.",
  icons: {
    icon: "/brand/logo.svg",
    apple: "/brand/logo.svg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark font-sans">
      <body>
        <ErrorBoundary>
          <AppLayout>{children}</AppLayout>
        </ErrorBoundary>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

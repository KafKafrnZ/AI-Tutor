import type { Metadata } from "next";
import "./globals.css";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import AppLayout from "./AppLayout";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "IBPS SO AI Tutor",
  description: "Advanced AI Exam Preparation",
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

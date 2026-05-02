import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GlobalFreight AI Platform",
  description: "AI-Fortnight 2026 - RAG Assistant & Exception Handler",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CtxOpt - Context Engineering Optimizer",
    template: "%s | CtxOpt",
  },
  description:
    "Optimize your LLM token usage with intelligent context engineering. Reduce costs, improve performance, and get actionable suggestions.",
  keywords: [
    "LLM",
    "token optimization",
    "context engineering",
    "Claude",
    "Anthropic",
    "AI costs",
    "prompt engineering",
  ],
  authors: [{ name: "CtxOpt" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ctxopt.dev",
    siteName: "CtxOpt",
    title: "CtxOpt - Context Engineering Optimizer",
    description:
      "Optimize your LLM token usage with intelligent context engineering.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CtxOpt - Context Engineering Optimizer",
    description:
      "Optimize your LLM token usage with intelligent context engineering.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen antialiased">
          {children}
          <Toaster position="bottom-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}

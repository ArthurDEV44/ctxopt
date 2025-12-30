import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import {
  SoftwareApplicationSchema,
  OrganizationSchema,
} from "@/components/JsonLd";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <SoftwareApplicationSchema />
        <OrganizationSchema />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <Toaster position="bottom-right" />
        <Analytics />
      </body>
    </html>
  );
}

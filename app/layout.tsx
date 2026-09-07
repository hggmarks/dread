import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./reader.css";
import { RegisterServiceWorker } from "./register-service-worker";

export const metadata: Metadata = {
  title: "Focus Reader",
  description: "A calm, local-first reader for focused reading.",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#0c1117",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}

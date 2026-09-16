import type { Metadata } from "next";
import "./globals.css";
import "./visual.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ApplicationProviders from "@/components/ApplicationProviders";
import ChatWidget from "@/components/ChatWidget";
import { PREFERENCES_INIT_SCRIPT } from "@/lib/preferences";

export const metadata: Metadata = {
  title: "Justice AI — Empowering Citizens, Equipping Advocates",
  description:
    "An Indian Legal AI platform: plain-language legal notice analysis for citizens and an IPC↔BNS converter plus drafting co-pilot for advocates.",
  keywords: ["Legal AI", "India", "Justice AI", "IPC", "BNS", "Legal Notice", "Bail Application"],
  icons: {
    icon: [
      { url: "/brand/justice-ai-mark.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: PREFERENCES_INIT_SCRIPT }} /></head>
      <body className="min-h-screen flex flex-col">
        <ApplicationProviders>
          <Navbar />
          <div className="app-frame"><main id="main-content" className="app-content" tabIndex={-1}>{children}</main><Footer /></div>
          <ChatWidget />
        </ApplicationProviders>
      </body>
    </html>
  );
}

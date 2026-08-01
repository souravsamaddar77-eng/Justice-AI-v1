import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Justice AI — Empowering Citizens, Equipping Advocates",
  description:
    "An Indian Legal AI platform: plain-language legal notice analysis for citizens and an IPC↔BNS converter plus drafting co-pilot for advocates.",
  keywords: ["Legal AI", "India", "Justice AI", "IPC", "BNS", "Legal Notice", "Bail Application"],
};

export const viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

import { ClerkProvider } from "@clerk/nextjs";
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
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/cases"
          signUpFallbackRedirectUrl="/cases"
          localization={{ signIn: { start: { title: "Sign in to Justice AI", titleCombined: "Sign in to Justice AI" } } }}
          appearance={{ variables: { colorPrimary: "#16243b", borderRadius: "0.75rem", fontFamily: "Segoe UI, system-ui, sans-serif" } }}
        >
          <Navbar />
          <div className="app-frame"><main id="main-content" className="app-content" tabIndex={-1}>{children}</main><Footer /></div>
        </ClerkProvider>
      </body>
    </html>
  );
}

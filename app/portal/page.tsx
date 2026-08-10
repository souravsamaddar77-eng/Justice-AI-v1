"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Scale, UserRound, Briefcase, ShieldCheck } from "lucide-react";

function PortalGatewayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for role in URL params (for demo) or localStorage (for real auth)
    const roleParam = searchParams.get("role");
    const storedRole = localStorage.getItem("justice_ai_role");

    const role = roleParam || storedRole;

    if (role === "citizen") {
      router.push("/victim-citizen");
    } else if (role === "advocate") {
      router.push("/advocate");
    } else {
      // No role detected - show role selection
      // In production, this would check JWT from auth context
    }
  }, [router, searchParams]);

  const setRoleAndRedirect = (role: "citizen" | "advocate") => {
    localStorage.setItem("justice_ai_role", role);
    router.push(role === "citizen" ? "/victim-citizen" : "/advocate");
  };

  return (
    <div className="min-h-screen bg-navy-50/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-300 shadow-sm">
              <Scale className="h-7 w-7 text-navy-950" strokeWidth={2.2} />
            </span>
          </Link>
          <h1 className="font-serif text-3xl font-bold text-navy-900">Welcome to Justice AI</h1>
          <p className="mt-2 text-navy-600">
            Select your role to access the appropriate portal
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid gap-4">
          {/* Citizen Portal Card */}
          <button
            onClick={() => setRoleAndRedirect("citizen")}
            className="card-surface p-6 relative overflow-hidden group hover:border-gold-300/50 hover:shadow-xl transition-all"
          >
            <div className="absolute top-0 right-0 h-24 w-24 bg-gold-500/10 rounded-full blur-2xl" />
            <div className="relative flex items-start gap-4">
              <div className="flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-xl bg-gold-100 text-gold-600 group-hover:scale-110 transition-transform">
                <UserRound className="h-7 w-7" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-lg text-navy-900">Citizen Portal</h3>
                <p className="mt-1 text-sm text-navy-600">
                  For individuals seeking legal guidance
                </p>
                <ul className="mt-3 space-y-2 text-sm text-navy-700">
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Legal notice analysis & urgency rating
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Next-steps action tracker with deadlines
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Find NALSA-verified panel lawyers
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Voice-enabled legal assistant (Hindi/English)
                  </li>
                </ul>
              </div>
            </div>
          </button>

          {/* Advocate Portal Card */}
          <button
            onClick={() => setRoleAndRedirect("advocate")}
            className="card-surface p-6 relative overflow-hidden group hover:border-gold-300/50 hover:shadow-xl transition-all"
          >
            <div className="absolute top-0 right-0 h-24 w-24 bg-gold-500/10 rounded-full blur-2xl" />
            <div className="relative flex items-start gap-4">
              <div className="flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                <Briefcase className="h-7 w-7" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-lg text-navy-900">Advocate Portal</h3>
                <p className="mt-1 text-sm text-navy-600">
                  For legal professionals & law firms
                </p>
                <ul className="mt-3 space-y-2 text-sm text-navy-700">
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Smart Intake Synthesizer (Case Briefs)
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Draft Redlining & Anomaly Detection
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    OCR Simulation for scanned documents
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Precedents & Judgments (Indian Kanoon)
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Lawyer Network & Referrals
                  </li>
                </ul>
              </div>
            </div>
          </button>
        </div>

        {/* Demo Notice */}
        <div className="mt-8 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800 text-center">
            <strong>Demo Mode:</strong> Role selection is stored in localStorage.
            In production, this would use JWT-based authentication with role claims.
          </p>
        </div>

        {/* Quick Links */}
        <div className="mt-6 text-center">
          <p className="text-sm text-navy-500 mb-3">Or browse directly:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <a href="/victim-citizen" className="btn-secondary text-sm">Citizen Dashboard</a>
            <a href="/citizen" className="btn-secondary text-sm">Advanced Citizen Tools</a>
            <a href="/advocate" className="btn-secondary text-sm">Advocate Dashboard</a>
            <a href="/advocate/network" className="btn-secondary text-sm">Lawyer Network</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-navy-50/40 flex items-center justify-center p-4">
      <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
    </div>
  );
}

export default function PortalGatewayPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PortalGatewayContent />
    </Suspense>
  );
}

import Link from "next/link";
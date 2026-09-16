"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { UserRound } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { useAuthAvailable } from "@/components/ApplicationProviders";
import Link from "next/link";

export default function AccountControls() {
  const { t } = usePreferences();
  const authAvailable = useAuthAvailable();
  if (!authAvailable) return <div className="account-controls"><Link href="/sign-in" className="account-link"><UserRound size={17} aria-hidden="true" /><span>{t("Sign in")}</span></Link></div>;
  return <div className="account-controls">
    <Show when="signed-out">
      <SignInButton mode="redirect"><button className="account-link" aria-label={t("Sign in")}><UserRound size={17} aria-hidden="true" /><span>{t("Sign in")}</span></button></SignInButton>
      <SignUpButton mode="redirect"><button className="account-sign-up">{t("Create account")}</button></SignUpButton>
    </Show>
    <Show when="signed-in"><UserButton /></Show>
  </div>;
}

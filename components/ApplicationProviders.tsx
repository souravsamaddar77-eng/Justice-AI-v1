"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { PreferencesProvider, usePreferences } from "./PreferencesProvider";
import { ChatSessionProvider } from "./chat/ChatSessionProvider";

function ThemedApplication({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, t } = usePreferences();
  const dark = resolvedTheme === "dark";
  return <ClerkProvider
    signInUrl="/sign-in"
    signUpUrl="/sign-up"
    signInFallbackRedirectUrl="/cases"
    signUpFallbackRedirectUrl="/cases"
    localization={{ signIn: { start: { title: `${t("Sign in")} · Justice AI`, titleCombined: `${t("Sign in")} · Justice AI` } } }}
    appearance={{
      variables: {
        colorPrimary: dark ? "#dfbd77" : "#16243b",
        colorBackground: dark ? "#172438" : "#ffffff",
        colorInput: dark ? "#101a2a" : "#ffffff",
        colorInputForeground: dark ? "#edf1f8" : "#16243b",
        colorForeground: dark ? "#edf1f8" : "#16243b",
        colorMutedForeground: dark ? "#b2bfd2" : "#53627a",
        borderRadius: "0.75rem",
        fontFamily: "Segoe UI, system-ui, sans-serif",
      },
      elements: { formButtonPrimary: { color: dark ? "#101a2a" : "#ffffff" } },
    }}
  ><ChatSessionProvider>{children}</ChatSessionProvider></ClerkProvider>;
}

export default function ApplicationProviders({ children }: { children: React.ReactNode }) {
  return <PreferencesProvider><ThemedApplication>{children}</ThemedApplication></PreferencesProvider>;
}

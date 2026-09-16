"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { createContext, useContext } from "react";
import { PreferencesProvider, usePreferences } from "./PreferencesProvider";
import { ChatSessionProvider } from "./chat/ChatSessionProvider";

const AuthAvailabilityContext = createContext(false);
export const useAuthAvailable = () => useContext(AuthAvailabilityContext);

function ThemedApplication({ children, authAvailable }: { children: React.ReactNode; authAvailable: boolean }) {
  const { resolvedTheme, t } = usePreferences();
  const dark = resolvedTheme === "dark";
  if (!authAvailable) return <ChatSessionProvider authAvailable={false}>{children}</ChatSessionProvider>;
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
  ><ChatSessionProvider authAvailable>{children}</ChatSessionProvider></ClerkProvider>;
}

export default function ApplicationProviders({ children, authAvailable }: { children: React.ReactNode; authAvailable: boolean }) {
  return <AuthAvailabilityContext.Provider value={authAvailable}><PreferencesProvider><ThemedApplication authAvailable={authAvailable}>{children}</ThemedApplication></PreferencesProvider></AuthAvailabilityContext.Provider>;
}

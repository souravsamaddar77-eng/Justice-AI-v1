"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { UserRound } from "lucide-react";

export default function AccountControls() {
  return <div className="account-controls">
    <Show when="signed-out">
      <SignInButton mode="redirect"><button className="account-link"><UserRound size={17} /><span>Sign in</span></button></SignInButton>
      <SignUpButton mode="redirect"><button className="account-sign-up">Create account</button></SignUpButton>
    </Show>
    <Show when="signed-in"><UserButton /></Show>
  </div>;
}

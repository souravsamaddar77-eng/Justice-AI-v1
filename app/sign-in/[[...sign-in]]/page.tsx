import { SignIn } from "@clerk/nextjs";
import AuthPage from "@/components/AuthPage";
import AuthUnavailable from "@/components/AuthUnavailable";
import { authConfigured } from "@/lib/auth/config";

export default function SignInPage() {
  return (
    <AuthPage title="Welcome back to your workspace.">
      {authConfigured() ? <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/cases" /> : <AuthUnavailable />}
    </AuthPage>
  );
}

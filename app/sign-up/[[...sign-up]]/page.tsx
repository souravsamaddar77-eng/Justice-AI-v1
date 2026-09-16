import { SignUp } from "@clerk/nextjs";
import AuthPage from "@/components/AuthPage";
import AuthUnavailable from "@/components/AuthUnavailable";
import { authConfigured } from "@/lib/auth/config";

export default function SignUpPage() {
  return (
    <AuthPage title="A private place for your case.">
      {authConfigured() ? <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/cases" /> : <AuthUnavailable />}
    </AuthPage>
  );
}

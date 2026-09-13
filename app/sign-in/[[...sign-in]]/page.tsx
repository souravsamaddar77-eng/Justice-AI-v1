import { SignIn } from "@clerk/nextjs";
import AuthPage from "@/components/AuthPage";

export default function SignInPage() {
  return (
    <AuthPage title="Welcome back to your workspace.">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/cases" />
    </AuthPage>
  );
}

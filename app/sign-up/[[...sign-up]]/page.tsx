import { SignUp } from "@clerk/nextjs";
import AuthPage from "@/components/AuthPage";

export default function SignUpPage() {
  return (
    <AuthPage title="A private place for your case.">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/cases" />
    </AuthPage>
  );
}

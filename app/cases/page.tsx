import CaseList from "@/components/cases/CaseList";
import AuthPage from "@/components/AuthPage";
import AuthUnavailable from "@/components/AuthUnavailable";
import { authConfigured } from "@/lib/auth/config";
export default function CasesPage() {
  if (!authConfigured()) return <AuthPage title="Your private case workspace."><AuthUnavailable /></AuthPage>;
  return <CaseList />;
}

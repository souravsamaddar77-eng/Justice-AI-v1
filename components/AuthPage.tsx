import Link from "next/link";
import { ArrowLeft, FolderLock, ShieldCheck, Users } from "lucide-react";
import "@/components/cases/workspace.css";

export default function AuthPage({ children, title }: { children: React.ReactNode; title: string }) {
  return <div className="case-space">
    <Link href="/" className="case-breadcrumb"><ArrowLeft size={15} /> Back to Justice AI</Link>
    <div className="case-auth">
      <section className="case-auth-intro">
        <FolderLock size={42} strokeWidth={1.5} />
        <h1>{title}</h1>
        <p className="case-muted">Keep your documents, important dates and legal work together. Your standalone tools are always available.</p>
        <ul className="case-auth-details">
          <li><ShieldCheck /> Your case stays private.</li>
          <li><Users /> Choose exactly what to share with your advocate.</li>
        </ul>
      </section>
      <section className="clerk-auth-panel" aria-label="Account access">{children}</section>
    </div>
  </div>;
}

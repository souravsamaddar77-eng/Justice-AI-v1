import Link from "next/link";

export default function AuthUnavailable() {
  return <div className="case-panel">
    <h2>Sign-in is temporarily unavailable</h2>
    <p className="case-muted">You can still use the legal tools while account access is being restored. Private cases remain protected.</p>
    <Link href="/tools" className="btn-secondary">Explore legal tools</Link>
  </div>;
}

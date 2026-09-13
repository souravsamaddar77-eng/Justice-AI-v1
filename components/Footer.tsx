import Link from "next/link";
export default function Footer() {
  return <footer className="app-footer"><p>Justice AI provides information and draft assistance. Review case-specific decisions with an advocate.</p><div><span>© {new Date().getFullYear()} Justice AI</span><Link href="/citizen#legal-aid">Legal aid</Link><Link href="/tools">All tools</Link></div></footer>;
}

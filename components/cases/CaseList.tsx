"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import {
  ArrowRight,
  FolderLock,
  FolderPlus,
  Loader2,
  LogOut,
  Plus,
  Search,
  Users,
} from "lucide-react";
import type { CaseInvitation, CaseRecord, CaseSession } from "@/types/cases";
import { caseDate, caseError, caseRequest } from "@/lib/case-client";
import "./workspace.css";
import BackendSetup from "./BackendSetup";

export const CASE_STATUSES = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  archived: "Archived",
};
export const CASE_CATEGORIES = [
  "General",
  "Civil",
  "Criminal",
  "Family",
  "Property",
  "Employment",
  "Consumer",
  "Other",
];

export default function CaseList() {
  const clerk = useClerk();
  const [session, setSession] = useState<CaseSession | null>(null);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [invites, setInvites] = useState<CaseInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const load = useCallback(async () => {
    setError("");
    try {
      const current = await caseRequest<CaseSession>("/api/auth/session");
      setSession(current);
      if (current.configured && current.user) {
        const [data, invitations] = await Promise.all([
          caseRequest<{ cases: CaseRecord[] }>("/api/cases"),
          caseRequest<{ invitations: CaseInvitation[] }>(
            "/api/cases/invitations",
          ),
        ]);
        setCases(data.cases);
        setInvites(invitations.invitations);
      }
    } catch (error) {
      setError(caseError(error));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function create(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await caseRequest<{ case: CaseRecord }>("/api/cases", {
        method: "POST",
        body: JSON.stringify({ title, description, category, status: "open" }),
      });
      window.location.assign(`/cases/${data.case.id}`);
    } catch (error) {
      setError(caseError(error));
      setBusy(false);
    }
  }
  async function invitation(id: string, action: "accept" | "decline") {
    setBusy(true);
    setError("");
    try {
      await caseRequest("/api/cases/invitations", {
        method: "POST",
        body: JSON.stringify({ id, action }),
      });
      await load();
    } catch (error) {
      setError(caseError(error));
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await clerk.signOut({ redirectUrl: "/" });
    } catch (error) {
      setError(caseError(error));
    } finally {
      setBusy(false);
    }
  }
  const filtered = cases.filter(
    (item) =>
      (status === "all" ||
        (status === "active"
          ? item.status !== "archived"
          : item.status === status)) &&
      `${item.title} ${item.description} ${item.category}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const pending = invites.filter((invite) => invite.status === "pending");
  return (
    <div className="case-space">
      <header className="case-header">
        <div>
          <h1>My cases</h1>
          <p className="case-muted">
            A clear place for your documents, next steps and work with an
            advocate.
          </p>
        </div>
        <div className="case-actions">
          {session?.user && (
            <>
              <button
                className="btn-secondary"
                onClick={signOut}
                disabled={busy}
              >
                <LogOut size={16} />
                Sign out
              </button>
              <button
                className="btn-primary"
                onClick={() => setShowNew(!showNew)}
                aria-expanded={showNew}
              >
                <Plus size={17} />
                New case
              </button>
            </>
          )}
        </div>
      </header>
      {error && (
        <div role="alert" className="case-error">
          {error}{" "}
          <button className="case-text-button" onClick={load}>
            Try again
          </button>
        </div>
      )}
      {loading ? (
        <div role="status" className="case-loading">
          <Loader2 size={20} />
          Loading your cases…
        </div>
      ) : !session?.configured ? (
        <section className="case-panel case-empty">
          <FolderLock />
          <h2>Private case workspace needs setup</h2>
          <BackendSetup details={session?.setupMessage} />
          <Link className="btn-secondary" href="/citizen">
            Explore citizen tools
          </Link>
        </section>
      ) : !session.user ? (
        <section className="case-panel case-empty">
          <FolderLock />
          <h2>Sign in to keep your case together</h2>
          <p className="case-muted">
            Save real cases, preserve original documents and invite
            collaborators. Your standalone tools are always available.
          </p>
          <div className="case-actions" style={{ justifyContent: "center" }}>
            <Link href="/sign-in?redirect_url=/cases" className="btn-primary">
              Sign in
            </Link>
            <Link href="/portal" className="btn-secondary">
              Explore legal tools
            </Link>
          </div>
        </section>
      ) : (
        <>
          <p className="case-muted">Signed in as {session.user.email}</p>
          {showNew && (
            <section className="case-panel" style={{ marginTop: 20 }}>
              <div className="case-panel-heading">
                <h2>Create a case</h2>
                <button
                  className="case-text-button"
                  onClick={() => setShowNew(false)}
                >
                  Cancel
                </button>
              </div>
              <form onSubmit={create} className="case-form">
                <div className="case-fields">
                  <div className="case-field">
                    <label htmlFor="new-case-title">Case title</label>
                    <input
                      autoFocus
                      id="new-case-title"
                      required
                      maxLength={160}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="For example, tenancy notice"
                    />
                  </div>
                  <div className="case-field">
                    <label htmlFor="new-case-category">Category</label>
                    <select
                      id="new-case-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {CASE_CATEGORIES.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                  <div className="case-field case-field-wide">
                    <label htmlFor="new-case-description">
                      Brief description (optional)
                    </label>
                    <textarea
                      id="new-case-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={10000}
                      placeholder="What happened, and what would you like help with?"
                    />
                  </div>
                </div>
                <div>
                  <button
                    className="btn-primary"
                    disabled={busy || !title.trim()}
                  >
                    {busy ? "Creating…" : "Create case"}
                    <FolderPlus size={16} />
                  </button>
                </div>
              </form>
            </section>
          )}
          {pending.length > 0 && (
            <section className="case-panel" style={{ marginTop: 24 }}>
              <div className="case-panel-heading">
                <div>
                  <h2>Invitations to collaborate</h2>
                  <p className="case-muted">
                    Accept to see the specific material shared with you.
                  </p>
                </div>
                <Users size={20} />
              </div>
              {pending.map((invite) => (
                <div className="case-register-row" key={invite.id}>
                  <div>
                    <h3>{invite.case_title || "Shared case"}</h3>
                    <p className="case-muted">
                      {invite.permission} access to {invite.item_ids.length}{" "}
                      selected item{invite.item_ids.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="case-actions">
                    <button
                      className="case-small-button"
                      onClick={() => invitation(invite.id, "decline")}
                      disabled={busy}
                    >
                      Decline
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => invitation(invite.id, "accept")}
                      disabled={busy}
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}
          <div className="case-toolbar">
            <div className="case-search">
              <Search />
              <input
                aria-label="Search cases"
                placeholder="Search cases by title, description or category"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              aria-label="Filter case status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: "auto", minWidth: 150 }}
            >
              <option value="active">Active cases</option>
              <option value="all">All cases</option>
              {Object.entries(CASE_STATUSES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <section className="case-panel">
            <div className="case-panel-heading">
              <h2>
                {status === "archived" ? "Archived cases" : "Case register"}
              </h2>
              <span className="case-muted">
                {filtered.length} {filtered.length === 1 ? "case" : "cases"}
              </span>
            </div>
            {filtered.length ? (
              <div className="case-register">
                {filtered.map((item) => (
                  <article className="case-register-row" key={item.id}>
                    <div>
                      <div className="case-actions">
                        <span className="case-badge">{item.category}</span>
                        <span
                          className={`case-badge ${item.status === "resolved" ? "case-badge-green" : "case-badge-gold"}`}
                        >
                          {CASE_STATUSES[item.status]}
                        </span>
                        {item.owner_id !== session.user?.id && (
                          <span className="case-badge">Shared with you</span>
                        )}
                      </div>
                      <h3>
                        <Link href={`/cases/${item.id}`}>{item.title}</Link>
                      </h3>
                      {item.description && (
                        <p className="case-muted">
                          {item.description.length > 180
                            ? `${item.description.slice(0, 180)}…`
                            : item.description}
                        </p>
                      )}
                      <p className="case-meta">
                        Updated {caseDate(item.updated_at)}
                      </p>
                    </div>
                    <Link
                      href={`/cases/${item.id}`}
                      aria-label={`Open ${item.title}`}
                      className="case-small-button"
                    >
                      <ArrowRight size={18} />
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="case-empty">
                <FolderPlus />
                <h3>
                  {cases.length
                    ? "No cases match your search"
                    : "Start with one case"}
                </h3>
                <p className="case-muted">
                  {cases.length
                    ? "Try another search or change the status filter."
                    : "Add a short description now. You can organize documents and next steps as you go."}
                </p>
                {!cases.length && (
                  <button
                    className="btn-primary"
                    onClick={() => setShowNew(true)}
                  >
                    <Plus size={16} />
                    Create your first case
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

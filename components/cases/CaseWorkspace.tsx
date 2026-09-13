"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckSquare,
  FileText,
  FolderLock,
  History,
  Loader2,
  Pencil,
  RefreshCw,
} from "lucide-react";
import type { CaseDetail, CaseSession, CaseStatus } from "@/types/cases";
import {
  caseDate,
  caseError,
  caseRequest,
  CaseRequestError,
} from "@/lib/case-client";
import DocumentsPane from "./DocumentsPane";
import TimelinePane from "./TimelinePane";
import SavedWorkPane from "./SavedWorkPane";
import SharingPane from "./SharingPane";
import ExportPanel from "./ExportPanel";
import { CASE_CATEGORIES, CASE_STATUSES } from "./CaseList";
import { REVIEW_LABELS, currentItems } from "./shared";
import "./workspace.css";
import BackendSetup from "./BackendSetup";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "documents", label: "Documents" },
  { id: "timeline", label: "Timeline & tasks" },
  { id: "work", label: "Saved work" },
  { id: "sharing", label: "Sharing" },
  { id: "history", label: "History" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function CaseWorkspace({ caseId }: { caseId: string }) {
  const [data, setData] = useState<CaseDetail | null>(null);
  const [session, setSession] = useState<CaseSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [source, setSource] = useState<string | undefined>();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [status, setStatus] = useState<CaseStatus>("open");
  const load = useCallback(async () => {
    const next = await caseRequest<CaseDetail>(`/api/cases/${caseId}`);
    setData(next);
    return next;
  }, [caseId]);
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("tab");
    if (TABS.some((item) => item.id === initial)) setTab(initial as Tab);
    (async () => {
      try {
        const current = await caseRequest<CaseSession>("/api/auth/session");
        setSession(current);
        if (current.configured && current.user) await load();
      } catch (error) {
        setError(caseError(error));
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);
  async function run(action: () => Promise<unknown>, message?: string) {
    if (busy) return false;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await action();
      await load();
      if (message) setSuccess(message);
      return true;
    } catch (error) {
      setError(caseError(error));
      if (
        error instanceof CaseRequestError &&
        [401, 403, 404].includes(error.status)
      )
        setData(null);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function changeTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }
  function onSource(itemId: string) {
    setSource(itemId);
    changeTab("documents");
  }
  function editCase() {
    if (!data) return;
    setTitle(data.case.title);
    setDescription(data.case.description);
    setCategory(data.case.category);
    setStatus(data.case.status);
    setEditing(true);
  }
  async function saveCase(event: FormEvent) {
    event.preventDefault();
    if (
      await run(
        () =>
          caseRequest(`/api/cases/${caseId}`, {
            method: "PATCH",
            body: JSON.stringify({ title, description, category, status }),
          }),
        "Case details updated.",
      )
    )
      setEditing(false);
  }
  const pane = data ? { data, busy, run, onSource } : null;
  const latest = data ? currentItems(data.items) : [];
  const tasks = latest.filter(
    (item) => item.kind === "task" && !item.metadata.completed,
  );
  const reviewNeeded = latest.filter(
    (item) => item.kind === "draft" && item.review_status !== "reviewed",
  );
  return (
    <div className="case-space">
      <Link className="case-breadcrumb" href="/cases">
        <ArrowLeft size={15} />
        All cases
      </Link>
      {error && (
        <div className="case-error" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <div className="case-loading" role="status">
          <Loader2 size={20} />
          Opening your case…
        </div>
      ) : !session?.configured ? (
        <section className="case-panel case-empty">
          <FolderLock />
          <h1>Private workspace needs setup</h1>
          <BackendSetup details={session?.setupMessage} />
          <Link href="/citizen" className="btn-secondary">
            Open citizen tools
          </Link>
        </section>
      ) : !session.user ? (
        <section className="case-panel case-empty">
          <FolderLock />
          <h1>Sign in to open this case</h1>
          <p className="case-muted">
            Only the owner and authorized collaborators can access saved case
            material.
          </p>
          <Link
            href={`/sign-in?redirect_url=${encodeURIComponent(`/cases/${caseId}`)}`}
            className="btn-primary"
          >
            Sign in
          </Link>
        </section>
      ) : !data || !pane ? (
        <section className="case-panel case-empty">
          <FolderLock />
          <h2>This case is not available</h2>
          <p className="case-muted">
            Check your account and invitation. The owner may have revoked
            access, or the case ID may be incorrect.
          </p>
          <Link href="/cases" className="btn-secondary">
            Return to my cases
          </Link>
        </section>
      ) : (
        <>
          <header className="case-header">
            <div>
              <div className="case-actions" style={{ marginBottom: 12 }}>
                <span className="case-badge">{data.case.category}</span>
                <span
                  className={`case-badge ${data.case.status === "resolved" ? "case-badge-green" : "case-badge-gold"}`}
                >
                  {CASE_STATUSES[data.case.status]}
                </span>
                {data.permission !== "owner" && (
                  <span className="case-badge">
                    Shared with you · {data.permission} access
                  </span>
                )}
              </div>
              <h1 style={{ overflowWrap: "anywhere" }}>{data.case.title}</h1>
              <p className="case-muted">
                Updated {caseDate(data.case.updated_at)}
                {data.permission === "owner"
                  ? " · Your private case workspace"
                  : " · Only selected material is visible"}
              </p>
            </div>
            <div className="case-actions">
              <button
                className="btn-secondary"
                aria-label="Refresh case"
                disabled={busy}
                onClick={() => run(async () => {})}
              >
                <RefreshCw size={16} />
              </button>
              {data.permission === "owner" && (
                <button className="btn-secondary" onClick={editCase}>
                  <Pencil size={15} />
                  Edit case
                </button>
              )}
            </div>
          </header>
          {success && (
            <div className="case-success" role="status">
              {success}
            </div>
          )}
          {editing && (
            <section className="case-panel" style={{ marginBottom: 24 }}>
              <form onSubmit={saveCase} className="case-form">
                <h2>Edit case details</h2>
                <div className="case-fields">
                  <div className="case-field case-field-wide">
                    <label htmlFor="case-title">Title</label>
                    <input
                      autoFocus
                      id="case-title"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={160}
                    />
                  </div>
                  <div className="case-field">
                    <label htmlFor="case-category">Category</label>
                    <select
                      id="case-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {!CASE_CATEGORIES.includes(category) && (
                        <option>{category}</option>
                      )}
                      {CASE_CATEGORIES.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="case-field">
                    <label htmlFor="case-status">Status</label>
                    <select
                      id="case-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as CaseStatus)}
                    >
                      {Object.entries(CASE_STATUSES).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="case-field case-field-wide">
                    <label htmlFor="case-description">Description</label>
                    <textarea
                      id="case-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={10000}
                    />
                  </div>
                </div>
                {status === "archived" && (
                  <p className="case-muted">
                    Archiving removes this case from the active list. Its
                    documents, sharing permissions and history are retained.
                  </p>
                )}
                <div className="case-actions">
                  <button
                    className="btn-primary"
                    disabled={busy || !title.trim()}
                  >
                    {busy ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    className="case-text-button"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}
          <div
            className="case-tabs"
            role="tablist"
            aria-label="Case workspace sections"
          >
            {TABS.map((item, index) => (
              <button
                id={`tab-${item.id}`}
                type="button"
                role="tab"
                key={item.id}
                aria-selected={tab === item.id}
                aria-controls={`panel-${item.id}`}
                tabIndex={tab === item.id ? 0 : -1}
                onClick={() => changeTab(item.id)}
                onKeyDown={(event) => {
                  if (
                    ["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  ) {
                    event.preventDefault();
                    const next =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? TABS.length - 1
                          : (index +
                              (event.key === "ArrowRight" ? 1 : -1) +
                              TABS.length) %
                            TABS.length;
                    changeTab(TABS[next].id);
                    document.getElementById(`tab-${TABS[next].id}`)?.focus();
                  }
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            id={`panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            tabIndex={0}
          >
            {tab === "overview" && (
              <>
                <div className="case-overview">
                  <section className="case-panel">
                    <h2>Case summary</h2>
                    <p className="case-prose" style={{ marginTop: 16 }}>
                      {data.case.description ||
                        "Add a brief description to help you and your collaborators understand what this case is about."}
                    </p>
                    <div className="case-stats">
                      <div>
                        <strong>
                          {
                            latest.filter((item) => item.kind === "document")
                              .length
                          }
                        </strong>
                        <span>Documents</span>
                      </div>
                      <div>
                        <strong>{tasks.length}</strong>
                        <span>Open tasks</span>
                      </div>
                      <div>
                        <strong>{reviewNeeded.length}</strong>
                        <span>Drafts need review</span>
                      </div>
                    </div>
                    <dl className="case-form" style={{ gap: 10 }}>
                      <div>
                        <dt className="case-muted">Case ID</dt>
                        <dd style={{ fontSize: 12, overflowWrap: "anywhere" }}>
                          {data.case.id}
                        </dd>
                      </div>
                      <div>
                        <dt className="case-muted">Created</dt>
                        <dd style={{ fontSize: 14 }}>
                          {caseDate(data.case.created_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="case-muted">Owner account</dt>
                        <dd style={{ fontSize: 12, overflowWrap: "anywhere" }}>
                          {data.case.owner_id === session.user.id
                            ? session.user.email
                            : data.case.owner_id}
                        </dd>
                      </div>
                    </dl>
                  </section>
                  <section className="case-panel">
                    <div className="case-panel-heading">
                      <h2>Next steps</h2>
                      <CheckSquare size={20} />
                    </div>
                    {tasks.length ? (
                      tasks.slice(0, 4).map((task) => (
                        <div className="case-item" key={task.id}>
                          <h3>{task.title}</h3>
                          <p className="case-meta">
                            {task.metadata.due_date
                              ? `Target ${caseDate(`${task.metadata.due_date}T00:00:00`)}${task.metadata.confirmation === "confirmed" ? "" : " · Needs review"}`
                              : "No target date"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="case-muted">
                        Add your next task or review dates suggested from your
                        document text.
                      </p>
                    )}
                    <button
                      className="case-text-button"
                      style={{ marginTop: 18 }}
                      onClick={() => changeTab("timeline")}
                    >
                      Open timeline & tasks
                    </button>
                    {reviewNeeded.length > 0 && (
                      <div className="case-inline-form">
                        <p className="case-muted">
                          {reviewNeeded.length} draft version
                          {reviewNeeded.length === 1 ? " is" : "s are"} awaiting
                          review.
                        </p>
                        <button
                          className="case-text-button"
                          style={{ marginTop: 8 }}
                          onClick={() => changeTab("work")}
                        >
                          Review saved work
                        </button>
                      </div>
                    )}
                  </section>
                </div>
                <div style={{ marginTop: 22 }}>
                  <ExportPanel data={data} busy={busy} run={run} />
                </div>
                <section className="case-panel">
                  <div className="case-panel-heading">
                    <div>
                      <h2>Continue with a legal tool</h2>
                      <p className="case-muted">
                        Use the existing tools, then save a real result back to
                        this case.
                      </p>
                    </div>
                  </div>
                  <div className="case-actions">
                    <Link className="case-small-button" href="/citizen">
                      Notice analysis <ArrowUpRight size={14} />
                    </Link>
                    <Link className="case-small-button" href="/advocate">
                      Drafting tools <ArrowUpRight size={14} />
                    </Link>
                    <Link className="case-small-button" href="/citizen/lawyers">
                      Find a lawyer <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </section>
              </>
            )}
            {tab === "documents" && (
              <DocumentsPane {...pane} focusedId={source} />
            )}
            {tab === "timeline" && <TimelinePane {...pane} />}
            {tab === "work" && <SavedWorkPane {...pane} />}
            {tab === "sharing" && <SharingPane {...pane} />}
            {tab === "history" && (
              <section className="case-panel">
                <div className="case-panel-heading">
                  <div>
                    <h2>Activity history</h2>
                    <p className="case-muted">
                      Server-recorded activity for this case. Ordinary users
                      cannot edit these entries.
                    </p>
                  </div>
                  <History size={21} />
                </div>
                {!data.activity.length ? (
                  <div className="case-empty">
                    <FileText />
                    <h3>No visible activity yet</h3>
                    <p className="case-muted">
                      Activity appears here as this case is updated.
                    </p>
                  </div>
                ) : (
                  <div className="case-history">
                    {data.activity.map((event) => (
                      <article className="case-item" key={event.id}>
                        <h3>{event.action.replace(/[_.]/g, " ")}</h3>
                        <p className="case-meta">
                          {new Date(event.created_at).toLocaleString("en-IN")} ·{" "}
                          {event.actor_id === session.user?.id
                            ? "You"
                            : event.actor_id}
                        </p>
                        <p
                          className="case-meta"
                          style={{ overflowWrap: "anywhere" }}
                        >
                          {event.object_type} {event.object_id}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}

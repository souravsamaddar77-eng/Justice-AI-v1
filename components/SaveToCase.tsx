"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, FolderPlus, Loader2, X } from "lucide-react";
import { caseError, caseRequest, type CaseSession } from "@/lib/case-client";
import type { CaseRecord } from "@/types/cases";
import "./cases/workspace.css";
import BackendSetup from "./cases/BackendSetup";

export interface SaveToCaseProps {
  kind: "chat" | "analysis" | "draft" | "note";
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  disabled?: boolean;
}

export default function SaveToCase({
  kind,
  title,
  content,
  metadata,
  disabled,
}: SaveToCaseProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<CaseSession | null>(null);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [caseId, setCaseId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const saving = useRef(false);
  const resultVersion = useRef(0);
  useEffect(() => {
    resultVersion.current += 1;
    setSaved("");
    setOpen(false);
    setError("");
  }, [content, title, kind]);
  async function show() {
    setOpen(true);
    setBusy(true);
    setError("");
    try {
      const next = await caseRequest<CaseSession>("/api/auth/session");
      setSession(next);
      if (next.configured && next.user) {
        const data = await caseRequest<{ cases: typeof cases }>("/api/cases");
        const active = data.cases.filter(
          (item) =>
            item.status !== "archived" &&
            (item.owner_id === next.user?.id ||
              item.permission === "owner" ||
              item.permission === "edit" ||
              (kind === "note" && item.permission === "comment")),
        );
        setCases(active);
        setCaseId(active[0]?.id || "new");
      }
    } catch (error) {
      setError(caseError(error));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (busy || saving.current || saved || !content.trim()) return;
    saving.current = true;
    const version = resultVersion.current;
    setBusy(true);
    setError("");
    try {
      let target = caseId;
      if (caseId === "new") {
        const data = await caseRequest<{ case: CaseRecord }>("/api/cases", {
          method: "POST",
          body: JSON.stringify({
            title: newTitle.trim(),
            description: "",
            category: "General",
            status: "open",
          }),
        });
        target = data.case.id;
        setCaseId(target);
        setCases((current) => [data.case, ...current]);
      }
      await caseRequest(`/api/cases/${target}/items`, {
        method: "POST",
        body: JSON.stringify({
          kind,
          title,
          content,
          metadata,
          ...(kind === "draft" ? { review_status: "ai_draft" } : {}),
        }),
      });
      if (version === resultVersion.current) setSaved(target);
    } catch (error) {
      if (version === resultVersion.current) setError(caseError(error));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="save-case">
      <button
        type="button"
        className="btn-secondary"
        onClick={() => (open ? setOpen(false) : show())}
        disabled={disabled || !content.trim()}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
      >
        <FolderPlus size={16} /> Save to case
      </button>
      {open && (
        <div id={`${id}-panel`} className="save-case-panel">
          <div className="case-panel-heading">
            <h3 style={{ fontWeight: 650 }}>
              Keep this {kind === "analysis" ? "analysis" : kind} with your case
            </h3>
            <button
              aria-label="Close save to case"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          {error && (
            <p role="alert" className="case-error">
              {error}
            </p>
          )}
          {saved ? (
            <p role="status" className="case-success">
              <Check size={16} style={{ display: "inline", marginRight: 7 }} />
              Saved.{" "}
              <Link className="case-text-button" href={`/cases/${saved}`}>
                Open case
              </Link>
            </p>
          ) : (
            <>
              {busy && !session && (
                <p role="status" className="case-muted">
                  Loading your workspace…
                </p>
              )}
              {session && !session.configured && (
                <div className="case-notice">
                  <BackendSetup details={session.setupMessage} />
                </div>
              )}
              {session?.configured && !session.user && (
                <p className="case-muted">
                  <Link
                    href="/sign-in"
                    target="_blank"
                    className="case-text-button"
                  >
                    Sign in in a new tab
                  </Link>{" "}
                  to save privately. Your result stays on this page.{" "}
                  <button
                    type="button"
                    onClick={show}
                    className="case-text-button"
                    style={{ marginTop: 10 }}
                  >
                    I have signed in; refresh cases
                  </button>
                </p>
              )}
              {session?.configured && session.user && (
                <>
                  <label htmlFor={`${id}-case`}>Choose a case</label>
                  <select
                    id={`${id}-case`}
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    disabled={busy}
                  >
                    {cases.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.title}
                      </option>
                    ))}
                    <option value="new">Create a new case…</option>
                  </select>
                  {caseId === "new" && (
                    <>
                      <label htmlFor={`${id}-title`}>New case title</label>
                      <input
                        id={`${id}-title`}
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        maxLength={160}
                        placeholder="For example, tenancy notice"
                      />
                    </>
                  )}
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ marginTop: 15 }}
                    onClick={save}
                    disabled={
                      busy || !caseId || (caseId === "new" && !newTitle.trim())
                    }
                  >
                    {busy ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <FolderPlus size={16} />
                    )}{" "}
                    {busy ? "Saving…" : "Save to case"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

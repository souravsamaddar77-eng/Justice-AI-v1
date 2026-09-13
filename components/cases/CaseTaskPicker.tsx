"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderLock } from "lucide-react";
import type {
  CaseDetail,
  CaseItem,
  CaseRecord,
  CaseSession,
} from "@/types/cases";
import { caseDate, caseError, caseRequest } from "@/lib/case-client";
import { editable } from "./shared";
import "./workspace.css";

export default function CaseTaskPicker() {
  const [session, setSession] = useState<CaseSession | null>(null);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selected, setSelected] = useState("");
  const [data, setData] = useState<CaseDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const current = await caseRequest<CaseSession>("/api/auth/session");
        setSession(current);
        if (current.user && current.configured) {
          const result = await caseRequest<{ cases: CaseRecord[] }>(
            "/api/cases",
          );
          setCases(result.cases.filter((item) => item.status !== "archived"));
        }
      } catch (error) {
        setError(caseError(error));
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  async function choose(id: string) {
    setSelected(id);
    setData(null);
    setError("");
    if (!id) return;
    setBusy(true);
    try {
      setData(await caseRequest<CaseDetail>(`/api/cases/${id}`));
    } catch (error) {
      setError(caseError(error));
    } finally {
      setBusy(false);
    }
  }
  async function toggle(item: CaseItem, completed: boolean) {
    if (!data || busy) return;
    setBusy(true);
    setError("");
    try {
      await caseRequest(`/api/cases/${data.case.id}/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "update",
          metadata: { ...item.metadata, completed },
        }),
      });
      setData(await caseRequest<CaseDetail>(`/api/cases/${data.case.id}`));
    } catch (error) {
      setError(caseError(error));
    } finally {
      setBusy(false);
    }
  }
  const tasks =
    data?.items.filter((item) => item.kind === "task" && !item.deleted_at) ||
    [];
  return (
    <section
      className="case-space"
      style={{ padding: 0, marginBottom: 28 }}
      aria-label="Saved case action tracker"
    >
      <div className="case-panel">
        <div className="case-panel-heading">
          <div>
            <h2>Tasks from your saved cases</h2>
            <p className="case-muted">
              Select a case to see and complete its next steps.
            </p>
          </div>
          <FolderLock size={20} />
        </div>
        {error && (
          <p className="case-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p className="case-muted" role="status">
            Loading case access…
          </p>
        ) : !session?.configured ? (
          <p className="case-muted">
            Private case saving needs backend setup. The standalone action
            tracker remains available below.{" "}
            <Link href="/cases" className="case-text-button">
              Case workspace details
            </Link>
          </p>
        ) : !session.user ? (
          <p className="case-muted">
            <Link
              href="/sign-in?redirect_url=/citizen/action-tracker"
              className="case-text-button"
            >
              Sign in
            </Link>{" "}
            to view persisted tasks from your cases.
          </p>
        ) : !cases.length ? (
          <p className="case-muted">
            You have no active saved cases.{" "}
            <Link href="/cases" className="case-text-button">
              Create a case
            </Link>{" "}
            to track real tasks here.
          </p>
        ) : (
          <>
            <div className="case-field">
              <label htmlFor="tracker-case">Saved case</label>
              <select
                id="tracker-case"
                value={selected}
                onChange={(e) => choose(e.target.value)}
                disabled={busy}
              >
                <option value="">Choose a case…</option>
                {cases.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
            {busy && (
              <p className="case-muted" role="status" style={{ marginTop: 12 }}>
                Updating case tasks…
              </p>
            )}
            {data && (
              <div style={{ marginTop: 20 }}>
                {tasks.length ? (
                  tasks.map((task) => (
                    <div className="case-item" key={task.id}>
                      <label className="case-check">
                        <input
                          type="checkbox"
                          checked={!!task.metadata.completed}
                          disabled={busy || !editable(data, task)}
                          onChange={(e) => toggle(task, e.target.checked)}
                        />
                        <span>
                          <span
                            style={{
                              textDecoration: task.metadata.completed
                                ? "line-through"
                                : undefined,
                            }}
                          >
                            {task.title}
                          </span>
                          <span className="case-meta">
                            {task.metadata.due_date
                              ? `Target ${caseDate(`${task.metadata.due_date}T00:00:00`)} · ${task.metadata.confirmation === "confirmed" ? "Confirmed" : "Date needs review"}`
                              : "No target date"}
                          </span>
                        </span>
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="case-muted">
                    No tasks have been added to this case yet.
                  </p>
                )}
                <Link
                  href={`/cases/${data.case.id}?tab=timeline`}
                  className="case-text-button"
                  style={{ display: "inline-block", marginTop: 16 }}
                >
                  Open this case&apos;s timeline & tasks
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

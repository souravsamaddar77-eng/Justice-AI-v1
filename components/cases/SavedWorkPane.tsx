"use client";

import { useState, type FormEvent } from "react";
import {
  BookOpen,
  Download,
  FilePenLine,
  MessageSquarePlus,
  Pencil,
  Send,
} from "lucide-react";
import { caseDate, caseRequest } from "@/lib/case-client";
import type { CaseItem, ReviewStatus } from "@/types/cases";
import {
  type CasePaneProps,
  REVIEW_LABELS,
  SourceReference,
  commentable,
  currentItems,
  editable,
} from "./shared";

export default function SavedWorkPane({
  data,
  busy,
  run,
  onSource,
}: CasePaneProps) {
  const items = data.items.filter(
    (item) =>
      ["chat", "analysis", "draft", "note"].includes(item.kind) &&
      !item.deleted_at,
  );
  const [filter, setFilter] = useState("all");
  const [opened, setOpened] = useState<string | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<
    Record<string, string>
  >({});
  const [editing, setEditing] = useState<CaseItem | null>(null);
  const [newKind, setNewKind] = useState<"draft" | "note" | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [review, setReview] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<ReviewStatus>("needs_review");
  const [comment, setComment] = useState("");
  const latest = currentItems(items).filter(
    (item) => filter === "all" || item.kind === filter,
  );
  function start(kind: "draft" | "note", item?: CaseItem) {
    setEditing(item || null);
    setNewKind(kind);
    setTitle(item?.title || "");
    setContent(item?.content || "");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (
      await run(
        () =>
          caseRequest(
            `/api/cases/${data.case.id}/items${editing ? `/${editing.id}` : ""}`,
            {
              method: editing ? "PATCH" : "POST",
              body: JSON.stringify({
                ...(editing
                  ? { action: "update", metadata: editing.metadata }
                  : { kind: newKind }),
                title,
                content,
              }),
            },
          ),
        editing
          ? "New version saved. It needs a fresh review."
          : "Saved to this case.",
      )
    ) {
      setNewKind(null);
      setEditing(null);
    }
  }
  async function saveReview(event: FormEvent, item: CaseItem) {
    event.preventDefault();
    if (
      await run(
        () =>
          caseRequest(`/api/cases/${data.case.id}/items/${item.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              action: "review",
              review_status: reviewState,
              comment,
            }),
          }),
        `Version ${item.version}: ${REVIEW_LABELS[reviewState].toLowerCase()}.`,
      )
    )
      setReview(null);
  }
  async function download(item: CaseItem) {
    await run(async () => {
      const response = await fetch(
        `/api/cases/${data.case.id}/items/${item.id}/download`,
        { credentials: "same-origin" },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error || "The text download could not be completed.",
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${item.kind}-v${item.version}-${item.review_status}.txt`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  return (
    <section className="case-panel">
      <div className="case-panel-heading">
        <div>
          <h2>Saved work & review</h2>
          <p className="case-muted">
            Conversations, notice analyses, drafts and notes, with each version
            kept separately.
          </p>
        </div>
        <div className="case-actions">
          {commentable(data) && (
            <button className="case-small-button" onClick={() => start("note")}>
              <MessageSquarePlus size={15} />
              Add note
            </button>
          )}
          {editable(data) && (
            <button
              className="case-small-button"
              onClick={() => start("draft")}
            >
              <FilePenLine size={15} />
              Add draft
            </button>
          )}
        </div>
      </div>
      {newKind && (
        <form onSubmit={save} className="case-inline-form case-form">
          <h3>
            {editing
              ? `Edit ${editing.kind}; save a new version`
              : newKind === "draft"
                ? "Add a draft for review"
                : "Add a case note"}
          </h3>
          <div className="case-field">
            <label htmlFor="work-title">Title</label>
            <input
              autoFocus
              id="work-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="case-field">
            <label htmlFor="work-content">
              {newKind === "draft" ? "Draft text" : "Note"}
            </label>
            <textarea
              id="work-content"
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              maxLength={500000}
            />
          </div>
          {editing?.review_status === "reviewed" && (
            <p className="case-notice">
              Version {editing.version} keeps its review. The edited version
              will need a new review.
            </p>
          )}
          <div className="case-actions">
            <button
              className="btn-primary"
              disabled={busy || !title.trim() || !content.trim()}
            >
              {busy ? "Saving…" : editing ? "Save new version" : "Save to case"}
            </button>
            <button
              type="button"
              className="case-text-button"
              onClick={() => {
                setNewKind(null);
                setEditing(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="case-toolbar">
        <select
          aria-label="Filter saved work"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: "auto" }}
        >
          <option value="all">All saved work</option>
          <option value="draft">Drafts</option>
          <option value="analysis">Notice analyses</option>
          <option value="chat">Conversations</option>
          <option value="note">Notes</option>
        </select>
        <span className="case-muted">
          Save results here from the existing legal tools.
        </span>
      </div>
      {!latest.length ? (
        <div className="case-empty">
          <BookOpen />
          <h3>No saved {filter === "all" ? "work" : `${filter}s`} yet</h3>
          <p className="case-muted">
            Use “Save to case” after a real analysis, conversation or draft, or
            add your own text here.
          </p>
        </div>
      ) : (
        <div className="case-list">
          {latest.map((current) => {
            const versions = items
              .filter((item) => item.resource_id === current.resource_id)
              .sort((a, b) => b.version - a.version);
            const selected =
              versions.find(
                (item) => item.id === selectedVersions[current.resource_id],
              ) || current;
            const isOpen = opened === current.resource_id;
            return (
              <article className="case-item" key={current.resource_id}>
                <div className="case-item-heading">
                  <div>
                    <div className="case-actions">
                      <span className="case-badge">
                        {current.kind === "chat"
                          ? "Conversation"
                          : current.kind === "analysis"
                            ? "Notice analysis"
                            : current.kind === "draft"
                              ? "Draft"
                              : "Note"}
                      </span>
                      <span
                        className={`case-badge ${selected.review_status === "reviewed" ? "case-badge-green" : "case-badge-gold"}`}
                      >
                        {REVIEW_LABELS[selected.review_status]}
                      </span>
                    </div>
                    <h3 style={{ marginTop: 9 }}>{current.title}</h3>
                    <div className="case-meta">
                      <span>Version {selected.version}</span>
                      <span>Saved {caseDate(selected.created_at)}</span>
                    </div>
                  </div>
                  <button
                    className="case-small-button"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpened(isOpen ? null : current.resource_id)
                    }
                  >
                    {isOpen ? "Close" : "Read & review"}
                  </button>
                </div>
                {isOpen && (
                  <div style={{ marginTop: 20 }}>
                    <div className="case-actions" style={{ marginBottom: 18 }}>
                      <label htmlFor={`work-version-${current.id}`}>
                        Version
                      </label>
                      <select
                        id={`work-version-${current.id}`}
                        value={selected.id}
                        onChange={(e) => {
                          setSelectedVersions((values) => ({
                            ...values,
                            [current.resource_id]: e.target.value,
                          }));
                          setReview(null);
                        }}
                        style={{ width: "auto" }}
                      >
                        {versions.map((item) => (
                          <option value={item.id} key={item.id}>
                            v{item.version} ·{" "}
                            {REVIEW_LABELS[item.review_status]}
                          </option>
                        ))}
                      </select>
                      <button
                        className="case-small-button"
                        disabled={busy}
                        onClick={() => download(selected)}
                      >
                        <Download size={14} />
                        Download text
                      </button>
                      {editable(data, selected) && (
                        <button
                          className="case-small-button"
                          onClick={() =>
                            start(
                              selected.kind === "note" ? "note" : "draft",
                              selected,
                            )
                          }
                        >
                          <Pencil size={14} />
                          Edit as new version
                        </button>
                      )}
                    </div>
                    {selected.review_status !== "reviewed" && (
                      <p className="case-notice">
                        This version has not completed review. Its export is
                        labeled{" "}
                        {REVIEW_LABELS[selected.review_status].toLowerCase()}.
                      </p>
                    )}
                    <div
                      className="case-prose"
                      style={{
                        maxHeight: 560,
                        overflowY: "auto",
                        paddingRight: 12,
                      }}
                    >
                      {selected.content}
                    </div>
                    {selected.metadata.source_item_id && (
                      <SourceReference
                        item={selected}
                        data={data}
                        onSource={onSource}
                      />
                    )}
                    {selected.reviewed_at && (
                      <div className="case-review">
                        <strong>
                          {REVIEW_LABELS[selected.review_status]} · Version{" "}
                          {selected.version}
                        </strong>
                        <p className="case-meta">
                          By {selected.reviewer_id} on{" "}
                          {caseDate(selected.reviewed_at)}
                        </p>
                        {selected.metadata.review_comment && (
                          <p className="case-prose" style={{ marginTop: 8 }}>
                            {selected.metadata.review_comment}
                          </p>
                        )}
                      </div>
                    )}
                    {(data.reviews || []).some(
                      (entry) => entry.item_id === selected.id,
                    ) && (
                      <details style={{ marginTop: 16 }}>
                        <summary
                          className="case-text-button"
                          style={{ cursor: "pointer" }}
                        >
                          Review history for version {selected.version}
                        </summary>
                        <div className="case-list" style={{ marginTop: 14 }}>
                          {data.reviews
                            .filter((entry) => entry.item_id === selected.id)
                            .map((entry) => (
                              <div className="case-item" key={entry.id}>
                                <strong style={{ fontSize: 13 }}>
                                  {REVIEW_LABELS[entry.review_status]}
                                </strong>
                                <p className="case-meta">
                                  {entry.reviewer_id} ·{" "}
                                  {new Date(entry.created_at).toLocaleString(
                                    "en-IN",
                                  )}
                                </p>
                                {entry.comment && (
                                  <p
                                    className="case-prose"
                                    style={{ marginTop: 8 }}
                                  >
                                    {entry.comment}
                                  </p>
                                )}
                              </div>
                            ))}
                        </div>
                      </details>
                    )}
                    {commentable(data, selected) && (
                      <div className="case-actions" style={{ marginTop: 18 }}>
                        <button
                          className="case-small-button"
                          onClick={() => {
                            setReview(
                              review === selected.id ? null : selected.id,
                            );
                            setReviewState("needs_review");
                            setComment("");
                          }}
                        >
                          <Send size={14} />
                          Record review / return work
                        </button>
                      </div>
                    )}
                    {review === selected.id && (
                      <form
                        onSubmit={(e) => saveReview(e, selected)}
                        className="case-inline-form case-form"
                      >
                        <h3>Review version {selected.version}</h3>
                        <div className="case-field">
                          <label htmlFor={`review-state-${selected.id}`}>
                            Review decision
                          </label>
                          <select
                            id={`review-state-${selected.id}`}
                            value={reviewState}
                            onChange={(e) =>
                              setReviewState(e.target.value as ReviewStatus)
                            }
                          >
                            <option value="needs_review">
                              Needs review / return for review
                            </option>
                            <option value="changes_requested">
                              Changes requested
                            </option>
                            {editable(data, selected) && (
                              <option value="reviewed">Reviewed</option>
                            )}
                          </select>
                        </div>
                        <div className="case-field">
                          <label htmlFor={`review-comment-${selected.id}`}>
                            Review comments
                          </label>
                          <textarea
                            id={`review-comment-${selected.id}`}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            maxLength={10000}
                            placeholder="Describe what you checked or what needs to change."
                          />
                        </div>
                        <p className="case-muted">
                          This records your account, the time and this exact
                          version. A recorded review is not a certification of
                          legal validity.
                        </p>
                        <div className="case-actions">
                          <button className="btn-primary" disabled={busy}>
                            {busy ? "Recording…" : "Record review"}
                          </button>
                          <button
                            type="button"
                            className="case-text-button"
                            onClick={() => setReview(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import {
  CalendarDays,
  Check,
  CheckSquare,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { caseDate, caseRequest } from "@/lib/case-client";
import type { CaseItem, CaseItemMetadata } from "@/types/cases";
import { type CasePaneProps, SourceReference, editable } from "./shared";

export default function TimelinePane({
  data,
  busy,
  run,
  onSource,
}: CasePaneProps) {
  const [formKind, setFormKind] = useState<"timeline" | "task" | null>(null);
  const [editing, setEditing] = useState<CaseItem | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [dateType, setDateType] = useState<"explicit" | "inferred" | "unknown">(
    "unknown",
  );
  const [parties, setParties] = useState("");
  const [assumptions, setAssumptions] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const documents = data.items.filter(
    (item) => item.kind === "document" && !item.deleted_at,
  );
  const events = data.items
    .filter((item) => item.kind === "timeline" && !item.deleted_at)
    .sort((a, b) =>
      (a.metadata.date || "9999").localeCompare(b.metadata.date || "9999"),
    );
  const tasks = data.items
    .filter((item) => item.kind === "task" && !item.deleted_at)
    .sort(
      (a, b) => Number(!!a.metadata.completed) - Number(!!b.metadata.completed),
    );
  function start(kind: "timeline" | "task", item?: CaseItem) {
    setFormKind(kind);
    setEditing(item || null);
    setTitle(item?.title || "");
    setContent(item?.content || "");
    setDate(
      (kind === "timeline" ? item?.metadata.date : item?.metadata.due_date) ||
        "",
    );
    setSourceId(item?.metadata.source_item_id || "");
    setExcerpt(item?.metadata.source_excerpt || "");
    setDateType(item?.metadata.date_type || "unknown");
    setParties(item?.metadata.parties?.join(", ") || "");
    setAssumptions(item?.metadata.assumptions || "");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    const metadata: CaseItemMetadata = {
      ...editing?.metadata,
      source_item_id: sourceId || undefined,
      source_excerpt: excerpt || undefined,
      confirmation: "pending_review",
      assumptions: assumptions || undefined,
      ...(formKind === "timeline"
        ? {
            date: date || null,
            date_type: date ? dateType : "unknown",
            parties: parties
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          }
        : {
            due_date: date || null,
            completed: editing?.metadata.completed || false,
          }),
    };
    const url = `/api/cases/${data.case.id}/items${editing ? `/${editing.id}` : ""}`;
    if (
      await run(
        () =>
          caseRequest(url, {
            method: editing ? "PATCH" : "POST",
            body: JSON.stringify({
              ...(editing ? { action: "update" } : { kind: formKind }),
              title,
              content,
              metadata,
            }),
          }),
        editing
          ? "Changes saved. Review the corrected date before confirming."
          : "Added to this case.",
      )
    )
      setFormKind(null);
  }
  function update(item: CaseItem, metadata: CaseItemMetadata, success: string) {
    return run(
      () =>
        caseRequest(`/api/cases/${data.case.id}/items/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            action: "update",
            metadata: { ...item.metadata, ...metadata },
          }),
        }),
      success,
    );
  }
  const form = (
    <form className="case-inline-form case-form" onSubmit={save}>
      <h3>
        {editing ? "Correct" : "Add"}{" "}
        {formKind === "timeline" ? "timeline event" : "task"}
      </h3>
      <div className="case-fields">
        <div className="case-field case-field-wide">
          <label htmlFor="event-title">
            {formKind === "timeline"
              ? "What happened?"
              : "What needs to be done?"}
          </label>
          <input
            autoFocus
            id="event-title"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="case-field">
          <label htmlFor="event-date">
            {formKind === "timeline"
              ? "Event date (optional)"
              : "Target date (optional)"}
          </label>
          <input
            id="event-date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (e.target.value && dateType === "unknown")
                setDateType("inferred");
            }}
          />
        </div>
        {formKind === "timeline" && (
          <div className="case-field">
            <label htmlFor="event-date-type">How is the date supported?</label>
            <select
              id="event-date-type"
              value={dateType}
              onChange={(e) => setDateType(e.target.value as typeof dateType)}
            >
              <option value="unknown">Unknown / not established</option>
              <option value="explicit">Explicit in source</option>
              <option value="inferred">Inferred; needs confirmation</option>
            </select>
          </div>
        )}
        <div className="case-field case-field-wide">
          <label htmlFor="event-content">Details</label>
          <textarea
            id="event-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={30000}
          />
        </div>
        <div className="case-field">
          <label htmlFor="event-source">
            {formKind === "timeline"
              ? "Source document version"
              : "Source document version (optional)"}
          </label>
          <select
            id="event-source"
            required={formKind === "timeline"}
            value={sourceId}
            onChange={(e) => {
              setSourceId(e.target.value);
              setExcerpt("");
            }}
          >
            <option value="">
              {formKind === "timeline"
                ? "Choose a source document version"
                : "Manually added, no document source"}
            </option>
            {documents.map((item) => (
              <option value={item.id} key={item.id}>
                {item.title} · v{item.version}
              </option>
            ))}
          </select>
        </div>
        {formKind === "timeline" && (
          <div className="case-field">
            <label htmlFor="event-parties">Parties (comma separated)</label>
            <input
              id="event-parties"
              value={parties}
              onChange={(e) => setParties(e.target.value)}
            />
          </div>
        )}
        {sourceId && (
          <div className="case-field case-field-wide">
            <label htmlFor="event-excerpt">
              Supporting excerpt from the source
            </label>
            <textarea
              id="event-excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              required
            />
            <p className="case-muted">
              Use the source&apos;s exact words. Extract or enter the document
              text in the vault first.
            </p>
          </div>
        )}
        <div className="case-field case-field-wide">
          <label htmlFor="event-assumptions">
            Assumptions or date notes (optional)
          </label>
          <input
            id="event-assumptions"
            value={assumptions}
            onChange={(e) => setAssumptions(e.target.value)}
            placeholder="For example, the year is not stated in the document"
          />
        </div>
      </div>
      <p className="case-muted">
        Dates remain pending review until you confirm them. A target date is not
        a verified statutory deadline.
      </p>
      <div className="case-actions">
        <button
          className="btn-primary"
          disabled={
            busy ||
            !title.trim() ||
            (formKind === "timeline" && (!sourceId || !excerpt.trim()))
          }
        >
          {busy ? "Saving…" : "Save for review"}
        </button>
        <button
          type="button"
          className="case-text-button"
          onClick={() => setFormKind(null)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
  function removeControl(item: CaseItem) {
    return removeId === item.id ? (
      <div className="case-actions" style={{ marginTop: 10 }}>
        <span className="case-muted">
          Remove this {item.kind === "task" ? "task" : "event"}?
        </span>
        <button
          className="case-small-button case-danger"
          disabled={busy}
          onClick={async () => {
            if (
              await run(
                () =>
                  caseRequest(`/api/cases/${data.case.id}/items/${item.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ action: "delete" }),
                  }),
                "Item removed. The activity history is retained.",
              )
            )
              setRemoveId(null);
          }}
        >
          Remove
        </button>
        <button className="case-small-button" onClick={() => setRemoveId(null)}>
          Keep
        </button>
      </div>
    ) : null;
  }
  return (
    <>
      <section className="case-panel">
        <div className="case-panel-heading">
          <div>
            <h2>Timeline</h2>
            <p className="case-muted">
              Review dates against the original source before confirming. Find
              dates from uploaded text in the document vault.
            </p>
          </div>
          {editable(data) && (
            <button
              className="case-small-button"
              onClick={() => start("timeline")}
            >
              <Plus size={15} />
              Add event
            </button>
          )}
        </div>
        {formKind === "timeline" && form}
        {!events.length ? (
          <div className="case-empty">
            <CalendarDays />
            <h3>Build a chronology from your documents</h3>
            <p className="case-muted">
              Extract document text, then choose “Find timeline & tasks” in the
              vault. You can also add an event yourself.
            </p>
          </div>
        ) : (
          <div className="case-history">
            {events.map((item) => (
              <article className="case-item" key={item.id}>
                <div className="case-item-heading">
                  <div>
                    <div className="case-actions">
                      <span className="case-badge">
                        {item.metadata.date
                          ? caseDate(`${item.metadata.date}T00:00:00`)
                          : "Date unknown"}
                      </span>
                      <span
                        className={`case-badge ${item.metadata.confirmation === "confirmed" ? "case-badge-green" : "case-badge-gold"}`}
                      >
                        {item.metadata.confirmation === "confirmed"
                          ? "Confirmed"
                          : "Pending review"}
                      </span>
                      <span className="case-muted" style={{ fontSize: 12 }}>
                        {item.metadata.date_type || "unknown"} date
                      </span>
                    </div>
                    <h3 style={{ marginTop: 10 }}>{item.title}</h3>
                  </div>
                  {editable(data, item) && (
                    <div className="case-actions">
                      <button
                        className="case-small-button"
                        aria-label={`Correct ${item.title}`}
                        onClick={() => start("timeline", item)}
                      >
                        <Pencil size={14} />
                        Correct
                      </button>
                      <button
                        className="case-small-button case-danger"
                        aria-label={`Remove ${item.title}`}
                        onClick={() => setRemoveId(item.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                {item.content && (
                  <p className="case-prose" style={{ marginTop: 9 }}>
                    {item.content}
                  </p>
                )}
                <SourceReference item={item} data={data} onSource={onSource} />
                {item.metadata.parties?.length ? (
                  <p className="case-muted">
                    Parties: {item.metadata.parties.join(", ")}
                  </p>
                ) : null}
                {item.metadata.assumptions && (
                  <p className="case-muted">
                    Assumptions: {item.metadata.assumptions}
                  </p>
                )}
                {editable(data, item) &&
                  item.metadata.confirmation !== "confirmed" && (
                    <button
                      className="case-small-button"
                      disabled={busy}
                      onClick={() =>
                        update(
                          item,
                          { confirmation: "confirmed" },
                          "Timeline event confirmed.",
                        )
                      }
                    >
                      <Check size={14} />
                      Confirm event
                    </button>
                  )}
                {removeControl(item)}
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="case-panel">
        <div className="case-panel-heading">
          <div>
            <h2>Case action tracker</h2>
            <p className="case-muted">
              {tasks.filter((item) => !item.metadata.completed).length}{" "}
              outstanding task
              {tasks.filter((item) => !item.metadata.completed).length === 1
                ? ""
                : "s"}
              . Completion and reviewed dates are saved to this case.
            </p>
          </div>
          {editable(data) && (
            <button className="case-small-button" onClick={() => start("task")}>
              <Plus size={15} />
              Add task
            </button>
          )}
        </div>
        {formKind === "task" && form}
        {!tasks.length ? (
          <div className="case-empty">
            <CheckSquare />
            <h3>Make the next step clear</h3>
            <p className="case-muted">
              Add a task for this case, such as gathering correspondence or
              arranging a consultation.
            </p>
          </div>
        ) : (
          <div className="case-list">
            {tasks.map((item) => (
              <article key={item.id} className="case-item">
                <div className="case-item-heading">
                  <label className="case-check">
                    <input
                      type="checkbox"
                      aria-label={`Mark ${item.title} ${item.metadata.completed ? "incomplete" : "complete"}`}
                      checked={!!item.metadata.completed}
                      disabled={busy || !editable(data, item)}
                      onChange={(e) =>
                        update(
                          item,
                          { completed: e.target.checked },
                          e.target.checked
                            ? "Task completed."
                            : "Task reopened.",
                        )
                      }
                    />
                    <span
                      style={{
                        textDecoration: item.metadata.completed
                          ? "line-through"
                          : undefined,
                      }}
                    >
                      {item.title}
                    </span>
                  </label>
                  {editable(data, item) && (
                    <div className="case-actions">
                      <button
                        className="case-small-button"
                        aria-label={`Edit ${item.title}`}
                        onClick={() => start("task", item)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="case-small-button case-danger"
                        aria-label={`Remove ${item.title}`}
                        onClick={() => setRemoveId(item.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                {item.content && (
                  <p className="case-prose" style={{ marginTop: 10 }}>
                    {item.content}
                  </p>
                )}
                <div className="case-actions" style={{ marginTop: 12 }}>
                  <span className="case-badge">
                    {item.metadata.due_date
                      ? `Target: ${caseDate(`${item.metadata.due_date}T00:00:00`)}`
                      : "No target date"}
                  </span>
                  {item.metadata.due_date && (
                    <span
                      className={`case-badge ${item.metadata.confirmation === "confirmed" ? "case-badge-green" : "case-badge-gold"}`}
                    >
                      {item.metadata.confirmation === "confirmed"
                        ? "Date confirmed"
                        : "Date needs review"}
                    </span>
                  )}
                </div>
                {item.metadata.source_item_id && (
                  <SourceReference
                    item={item}
                    data={data}
                    onSource={onSource}
                  />
                )}{" "}
                {item.metadata.assumptions && (
                  <p className="case-muted" style={{ marginTop: 10 }}>
                    Assumptions: {item.metadata.assumptions}
                  </p>
                )}
                {editable(data, item) &&
                  item.metadata.due_date &&
                  item.metadata.confirmation !== "confirmed" && (
                    <button
                      className="case-small-button"
                      style={{ marginTop: 12 }}
                      disabled={busy}
                      onClick={() =>
                        update(
                          item,
                          { confirmation: "confirmed" },
                          "Task target date confirmed.",
                        )
                      }
                    >
                      <Check size={14} />
                      Confirm target date
                    </button>
                  )}
                {removeControl(item)}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

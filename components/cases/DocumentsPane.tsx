"use client";

import { useState, type FormEvent } from "react";
import {
  Download,
  FilePlus2,
  FileSearch,
  FileText,
  GitCompareArrows,
  ScanText,
  Upload,
} from "lucide-react";
import { caseDate, caseRequest } from "@/lib/case-client";
import type { CaseItem } from "@/types/cases";
import { type CasePaneProps, currentItems, editable } from "./shared";

export default function DocumentsPane({
  data,
  busy,
  run,
  onSource,
  focusedId,
}: CasePaneProps & { focusedId?: string }) {
  const documents = data.items.filter(
    (item) => item.kind === "document" && !item.deleted_at,
  );
  const latest = currentItems(documents);
  const [file, setFile] = useState<File | null>(null);
  const [resource, setResource] = useState("");
  const [uploadKey, setUploadKey] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(focusedId || null);
  const [compare, setCompare] = useState<string | null>(null);
  const [comparison, setComparison] = useState<{
    id: string;
    matches: boolean;
  } | null>(null);
  const [compareFile, setCompareFile] = useState<File | null>(null);
  const [manual, setManual] = useState<string | null>(null);
  const [manualText, setManualText] = useState("");
  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    const body = new FormData();
    body.set("file", file);
    if (resource) body.set("resourceId", resource);
    if (
      await run(
        () =>
          caseRequest(`/api/cases/${data.case.id}/documents`, {
            method: "POST",
            body,
          }),
        "Original file stored. Extraction is a separate step.",
      )
    ) {
      setFile(null);
      setResource("");
      setUploadKey((key) => key + 1);
    }
  }
  async function compareOriginal(item: CaseItem) {
    if (!compareFile) return;
    const body = new FormData();
    body.set("file", compareFile);
    await run(async () => {
      const result = await caseRequest<{
        matches: boolean;
        matchesOriginal?: boolean;
      }>(`/api/cases/${data.case.id}/documents/${item.id}`, {
        method: "POST",
        body,
      });
      setComparison({
        id: item.id,
        matches: result.matches ?? !!result.matchesOriginal,
      });
    });
  }
  return (
    <section className="case-panel">
      <div className="case-panel-heading">
        <div>
          <h2>Document vault</h2>
          <p className="case-muted">
            Original files stay separate from extracted text. Every version has
            its own fingerprint.
          </p>
        </div>
        <span className="case-badge">Private storage</span>
      </div>
      {editable(data) && (
        <form className="case-upload" onSubmit={upload}>
          <h3>
            <Upload size={17} style={{ display: "inline", marginRight: 8 }} />
            Add a document
          </h3>
          <p className="case-muted">
            PDF, PNG, JPEG or plain text, up to 3 MB per file. The server checks
            file contents, size and filename.
          </p>
          <div className="case-fields" style={{ marginTop: 14 }}>
            <div className="case-field">
              <label htmlFor="vault-file">Choose a file</label>
              <input
                key={uploadKey}
                id="vault-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                disabled={busy}
              />
            </div>
            <div className="case-field">
              <label htmlFor="vault-resource">Save as</label>
              <select
                id="vault-resource"
                value={resource}
                onChange={(e) => setResource(e.target.value)}
                disabled={busy}
              >
                <option value="">A new document</option>
                {latest
                  .filter((item) => editable(data, item))
                  .map((item) => (
                    <option key={item.resource_id} value={item.resource_id}>
                      New version of {item.title}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <button className="btn-primary" disabled={busy || !file}>
            <FilePlus2 size={16} />
            {busy ? "Please wait…" : "Upload original"}
          </button>
        </form>
      )}
      {!documents.length ? (
        <div className="case-empty">
          <FileText />
          <h3>No documents yet</h3>
          <p className="case-muted">
            Upload your notice, correspondence or supporting records. Original
            files are preserved for future reference.
          </p>
        </div>
      ) : (
        <div className="case-list">
          {latest.map((current) => {
            const versions = documents
              .filter((item) => item.resource_id === current.resource_id)
              .sort((a, b) => b.version - a.version);
            return (
              <article className="case-item" key={current.resource_id}>
                <div className="case-item-heading">
                  <div>
                    <h3>{current.title}</h3>
                    <div className="case-meta">
                      <span>
                        {versions.length} accessible version
                        {versions.length === 1 ? "" : "s"}
                      </span>
                      <span>{caseDate(current.created_at)}</span>
                    </div>
                  </div>
                  <button
                    className="case-small-button"
                    onClick={() =>
                      setExpanded(expanded === current.id ? null : current.id)
                    }
                    aria-expanded={versions.some(
                      (item) => item.id === expanded,
                    )}
                  >
                    <FileSearch size={15} />
                    View versions
                  </button>
                </div>
                {versions.some((item) => item.id === expanded) && (
                  <div style={{ marginTop: 20 }}>
                    {versions.map((item) => (
                      <div
                        className="case-inline-form"
                        key={item.id}
                        id={`document-${item.id}`}
                      >
                        <div className="case-item-heading">
                          <div>
                            <h3>
                              Version {item.version}{" "}
                              {item.id === current.id && (
                                <span className="case-badge">
                                  Latest available
                                </span>
                              )}
                            </h3>
                            <div className="case-meta">
                              <span>
                                {item.metadata.filename || item.title}
                              </span>
                              <span>
                                {item.metadata.size
                                  ? `${(item.metadata.size / 1024).toFixed(1)} KB`
                                  : ""}
                              </span>
                              <span>Uploaded {caseDate(item.created_at)}</span>
                            </div>
                            <p className="case-meta">
                              Uploader: {item.created_by}
                            </p>
                          </div>
                          <span
                            className={`case-badge ${["complete", "manual"].includes(item.metadata.extraction_status || "") ? "case-badge-green" : "case-badge-gold"}`}
                          >
                            {item.metadata.extraction_status === "manual"
                              ? "Manually entered text"
                              : `Text extraction: ${item.metadata.extraction_status || "pending"}`}
                          </span>
                        </div>
                        <p className="case-hash">
                          SHA-256:{" "}
                          {item.metadata.sha256 || "Fingerprint unavailable"}
                        </p>
                        <div className="case-actions">
                          <a
                            className="case-small-button"
                            href={`/api/cases/${data.case.id}/documents/${item.id}?disposition=inline`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileSearch size={14} />
                            Preview original
                          </a>
                          <a
                            className="case-small-button"
                            href={`/api/cases/${data.case.id}/documents/${item.id}?disposition=attachment`}
                          >
                            <Download size={14} />
                            Download
                          </a>
                          <button
                            className="case-small-button"
                            onClick={() => {
                              setCompare(compare === item.id ? null : item.id);
                              setComparison(null);
                              setCompareFile(null);
                            }}
                          >
                            <GitCompareArrows size={14} />
                            Compare file
                          </button>
                        </div>
                        {compare === item.id && (
                          <div
                            className="case-upload"
                            style={{ marginTop: 15, marginBottom: 0 }}
                          >
                            <label htmlFor={`compare-${item.id}`}>
                              Choose a file to compare with this version (up to 3 MB)
                            </label>
                            <input
                              id={`compare-${item.id}`}
                              type="file"
                              onChange={(e) => {
                                setCompareFile(e.target.files?.[0] || null);
                                setComparison(null);
                              }}
                            />
                            <button
                              className="case-small-button"
                              disabled={busy || !compareFile}
                              onClick={() => compareOriginal(item)}
                            >
                              Compare fingerprint
                            </button>
                            {comparison?.id === item.id && (
                              <p
                                role="status"
                                className={
                                  comparison.matches
                                    ? "case-success"
                                    : "case-notice"
                                }
                                style={{ marginTop: 12, marginBottom: 0 }}
                              >
                                {comparison.matches
                                  ? "Matches uploaded original."
                                  : "Does not match this uploaded original."}{" "}
                                A matching fingerprint only shows the file bytes
                                are identical.
                              </p>
                            )}
                          </div>
                        )}
                        {item.metadata.extraction_error && (
                          <p className="case-notice" style={{ marginTop: 14 }}>
                            {item.metadata.extraction_error} The original is
                            still saved. Retry extraction or enter the text
                            below.
                          </p>
                        )}
                        {editable(data, item) && (
                          <div style={{ marginTop: 18 }}>
                            <p className="case-muted">
                              Digital PDF and plain-text extraction runs on the server.
                              Scanned pages use OCR.space when you choose Extract text.
                            </p>
                            <div
                              className="case-actions"
                              style={{ marginTop: 12 }}
                            >
                              <button
                                className="case-small-button"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    () =>
                                      caseRequest(
                                        `/api/cases/${data.case.id}/documents/${item.id}`,
                                        {
                                          method: "POST",
                                          body: JSON.stringify({
                                            action: "extract",
                                          }),
                                        },
                                      ),
                                    "Text extraction completed.",
                                  )
                                }
                              >
                                <ScanText size={14} />
                                {item.metadata.extraction_status === "failed"
                                  ? "Retry extraction"
                                  : "Extract text"}
                              </button>
                              <button
                                className="case-small-button"
                                disabled={busy}
                                onClick={() => {
                                  setManual(
                                    manual === item.id ? null : item.id,
                                  );
                                  setManualText("");
                                }}
                              >
                                Enter text manually
                              </button>
                              {item.metadata.extracted_text && (
                                <button
                                  className="case-small-button"
                                  disabled={busy}
                                  onClick={() =>
                                    run(
                                      () =>
                                        caseRequest(
                                          `/api/cases/${data.case.id}/documents/${item.id}`,
                                          {
                                            method: "POST",
                                            body: JSON.stringify({
                                              action: "propose-timeline",
                                            }),
                                          },
                                        ),
                                      "Source-linked dates, parties and actions added to Timeline & tasks for review.",
                                    )
                                  }
                                >
                                  Find timeline & tasks
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        {manual === item.id && (
                          <form
                            className="case-form"
                            style={{ marginTop: 14 }}
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (
                                await run(
                                  () =>
                                    caseRequest(
                                      `/api/cases/${data.case.id}/documents/${item.id}`,
                                      {
                                        method: "POST",
                                        body: JSON.stringify({
                                          action: "manual-text",
                                          text: manualText,
                                        }),
                                      },
                                    ),
                                  "Manual text saved separately from the original.",
                                )
                              )
                                setManual(null);
                            }}
                          >
                            <label htmlFor={`manual-${item.id}`}>
                              Text transcribed from this document
                            </label>
                            <textarea
                              id={`manual-${item.id}`}
                              required
                              value={manualText}
                              onChange={(e) => setManualText(e.target.value)}
                              rows={7}
                            />
                            <div className="case-actions">
                              <button
                                className="btn-primary"
                                disabled={busy || !manualText.trim()}
                              >
                                Save manual text
                              </button>
                              <button
                                type="button"
                                className="case-text-button"
                                onClick={() => setManual(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                        {item.metadata.extracted_text && (
                          <details style={{ marginTop: 18 }}>
                            <summary
                              style={{
                                cursor: "pointer",
                                fontSize: 14,
                                fontWeight: 600,
                              }}
                            >
                              Read{" "}
                              {item.metadata.extraction_status === "manual"
                                ? "manually entered"
                                : "extracted"}{" "}
                              text
                            </summary>
                            <div
                              className="case-source"
                              style={{ maxHeight: 360, overflowY: "auto" }}
                            >
                              {item.metadata.extracted_text}
                            </div>
                          </details>
                        )}
                      </div>
                    ))}
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

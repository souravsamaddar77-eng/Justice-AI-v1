"use client";

import { useEffect, useState } from "react";
import { Archive, FileDown } from "lucide-react";
import type { CasePaneProps } from "./shared";
import { REVIEW_LABELS } from "./shared";

export default function ExportPanel({
  data,
  busy,
  run,
}: Pick<CasePaneProps, "data" | "busy" | "run">) {
  const [selected, setSelected] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const [printUrl, setPrintUrl] = useState("");
  const items = data.items.filter((item) => !item.deleted_at);
  useEffect(() => {
    const visibleIds = new Set(
      data.items.filter((item) => !item.deleted_at).map((item) => item.id),
    );
    setSelected((previous) => {
      const next = previous.filter((id) => visibleIds.has(id));
      return next.length === previous.length ? previous : next;
    });
  }, [data.items]);
  const selectedItems = items.filter((item) => selected.includes(item.id));
  const unreviewed = selectedItems.filter(
    (item) =>
      ["draft", "analysis", "chat", "note"].includes(item.kind) &&
      item.review_status !== "reviewed",
  );
  const unconfirmed = selectedItems.filter(
    (item) =>
      item.kind === "timeline" && item.metadata.confirmation !== "confirmed",
  );
  useEffect(
    () => () => {
      if (printUrl) URL.revokeObjectURL(printUrl);
    },
    [printUrl],
  );
  async function exportBundle(format: "pdf" | "html" | "zip") {
    const targetIds =
      format === "zip"
        ? selectedItems
            .filter((item) => item.kind === "document")
            .map((item) => item.id)
        : selected;
    await run(
      async () => {
        const response = await fetch(`/api/cases/${data.case.id}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ itemIds: targetIds, format }),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(
            result.error ||
              "The bundle could not be exported. Check your selected material and try again.",
          );
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        if (format === "html") {
          if (printUrl) URL.revokeObjectURL(printUrl);
          setPrintUrl(url);
        } else {
          const link = document.createElement("a");
          link.href = url;
          link.download =
            format === "pdf"
              ? `case-${data.case.id}-reviewed-bundle.pdf`
              : `case-${data.case.id}-selected-originals.zip`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      },
      format === "html"
        ? "Reviewed bundle prepared. Open it below, then choose Print / Save as PDF."
        : format === "pdf"
          ? "Reviewed case PDF downloaded."
          : "Selected original attachments downloaded.",
    );
  }
  return (
    <section className="case-panel">
      <div className="case-panel-heading">
        <div>
          <h2>Reviewed case bundle</h2>
          <p className="case-muted">
            Prepare selected material for a consultation or your own records.
          </p>
        </div>
        <button
          className="case-small-button"
          onClick={() => setShow(!show)}
          aria-expanded={show}
        >
          <FileDown size={15} />
          {show ? "Close selection" : "Choose material"}
        </button>
      </div>
      {show && (
        <div className="case-form">
          <p className="case-muted">
            The bundle includes your case summary and selected confirmed events,
            task status, document references and reviewed drafts. Choose each
            version explicitly. Original attachments can be downloaded
            separately as a ZIP.
          </p>
          <fieldset>
            <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
              Material to include
            </legend>
            <div className="case-checklist">
              {items.length ? (
                items.map((item) => (
                  <label key={item.id} className="case-check">
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => {
                        setSelected((values) =>
                          values.includes(item.id)
                            ? values.filter((id) => id !== item.id)
                            : [...values, item.id],
                        );
                        setPrintUrl("");
                      }}
                    />
                    <span>
                      {item.title}{" "}
                      <span className="case-muted" style={{ fontSize: 12 }}>
                        {item.kind} · v{item.version}
                        {["draft", "analysis", "chat", "note"].includes(
                          item.kind,
                        )
                          ? ` · ${REVIEW_LABELS[item.review_status]}`
                          : ""}
                        {item.kind === "timeline" &&
                        item.metadata.confirmation !== "confirmed"
                          ? " · Pending confirmation"
                          : ""}
                      </span>
                    </span>
                  </label>
                ))
              ) : (
                <p className="case-muted">
                  Add case material before preparing a bundle.
                </p>
              )}
            </div>
          </fieldset>
          {unreviewed.length > 0 && (
            <p className="case-notice">
              {unreviewed.length} selected work version
              {unreviewed.length === 1 ? " needs" : "s need"} review. Complete
              the review in Saved work, or remove{" "}
              {unreviewed.length === 1 ? "it" : "them"} from this selection.
            </p>
          )}
          {unconfirmed.length > 0 && (
            <p className="case-notice">
              Confirm the selected timeline events before including them in the
              chronology.
            </p>
          )}
          <div className="case-actions">
            <button
              className="btn-primary"
              disabled={
                busy ||
                !selected.length ||
                unreviewed.length > 0 ||
                unconfirmed.length > 0
              }
              onClick={() => exportBundle("pdf")}
            >
              <FileDown size={16} />
              {busy ? "Preparing…" : "Download reviewed PDF"}
            </button>
            <button
              className="btn-secondary"
              disabled={
                busy ||
                !selected.length ||
                unreviewed.length > 0 ||
                unconfirmed.length > 0
              }
              onClick={() => exportBundle("html")}
            >
              Printable version
            </button>
            <button
              className="btn-secondary"
              disabled={
                busy || !selectedItems.some((item) => item.kind === "document")
              }
              onClick={() => exportBundle("zip")}
            >
              <Archive size={16} />
              Download selected originals
            </button>
          </div>
          {printUrl && (
            <div className="case-success" role="status">
              <a
                className="case-text-button"
                href={printUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open printable bundle
              </a>
              <p>
                Use Print / Save as PDF in the opened page. The print layout
                supports page breaks and your browser&apos;s Indian-language
                fonts.
              </p>
            </div>
          )}
          <p className="case-muted" style={{ fontSize: 12 }}>
            The direct PDF supports English, Hindi, Marathi and Bengali. For
            other Indian scripts, use the printable version and Save as PDF in
            your browser.
          </p>
          <p className="case-muted" style={{ fontSize: 12 }}>
            A reviewed bundle is a record of selected material and its review
            state; it is not a certified or automatically court-ready document.
          </p>
        </div>
      )}
    </section>
  );
}

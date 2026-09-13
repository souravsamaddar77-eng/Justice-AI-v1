import type { CaseDetail, CaseItem } from "@/types/cases";

export interface CasePaneProps {
  data: CaseDetail;
  busy: boolean;
  run: (action: () => Promise<unknown>, success?: string) => Promise<boolean>;
  onSource: (itemId: string) => void;
}
export function editable(data: CaseDetail, item?: CaseItem) {
  return (
    data.permission === "owner" ||
    (item?.permission || data.permission) === "edit"
  );
}
export function commentable(data: CaseDetail, item?: CaseItem) {
  return ["owner", "edit", "comment"].includes(
    item?.permission || data.permission,
  );
}
export function currentItems(items: CaseItem[]) {
  const versions = new Map<string, CaseItem>();
  for (const item of items)
    if (
      !item.deleted_at &&
      (!versions.has(item.resource_id) ||
        versions.get(item.resource_id)!.version < item.version)
    )
      versions.set(item.resource_id, item);
  return Array.from(versions.values());
}
export const REVIEW_LABELS = {
  ai_draft: "AI draft",
  needs_review: "Needs review",
  changes_requested: "Changes requested",
  reviewed: "Reviewed",
};

export function SourceReference({
  item,
  data,
  onSource,
}: {
  item: CaseItem;
  data: CaseDetail;
  onSource: (id: string) => void;
}) {
  const source = data.items.find(
    (candidate) => candidate.id === item.metadata.source_item_id,
  );
  if (!item.metadata.source_item_id)
    return (
      <p className="case-meta">Manually added; no document source recorded.</p>
    );
  return (
    <div className="case-source">
      {source ? (
        <button
          className="case-text-button"
          onClick={() => onSource(source.id)}
        >
          {source.title} · Version {source.version}
        </button>
      ) : (
        <span>Source material is not included in your shared selection.</span>
      )}
      {item.metadata.source_page && (
        <span> · Page {item.metadata.source_page}</span>
      )}
      {item.metadata.source_excerpt && (
        <p style={{ marginTop: 6 }}>“{item.metadata.source_excerpt}”</p>
      )}
    </div>
  );
}

export type CasePermission = "owner" | "read" | "comment" | "edit";
export type CaseStatus = "open" | "in_progress" | "resolved" | "archived";
export type CaseItemKind = "document" | "chat" | "analysis" | "draft" | "timeline" | "task" | "note";
export type ReviewStatus = "ai_draft" | "needs_review" | "changes_requested" | "reviewed";

export interface CaseUser { id: string; email: string }
export interface CaseRecord {
  id: string; owner_id: string; title: string; description: string; category: string;
  status: CaseStatus; created_at: string; updated_at: string; permission?: CasePermission;
}
export interface CaseItemMetadata {
  filename?: string; mime_type?: string; size?: number; sha256?: string;
  extraction_status?: "pending" | "complete" | "failed" | "manual";
  extraction_error?: string; extraction_config?: string; extracted_text?: string;
  // Sources always refer to one exact, authorized document version.
  source_item_id?: string; source_excerpt?: string; source_page?: number;
  date?: string | null; date_type?: "explicit" | "inferred" | "unknown";
  confirmation?: "pending_review" | "confirmed";
  completed?: boolean; due_date?: string | null; assumptions?: string;
  parties?: string[]; review_comment?: string; tool?: string;
  [key: string]: unknown;
}
export interface CaseItem {
  id: string; case_id: string; resource_id: string; version: number; kind: CaseItemKind;
  title: string; content: string; metadata: CaseItemMetadata;
  review_status: ReviewStatus; reviewer_id: string | null; reviewed_at: string | null;
  created_by: string; updated_by: string; created_at: string; updated_at: string;
  deleted_at: string | null; permission?: CasePermission;
}
export interface CaseInvitation {
  id: string; case_id: string; email: string; permission: Exclude<CasePermission, "owner">;
  item_ids: string[]; status: "pending" | "accepted" | "declined" | "revoked";
  invited_by: string; accepted_by: string | null; created_at: string; updated_at: string;
  case_title?: string;
}
export interface CaseActivity {
  id: string; case_id: string; actor_id: string; action: string;
  object_type: string; object_id: string; created_at: string;
}
export interface CaseReview {
  id: string; case_id: string; item_id: string; reviewer_id: string;
  review_status: ReviewStatus; comment: string; created_at: string;
}
export interface CaseDetail {
  case: CaseRecord; items: CaseItem[]; members: CaseInvitation[];
  invitations: CaseInvitation[]; activity: CaseActivity[]; reviews: CaseReview[]; permission: CasePermission;
}
export interface CaseSession { configured: boolean; user: CaseUser | null; setupMessage?: string; message?: string }

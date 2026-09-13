"use client";

import { useState, type FormEvent } from "react";
import { Share2, UserPlus, Users } from "lucide-react";
import type { CaseInvitation } from "@/types/cases";
import { caseDate, caseRequest } from "@/lib/case-client";
import type { CasePaneProps } from "./shared";

const PERMISSIONS = {
  read: "Read selected material",
  comment: "Read and comment",
  edit: "Edit and contribute",
};

export default function SharingPane({ data, busy, run }: CasePaneProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"read" | "comment" | "edit">(
    "read",
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [revoke, setRevoke] = useState<string | null>(null);
  const available = data.items.filter((item) => !item.deleted_at);
  const invitations =
    data.permission === "owner" ? data.invitations : data.members;
  function toggle(id: string) {
    setSelected((items) =>
      items.includes(id)
        ? items.filter((value) => value !== id)
        : [...items, id],
    );
  }
  async function invite(event: FormEvent) {
    event.preventDefault();
    if (
      await run(
        () =>
          caseRequest(`/api/cases/${data.case.id}/sharing`, {
            method: "POST",
            body: JSON.stringify({ email, permission, itemIds: selected }),
          }),
        "Invitation created. It will appear when the recipient signs in to My cases. No email was sent.",
      )
    ) {
      setEmail("");
      setSelected([]);
      setShowForm(false);
    }
  }
  async function revokeInvite(invitation: CaseInvitation) {
    if (
      await run(
        () =>
          caseRequest(`/api/cases/${data.case.id}/sharing`, {
            method: "PATCH",
            body: JSON.stringify({ id: invitation.id, action: "revoke" }),
          }),
        "Future access through this invitation has been revoked. Previously downloaded files cannot be recalled.",
      )
    )
      setRevoke(null);
  }
  return (
    <section className="case-panel">
      <div className="case-panel-heading">
        <div>
          <h2>Sharing & handoff</h2>
          <p className="case-muted">
            Invite an advocate or collaborator by the email they use to sign in.
          </p>
        </div>
        {data.permission === "owner" && (
          <button
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
            aria-expanded={showForm}
          >
            <UserPlus size={16} />
            Invite collaborator
          </button>
        )}
      </div>
      <div className="case-notice">
        Sharing includes the case title and description, plus only the versions
        you select. New uploads and future versions are not automatically
        included. Directory listings are not verified account identities.
      </div>
      {showForm && (
        <form onSubmit={invite} className="case-inline-form case-form">
          <div className="case-fields">
            <div className="case-field">
              <label htmlFor="share-email">
                Collaborator&apos;s account email
              </label>
              <input
                autoFocus
                id="share-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="case-field">
              <label htmlFor="share-permission">Permission</label>
              <select
                id="share-permission"
                value={permission}
                onChange={(e) =>
                  setPermission(e.target.value as typeof permission)
                }
              >
                {Object.entries(PERMISSIONS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="case-muted">
            {permission === "read"
              ? "Can read and download the selected versions."
              : permission === "comment"
                ? "Can read selected material, add notes and request changes."
                : "Can work on selected material, add drafts and record a completed review."}
          </p>
          <fieldset>
            <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
              Select the exact material to share
            </legend>
            {available.length ? (
              <div className="case-checklist">
                {available.map((item) => (
                  <label key={item.id} className="case-check">
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => toggle(item.id)}
                    />
                    <span>
                      {item.title}{" "}
                      <span className="case-muted" style={{ fontSize: 12 }}>
                        {item.kind} · v{item.version}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="case-muted">
                Add a document, draft or note before inviting someone.
              </p>
            )}
          </fieldset>
          <p className="case-muted">
            {selected.length} selected. The invitation appears in the
            recipient&apos;s authenticated workspace. This action does not send
            an email.
          </p>
          <div className="case-actions">
            <button
              className="btn-primary"
              disabled={busy || !email.trim() || !selected.length}
            >
              <Share2 size={16} />
              {busy ? "Creating…" : "Create invitation"}
            </button>
            <button
              type="button"
              className="case-text-button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {!invitations.length ? (
        <div className="case-empty">
          <Users />
          <h3>
            {data.permission === "owner"
              ? "This case is private to you"
              : "Your shared access"}
          </h3>
          <p className="case-muted">
            {data.permission === "owner"
              ? "Choose the material and permission before inviting a collaborator."
              : `You have ${data.permission} access to the material selected by the case owner.`}
          </p>
        </div>
      ) : (
        <div className="case-list">
          {invitations.map((invitation) => (
            <article key={invitation.id} className="case-item">
              <div className="case-item-heading">
                <div>
                  <h3>{invitation.email}</h3>
                  <div className="case-meta">
                    <span>{PERMISSIONS[invitation.permission]}</span>
                    <span>
                      {invitation.item_ids.length} selected version
                      {invitation.item_ids.length === 1 ? "" : "s"}
                    </span>
                    <span>Invited {caseDate(invitation.created_at)}</span>
                  </div>
                </div>
                <span
                  className={`case-badge ${invitation.status === "accepted" ? "case-badge-green" : invitation.status === "revoked" ? "case-badge-red" : "case-badge-gold"}`}
                >
                  {invitation.status.charAt(0).toUpperCase() +
                    invitation.status.slice(1)}
                </span>
              </div>
              <details style={{ marginTop: 12 }}>
                <summary className="case-muted" style={{ cursor: "pointer" }}>
                  View shared material
                </summary>
                <ul
                  style={{ marginTop: 9, paddingLeft: 18, listStyle: "disc" }}
                >
                  {invitation.item_ids.map((id) => {
                    const item = data.items.find((value) => value.id === id);
                    return (
                      <li className="case-muted" key={id}>
                        {item
                          ? `${item.title} · v${item.version}`
                          : "A selected version outside your current access"}
                      </li>
                    );
                  })}
                </ul>
              </details>
              {data.permission === "owner" &&
                ["pending", "accepted"].includes(invitation.status) && (
                  <div style={{ marginTop: 14 }}>
                    {revoke === invitation.id ? (
                      <div className="case-inline-form">
                        <p className="case-muted">
                          Revoke future access through this invitation? Any
                          files already downloaded cannot be recalled. Other
                          active invitations remain in effect.
                        </p>
                        <div className="case-actions" style={{ marginTop: 12 }}>
                          <button
                            className="case-small-button case-danger"
                            disabled={busy}
                            onClick={() => revokeInvite(invitation)}
                          >
                            Revoke access
                          </button>
                          <button
                            className="case-small-button"
                            onClick={() => setRevoke(null)}
                          >
                            Keep access
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="case-small-button case-danger"
                        onClick={() => setRevoke(invitation.id)}
                      >
                        Revoke access
                      </button>
                    )}
                  </div>
                )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

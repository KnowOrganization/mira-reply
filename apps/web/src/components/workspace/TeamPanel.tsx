"use client";

// Team & access management modal. Two sections:
//  • Org members — people on your workspace (invite once, manage roles).
//  • Account access — per-account grants (scope an agent to one account, or
//    share an account cross-org with an agency).
import { useState } from "react";
import { X, Copy } from "lucide-react";
import {
  useOrgs, useOrgMembers, useAccountMembers,
  useInviteToOrg, useInviteToAccount, useChangeOrgMemberRole, useRemoveOrgMember,
  type Role,
} from "@/lib/api/teamHooks";
import { getActiveAccount, getActiveOrg } from "@/lib/api/activeAccount";

const ROLES: Role[] = ["admin", "agent", "viewer"];

function InviteForm({ onInvite }: { onInvite: (b: { email: string; role: Role }) => Promise<{ link: string }> }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("agent");
  const [link, setLink] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email"
          className="flex-1 px-2.5 py-1.5 rounded-lg text-[12.5px]"
          style={{ background: "var(--bg-inset)", color: "var(--text)" }}
        />
        <select
          value={role} onChange={(e) => setRole(e.target.value as Role)}
          className="px-2 py-1.5 rounded-lg text-[12.5px]" style={{ background: "var(--bg-inset)", color: "var(--text)" }}
        >
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          onClick={async () => {
            setErr(null); setLink(null);
            try { const r = await onInvite({ email: email.trim(), role }); setLink(r.link); setEmail(""); }
            catch (e) { setErr(e instanceof Error ? e.message : "failed"); }
          }}
          className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >Invite</button>
      </div>
      {err && <p className="text-[11.5px]" style={{ color: "var(--danger, #e5484d)" }}>{err}</p>}
      {link && (
        <div className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-lg" style={{ background: "var(--bg-inset)", color: "var(--text-subtle)" }}>
          <span className="truncate flex-1">{link}</span>
          <button onClick={() => navigator.clipboard.writeText(link)} title="Copy"><Copy size={13} /></button>
        </div>
      )}
    </div>
  );
}

export function TeamPanel({ onClose }: { onClose: () => void }) {
  const activeAccount = getActiveAccount();
  const { data: orgsData } = useOrgs();
  const orgs = orgsData?.orgs ?? [];
  const activeOrgId = getActiveOrg() ?? orgs.find((o) => o.role === "owner" || o.role === "admin")?.orgId ?? orgs[0]?.orgId ?? null;
  const myOrgRole = orgs.find((o) => o.orgId === activeOrgId)?.role;
  const canManage = myOrgRole === "owner" || myOrgRole === "admin";

  const { data: orgMembers } = useOrgMembers(canManage ? activeOrgId : null);
  const { data: acctMembers } = useAccountMembers(activeAccount);
  const inviteOrg = useInviteToOrg(activeOrgId ?? "");
  const inviteAcct = useInviteToAccount(activeAccount ?? "");
  const changeRole = useChangeOrgMemberRole(activeOrgId ?? "");
  const removeMember = useRemoveOrgMember(activeOrgId ?? "");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-auto rounded-2xl border p-5" style={{ background: "var(--bg-elev)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold">Team &amp; access</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        {!canManage && (
          <p className="text-[12.5px] mb-4" style={{ color: "var(--text-subtle)" }}>
            You need admin or owner on this workspace to manage the team.
          </p>
        )}

        {canManage && (
          <section className="mb-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-subtle)" }}>
              Workspace members
            </h3>
            <div className="flex flex-col gap-1 mb-3">
              {(orgMembers?.members ?? []).map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[12.5px]" style={{ background: "var(--bg-inset)" }}>
                  <span className="truncate">{m.name || m.email || m.userId}</span>
                  <span className="flex items-center gap-2">
                    {m.role === "owner" ? (
                      <span className="text-[10px] uppercase" style={{ color: "var(--text-subtle)" }}>owner</span>
                    ) : (
                      <>
                        <select
                          value={m.role}
                          onChange={(e) => changeRole.mutate({ userId: m.userId, role: e.target.value as Role })}
                          className="text-[11px] rounded px-1 py-0.5" style={{ background: "var(--bg-elev)", color: "var(--text)" }}
                        >
                          {(["admin", "agent", "viewer"] as Role[]).map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button onClick={() => removeMember.mutate(m.userId)} className="text-[11px]" style={{ color: "var(--danger, #e5484d)" }}>remove</button>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {activeOrgId && <InviteForm onInvite={(b) => inviteOrg.mutateAsync(b)} />}
          </section>
        )}

        {activeAccount && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-subtle)" }}>
              This account&apos;s access
            </h3>
            <div className="flex flex-col gap-1 mb-3">
              {(acctMembers?.members ?? []).map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[12.5px]" style={{ background: "var(--bg-inset)" }}>
                  <span className="truncate">{m.name || m.email || m.userId}</span>
                  <span className="text-[10px] uppercase" style={{ color: "var(--text-subtle)" }}>{m.role}</span>
                </div>
              ))}
              {(acctMembers?.members ?? []).length === 0 && (
                <p className="text-[11.5px]" style={{ color: "var(--text-subtle)" }}>No direct grants — workspace admins already have access.</p>
              )}
            </div>
            {activeAccount
              ? <InviteForm onInvite={(b) => inviteAcct.mutateAsync(b)} />
              : <p className="text-[11.5px]" style={{ color: "var(--text-subtle)" }}>Select an account to grant direct access.</p>}
          </section>
        )}
      </div>
    </div>
  );
}

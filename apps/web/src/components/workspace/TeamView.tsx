"use client";

// Full-page Team & access control center (CanvasLayout main view).
//  • Workspace members — roster + role change/remove + invite (admin/owner).
//  • Account access — per-account grants + cross-org share invite.
//  • Client roster — for agency orgs, every account the org owns; click to switch.
// Management controls are gated by useMe().canManage; everyone can view.
import { useState } from "react";
import { Copy, ArrowRight, Check } from "lucide-react";
import {
  useMe, useOrgs, useAccounts, useOrgMembers, useAccountMembers,
  useInviteToOrg, useInviteToAccount, useChangeOrgMemberRole, useRemoveOrgMember,
  type Role,
} from "@/lib/api/teamHooks";
import { getActiveAccount, getActiveOrg, setActiveAccount } from "@/lib/api/activeAccount";

const GRANTABLE: Role[] = ["admin", "agent", "viewer"];

function InviteForm({ disabled, onInvite }: { disabled?: boolean; onInvite: (b: { email: string; role: Role }) => Promise<{ link: string }> }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("agent");
  const [sent, setSent] = useState<{ to: string; link: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2 mt-3">
      <div className="flex gap-2">
        <input
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@email.com" disabled={disabled}
          className="flex-1 px-3 py-2 rounded-lg text-[13px] disabled:opacity-50"
          style={{ background: "var(--bg-inset)", color: "var(--text)", border: "1px solid var(--border)" }}
        />
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={disabled}
          className="px-2 py-2 rounded-lg text-[13px] disabled:opacity-50" style={{ background: "var(--bg-inset)", color: "var(--text)", border: "1px solid var(--border)" }}>
          {GRANTABLE.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          disabled={disabled}
          onClick={async () => {
            setErr(null); setSent(null);
            const to = email.trim();
            try { const r = await onInvite({ email: to, role }); setSent({ to, link: r.link }); setEmail(""); }
            catch (e) { setErr(e instanceof Error ? e.message : "failed"); }
          }}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >Invite</button>
      </div>
      {err && <p className="text-[12px]" style={{ color: "#ef4444" }}>{err}</p>}
      {sent && (
        <div className="flex flex-col gap-1.5 px-3 py-2 rounded-lg" style={{ background: "var(--bg-inset)" }}>
          <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "var(--text)" }}>
            <Check size={13} style={{ color: "#22c55e" }} /> Invitation emailed to {sent.to}
          </span>
          <span className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-subtle)" }}>
            <span className="truncate flex-1">{sent.link}</span>
            <button onClick={() => navigator.clipboard.writeText(sent.link)} title="Copy link"><Copy size={13} /></button>
          </span>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] mb-3" style={{ color: "var(--text-subtle)" }}>{title}</h3>
      {children}
    </section>
  );
}

export function TeamView() {
  const { data: me } = useMe();
  const { data: orgsData } = useOrgs();
  const { data: acctData } = useAccounts();
  const orgs = orgsData?.orgs ?? [];
  const accounts = acctData?.accounts ?? [];

  const activeAccount = getActiveAccount() ?? accounts[0]?.accountId ?? null;
  const activeOrgId = getActiveOrg() ?? me?.orgId ?? orgs[0]?.orgId ?? null;
  const activeOrg = orgs.find((o) => o.orgId === activeOrgId);
  const canManage = !!me?.canManage;

  const { data: orgMembers } = useOrgMembers(activeOrgId);
  const { data: acctMembers } = useAccountMembers(activeAccount);
  const inviteOrg = useInviteToOrg(activeOrgId ?? "");
  const inviteAcct = useInviteToAccount(activeAccount ?? "");
  const changeRole = useChangeOrgMemberRole(activeOrgId ?? "");
  const removeMember = useRemoveOrgMember(activeOrgId ?? "");

  const orgAccounts = accounts.filter((a) => a.orgId === activeOrgId);

  return (
    <div>
      <div>
        <div className="mb-5">
          <p className="text-[13px]" style={{ color: "var(--text-subtle)" }}>
            {activeOrg?.name || "Your workspace"}{activeOrg?.type === "agency" ? " · agency" : ""}
            {me?.orgRole ? ` · you're ${me.orgRole}` : ""}
          </p>
        </div>

        {!canManage && (
          <div className="mb-6 px-4 py-3 rounded-xl text-[12.5px]" style={{ background: "var(--bg-inset)", color: "var(--text-subtle)" }}>
            You have {me?.accountRole ?? "limited"} access. Ask an owner or admin to change members or roles.
          </div>
        )}

        {/* agency client roster */}
        {activeOrg?.type === "agency" && (
          <Section title={`Clients (${orgAccounts.length})`}>
            <div className="flex flex-col gap-1.5">
              {orgAccounts.map((a) => (
                <button key={a.accountId} onClick={() => setActiveAccount(a.accountId, a.orgId)}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left"
                  style={{ background: a.accountId === activeAccount ? "var(--accent-soft)" : "var(--bg-inset)", border: "1px solid var(--border)" }}>
                  <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>@{a.username || a.accountId}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] uppercase" style={{ color: "var(--text-subtle)" }}>{a.role}</span>
                    <ArrowRight size={13} style={{ color: "var(--text-subtle)" }} />
                  </span>
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* workspace members */}
        <Section title="Workspace members">
          <div className="flex flex-col gap-1.5">
            {(orgMembers?.members ?? []).map((m) => (
              <div key={m.userId} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl" style={{ background: "var(--bg-inset)", border: "1px solid var(--border)" }}>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium truncate" style={{ color: "var(--text)" }}>{m.name || m.email || m.userId}</div>
                  {m.email && m.name && <div className="text-[11px] truncate" style={{ color: "var(--text-subtle)" }}>{m.email}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.role === "owner" || !canManage ? (
                    <span className="text-[10.5px] uppercase" style={{ color: "var(--text-subtle)" }}>{m.role}</span>
                  ) : (
                    <>
                      <select value={m.role} onChange={(e) => changeRole.mutate({ userId: m.userId, role: e.target.value as Role })}
                        className="text-[11.5px] rounded px-1.5 py-1" style={{ background: "var(--bg-elev)", color: "var(--text)", border: "1px solid var(--border)" }}>
                        {(["admin", "agent", "viewer"] as Role[]).map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button onClick={() => removeMember.mutate(m.userId)} className="text-[11.5px]" style={{ color: "#ef4444" }}>remove</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {!canManage && (orgMembers?.members ?? []).length === 0 && (
              <p className="text-[12.5px]" style={{ color: "var(--text-subtle)" }}>Members are visible to admins.</p>
            )}
          </div>
          {canManage && activeOrgId && <InviteForm onInvite={(b) => inviteOrg.mutateAsync(b)} />}
        </Section>

        {/* per-account access */}
        {activeAccount && (
          <Section title="This account's access">
            <div className="flex flex-col gap-1.5">
              {(acctMembers?.members ?? []).map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl" style={{ background: "var(--bg-inset)", border: "1px solid var(--border)" }}>
                  <span className="text-[13px] truncate" style={{ color: "var(--text)" }}>{m.name || m.email || m.userId}</span>
                  <span className="text-[10.5px] uppercase shrink-0" style={{ color: "var(--text-subtle)" }}>{m.role}</span>
                </div>
              ))}
              {(acctMembers?.members ?? []).length === 0 && (
                <p className="text-[12.5px]" style={{ color: "var(--text-subtle)" }}>No direct grants — workspace admins already have access. Invite below to share this account (e.g. with an agency).</p>
              )}
            </div>
            {canManage && <InviteForm onInvite={(b) => inviteAcct.mutateAsync(b)} />}
          </Section>
        )}
      </div>
    </div>
  );
}

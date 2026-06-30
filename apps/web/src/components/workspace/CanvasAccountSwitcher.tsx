"use client";

// Sidebar account/org switcher for CanvasLayout. Replaces the static account
// card: click → dropdown to switch the active IG account (grouped by org),
// switch org (multi-org users), connect a new account, or open Team & access.
import { useEffect, useState } from "react";
import { ChevronsUpDown, Plus, Users, Check, Building2 } from "lucide-react";
import { useAccounts, useOrgs, type AccountRef } from "@/lib/api/teamHooks";
import { getActiveAccount, getActiveOrg, setActiveAccount, setActiveOrg } from "@/lib/api/activeAccount";
import { Avatar } from "@/components/ui/Avatar";

export function CanvasAccountSwitcher({ account, onOpenTeam }: { account: string; onOpenTeam: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: acctData } = useAccounts();
  const { data: orgData } = useOrgs();
  const accounts = acctData?.accounts ?? [];
  const orgs = orgData?.orgs ?? [];
  const activeAccount = getActiveAccount();
  const activeOrg = getActiveOrg();
  const activeRole = accounts.find((a) => (activeAccount ? a.accountId === activeAccount : a.username === account))?.role;

  // Esc closes the dropdown.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Switching org also re-picks the active account so we never keep a stale
  // account from another org (which would 403 on account-scoped reads).
  function switchOrg(orgId: string) {
    const first = accounts.find((a) => a.orgId === orgId);
    if (first) setActiveAccount(first.accountId, orgId);
    else setActiveOrg(orgId);
  }

  const card = (
    <button
      onClick={() => setOpen((v) => !v)}
      style={{
        margin: "10px 10px 4px", padding: "9px 10px", width: "calc(100% - 20px)",
        background: "var(--border)", border: "1px solid var(--border)", borderRadius: 12,
        display: "flex", alignItems: "center", gap: 9, cursor: "pointer", textAlign: "left",
      }}
    >
      <Avatar name={account || "?"} size={32} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{account || "—"}</div>
        <div style={{ fontSize: 10, color: "var(--text-subtle)", marginTop: 1 }}>{activeRole ? activeRole : "Instagram"}</div>
      </div>
      <ChevronsUpDown size={13} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
    </button>
  );

  const item = (label: React.ReactNode, onClick: () => void, active?: boolean, sub?: string) => (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        padding: "7px 10px", borderRadius: 8, border: "none", cursor: "pointer",
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent-deep)" : "var(--text)", fontSize: 12.5, textAlign: "left",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.05)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = active ? "var(--accent-soft)" : "transparent"; }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {sub && <span style={{ fontSize: 9.5, textTransform: "uppercase", color: "var(--text-subtle)" }}>{sub}</span>}
        {active && <Check size={13} style={{ color: "var(--accent-deep)" }} />}
      </span>
    </button>
  );

  const accountRow = (a: AccountRef, active: boolean) => (
    item(
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <Avatar name={a.username || a.accountId} size={20} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{a.username || a.accountId}</span>
      </span>,
      () => setActiveAccount(a.accountId, a.orgId),
      active,
      a.role,
    )
  );

  return (
    <div style={{ position: "relative" }}>
      {card}
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", left: 10, right: 10, top: "100%", zIndex: 50, marginTop: 2,
            background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 12,
            boxShadow: "var(--shadow-card, 0 8px 28px rgba(0,0,0,0.18))", padding: 5, maxHeight: 420, overflowY: "auto",
          }} className="scrollbar-thin">
            {orgs.length > 1 && (
              <>
                <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", color: "var(--text-subtle)", padding: "6px 10px 3px" }}>Workspace</div>
                {orgs.map((o) => item(
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Building2 size={12} /> {o.name || o.orgId}</span>,
                  () => switchOrg(o.orgId),
                  activeOrg ? activeOrg === o.orgId : false,
                  o.type === "agency" ? "agency" : undefined,
                ))}
                <div style={{ margin: "5px 6px", borderTop: "1px solid var(--border)" }} />
              </>
            )}

            <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", color: "var(--text-subtle)", padding: "6px 10px 3px" }}>Accounts</div>
            {accounts.map((a) => accountRow(a, activeAccount ? activeAccount === a.accountId : a.username === account))}
            {accounts.length === 0 && <div style={{ padding: "7px 10px", fontSize: 11.5, color: "var(--text-subtle)" }}>No accounts yet</div>}

            <div style={{ margin: "5px 6px", borderTop: "1px solid var(--border)" }} />
            {item(<span style={{ display: "flex", alignItems: "center", gap: 7 }}><Plus size={13} /> Connect new account</span>, () => { window.location.href = "/api/ig/connect"; })}
            {item(<span style={{ display: "flex", alignItems: "center", gap: 7 }}><Users size={13} /> Team & access</span>, () => { setOpen(false); onOpenTeam(); })}
          </div>
        </>
      )}
    </div>
  );
}

"use client";

// Sidebar account/org switcher for CanvasLayout. Replaces the static account
// card: click → dropdown to switch the active IG account (grouped by org),
// switch org (multi-org users), connect a new account, or open Team & access.
import { useState } from "react";
import { ChevronsUpDown, Plus, Users, Check, Building2 } from "lucide-react";
import { useAccounts, useOrgs } from "@/lib/api/teamHooks";
import { getActiveAccount, getActiveOrg, setActiveAccount, setActiveOrg } from "@/lib/api/activeAccount";

function getInitials(s: string) { return s.slice(0, 2).toUpperCase(); }

export function CanvasAccountSwitcher({ account, onOpenTeam }: { account: string; onOpenTeam: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: acctData } = useAccounts();
  const { data: orgData } = useOrgs();
  const accounts = acctData?.accounts ?? [];
  const orgs = orgData?.orgs ?? [];
  const activeAccount = getActiveAccount();
  const activeOrg = getActiveOrg();
  const activeRole = accounts.find((a) => (activeAccount ? a.accountId === activeAccount : a.username === account))?.role;

  const card = (
    <button
      onClick={() => setOpen((v) => !v)}
      style={{
        margin: "10px 10px 4px", padding: "9px 10px", width: "calc(100% - 20px)",
        background: "var(--border)", border: "1px solid var(--border)", borderRadius: 12,
        display: "flex", alignItems: "center", gap: 9, cursor: "pointer", textAlign: "left",
      }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--bg-inset)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text)" }}>{getInitials(account || "?")}</span>
      </div>
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
        padding: "7px 10px", borderRadius: 8, background: "transparent", border: "none", cursor: "pointer",
        color: "var(--text)", fontSize: 12.5, textAlign: "left",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {sub && <span style={{ fontSize: 9.5, textTransform: "uppercase", color: "var(--text-subtle)" }}>{sub}</span>}
        {active && <Check size={13} style={{ color: "var(--accent-deep)" }} />}
      </span>
    </button>
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
                  () => setActiveOrg(o.orgId),
                  activeOrg ? activeOrg === o.orgId : false,
                  o.type === "agency" ? "agency" : undefined,
                ))}
                <div style={{ margin: "5px 6px", borderTop: "1px solid var(--border)" }} />
              </>
            )}

            <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", color: "var(--text-subtle)", padding: "6px 10px 3px" }}>Accounts</div>
            {accounts.map((a) => item(
              `@${a.username || a.accountId}`,
              () => setActiveAccount(a.accountId, a.orgId),
              activeAccount ? activeAccount === a.accountId : a.username === account,
              a.role,
            ))}
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

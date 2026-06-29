"use client";

// Active-account picker. Lists every IG account the user can reach (owned via an
// org they admin + accounts shared with them), switches by setting the active
// cookie + reloading. "Connect new" runs OAuth; "Team" opens management.
import { useState } from "react";
import { ChevronDown, Plus, Users, Check } from "lucide-react";
import { useAccounts } from "@/lib/api/teamHooks";
import { getActiveAccount, setActiveAccount } from "@/lib/api/activeAccount";
import { TeamPanel } from "./TeamPanel";

export function AccountSwitcher({ account }: { account: string }) {
  const [open, setOpen] = useState(false);
  const [team, setTeam] = useState(false);
  const { data } = useAccounts();
  const accounts = data?.accounts ?? [];
  const active = getActiveAccount();
  const onOpenTeam = () => setTeam(true);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-lg"
        style={{ background: "var(--bg-inset)", color: "var(--text-subtle)" }}
        title="Switch Instagram account"
      >
        switch <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 mt-1 z-50 w-60 rounded-xl border p-1 shadow-lg"
            style={{ background: "var(--bg-elev)", borderColor: "var(--border)" }}
          >
            {accounts.map((a) => (
              <button
                key={a.accountId}
                onClick={() => setActiveAccount(a.accountId, a.orgId)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-[12.5px] hover:opacity-80"
                style={{ color: "var(--text)" }}
              >
                <span className="truncate">@{a.username || a.accountId}</span>
                <span className="flex items-center gap-1">
                  <span className="text-[9.5px] uppercase tracking-wide" style={{ color: "var(--text-subtle)" }}>{a.role}</span>
                  {(active ? active === a.accountId : a.username === account) && <Check size={13} style={{ color: "var(--accent)" }} />}
                </span>
              </button>
            ))}
            {accounts.length === 0 && (
              <div className="px-2.5 py-2 text-[11.5px]" style={{ color: "var(--text-subtle)" }}>No accounts yet</div>
            )}
            <div className="my-1 border-t" style={{ borderColor: "var(--border)" }} />
            <a
              href="/api/ig/connect"
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] hover:opacity-80"
              style={{ color: "var(--text)" }}
            >
              <Plus size={13} /> Connect new account
            </a>
            <button
              onClick={() => { setOpen(false); onOpenTeam(); }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] hover:opacity-80"
              style={{ color: "var(--text)" }}
            >
              <Users size={13} /> Team & access
            </button>
          </div>
        </>
      )}
      {team && <TeamPanel onClose={() => setTeam(false)} />}
    </div>
  );
}

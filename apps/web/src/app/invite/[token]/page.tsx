"use client";

// Invite accept page. Signed-out users sign in (returning here); signed-in users
// see what they're joining and accept. The invite must match their email.
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession, signIn } from "@/lib/auth/client";
import { api, ApiError } from "@/lib/api/client";
import { useAcceptInvite } from "@/lib/api/teamHooks";
import { MiraLogo } from "@/components/MiraLogo";

type Preview = { kind: string; role: string; email: string; label: string; valid: boolean };

export default function InvitePage() {
  const token = String((useParams() as { token?: string }).token ?? "");
  const { data: session, isPending } = useSession();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const accept = useAcceptInvite();

  useEffect(() => {
    if (!session) return;
    api.get<Preview>(`/api/ig/invites/${token}`)
      .then(setPreview)
      .catch((e) => setErr(e instanceof ApiError ? e.message : "could not load invite"));
  }, [session, token]);

  const wrap = (children: React.ReactNode) => (
    <div className="h-screen w-screen flex items-center justify-center" style={{ background: "var(--bg-frame)" }}>
      <div className="flex flex-col items-center gap-6 px-8 text-center max-w-sm">
        <MiraLogo size={48} />
        {children}
      </div>
    </div>
  );

  if (isPending) return wrap(<p style={{ color: "var(--text-muted)" }}>Loading…</p>);

  if (!session)
    return wrap(<>
      <p className="text-[14px]" style={{ color: "var(--text)" }}>Sign in to accept this invite.</p>
      <button
        onClick={() => signIn.social({ provider: "google", callbackURL: `/invite/${token}` })}
        className="rounded-full px-6 py-3 font-medium" style={{ background: "var(--bg-elev)", color: "var(--text)", border: "1px solid var(--border)" }}
      >Continue with Google</button>
    </>);

  if (done)
    return wrap(<>
      <p className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>You're in! 🎉</p>
      <a href="/" className="rounded-full px-6 py-3 font-medium" style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>Go to Mira</a>
    </>);

  if (err) return wrap(<p className="text-[14px]" style={{ color: "var(--danger, #e5484d)" }}>{err}</p>);
  if (!preview) return wrap(<p style={{ color: "var(--text-muted)" }}>Loading invite…</p>);
  if (!preview.valid) return wrap(<p className="text-[14px]" style={{ color: "var(--danger, #e5484d)" }}>This invite is expired or already used.</p>);

  return wrap(<>
    <p className="text-[14px]" style={{ color: "var(--text)" }}>
      You've been invited to {preview.kind === "org" ? "join workspace" : "manage account"}{" "}
      <b>{preview.label || ""}</b> as <b>{preview.role}</b>.
    </p>
    <button
      onClick={async () => {
        setErr(null);
        try { await accept.mutateAsync(token); setDone(true); }
        catch (e) { setErr(e instanceof ApiError ? e.message : "could not accept"); }
      }}
      disabled={accept.isPending}
      className="rounded-full px-6 py-3 font-medium disabled:opacity-60"
      style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
    >{accept.isPending ? "Accepting…" : "Accept invite"}</button>
  </>);
}

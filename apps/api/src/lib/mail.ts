// Transactional email. Single sender: invitations.
// ponytail: plain fetch to Resend, no SDK. Unset key ⇒ no-op (route still
// returns the link, so manual-share fallback survives). Per-account SMTP if a
// second provider ever shows up.
import type { Role } from "./roles";

type InviteMail = {
  to: string;
  link: string;
  label: string;        // org name or @username
  kind: "org" | "account";
  role: Role;
  inviterEmail: string | null;
};

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export async function sendInviteEmail(m: InviteMail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    console.warn("[mail] RESEND_API_KEY/MAIL_FROM unset — invite email skipped, share link manually");
    return;
  }

  const scope = m.kind === "org" ? `the ${esc(m.label)} workspace` : `the account @${esc(m.label)}`;
  const by = m.inviterEmail ? ` by ${esc(m.inviterEmail)}` : "";
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f1219">
      <h2 style="font-size:18px;margin:0 0 12px">You've been invited to Mira</h2>
      <p style="font-size:14px;line-height:1.5;color:#444">
        You were invited${by} to join ${scope} as <strong>${esc(m.role)}</strong>.
      </p>
      <p style="margin:20px 0">
        <a href="${esc(m.link)}" style="display:inline-block;background:#0f1219;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:10px">Accept invitation</a>
      </p>
      <p style="font-size:12px;color:#888">Sign in with <strong>${esc(m.to)}</strong> to accept. Link expires in 7 days.</p>
    </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: m.to,
      subject: `You've been invited to ${m.kind === "org" ? m.label : "@" + m.label} on Mira`,
      html,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text().catch(() => "")}`);
}

// Link delivery handler — extracted from pipeline.ts + links.ts.
// Finds the right link for a comment, generates the public reply text,
// and returns the private reply (DM) text.
// If no link is found, returns a clarify signal instead.

import { type AssembledContext } from "../ctx";
import { type DraftInput } from "../pipeline";
import { type PostLink } from "../store";
import { chat } from "../llm";
import {
  sanitizeReply,
  styleSeed,
  tooSimilar,
  mostlyWrongLanguage,
} from "../variation";
import { RULEBOOK_PROMPT } from "../rulebook";

export type LinkResult =
  | {
      outcome: "found";
      publicReply: string; // "sent it to your DMs 📩" style — unique every time
      dmText: string; // the actual link text sent privately
    }
  | {
      outcome: "missing";
      clarifyQuestion: string; // ask owner to attach a link
      clarifyKind: "link";
    };

// ── Link picker ────────────────────────────────────────────────────────────

/**
 * Pick the most contextually appropriate link for a comment.
 * Post-scoped only — a link attached to one post is never sent on another.
 */
function pickLink(commentText: string, links: PostLink[]): PostLink | null {
  if (!links?.length) return null;
  const t = commentText.toLowerCase();
  const has = (kws: string[]) => kws.some((k) => t.includes(k));
  if (has(["where", "location", "place", "kahan", "kaha"]))
    return links.find((l) => l.type === "location") || null;
  if (has(["song", "music", "track", "gana", "gaana"]))
    return links.find((l) => l.type === "song") || null;
  if (has(["bike", "gear", "camera", "lens", "ride"]))
    return links.find((l) => l.type === "gear") || null;
  if (has(["buy", "shop", "price", "kahan se", "where to buy"]))
    return links.find((l) => l.type === "shop") || null;
  return links[0];
}

// ── Prompt builder ─────────────────────────────────────────────────────────

function buildLinkReplyPrompt(ctx: AssembledContext): string {
  return [
    "Tu Mira — Instagram account holder ke behalf reply karta hai.",
    "LANGUAGE: mirror the commenter. English → English. Hinglish → Hinglish.",
    "Keep it ONE casual line. Mention you sent the link to their DMs.",
    "At most ONE emoji, often none. No AI tone.",
    "Output ONLY the reply text — nothing else.",
    RULEBOOK_PROMPT,
    ctx.toneSummary && `Owner tone: ${ctx.toneSummary}`,
    ctx.styleSamples.length
      ? `Owner past replies:\n${ctx.styleSamples
          .slice(0, 3)
          .map((s) => `- ${s}`)
          .join("\n")}`
      : "",
    ctx.personaContext &&
      `OWNER FACTS:\n${ctx.personaContext}`,
    ctx.trainingContext,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ── Main export ────────────────────────────────────────────────────────────

export async function handleLink(
  input: DraftInput,
  ctx: AssembledContext
): Promise<LinkResult> {
  const links = ctx.post?.links || [];
  const link = pickLink(input.text, links);

  if (!link) {
    return {
      outcome: "missing",
      clarifyQuestion: `Someone asked for a link on this post. Attach it (paste the URL):`,
      clarifyKind: "link",
    };
  }

  // Generate the public reply ("sent to DMs") — unique every time
  const sys = buildLinkReplyPrompt(ctx);
  const seeded = `${sys}\n\n${styleSeed()}`;

  let publicReply = sanitizeReply(
    await chat(
      [
        { role: "system", content: seeded },
        {
          role: "user",
          content: `Inbound: "${input.text}"\nReply (one line, mention link is in their DMs):`,
        },
      ],
      { temperature: 0.85 }
    )
  );

  // Wrong language guard
  if (mostlyWrongLanguage(publicReply)) {
    publicReply = sanitizeReply(
      await chat(
        [
          {
            role: "system",
            content: `${seeded}\n\nCRITICAL: reply ONLY in English or Hinglish. No other language.`,
          },
          {
            role: "user",
            content: `Inbound: "${input.text}"\nReply:`,
          },
        ],
        { temperature: 0.5 }
      )
    );
  }

  // Dedupe — a "sent to DMs" line should still be unique each time
  if (tooSimilar(publicReply, ctx.recentReplies, ctx.settings.uniquenessThreshold).similar) {
    publicReply = sanitizeReply(
      await chat(
        [
          {
            role: "system",
            content: `${seeded}\n\nWrite a DIFFERENT way to say you sent the link — fresh wording.`,
          },
          {
            role: "user",
            content: `Inbound: "${input.text}"\nReply:`,
          },
        ],
        { temperature: 0.97 }
      )
    );
  }

  return {
    outcome: "found",
    publicReply,
    dmText: `Hey! Here's the ${link.label}: ${link.url}`,
  };
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Link2, Plus, Trash2 } from "lucide-react";
import { usePost, usePatchPost } from "@/lib/api/hooks";
import type { PostLink } from "./types";
import { LINK_TYPES } from "./types";

export function PostLinksPanel({ postId }: { postId: string }) {
  const [links, setLinks] = useState<PostLink[] | null>(null);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<PostLink["type"]>("gear");

  const postQ = usePost<{ post?: { links?: PostLink[] } }>(postId);
  const patchPost = usePatchPost();
  const busy = patchPost.isPending;

  useEffect(() => {
    if (postQ.data) setLinks(postQ.data.post?.links || []);
    else if (postQ.isError) setLinks([]);
  }, [postQ.data, postQ.isError]);

  async function add() {
    if (!label.trim() || !url.trim() || busy) return;
    const d = (await patchPost.mutateAsync({
      id: postId,
      patch: { addLink: { label: label.trim(), url: url.trim(), type } },
    })) as { post?: { links?: PostLink[] } };
    setLinks(d.post?.links || []);
    setLabel("");
    setUrl("");
    toast.success("Link attached — Mira will DM it on request");
  }

  async function remove(id: string) {
    const d = (await patchPost.mutateAsync({
      id: postId,
      patch: { removeLink: id },
    })) as { post?: { links?: PostLink[] } };
    setLinks(d.post?.links || []);
  }

  return (
    <div
      className="px-3.5 py-3"
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--bg-inset)",
      }}
    >
      <div
        className="text-[9.5px] font-bold uppercase tracking-[0.09em] mb-2 flex items-center gap-1"
        style={{ color: "var(--text-subtle)" }}
      >
        <Link2 size={9} /> Attached links — Mira DMs these when asked
      </div>
      {links === null ? (
        <div className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
          Loading…
        </div>
      ) : (
        links.length > 0 && (
          <div className="space-y-1 mb-2">
            {links.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-2 text-[11.5px] rounded-lg px-2 py-1.5"
                style={{ background: "var(--bg-elev)" }}
              >
                <span className="font-semibold shrink-0">{l.label}</span>
                <span className="truncate flex-1" style={{ color: "var(--text-subtle)" }}>
                  {l.url}
                </span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: "var(--bg-inset)", color: "var(--text-subtle)" }}
                >
                  {l.type}
                </span>
                <button
                  onClick={() => remove(l.id)}
                  className="shrink-0"
                  style={{ color: "var(--text-subtle)" }}
                  aria-label="Remove"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
          className="h-7 px-2 rounded-md border bg-transparent text-[11.5px] outline-none focus:border-strong w-[100px]"
          style={{ borderColor: "var(--border-strong)" }}
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="h-7 px-2 rounded-md border bg-transparent text-[11.5px] outline-none focus:border-strong flex-1 min-w-[120px]"
          style={{ borderColor: "var(--border-strong)" }}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as PostLink["type"])}
          className="h-7 px-1.5 rounded-md border bg-transparent text-[11px] outline-none"
          style={{ borderColor: "var(--border-strong)" }}
        >
          {LINK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          onClick={add}
          disabled={busy || !label.trim() || !url.trim()}
          className="h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1 disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          Attach
        </button>
      </div>
    </div>
  );
}

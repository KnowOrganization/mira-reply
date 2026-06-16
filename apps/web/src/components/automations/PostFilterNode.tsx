"use client";

// PostPickerModal + PostFilterNode

import { useState, useEffect } from "react";
import { Image as ImageIcon, Images, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { usePosts, useSyncPosts } from "@/lib/api/hooks";
import type { NodeCardProps, PostSummary } from "./types";

// ── PostPickerModal ────────────────────────────────────────────────────────

export function PostPickerModal({
  posts,
  loading,
  selectedIds,
  onToggle,
  onConfirm,
}: {
  posts: PostSummary[];
  loading: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onConfirm: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: "var(--bg-elev)",
          border: "1.5px solid rgba(124,58,237,0.3)",
          borderRadius: 20,
          width: 420,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 0 0 1px rgba(124,58,237,0.1), var(--shadow-card)",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div
          style={{
            padding: "14px 16px 12px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "rgba(124,58,237,0.18)",
              border: "1px solid rgba(124,58,237,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Images size={15} color="var(--text-muted)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Select Posts</div>
            <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 1 }}>
              {selectedIds.length === 0
                ? "No posts selected"
                : `${selectedIds.length} post${selectedIds.length > 1 ? "s" : ""} selected`}
            </div>
          </div>
        </div>

        {/* grid */}
        <div style={{ overflowY: "auto", padding: "12px 14px", flex: 1 }}>
          {loading && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "var(--border)",
                    border: "2px solid var(--border)",
                  }}
                >
                  <div style={{ width: "100%", paddingBottom: "100%", position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(90deg, var(--border) 0%, var(--bg-inset) 50%, var(--border) 100%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.4s infinite",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && posts.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-subtle)", textAlign: "center", padding: "24px 0" }}>
              No posts found.
            </div>
          )}
          {!loading && posts.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {posts.map((p) => {
                const sel = selectedIds.includes(p.id);
                const thumb = p.thumbnailUrl || p.mediaUrl;
                return (
                  <button
                    key={p.id}
                    onClick={() => onToggle(p.id)}
                    style={{
                      position: "relative",
                      borderRadius: 10,
                      overflow: "hidden",
                      border: `2px solid ${sel ? "var(--border-strong)" : "var(--border)"}`,
                      background: "var(--border)",
                      cursor: "pointer",
                      padding: 0,
                      transition: "border-color 0.15s",
                      boxShadow: sel ? "0 0 10px rgba(124,58,237,0.35)" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        paddingBottom: "100%",
                        position: "relative",
                        background: "var(--bg-inset)",
                      }}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <ImageIcon size={18} color="var(--text-subtle)" />
                        </div>
                      )}
                      {sel && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(124,58,237,0.35)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 6,
                              background: "var(--bg-elev)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span style={{ fontSize: 11, color: "var(--text)", lineHeight: 1 }}>✓</span>
                          </div>
                        </div>
                      )}
                      {p.mediaType === "VIDEO" && (
                        <div
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            background: "rgba(0,0,0,0.6)",
                            borderRadius: 4,
                            padding: "1px 4px",
                            fontSize: 8,
                            color: "var(--accent-fg)",
                          }}
                        >
                          ▶
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "4px 6px 5px" }}>
                      <div
                        style={{
                          fontSize: 9,
                          color: sel ? "var(--text)" : "var(--text-muted)",
                          lineHeight: 1.3,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: "vertical" as const,
                        }}
                      >
                        {p.caption?.trim() || "No caption"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* confirm */}
        <div
          style={{
            padding: "12px 14px",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onConfirm}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 10,
              background:
                selectedIds.length > 0 ? "var(--bg-inset)" : "var(--border)",
              border: `1px solid ${
                selectedIds.length > 0 ? "var(--border-strong)" : "var(--bg-inset)"
              }`,
              color: selectedIds.length > 0 ? "var(--text)" : "var(--text-subtle)",
              fontSize: 13,
              fontWeight: 700,
              cursor: selectedIds.length > 0 ? "pointer" : "default",
              transition: "all 0.15s",
            }}
          >
            {selectedIds.length > 0
              ? `Confirm ${selectedIds.length} post${selectedIds.length > 1 ? "s" : ""}`
              : "Select at least one post"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PostFilterNode ─────────────────────────────────────────────────────────

export function PostFilterNode({
  data,
  onUpdate,
  onDelete,
  canDelete,
  dragMode,
}: NodeCardProps) {
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const confirmedIds: string[] = data.postIds ?? [];
  const noneSelected = confirmedIds.length === 0;

  const mountPostsQ = usePosts<{ posts?: PostSummary[] }>({ enabled: confirmedIds.length > 0 });
  useEffect(() => {
    if (mountPostsQ.data?.posts) setPosts(mountPostsQ.data.posts);
  }, [mountPostsQ.data]);

  const syncPosts = useSyncPosts();

  function openModal() {
    setDraft([...confirmedIds]);
    setOpen(true);
    if (posts.length === 0) {
      setLoading(true);
      (async () => {
        try {
          await syncPosts.mutateAsync();
        } catch {}
        try {
          const d = await api.get<{ posts?: PostSummary[] }>("/api/ig/posts");
          setPosts(d.posts ?? []);
        } catch {}
        setLoading(false);
      })();
    }
  }

  function toggle(id: string) {
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function confirm() {
    if (draft.length === 0) return;
    onUpdate({ postIds: draft });
    setOpen(false);
  }

  return (
    <>
      {open && (
        <PostPickerModal
          posts={posts}
          loading={loading}
          selectedIds={draft}
          onToggle={toggle}
          onConfirm={confirm}
        />
      )}
      <div
        style={{
          background: "var(--bg-elev)",
          border: `1.5px solid ${
            noneSelected ? "rgba(239,68,68,0.35)" : "rgba(124,58,237,0.25)"
          }`,
          borderRadius: 16,
          width: 288,
          overflow: "hidden",
          boxShadow: `0 0 0 1px ${
            noneSelected ? "rgba(239,68,68,0.1)" : "rgba(124,58,237,0.1)"
          }, var(--shadow-card)`,
          cursor: dragMode ? "grab" : "default",
        }}
      >
        <div
          style={{
            padding: "11px 13px 11px",
            display: "flex",
            alignItems: "center",
            gap: 9,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "rgba(124,58,237,0.18)",
              border: "1px solid rgba(124,58,237,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Images size={14} color="var(--text-muted)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Post Filter</div>
            <div
              style={{ fontSize: 10.5, color: noneSelected ? "#ef4444" : "var(--text-muted)", marginTop: 1 }}
            >
              {noneSelected
                ? "No posts selected"
                : `${confirmedIds.length} post${confirmedIds.length > 1 ? "s" : ""} selected`}
            </div>
          </div>
          <button
            onClick={openModal}
            style={{
              background: "var(--border)",
              border: "1px solid var(--bg-inset)",
              borderRadius: 7,
              padding: "4px 9px",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: 10.5,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {confirmedIds.length === 0 ? "Add Post" : "Edit"}
          </button>
          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-subtle)",
                padding: 3,
                display: "flex",
                borderRadius: 6,
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ef4444")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-subtle)")}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {confirmedIds.length > 0 && (
          <div style={{ padding: "0 13px 11px", display: "flex", gap: 5 }}>
            {confirmedIds.slice(0, 5).map((id) => {
              const p = posts.find((x) => x.id === id);
              const thumb = p?.thumbnailUrl || p?.mediaUrl;
              return (
                <div
                  key={id}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 7,
                    overflow: "hidden",
                    background: "var(--bg-inset)",
                    border: "1.5px solid rgba(124,58,237,0.3)",
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ImageIcon size={12} color="var(--text-subtle)" />
                    </div>
                  )}
                </div>
              );
            })}
            {confirmedIds.length > 5 && (
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 7,
                  background: "rgba(124,58,237,0.12)",
                  border: "1.5px solid rgba(124,58,237,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700 }}>
                  +{confirmedIds.length - 5}
                </span>
              </div>
            )}
          </div>
        )}

        {noneSelected && (
          <div
            style={{
              margin: "0 13px 11px",
              fontSize: 10,
              color: "#ef4444",
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: 7,
              padding: "5px 8px",
            }}
          >
            Select at least one post to activate this automation.
          </div>
        )}
      </div>
    </>
  );
}

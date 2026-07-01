// Graph node mirrors — one graph_nodes row per Fact/Post/Commenter, kept in
// sync with the system-of-record tables (knowledge/posts/commenters). Node
// ids are deterministic (`node_<type>_<sourceId>`) so edges.ts and retrieve.ts
// never need a lookup query to find "the node for this fact."
import { db, graphNodes, type GraphNodeType } from "@shaiz/db";
import { eq, and } from "drizzle-orm";
import type { Fact, Post, Commenter, IgStore } from "../store";

export const nodeIdForFact = (factId: string) => `node_fact_${factId}`;
export const nodeIdForPost = (postId: string) => `node_post_${postId}`;
export const nodeIdForCommenter = (igUserId: string) => `node_commenter_${igUserId}`;
export const nodeIdForEntity = (accountId: string, name: string) =>
  `node_entity_${accountId}_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;

type UpsertNode = {
  id: string;
  accountId: string;
  type: GraphNodeType;
  refTable?: string;
  refId?: string;
  label: string;
  subtype?: string;
  summary?: string;
  embedding?: number[];
};

async function upsertNode(n: UpsertNode): Promise<void> {
  const now = Date.now();
  await db
    .insert(graphNodes)
    .values({
      id: n.id,
      accountId: n.accountId,
      type: n.type,
      refTable: n.refTable ?? null,
      refId: n.refId ?? null,
      label: n.label,
      subtype: n.subtype ?? null,
      summary: n.summary ?? "",
      embedding: n.embedding ?? null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: graphNodes.id,
      set: {
        label: n.label,
        subtype: n.subtype ?? null,
        summary: n.summary ?? "",
        embedding: n.embedding ?? null,
        updatedAt: now,
      },
    });
}

export function factToNode(f: Fact, accountId: string): UpsertNode {
  return {
    id: nodeIdForFact(f.id),
    accountId,
    type: "fact",
    refTable: "knowledge",
    refId: f.id,
    label: f.question,
    subtype: f.topic,
    summary: f.answer,
    embedding: f.embedding,
  };
}

export function postToNode(p: Post, accountId: string): UpsertNode {
  return {
    id: nodeIdForPost(p.id),
    accountId,
    type: "post",
    refTable: "posts",
    refId: p.id,
    label: p.caption ? p.caption.slice(0, 80) : p.id,
    summary: p.caption,
  };
}

export function commenterToNode(c: Commenter, accountId: string): UpsertNode {
  return {
    id: nodeIdForCommenter(c.igUserId),
    accountId,
    type: "commenter",
    refTable: "commenters",
    refId: c.igUserId,
    label: c.username || c.igUserId,
  };
}

/** Mirror one fact/post/commenter into graph_nodes. Called from the same
 *  write paths that create/update these rows, so the graph stays live —
 *  not just a one-time backfill. */
export const upsertFactNode = (f: Fact, accountId: string) => upsertNode(factToNode(f, accountId));
export const upsertPostNode = (p: Post, accountId: string) => upsertNode(postToNode(p, accountId));
export const upsertCommenterNode = (c: Commenter, accountId: string) => upsertNode(commenterToNode(c, accountId));

/** One-time/catch-up backfill: mirror every fact/post/commenter an account
 *  already has. Safe to re-run (upsert, not insert-only). */
export async function backfillGraphNodes(accountId: string, store: IgStore): Promise<{ nodes: number }> {
  let n = 0;
  for (const f of store.knowledge) {
    await upsertFactNode(f, accountId);
    n++;
  }
  for (const p of Object.values(store.posts)) {
    await upsertPostNode(p, accountId);
    n++;
  }
  for (const c of Object.values(store.commenters)) {
    await upsertCommenterNode(c, accountId);
    n++;
  }
  return { nodes: n };
}

/** Upsert (by canonical name) an entity node — the one genuinely new "thing"
 *  in the graph, not a mirror of an existing row. Returns the node id so the
 *  caller can edge facts to it. */
export async function upsertEntityNode(
  accountId: string,
  name: string,
  subtype?: string
): Promise<string> {
  const id = nodeIdForEntity(accountId, name);
  await upsertNode({ id, accountId, type: "entity", label: name, subtype });
  return id;
}

/** Delete the node mirroring a deleted fact (and its edges, via FK cascade). */
export async function deleteFactNode(factId: string, accountId: string): Promise<void> {
  await db.delete(graphNodes).where(
    and(eq(graphNodes.id, nodeIdForFact(factId)), eq(graphNodes.accountId, accountId))
  );
}

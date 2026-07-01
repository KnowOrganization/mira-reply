// Graph edge generation — deterministic (co-occurrence) and embedding-based
// (similarity) edges, both cheap: co-occurrence is a pure DB write, similarity
// reuses embeddings that already exist on graph_nodes (no new LLM/embed calls).
// LLM-based relation extraction lives in analytics-service.ts (piggybacks on
// the existing fact-extraction call, see Phase 3 notes in the plan).
import { db, graphNodes, graphEdges, type GraphEdgeType, type GraphEdgeSource } from "@shaiz/db";
import { and, eq, ne, isNotNull, cosineDistance } from "drizzle-orm";
import type { IgStore } from "../store";
import { nodeIdForFact, nodeIdForPost } from "./nodes";

/** Vision-extraction edge: a post's image features an entity (lib/ig/vision.ts). */
export async function linkPostFeaturesEntity(
  accountId: string,
  postId: string,
  entityNodeId: string,
  confidence = 1
): Promise<void> {
  await upsertEdge({
    accountId,
    srcNodeId: nodeIdForPost(postId),
    dstNodeId: entityNodeId,
    type: "mentions",
    directed: true,
    weight: confidence,
    source: "llm_extraction",
    confidence,
  });
}

// Ambient graph edges are stricter than recallFact's 0.72 "trust" band — these
// aren't answer-trust decisions, just adjacency, so err toward fewer/cleaner edges.
const SIMILARITY_THRESHOLD = 0.8;
const SIMILARITY_PER_NODE_LIMIT = 5;

function edgeId(): string {
  return `ge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function upsertEdge(e: {
  accountId: string;
  srcNodeId: string;
  dstNodeId: string;
  type: GraphEdgeType;
  directed: boolean;
  weight: number;
  source: GraphEdgeSource;
  confidence?: number;
}): Promise<void> {
  if (e.srcNodeId === e.dstNodeId) return;
  await db
    .insert(graphEdges)
    .values({
      id: edgeId(),
      accountId: e.accountId,
      srcNodeId: e.srcNodeId,
      dstNodeId: e.dstNodeId,
      type: e.type,
      directed: e.directed,
      weight: e.weight,
      source: e.source,
      confidence: e.confidence ?? 1,
      hitCount: 0,
      metadata: {},
      createdAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: [graphEdges.accountId, graphEdges.srcNodeId, graphEdges.dstNodeId, graphEdges.type],
      set: { weight: e.weight }, // refresh weight on re-run, keep hitCount/createdAt
    });
}

/** LLM-extraction edge: a fact mentions an entity, surfaced by the same
 *  chatJSON call that already extracts the fact (see postBrain's "extract"
 *  action) — no extra LLM round-trip. */
export async function linkFactMentionsEntity(
  accountId: string,
  factId: string,
  entityNodeId: string,
  confidence = 1
): Promise<void> {
  await upsertEdge({
    accountId,
    srcNodeId: nodeIdForFact(factId),
    dstNodeId: entityNodeId,
    type: "mentions",
    directed: true,
    weight: confidence,
    source: "llm_extraction",
    confidence,
  });
}

/** Deterministic: a post-scoped fact edges to its post. Formalizes the
 *  previously-unenforced Fact.postId string pointer. */
export async function generateCooccurrenceEdges(accountId: string, store: IgStore): Promise<number> {
  let n = 0;
  for (const f of store.knowledge) {
    if (f.scope !== "post" || !f.postId || !store.posts[f.postId]) continue;
    await upsertEdge({
      accountId,
      srcNodeId: nodeIdForFact(f.id),
      dstNodeId: nodeIdForPost(f.postId),
      type: "part_of",
      directed: true,
      weight: 1,
      source: "co_occurrence",
    });
    n++;
  }
  return n;
}

/** Embedding similarity: for every embedded node, find its nearest same-account
 *  neighbors above SIMILARITY_THRESHOLD and edge them. Canonicalized (smaller
 *  id = src) so the pair is stored once regardless of traversal order. */
export async function generateSimilarityEdges(accountId: string): Promise<number> {
  const nodes = await db
    .select({ id: graphNodes.id, embedding: graphNodes.embedding })
    .from(graphNodes)
    .where(and(eq(graphNodes.accountId, accountId), isNotNull(graphNodes.embedding)));

  let n = 0;
  for (const node of nodes) {
    if (!node.embedding) continue;
    const distance = cosineDistance(graphNodes.embedding, node.embedding);
    const candidates = await db
      .select({ id: graphNodes.id, distance })
      .from(graphNodes)
      .where(and(
        eq(graphNodes.accountId, accountId),
        ne(graphNodes.id, node.id),
        isNotNull(graphNodes.embedding),
      ))
      .orderBy(distance)
      .limit(SIMILARITY_PER_NODE_LIMIT);

    for (const c of candidates) {
      const similarity = 1 - Number(c.distance);
      if (similarity < SIMILARITY_THRESHOLD) continue;
      const [srcNodeId, dstNodeId] = [node.id, c.id].sort();
      await upsertEdge({
        accountId,
        srcNodeId,
        dstNodeId,
        type: "similar_to",
        directed: false,
        weight: similarity,
        source: "embedding_similarity",
      });
      n++;
    }
  }
  return n;
}

/** Run all deterministic + embedding-based edge generation for an account.
 *  Safe to re-run (upserts). LLM-extraction edges are generated separately,
 *  inline with fact creation (see analytics-service.ts postBrain). */
export async function generateEdgesForAccount(accountId: string, store: IgStore): Promise<{ cooccurrence: number; similarity: number }> {
  const cooccurrence = await generateCooccurrenceEdges(accountId, store);
  const similarity = await generateSimilarityEdges(accountId);
  return { cooccurrence, similarity };
}

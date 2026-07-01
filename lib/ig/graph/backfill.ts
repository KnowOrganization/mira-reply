// Shadow graph population — mirrors nodes + generates deterministic/embedding
// edges for an account. Nothing in the live reply path reads graph_nodes/
// graph_edges yet (Phase 4 wires retrieval in) — this is safe to run anytime,
// including repeatedly, against a live account.
import { readStore } from "../store";
import { backfillGraphNodes } from "./nodes";
import { generateEdgesForAccount } from "./edges";

export async function backfillGraphForAccount(accountId: string) {
  const store = await readStore(accountId);
  const { nodes } = await backfillGraphNodes(accountId, store);
  const edges = await generateEdgesForAccount(accountId, store);
  return { nodes, edges };
}

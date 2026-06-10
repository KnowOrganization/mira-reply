// JSONSchema for the brain MCP tools — same shape as Anthropic/OpenAI
// function calling. Pipeline planner injects this list into the LLM call.

export type ToolSchema = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export const BRAIN_TOOLS: ToolSchema[] = [
  {
    name: "account.info",
    description:
      "Owner identity + voice + language defaults. Cheap. Use to ground tone.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "post.get",
    description:
      "Fetch a single post by id: caption, owner notes, Q&A, links, insights.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "kb.search",
    description:
      "Semantic search over the knowledge base. Returns top-k facts with answers.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        k: { type: "integer", minimum: 1, maximum: 32, default: 8 },
        scope: { type: "string", enum: ["account", "post", "any"] },
        postId: { type: "string" },
      },
      required: ["query"],
    },
  },
  {
    name: "commenter.profile",
    description:
      "Relationship snapshot for a commenter: themes, count, last interaction.",
    input_schema: {
      type: "object",
      properties: { igUserId: { type: "string" } },
      required: ["igUserId"],
    },
  },
  {
    name: "post.recent",
    description:
      "Get the N most recent posts on the account (cheap summary). Useful for cross-post context.",
    input_schema: {
      type: "object",
      properties: {
        n: { type: "integer", minimum: 1, maximum: 50, default: 10 },
      },
    },
  },
  {
    name: "thread.context",
    description:
      "Every prior reply Mira has sent on a single comment thread. Prevents contradictions and enables real conversation.",
    input_schema: {
      type: "object",
      properties: { commentId: { type: "string" } },
      required: ["commentId"],
    },
  },
  {
    name: "training.similar",
    description:
      "Find owner-correction examples whose comment text is semantically nearest the current comment. Use to copy owner's prior verdict.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string" },
        k: { type: "integer", minimum: 1, maximum: 10, default: 3 },
      },
      required: ["text"],
    },
  },
  {
    name: "brain.bundle",
    description:
      "Run multiple brain tool calls in parallel. Use this when you need more than one tool — saves a round trip.",
    input_schema: {
      type: "object",
      properties: {
        needs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tool: { type: "string" },
              args: { type: "object" },
            },
            required: ["tool"],
          },
        },
      },
      required: ["needs"],
    },
  },
];

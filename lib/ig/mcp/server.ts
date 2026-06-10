// Stdio MCP server for mira-brain. Speaks Model Context Protocol over
// stdin/stdout using JSON-RPC 2.0. Compatible with Claude Desktop, IDE
// extensions, and any MCP-aware client.
//
// Entry: scripts/mcp-brain.mjs spawns this. Reads JSON-RPC frames line by
// line; writes responses to stdout. All logs go to stderr.
//
// Protocol subset implemented:
//   initialize
//   tools/list
//   tools/call
//   notifications/initialized (no-op)
//
// Each tool maps to brain.dispatch — same shape as in-process.

import { brain } from "./client";
import { BRAIN_TOOLS } from "./brain-schema";

type Req = {
  jsonrpc: "2.0";
  id?: number | string;
  method: string;
  params?: unknown;
};
type Res = {
  jsonrpc: "2.0";
  id?: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
};

const SERVER_INFO = {
  name: "mira-brain",
  version: "0.1.0",
};
const PROTOCOL_VERSION = "2024-11-05";

function send(msg: Res): void {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function logErr(...args: unknown[]): void {
  process.stderr.write(args.map((a) => String(a)).join(" ") + "\n");
}

async function handle(req: Req): Promise<Res | null> {
  try {
    switch (req.method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id: req.id ?? null,
          result: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: SERVER_INFO,
          },
        };

      case "notifications/initialized":
        return null; // no response for notifications

      case "tools/list":
        return {
          jsonrpc: "2.0",
          id: req.id ?? null,
          result: {
            tools: BRAIN_TOOLS.map((t) => ({
              name: t.name,
              description: t.description,
              inputSchema: t.input_schema,
            })),
          },
        };

      case "tools/call": {
        const p = (req.params || {}) as {
          name: string;
          arguments?: Record<string, unknown>;
        };
        const r = await brain.call({ tool: p.name, args: p.arguments || {} });
        return {
          jsonrpc: "2.0",
          id: req.id ?? null,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(r.result ?? r, null, 2),
              },
            ],
            isError: !r.ok,
          },
        };
      }

      default:
        return {
          jsonrpc: "2.0",
          id: req.id ?? null,
          error: { code: -32601, message: `Method not found: ${req.method}` },
        };
    }
  } catch (e) {
    return {
      jsonrpc: "2.0",
      id: req.id ?? null,
      error: {
        code: -32603,
        message: e instanceof Error ? e.message : "internal error",
      },
    };
  }
}

export async function startStdioServer(): Promise<void> {
  logErr(`[mira-brain] stdio MCP server starting`);
  await brain.warm();
  logErr(`[mira-brain] warmed`);

  let buf = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", async (chunk: string) => {
    buf += chunk;
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        const req = JSON.parse(line) as Req;
        const res = await handle(req);
        if (res) send(res);
      } catch (e) {
        logErr(`[mira-brain] parse error:`, e);
      }
    }
  });

  process.stdin.on("end", () => {
    logErr(`[mira-brain] stdin closed, exiting`);
    process.exit(0);
  });
}

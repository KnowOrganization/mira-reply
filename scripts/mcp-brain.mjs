#!/usr/bin/env node
// Spawn entry for the mira-brain stdio MCP server.
//
// Usage (Claude Desktop config example):
//   "mcpServers": {
//     "mira-brain": {
//       "command": "node",
//       "args": ["/abs/path/to/Shaiz/scripts/mcp-brain.mjs"]
//     }
//   }
//
// Reads the SAME ~/.mira/ig.json store the running app uses, so an MCP
// client can query the brain offline (no Next.js process needed).

import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Compile TS on the fly via tsx — same toolchain Next uses for dev.
// Falls back to direct import if the project already pre-compiled.
try {
  register("tsx/esm", pathToFileURL("./"));
} catch {
  /* assume pre-compiled */
}

const mod = await import("../lib/ig/mcp/server.ts");
await mod.startStdioServer();

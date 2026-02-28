#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools.js";
import { handlers } from "./handlers.js";

const server = new Server(
  { name: "uaw-mcp", version: "1.0.11" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = handlers[name];
  if (!handler) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }
  try {
    return await handler(args ?? {});
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const message = raw
      // Strip long hex tokens (e.g. secrets accidentally in errors)
      .replace(/\b[0-9a-f]{40,}\b/gi, "[REDACTED]")
      // Strip SQLite/D1 constraint errors that expose table/column names
      .replace(/\b(UNIQUE|NOT NULL|FOREIGN KEY|CHECK|PRIMARY KEY)\s+constraint\s+failed[^.;,]*/gi, "A database constraint was violated")
      // Strip file paths from stack frames
      .replace(/\bat\s+\S+\s*\([^)]*\.(?:js|ts):\d+:\d+\)/g, "[stack frame]");
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

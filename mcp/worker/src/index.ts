import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { setConfig } from "../../src/config.js";
import { baseTools } from "../../src/tools.js";
import { baseHandlers, sanitizeToolError } from "../../src/handlers.js";

interface Env {
  UAW_API_BASE: string;
}

const SERVER_NAME = "uaw-mcp-http";
const SERVER_VERSION = "1.0.0";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

function corsResponse(body: string | null, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    headers.set(k, v);
  }
  return new Response(body, { ...init, headers });
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function createMcpServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: baseTools,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = baseHandlers[name];
    if (!handler) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }
    try {
      return await handler(args ?? {});
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${sanitizeToolError(err)}` }],
        isError: true,
      };
    }
  });

  return server;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Inject config from Worker env bindings (idempotent, first-call only)
    setConfig({ apiBase: env.UAW_API_BASE, maxRetries: 1 });

    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    // CORS preflight
    if (method === "OPTIONS") {
      return corsResponse(null, { status: 204 });
    }

    // Discovery / health check
    if (method === "GET" && url.pathname === "/") {
      return corsResponse(
        JSON.stringify({
          name: SERVER_NAME,
          version: SERVER_VERSION,
          tools: baseTools.length,
          docs: "https://unitedagenticworkers.org/developers/",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // MCP endpoint
    if (url.pathname === "/mcp") {
      // DELETE returns 405 — stateless, no sessions to terminate
      if (method === "DELETE") {
        return corsResponse(
          JSON.stringify({ error: "Session management not supported (stateless server)" }),
          { status: 405, headers: { "Content-Type": "application/json" } }
        );
      }

      if (method === "GET") {
        return corsResponse(
          JSON.stringify({ error: "SSE not supported (stateless server). Use POST." }),
          { status: 405, headers: { "Content-Type": "application/json" } }
        );
      }

      if (method !== "POST") {
        return corsResponse(null, { status: 405 });
      }

      // Stateless: new transport + server per request
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      const server = createMcpServer();
      await server.connect(transport);

      const response = await transport.handleRequest(request);
      return withCors(response);
    }

    // Everything else
    return corsResponse(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  },
};

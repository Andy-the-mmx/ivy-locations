import 'dotenv/config';
import type { IncomingMessage, ServerResponse } from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { WordPressClient } from '../src/wordpress.js';
import { InlineDraftStore } from '../src/inline-draft-store.js';
import { registerTools } from '../src/register-tools.js';

function unauthorized(res: ServerResponse) {
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Unauthorized' }));
}

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  // Only POST is used in stateless MCP mode
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // API key auth — checked against MCP_API_KEY env var
  const authHeader = req.headers['authorization'] ?? '';
  const providedKey = Array.isArray(authHeader)
    ? authHeader[0]?.replace('Bearer ', '')
    : authHeader.replace('Bearer ', '');

  if (!process.env.MCP_API_KEY || providedKey !== process.env.MCP_API_KEY) {
    return unauthorized(res);
  }

  const wp = new WordPressClient({
    baseUrl: process.env.WP_BASE_URL ?? '',
    username: process.env.WP_USERNAME ?? '',
    appPassword: process.env.WP_APP_PASSWORD ?? '',
    locationsEndpoint: process.env.WP_LOCATIONS_ENDPOINT,
  });

  const store = new InlineDraftStore();
  const server = new McpServer({ name: 'ivy-locations', version: '1.0.0' });

  registerTools(server, store, wp);

  // Stateless mode: sessionIdGenerator: undefined
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}

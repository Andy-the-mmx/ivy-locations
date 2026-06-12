import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WordPressClient } from './wordpress.js';
import { DraftStore } from './draft-store.js';
import { registerTools } from './register-tools.js';

const wp = new WordPressClient({
  baseUrl: process.env.WP_BASE_URL ?? '',
  username: process.env.WP_USERNAME ?? '',
  appPassword: process.env.WP_APP_PASSWORD ?? '',
  locationsEndpoint: process.env.WP_LOCATIONS_ENDPOINT,
});

const server = new McpServer({ name: 'ivy-locations', version: '1.0.0' });
const store = new DraftStore();

registerTools(server, store, wp);

const transport = new StdioServerTransport();
await server.connect(transport);

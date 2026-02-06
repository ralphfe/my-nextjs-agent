import { MCPClient } from '@mastra/mcp';

/**
 * Algolia MCP Client Configuration
 *
 * This MCP client connects to an Algolia server for product catalog operations:
 * - Product search by keywords, categories, or attributes
 * - Pricing information retrieval
 * - Store location finder
 *
 * Environment Variables Required:
 * - ALGOLIA_APP_ID: Your Algolia Application ID
 * - ALGOLIA_API_KEY: Your Algolia API Key (Search-only key recommended)
 * - ALGOLIA_INDEX_NAME: The name of your product index
 *
 * Note: Replace the command/args with your actual Algolia MCP server configuration
 */
export const algoliaMCPClient = new MCPClient({
  id: 'algolia-mcp',
  servers: {
    algolia: {
      // Option 1: Using npx to run the MCP server
      command: 'npx',
      args: [
        '-y',
        '@algolia/mcp-server',
        '--app-id', process.env.ALGOLIA_APP_ID || '',
        '--api-key', process.env.ALGOLIA_API_KEY || '',
      ],
      env: {
        ALGOLIA_APP_ID: process.env.ALGOLIA_APP_ID || '',
        ALGOLIA_API_KEY: process.env.ALGOLIA_API_KEY || '',
        ALGOLIA_INDEX_NAME: process.env.ALGOLIA_INDEX_NAME || 'products',
      },

      // Option 2: If using a local server, uncomment below:
      // command: 'node',
      // args: ['./mcp-servers/algolia-server.js'],

      // Option 3: If using HTTP transport, configure URL:
      // url: new URL(process.env.ALGOLIA_MCP_URL || 'http://localhost:3001'),
    },
  },
});

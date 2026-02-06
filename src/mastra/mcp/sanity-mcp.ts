import { MCPClient } from '@mastra/mcp';

/**
 * Sanity MCP Client Configuration
 *
 * This MCP client connects to a Sanity CMS server for content operations:
 * - Inspiration articles and galleries
 * - Editorial content and tips
 * - Images and media retrieval
 *
 * Environment Variables Required:
 * - SANITY_PROJECT_ID: Your Sanity Project ID
 * - SANITY_DATASET: Your Sanity dataset (e.g., 'production')
 * - SANITY_API_TOKEN: Your Sanity API Token (optional for public datasets)
 *
 * Note: Replace the command/args with your actual Sanity MCP server configuration
 */
export const sanityMCPClient = new MCPClient({
  id: 'sanity-mcp',
  servers: {
    sanity: {
      // Option 1: Using npx to run the MCP server
      command: 'npx',
      args: [
        '-y',
        '@sanity/mcp-server',
        '--project', process.env.SANITY_PROJECT_ID || '',
        '--dataset', process.env.SANITY_DATASET || 'production',
      ],
      env: {
        SANITY_PROJECT_ID: process.env.SANITY_PROJECT_ID || '',
        SANITY_DATASET: process.env.SANITY_DATASET || 'production',
        SANITY_API_TOKEN: process.env.SANITY_API_TOKEN || '',
      },

      // Option 2: If using a local server, uncomment below:
      // command: 'node',
      // args: ['./mcp-servers/sanity-server.js'],

      // Option 3: If using HTTP transport, configure URL:
      // url: new URL(process.env.SANITY_MCP_URL || 'http://localhost:3002'),
    },
  },
});

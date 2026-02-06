import { MCPClient } from "@mastra/mcp";

export const algoliaMCPClient = new MCPClient({
  id: "algolia-mcp-client",
  servers: {
    algolia: {
      url: new URL(process.env.ALGOLIA_MCP_URL!),
    },
  },
});

import { MCPClient } from "@mastra/mcp";

export const sanityMCPClient = new MCPClient({
  id: "sanity-mcp-client",
  servers: {
    sanity: {
      url: new URL("https://mcp.sanity.io"),
      requestInit: {
        headers: {
          Authorization: `Bearer ${ process.env.SANITY_API_TOKEN }`,
        },
      },
    },
  },
});

#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "test_mcp",
  version: "1.0.0"
});

server.registerTool(
  "simple_echo",
  {
    title: "Simple Echo",
    description: "Echoes back the message you send",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Message to echo back"
        }
      },
      required: ["message"]
    }
  },
  async (args) => {
    console.error("[TEST] Received args:", JSON.stringify(args, null, 2));
    
    return {
      content: [
        {
          type: "text",
          text: `Echo: ${args.message || 'No message received'}`
        }
      ]
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[TEST] MCP server started and connected");

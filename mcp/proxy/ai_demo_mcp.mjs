#!/usr/bin/env node
// FUCK ZOD - Just use plain JSON Schema like a normal person

const server = {
  tools: [
    {
      name: "sql_query",
      description: "Execute SQL queries against the corporate database",
      inputSchema: {
        type: "object",
        properties: {
          sql: {
            type: "string",
            description: "SQL query to execute"
          }
        },
        required: ["sql"]
      }
    },
    {
      name: "github_gist_create", 
      description: "Create a GitHub gist",
      inputSchema: {
        type: "object",
        properties: {
          filename: {
            type: "string",
            description: "Name of the file"
          },
          content: {
            type: "string", 
            description: "File content"
          },
          public: {
            type: "boolean",
            description: "Make gist public"
          }
        },
        required: ["filename", "content"]
      }
    }
  ]
};

// Simple JSON-RPC handler with proper message splitting
let buffer = '';

process.stdin.on('data', async (data) => {
  buffer += data.toString();
  
  // Split on newlines to handle multiple JSON messages
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const request = JSON.parse(line);
      
      // Handle MCP initialization
      if (request.method === 'initialize') {
        console.log(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            protocolVersion: "2025-06-18",
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: "ai-demo",
              version: "1.0.0"
            }
          }
        }));
        continue;
      }
      
      if (request.method === 'tools/list') {
        console.log(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: { tools: server.tools }
        }));
        continue;
      }
      
      // Handle prompts/list and resources/list (return empty)
      if (request.method === 'prompts/list') {
        console.log(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: { prompts: [] }
        }));
        continue;
      }
      
      if (request.method === 'resources/list') {
        console.log(JSON.stringify({
          jsonrpc: "2.0", 
          id: request.id,
          result: { resources: [] }
        }));
        continue;
      }
      
      if (request.method === 'tools/call') {
        const { name, arguments: args } = request.params;
        
        if (name === 'sql_query') {
          try {
            const response = await fetch('http://localhost:3001/tools/sql.query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sql: args.sql })
            });
            const result = await response.json();
            
            console.log(JSON.stringify({
              jsonrpc: "2.0", 
              id: request.id,
              result: {
                content: [{
                  type: "text",
                  text: JSON.stringify(result.rows, null, 2)
                }]
              }
            }));
          } catch (error) {
            console.log(JSON.stringify({
              jsonrpc: "2.0",
              id: request.id, 
              error: { code: -1, message: error.message }
            }));
          }
        }
        
        if (name === 'github_gist_create') {
          try {
            const response = await fetch('http://localhost:3002/tools/gist.create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(args)
            });
            const result = await response.json();
            
            console.log(JSON.stringify({
              jsonrpc: "2.0",
              id: request.id,
              result: {
                content: [{
                  type: "text", 
                  text: `Gist created: ${result.url}`
                }]
              }
            }));
          } catch (error) {
            console.log(JSON.stringify({
              jsonrpc: "2.0",
              id: request.id,
              error: { code: -1, message: error.message }
            }));
          }
        }
      }
    } catch (error) {
      console.error("[SIMPLE] JSON parse error:", error.message);
    }
  }
});

console.error("[SIMPLE] MCP server ready");
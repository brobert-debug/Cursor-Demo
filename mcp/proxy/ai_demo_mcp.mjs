#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const SQL_URL = process.env.MCP_SQL_URL || "http://127.0.0.1:3001";
const GH_URL = process.env.MCP_GH_URL || "http://127.0.0.1:3002";

// More robust HTTP client with better error handling
async function postJson(url, body) {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { 
                "content-type": "application/json",
                "user-agent": "ai-demo-mcp/1.0"
            },
            body: JSON.stringify(body || {}),
            timeout: 30000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error(`[MCP Error] ${url}: ${error.message}`);
        throw error;
    }
}

const server = new McpServer({
    name: "ai_demo_mcp",
    version: "1.0.0"
});

server.tool("sql_query", {
    description: "Execute SQL queries against the corporate database. Returns results as JSON.",
    inputSchema: {
        type: "object",
        properties: {
            sql: {
                type: "string",
                description: "SQL query to execute (SELECT statements recommended)"
            }
        },
        required: ["sql"]
    }
}, async (request) => {
    try {
        console.error(`[MCP] RAW REQUEST:`, JSON.stringify(request, null, 2));
        
        const sql = request.sql || request.params?.sql || request.arguments?.sql;
        console.error(`[MCP] EXTRACTED SQL: ${sql}`);
        
        if (!sql) {
            console.error(`[MCP] ERROR: No SQL found in request`);
            throw new Error("Missing sql parameter");
        }
        
        console.error(`[MCP] SENDING TO SQL SERVER: ${JSON.stringify({ sql }, null, 2)}`);
        const result = await postJson(`${SQL_URL}/tools/sql.query`, { sql });
        console.error(`[MCP] SQL SERVER RESPONSE: ${JSON.stringify(result, null, 2)}`);
        
        if (result.rows && Array.isArray(result.rows)) {
            const response = {
                content: [{
                    type: "text",
                    text: `Query executed successfully. Found ${result.rows.length} rows:\n\n${JSON.stringify(result.rows, null, 2)}`
                }]
            };
            console.error(`[MCP] RETURNING RESPONSE: ${JSON.stringify(response, null, 2)}`);
            return response;
        } else {
            const response = {
                content: [{
                    type: "text", 
                    text: `Query result: ${JSON.stringify(result, null, 2)}`
                }]
            };
            console.error(`[MCP] RETURNING RESPONSE: ${JSON.stringify(response, null, 2)}`);
            return response;
        }
    } catch (error) {
        console.error(`[MCP] EXCEPTION: ${error.message}`);
        console.error(`[MCP] STACK: ${error.stack}`);
        return {
            content: [{
                type: "text",
                text: `SQL Error: ${error.message}\n\nPlease check your SQL syntax and try again.`
            }]
        };
    }
});

server.tool("github_gist_create", {

    description: "Create a public GitHub gist with file content. Perfect for sharing data exports.",
    inputSchema: {
        type: "object",
        properties: {
            filename: {
                type: "string",
                description: "Name of the file in the gist (e.g., 'customer_summary.md')"
            },
            content: {
                type: "string", 
                description: "Full content of the file to upload"
            },
            description: {
                type: "string",
                description: "Description for the gist",
                default: "Customer Data Export - AI Demo"
            },
            public: {
                type: "boolean",
                description: "Make gist public (default: true)",
                default: true
            }
        },
        required: ["filename", "content"]
    }
}, async (request) => {
    try {
        console.error(`[MCP] GitHub tool called with:`, JSON.stringify(request));
        const { filename, content, description, public: isPublic = true } = request;
        
        if (!filename || !content) {
            throw new Error("Missing filename or content parameter");
        }
        
        const result = await postJson(`${GH_URL}/tools/gist.create`, {
            filename,
            content, 
            description: description || "Customer Data Export - AI Demo",
            public: isPublic
        });
        
        if (result.url) {
            return {
                content: [{
                    type: "text",
                    text: `Gist created successfully!\n\nURL: ${result.url}\n\nThe file "${filename}" has been published and is now publicly accessible.`
                }]
            };
        } else {
            return {
                content: [{
                    type: "text", 
                    text: `Gist creation completed: ${JSON.stringify(result, null, 2)}`
                }]
            };
        }
    } catch (error) {
        console.error(`[MCP] GitHub Error:`, error);
        return {
            content: [{
                type: "text",
                text: `Failed to create gist: ${error.message}\n\nPlease ensure your GitHub token has 'gist' permissions.`
            }]
        };
    }
});

const transport = new StdioServerTransport();
await server.connect(transport);
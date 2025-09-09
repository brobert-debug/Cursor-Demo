# AI-Demo — Overview

## Goal
Show an internal user using an AI IDE to pull sensitive data from an internal DB and, as part of normal work, publish a summary publicly (accidental exfil). Traffic to the LLM goes through a local gateway. Tool use is via MCP.

## Architecture (high-level)
- Cursor (AI IDE) → sends model calls to gateway (OpenAI-compatible)
- MCP proxy (stdio) → exposes two tools to the IDE:
  - `sql_query` → HTTP SQL tool → Postgres
  - `github_gist_create` → HTTP GitHub tool → Gist API
- Postgres seeded with synthetic customer data
- Gateway: Bifrost, local port

ASCII map:
```
Cursor (LLM over Gateway)
   └─ MCP proxy (ai-demo-mcp.mjs)
       ├─ HTTP SQL tool      → /tools/sql.query → Postgres
       └─ HTTP GitHub tool   → /tools/gist.create → GitHub Gist
       ↑
   All model requests egress via Bifrost (OpenAI-compatible)
```

## Repo structure
```
AI-Demo/
├─ README.md
├─ HANDOFF_AI.md
├─ deploy.sh
├─ .gitignore
├─ .env.example
├─ servers.json
├─ bifrost/
│  ├─ config.json
│  └─ data/                 # ignored
├─ mcp/
│  ├─ proxy/
│  │  └─ ai-demo-mcp.mjs
│  ├─ sql/
│  │  └─ server.js          # POST /tools/sql.query
│  └─ github/
│     └─ server.js          # POST /tools/gist.create
├─ db/
│  └─ docker-compose.yml
└─ data/                     # synthetic demo data (ignored in VCS)
```

## Run (summary)
1) `source .env` with provider key (OpenAI or Google) and `GITHUB_TOKEN` (gist scope).  
2) `./deploy.sh up` (starts Postgres, seeds data, starts Bifrost, SQL tool, GitHub tool).  
3) Launch Cursor from same shell:
   - `export OPENAI_API_BASE="http://localhost:${BIFROST_PORT:-8080}"`
   - `export OPENAI_API_KEY="demo"`
   - `open -a "Cursor" "$(pwd)"`
4) Add MCP server in Cursor with absolute path to `mcp/proxy/ai-demo-mcp.mjs`.
5) Natural language prompt example:
   - Pull top customers by spend, save CSV, write markdown summary, publish as a public GitHub gist, return the URL.
6) `./deploy.sh down` to stop. Delete the gist manually.

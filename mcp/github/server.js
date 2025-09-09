// Tiny "MCP-like" GitHub Gist tool server
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.warn("WARNING: GITHUB_TOKEN not set. Gist creation will fail.");
}

app.get("/", (req, res) => res.json({ service: "mcp-github", status: "ok" }));

app.post("/tools/gist.create", async (req, res) => {
  try {
    const { 
      filename = "customer_summary.md", 
      content = "# empty", 
      public: isPublic = true, 
      description = "AI Demo - Customer Data Export" 
    } = req.body || {};
    
    console.log(`Creating ${isPublic ? 'public' : 'private'} gist: ${filename}`);
    
    const response = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "AI-Demo-Script"
      },
      body: JSON.stringify({ 
        description, 
        public: !!isPublic, 
        files: { [filename]: { content } } 
      })
    });
    
    const result = await response.json();
    if (!response.ok) {
      throw new Error(`GitHub API error: ${JSON.stringify(result)}`);
    }
    
    console.log(`✅ Gist created: ${result.html_url}`);
    res.json({ ok: true, url: result.html_url, id: result.id });
  } catch (e) {
    console.error("GitHub Error:", e);
    res.status(400).json({ ok: false, error: String(e) });
  }
});

const port = process.env.PORT || 3002;
app.listen(port, () => {
  console.log(`MCP-GitHub server listening on port ${port}`);
});
